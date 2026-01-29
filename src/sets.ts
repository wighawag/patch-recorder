import type {RecorderState} from './types.js';
import {generateAddPatch, generateDeletePatch} from './patches.js';
import {cloneIfNeeded} from './utils.js';

/**
 * Handle property access on Set objects
 * Wraps mutating methods (add, delete, clear) to generate patches
 */
export function handleSetGet(
	obj: Set<any>,
	prop: string | symbol,
	path: (string | number)[],
	state: RecorderState<any>,
): any {
	// Skip symbol properties
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
				generateAddPatch(state, itemPath, cloneIfNeeded(value));
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
				generateDeletePatch(state, itemPath, cloneIfNeeded(value));
			}

			return result;
		};
	}

	if (prop === 'clear') {
		return () => {
			const values = Array.from(obj.values());
			obj.clear();

			// Generate remove patches for all items
			values.forEach((value) => {
				const itemPath = [...path, value as any];
				generateDeletePatch(state, itemPath, cloneIfNeeded(value));
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

