import type {PatchPath, RecorderState} from './types.js';
import {findArrayItemContext} from './proxy.js';
import {generateAddPatch, generateDeletePatch} from './patches.js';
import {cloneIfNeeded} from './utils.js';

/**
 * Handle property access on Set objects
 * Wraps mutating methods (add, delete, clear) to generate patches
 */
export function handleSetGet(
	obj: Set<any>,
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
	if (prop === 'add') {
		return (value: any) => {
			// Check if value exists BEFORE mutation (current state, not original)
			const existed = obj.has(value);
			const result = obj.add(value);

			// Generate patch only if value didn't exist
			if (!existed) {
				const itemPath = [...path, value as any];
				// Find parent item context if this Set is inside a tracked array item
				const itemContext = findArrayItemContext(path, state);
				generateAddPatch(state, itemPath, cloneIfNeeded(value), itemContext?.item, itemContext?.pathIndex);
			}

			return result;
		};
	}

	if (prop === 'delete') {
		return (value: any) => {
			const existed = obj.has(value);
			const result = obj.delete(value);

			// Generate patch only if value existed
			if (existed) {
				const itemPath = [...path, value as any];
				// Find parent item context if this Set is inside a tracked array item
				const itemContext = findArrayItemContext(path, state);
				generateDeletePatch(state, itemPath, cloneIfNeeded(value), itemContext?.item, itemContext?.pathIndex);
			}

			return result;
		};
	}

	if (prop === 'clear') {
		return () => {
			const values = Array.from(obj.values());
			obj.clear();

			// Find parent item context if this Set is inside a tracked array item
			const itemContext = findArrayItemContext(path, state);

			// Generate remove patches for all items
			values.forEach((value) => {
				const itemPath = [...path, value as any];
				generateDeletePatch(state, itemPath, cloneIfNeeded(value), itemContext?.item, itemContext?.pathIndex);
			});
		};
	}

	// Non-mutating methods
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
