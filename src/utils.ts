import type {GetItemIdConfig, GetItemIdFunction, PatchPath} from './types.js';

/**
 * Type guard to check if a value is a plain object (not null, not array, not Map/Set)
 */
export function isObject(value: unknown): value is Record<string, unknown> {
	return (
		typeof value === 'object' &&
		value !== null &&
		!Array.isArray(value) &&
		!(value instanceof Map) &&
		!(value instanceof Set)
	);
}

/**
 * Type guard to check if a value is an array
 */
export function isArray(value: unknown): value is unknown[] {
	return Array.isArray(value);
}

/**
 * Type guard to check if a value is a Map
 */
export function isMap(value: unknown): value is Map<unknown, unknown> {
	return value instanceof Map;
}

/**
 * Type guard to check if a value is a Set
 */
export function isSet(value: unknown): value is Set<unknown> {
	return value instanceof Set;
}

/**
 * Format a path array to either array format or JSON Pointer string format
 */
export function formatPath(path: PatchPath): string {
	// Convert to JSON Pointer string format (RFC 6901)
	if (path.length === 0) {
		return '';
	}
	return '/' + path.map((part) => String(part).replace(/~/g, '~0').replace(/\//g, '~1')).join('/');
}

/**
 * Check if two values are deeply equal
 */
export function isEqual(a: unknown, b: unknown): boolean {
	if (a === b) return true;
	if (a == null || b == null) return a === b;
	if (typeof a !== typeof b) return false;

	if (typeof a === 'object') {
		if (Array.isArray(a) && Array.isArray(b)) {
			if (a.length !== b.length) return false;
			for (let i = 0; i < a.length; i++) {
				if (!isEqual(a[i], b[i])) return false;
			}
			return true;
		}

		if (a instanceof Map && b instanceof Map) {
			if (a.size !== b.size) return false;
			for (const [key, value] of a) {
				if (!b.has(key) || !isEqual(value, b.get(key))) return false;
			}
			return true;
		}

		if (a instanceof Set && b instanceof Set) {
			if (a.size !== b.size) return false;
			for (const value of a) {
				if (!b.has(value)) return false;
			}
			return true;
		}

		if (Object.keys(a).length !== Object.keys(b).length) return false;
		for (const key in a) {
			if (
				!Object.prototype.hasOwnProperty.call(b, key) ||
				!isEqual((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key])
			) {
				return false;
			}
		}
		return true;
	}

	return false;
}

/**
 * Deep clone a value if it's an object/array, otherwise return as-is
 * This is needed for patch values to avoid reference issues
 */
export function cloneIfNeeded<T>(value: T): T {
	if (value === null || typeof value !== 'object') {
		return value;
	}

	if (Array.isArray(value)) {
		return value.map((item) => cloneIfNeeded(item)) as T;
	}

	if (value instanceof Map) {
		const clonedMap = new Map();
		for (const [key, val] of value) {
			clonedMap.set(cloneIfNeeded(key), cloneIfNeeded(val));
		}
		return clonedMap as T;
	}

	if (value instanceof Set) {
		const clonedSet = new Set();
		for (const item of value) {
			clonedSet.add(cloneIfNeeded(item));
		}
		return clonedSet as T;
	}

	// Plain object
	const cloned = {} as T;
	for (const key in value) {
		if (Object.prototype.hasOwnProperty.call(value, key)) {
			(cloned as Record<string, unknown>)[key] = cloneIfNeeded(
				(value as Record<string, unknown>)[key],
			);
		}
	}
	return cloned;
}

/**
 * Find a getItemId function for a given path.
 * The function is looked up by traversing the getItemId config object
 * using the parent path (all elements except the last one).
 *
 * @example
 * // For path ['items', 3] with config { items: (item) => item.id }
 * // Returns the function (item) => item.id
 */
export function findGetItemIdFn(
	path: PatchPath,
	getItemIdConfig: GetItemIdConfig | undefined,
): GetItemIdFunction | undefined {
	if (!getItemIdConfig || path.length === 0) {
		return undefined;
	}

	// We want to match the parent path (all elements except the last one)
	// For path ['items', 3], we want to find config at 'items'
	// For path ['user', 'settings', 'darkMode'], we want to find config at ['user', 'settings']
	const parentPath = path.slice(0, -1);

	if (parentPath.length === 0) {
		// The path is directly under root (e.g., ['items'])
		// In this case, there's no parent to match against
		return undefined;
	}

	// Navigate the config object using the parent path
	let current: GetItemIdConfig | GetItemIdFunction | undefined = getItemIdConfig;

	for (let i = 0; i < parentPath.length; i++) {
		const key = parentPath[i];

		// Skip numeric indices (array positions) in the path
		if (typeof key === 'number') {
			continue;
		}

		if (current === undefined || typeof current !== 'object') {
			return undefined;
		}

		if (typeof key === 'object' || typeof key === 'symbol') {
			// there is no way to match an object or symbol key in the config
			return undefined;
		}

		current = (current as GetItemIdConfig)[key];
	}

	// current should now be a function or undefined
	if (typeof current === 'function') {
		return current as GetItemIdFunction;
	}

	return undefined;
}

/**
 * Convert a path array or string to a string key for optimized lookup.
 * Uses null character (\x00) as delimiter since it's unlikely in property names.
 * This is significantly faster than JSON.stringify for the common case.
 *
 * @param path - The path array or string to convert
 * @returns A string key representation of the path
 */
export function pathToKey(path: PatchPath): string {
	// If path is already a string, use it directly
	if (typeof path === 'string') {
		return path;
	}
	// Otherwise convert array to string
	if (path.length === 0) {
		return '';
	}
	if (path.length === 1) {
		const elem = path[0];
		if (typeof elem === 'symbol') {
			return elem.toString();
		}
		if (typeof elem === 'object') {
			return JSON.stringify(elem);
		}
		return String(elem);
	}
	return path.map((elem) => {
		if (typeof elem === 'symbol') {
			return elem.toString();
		}
		if (typeof elem === 'object') {
			return JSON.stringify(elem);
		}
		return String(elem);
	}).join('\x00');
}

/**
 * Convert a string key back to a path array.
 * This is the inverse of pathToKey.
 *
 * @param key - The string key to convert
 * @returns The path array
 */
export function keyToPath(key: string): (string | number)[] {
	if (key === '') {
		return [];
	}
	if (key.indexOf('\x00') === -1) {
		// No delimiter, single element
		// Try to parse as number for consistency
		const num = Number(key);
		return isNaN(num) ? [key] : [num];
	}
	return key.split('\x00').map((part) => {
		const num = Number(part);
		return isNaN(num) ? part : num;
	});
}
