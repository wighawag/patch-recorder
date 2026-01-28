import {describe, it, expect} from 'vitest';
import {create} from 'mutative';
import {recordPatches} from '../src/index.js';

/**
 * Helper function to apply patches to a state and verify correctness
 */
function applyPatchesAndVerify(
	original: Record<string, any>,
	patches: any[],
	expectedResult: Record<string, any>
): Record<string, any> {
	// Deep clone the original state
	let result = JSON.parse(JSON.stringify(original)) as Record<string, any>;
	
	// Apply patches in order
	for (const patch of patches) {
		// Navigate to the parent object
		let current = result;
		const path = patch.path as (string | number)[];
		
		// Navigate to the parent of the target
		for (let i = 0; i < path.length - 1; i++) {
			current = current[path[i]];
		}
		
		const key = path[path.length - 1];
		
		switch (patch.op) {
			case 'add':
				current[key] = patch.value;
				break;
			case 'remove':
				delete current[key];
				break;
			case 'replace':
				current[key] = patch.value;
				break;
			default:
				throw new Error(`Unknown patch operation: ${patch.op}`);
		}
	}
	
	// Verify the result matches the expected mutated state
	expect(result).toEqual(expectedResult);
	
	return result;
}

describe('Comparison with Mutative', () => {
	describe('Basic object mutations', () => {
		it('should generate same patches for single property assignment', () => {
			const state = { a: 1 };
			
			// Mutative
			const [mutativeResult, mutativePatches] = create(JSON.parse(JSON.stringify(state)), (draft) => {
				draft.a = 2;
			}, { enablePatches: true });
			
			// patch-recorder
			const recorderState = JSON.parse(JSON.stringify(state));
			const recorderPatches = recordPatches(recorderState, (draft) => {
				draft.a = 2;
			});
			
			const expectedResult = { a: 2 };
			
			// Verify mutations
			expect(mutativeResult).toEqual(expectedResult);
			expect(recorderState).toEqual(expectedResult);
			
			// Verify patches by applying them to a copy
			const mutativeApplied = applyPatchesAndVerify(state, mutativePatches, expectedResult);
			const recorderApplied = applyPatchesAndVerify(state, recorderPatches, expectedResult);
			
			expect(mutativeApplied).toEqual(expectedResult);
			expect(recorderApplied).toEqual(expectedResult);
			
			// Both should generate a replace patch
			expect(mutativePatches.length).toBe(1);
			expect(recorderPatches.length).toBe(1);
			expect(mutativePatches[0].op).toBe('replace');
			expect(recorderPatches[0].op).toBe('replace');
			expect(mutativePatches[0].path).toEqual(['a']);
			expect(recorderPatches[0].path).toEqual(['a']);
			expect(mutativePatches[0].value).toBe(2);
			expect(recorderPatches[0].value).toBe(2);
		});

		it('should generate same patches for adding new property', () => {
			const state = { a: 1 };
			
			// Mutative
			const [mutativeResult, mutativePatches] = create(JSON.parse(JSON.stringify(state)), (draft) => {
				draft.b = 2;
			}, { enablePatches: true });
			
			// patch-recorder
			const recorderState = JSON.parse(JSON.stringify(state));
			const recorderPatches = recordPatches(recorderState, (draft) => {
				draft.b = 2;
			});
			
			const expectedResult = { a: 1, b: 2 };
			
			// Verify mutations
			expect(mutativeResult).toEqual(expectedResult);
			expect(recorderState).toEqual(expectedResult);
			
			// Verify patches by applying them to a copy
			const mutativeApplied = applyPatchesAndVerify(state, mutativePatches, expectedResult);
			const recorderApplied = applyPatchesAndVerify(state, recorderPatches, expectedResult);
			
			expect(mutativeApplied).toEqual(expectedResult);
			expect(recorderApplied).toEqual(expectedResult);
			
			// Both should generate an add patch
			expect(mutativePatches.length).toBe(1);
			expect(recorderPatches.length).toBe(1);
			expect(mutativePatches[0].op).toBe('add');
			expect(recorderPatches[0].op).toBe('add');
		});

		it('should generate patches for multiple property assignments', () => {
			const state = { a: 1, b: 2 };
			
			// Mutative
			const [mutativeResult, mutativePatches] = create(JSON.parse(JSON.stringify(state)), (draft) => {
				draft.a = 3;
				draft.b = 4;
			}, { enablePatches: true });
			
			// patch-recorder
			const recorderState = JSON.parse(JSON.stringify(state));
			const recorderPatches = recordPatches(recorderState, (draft) => {
				draft.a = 3;
				draft.b = 4;
			});
			
			const expectedResult = { a: 3, b: 4 };
			
			// Verify mutations
			expect(mutativeResult).toEqual(expectedResult);
			expect(recorderState).toEqual(expectedResult);
			
			// Verify patches by applying them to a copy
			const mutativeApplied = applyPatchesAndVerify(state, mutativePatches, expectedResult);
			const recorderApplied = applyPatchesAndVerify(state, recorderPatches, expectedResult);
			
			expect(mutativeApplied).toEqual(expectedResult);
			expect(recorderApplied).toEqual(expectedResult);
			
			// Both should generate 2 replace patches
			expect(mutativePatches.length).toBe(2);
			expect(recorderPatches.length).toBe(2);
		});
	});

	describe('Nested object mutations', () => {
		it('should generate patches for nested property assignment', () => {
			const state = { user: { name: 'John' } };
			
			// Mutative
			const [mutativeResult, mutativePatches] = create(JSON.parse(JSON.stringify(state)), (draft) => {
				draft.user.name = 'Jane';
			}, { enablePatches: true });
			
			// patch-recorder
			const recorderState = JSON.parse(JSON.stringify(state));
			const recorderPatches = recordPatches(recorderState, (draft) => {
				draft.user.name = 'Jane';
			});
			
			const expectedResult = { user: { name: 'Jane' } };
			
			// Verify mutations
			expect(mutativeResult).toEqual(expectedResult);
			expect(recorderState).toEqual(expectedResult);
			
			// Verify patches by applying them to a copy
			const mutativeApplied = applyPatchesAndVerify(state, mutativePatches, expectedResult);
			const recorderApplied = applyPatchesAndVerify(state, recorderPatches, expectedResult);
			
			expect(mutativeApplied).toEqual(expectedResult);
			expect(recorderApplied).toEqual(expectedResult);
			
			// Both should generate a replace patch with nested path
			expect(mutativePatches.length).toBe(1);
			expect(recorderPatches.length).toBe(1);
			expect(mutativePatches[0].path).toEqual(['user', 'name']);
			expect(recorderPatches[0].path).toEqual(['user', 'name']);
		});
	});

	describe('Array mutations', () => {
		it('should generate patches for array push', () => {
			const state = { items: [1, 2] };
			
			// Mutative
			const [mutativeResult, mutativePatches] = create(JSON.parse(JSON.stringify(state)), (draft) => {
				draft.items.push(3);
			}, { enablePatches: true });
			
			// patch-recorder
			const recorderState = JSON.parse(JSON.stringify(state));
			const recorderPatches = recordPatches(recorderState, (draft) => {
				draft.items.push(3);
			});
			
			const expectedResult = { items: [1, 2, 3] };
			
			// Verify mutations
			expect(mutativeResult).toEqual(expectedResult);
			expect(recorderState).toEqual(expectedResult);
			
			// Verify patches by applying them to a copy
			const mutativeApplied = applyPatchesAndVerify(state, mutativePatches, expectedResult);
			const recorderApplied = applyPatchesAndVerify(state, recorderPatches, expectedResult);
			
			expect(mutativeApplied).toEqual(expectedResult);
			expect(recorderApplied).toEqual(expectedResult);
			
			// Both should generate an add patch
			expect(mutativePatches.length).toBeGreaterThanOrEqual(1);
			expect(recorderPatches.length).toBeGreaterThanOrEqual(1);
			
			// Check for add operation
			const mutativeAdd = mutativePatches.find(p => p.op === 'add');
			const recorderAdd = recorderPatches.find(p => p.op === 'add');
			expect(mutativeAdd).toBeDefined();
			expect(recorderAdd).toBeDefined();
		});

		it('should generate patches for array pop', () => {
			const state = { items: [1, 2, 3] };
			
			// Mutative
			const [mutativeResult, mutativePatches] = create(JSON.parse(JSON.stringify(state)), (draft) => {
				draft.items.pop();
			}, { enablePatches: true });
			
			// patch-recorder
			const recorderState = JSON.parse(JSON.stringify(state));
			const recorderPatches = recordPatches(recorderState, (draft) => {
				draft.items.pop();
			});
			
			const expectedResult = { items: [1, 2] };
			
			// Verify mutations
			expect(mutativeResult).toEqual(expectedResult);
			expect(recorderState).toEqual(expectedResult);
			
			// Verify patches by applying them to a copy
			const mutativeApplied = applyPatchesAndVerify(state, mutativePatches, expectedResult);
			const recorderApplied = applyPatchesAndVerify(state, recorderPatches, expectedResult);
			
			expect(mutativeApplied).toEqual(expectedResult);
			expect(recorderApplied).toEqual(expectedResult);
			
			// Both should generate patches (mutative uses replace, patch-recorder uses remove + replace)
			expect(mutativePatches.length).toBeGreaterThan(0);
			expect(recorderPatches.length).toBeGreaterThan(0);
			
			// Both should update array length
			const mutativeLength = mutativePatches.find(p => p.path.length === 2 && p.path[0] === 'items' && p.path[1] === 'length');
			const recorderLength = recorderPatches.find(p => p.path.length === 2 && p.path[0] === 'items' && p.path[1] === 'length');
			expect(mutativeLength).toBeDefined();
			expect(recorderLength).toBeDefined();
		});

		it('should generate patches for array index assignment', () => {
			const state = { items: [1, 2, 3] };
			
			// Mutative
			const [mutativeResult, mutativePatches] = create(JSON.parse(JSON.stringify(state)), (draft) => {
				draft.items[1] = 10;
			}, { enablePatches: true });
			
			// patch-recorder
			const recorderState = JSON.parse(JSON.stringify(state));
			const recorderPatches = recordPatches(recorderState, (draft) => {
				draft.items[1] = 10;
			});
			
			const expectedResult = { items: [1, 10, 3] };
			
			// Verify mutations
			expect(mutativeResult).toEqual(expectedResult);
			expect(recorderState).toEqual(expectedResult);
			
			// Verify patches by applying them to a copy
			const mutativeApplied = applyPatchesAndVerify(state, mutativePatches, expectedResult);
			const recorderApplied = applyPatchesAndVerify(state, recorderPatches, expectedResult);
			
			expect(mutativeApplied).toEqual(expectedResult);
			expect(recorderApplied).toEqual(expectedResult);
			
			// Both should generate a replace patch
			const mutativeReplace = mutativePatches.find(p => p.op === 'replace');
			const recorderReplace = recorderPatches.find(p => p.op === 'replace');
			expect(mutativeReplace).toBeDefined();
			expect(recorderReplace).toBeDefined();
			expect(mutativeReplace!.path).toEqual(['items', 1]);
			expect(recorderReplace!.path).toEqual(['items', 1]);
		});
	});

	describe('Property deletion', () => {
		it('should generate patches for property deletion', () => {
			const state = { a: 1, b: 2 };
			
			// Mutative
			const [mutativeResult, mutativePatches] = create(JSON.parse(JSON.stringify(state)), (draft) => {
				delete draft.b;
			}, { enablePatches: true });
			
			// patch-recorder
			const recorderState = JSON.parse(JSON.stringify(state));
			const recorderPatches = recordPatches(recorderState, (draft) => {
				delete draft.b;
			});
			
			const expectedResult = { a: 1 };
			
			// Verify mutations
			expect(mutativeResult).toEqual(expectedResult);
			expect(recorderState).toEqual(expectedResult);
			
			// Verify patches by applying them to a copy
			const mutativeApplied = applyPatchesAndVerify(state, mutativePatches, expectedResult);
			const recorderApplied = applyPatchesAndVerify(state, recorderPatches, expectedResult);
			
			expect(mutativeApplied).toEqual(expectedResult);
			expect(recorderApplied).toEqual(expectedResult);
			
			// Both should generate a remove patch
			expect(mutativePatches.length).toBe(1);
			expect(recorderPatches.length).toBe(1);
			expect(mutativePatches[0].op).toBe('remove');
			expect(recorderPatches[0].op).toBe('remove');
			expect(mutativePatches[0].path).toEqual(['b']);
			expect(recorderPatches[0].path).toEqual(['b']);
		});
	});

	describe('RFC 6902 compliance', () => {
		it('should generate valid JSON patches', () => {
			const state = { a: 1 };
			
			const patches = recordPatches(JSON.parse(JSON.stringify(state)), (draft) => {
				draft.a = 2;
			});
			
			// Verify patch structure
			expect(patches).toHaveLength(1);
			expect(patches[0]).toHaveProperty('op');
			expect(patches[0]).toHaveProperty('path');
			expect(patches[0]).toHaveProperty('value');
			
			// Verify op is one of the valid operations
			expect(['add', 'remove', 'replace', 'move', 'copy', 'test']).toContain(patches[0].op);
		});
	});
});