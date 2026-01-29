import {bench, describe} from 'vitest';
import {create} from 'mutative';
import {recordPatches} from '../src/index.js';
import {createMediumState, createLargeState} from './utils.js';

const compressPatches = true;

describe('Medium nested object mutations', () => {
	let state: ReturnType<typeof createMediumState>;

	bench(
		'mutative',
		() => {
			create(
				state,
				(state) => {
					state.user.profile.name = 'Jane';
					state.user.profile.age = 25;
					state.user.settings.theme = 'light';
					state.user.profile.address.city = 'Boston';
				},
				{enablePatches: true},
			);
		},
		{
			setup: () => {
				state = createMediumState();
			},
		},
	);

	bench(
		'patch-recorder',
		() => {
			recordPatches(
				state,
				(state) => {
					state.user.profile.name = 'Jane';
					state.user.profile.age = 25;
					state.user.settings.theme = 'light';
					state.user.profile.address.city = 'Boston';
				},
				{compressPatches},
			);
		},
		{
			setup: () => {
				state = createMediumState();
			},
		},
	);
});

describe('Large nested object mutations', () => {
	let state: ReturnType<typeof createLargeState>;

	bench(
		'mutative',
		() => {
			create(
				state,
				(state) => {
					state.obj0.key0 = 'updated0';
					state.obj0.num0 = 100;
					state.obj1.key1 = 'updated1';
					state.obj0.obj0.key0 = 'nested0';
				},
				{enablePatches: true},
			);
		},
		{
			setup: () => {
				state = createLargeState(3, 5);
			},
		},
	);

	bench(
		'patch-recorder',
		() => {
			recordPatches(
				state,
				(state) => {
					state.obj0.key0 = 'updated0';
					state.obj0.num0 = 100;
					state.obj1.key1 = 'updated1';
					state.obj0.obj0.key0 = 'nested0';
				},
				{compressPatches},
			);
		},
		{
			setup: () => {
				state = createLargeState(3, 5);
			},
		},
	);
});

describe('Very large nested object mutations (depth=4, breadth=5)', () => {
	let state: ReturnType<typeof createLargeState>;

	bench(
		'mutative',
		() => {
			create(
				state,
				(state) => {
					state.obj0.key0 = 'updated0';
					state.obj0.num0 = 100;
					state.obj1.key1 = 'updated1';
					state.obj0.obj0.key0 = 'nested0';
				},
				{enablePatches: true},
			);
		},
		{
			setup: () => {
				state = createLargeState(4, 5);
			},
		},
	);

	bench(
		'patch-recorder',
		() => {
			recordPatches(
				state,
				(state) => {
					state.obj0.key0 = 'updated0';
					state.obj0.num0 = 100;
					state.obj1.key1 = 'updated1';
					state.obj0.obj0.key0 = 'nested0';
				},
				{compressPatches},
			);
		},
		{
			setup: () => {
				state = createLargeState(4, 5);
			},
		},
	);
});
