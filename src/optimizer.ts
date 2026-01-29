import type {Patches} from './types.js';
import {pathToKey} from './utils.js';

/**
 * Compress patches by merging redundant operations
 * This handles both consecutive and interleaved operations on the same path
 */
export function compressPatches(patches: Patches<true>): Patches<true> {
	if (patches.length === 0) {
		return patches;
	}

	// Use a Map to track the latest operation for each path
	// Key: optimized path string (using pathToKey), Value: the latest patch for that path
	const pathMap = new Map<string, any>();

	for (const patch of patches) {
		const pathKey = pathToKey(patch.path);
		const existing = pathMap.get(pathKey);

		if (!existing) {
			// First operation on this path
			pathMap.set(pathKey, patch);
		} else {
			// Merge with existing operation based on operation types
			const merged = mergePatches(existing, patch);
			// Check for undefined specifically (null means canceled, which is a valid result)
			if (merged !== undefined) {
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
	}

	// Convert Map to array for final processing
	let finalPatches = Array.from(pathMap.values());

	// Handle array push + pop cancellation
	// Only cancel when push is at the last index and pop reduces length
	finalPatches = cancelArrayPushPop(finalPatches);

	// Cancel patches that are beyond array bounds after final length update
	finalPatches = cancelOutOfBoundsPatches(finalPatches);

	return finalPatches as Patches<true>;
}

/**
 * Cancel array push + pop operations
 * Only cancels when push is at the last index and pop reduces length
 */
function cancelArrayPushPop(patches: Patches<true>): Patches<true> {
	// Group patches by parent array path
	const arrayGroups = new Map<string, Patches<true>>();

	for (const patch of patches) {
		if (!Array.isArray(patch.path) || patch.path.length < 2) {
			continue;
		}

		const parentPath = patch.path.slice(0, -1);
		const parentKey = pathToKey(parentPath);

		if (!arrayGroups.has(parentKey)) {
			arrayGroups.set(parentKey, []);
		}
		arrayGroups.get(parentKey)!.push(patch);
	}

	const cancelablePatches = new Set<string>();

	for (const [, groupPatches] of arrayGroups.entries()) {
		// Find push patches (add at highest indices)
		const pushPatches = groupPatches
			.filter((p) => p.op === 'add' && typeof p.path[p.path.length - 1] === 'number')
			.sort(
				(a, b) => (b.path[b.path.length - 1] as number) - (a.path[a.path.length - 1] as number),
			);

		// Find pop patches (length reduction)
		const popPatches = groupPatches.filter(
			(p) => p.op === 'replace' && p.path[p.path.length - 1] === 'length',
		);

		// Cancel pushes and pops that match (push at highest index, pop reduces length)
		const cancelCount = Math.min(pushPatches.length, popPatches.length);
		for (let i = 0; i < cancelCount; i++) {
			const pushPatch = pushPatches[i];
			const popPatch = popPatches[i];

			// Check if the push index matches the pop target
			const pushIndex = pushPatch.path[pushPatch.path.length - 1] as number;
			const popLength = popPatch.value as number;

			// If push added at index pushIndex and pop reduced to popLength, they cancel
			// This is a heuristic: push adds at end, pop removes from end
			if (pushIndex >= popLength) {
				cancelablePatches.add(pathToKey(pushPatch.path));
				cancelablePatches.add(pathToKey(popPatch.path));
			}
		}
	}

	return patches.filter((patch) => !cancelablePatches.has(pathToKey(patch.path)));
}

/**
 * Cancel patches that are beyond array bounds after final length update
 */
function cancelOutOfBoundsPatches(patches: Patches<true>): Patches<true> {
	// Find the final length for each array
	const arrayLengths = new Map<string, number>();
	const canceledPatches = new Set<string>();

	for (const patch of patches) {
		if (
			Array.isArray(patch.path) &&
			patch.path.length >= 2 &&
			patch.path[patch.path.length - 1] === 'length'
		) {
			const parentPath = pathToKey(patch.path.slice(0, -1));
			arrayLengths.set(parentPath, patch.value as number);
		}
	}

	// Cancel patches at indices >= final length
	for (const patch of patches) {
		if (!Array.isArray(patch.path) || patch.path.length < 2) {
			continue;
		}

		const lastPath = patch.path[patch.path.length - 1];
		const parentPath = pathToKey(patch.path.slice(0, -1));

		if (typeof lastPath === 'number' && arrayLengths.has(parentPath)) {
			const length = arrayLengths.get(parentPath)!;
			if (lastPath >= length) {
				canceledPatches.add(pathToKey(patch.path));
			}
		}
	}

	return patches.filter((patch) => !canceledPatches.has(pathToKey(patch.path)));
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
			// Skip if same reference (no-op)
			if (patch1.value === patch2.value) {
				return patch1;
			}
			return patch2;
		}
		// For add operations, if adding same reference, it's a no-op
		if (op1 === 'add' && patch1.value === patch2.value) {
			return patch1;
		}
		// For remove operations, don't merge (sequential removes should never be merged)
		if (op1 === 'remove') {
			return undefined;
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
		// Remove then add - this is a replace operation
		return {
			op: 'replace',
			path: patch1.path,
			value: patch2.value,
		};
	}

	// Can't merge these operations
	return undefined;
}
