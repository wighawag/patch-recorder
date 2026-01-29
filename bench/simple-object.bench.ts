import {bench, describe} from 'vitest';
import {create} from 'mutative';
import {recordPatches} from '../src/index.js';
import {createSimpleState} from './utils.js';

const compressPatches = true;

describe('Simple object mutations', () => {
	let state: ReturnType<typeof createSimpleState>;

	bench(
		'mutative',
		() => {
			create(
				state,
				(state) => {
					state.a = 10;
					state.b = 20;
					state.c = 30;
				},
				{enablePatches: true},
			);
		},
		{
			setup: () => {
				state = createSimpleState();
			},
		},
	);

	bench(
		'patch-recorder',
		() => {
			recordPatches(
				state,
				(state) => {
					state.a = 10;
					state.b = 20;
					state.c = 30;
				},
				{compressPatches},
			);
		},
		{
			setup: () => {
				state = createSimpleState();
			},
		},
	);
});

describe('Simple object mutations (no compression)', () => {
	let state: ReturnType<typeof createSimpleState>;

	bench(
		'mutative',
		() => {
			create(
				state,
				(state) => {
					state.a = 10;
					state.b = 20;
					state.c = 30;
				},
				{enablePatches: true},
			);
		},
		{
			setup: () => {
				state = createSimpleState();
			},
		},
	);

	bench(
		'patch-recorder',
		() => {
			recordPatches(
				state,
				(state) => {
					state.a = 10;
					state.b = 20;
					state.c = 30;
				},
				{compressPatches: false},
			);
		},
		{
			setup: () => {
				state = createSimpleState();
			},
		},
	);
});
