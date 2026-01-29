import {bench, describe} from 'vitest';
import {compressPatches, compressPatchesWithStringKeys} from '../src/optimizer.js';
import type {Patch} from '../src/types.js';

// ==================== Direct comparison of both implementations ====================

describe('compressPatches - 5 patches on different paths', () => {
	let patches: Patch[];

	bench(
		'old (string keys)',
		() => {
			compressPatchesWithStringKeys(patches);
		},
		{
			setup: () => {
				patches = [
					{op: 'replace', path: ['a'], value: 1},
					{op: 'replace', path: ['b'], value: 2},
					{op: 'replace', path: ['c'], value: 3},
					{op: 'replace', path: ['d'], value: 4},
					{op: 'replace', path: ['e'], value: 5},
				];
			},
		},
	);

	bench(
		'new (nested Maps)',
		() => {
			compressPatches(patches);
		},
		{
			setup: () => {
				patches = [
					{op: 'replace', path: ['a'], value: 1},
					{op: 'replace', path: ['b'], value: 2},
					{op: 'replace', path: ['c'], value: 3},
					{op: 'replace', path: ['d'], value: 4},
					{op: 'replace', path: ['e'], value: 5},
				];
			},
		},
	);
});

describe('compressPatches - 5 patches on same path (mergeable)', () => {
	let patches: Patch[];

	bench(
		'old (string keys)',
		() => {
			compressPatchesWithStringKeys(patches);
		},
		{
			setup: () => {
				patches = [
					{op: 'replace', path: ['a'], value: 1},
					{op: 'replace', path: ['a'], value: 2},
					{op: 'replace', path: ['a'], value: 3},
					{op: 'replace', path: ['a'], value: 4},
					{op: 'replace', path: ['a'], value: 5},
				];
			},
		},
	);

	bench(
		'new (nested Maps)',
		() => {
			compressPatches(patches);
		},
		{
			setup: () => {
				patches = [
					{op: 'replace', path: ['a'], value: 1},
					{op: 'replace', path: ['a'], value: 2},
					{op: 'replace', path: ['a'], value: 3},
					{op: 'replace', path: ['a'], value: 4},
					{op: 'replace', path: ['a'], value: 5},
				];
			},
		},
	);
});

describe('compressPatches - 100 patches on different paths', () => {
	let patches: Patch[];

	bench(
		'old (string keys)',
		() => {
			compressPatchesWithStringKeys(patches);
		},
		{
			setup: () => {
				patches = Array.from({length: 100}, (_, i) => ({
					op: 'replace' as const,
					path: ['items', i],
					value: i,
				}));
			},
		},
	);

	bench(
		'new (nested Maps)',
		() => {
			compressPatches(patches);
		},
		{
			setup: () => {
				patches = Array.from({length: 100}, (_, i) => ({
					op: 'replace' as const,
					path: ['items', i],
					value: i,
				}));
			},
		},
	);
});

describe('compressPatches - 100 patches, 10 unique paths (10 patches each)', () => {
	let patches: Patch[];

	bench(
		'old (string keys)',
		() => {
			compressPatchesWithStringKeys(patches);
		},
		{
			setup: () => {
				patches = [];
				for (let i = 0; i < 10; i++) {
					for (let j = 0; j < 10; j++) {
						patches.push({
							op: 'replace',
							path: ['items', i],
							value: j,
						});
					}
				}
			},
		},
	);

	bench(
		'new (nested Maps)',
		() => {
			compressPatches(patches);
		},
		{
			setup: () => {
				patches = [];
				for (let i = 0; i < 10; i++) {
					for (let j = 0; j < 10; j++) {
						patches.push({
							op: 'replace',
							path: ['items', i],
							value: j,
						});
					}
				}
			},
		},
	);
});

describe('compressPatches - 20 deep nested paths (depth 5)', () => {
	let patches: Patch[];

	bench(
		'old (string keys)',
		() => {
			compressPatchesWithStringKeys(patches);
		},
		{
			setup: () => {
				patches = Array.from({length: 20}, (_, i) => ({
					op: 'replace' as const,
					path: ['level1', 'level2', 'level3', 'level4', `prop${i}`],
					value: i,
				}));
			},
		},
	);

	bench(
		'new (nested Maps)',
		() => {
			compressPatches(patches);
		},
		{
			setup: () => {
				patches = Array.from({length: 20}, (_, i) => ({
					op: 'replace' as const,
					path: ['level1', 'level2', 'level3', 'level4', `prop${i}`],
					value: i,
				}));
			},
		},
	);
});

