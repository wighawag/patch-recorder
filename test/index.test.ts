import {describe, it, expect} from 'vitest';
import {recordPatches} from '../src/index';

describe('recordPatches', () => {
	describe('basic object mutations', () => {
		it('should record simple property assignment', () => {
			const state = {user: {name: 'John', age: 30}};

			const patches = recordPatches(state, (draft) => {
				draft.user.name = 'Jane';
			});

			expect(state.user.name).toBe('Jane'); // Mutated in place
			expect(patches).toEqual([{op: 'replace', path: ['user', 'name'], value: 'Jane'}]);
		});

		it('should record multiple property assignments', () => {
			const state = {user: {name: 'John', age: 30}};

			const patches = recordPatches(state, (draft) => {
				draft.user.name = 'Jane';
				draft.user.age = 25;
			});

			expect(state.user.name).toBe('Jane');
			expect(state.user.age).toBe(25);
			expect(patches).toEqual([
				{op: 'replace', path: ['user', 'name'], value: 'Jane'},
				{op: 'replace', path: ['user', 'age'], value: 25},
			]);
		});

		it('should record adding a new property', () => {
			const state = {user: {name: 'John'}} as any;

			const patches = recordPatches(state, (draft) => {
				draft.user.age = 30;
			});

			expect(state.user.age).toBe(30);
			expect(patches).toEqual([{op: 'add', path: ['user', 'age'], value: 30}]);
		});

		it('should record property deletion', () => {
			const state = {user: {name: 'John', age: 30}} as any;

			const patches = recordPatches(state, (draft) => {
				delete draft.user.age;
			});

			expect(state.user.age).toBeUndefined();
			expect(patches).toEqual([{op: 'remove', path: ['user', 'age']}]);
		});

		it('should handle deep nesting', () => {
			const state = {data: {user: {profile: {name: 'John'}}}};

			const patches = recordPatches(state, (draft) => {
				draft.data.user.profile.name = 'Jane';
			});

			expect(state.data.user.profile.name).toBe('Jane');
			expect(patches).toEqual([
				{op: 'replace', path: ['data', 'user', 'profile', 'name'], value: 'Jane'},
			]);
		});
	});

	describe('options', () => {
		it('should respect pathAsArray: false option', () => {
			const state = {user: {name: 'John'}};

			const patches = recordPatches(
				state,
				(draft) => {
					draft.user.name = 'Jane';
				},
				{pathAsArray: false},
			);

			expect(patches).toEqual([{op: 'replace', path: '/user/name', value: 'Jane'}]);
		});

		it('should compress patches when compressPatches option is true', () => {
			const state = {user: {name: 'John'}};

			const patches = recordPatches(
				state,
				(draft) => {
					draft.user.name = 'Jane';
					draft.user.name = 'Alice';
					draft.user.name = 'Bob';
				},
				{compressPatches: true},
			);

			expect(state.user.name).toBe('Bob');
			// Should only have the final value
			expect(patches).toEqual([{op: 'replace', path: ['user', 'name'], value: 'Bob'}]);
		});
	});

	describe('edge cases', () => {
		it('should handle setting to undefined', () => {
			const state = {user: {name: 'John'}} as any;

			const patches = recordPatches(state, (draft) => {
				draft.user.name = undefined;
			});

			expect(state.user.name).toBeUndefined();
			expect(patches).toEqual([{op: 'replace', path: ['user', 'name'], value: undefined}]);
		});

		it('should handle setting to null', () => {
			const state = {user: {name: 'John'}} as any;

			const patches = recordPatches(state, (draft) => {
				draft.user.name = null;
			});

			expect(state.user.name).toBeNull();
			expect(patches).toEqual([{op: 'replace', path: ['user', 'name'], value: null}]);
		});

		it('should skip patch generation for no-op assignments', () => {
			const state = {user: {name: 'John'}};

			const patches = recordPatches(state, (draft) => {
				draft.user.name = 'John'; // Same value
			});

			expect(patches).toEqual([]);
		});
	});
});
