import {describe, it, expect} from 'vitest';
import {recordPatches} from '../src/index';

describe('recordPatches - Arrays', () => {
	describe('push method', () => {
		it('should record push with single element', () => {
			const state = {items: [1, 2, 3]};

			const patches = recordPatches(state, (state) => {
				state.items.push(4);
			});

			expect(state.items).toEqual([1, 2, 3, 4]);
			expect(patches).toEqual([{op: 'add', path: ['items', 3], value: 4}]);
		});

		it('should record push with multiple elements', () => {
			const state = {items: [1, 2, 3]};

			const patches = recordPatches(state, (state) => {
				state.items.push(4, 5);
			});

			expect(state.items).toEqual([1, 2, 3, 4, 5]);
			expect(patches).toEqual([
				{op: 'add', path: ['items', 3], value: 4},
				{op: 'add', path: ['items', 4], value: 5},
			]);
		});
	});

	describe('pop method', () => {
		it('should record pop', () => {
			const state = {items: [1, 2, 3]};

			const patches = recordPatches(state, (state) => {
				state.items.pop();
			});

			expect(state.items).toEqual([1, 2]);
			// Aligned with mutative: use length replace instead of element remove
			expect(patches).toEqual([{op: 'replace', path: ['items', 'length'], value: 2}]);
		});
	});

	describe('shift method', () => {
		it('should record shift', () => {
			const state = {items: [1, 2, 3]};

			const patches = recordPatches(
				state,
				(state) => {
					state.items.shift();
				},
				{compressPatches: false},
			);

			expect(state.items).toEqual([2, 3]);
			// JSON Patch spec: remove first element (shifted elements are handled automatically)
			expect(patches).toEqual([{op: 'remove', path: ['items', 0]}]);
		});

		it('should record shift with arrayLengthAssignment: false', () => {
			const state = {items: [1, 2, 3]};

			const patches = recordPatches(
				state,
				(state) => {
					state.items.shift();
				},
				{compressPatches: false, arrayLengthAssignment: false},
			);

			expect(state.items).toEqual([2, 3]);
			// JSON Patch spec: remove first element (shifted elements are handled automatically)
			expect(patches).toEqual([{op: 'remove', path: ['items', 0]}]);
		});
	});

	describe('unshift method', () => {
		it('should record unshift with single element', () => {
			const state = {items: [1, 2, 3]};

			const patches = recordPatches(state, (state) => {
				state.items.unshift(0);
			});

			expect(state.items).toEqual([0, 1, 2, 3]);
			// JSON Patch spec: add element at beginning (shifted elements are handled automatically)
			expect(patches).toEqual([{op: 'add', path: ['items', 0], value: 0}]);
		});

		it('should record unshift with multiple elements', () => {
			const state = {items: [3, 4, 5]};

			const patches = recordPatches(state, (state) => {
				state.items.unshift(1, 2);
			});

			expect(state.items).toEqual([1, 2, 3, 4, 5]);
			// JSON Patch spec: add elements at beginning (shifted elements are handled automatically)
			expect(patches).toEqual([
				{op: 'add', path: ['items', 0], value: 1},
				{op: 'add', path: ['items', 1], value: 2},
			]);
		});
	});

	describe('splice method', () => {
		it('should record splice delete', () => {
			const state = {items: [1, 2, 3, 4, 5]};

			const patches = recordPatches(
				state,
				(state) => {
					state.items.splice(1, 2); // Remove 2 elements starting at index 1
				},
				{compressPatches: false},
			);

			expect(state.items).toEqual([1, 4, 5]);
			// JSON Patch spec: remove elements in reverse order (shifted elements are handled automatically)
			// Reverse order ensures correct patch application when sequential removes are applied
			expect(patches).toEqual([
				{op: 'remove', path: ['items', 2]}, // Remove element at original index 2
				{op: 'remove', path: ['items', 1]}, // Remove element at original index 1
			]);
		});

		it('should record splice add', () => {
			const state = {items: [1, 2, 3]};

			const patches = recordPatches(state, (state) => {
				state.items.splice(1, 0, 4, 5); // Insert 2 elements at index 1
			});

			expect(state.items).toEqual([1, 4, 5, 2, 3]);
			// JSON Patch spec: add elements (shifted elements are handled automatically)
			expect(patches).toEqual([
				{op: 'add', path: ['items', 1], value: 4},
				{op: 'add', path: ['items', 2], value: 5},
			]);
		});

		it('should record splice replace', () => {
			const state = {items: [1, 2, 3, 4, 5]};

			const patches = recordPatches(
				state,
				(state) => {
					state.items.splice(1, 2, 10, 20); // Replace 2 elements at index 1
				},
				{compressPatches: false},
			);

			expect(state.items).toEqual([1, 10, 20, 4, 5]);
			// Aligned with mutative: use replace patches when deleting and adding same number of elements
			expect(patches).toEqual([
				{op: 'replace', path: ['items', 1], value: 10},
				{op: 'replace', path: ['items', 2], value: 20},
			]);
		});
	});

	describe('sort method', () => {
		it('should record sort', () => {
			const state = {items: [3, 1, 4, 1, 5, 9, 2, 6]};

			const patches = recordPatches(state, (state) => {
				state.items.sort();
			});

			expect(state.items).toEqual([1, 1, 2, 3, 4, 5, 6, 9]);
			expect(patches).toEqual([{op: 'replace', path: ['items'], value: [1, 1, 2, 3, 4, 5, 6, 9]}]);
		});
	});

	describe('reverse method', () => {
		it('should record reverse', () => {
			const state = {items: [1, 2, 3, 4, 5]};

			const patches = recordPatches(state, (state) => {
				state.items.reverse();
			});

			expect(state.items).toEqual([5, 4, 3, 2, 1]);
			expect(patches).toEqual([{op: 'replace', path: ['items'], value: [5, 4, 3, 2, 1]}]);
		});
	});

	describe('array index assignment', () => {
		it('should record array index assignment', () => {
			const state = {items: [1, 2, 3]};

			const patches = recordPatches(state, (state) => {
				state.items[1] = 20;
			});

			expect(state.items).toEqual([1, 20, 3]);
			expect(patches).toEqual([{op: 'replace', path: ['items', 1], value: 20}]);
		});
	});

	describe('array length option', () => {
		it('should include length patches when array shrinks', () => {
			const state = {items: [1, 2, 3]};

			const patches = recordPatches(
				state,
				(state) => {
					state.items.pop();
				},
				{arrayLengthAssignment: true},
			);

			expect(state.items).toEqual([1, 2]);
			// Length patch is included when array shrinks (aligned with mutative)
			expect(patches).toEqual([{op: 'replace', path: ['items', 'length'], value: 2}]);
		});

		it('should not include length patches when array grows', () => {
			const state = {items: [1, 2, 3]};

			const patches = recordPatches(
				state,
				(state) => {
					state.items.push(4);
				},
				{arrayLengthAssignment: true},
			);

			expect(state.items).toEqual([1, 2, 3, 4]);
			// No length patch when array grows (aligned with mutative)
			expect(patches).toEqual([{op: 'add', path: ['items', 3], value: 4}]);
		});

		it('should respect arrayLengthAssignment: false', () => {
			const state = {items: [1, 2, 3]};

			const patches = recordPatches(
				state,
				(state) => {
					state.items.pop();
				},
				{arrayLengthAssignment: false},
			);

			expect(state.items).toEqual([1, 2]);
			// When arrayLengthAssignment is false, generate remove patch for last element (aligned with mutative)
			expect(patches).toEqual([{op: 'remove', path: ['items', 2]}]);
		});
	});

	describe('non-mutating array methods', () => {
		it('should not generate patches for map', () => {
			const state = {items: [1, 2, 3]};

			const patches = recordPatches(state, (state) => {
				const doubled = state.items.map((x) => x * 2);
				expect(doubled).toEqual([2, 4, 6]);
			});

			expect(state.items).toEqual([1, 2, 3]);
			expect(patches).toEqual([]);
		});

		it('should not generate patches for filter', () => {
			const state = {items: [1, 2, 3, 4, 5]};

			const patches = recordPatches(state, (state) => {
				const evens = state.items.filter((x) => x % 2 === 0);
				expect(evens).toEqual([2, 4]);
			});

			expect(state.items).toEqual([1, 2, 3, 4, 5]);
			expect(patches).toEqual([]);
		});

		it('should not generate patches for slice', () => {
			const state = {items: [1, 2, 3, 4, 5]};

			const patches = recordPatches(state, (state) => {
				const sliced = state.items.slice(1, 3);
				expect(sliced).toEqual([2, 3]);
			});

			expect(state.items).toEqual([1, 2, 3, 4, 5]);
			expect(patches).toEqual([]);
		});
	});

	describe('nested arrays', () => {
		it('should handle nested array mutations', () => {
			const state = {
				matrix: [
					[1, 2],
					[3, 4],
				],
			};

			const patches = recordPatches(state, (state) => {
				state.matrix[0][0] = 10;
			});

			expect(state.matrix).toEqual([
				[10, 2],
				[3, 4],
			]);
			expect(patches).toEqual([{op: 'replace', path: ['matrix', 0, 0], value: 10}]);
		});

		it('should handle push in nested array', () => {
			const state = {
				matrix: [
					[1, 2],
					[3, 4],
				],
			};

			const patches = recordPatches(state, (state) => {
				state.matrix[0].push(3);
			});

			expect(state.matrix).toEqual([
				[1, 2, 3],
				[3, 4],
			]);
			expect(patches).toEqual([{op: 'add', path: ['matrix', 0, 2], value: 3}]);
		});
	});
});
