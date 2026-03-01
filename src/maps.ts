import type {PatchPath, RecorderState} from './types.js';
import {createProxy, findArrayItemContext} from './proxy.js';
import {generateAddPatch, generateDeletePatch, generateSetPatch} from './patches.js';
import {cloneIfNeeded} from './utils.js';

/**
 * Handle property access on Map objects
 * Wraps mutating methods (set, delete, clear) to generate patches
 */
export function handleMapGet(
	obj: Map<any, any>,
	prop: string | symbol,
	path: PatchPath,
	state: RecorderState<any>,
): any {
	// Handle symbol properties - return the property value directly
	// Symbol methods like Symbol.iterator should work normally
	if (typeof prop === 'symbol') {
		return (obj as any)[prop];
	}

	// Mutating methods
	if (prop === 'set') {
		return (key: any, value: any) => {
			// Check if key exists BEFORE mutation (current state, not original)
			const existed = obj.has(key);
			const oldValue = obj.get(key);
			const result = obj.set(key, value);

			// Generate patch
			const itemPath = [...path, key as any];
			
			// Find parent item context if this Map is inside a tracked array item
			const itemContext = findArrayItemContext(path, state);

			if (existed) {
				// Key exists - replace
				// Pass 'map' to skip getItemId for the Map's own keys
				// but still include parent item id if nested inside a tracked array item
				generateSetPatch(state, itemPath, cloneIfNeeded(value), itemContext?.item, itemContext?.pathIndex, 'map');
			} else {
				// Key doesn't exist - add
				generateAddPatch(state, itemPath, cloneIfNeeded(value), itemContext?.item, itemContext?.pathIndex);
			}

			return result;
		};
	}

	if (prop === 'delete') {
		return (key: any) => {
			const oldValue = obj.get(key);
			const result = obj.delete(key);

			if (result) {
				const itemPath = [...path, key as any];
				// Find parent item context if this Map is inside a tracked array item
				const itemContext = findArrayItemContext(path, state);
				generateDeletePatch(state, itemPath, cloneIfNeeded(oldValue), itemContext?.item, itemContext?.pathIndex);
			}

			return result;
		};
	}

	if (prop === 'clear') {
		return () => {
			const entries = Array.from(obj.entries());
			obj.clear();

			// Find parent item context if this Map is inside a tracked array item
			const itemContext = findArrayItemContext(path, state);

			// Generate remove patches for all items
			entries.forEach(([key, value]) => {
				const itemPath = [...path, key as any];
				generateDeletePatch(state, itemPath, cloneIfNeeded(value), itemContext?.item, itemContext?.pathIndex);
			});
		};
	}

	// Non-mutating methods
	if (prop === 'get') {
		return (key: any) => {
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
