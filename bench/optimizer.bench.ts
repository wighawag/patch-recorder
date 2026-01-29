import {bench, describe} from 'vitest';
import {pathToKey} from '../src/utils.js';
import {compressPatches} from '../src/optimizer.js';
import type {Patch, PatchPath} from '../src/types.js';

// ==================== Nested Map implementation ====================

interface PathNode<T> {
	value?: T;
	children?: Map<string | number | object | symbol, PathNode<T>>;
}

function getOrCreateNode<T>(root: PathNode<T>, path: PatchPath): PathNode<T> {
	let current = root;
	for (const key of path) {
		if (!current.children) {
			current.children = new Map();
		}
		let child = current.children.get(key);
		if (!child) {
			child = {};
			current.children.set(key, child);
		}
		current = child;
	}
	return current;
}

function getNode<T>(root: PathNode<T>, path: PatchPath): PathNode<T> | undefined {
	let current: PathNode<T> | undefined = root;
	for (const key of path) {
		if (!current?.children) return undefined;
		current = current.children.get(key);
	}
	return current;
}

// ==================== Path key conversion: pathToKey vs nested Map ====================

describe('Single path - 3 elements', () => {
	let path: PatchPath;

	bench(
		'pathToKey',
		() => {
			pathToKey(path);
		},
		{
			setup: () => {
				path = ['items', 0, 'name'];
			},
		},
	);

	bench(
		'nested Map set',
		() => {
			const root: PathNode<number> = {};
			getOrCreateNode(root, path).value = 1;
		},
		{
			setup: () => {
				path = ['items', 0, 'name'];
			},
		},
	);

	bench(
		'nested Map get (after set)',
		() => {
			const root: PathNode<number> = {};
			getOrCreateNode(root, path).value = 1;
			getNode(root, path);
		},
		{
			setup: () => {
				path = ['items', 0, 'name'];
			},
		},
	);
});

describe('Single path - 5 elements', () => {
	let path: PatchPath;

	bench(
		'pathToKey',
		() => {
			pathToKey(path);
		},
		{
			setup: () => {
				path = ['users', 0, 'profile', 'address', 'city'];
			},
		},
	);

	bench(
		'nested Map set',
		() => {
			const root: PathNode<number> = {};
			getOrCreateNode(root, path).value = 1;
		},
		{
			setup: () => {
				path = ['users', 0, 'profile', 'address', 'city'];
			},
		},
	);
});

describe('Single path - 10 elements', () => {
	let path: PatchPath;

	bench(
		'pathToKey',
		() => {
			pathToKey(path);
		},
		{
			setup: () => {
				path = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'];
			},
		},
	);

	bench(
		'nested Map set',
		() => {
			const root: PathNode<number> = {};
			getOrCreateNode(root, path).value = 1;
		},
		{
			setup: () => {
				path = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'];
			},
		},
	);
});

// ==================== Full workflow: insert + lookup ====================

describe('10 paths insert + lookup (typical use case)', () => {
	let paths: PatchPath[];

	bench(
		'pathToKey + Map',
		() => {
			const map = new Map<string, number>();
			// Insert
			for (let i = 0; i < paths.length; i++) {
				map.set(pathToKey(paths[i]), i);
			}
			// Lookup
			for (const path of paths) {
				map.get(pathToKey(path));
			}
		},
		{
			setup: () => {
				paths = [
					['users', 0, 'name'],
					['users', 0, 'email'],
					['users', 1, 'name'],
					['users', 1, 'email'],
					['items', 0],
					['items', 1],
					['items', 2],
					['config', 'theme'],
					['config', 'language'],
					['config', 'settings', 'notifications'],
				];
			},
		},
	);

	bench(
		'nested Map',
		() => {
			const root: PathNode<number> = {};
			// Insert
			for (let i = 0; i < paths.length; i++) {
				getOrCreateNode(root, paths[i]).value = i;
			}
			// Lookup
			for (const path of paths) {
				getNode(root, path);
			}
		},
		{
			setup: () => {
				paths = [
					['users', 0, 'name'],
					['users', 0, 'email'],
					['users', 1, 'name'],
					['users', 1, 'email'],
					['items', 0],
					['items', 1],
					['items', 2],
					['config', 'theme'],
					['config', 'language'],
					['config', 'settings', 'notifications'],
				];
			},
		},
	);
});

