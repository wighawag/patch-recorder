import type {Patch, Patches, PatchPath} from './types.js';
import {pathToKey} from './utils.js';

// ==================== Nested Map data structure ====================

/**
 * Node in the path tree for efficient path lookup
 */
interface PathNode {
	patch?: Patch;
	children?: Map<string | number | symbol | object, PathNode>;
}

/**
 * Navigate to a node in the path tree, creating nodes along the way
 */
function getOrCreateNode(root: PathNode, path: PatchPath): PathNode {
	let current = root;
	for (const key of path) {
		if (!current.children) {
			current.children = new Map();
		}
		let child = current.children.get(key);
		if (!child) {
			child = {};
			current.children.set(key, child);
		}
		current = child;
	}
	return current;
}

/**
 * Collect all patches from the path tree
 */
function collectPatches(node: PathNode, patches: Patches = []): Patches {
	if (node.patch) {
		patches.push(node.patch);
	}
	if (node.children) {
		for (const child of node.children.values()) {
			collectPatches(child, patches);
		}
	}
	return patches;
}

// ==================== V2: Nested Map optimizer (faster) ====================

/**
 * Compress patches by merging redundant operations using nested Maps
 * This is faster than the string-key version because:
 * - No string allocation for path keys
 * - Preserves symbol and object identity
 * - 2.5-5x faster in benchmarks
 */
export function compressPatchesWithNestedMaps(patches: Patches): Patches {
	if (patches.length === 0) {
		return patches;
	}

	// Use a nested Map tree to track the latest operation for each path
	const root: PathNode = {};

	for (const patch of patches) {
		const node = getOrCreateNode(root, patch.path);
		const existing = node.patch;

		if (!existing) {
			// First operation on this path
			node.patch = patch;
		} else {
			// Merge with existing operation based on operation types
			const merged = mergePatches(existing, patch);
			// Check for undefined specifically (null means canceled, which is a valid result)
			if (merged !== undefined) {
				// Update with merged result (or null if they cancel out)
				if (merged !== null) {
					node.patch = merged;
				} else {
					// Operations canceled each other out
					delete node.patch;
				}
			} else {
				// Can't merge, keep the new operation
				node.patch = patch;
			}
		}
	}

	// Collect all patches from tree
	let finalPatches = collectPatches(root);

	// Handle array push + pop cancellation
	// Only cancel when push is at the last index and pop reduces length
	finalPatches = cancelArrayPushPop(finalPatches);

	// Cancel patches that are beyond array bounds after final length update
	finalPatches = cancelOutOfBoundsPatches(finalPatches);

	return finalPatches;
}

// ==================== V1: String key optimizer (original) ====================

/**
 * Compress patches by merging redundant operations using string keys
 * This is the original implementation that uses pathToKey for path lookup.
 */
export function compressPatchesWithStringKeys(patches: Patches): Patches {
	if (patches.length === 0) {
		return patches;
	}

	// Use a Map to track the latest operation for each path
	// Key: optimized path string (using pathToKey), Value: the latest patch for that path
	const pathMap = new Map<string, Patch>();

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

	return finalPatches;
}

// ==================== Default export ====================

/**
 * Compress patches by merging redundant operations
 * This handles both consecutive and interleaved operations on the same path
 *
 * Uses the nested Map implementation for better performance (2.5-5x faster)
 */
export const compressPatches = compressPatchesWithNestedMaps;

// ==================== Post-processing functions (shared) ====================

/**
 * Cancel array push + pop operations
 * Only cancels when push is at the last index and pop reduces length
 *
 * Note: Uses pathToKey for grouping since this works on already-compressed patches
 * (smaller set) and the performance benefit of nested Maps is less significant here.
 */
function cancelArrayPushPop(patches: Patches): Patches {
	// Group patches by parent array path
	const arrayGroups = new Map<string, Patches>();

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

	// Use WeakSet to track cancelable patches by reference (no string allocation)
	const cancelablePatches = new WeakSet<Patch>();

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
				cancelablePatches.add(pushPatch);
				cancelablePatches.add(popPatch);
			}
		}
	}

	return patches.filter((patch) => !cancelablePatches.has(patch));
}

/**
 * Cancel patches that are beyond array bounds after final length update
 */
function cancelOutOfBoundsPatches(patches: Patches): Patches {
	// Find the final length for each array
	const arrayLengths = new Map<string, number>();

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

	// Use WeakSet to track canceled patches by reference (no string allocation)
	const canceledPatches = new WeakSet<Patch>();

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
				canceledPatches.add(patch);
			}
		}
	}

	return patches.filter((patch) => !canceledPatches.has(patch));
}

// ==================== Patch merging logic (shared) ====================

/**
 * Merge two patches on the same path
 * Returns the merged patch, or null if they cancel out, or undefined if they can't be merged
 */
function mergePatches(patch1: Patch, patch2: Patch): Patch | null | undefined {
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
