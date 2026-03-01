import {describe, it, expect} from 'vitest';
import {recordPatches} from '../src/index';

describe('recordPatches - getItemId option', () => {
	describe('validation', () => {
		it('should throw error when using getItemId without arrayLengthAssignment: false', () => {
			const state = {items: [{id: 'item-1', name: 'Item 1'}]};

			expect(() => {
				recordPatches(
					state,
					(state) => {
						state.items.pop();
					},
					{
						getItemId: {
							items: (item: {id: string}) => item.id,
						},
					} as any, // Type error at compile time, runtime check catches it
				);
			}).toThrow('getItemId requires arrayLengthAssignment: false');
		});

		it('should throw error when arrayLengthAssignment is true with getItemId', () => {
			const state = {items: [{id: 'item-1', name: 'Item 1'}]};

			expect(() => {
				recordPatches(
					state,
					(state) => {
						state.items.pop();
					},
					{
						arrayLengthAssignment: true,
						getItemId: {
							items: (item: {id: string}) => item.id,
						},
					} as any, // Type error at compile time, runtime check catches it
				);
			}).toThrow('getItemId requires arrayLengthAssignment: false');
		});

		it('should generate remove patches with IDs when directly assigning array length', () => {
			const state = {
				items: [
					{id: 'item-1', name: 'Item 1'},
					{id: 'item-2', name: 'Item 2'},
					{id: 'item-3', name: 'Item 3'},
				],
			};

			const patches = recordPatches(
				state,
				(state) => {
					state.items.length = 1; // Direct length assignment - removes items at index 2 and 1
				},
				{
					arrayLengthAssignment: false,
					getItemId: {
						items: (item: {id: string}) => item.id,
					},
					compressPatches: false,
				},
			);

			// Should generate remove patches in reverse order with IDs
			expect(patches).toEqual([
				{op: 'remove', path: ['items', 2], id: 'item-3'},
				{op: 'remove', path: ['items', 1], id: 'item-2'},
			]);
			expect(state.items).toEqual([{id: 'item-1', name: 'Item 1'}]);
		});
	});

	describe('array operations', () => {
		it('should include id in remove patch when deleting array item', () => {
			const state = {
				items: [
					{id: 'item-1', name: 'Item 1'},
					{id: 'item-2', name: 'Item 2'},
					{id: 'item-3', name: 'Item 3'},
				],
			};

			const patches = recordPatches(
				state,
				(state) => {
					state.items.splice(1, 1); // Remove item-2
				},
				{
					arrayLengthAssignment: false,
					getItemId: {
						items: (item: {id: string}) => item.id,
					},
					compressPatches: false,
				},
			);

			expect(patches).toEqual([{op: 'remove', path: ['items', 1], id: 'item-2'}]);
		});

		it('should include id in replace patch when replacing array item', () => {
			const state = {
				items: [
					{id: 'item-1', name: 'Item 1'},
					{id: 'item-2', name: 'Item 2'},
				],
			};

			const patches = recordPatches(
				state,
				(state) => {
					state.items[0] = {id: 'item-new', name: 'New Item'};
				},
				{
					arrayLengthAssignment: false,
					getItemId: {
						items: (item: {id: string}) => item.id,
					},
				},
			);

			expect(patches).toEqual([
				{
					op: 'replace',
					path: ['items', 0],
					value: {id: 'item-new', name: 'New Item'},
					id: 'item-1',
				},
			]);
		});

		it('should not include id in add patch', () => {
			const state = {
				items: [{id: 'item-1', name: 'Item 1'}],
			};

			const patches = recordPatches(
				state,
				(state) => {
					state.items.push({id: 'item-2', name: 'Item 2'});
				},
				{
					arrayLengthAssignment: false,
					getItemId: {
						items: (item: {id: string}) => item.id,
					},
				},
			);

			expect(patches).toEqual([
				{op: 'add', path: ['items', 1], value: {id: 'item-2', name: 'Item 2'}},
			]);
		});

		it('should include id when using pop', () => {
			const state = {
				items: [
					{id: 'item-1', name: 'Item 1'},
					{id: 'item-2', name: 'Item 2'},
				],
			};

			const patches = recordPatches(
				state,
				(state) => {
					state.items.pop();
				},
				{
					getItemId: {
						items: (item: {id: string}) => item.id,
					},
					arrayLengthAssignment: false, // Use remove patch instead of length
				},
			);

			expect(patches).toEqual([{op: 'remove', path: ['items', 1], id: 'item-2'}]);
		});

		it('should include id when using shift', () => {
			const state = {
				items: [
					{id: 'item-1', name: 'Item 1'},
					{id: 'item-2', name: 'Item 2'},
				],
			};

			const patches = recordPatches(
				state,
				(state) => {
					state.items.shift();
				},
				{
					arrayLengthAssignment: false,
					getItemId: {
						items: (item: {id: string}) => item.id,
					},
					compressPatches: false,
				},
			);

			expect(patches).toEqual([{op: 'remove', path: ['items', 0], id: 'item-1'}]);
		});
	});

	describe('nested paths', () => {
		it('should work with nested object paths', () => {
			const state = {
				user: {
					posts: [
						{id: 'post-1', title: 'Post 1'},
						{id: 'post-2', title: 'Post 2'},
					],
				},
			};

			const patches = recordPatches(
				state,
				(state) => {
					state.user.posts.splice(0, 1);
				},
				{
					arrayLengthAssignment: false,
					getItemId: {
						user: {
							posts: (post: {id: string}) => post.id,
						},
					},
					compressPatches: false,
				},
			);

			expect(patches).toEqual([{op: 'remove', path: ['user', 'posts', 0], id: 'post-1'}]);
		});

		it('should work with deeply nested paths', () => {
			const state = {
				app: {
					data: {
						users: [
							{userId: 'u1', name: 'User 1'},
							{userId: 'u2', name: 'User 2'},
						],
					},
				},
			};

			const patches = recordPatches(
				state,
				(state) => {
					state.app.data.users[1] = {userId: 'u3', name: 'User 3'};
				},
				{
					arrayLengthAssignment: false,
					getItemId: {
						app: {
							data: {
								users: (user: {userId: string}) => user.userId,
							},
						},
					},
				},
			);

			expect(patches).toEqual([
				{
					op: 'replace',
					path: ['app', 'data', 'users', 1],
					value: {userId: 'u3', name: 'User 3'},
					id: 'u2',
				},
			]);
		});
	});

	describe('multiple paths', () => {
		it('should handle multiple getItemId configurations', () => {
			const state = {
				items: [{id: 'item-1', value: 1}],
				users: [{_id: 'user-1', name: 'User 1'}],
			};

			const patches = recordPatches(
				state,
				(state) => {
					state.items.pop();
					state.users.pop();
				},
				{
					getItemId: {
						items: (item: {id: string}) => item.id,
						users: (user: {_id: string}) => user._id,
					},
					arrayLengthAssignment: false,
					compressPatches: false,
				},
			);

			expect(patches).toEqual([
				{op: 'remove', path: ['items', 0], id: 'item-1'},
				{op: 'remove', path: ['users', 0], id: 'user-1'},
			]);
		});
	});

	describe('Map operations', () => {
		it('should include id in remove patch when deleting Map entry', () => {
			const state = {
				entityMap: new Map([
					['key1', {internalId: 'entity-1', data: 'value1'}],
					['key2', {internalId: 'entity-2', data: 'value2'}],
				]),
			};

			const patches = recordPatches(
				state,
				(state) => {
					state.entityMap.delete('key1');
				},
				{
					arrayLengthAssignment: false,
					getItemId: {
						entityMap: (entity: {internalId: string}) => entity.internalId,
					},
				},
			);

			expect(patches).toEqual([{op: 'remove', path: ['entityMap', 'key1'], id: 'entity-1'}]);
		});

		it('should include id in replace patch when updating Map entry', () => {
			const state = {
				entityMap: new Map([['key1', {internalId: 'entity-1', data: 'old'}]]),
			};

			const patches = recordPatches(
				state,
				(state) => {
					state.entityMap.set('key1', {internalId: 'entity-2', data: 'new'});
				},
				{
					arrayLengthAssignment: false,
					getItemId: {
						entityMap: (entity: {internalId: string}) => entity.internalId,
					},
				},
			);

			expect(patches).toEqual([
				{
					op: 'replace',
					path: ['entityMap', 'key1'],
					value: {internalId: 'entity-2', data: 'new'},
					id: 'entity-1',
				},
			]);
		});
	});

	describe('Set operations', () => {
		it('should include id in remove patch when deleting Set item', () => {
			const item1 = {id: 'set-item-1', value: 1};
			const item2 = {id: 'set-item-2', value: 2};
			const state = {
				itemSet: new Set([item1, item2]),
			};

			const patches = recordPatches(
				state,
				(state) => {
					state.itemSet.delete(item1);
				},
				{
					arrayLengthAssignment: false,
					getItemId: {
						itemSet: (item: {id: string}) => item.id,
					},
				},
			);

			expect(patches).toEqual([{op: 'remove', path: ['itemSet', item1], id: 'set-item-1'}]);
		});
	});

	describe('edge cases', () => {
		it('should not include id when getItemId returns undefined', () => {
			const state = {
				items: [{name: 'Item without id'}],
			};

			const patches = recordPatches(
				state,
				(state) => {
					state.items.pop();
				},
				{
					getItemId: {
						items: (item: {id: string}) => item.id, // item.id is undefined
					},
					arrayLengthAssignment: false,
				},
			);

			// No id field should be present
			expect(patches).toEqual([{op: 'remove', path: ['items', 0]}]);
		});

		it('should not include id when getItemId returns null', () => {
			const state = {
				items: [{id: null, name: 'Item with null id'}],
			};

			const patches = recordPatches(
				state,
				(state) => {
					state.items.pop();
				},
				{
					getItemId: {
						items: (item: {id: string}) => item.id,
					},
					arrayLengthAssignment: false,
				},
			);

			// No id field should be present
			expect(patches).toEqual([{op: 'remove', path: ['items', 0]}]);
		});

		it('should work without getItemId option (backward compatibility)', () => {
			const state = {
				items: [{id: 'item-1', name: 'Item 1'}],
			};

			const patches = recordPatches(
				state,
				(state) => {
					state.items.pop();
				},
				{arrayLengthAssignment: false},
			);

			// No id field should be present
			expect(patches).toEqual([{op: 'remove', path: ['items', 0]}]);
		});

		it('should work with numeric IDs', () => {
			const state = {
				items: [
					{id: 123, name: 'Item 1'},
					{id: 456, name: 'Item 2'},
				],
			};

			const patches = recordPatches(
				state,
				(state) => {
					state.items.pop();
				},
				{
					getItemId: {
						items: (item: {id: string}) => item.id,
					},
					arrayLengthAssignment: false,
				},
			);

			expect(patches).toEqual([{op: 'remove', path: ['items', 1], id: 456}]);
		});

		it('should work with complex ID extraction', () => {
			const state = {
				items: [{data: {nested: {id: 'complex-1'}}, name: 'Item 1'}],
			};

			const patches = recordPatches(
				state,
				(state) => {
					state.items.pop();
				},
				{
					getItemId: {
						items: (item: {data?: {nested?: {id?: string}}}) => item.data?.nested?.id,
					},
					arrayLengthAssignment: false,
				},
			);

			expect(patches).toEqual([{op: 'remove', path: ['items', 0], id: 'complex-1'}]);
		});

		it('should not add id for unconfigured paths', () => {
			const state = {
				items: [{id: 'item-1', name: 'Item 1'}],
				other: [{id: 'other-1', name: 'Other 1'}],
			};

			const patches = recordPatches(
				state,
				(state) => {
					state.items.pop();
					state.other.pop();
				},
				{
					getItemId: {
						items: (item: {id: string}) => item.id,
						// 'other' not configured
					},
					arrayLengthAssignment: false,
					compressPatches: false,
				},
			);

			expect(patches).toEqual([
				{op: 'remove', path: ['items', 0], id: 'item-1'},
				{op: 'remove', path: ['other', 0]}, // No id
			]);
		});
	});
});
