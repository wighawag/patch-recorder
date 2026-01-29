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
				(draft) => {
					draft.items.push(100);
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
				(draft) => {
					draft.items.push(100);
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
				(draft) => {
					draft.items[50] = 999;
					draft.items[75] = 888;
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
				(draft) => {
					draft.items[50] = 999;
					draft.items[75] = 888;
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
				(draft) => {
					draft.items.push(1);
					draft.items.push(2);
					draft.items.push(3);
					draft.items.push(4);
					draft.items.push(5);
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
				(draft) => {
					draft.items.push(1);
					draft.items.push(2);
					draft.items.push(3);
					draft.items.push(4);
					draft.items.push(5);
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
				(draft) => {
					draft.items.splice(50, 1, 999);
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
				(draft) => {
					draft.items.splice(50, 1, 999);
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
				(draft) => {
					draft.items.pop();
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
				(draft) => {
					draft.items.pop();
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
				(draft) => {
					draft.items.shift();
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
				(draft) => {
					draft.items.shift();
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
				(draft) => {
					draft.items.unshift(999);
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
				(draft) => {
					draft.items.unshift(999);
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
				(draft) => {
					draft.items.push(100);
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
				(draft) => {
					draft.items.push(100);
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
				(draft) => {
					draft.items[50] = 999;
					draft.items[75] = 888;
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
				(draft) => {
					draft.items[50] = 999;
					draft.items[75] = 888;
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