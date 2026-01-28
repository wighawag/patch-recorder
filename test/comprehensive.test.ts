import {describe, it, expect} from 'vitest';
import {recordPatches} from '../src/index.js';
import {applyPatches} from './utils.js';

describe('recordPatches - Comprehensive Patch Verification', () => {
	/**
	 * Helper function to verify patches by applying them to a deep copy
	 */
	function verifyPatches<T extends Record<string, any> | any[]>(
		originalState: T,
		mutate: (state: T) => void,
		options?: {compressPatches?: boolean; arrayLengthAssignment?: boolean; pathAsArray?: boolean},
	) {
		// Deep copy the original state using structuredClone (preserves Map and Set)
		const deepCopy = structuredClone(originalState) as T;

		// Apply mutations and get patches
		const patches = recordPatches(originalState, mutate, options);

		// Apply patches to the deep copy
		const patchedState = applyPatches(deepCopy, patches);

		// Verify the patched state matches the mutated state
		expect(patchedState).toEqual(originalState);

		return {patches, patchedState};
	}

	describe('basic object mutations', () => {
		it('should verify simple property assignment', () => {
			const state = {user: {name: 'John', age: 30}};

			const {patches} = verifyPatches(state, (draft) => {
				draft.user.name = 'Jane';
			});

			expect(patches).toEqual([{op: 'replace', path: ['user', 'name'], value: 'Jane'}]);
		});

		it('should verify multiple property assignments', () => {
			const state = {user: {name: 'John', age: 30}};

			const {patches} = verifyPatches(state, (draft) => {
				draft.user.name = 'Jane';
				draft.user.age = 25;
			});

			expect(patches).toHaveLength(2);
		});

		it('should verify adding new property', () => {
			const state = {user: {name: 'John'}} as any;

			const {patches} = verifyPatches(state, (draft) => {
				draft.user.age = 30;
			});

			expect(patches).toEqual([{op: 'add', path: ['user', 'age'], value: 30}]);
		});

		it('should verify property deletion', () => {
			const state = {user: {name: 'John', age: 30}} as any;

			const {patches} = verifyPatches(state, (draft) => {
				delete draft.user.age;
			});

			expect(patches).toEqual([{op: 'remove', path: ['user', 'age']}]);
		});

		it('should verify setting to undefined', () => {
			const state = {user: {name: 'John'}} as any;

			const {patches} = verifyPatches(state, (draft) => {
				draft.user.name = undefined;
			});

			expect(patches).toEqual([{op: 'replace', path: ['user', 'name'], value: undefined}]);
		});

		it('should verify setting to null', () => {
			const state = {user: {name: 'John'}} as any;

			const {patches} = verifyPatches(state, (draft) => {
				draft.user.name = null;
			});

			expect(patches).toEqual([{op: 'replace', path: ['user', 'name'], value: null}]);
		});
	});

	describe('nested object mutations', () => {
		it('should verify deeply nested property assignment', () => {
			const state = {
				data: {
					user: {
						profile: {
							name: 'John',
							address: {
								city: 'London',
							},
						},
					},
				},
			};

			const {patches} = verifyPatches(state, (draft) => {
				draft.data.user.profile.address.city = 'New York';
			});

			expect(patches).toEqual([
				{op: 'replace', path: ['data', 'user', 'profile', 'address', 'city'], value: 'New York'},
			]);
		});

		it('should verify multiple nested mutations', () => {
			const state = {
				data: {
					user: {name: 'John', age: 30},
					settings: {theme: 'dark'},
				},
			};

			const {patches} = verifyPatches(state, (draft) => {
				draft.data.user.name = 'Jane';
				draft.data.settings.theme = 'light';
			});

			expect(patches).toHaveLength(2);
		});

		it('should verify nested object addition', () => {
			const state = {data: {user: {}}} as any;

			const {patches} = verifyPatches(state, (draft) => {
				draft.data.user.profile = {name: 'John'};
			});

			expect(patches).toEqual([
				{op: 'add', path: ['data', 'user', 'profile'], value: {name: 'John'}},
			]);
		});

		it('should verify nested object replacement', () => {
			const state = {
				data: {
					user: {
						name: 'John',
						profile: {age: 30} as any,
					},
				},
			};

			const {patches} = verifyPatches(state, (draft) => {
				(draft.data.user.profile as any) = {age: 25, city: 'London'};
			});

			expect(patches).toEqual([
				{op: 'replace', path: ['data', 'user', 'profile'], value: {age: 25, city: 'London'}},
			]);
		});
	});

	describe('array operations', () => {
		it('should verify array push single element', () => {
			const state = {items: [1, 2, 3]};

			const {patches} = verifyPatches(state, (draft) => {
				draft.items.push(4);
			});

			expect(patches).toEqual([{op: 'add', path: ['items', 3], value: 4}]);
		});

		it('should verify array push multiple elements', () => {
			const state = {items: [1, 2, 3]};

			const {patches} = verifyPatches(state, (draft) => {
				draft.items.push(4, 5);
			});

			expect(patches).toHaveLength(2);
		});

		it('should verify array pop', () => {
			const state = {items: [1, 2, 3]};

			const {patches} = verifyPatches(state, (draft) => {
				draft.items.pop();
			});

			expect(patches).toEqual([{op: 'replace', path: ['items', 'length'], value: 2}]);
		});

		it('should verify array shift', () => {
			const state = {items: [1, 2, 3]};

			const {patches} = verifyPatches(state, (draft) => {
				draft.items.shift();
			});

			expect(patches).toHaveLength(3); // 2 replaces + 1 length
		});

		it('should verify array unshift single element', () => {
			const state = {items: [1, 2, 3]};

			const {patches} = verifyPatches(state, (draft) => {
				draft.items.unshift(0);
			});

			expect(patches).toHaveLength(4); // 1 add + 3 replaces
		});

		it('should verify array unshift multiple elements', () => {
			const state = {items: [3, 4, 5]};

			const {patches} = verifyPatches(state, (draft) => {
				draft.items.unshift(1, 2);
			});

			expect(patches).toHaveLength(5); // 2 adds + 3 replaces
		});

		it('should verify array splice delete', () => {
			const state = {items: [1, 2, 3, 4, 5]};

			const {patches} = verifyPatches(state, (draft) => {
				draft.items.splice(1, 2);
			});

			expect(patches).toHaveLength(3); // 2 replaces + 1 length
		});

		it('should verify array splice add', () => {
			const state = {items: [1, 2, 3]};

			const {patches} = verifyPatches(state, (draft) => {
				draft.items.splice(1, 0, 4, 5);
			});

			expect(patches).toHaveLength(4); // 2 adds + 2 replaces
		});

		it('should verify array splice replace', () => {
			const state = {items: [1, 2, 3, 4, 5]};

			const {patches} = verifyPatches(state, (draft) => {
				draft.items.splice(1, 2, 10, 20);
			});

			expect(patches).toHaveLength(2); // 2 replaces
		});

		it('should verify array sort', () => {
			const state = {items: [3, 1, 4, 1, 5, 9, 2, 6]};

			const {patches} = verifyPatches(state, (draft) => {
				draft.items.sort();
			});

			expect(patches).toEqual([{op: 'replace', path: ['items'], value: [1, 1, 2, 3, 4, 5, 6, 9]}]);
		});

		it('should verify array reverse', () => {
			const state = {items: [1, 2, 3, 4, 5]};

			const {patches} = verifyPatches(state, (draft) => {
				draft.items.reverse();
			});

			expect(patches).toEqual([{op: 'replace', path: ['items'], value: [5, 4, 3, 2, 1]}]);
		});

		it('should verify array index assignment', () => {
			const state = {items: [1, 2, 3]};

			const {patches} = verifyPatches(state, (draft) => {
				draft.items[1] = 20;
			});

			expect(patches).toEqual([{op: 'replace', path: ['items', 1], value: 20}]);
		});

		it('should verify array length assignment', () => {
			const state = {items: [1, 2, 3, 4, 5]};

			const {patches} = verifyPatches(state, (draft) => {
				draft.items.length = 3;
			});

			expect(patches).toEqual([{op: 'replace', path: ['items', 'length'], value: 3}]);
		});
	});

	describe('nested array operations', () => {
		it('should verify nested array index assignment', () => {
			const state = {
				matrix: [
					[1, 2],
					[3, 4],
				],
			};

			const {patches} = verifyPatches(state, (draft) => {
				draft.matrix[0][0] = 10;
			});

			expect(patches).toEqual([{op: 'replace', path: ['matrix', 0, 0], value: 10}]);
		});

		it('should verify nested array push', () => {
			const state = {
				matrix: [
					[1, 2],
					[3, 4],
				],
			};

			const {patches} = verifyPatches(state, (draft) => {
				draft.matrix[0].push(3);
			});

			expect(patches).toEqual([{op: 'add', path: ['matrix', 0, 2], value: 3}]);
		});

		it('should verify nested array pop', () => {
			const state = {
				matrix: [
					[1, 2, 3],
					[4, 5, 6],
				],
			};

			const {patches} = verifyPatches(state, (draft) => {
				draft.matrix[0].pop();
			});

			expect(patches).toEqual([{op: 'replace', path: ['matrix', 0, 'length'], value: 2}]);
		});

		it('should verify deeply nested array mutations', () => {
			const state = {
				data: {
					items: [
						{
							nested: [1, 2, 3],
						},
					],
				},
			};

			const {patches} = verifyPatches(state, (draft) => {
				draft.data.items[0].nested[1] = 20;
			});

			expect(patches).toEqual([{op: 'replace', path: ['data', 'items', 0, 'nested', 1], value: 20}]);
		});
	});

	describe('Map operations', () => {
		it('should verify Map set new key', () => {
			const state = {map: new Map([['a', 1]])};

			const {patches} = verifyPatches(state, (draft) => {
				draft.map.set('b', 2);
			});

			expect(patches).toEqual([{op: 'add', path: ['map', 'b'], value: 2}]);
		});

		it('should verify Map set existing key', () => {
			const state = {map: new Map([['a', 1], ['b', 2]])};

			const {patches} = verifyPatches(state, (draft) => {
				draft.map.set('b', 3);
			});

			expect(patches).toEqual([{op: 'replace', path: ['map', 'b'], value: 3}]);
		});

		it('should verify Map delete', () => {
			const state = {map: new Map([['a', 1], ['b', 2], ['c', 3]])};

			const {patches} = verifyPatches(state, (draft) => {
				draft.map.delete('b');
			});

			expect(patches).toEqual([{op: 'remove', path: ['map', 'b']}]);
		});

		it('should verify Map clear', () => {
			const state = {map: new Map([['a', 1], ['b', 2], ['c', 3]])};

			const {patches} = verifyPatches(state, (draft) => {
				draft.map.clear();
			});

			expect(patches).toHaveLength(3);
		});

		it('should verify multiple Map operations', () => {
			const state = {map: new Map([['a', 1]])};

			const {patches} = verifyPatches(state, (draft) => {
				draft.map.set('b', 2);
				draft.map.set('c', 3);
				draft.map.delete('a');
			});

			expect(patches).toHaveLength(3);
		});
	});

	describe('Set operations', () => {
		it('should verify Set add new value', () => {
			const state = {set: new Set([1, 2])};

			const {patches} = verifyPatches(state, (draft) => {
				draft.set.add(3);
			});

			expect(patches).toEqual([{op: 'add', path: ['set', 3], value: 3}]);
		});

		it('should verify Set delete', () => {
			const state = {set: new Set([1, 2, 3])};

			const {patches} = verifyPatches(state, (draft) => {
				draft.set.delete(2);
			});

			expect(patches).toEqual([{op: 'remove', path: ['set', 2]}]);
		});

		it('should verify Set clear', () => {
			const state = {set: new Set([1, 2, 3])};

			const {patches} = verifyPatches(state, (draft) => {
				draft.set.clear();
			});

			expect(patches).toHaveLength(3);
		});

		it('should verify multiple Set operations', () => {
			const state = {set: new Set([1])};

			const {patches} = verifyPatches(state, (draft) => {
				draft.set.add(2);
				draft.set.add(3);
				draft.set.delete(1);
			});

			expect(patches).toHaveLength(3);
		});
	});

	describe('complex combinations', () => {
		it('should verify mix of object and array mutations', () => {
			const state = {
				user: {name: 'John', age: 30},
				items: [1, 2, 3],
			};

			const {patches} = verifyPatches(state, (draft) => {
				draft.user.name = 'Jane';
				draft.items.push(4);
			});

			expect(patches).toHaveLength(2);
		});

		it('should verify nested objects with arrays', () => {
			const state = {
				data: {
					user: {
						name: 'John',
						tags: ['developer', 'javascript'],
					},
				},
			};

			const {patches} = verifyPatches(state, (draft) => {
				draft.data.user.name = 'Jane';
				draft.data.user.tags.push('typescript');
			});

			expect(patches).toHaveLength(2);
		});

		it('should verify array of objects', () => {
			const state = {
				users: [
					{id: 1, name: 'John'},
					{id: 2, name: 'Jane'},
				],
			};

			const {patches} = verifyPatches(state, (draft) => {
				draft.users[0].name = 'Bob';
				draft.users[1].name = 'Alice';
			});

			expect(patches).toHaveLength(2);
		});

		it('should verify object with Maps', () => {
			const state = {
				data: {
					name: 'test',
					map: new Map([['a', 1]]),
				},
			};

			const {patches} = verifyPatches(state, (draft) => {
				draft.data.name = 'updated';
				draft.data.map.set('b', 2);
			});

			expect(patches).toHaveLength(2);
		});

		it('should verify object with Sets', () => {
			const state = {
				data: {
					name: 'test',
					set: new Set([1, 2]),
				},
			};

			const {patches} = verifyPatches(state, (draft) => {
				draft.data.name = 'updated';
				draft.data.set.add(3);
			});

			expect(patches).toHaveLength(2);
		});

		it('should verify complex nested structure', () => {
			const state = {
				app: {
					users: [
						{
							id: 1,
							name: 'John',
							roles: new Set(['admin']),
							metadata: new Map([['created', '2024']]),
						},
					],
					settings: {
						theme: 'dark',
					},
				},
			};

			const {patches} = verifyPatches(state, (draft) => {
				draft.app.users[0].name = 'Jane';
				draft.app.users[0].roles.add('user');
				draft.app.users[0].metadata.set('updated', '2025');
				draft.app.settings.theme = 'light';
			});

			expect(patches).toHaveLength(4);
		});

		it('should verify multiple operations on same path', () => {
			const state = {count: 0};

			const {patches} = verifyPatches(state, (draft) => {
				draft.count = 1;
				draft.count = 2;
				draft.count = 3;
			});

			// With compression, should only have the final value
			expect(patches).toEqual([{op: 'replace', path: ['count'], value: 3}]);
		});

		it('should verify conditional mutations', () => {
			const state = {
				flag: true,
				value: 'initial',
			};

			const {patches} = verifyPatches(state, (draft) => {
				if (draft.flag) {
					draft.value = 'updated';
				}
			});

			expect(patches).toEqual([{op: 'replace', path: ['value'], value: 'updated'}]);
		});

		it('should verify complex array manipulation', () => {
			const state = {
				list: [1, 2, 3, 4, 5],
			};

			const {patches} = verifyPatches(state, (draft) => {
				draft.list.push(6);
				draft.list.shift();
				draft.list[1] = 20;
			});

			expect(patches.length).toBeGreaterThan(0);
		});

		it('should verify object property operations', () => {
			const state = {
				obj: {a: 1, b: 2, c: 3} as any,
			};

			const {patches} = verifyPatches(state, (draft) => {
				draft.obj.a = 10; // replace
				draft.obj.d = 4; // add
				delete draft.obj.c; // remove
			});

			expect(patches).toHaveLength(3);
		});

		it('should verify deep mixed mutations', () => {
			const state = {
				level1: {
					level2: {
						level3: {
							array: [1, 2, 3],
							map: new Map([['key', 'value']]),
							set: new Set([1, 2]),
						},
					},
				},
			};

			const {patches} = verifyPatches(state, (draft) => {
				draft.level1.level2.level3.array.push(4);
				draft.level1.level2.level3.map.set('newKey', 'newValue');
				draft.level1.level2.level3.set.add(3);
			});

			expect(patches).toHaveLength(3);
		});

		it('should verify array length operations', () => {
			const state = {
				items: [1, 2, 3, 4, 5],
			};

			const {patches} = verifyPatches(state, (draft) => {
				draft.items.length = 2;
			});

			expect(patches).toEqual([{op: 'replace', path: ['items', 'length'], value: 2}]);
		});

		it('should verify growing array by length', () => {
			const state = {
				items: [1, 2],
			};

			const {patches} = verifyPatches(state, (draft) => {
				draft.items.length = 5;
			});

			expect(patches).toEqual([{op: 'replace', path: ['items', 'length'], value: 5}]);
		});
	});

	describe('edge cases', () => {
		it('should verify empty object mutation', () => {
			const state = {} as any;

			const {patches} = verifyPatches(state, (draft) => {
				draft.newProp = 'value';
			});

			expect(patches).toEqual([{op: 'add', path: ['newProp'], value: 'value'}]);
		});

		it('should verify empty array mutation', () => {
			const state = {items: [] as any[]};

			const {patches} = verifyPatches(state, (draft) => {
				draft.items.push(1);
			});

			expect(patches).toEqual([{op: 'add', path: ['items', 0], value: 1}]);
		});

		it('should verify empty Map mutation', () => {
			const state = {map: new Map()};

			const {patches} = verifyPatches(state, (draft) => {
				draft.map.set('key', 'value');
			});

			expect(patches).toEqual([{op: 'add', path: ['map', 'key'], value: 'value'}]);
		});

		it('should verify empty Set mutation', () => {
			const state = {set: new Set()};

			const {patches} = verifyPatches(state, (draft) => {
				draft.set.add(1);
			});

			expect(patches).toEqual([{op: 'add', path: ['set', 1], value: 1}]);
		});

		it('should verify no mutations', () => {
			const state = {value: 'unchanged'};

			const {patches} = verifyPatches(state, (draft) => {
				// No mutations
			});

			expect(patches).toEqual([]);
		});

		it('should verify assigning same value (no-op)', () => {
			const state = {value: 'same'};

			const {patches} = verifyPatches(state, (draft) => {
				draft.value = 'same';
			});

			expect(patches).toEqual([]);
		});

		it('should verify complex values in arrays', () => {
			const state = {
				items: [{id: 1}, {id: 2}, {id: 3}] as any[],
			};

			const {patches} = verifyPatches(state, (draft) => {
				draft.items[1] = {id: 20, name: 'updated'};
			});

			expect(patches).toEqual([{op: 'replace', path: ['items', 1], value: {id: 20, name: 'updated'}}]);
		});

		it('should verify special characters in object keys', () => {
			const state = {'key-with-dash': 'value', 'key with space': 'value2'};

			const {patches} = verifyPatches(state, (draft) => {
				draft['key-with-dash'] = 'updated';
			});

			expect(patches).toEqual([{op: 'replace', path: ['key-with-dash'], value: 'updated'}]);
		});

		it('should verify number keys in objects', () => {
			const state = {1: 'one', 2: 'two'} as any;

			const {patches} = verifyPatches(state, (draft) => {
				draft[1] = 'ONE';
			});

			expect(patches).toEqual([{op: 'replace', path: [1], value: 'ONE'}]);
		});

		it('should verify nested number keys', () => {
			const state = {data: {1: 'one', 2: 'two'} as any};

			const {patches} = verifyPatches(state, (draft) => {
				draft.data[1] = 'ONE';
			});

			expect(patches).toEqual([{op: 'replace', path: ['data', 1], value: 'ONE'}]);
		});
	});

	describe('arrayLengthAssignment option', () => {
		it('should verify with arrayLengthAssignment: true', () => {
			const state = {items: [1, 2, 3]};

			const {patches} = verifyPatches(state, (draft) => {
				draft.items.pop();
			});

			expect(patches).toEqual([{op: 'replace', path: ['items', 'length'], value: 2}]);
		});

		it('should verify with arrayLengthAssignment: false', () => {
			const state = {items: [1, 2, 3]};

			const {patches} = verifyPatches(state, (draft) => {
				draft.items.pop();
			}, {arrayLengthAssignment: false} as any);

			expect(patches).toEqual([{op: 'remove', path: ['items', 2]}]);
		});
	});

	describe('pathAsArray option', () => {
		it('should verify with pathAsArray: true (default)', () => {
			const state = {user: {name: 'John'}};

			const {patches} = verifyPatches(state, (draft) => {
				draft.user.name = 'Jane';
			});

			expect(patches[0].path).toEqual(['user', 'name']);
		});

		it('should verify with pathAsArray: false', () => {
			const state = {user: {name: 'John'}};

			const patches = recordPatches(state, (draft) => {
				draft.user.name = 'Jane';
			}, {pathAsArray: false});

			// Deep copy and verify
			const deepCopy = JSON.parse(JSON.stringify({user: {name: 'John'}}));
			const patchedState = applyPatches(deepCopy, patches);
			expect(patchedState).toEqual(state);
		});
	});

	describe('compressPatches option', () => {
		it('should verify with compressPatches: true (default)', () => {
			const state = {value: 1};

			const {patches} = verifyPatches(state, (draft) => {
				draft.value = 2;
				draft.value = 3;
			});

			// Should compress to final value only
			expect(patches).toEqual([{op: 'replace', path: ['value'], value: 3}]);
		});

		it('should verify with compressPatches: false', () => {
			const state = {value: 1};

			const patches = recordPatches(state, (draft) => {
				draft.value = 2;
				draft.value = 3;
			}, {compressPatches: false});

			// Deep copy and verify
			const deepCopy = JSON.parse(JSON.stringify({value: 1}));
			const patchedState = applyPatches(deepCopy, patches);
			expect(patchedState).toEqual(state);

			// Should have both patches
			expect(patches).toHaveLength(2);
		});
	});
});