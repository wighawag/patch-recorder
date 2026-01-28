import type {RecorderState} from './types.js';
import {createProxy} from './proxy.js';
import {Operation} from './types.js';
import {generateAddPatch, generateDeletePatch, generateReplacePatch} from './patches.js';
import {cloneIfNeeded, isMap, isArray} from './utils.js';

/**
 * Handle property access on Map objects
 * Wraps mutating methods (set, delete, clear) to generate patches
 */
export function handleMapGet<K = any, V = any>(
	obj: Map<K, V>,
	prop: string | symbol,
	path: (string | number)[],
	state: RecorderState<any>,
): any {
	// Skip symbol properties
	if (typeof prop === 'symbol') {
		return (obj as any)[prop];
	}

	// Mutating methods
	if (prop === 'set') {
		return (key: K, value: V) => {
			// Check if key existed BEFORE mutation
			const existed = keyExistsInOriginal(state.original, path, key);
			const oldValue = obj.get(key);
			const result = obj.set(key, value);

			// Generate patch
			const itemPath = [...path, key as any];

			if (existed) {
				// Key exists - replace
				generateReplacePatch(state, itemPath, cloneIfNeeded(value));
			} else {
				// Key doesn't exist - add
				generateAddPatch(state, itemPath, cloneIfNeeded(value));
			}

			return result;
		};
	}

	if (prop === 'delete') {
		return (key: K) => {
			const oldValue = obj.get(key);
			const result = obj.delete(key);

			if (result) {
				const itemPath = [...path, key as any];
				generateDeletePatch(state, itemPath, cloneIfNeeded(oldValue));
			}

			return result;
		};
	}

	if (prop === 'clear') {
		return () => {
			const entries = Array.from(obj.entries());
			obj.clear();

			// Generate remove patches for all items
			entries.forEach(([key, value]) => {
				const itemPath = [...path, key as any];
				generateDeletePatch(state, itemPath, cloneIfNeeded(value));
			});
		};
	}

	// Non-mutating methods
	if (prop === 'get') {
		return (key: K) => {
			const value = obj.get(key);

			// If the value is an object, return a proxy for nested mutation tracking
			if (value != null && typeof value === 'object') {
				return createProxy(value, [...path, key as any], state);
			}

			return value;
		};
	}

	const nonMutatingMethods = ['has', 'keys', 'values', 'entries', 'forEach'];

	if (nonMutatingMethods.includes(prop)) {
		return (obj as any)[prop].bind(obj);
	}

	// Size property
	if (prop === 'size') {
		return obj.size;
	}

	// Return any other property
	return (obj as any)[prop];
}

/**
 * Navigate to the original Map at the given path and check if a key exists
 * This is needed to check if a key existed before mutations
 */
function keyExistsInOriginal(original: any, path: (string | number)[], key: any): boolean {
	let current = original;
	for (const part of path) {
		if (current == null) return false;
		current = current[part];
	}

	// If we reached a Map, check if the key exists
	if (current instanceof Map) {
		return current.has(key);
	}

	return false;
}