describe('compressPatches - 20 deep nested paths (depth 10)', () => {
	let patches: Patch[];

	bench(
		'old (string keys)',
		() => {
			compressPatchesWithStringKeys(patches);
		},
		{
			setup: () => {
				patches = Array.from({length: 20}, (_, i) => ({
					op: 'replace' as const,
					path: ['l1', 'l2', 'l3', 'l4', 'l5', 'l6', 'l7', 'l8', 'l9', `prop${i}`],
					value: i,
				}));
			},
		},
	);

	bench(
		'new (nested Maps)',
		() => {
			compressPatches(patches);
		},
		{
			setup: () => {
				patches = Array.from({length: 20}, (_, i) => ({
					op: 'replace' as const,
					path: ['l1', 'l2', 'l3', 'l4', 'l5', 'l6', 'l7', 'l8', 'l9', `prop${i}`],
					value: i,
				}));
			},
		},
	);
});

describe('compressPatches - 100 array patches (add/remove mix)', () => {
	let patches: Patch[];

	bench(
		'old (string keys)',
		() => {
			compressPatchesWithStringKeys(patches);
		},
		{
			setup: () => {
				patches = [];
				for (let i = 0; i < 50; i++) {
					patches.push({op: 'add', path: ['items', i], value: i});
				}
				for (let i = 0; i < 50; i++) {
					patches.push({op: 'remove', path: ['items', 49 - i]});
				}
			},
		},
	);

	bench(
		'new (nested Maps)',
		() => {
			compressPatches(patches);
		},
		{
			setup: () => {
				patches = [];
				for (let i = 0; i < 50; i++) {
					patches.push({op: 'add', path: ['items', i], value: i});
				}
				for (let i = 0; i < 50; i++) {
					patches.push({op: 'remove', path: ['items', 49 - i]});
				}
			},
		},
	);
});

describe('compressPatches - paths with symbols', () => {
	let patches: Patch[];
	let sym1: symbol;
	let sym2: symbol;

	bench(
		'old (string keys)',
		() => {
			compressPatchesWithStringKeys(patches);
		},
		{
			setup: () => {
				sym1 = Symbol('key1');
				sym2 = Symbol('key2');
				patches = [
					{op: 'replace', path: ['items', 0, sym1], value: 1},
					{op: 'replace', path: ['items', 1, sym1], value: 2},
					{op: 'replace', path: ['items', 0, sym2], value: 3},
					{op: 'replace', path: ['items', 1, sym2], value: 4},
					{op: 'replace', path: ['items', 0, sym1], value: 5}, // merge
					{op: 'add', path: ['items', 2, sym1], value: 6},
					{op: 'remove', path: ['items', 2, sym1]}, // cancel
				];
			},
		},
	);

	bench(
		'new (nested Maps)',
		() => {
			compressPatches(patches);
		},
		{
			setup: () => {
				sym1 = Symbol('key1');
				sym2 = Symbol('key2');
				patches = [
					{op: 'replace', path: ['items', 0, sym1], value: 1},
					{op: 'replace', path: ['items', 1, sym1], value: 2},
					{op: 'replace', path: ['items', 0, sym2], value: 3},
					{op: 'replace', path: ['items', 1, sym2], value: 4},
					{op: 'replace', path: ['items', 0, sym1], value: 5}, // merge
					{op: 'add', path: ['items', 2, sym1], value: 6},
					{op: 'remove', path: ['items', 2, sym1]}, // cancel
				];
			},
		},
	);
});

describe('compressPatches - push + pop cancellation (10 pairs)', () => {
	let patches: Patch[];

	bench(
		'old (string keys)',
		() => {
			compressPatchesWithStringKeys(patches);
		},
		{
			setup: () => {
				patches = [];
				for (let i = 0; i < 10; i++) {
					patches.push({op: 'add', path: ['items', 100 + i], value: i});
					patches.push({op: 'replace', path: ['items', 'length'], value: 100});
				}
			},
		},
	);

	bench(
		'new (nested Maps)',
		() => {
			compressPatches(patches);
		},
		{
			setup: () => {
				patches = [];
				for (let i = 0; i < 10; i++) {
					patches.push({op: 'add', path: ['items', 100 + i], value: i});
					patches.push({op: 'replace', path: ['items', 'length'], value: 100});
				}
			},
		},
	);
});
