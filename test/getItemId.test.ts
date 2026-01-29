import {describe, it, expect} from 'vitest';
import {recordPatches} from '../src/index';

describe('recordPatches - getItemId option', () => {
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
					getItemId: {
						items: (item) => item.id,
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
					getItemId: {
						items: (item) => item.id,
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
					getItemId: {
						items: (item) => item.id,
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
						items: (item) => item.id,
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
					getItemId: {
						items: (item) => item.id,
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
					getItemId: {
						user: {
							posts: (post) => post.id,
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
					getItemId: {
						app: {
							data: {
								users: (user) => user.userId,
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
						items: (item) => item.id,
						users: (user) => user._id,
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
					getItemId: {
						entityMap: (entity) => entity.internalId,
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
					getItemId: {
						entityMap: (entity) => entity.internalId,
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
					getItemId: {
						itemSet: (item) => item.id,
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
						items: (item) => item.id, // item.id is undefined
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
						items: (item) => item.id,
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
						items: (item) => item.id,
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
						items: (item) => item.data?.nested?.id,
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
						items: (item) => item.id,
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
