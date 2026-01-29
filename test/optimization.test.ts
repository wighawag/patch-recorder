import {describe, it, expect} from 'vitest';
import {recordPatches} from '../src/index.js';

describe('recordPatches - Optimization', () => {
	describe('compressPatches', () => {
		it('should remove no-op patches (same value replace)', () => {
			const state = {value: 1};

			const patches = recordPatches(
				state,
				(state) => {
					state.value = 2;
					state.value = 2; // No-op
				},
				{compressPatches: true},
			);

			expect(state.value).toBe(2);
			expect(patches).toEqual([{op: 'replace', path: ['value'], value: 2}]);
		});

		it('should merge consecutive operations on same path', () => {
			const state = {value: 1};

			const patches = recordPatches(
				state,
				(state) => {
					state.value = 2;
					state.value = 3;
					state.value = 4;
				},
				{compressPatches: true},
			);

			expect(state.value).toBe(4);
			expect(patches).toEqual([{op: 'replace', path: ['value'], value: 4}]);
		});

		it('should keep operations on different paths', () => {
			const state = {a: 1, b: 2};

			const patches = recordPatches(
				state,
				(state) => {
					state.a = 3;
					state.b = 4;
				},
				{compressPatches: true},
			);

			expect(state.a).toBe(3);
			expect(state.b).toBe(4);
			expect(patches).toEqual([
				{op: 'replace', path: ['a'], value: 3},
				{op: 'replace', path: ['b'], value: 4},
			]);
		});

		it('should cancel add followed by remove (property existed at deletion time)', () => {
			const state: {obj: Record<string, unknown>} = {obj: {}};

			const patches = recordPatches(
				state,
				(state) => {
					state.obj.newProp = 'value';
					delete state.obj.newProp;
				},
				{compressPatches: true},
			);

			expect('newProp' in state.obj).toBe(false);
			// When a property is added and then deleted in the same mutation,
			// the operations should cancel out with compression
			expect(patches).toEqual([]);
		});

		it('should handle replace followed by same replace', () => {
			const state = {value: 1};

			const patches = recordPatches(
				state,
				(state) => {
					state.value = 2;
					state.value = 2;
				},
				{compressPatches: true},
			);

			expect(state.value).toBe(2);
			expect(patches).toEqual([{op: 'replace', path: ['value'], value: 2}]);
		});

		it('should work with nested objects', () => {
			const state = {nested: {value: 1}};

			const patches = recordPatches(
				state,
				(state) => {
					state.nested.value = 2;
					state.nested.value = 3;
				},
				{compressPatches: true},
			);

			expect(state.nested.value).toBe(3);
			expect(patches).toEqual([{op: 'replace', path: ['nested', 'value'], value: 3}]);
		});

		it('should work with arrays', () => {
			const state = {items: [1, 2, 3]};

			const patches = recordPatches(
				state,
				(state) => {
					state.items[1] = 4;
					state.items[1] = 5;
				},
				{compressPatches: true},
			);

			expect(state.items).toEqual([1, 5, 3]);
			expect(patches).toEqual([{op: 'replace', path: ['items', 1], value: 5}]);
		});

		it('should not optimize when optimize option is false', () => {
			const state = {value: 1};

			const patches = recordPatches(
				state,
				(state) => {
					state.value = 2;
					state.value = 3;
				},
				{compressPatches: false},
			);

			expect(state.value).toBe(3);
			expect(patches).toEqual([
				{op: 'replace', path: ['value'], value: 2},
				{op: 'replace', path: ['value'], value: 3},
			]);
		});

		it('should optimize Map operations', () => {
			const state = {map: new Map([['a', 1]])};

			const patches = recordPatches(
				state,
				(state) => {
					state.map.set('a', 2);
					state.map.set('a', 3);
				},
				{compressPatches: true},
			);

			expect(state.map.get('a')).toBe(3);
			expect(patches).toEqual([{op: 'replace', path: ['map', 'a'], value: 3}]);
		});

		it('should optimize Set operations (no-ops are filtered at source)', () => {
			const state = {set: new Set([1, 2])};

			const patches = recordPatches(
				state,
				(state) => {
					state.set.add(3);
					state.set.add(3); // No-op, already added
				},
				{compressPatches: true},
			);

			expect(state.set.has(3)).toBe(true);
			// Only one patch should be generated for the add
			expect(patches).toEqual([{op: 'add', path: ['set', 3], value: 3}]);
		});

		it('should handle complex scenarios with multiple paths', () => {
			const state = {a: 1, b: 2, c: 3};

			const patches = recordPatches(
				state,
				(state) => {
					state.a = 4;
					state.b = 5;
					state.a = 6; // Update a again
					state.c = 7;
					state.b = 8; // Update b again
				},
				{compressPatches: true},
			);

			expect(state).toEqual({a: 6, b: 8, c: 7});
			expect(patches).toEqual([
				{op: 'replace', path: ['a'], value: 6},
				{op: 'replace', path: ['b'], value: 8},
				{op: 'replace', path: ['c'], value: 7},
			]);
		});
	});
});
