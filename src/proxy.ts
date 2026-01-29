import type {RecorderState, RecordPatchesOptions} from './types.js';
import {generateSetPatch, generateDeletePatch, generateAddPatch} from './patches.js';
import {isArray, isMap, isSet} from './utils.js';
import {handleArrayGet} from './arrays.js';
import {handleMapGet} from './maps.js';
import {handleSetGet} from './sets.js';

export function createProxy<T extends object, PatchesOption extends RecordPatchesOptions>(
	target: T,
	path: (string | number)[],
	state: RecorderState<any, PatchesOption>,
): T {
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

			// Create nested proxy for draftable values
			// Only include string | number in path, skip symbols
			if (typeof prop === 'string' || typeof prop === 'number') {
				return createProxy(value, [...path, prop], state);
			}
			return value;
		},

		set(obj, prop, value) {
			// Map and Set don't support direct property assignment
			if (isMapType || isSetType) {
				throw new Error('Map/Set draft does not support any property assignment.');
			}

			const oldValue = (obj as any)[prop];

			// Only create path for string | number props, skip symbols
			if (typeof prop !== 'string' && typeof prop !== 'number') {
				(obj as any)[prop] = value;
				return true;
			}

			// Convert numeric string props to numbers for array indices
			const propForPath = typeof prop === 'string' && !isNaN(Number(prop)) ? Number(prop) : prop;
			const propPath = [...path, propForPath];

			// Skip if no actual change (handle undefined as a valid value)
			// Use Object.is to correctly handle NaN (NaN !== NaN, but Object.is(NaN, NaN) === true)
			if (
				Object.is(oldValue, value) &&
				(value !== undefined || Object.prototype.hasOwnProperty.call(obj, prop))
			) {
				return true;
			}

			// Determine if this is an add or replace operation by checking the original state
			let originalHasProperty = false;
			let originalValue = undefined;

			// Navigate to the original object at this path
			let currentOriginal = state.original as any;
			for (let i = 0; i < path.length; i++) {
				currentOriginal = currentOriginal[path[i]];
				if (currentOriginal === undefined || currentOriginal === null) {
					break;
				}
			}

			if (currentOriginal && currentOriginal !== undefined && currentOriginal !== null) {
				// For arrays, check if the index is within the array length (handles sparse arrays correctly)
				if (Array.isArray(currentOriginal)) {
					// Convert prop to number if it's a numeric string
					const index = typeof prop === 'string' && !isNaN(Number(prop)) ? Number(prop) : prop;
					if (typeof index === 'number') {
						originalHasProperty = index >= 0 && index < currentOriginal.length;
						originalValue = (currentOriginal as any)[index];
					} else {
						originalHasProperty = Object.prototype.hasOwnProperty.call(currentOriginal, prop);
						originalValue = (currentOriginal as any)[prop];
					}
				} else {
					originalHasProperty = Object.prototype.hasOwnProperty.call(currentOriginal, prop);
					originalValue = (currentOriginal as any)[prop];
				}
			}

			// Mutate original immediately
			(obj as any)[prop] = value;

			// Generate patch
			if (!originalHasProperty) {
				generateAddPatch(state, propPath, value);
			} else {
				generateSetPatch(state, propPath, originalValue, value);
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
				throw new Error('Map/Set draft does not support deleteProperty.');
			}

			const oldValue = (obj as any)[prop];

			// Only create path for string | number props, skip symbols
			if (typeof prop !== 'string' && typeof prop !== 'number') {
				delete (obj as any)[prop];
				return true;
			}

			const propPath = [...path, prop];

			if (oldValue !== undefined || Object.prototype.hasOwnProperty.call(obj, prop)) {
				delete (obj as any)[prop];

				// Generate patch
				generateDeletePatch(state, propPath, oldValue);
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

	return new Proxy(target, handler);
}
