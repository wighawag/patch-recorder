import {bench, describe} from 'vitest';
import {create} from 'mutative';
import {recordPatches} from '../src/index.js';
import {createMapState} from './utils.js';

const compressPatches = true;
const MAP_SIZE = 100000;

describe('Map operations (100k entries)', () => {
	let state: ReturnType<typeof createMapState>;

	bench(
		'mutative',
		() => {
			create(
				state,
				(state) => {
					state.map.set('key50', 50);
					state.map.set('key51', 51);
					state.map.delete('key0');
				},
				{enablePatches: true},
			);
		},
		{
			setup: () => {
				state = createMapState(MAP_SIZE);
			},
		},
	);

	bench(
		'patch-recorder',
		() => {
			recordPatches(
				state,
				(state) => {
					state.map.set('key50', 50);
					state.map.set('key51', 51);
					state.map.delete('key0');
				},
				{compressPatches},
			);
		},
		{
			setup: () => {
				state = createMapState(MAP_SIZE);
			},
		},
	);
});

describe('Map set single value (100k entries)', () => {
	let state: ReturnType<typeof createMapState>;

	bench(
		'mutative',
		() => {
			create(
				state,
				(state) => {
					state.map.set('newKey', 'newValue');
				},
				{enablePatches: true},
			);
		},
		{
			setup: () => {
				state = createMapState(MAP_SIZE);
			},
		},
	);

	bench(
		'patch-recorder',
		() => {
			recordPatches(
				state,
				(state) => {
					state.map.set('newKey', 'newValue');
				},
				{compressPatches},
			);
		},
		{
			setup: () => {
				state = createMapState(MAP_SIZE);
			},
		},
	);
});

describe('Map delete single value (100k entries)', () => {
	let state: ReturnType<typeof createMapState>;

	bench(
		'mutative',
		() => {
			create(
				state,
				(state) => {
					state.map.delete('key50000');
				},
				{enablePatches: true},
			);
		},
		{
			setup: () => {
				state = createMapState(MAP_SIZE);
			},
		},
	);

	bench(
		'patch-recorder',
		() => {
			recordPatches(
				state,
				(state) => {
					state.map.delete('key50000');
				},
				{compressPatches},
			);
		},
		{
			setup: () => {
				state = createMapState(MAP_SIZE);
			},
		},
	);
});

describe('Small Map operations (100 entries)', () => {
	let state: ReturnType<typeof createMapState>;

	bench(
		'mutative',
		() => {
			create(
				state,
				(state) => {
					state.map.set('key50', 50);
					state.map.set('key51', 51);
					state.map.delete('key0');
				},
				{enablePatches: true},
			);
		},
		{
			setup: () => {
				state = createMapState(100);
			},
		},
	);

	bench(
		'patch-recorder',
		() => {
			recordPatches(
				state,
				(state) => {
					state.map.set('key50', 50);
					state.map.set('key51', 51);
					state.map.delete('key0');
				},
				{compressPatches},
			);
		},
		{
			setup: () => {
				state = createMapState(100);
			},
		},
	);
});

describe('Map with nested object values', () => {
	let state: {map: Map<string, {name: string; age: number}>};

	bench(
		'mutative',
		() => {
			create(
				state,
				(state) => {
					const user = state.map.get('user1');
					if (user) {
						user.age = 31;
					}
				},
				{enablePatches: true},
			);
		},
		{
			setup: () => {
				state = {
					map: new Map([
						['user1', {name: 'Alice', age: 30}],
						['user2', {name: 'Bob', age: 25}],
					]),
				};
			},
		},
	);

	bench(
		'patch-recorder',
		() => {
			recordPatches(
				state,
				(state) => {
					const user = state.map.get('user1');
					if (user) {
						user.age = 31;
					}
				},
				{compressPatches},
			);
		},
		{
			setup: () => {
				state = {
					map: new Map([
						['user1', {name: 'Alice', age: 30}],
						['user2', {name: 'Bob', age: 25}],
					]),
				};
			},
		},
	);
});
