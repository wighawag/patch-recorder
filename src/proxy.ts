import type {PatchPath, RecorderState} from './types.js';
import {
	generateSetPatch,
	generateDeletePatch,
	generateAddPatch,
	generateReplacePatch,
} from './patches.js';
import {isArray, isMap, isSet} from './utils.js';
import {handleArrayGet} from './arrays.js';
import {handleMapGet} from './maps.js';
import {handleSetGet} from './sets.js';

/**
 * Find the array item context for getItemId extraction.
 * Looks for a numeric index in the path that indicates we're inside an array item.
 * 
 * Pattern: [...parentPath, arrayName, numericIndex, ...nestedPath]
 * 
 * @returns Object with item and pathIndex, or undefined if not inside an array item
 */
function findArrayItemContext(
	path: PatchPath,
	state: RecorderState<any>,
): {item: unknown; pathIndex: number} | undefined {
	for (let i = path.length - 1; i >= 1; i--) {
		if (typeof path[i] === 'number') {
			// Found a numeric index - the array item is the object at this position
			// Navigate from the root state to get the array item
			let current: any = state.state;
			for (let j = 0; j <= i; j++) {
				const pathKey = path[j] as string | number;
				current = current[pathKey];
				if (current === undefined || current === null) break;
			}
			if (current !== undefined && current !== null) {
				// pathIndex is i + 1 (the position after the numeric index)
				// This represents the length of the item path
				return {item: current, pathIndex: i + 1};
			}
			break;
		}
	}
	return undefined;
}

