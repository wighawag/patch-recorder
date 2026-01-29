import type {PatchPath, RecorderState} from './types.js';
import {generateSetPatch, generateDeletePatch, generateAddPatch} from './patches.js';
import {isArray, isMap, isSet} from './utils.js';
import {handleArrayGet} from './arrays.js';
import {handleMapGet} from './maps.js';
import {handleSetGet} from './sets.js';

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

			// Mutate original immediately
			(obj as any)[prop] = value;

			// Generate patch - use pre-mutation property existence check
			if (!hadProperty) {
				generateAddPatch(state, propPath, value);
			} else {
				generateSetPatch(state, propPath, oldValue, value);
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

	const proxy = new Proxy(target, handler);

	// Store in cache
	state.proxyCache.set(target, proxy);

	return proxy;
}