describe('100 paths insert + lookup', () => {
	let paths: PatchPath[];

	bench(
		'pathToKey + Map',
		() => {
			const map = new Map<string, number>();
			for (let i = 0; i < paths.length; i++) {
				map.set(pathToKey(paths[i]), i);
			}
			for (const path of paths) {
				map.get(pathToKey(path));
			}
		},
		{
			setup: () => {
				paths = Array.from({length: 100}, (_, i) => ['items', i, 'name']);
			},
		},
	);

	bench(
		'nested Map',
		() => {
			const root: PathNode<number> = {};
			for (let i = 0; i < paths.length; i++) {
				getOrCreateNode(root, paths[i]).value = i;
			}
			for (const path of paths) {
				getNode(root, path);
			}
		},
		{
			setup: () => {
				paths = Array.from({length: 100}, (_, i) => ['items', i, 'name']);
			},
		},
	);
});

describe('100 deep paths (depth 5) insert + lookup', () => {
	let paths: PatchPath[];

	bench(
		'pathToKey + Map',
		() => {
			const map = new Map<string, number>();
			for (let i = 0; i < paths.length; i++) {
				map.set(pathToKey(paths[i]), i);
			}
			for (const path of paths) {
				map.get(pathToKey(path));
			}
		},
		{
			setup: () => {
				paths = Array.from({length: 100}, (_, i) => ['level1', 'level2', 'level3', 'level4', `prop${i}`]);
			},
		},
	);

	bench(
		'nested Map',
		() => {
			const root: PathNode<number> = {};
			for (let i = 0; i < paths.length; i++) {
				getOrCreateNode(root, paths[i]).value = i;
			}
			for (const path of paths) {
				getNode(root, path);
			}
		},
		{
			setup: () => {
				paths = Array.from({length: 100}, (_, i) => ['level1', 'level2', 'level3', 'level4', `prop${i}`]);
			},
		},
	);
});

// ==================== With symbols (edge case) ====================

describe('Paths with symbols', () => {
	let paths: PatchPath[];
	let sym1: symbol;
	let sym2: symbol;

	bench(
		'pathToKey + Map',
		() => {
			const map = new Map<string, number>();
			for (let i = 0; i < paths.length; i++) {
				map.set(pathToKey(paths[i]), i);
			}
			for (const path of paths) {
				map.get(pathToKey(path));
			}
		},
		{
			setup: () => {
				sym1 = Symbol('key1');
				sym2 = Symbol('key2');
				paths = [
					['items', 0, sym1],
					['items', 1, sym1],
					['items', 0, sym2],
					['items', 1, sym2],
				];
			},
		},
	);

	bench(
		'nested Map',
		() => {
			const root: PathNode<number> = {};
			for (let i = 0; i < paths.length; i++) {
				getOrCreateNode(root, paths[i]).value = i;
			}
			for (const path of paths) {
				getNode(root, path);
			}
		},
		{
			setup: () => {
				sym1 = Symbol('key1');
				sym2 = Symbol('key2');
				paths = [
					['items', 0, sym1],
					['items', 1, sym1],
					['items', 0, sym2],
					['items', 1, sym2],
				];
			},
		},
	);
});

// ==================== compressPatches benchmarks ====================

describe('compressPatches - 5 patches on different paths', () => {
	let patches: Patch[];

	bench(
		'current implementation',
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

describe('compressPatches - 100 patches on different paths', () => {
	let patches: Patch[];

	bench(
		'current implementation',
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

describe('compressPatches - 100 patches, 10 unique paths', () => {
	let patches: Patch[];

	bench(
		'current implementation',
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
		'current implementation',
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
		'current implementation',
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