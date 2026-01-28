import type {Patches} from '../src/types.js';

/**
 * Parse a JSON Pointer (RFC 6901) string into an array of keys
 */
function parseJsonPointer(pointer: string): (string | number)[] {
	if (pointer === '') {
		return [];
	}

	if (pointer[0] !== '/') {
		throw new Error(`Invalid JSON Pointer: "${pointer}"`);
	}

	const parts = pointer.slice(1).split('/');
	return parts.map((part) => {
		// Replace escaped characters (~0 -> ~, ~1 -> /)
		let decoded = part.replace(/~1/g, '/').replace(/~0/g, '~');
		// Try to parse as number for array indices
		const num = Number(decoded);
		return isNaN(num) ? decoded : num;
	});
}

/**
 * Apply RFC 6902 JSON patches to a state
 */
export function applyPatches<T extends Record<string, any> | any[]>(
	state: T,
	patches: Patches<true>,
): T {
	// Deep clone the original state using structuredClone (preserves Map and Set)
	let result = structuredClone(state) as T;

	// Apply patches in order
	for (const patch of patches) {
		// Handle both array paths and string paths (JSON Pointer)
		const path = typeof patch.path === 'string'
			? parseJsonPointer(patch.path)
			: (patch.path as (string | number)[]);

		// Navigate to the parent of the target
		let current = result as any;
		for (let i = 0; i < path.length - 1; i++) {
			current = current[path[i]];
		}

		const key = path[path.length - 1];

		switch (patch.op) {
			case 'add':
				// For Map, use set method
				if (current instanceof Map) {
					current.set(key, patch.value);
				} else if (current instanceof Set) {
					// For Set, add value directly
					current.add(patch.value);
				} else if (Array.isArray(current)) {
					// For arrays, handle both insertion and sparse array cases
					const index = key as number;
					if (index <= current.length) {
						// Within bounds: use splice to insert and shift elements (JSON Patch spec)
						current.splice(index, 0, patch.value);
					} else {
						// Out of bounds: use direct assignment to create sparse array (matches JS behavior)
						current[index] = patch.value;
					}
				} else {
					current[key] = patch.value;
				}
				break;
			case 'remove':
				// For Map, use delete method
				if (current instanceof Map) {
					current.delete(key);
				} else if (current instanceof Set) {
					// For Set, delete the key (which is the value to delete)
					current.delete(key);
				} else if (Array.isArray(current)) {
					// For arrays, use splice to properly remove the element
					current.splice(key as number, 1);
				} else {
					delete current[key];
				}
				break;
			case 'replace':
				// For Map, use set method
				if (current instanceof Map) {
					current.set(key, patch.value);
				} else {
					current[key] = patch.value;
				}
				break;
			default:
				throw new Error(`Unknown patch operation: ${patch.op}`);
		}
	}

	return result;
}