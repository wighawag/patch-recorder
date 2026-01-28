import {describe, it, expect} from 'vitest';
import {create} from '../src/index.js';

describe('create - Mutative-compatible API', () => {
	it('should return [state, patches] tuple like mutative', () => {
		const state = {user: {name: 'John', age: 30}};

		const [nextState, patches] = create(state, (draft) => {
			draft.user.name = 'Jane';
		});

		expect(nextState.user.name).toBe('Jane');
		expect(nextState === state).toBe(true); // Same reference (mutated in place)
		expect(patches).toEqual([{op: 'replace', path: ['user', 'name'], value: 'Jane'}]);
	});

	it('should handle multiple mutations', () => {
		const state = {a: 1, b: 2, c: 3};

		const [nextState, patches] = create(state, (draft) => {
			draft.a = 10;
			draft.b = 20;
			draft.c = 30;
		});

		expect(nextState).toEqual({a: 10, b: 20, c: 30});
		expect(nextState === state).toBe(true);
		expect(patches).toEqual([
			{op: 'replace', path: ['a'], value: 10},
			{op: 'replace', path: ['b'], value: 20},
			{op: 'replace', path: ['c'], value: 30},
		]);
	});

	it('should handle array operations', () => {
		const state = {items: [1, 2, 3]};

		const [nextState, patches] = create(state, (draft) => {
			draft.items.push(4);
		});

		expect(nextState.items).toEqual([1, 2, 3, 4]);
		expect(nextState === state).toBe(true);
		// Length patches are not included for array methods (aligned with mutative)
		expect(patches).toEqual([{op: 'add', path: ['items', 3], value: 4}]);
	});

	it('should handle Map operations', () => {
		const state = {map: new Map([['a', 1]])};

		const [nextState, patches] = create(state, (draft) => {
			draft.map.set('b', 2);
		});

		expect(nextState.map.get('b')).toBe(2);
		expect(nextState === state).toBe(true);
		expect(patches).toEqual([{op: 'add', path: ['map', 'b'], value: 2}]);
	});

	it('should handle Set operations', () => {
		const state = {set: new Set([1, 2])};

		const [nextState, patches] = create(state, (draft) => {
			draft.set.add(3);
		});

		expect(nextState.set.has(3)).toBe(true);
		expect(nextState === state).toBe(true);
		expect(patches).toEqual([{op: 'add', path: ['set', 3], value: 3}]);
	});

	it('should respect compressPatches option', () => {
		const state = {value: 1};

		const [nextState, patches] = create(
			state,
			(draft) => {
				draft.value = 2;
				draft.value = 3;
			},
			{compressPatches: true, enablePatches: true},
		);

		expect(nextState.value).toBe(3);
		expect(nextState === state).toBe(true);
		// Should be compressed to only the final value
		expect(patches).toEqual([{op: 'replace', path: ['value'], value: 3}]);
	});

	it('should respect pathAsArray option', () => {
		const state = {value: 1};

		const [nextState, patches] = create(
			state,
			(draft) => {
				draft.value = 2;
			},
			{pathAsArray: false, enablePatches: true},
		);

		expect(nextState.value).toBe(2);
		expect(patches).toEqual([{op: 'replace', path: '/value', value: 2}]);
	});

	it('should be easily swappable with mutative', () => {
		const state = {user: {name: 'John'}};

		// Using patch-recorder's create function
		const [nextState, patches] = create(state, (draft) => {
			draft.user.name = 'Jane';
		});

		expect(nextState.user.name).toBe('Jane');
		expect(patches.length).toBeGreaterThan(0);

		// The main difference: patch-recorder mutates in place
		expect(nextState === state).toBe(true);
	});

	it('should be easily swappable with mutative', () => {
		const state = {
			count: {value: 0},
			name: {value: 'test'},
		};

		// Using patch-recorder's create function
		const [nextState, patches] = create(state, (draft) => {
			draft.count.value = 1;
		});

		expect(nextState.count.value).toBe(1);
		expect(patches.length).toBeGreaterThan(0);

		// The main difference: patch-recorder mutates in place
		expect(nextState === state).toBe(true);
	});

	it('should accept enablePatches option for mutative compatibility', () => {
		const state = {user: {name: 'John'}};

		// Using enablePatches option (like mutative)
		const [nextState, patches] = create(
			state,
			(draft) => {
				draft.user.name = 'Jane';
			},
			{enablePatches: true},
		);

		expect(nextState.user.name).toBe('Jane');
		expect(patches).toEqual([{op: 'replace', path: ['user', 'name'], value: 'Jane'}]);
		expect(nextState === state).toBe(true);
	});

	it('should handle nested mutations', () => {
		const state = {
			data: {
				user: {
					profile: {
						name: 'John',
						age: 30,
					},
				},
			},
		};

		const [nextState, patches] = create(state, (draft) => {
			draft.data.user.profile.name = 'Jane';
			draft.data.user.profile.age = 25;
		});

		expect(nextState.data.user.profile.name).toBe('Jane');
		expect(nextState.data.user.profile.age).toBe(25);
		expect(nextState === state).toBe(true);
		expect(patches).toEqual([
			{op: 'replace', path: ['data', 'user', 'profile', 'name'], value: 'Jane'},
			{op: 'replace', path: ['data', 'user', 'profile', 'age'], value: 25},
		]);
	});

	it('should handle property deletion', () => {
		const state = {user: {name: 'John', age: 30}} as any;

		const [nextState, patches] = create(state, (draft) => {
			delete draft.user.age;
		});

		expect(nextState.user.age).toBeUndefined();
		expect(nextState === state).toBe(true);
		expect(patches).toEqual([{op: 'remove', path: ['user', 'age']}]);
	});

	it('should handle adding new properties', () => {
		const state = {user: {name: 'John'}} as any;

		const [nextState, patches] = create(state, (draft) => {
			draft.user.age = 30;
		});

		expect(nextState.user.age).toBe(30);
		expect(nextState === state).toBe(true);
		expect(patches).toEqual([{op: 'add', path: ['user', 'age'], value: 30}]);
	});
});
