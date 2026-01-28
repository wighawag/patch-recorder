import {describe, it, expect} from 'vitest';
import {create} from 'mutative';
import {recordPatches} from '../src/index.js';

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
			
			expect(mutativeResult).toEqual({ a: 2 });
			expect(recorderState).toEqual({ a: 2 });
			
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
			
			expect(mutativeResult).toEqual({ a: 1, b: 2 });
			expect(recorderState).toEqual({ a: 1, b: 2 });
			
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
			
			expect(mutativeResult).toEqual({ a: 3, b: 4 });
			expect(recorderState).toEqual({ a: 3, b: 4 });
			
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
			
			expect(mutativeResult.user.name).toBe('Jane');
			expect(recorderState.user.name).toBe('Jane');
			
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
			
			expect(mutativeResult.items).toEqual([1, 2, 3]);
			expect(recorderState.items).toEqual([1, 2, 3]);
			
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
			
			expect(mutativeResult.items).toEqual([1, 2]);
			expect(recorderState.items).toEqual([1, 2]);
			
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
			
			expect(mutativeResult.items).toEqual([1, 10, 3]);
			expect(recorderState.items).toEqual([1, 10, 3]);
			
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
			
			expect(mutativeResult).toEqual({ a: 1 });
			expect(recorderState).toEqual({ a: 1 });
			
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