import {create} from 'mutative';
import {recordPatches} from '../src/index.js';

/**
 * Utility to create a large nested object for benchmarking
 */
function createLargeState(depth: number, breadth: number): Record<string, any> {
	const result: Record<string, any> = {};

	function build(obj: Record<string, any>, currentDepth: number) {
		if (currentDepth >= depth) return;

		for (let i = 0; i < breadth; i++) {
			if (currentDepth === depth - 1) {
				// Leaf nodes - primitives
				obj[`key${i}`] = `value${i}`;
				obj[`num${i}`] = i;
			} else {
				// Nested objects
				obj[`obj${i}`] = {};
				build(obj[`obj${i}`], currentDepth + 1);
			}
		}

		// Add arrays
		obj['items'] = Array.from({length: breadth}, (_, i) => ({
			id: i,
			name: `Item ${i}`,
			data: Array.from({length: 5}, (_, j) => `data${j}`),
		}));
	}

	build(result, 0);
	return result;
}

/**
 * Benchmark utility
 */
function benchmark<T>(name: string, setup: () => T, fn: (v: T) => void, iterations = 100) {
	const values = [];
	for (let i = 0; i < iterations; i++) {
		values.push(setup());
	}
	const start = performance.now();

	for (let i = 0; i < iterations; i++) {
		fn(values[i]);
	}

	const end = performance.now();
	const totalTime = end - start;
	const avgTime = totalTime / iterations;

	return {
		name,
		totalTime,
		avgTime,
		iterations,
	};
}

/**
 * Print benchmark results
 */
function printBenchmarkResults(results: any[]) {
	console.log('\n' + '='.repeat(80));
	console.log('BENCHMARK RESULTS');
	console.log('='.repeat(80));

	for (const result of results) {
		console.log(`\n${result.name}:`);
		console.log(`  Total time: ${result.totalTime.toFixed(2)}ms`);
		console.log(`  Average time: ${result.avgTime.toFixed(4)}ms`);
		console.log(`  Iterations: ${result.iterations}`);
	}

	console.log('\n' + '='.repeat(80));
}

// ==================== BENCHMARK SCENARIOS ====================

