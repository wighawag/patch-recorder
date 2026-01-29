import {describe, it, expect} from 'vitest';
import {recordPatches} from '../src/index.js';

describe('recordPatches - Sets', () => {
	describe('add method', () => {
		it('should record adding new value', () => {
			const state = {set: new Set<number>([1, 2])};

			const patches = recordPatches(state, (state) => {
				state.set.add(3);
			});

			expect(state.set.has(3)).toBe(true);
			expect(patches).toEqual([{op: 'add', path: ['set', 3], value: 3}]);
		});

		it('should not record patch when adding existing value', () => {
			const state = {set: new Set<number>([1, 2])};

			const patches = recordPatches(state, (state) => {
				state.set.add(2);
			});

			expect(patches).toEqual([]);
		});

		it('should record multiple add operations', () => {
			const state = {set: new Set<number>([1])};

			const patches = recordPatches(state, (state) => {
				state.set.add(2);
				state.set.add(3);
			});

			expect(state.set.has(2)).toBe(true);
			expect(state.set.has(3)).toBe(true);
			expect(patches).toEqual([
				{op: 'add', path: ['set', 2], value: 2},
				{op: 'add', path: ['set', 3], value: 3},
			]);
		});

		it('should support string values', () => {
			const state = {set: new Set<string>(['a'])};

			const patches = recordPatches(state, (state) => {
				state.set.add('b');
			});

			expect(state.set.has('b')).toBe(true);
			expect(patches).toEqual([{op: 'add', path: ['set', 'b'], value: 'b'}]);
		});

		it('should support object values', () => {
			const obj1 = {id: 1};
			const obj2 = {id: 2};
			const state = {set: new Set<object>([obj1])};

			const patches = recordPatches(state, (state) => {
				state.set.add(obj2);
			});

			expect(state.set.has(obj2)).toBe(true);
			expect(patches).toEqual([{op: 'add', path: ['set', obj2], value: obj2}]);
		});
	});

	describe('delete method', () => {
		it('should record delete operation', () => {
			const state = {set: new Set<number>([1, 2, 3])};

			const patches = recordPatches(state, (state) => {
				state.set.delete(2);
			});

			expect(state.set.has(2)).toBe(false);
			expect(patches).toEqual([{op: 'remove', path: ['set', 2]}]);
		});

		it('should record multiple delete operations', () => {
			const state = {set: new Set<number>([1, 2, 3])};

			const patches = recordPatches(state, (state) => {
				state.set.delete(2);
				state.set.delete(3);
			});

			expect(state.set.has(2)).toBe(false);
			expect(state.set.has(3)).toBe(false);
			expect(patches).toEqual([
				{op: 'remove', path: ['set', 2]},
				{op: 'remove', path: ['set', 3]},
			]);
		});

		it('should not record patch when deleting non-existent value', () => {
			const state = {set: new Set<number>([1])};

			const patches = recordPatches(state, (state) => {
				state.set.delete(2);
			});

			expect(patches).toEqual([]);
		});
	});

	describe('clear method', () => {
		it('should record clear operation', () => {
			const state = {set: new Set<number>([1, 2, 3])};

			const patches = recordPatches(state, (state) => {
				state.set.clear();
			});

			expect(state.set.size).toBe(0);
			expect(patches).toHaveLength(3);
			expect(patches).toEqual(
				expect.arrayContaining([
					{op: 'remove', path: ['set', 1]},
					{op: 'remove', path: ['set', 2]},
					{op: 'remove', path: ['set', 3]},
				]),
			);
		});
	});

	describe('non-mutating methods', () => {
		it('should support has method', () => {
			const state = {set: new Set<number>([1, 2])};

			recordPatches(state, (state) => {
				const hasValue = state.set.has(1);
				expect(hasValue).toBe(true);
			});

			// No patches should be generated
			expect(state.set.has(1)).toBe(true);
		});

		it('should support keys method', () => {
			const state = {set: new Set<number>([1, 2])};

			recordPatches(state, (state) => {
				const keys = Array.from(state.set.keys());
				expect(keys).toEqual([1, 2]);
			});
		});

		it('should support values method', () => {
			const state = {set: new Set<number>([1, 2])};

			recordPatches(state, (state) => {
				const values = Array.from(state.set.values());
				expect(values).toEqual([1, 2]);
			});
		});

		it('should support entries method', () => {
			const state = {set: new Set<number>([1, 2])};

			recordPatches(state, (state) => {
				const entries = Array.from(state.set.entries());
				expect(entries).toEqual([
					[1, 1],
					[2, 2],
				]);
			});
		});

		it('should support forEach method', () => {
			const state = {set: new Set<number>([1, 2])};

			recordPatches(state, (state) => {
				const values: number[] = [];
				state.set.forEach((value) => {
					values.push(value);
				});
				expect(values).toEqual([1, 2]);
			});
		});

		it('should support size property', () => {
			const state = {set: new Set<number>([1, 2])};

			recordPatches(state, (state) => {
				expect(state.set.size).toBe(2);
			});
		});
	});
});
