import type {Patches} from './types.js';

/**
 * Compress patches by merging redundant operations
 * This handles both consecutive and interleaved operations on the same path
 */
export function compressPatches(patches: Patches<true>): Patches<true> {
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
		const merged = mergePatches(existing, patch);
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
function mergePatches(patch1: any, patch2: any): any | null | undefined {
	const op1 = patch1.op;
	const op2 = patch2.op;

	// Same operations - keep the latest one
	if (op1 === op2) {
		// For replace operations, keep the latest value
		if (op1 === 'replace') {
			// Skip if same value (no-op)
			if (valuesEqual(patch1.value, patch2.value)) {
				return patch1;
			}
			return patch2;
		}
		// For add operations, if adding the same value, it's a no-op
		if (op1 === 'add' && valuesEqual(patch1.value, patch2.value)) {
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

/**
 * Check if two values are equal (deep comparison)
 */
function valuesEqual(val1: any, val2: any): boolean {
	if (val1 === val2) return true;

	// Handle null/undefined
	if (val1 == null || val2 == null) return val1 === val2;

	// Handle arrays
	if (Array.isArray(val1) && Array.isArray(val2)) {
		if (val1.length !== val2.length) return false;
		for (let i = 0; i < val1.length; i++) {
			if (!valuesEqual(val1[i], val2[i])) return false;
		}
		return true;
	}

	// Handle objects
	if (typeof val1 === 'object' && typeof val2 === 'object') {
		const keys1 = Object.keys(val1);
		const keys2 = Object.keys(val2);

		if (keys1.length !== keys2.length) return false;

		for (const key of keys1) {
			if (!valuesEqual(val1[key], val2[key])) return false;
		}
		return true;
	}

	return false;
}
