import {bench, describe} from 'vitest';
import {create} from 'mutative';
import {recordPatches} from '../src/index.js';
import {createArrayState} from './utils.js';

const compressPatches = true;
const ARRAY_LENGTH = 100000;

describe('Array push (100k elements)', () => {
	let state: ReturnType<typeof createArrayState>;

	bench(
		'mutative',
		() => {
			create(
				state,
				(state) => {
					state.items.push(100);
				},
				{enablePatches: true},
			);
		},
		{
			setup: () => {
				state = createArrayState(ARRAY_LENGTH);
			},
		},
	);

	bench(
		'patch-recorder',
		() => {
			recordPatches(
				state,
				(state) => {
					state.items.push(100);
				},
				{compressPatches},
			);
		},
		{
			setup: () => {
				state = createArrayState(ARRAY_LENGTH);
			},
		},
	);
});

describe('Array index assignment (100k elements)', () => {
	let state: ReturnType<typeof createArrayState>;

	bench(
		'mutative',
		() => {
			create(
				state,
				(state) => {
					state.items[50] = 999;
					state.items[75] = 888;
				},
				{enablePatches: true},
			);
		},
		{
			setup: () => {
				state = createArrayState(ARRAY_LENGTH);
			},
		},
	);

	bench(
		'patch-recorder',
		() => {
			recordPatches(
				state,
				(state) => {
					state.items[50] = 999;
					state.items[75] = 888;
				},
				{compressPatches},
			);
		},
		{
			setup: () => {
				state = createArrayState(ARRAY_LENGTH);
			},
		},
	);
});

describe('Array multiple pushes (100k elements)', () => {
	let state: ReturnType<typeof createArrayState>;

	bench(
		'mutative',
		() => {
			create(
				state,
				(state) => {
					state.items.push(1);
					state.items.push(2);
					state.items.push(3);
					state.items.push(4);
					state.items.push(5);
				},
				{enablePatches: true},
			);
		},
		{
			setup: () => {
				state = createArrayState(ARRAY_LENGTH);
			},
		},
	);

	bench(
		'patch-recorder',
		() => {
			recordPatches(
				state,
				(state) => {
					state.items.push(1);
					state.items.push(2);
					state.items.push(3);
					state.items.push(4);
					state.items.push(5);
				},
				{compressPatches},
			);
		},
		{
			setup: () => {
				state = createArrayState(ARRAY_LENGTH);
			},
		},
	);
});

describe('Array splice (100k elements)', () => {
	let state: ReturnType<typeof createArrayState>;

	bench(
		'mutative',
		() => {
			create(
				state,
				(state) => {
					state.items.splice(50, 1, 999);
				},
				{enablePatches: true},
			);
		},
		{
			setup: () => {
				state = createArrayState(ARRAY_LENGTH);
			},
		},
	);

	bench(
		'patch-recorder',
		() => {
			recordPatches(
				state,
				(state) => {
					state.items.splice(50, 1, 999);
				},
				{compressPatches},
			);
		},
		{
			setup: () => {
				state = createArrayState(ARRAY_LENGTH);
			},
		},
	);
});

describe('Array pop (100k elements)', () => {
	let state: ReturnType<typeof createArrayState>;

	bench(
		'mutative',
		() => {
			create(
				state,
				(state) => {
					state.items.pop();
				},
				{enablePatches: true},
			);
		},
		{
			setup: () => {
				state = createArrayState(ARRAY_LENGTH);
			},
		},
	);

	bench(
		'patch-recorder',
		() => {
			recordPatches(
				state,
				(state) => {
					state.items.pop();
				},
				{compressPatches},
			);
		},
		{
			setup: () => {
				state = createArrayState(ARRAY_LENGTH);
			},
		},
	);
});

describe('Array shift (100k elements)', () => {
	let state: ReturnType<typeof createArrayState>;

	bench(
		'mutative',
		() => {
			create(
				state,
				(state) => {
					state.items.shift();
				},
				{enablePatches: true},
			);
		},
		{
			setup: () => {
				state = createArrayState(ARRAY_LENGTH);
			},
		},
	);

	bench(
		'patch-recorder',
		() => {
			recordPatches(
				state,
				(state) => {
					state.items.shift();
				},
				{compressPatches},
			);
		},
		{
			setup: () => {
				state = createArrayState(ARRAY_LENGTH);
			},
		},
	);
});

describe('Array unshift (100k elements)', () => {
	let state: ReturnType<typeof createArrayState>;

	bench(
		'mutative',
		() => {
			create(
				state,
				(state) => {
					state.items.unshift(999);
				},
				{enablePatches: true},
			);
		},
		{
			setup: () => {
				state = createArrayState(ARRAY_LENGTH);
			},
		},
	);

	bench(
		'patch-recorder',
		() => {
			recordPatches(
				state,
				(state) => {
					state.items.unshift(999);
				},
				{compressPatches},
			);
		},
		{
			setup: () => {
				state = createArrayState(ARRAY_LENGTH);
			},
		},
	);
});

describe('Small array push (100 elements)', () => {
	let state: ReturnType<typeof createArrayState>;

	bench(
		'mutative',
		() => {
			create(
				state,
				(state) => {
					state.items.push(100);
				},
				{enablePatches: true},
			);
		},
		{
			setup: () => {
				state = createArrayState(100);
			},
		},
	);

	bench(
		'patch-recorder',
		() => {
			recordPatches(
				state,
				(state) => {
					state.items.push(100);
				},
				{compressPatches},
			);
		},
		{
			setup: () => {
				state = createArrayState(100);
			},
		},
	);
});

describe('Small array index assignment (100 elements)', () => {
	let state: ReturnType<typeof createArrayState>;

	bench(
		'mutative',
		() => {
			create(
				state,
				(state) => {
					state.items[50] = 999;
					state.items[75] = 888;
				},
				{enablePatches: true},
			);
		},
		{
			setup: () => {
				state = createArrayState(100);
			},
		},
	);

	bench(
		'patch-recorder',
		() => {
			recordPatches(
				state,
				(state) => {
					state.items[50] = 999;
					state.items[75] = 888;
				},
				{compressPatches},
			);
		},
		{
			setup: () => {
				state = createArrayState(100);
			},
		},
	);
});
