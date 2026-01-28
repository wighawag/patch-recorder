import type {Patches} from './types.js';

/**
 * Compress patches by merging redundant operations
 * This handles both consecutive and interleaved operations on the same path
 */
export function compressPatches(
	patches: Patches<true>,
	oldValuesMap?: Map<string, any>,
): Patches<true> {
	if (patches.length === 0) {
		return patches;
	}

	// Use a Map to track the latest operation for each path
	// Key: JSON stringified path, Value: the latest patch for that path
	const pathMap = new Map<string, any>();

	for (const patch of patches) {
		const pathKey = JSON.stringify(patch.path);
		const existing = pathMap.get(pathKey);

		if (!existing) {
			// First operation on this path
			pathMap.set(pathKey, patch);
			continue;
		}

		// Merge with existing operation based on operation types
		const merged = mergePatches(existing, patch, oldValuesMap);
		if (merged) {
			// Update with merged result (or null if they cancel out)
			if (merged !== null) {
				pathMap.set(pathKey, merged);
			} else {
				// Operations canceled each other out
				pathMap.delete(pathKey);
			}
		} else {
			// Can't merge, keep the new operation
			pathMap.set(pathKey, patch);
		}
	}

	// Convert Map back to array
	return Array.from(pathMap.values()) as Patches<true>;
}

/**
 * Merge two patches on the same path
 * Returns the merged patch, or null if they cancel out, or undefined if they can't be merged
 */
function mergePatches(patch1: any, patch2: any, oldValuesMap?: Map<string, any>): any | null | undefined {
	const op1 = patch1.op;
	const op2 = patch2.op;

	// Same operations - keep the latest one
	if (op1 === op2) {
		// For replace operations, keep the latest value
		if (op1 === 'replace') {
			// Skip if same reference (no-op)
			if (patch1.value === patch2.value) {
				return patch1;
			}
			// Check if replace reverts to original value (stored in oldValuesMap)
			if (oldValuesMap) {
				const pathKey = JSON.stringify(patch2.path);
				const oldValue = oldValuesMap.get(pathKey);
				if (patch2.value === oldValue) {
					// Reverts to original - cancel out
					return null;
				}
			}
			return patch2;
		}
		// For add operations, if adding same reference, it's a no-op
		if (op1 === 'add' && patch1.value === patch2.value) {
			return patch1;
		}
		// For remove operations, keep the latest
		if (op1 === 'remove') {
			return patch2;
		}
	}

	// Different operations
	if (op1 === 'add' && op2 === 'replace') {
		// Add then replace - just keep the replace
		return patch2;
	}

	if (op1 === 'replace' && op2 === 'replace') {
		// Replace then replace - keep the latest
		return patch2;
	}

	if (op1 === 'replace' && op2 === 'remove') {
		// Replace then delete - just keep the delete
		return patch2;
	}

	if (op1 === 'add' && op2 === 'remove') {
		// Add then remove - they cancel out
		return null;
	}

	if (op1 === 'remove' && op2 === 'add') {
		// Remove then add - keep the add
		return patch2;
	}

	// Can't merge these operations
	return undefined;
}
