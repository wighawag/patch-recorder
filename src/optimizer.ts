import type {Patches} from './types.js';

/**
 * Compress patches by merging redundant operations
 */
export function compressPatches(patches: Patches<true>): Patches<true> {
	if (patches.length === 0) {
		return patches;
	}

	const compressed: any[] = [];

	for (let i = 0; i < patches.length; i++) {
		const patch = patches[i];

		// Merge consecutive operations on same path
		if (compressed.length > 0) {
			const prevPatch = compressed[compressed.length - 1];
			
			// Check if paths are equal (handle both array and string paths)
			const pathsEqual = pathsAreEqual(prevPatch.path, patch.path);
			
			if (pathsEqual) {
				// If same path and both are replace operations, keep the latest one
				if (prevPatch.op === 'replace' && patch.op === 'replace') {
					compressed[compressed.length - 1] = patch;
					continue;
				}
				
				// If add followed by replace, just keep the replace
				if (prevPatch.op === 'add' && patch.op === 'replace') {
					compressed[compressed.length - 1] = patch;
					continue;
				}
				
				// If replace followed by delete, just keep the delete
				if (prevPatch.op === 'replace' && patch.op === 'remove') {
					compressed[compressed.length - 1] = patch;
					continue;
				}
				
				// If add followed by delete, skip both (they cancel out)
				if (prevPatch.op === 'add' && patch.op === 'remove') {
					compressed.pop();
					continue;
				}
			}
		}

		// Skip no-op patches (replace with same value)
		if (patch.op === 'replace' && compressed.length > 0) {
			const prevPatch = compressed[compressed.length - 1];
			const pathsEqual = pathsAreEqual(prevPatch.path, patch.path);
			if (pathsEqual && prevPatch.op === 'replace' && valuesEqual(prevPatch.value, patch.value)) {
				continue;
			}
		}

		compressed.push(patch);
	}

	return compressed as Patches<true>;
}

/**
 * Check if two paths are equal (handles both array and string paths)
 */
function pathsAreEqual(path1: any, path2: any): boolean {
	if (path1 === path2) return true;
	
	// If both are arrays
	if (Array.isArray(path1) && Array.isArray(path2)) {
		if (path1.length !== path2.length) return false;
		for (let i = 0; i < path1.length; i++) {
			if (path1[i] !== path2[i]) return false;
		}
		return true;
	}
	
	// If both are strings
	if (typeof path1 === 'string' && typeof path2 === 'string') {
		return path1 === path2;
	}
	
	return false;
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