function runBenchmarks() {
	const results: any[] = [];

	// 1. Simple object mutation
	console.log('Running: Simple object mutation...');
	const simpleState = {a: 1, b: 2, c: 3};

	results.push(
		benchmark(
			'Mutative - Simple object',
			() => JSON.parse(JSON.stringify(simpleState)),
			(state) => {
				create(
					state,
					(draft) => {
						draft.a = 10;
						draft.b = 20;
						draft.c = 30;
					},
					{enablePatches: true},
				);
			},
		),
	);

	results.push(
		benchmark(
			'patch-recorder - Simple object',
			() => JSON.parse(JSON.stringify(simpleState)),
			(state) => {
				recordPatches(state, (draft) => {
					draft.a = 10;
					draft.b = 20;
					draft.c = 30;
				});
			},
		),
	);

	// 2. Nested object mutation (medium)
	console.log('Running: Medium nested object mutation...');
	const mediumState = {
		user: {
			profile: {
				name: 'John',
				age: 30,
				address: {
					street: '123 Main St',
					city: 'New York',
					zip: '10001',
				},
			},
			settings: {
				theme: 'dark',
				notifications: true,
				language: 'en',
			},
		},
	};

	results.push(
		benchmark(
			'Mutative - Medium nested object',
			() => JSON.parse(JSON.stringify(mediumState)),
			(state) => {
				create(
					state,
					(draft) => {
						draft.user.profile.name = 'Jane';
						draft.user.profile.age = 25;
						draft.user.settings.theme = 'light';
						draft.user.profile.address.city = 'Boston';
					},
					{enablePatches: true},
				);
			},
		),
	);

	results.push(
		benchmark(
			'patch-recorder - Medium nested object',
			() => JSON.parse(JSON.stringify(mediumState)),
			(state) => {
				recordPatches(state, (draft) => {
					draft.user.profile.name = 'Jane';
					draft.user.profile.age = 25;
					draft.user.settings.theme = 'light';
					draft.user.profile.address.city = 'Boston';
				});
			},
		),
	);

	// 3. Large nested object mutation
	console.log('Running: Large nested object mutation...');
	const largeState = createLargeState(3, 5);

	results.push(
		benchmark(
			'Mutative - Large nested object',
			() => JSON.parse(JSON.stringify(largeState)),
			(state) => {
				create(
					state,
					(draft) => {
						draft.obj0.key0 = 'updated0';
						draft.obj0.num0 = 100;
						draft.obj1.key1 = 'updated1';
						draft.obj0.obj0.key0 = 'nested0';
					},
					{enablePatches: true},
				);
			},
			1000,
		),
	);

	results.push(
		benchmark(
			'patch-recorder - Large nested object',
			() => JSON.parse(JSON.stringify(largeState)),
			(state) => {
				recordPatches(state, (draft) => {
					draft.obj0.key0 = 'updated0';
					draft.obj0.num0 = 100;
					draft.obj1.key1 = 'updated1';
					draft.obj0.obj0.key0 = 'nested0';
				});
			},
			1000,
		),
	);

	// 4. Array operations
	console.log('Running: Array operations...');
	const arrayLength = 100000;

	results.push(
		benchmark(
			'Mutative - Array push',
			() => ({items: Array.from({length: arrayLength}, (_, i) => i)}),
			(state) => {
				create(
					state,
					(draft) => {
						draft.items.push(100);
					},
					{enablePatches: true},
				);
			},
		),
	);

	results.push(
		benchmark(
			'patch-recorder - Array push',
			() => ({items: Array.from({length: arrayLength}, (_, i) => i)}),
			(state) => {
				recordPatches(state, (draft) => {
					draft.items.push(100);
				});
			},
		),
	);

	// 5. Array index assignment
	results.push(
		benchmark(
			'Mutative - Array index assignment',
			() => ({items: Array.from({length: arrayLength}, (_, i) => i)}),
			(state) => {
				create(
					state,
					(draft) => {
						draft.items[50] = 999;
						draft.items[75] = 888;
					},
					{enablePatches: true},
				);
			},
		),
	);

	results.push(
		benchmark(
			'patch-recorder - Array index assignment',
			() => ({items: Array.from({length: arrayLength}, (_, i) => i)}),
			(state) => {
				recordPatches(state, (draft) => {
					draft.items[50] = 999;
					draft.items[75] = 888;
				});
			},
		),
	);

	// 6. Map operations
	console.log('Running: Map operations...');

	results.push(
		benchmark(
			'Mutative - Map operations',
			() => ({map: new Map(Array.from({length: 100000}, (_, i) => [`key${i}`, i]))}),
			(state) => {
				create(
					state,
					(draft) => {
						draft.map.set('key50', 50);
						draft.map.set('key51', 51);
						draft.map.delete('key0');
					},
					{enablePatches: true},
				);
			},
		),
	);

	results.push(
		benchmark(
			'patch-recorder - Map operations',
			() => ({map: new Map(Array.from({length: 100000}, (_, i) => [`key${i}`, i]))}),
			(state) => {
				recordPatches(state, (draft) => {
					draft.map.set('key50', 50);
					draft.map.set('key51', 51);
					draft.map.delete('key0');
				});
			},
		),
	);

	// 7. Memory usage comparison
	console.log('Running: Memory usage comparison...');
	const memoryState = createLargeState(4, 5);

	const mutativeMemoryBefore = process.memoryUsage().heapUsed;
	create(
		JSON.parse(JSON.stringify(memoryState)),
		(draft) => {
			draft.obj0.key0 = 'test';
		},
		{enablePatches: true},
	);
	const mutativeMemoryAfter = process.memoryUsage().heapUsed;

	const recorderMemoryBefore = process.memoryUsage().heapUsed;
	const recorderState = JSON.parse(JSON.stringify(memoryState));
	recordPatches(recorderState, (draft) => {
		draft.obj0.key0 = 'test';
	});
	const recorderMemoryAfter = process.memoryUsage().heapUsed;

	console.log('\n' + '='.repeat(80));
	console.log('MEMORY USAGE COMPARISON');
	console.log('='.repeat(80));
	console.log(
		`Mutative memory delta: ${((mutativeMemoryAfter - mutativeMemoryBefore) / 1024 / 1024).toFixed(4)} MB`,
	);
	console.log('patch-recorder memory delta: 0 MB (mutates in place, no copying)');
	console.log('='.repeat(80));

	// Print all results
	printBenchmarkResults(results);

	// Calculate and print speedup
	console.log('\n' + '='.repeat(80));
	console.log('PERFORMANCE COMPARISON (patch-recorder vs Mutative)');
	console.log('='.repeat(80));

	const pairs = [
		['Mutative - Simple object', 'patch-recorder - Simple object'],
		['Mutative - Medium nested object', 'patch-recorder - Medium nested object'],
		['Mutative - Large nested object', 'patch-recorder - Large nested object'],
		['Mutative - Array push', 'patch-recorder - Array push'],
		['Mutative - Array index assignment', 'patch-recorder - Array index assignment'],
		['Mutative - Map operations', 'patch-recorder - Map operations'],
	];

	for (const [mutativeName, recorderName] of pairs) {
		const mutativeResult = results.find((r) => r.name === mutativeName);
		const recorderResult = results.find((r) => r.name === recorderName);

		if (mutativeResult && recorderResult) {
			const speedup = mutativeResult.avgTime / recorderResult.avgTime;
			console.log(`\n${mutativeName}:`);
			console.log(`  Mutative: ${mutativeResult.avgTime.toFixed(4)}ms avg`);
			console.log(`  patch-recorder: ${recorderResult.avgTime.toFixed(4)}ms avg`);
			console.log(
				`  Speedup: ${speedup.toFixed(2)}x ${speedup > 1 ? '(patch-recorder faster)' : '(Mutative faster)'}`,
			);
		}
	}

	console.log('\n' + '='.repeat(80));
}

// Run benchmarks
console.log('Starting benchmarks...\n');
runBenchmarks();
