import {describe, it, expect} from 'vitest';
import {recordPatches} from '../src/index';

describe('recordPatches - getItemId option', () => {
	describe('array length operations', () => {
		it('should generate remove patches WITHOUT IDs when directly assigning array length (removing items, not modifying fields)', () => {
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

			// Should generate remove patches in reverse order WITHOUT IDs (removing items, not modifying fields)
			expect(patches).toEqual([
				{op: 'remove', path: ['items', 2]},
				{op: 'remove', path: ['items', 1]},
			]);
			expect(state.items).toEqual([{id: 'item-1', name: 'Item 1'}]);
		});
	});

	describe('getItemId with arrayLengthAssignment: true (default)', () => {
		it('should NOT include id in replace patch when replacing array item (whole item replaced, not field modified)', () => {
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
					// arrayLengthAssignment defaults to true
					getItemId: {
						items: (item: {id: string}) => item.id,
					},
				},
			);

			// Replacing an item should NOT have id - only field modifications get id
			expect(patches).toEqual([
				{
					op: 'replace',
					path: ['items', 0],
					value: {id: 'item-new', name: 'New Item'},
				},
			]);
		});

		it('should not include id in length patch when using pop (length patch has no item context)', () => {
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
					// arrayLengthAssignment defaults to true
					getItemId: {
						items: (item: {id: string}) => item.id,
					},
				},
			);

			// With arrayLengthAssignment: true, pop generates a length patch without ID
			expect(patches).toEqual([{op: 'replace', path: ['items', 'length'], value: 1, oldValue: 2}]);
		});

		it('should NOT include id for Map operations (Maps already have keys)', () => {
			const state = {
				entityMap: new Map([['key1', {internalId: 'entity-1', data: 'old'}]]),
			};

			const patches = recordPatches(
				state,
				(state) => {
					state.entityMap.set('key1', {internalId: 'entity-2', data: 'new'});
				},
				{
					// arrayLengthAssignment defaults to true (no effect on Map)
					getItemId: {
						entityMap: (entity: {internalId: string}) => entity.internalId,
					},
				},
			);

			// Maps should NOT use getItemId - they already have their keys
			expect(patches).toEqual([
				{
					op: 'replace',
					path: ['entityMap', 'key1'],
					value: {internalId: 'entity-2', data: 'new'},
				},
			]);
		});
	});

	describe('array operations', () => {
		it('should NOT include id in remove patch (removing items, not modifying fields)', () => {
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

			// Remove operations should NOT have id (item is being removed, not modified)
			expect(patches).toEqual([{op: 'remove', path: ['items', 1]}]);
		});

		it('should NOT include id in replace patch when replacing array item (whole item replaced, not field modified)', () => {
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

			// Replacing an item should NOT have id - only field modifications get id
			expect(patches).toEqual([
				{
					op: 'replace',
					path: ['items', 0],
					value: {id: 'item-new', name: 'New Item'},
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

		it('should NOT include id when using pop (removing item, not modifying)', () => {
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

			// Remove operations should NOT have id
			expect(patches).toEqual([{op: 'remove', path: ['items', 1]}]);
		});

		it('should include id when modifying item fields', () => {
			const state = {
				items: [
					{id: 'item-1', name: 'Item 1'},
					{id: 'item-2', name: 'Item 2'},
				],
			};

			const patches = recordPatches(
				state,
				(state) => {
					state.items[1].name = 'new name';
				},
				{
					getItemId: {
						items: (item: {id: string}) => item.id,
					},
					arrayLengthAssignment: false,
				},
			);

			// Field modifications should have id of the item being modified
			expect(patches).toEqual([
				{op: 'replace', path: ['items', 1, 'name'], id: 'item-2', pathIndex: 2, value: 'new name'},
			]);
		});

		it('should NOT include id when using shift (removing item, not modifying)', () => {
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

			// Remove operations should NOT have id
			expect(patches).toEqual([{op: 'remove', path: ['items', 0]}]);
		});
	});

	describe('nested paths', () => {
		it('should NOT include id for remove operations in nested paths', () => {
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

			// Remove operations should NOT have id
			expect(patches).toEqual([{op: 'remove', path: ['user', 'posts', 0]}]);
		});

		it('should NOT include id for replace operations in deeply nested paths (whole item replaced, not field modified)', () => {
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

			// Replacing an item should NOT have id - only field modifications get id
			expect(patches).toEqual([
				{
					op: 'replace',
					path: ['app', 'data', 'users', 1],
					value: {userId: 'u3', name: 'User 3'},
				},
			]);
		});
	});

	describe('multiple paths', () => {
		it('should NOT include id for remove operations (multiple paths)', () => {
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

			// Remove operations should NOT have id
			expect(patches).toEqual([
				{op: 'remove', path: ['items', 0]},
				{op: 'remove', path: ['users', 0]},
			]);
		});
	});

	describe('Map operations', () => {
		it('should NOT include id for Map operations (Maps already have keys)', () => {
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

			// Maps should NOT use getItemId - they already have their keys
			expect(patches).toEqual([{op: 'remove', path: ['entityMap', 'key1']}]);
		});

		it('should NOT include id for Map replace operations (Maps already have keys)', () => {
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

			// Maps should NOT use getItemId - they already have their keys
			expect(patches).toEqual([
				{
					op: 'replace',
					path: ['entityMap', 'key1'],
					value: {internalId: 'entity-2', data: 'new'},
				},
			]);
		});
	});

	describe('Set operations', () => {
		it('should NOT include id for Set remove operations (removing items, not modifying)', () => {
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

			// Remove operations should NOT have id
			expect(patches).toEqual([{op: 'remove', path: ['itemSet', item1]}]);
		});
	});

	describe('deep hierarchy field modifications', () => {
		it('should include id when modifying a field in a deeply nested array item', () => {
			const state = {
				app: {
					data: {
						users: [
							{id: 'user-1', name: 'User 1', email: 'user1@test.com'},
							{id: 'user-2', name: 'User 2', email: 'user2@test.com'},
						],
					},
				},
			};

			const patches = recordPatches(
				state,
				(state) => {
					state.app.data.users[1].name = 'Updated User 2';
				},
				{
					getItemId: {
						app: {
							data: {
								users: (user: {id: string}) => user.id,
							},
						},
					},
				},
			);

			// Field modification should include id of the item being modified
			expect(patches).toEqual([
				{
					op: 'replace',
					path: ['app', 'data', 'users', 1, 'name'],
					value: 'Updated User 2',
					id: 'user-2',
					pathIndex: 4,
				},
			]);
		});

		it('should include id when modifying a nested object field inside an array item', () => {
			const state = {
				items: [
					{id: 'item-1', data: {nested: {value: 'original'}}},
					{id: 'item-2', data: {nested: {value: 'original2'}}},
				],
			};

			const patches = recordPatches(
				state,
				(state) => {
					state.items[0].data.nested.value = 'updated';
				},
				{
					getItemId: {
						items: (item: {id: string}) => item.id,
					},
				},
			);

			// Nested field modification should include id of the array item
			expect(patches).toEqual([
				{
					op: 'replace',
					path: ['items', 0, 'data', 'nested', 'value'],
					value: 'updated',
					id: 'item-1',
					pathIndex: 2,
				},
			]);
		});

		it('should include id when modifying multiple fields in the same array item', () => {
			const state = {
				items: [
					{id: 'item-1', name: 'Item 1', count: 0},
				],
			};

			const patches = recordPatches(
				state,
				(state) => {
					state.items[0].name = 'Updated Item 1';
					state.items[0].count = 10;
				},
				{
					getItemId: {
						items: (item: {id: string}) => item.id,
					},
					compressPatches: false,
				},
			);

			// Both field modifications should include the item id
			expect(patches).toEqual([
				{
					op: 'replace',
					path: ['items', 0, 'name'],
					value: 'Updated Item 1',
					id: 'item-1',
					pathIndex: 2,
				},
				{
					op: 'replace',
					path: ['items', 0, 'count'],
					value: 10,
					id: 'item-1',
					pathIndex: 2,
				},
			]);
		});

		it('should include id when deleting a field from an array item (field removal, not item removal)', () => {
			const state = {
				items: [
					{id: 'item-1', name: 'Item 1', optional: 'to be deleted'},
				],
			} as {items: {id: string; name: string; optional?: string}[]};

			const patches = recordPatches(
				state,
				(state) => {
					delete state.items[0].optional;
				},
				{
					getItemId: {
						items: (item: {id: string}) => item.id,
					},
				},
			);

			// Deleting a field FROM an item should include the item id (field modification)
			expect(patches).toEqual([
				{
					op: 'remove',
					path: ['items', 0, 'optional'],
					id: 'item-1',
					pathIndex: 2,
				},
			]);
		});

		it('should include id when modifying fields in multiple items across different arrays', () => {
			const state = {
				users: [
					{userId: 'u1', name: 'User 1'},
					{userId: 'u2', name: 'User 2'},
				],
				products: [
					{productId: 'p1', title: 'Product 1'},
					{productId: 'p2', title: 'Product 2'},
				],
			};

			const patches = recordPatches(
				state,
				(state) => {
					state.users[0].name = 'Updated User 1';
					state.products[1].title = 'Updated Product 2';
				},
				{
					getItemId: {
						users: (user: {userId: string}) => user.userId,
						products: (product: {productId: string}) => product.productId,
					},
					compressPatches: false,
				},
			);

			expect(patches).toEqual([
				{
					op: 'replace',
					path: ['users', 0, 'name'],
					value: 'Updated User 1',
					id: 'u1',
					pathIndex: 2,
				},
				{
					op: 'replace',
					path: ['products', 1, 'title'],
					value: 'Updated Product 2',
					id: 'p2',
					pathIndex: 2,
				},
			]);
		});

		it('should include id when modifying nested array inside an item (field on parent item)', () => {
			const state = {
				users: [
					{
						id: 'user-1',
						name: 'User 1',
						tags: ['tag1', 'tag2'],
					},
				],
			};

			const patches = recordPatches(
				state,
				(state) => {
					state.users[0].name = 'Updated Name';
				},
				{
					getItemId: {
						users: (user: {id: string}) => user.id,
					},
				},
			);

			expect(patches).toEqual([
				{
					op: 'replace',
					path: ['users', 0, 'name'],
					value: 'Updated Name',
					id: 'user-1',
					pathIndex: 2,
				},
			]);
		});

		it('should include id when modifying a very deeply nested field (4+ levels deep)', () => {
			const state = {
				level1: {
					level2: {
						items: [
							{
								id: 'deep-item-1',
								config: {
									settings: {
										options: {
											value: 'original',
										},
									},
								},
							},
						],
					},
				},
			};

			const patches = recordPatches(
				state,
				(state) => {
					state.level1.level2.items[0].config.settings.options.value = 'updated';
				},
				{
					getItemId: {
						level1: {
							level2: {
								items: (item: {id: string}) => item.id,
							},
						},
					},
				},
			);

			expect(patches).toEqual([
				{
					op: 'replace',
					path: ['level1', 'level2', 'items', 0, 'config', 'settings', 'options', 'value'],
					value: 'updated',
					id: 'deep-item-1',
					pathIndex: 4,
				},
			]);
		});
	});

	describe('add operations with item id tracking', () => {
		it('should include id when adding a new field to an existing array item', () => {
			const state = {
				items: [
					{id: 'item-1', name: 'Item 1'},
					{id: 'item-2', name: 'Item 2'},
				],
			} as {items: {id: string; name: string; newField?: string}[]};

			const patches = recordPatches(
				state,
				(state) => {
					state.items[0].newField = 'new value';
				},
				{
					getItemId: {
						items: (item: {id: string}) => item.id,
					},
				},
			);

			// Adding a field TO an item should include the item id (the item is being modified)
			expect(patches).toEqual([
				{
					op: 'add',
					path: ['items', 0, 'newField'],
					value: 'new value',
					id: 'item-1',
					pathIndex: 2,
				},
			]);
		});

		it('should include id when adding a nested field inside an array item', () => {
			const state = {
				items: [
					{id: 'item-1', data: {}},
				],
			} as {items: {id: string; data: {nested?: {value: string}}}[]};

			const patches = recordPatches(
				state,
				(state) => {
					state.items[0].data.nested = {value: 'new'};
				},
				{
					getItemId: {
						items: (item: {id: string}) => item.id,
					},
				},
			);

			// Adding a nested field inside an item should include the item id
			expect(patches).toEqual([
				{
					op: 'add',
					path: ['items', 0, 'data', 'nested'],
					value: {value: 'new'},
					id: 'item-1',
					pathIndex: 2,
				},
			]);
		});

		it('should NOT include id when pushing a new item to an array', () => {
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

			// Adding a NEW ITEM should NOT have id - we're not modifying an existing item
			expect(patches).toEqual([
				{op: 'add', path: ['items', 1], value: {id: 'item-2', name: 'Item 2'}},
			]);
		});

		it('should include id when adding a deeply nested field (4+ levels deep)', () => {
			const state = {
				level1: {
					level2: {
						items: [
							{
								id: 'deep-item-1',
								config: {
									settings: {},
								},
							},
						],
					},
				},
			} as {level1: {level2: {items: {id: string; config: {settings: {newOption?: string}}}[]}}};

			const patches = recordPatches(
				state,
				(state) => {
					state.level1.level2.items[0].config.settings.newOption = 'enabled';
				},
				{
					getItemId: {
						level1: {
							level2: {
								items: (item: {id: string}) => item.id,
							},
						},
					},
				},
			);

			expect(patches).toEqual([
				{
					op: 'add',
					path: ['level1', 'level2', 'items', 0, 'config', 'settings', 'newOption'],
					value: 'enabled',
					id: 'deep-item-1',
					pathIndex: 4,
				},
			]);
		});
	});

	describe('edge cases', () => {
		it('should not include id when getItemId returns undefined (field modification case)', () => {
			const state = {
				items: [{name: 'Item without id'}],
			};

			const patches = recordPatches(
				state,
				(state) => {
					state.items[0].name = 'Updated name';
				},
				{
					getItemId: {
						items: (item: {id?: string}) => item.id, // item.id is undefined
					},
					arrayLengthAssignment: false,
				},
			);

			// No id field should be present when getItemId returns undefined
			expect(patches).toEqual([
				{op: 'replace', path: ['items', 0, 'name'], value: 'Updated name'},
			]);
		});

		it('should not include id when getItemId returns null (field modification case)', () => {
			const state = {
				items: [{id: null, name: 'Item with null id'}],
			};

			const patches = recordPatches(
				state,
				(state) => {
					state.items[0].name = 'Updated name';
				},
				{
					getItemId: {
						items: (item: {id: string | null}) => item.id,
					},
					arrayLengthAssignment: false,
				},
			);

			// No id field should be present when getItemId returns null
			expect(patches).toEqual([
				{op: 'replace', path: ['items', 0, 'name'], value: 'Updated name'},
			]);
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

		it('should work with numeric IDs in field modification operations', () => {
			const state = {
				items: [
					{id: 123, name: 'Item 1'},
					{id: 456, name: 'Item 2'},
				],
			};

			const patches = recordPatches(
				state,
				(state) => {
					state.items[1].name = 'Updated Item 2';
				},
				{
					getItemId: {
						items: (item: {id: number}) => item.id,
					},
					arrayLengthAssignment: false,
				},
			);

			// Field modification should have id of the item being modified (numeric id works)
			expect(patches).toEqual([
				{op: 'replace', path: ['items', 1, 'name'], value: 'Updated Item 2', id: 456, pathIndex: 2},
			]);
		});

		it('should work with complex ID extraction in field modification operations', () => {
			const state = {
				items: [{data: {nested: {id: 'complex-1'}}, name: 'Item 1'}],
			};

			const patches = recordPatches(
				state,
				(state) => {
					state.items[0].name = 'Updated Item 1';
				},
				{
					getItemId: {
						items: (item: {data?: {nested?: {id?: string}}}) => item.data?.nested?.id,
					},
					arrayLengthAssignment: false,
				},
			);

			// Field modification should have id extracted using complex getItemId function
			expect(patches).toEqual([
				{
					op: 'replace',
					path: ['items', 0, 'name'],
					value: 'Updated Item 1',
					id: 'complex-1',
					pathIndex: 2,
				},
			]);
		});

		it('should not add id for unconfigured paths (field modifications)', () => {
			const state = {
				items: [{id: 'item-1', name: 'Item 1'}],
				other: [{id: 'other-1', name: 'Other 1'}],
			};

			const patches = recordPatches(
				state,
				(state) => {
					state.items[0].name = 'Updated Item 1';
					state.other[0].name = 'Updated Other 1';
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
				{op: 'replace', path: ['items', 0, 'name'], value: 'Updated Item 1', id: 'item-1', pathIndex: 2},
				{op: 'replace', path: ['other', 0, 'name'], value: 'Updated Other 1'}, // No id - unconfigured
			]);
		});
	});
});
