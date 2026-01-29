import {describe, it, expect} from 'vitest';
import {recordPatches} from '../src/index.js';

describe('recordPatches - Maps', () => {
	describe('set method', () => {
		it('should record adding new key', () => {
			const state = {map: new Map<string, number>([['a', 1]])};

			const patches = recordPatches(state, (state) => {
				state.map.set('b', 2);
			});

			expect(state.map.get('b')).toBe(2);
			expect(patches).toEqual([{op: 'add', path: ['map', 'b'], value: 2}]);
		});

		it('should record replacing existing key', () => {
			const state = {
				map: new Map<string, number>([
					['a', 1],
					['b', 2],
				]),
			};

			const patches = recordPatches(state, (state) => {
				state.map.set('b', 3);
			});

			expect(state.map.get('b')).toBe(3);
			expect(patches).toEqual([{op: 'replace', path: ['map', 'b'], value: 3}]);
		});

		it('should record multiple set operations', () => {
			const state = {map: new Map<string, number>([['a', 1]])};

			const patches = recordPatches(state, (state) => {
				state.map.set('b', 2);
				state.map.set('c', 3);
			});

			expect(state.map.get('b')).toBe(2);
			expect(state.map.get('c')).toBe(3);
			expect(patches).toEqual([
				{op: 'add', path: ['map', 'b'], value: 2},
				{op: 'add', path: ['map', 'c'], value: 3},
			]);
		});

		it('should support number keys', () => {
			const state = {map: new Map<number, string>([[1, 'one']])};

			const patches = recordPatches(state, (state) => {
				state.map.set(2, 'two');
			});

			expect(state.map.get(2)).toBe('two');
			expect(patches).toEqual([{op: 'add', path: ['map', 2], value: 'two'}]);
		});

		it('should support object keys', () => {
			const key1 = {id: 1};
			const key2 = {id: 2};
			const state = {map: new Map<object, string>([[key1, 'one']])};

			const patches = recordPatches(state, (state) => {
				state.map.set(key2, 'two');
			});

			expect(state.map.get(key2)).toBe('two');
			expect(patches).toEqual([{op: 'add', path: ['map', key2], value: 'two'}]);
		});
	});

	describe('delete method', () => {
		it('should record delete operation', () => {
			const state = {
				map: new Map<string, number>([
					['a', 1],
					['b', 2],
					['c', 3],
				]),
			};

			const patches = recordPatches(state, (state) => {
				state.map.delete('b');
			});

			expect(state.map.has('b')).toBe(false);
			expect(patches).toEqual([{op: 'remove', path: ['map', 'b']}]);
		});

		it('should record multiple delete operations', () => {
			const state = {
				map: new Map<string, number>([
					['a', 1],
					['b', 2],
					['c', 3],
				]),
			};

			const patches = recordPatches(state, (state) => {
				state.map.delete('b');
				state.map.delete('c');
			});

			expect(state.map.has('b')).toBe(false);
			expect(state.map.has('c')).toBe(false);
			expect(patches).toEqual([
				{op: 'remove', path: ['map', 'b']},
				{op: 'remove', path: ['map', 'c']},
			]);
		});

		it('should not record patch when deleting non-existent key', () => {
			const state = {map: new Map<string, number>([['a', 1]])};

			const patches = recordPatches(state, (state) => {
				state.map.delete('b');
			});

			expect(patches).toEqual([]);
		});
	});

	describe('clear method', () => {
		it('should record clear operation', () => {
			const state = {
				map: new Map<string, number>([
					['a', 1],
					['b', 2],
					['c', 3],
				]),
			};

			const patches = recordPatches(state, (state) => {
				state.map.clear();
			});

			expect(state.map.size).toBe(0);
			expect(patches).toHaveLength(3);
			expect(patches).toEqual(
				expect.arrayContaining([
					{op: 'remove', path: ['map', 'a']},
					{op: 'remove', path: ['map', 'b']},
					{op: 'remove', path: ['map', 'c']},
				]),
			);
		});
	});

	describe('non-mutating methods', () => {
		it('should support get method', () => {
			const state = {map: new Map<string, number>([['a', 1]])};

			recordPatches(state, (state) => {
				const value = state.map.get('a');
				expect(value).toBe(1);
			});

			// No patches should be generated
			expect(state.map.get('a')).toBe(1);
		});

		it('should support has method', () => {
			const state = {map: new Map<string, number>([['a', 1]])};

			recordPatches(state, (state) => {
				const hasKey = state.map.has('a');
				expect(hasKey).toBe(true);
			});
		});

		it('should support keys method', () => {
			const state = {
				map: new Map<string, number>([
					['a', 1],
					['b', 2],
				]),
			};

			recordPatches(state, (state) => {
				const keys = Array.from(state.map.keys());
				expect(keys).toEqual(['a', 'b']);
			});
		});

		it('should support values method', () => {
			const state = {
				map: new Map<string, number>([
					['a', 1],
					['b', 2],
				]),
			};

			recordPatches(state, (state) => {
				const values = Array.from(state.map.values());
				expect(values).toEqual([1, 2]);
			});
		});

		it('should support entries method', () => {
			const state = {
				map: new Map<string, number>([
					['a', 1],
					['b', 2],
				]),
			};

			recordPatches(state, (state) => {
				const entries = Array.from(state.map.entries());
				expect(entries).toEqual([
					['a', 1],
					['b', 2],
				]);
			});
		});

		it('should support forEach method', () => {
			const state = {
				map: new Map<string, number>([
					['a', 1],
					['b', 2],
				]),
			};

			recordPatches(state, (state) => {
				const keys: string[] = [];
				state.map.forEach((value, key) => {
					keys.push(key);
				});
				expect(keys).toEqual(['a', 'b']);
			});
		});

		it('should support size property', () => {
			const state = {
				map: new Map<string, number>([
					['a', 1],
					['b', 2],
				]),
			};

			recordPatches(state, (state) => {
				expect(state.map.size).toBe(2);
			});
		});
	});

	describe('nested maps', () => {
		it('should handle nested map mutations', () => {
			const innerMap = new Map([['inner1', 'value1']]);
			const state = {outer: new Map([['map1', innerMap]])};

			const patches = recordPatches(state, (state) => {
				state.outer.get('map1')!.set('inner2', 'value2');
			});

			expect(innerMap.get('inner2')).toBe('value2');
			expect(patches).toEqual([{op: 'add', path: ['outer', 'map1', 'inner2'], value: 'value2'}]);
		});
	});
});