export function createProxy<T extends object>(
	target: T,
	path: PatchPath,
	state: RecorderState<any>,
): T {
	// Check cache first
	const cached = state.proxyCache.get(target);
	if (cached) {
		return cached;
	}

	const isArrayType = isArray(target);
	const isMapType = isMap(target);
	const isSetType = isSet(target);

	const handler: ProxyHandler<T> = {
		get(obj, prop) {
			// Handle array methods
			if (isArrayType && typeof prop === 'string') {
				return handleArrayGet(obj as any[], prop, path, state);
			}

			// Handle Map methods
			if (isMapType) {
				return handleMapGet(obj as Map<any, any>, prop, path, state);
			}

			// Handle Set methods
			if (isSetType) {
				return handleSetGet(obj as Set<any>, prop, path, state);
			}

			// Handle property access
			const value = (obj as any)[prop];

			// Skip creating proxies for primitive values and special cases
			if (typeof value !== 'object' || value === null) {
				return value;
			}

			// Create nested proxy for all stateable values
			return createProxy(value, [...path, prop], state);
		},

		set(obj, prop, value) {
			// Map and Set don't support direct property assignment
			if (isMapType || isSetType) {
				throw new Error('Map/Set state does not support any property assignment.');
			}

			const oldValue = (obj as any)[prop];

			// Convert numeric string props to numbers for array indices
			const propForPath = typeof prop === 'string' && !isNaN(Number(prop)) ? Number(prop) : prop;
			const propPath = [...path, propForPath];

			// Check if property actually exists (for no-op detection)
			const actuallyHasProperty = Object.prototype.hasOwnProperty.call(obj, prop);

			// For add vs replace distinction: check array bounds for arrays
			// Index within bounds = replace, out of bounds = add
			let hadProperty = actuallyHasProperty;
			if (isArrayType && typeof propForPath === 'number') {
				hadProperty = propForPath >= 0 && propForPath < (obj as any[]).length;
			}

			// Skip if no actual change (handle undefined as a valid value)
			// Use Object.is to correctly handle NaN (NaN !== NaN, but Object.is(NaN, NaN) === true)
			// Use actuallyHasProperty for no-op detection (sparse array hole is different from undefined)
			if (Object.is(oldValue, value) && (value !== undefined || actuallyHasProperty)) {
				return true;
			}

			// Special handling for array length with arrayLengthAssignment: false
			// Must capture removed items BEFORE mutation
			let removedItems: any[] | null = null;
			if (isArrayType && prop === 'length' && state.options.arrayLengthAssignment === false) {
				const arr = obj as any[];
				const newLength = value as number;
				if (newLength < oldValue) {
					// Capture items that will be removed before mutation
					removedItems = [];
					for (let i = newLength; i < oldValue; i++) {
						removedItems.push(arr[i]);
					}
				}
			}

			// Mutate original immediately
			(obj as any)[prop] = value;

			// Find array item context for getItemId
			const itemContext = findArrayItemContext(path, state);

			// Generate patch - use pre-mutation property existence check
			if (!hadProperty) {
				// Check if we're adding a field to an array item (should include id)
				// vs adding a new item to an array (should NOT include id)
				if (itemContext) {
					// Adding a field to an existing array item - include the item id
					generateAddPatch(state, propPath, value, itemContext.item, itemContext.pathIndex);
				} else {
					// Adding a new item to an array or a regular property - no id
					generateAddPatch(state, propPath, value);
				}
			} else if (isArrayType && prop === 'length') {
				if (state.options.arrayLengthAssignment === false) {
					// When arrayLengthAssignment is false, generate individual remove patches
					// for each removed item (in reverse order)
					const newLength = value as number;

					if (removedItems) {
						// Array was shrinking - generate remove patches for removed items
						// Iterate in reverse to generate patches from end to start
						for (let i = removedItems.length - 1; i >= 0; i--) {
							const index = newLength + i;
							generateDeletePatch(state, [...path, index], removedItems[i]);
						}
					} else if (newLength > oldValue) {
						// Array is growing - generate add patches for new undefined slots
						for (let i = oldValue; i < newLength; i++) {
							generateAddPatch(state, [...path, i], undefined);
						}
					}
				} else {
					// Use generateReplacePatch for array length to include oldValue
					generateReplacePatch(state, propPath, value, oldValue);
				}
			} else if (isArrayType && typeof propForPath === 'number') {
				// Replacing an array item directly (e.g., state.items[0] = newItem)
				// NO id - whole item replace, not a field modification
				generateSetPatch(state, propPath, value);
			} else if (itemContext) {
				// Modifying a field inside an array item (e.g., state.items[0].name = 'new')
				// or deeply nested (e.g., state.items[0].data.nested.value = 'new')
				// Pass the array item for id extraction and itemPathIndex
				generateSetPatch(state, propPath, value, itemContext.item, itemContext.pathIndex);
			} else {
				// Regular property modification
				generateSetPatch(state, propPath, value);
			}

			return true;
		},

		deleteProperty(obj, prop) {
			if (isArrayType) {
				// For arrays, delete is equivalent to setting to undefined
				return handler.set!(obj, prop, undefined, obj);
			}

			// Map and Set don't support deleteProperty
			if (isMapType || isSetType) {
				throw new Error('Map/Set state does not support deleteProperty.');
			}

			const oldValue = (obj as any)[prop];
			const propPath = [...path, prop];

			if (oldValue !== undefined || Object.prototype.hasOwnProperty.call(obj, prop)) {
				delete (obj as any)[prop];

				// Find array item context for getItemId
				const itemContext = findArrayItemContext(path, state);

				// Generate patch with item context if we're inside an array item
				generateDeletePatch(
					state,
					propPath,
					oldValue,
					itemContext?.item,
					itemContext?.pathIndex,
				);
			}

			return true;
		},

		has(obj, prop) {
			return prop in obj;
		},

		ownKeys(obj) {
			return Reflect.ownKeys(obj);
		},

		getOwnPropertyDescriptor(obj, prop) {
			const descriptor = Reflect.getOwnPropertyDescriptor(obj, prop);
			if (!descriptor) return descriptor;

			return {
				...descriptor,
				writable: true,
				configurable: true,
			};
		},

		getPrototypeOf(obj) {
			return Reflect.getPrototypeOf(obj);
		},
	};

	const proxy = new Proxy(target, handler);

	// Store in cache
	state.proxyCache.set(target, proxy);

	return proxy;
}
