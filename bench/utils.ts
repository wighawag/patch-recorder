/**
 * Utility to create a large nested object for benchmarking
 */
export function createLargeState(depth: number, breadth: number): Record<string, any> {
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
 * Create a simple state for testing
 */
export function createSimpleState() {
	return {a: 1, b: 2, c: 3};
}

/**
 * Create a medium nested state for testing
 */
export function createMediumState() {
	return {
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
}

/**
 * Create an array state for testing
 */
export function createArrayState(length: number) {
	return {items: Array.from({length}, (_, i) => i)};
}

/**
 * Create a Map state for testing
 */
export function createMapState(size: number) {
	return {map: new Map(Array.from({length: size}, (_, i) => [`key${i}`, i]))};
}
