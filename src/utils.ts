import type {PatchesOptions} from './types.js';

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
export function formatPath(
	path: (string | number)[],
	options: {internalPatchesOptions: PatchesOptions},
): string | (string | number)[] {
	if (
		options.internalPatchesOptions &&
		typeof options.internalPatchesOptions === 'object' &&
		options.internalPatchesOptions.pathAsArray === false
	) {
		// Convert to JSON Pointer string format (RFC 6901)
		if (path.length === 0) {
			return '';
		}
		return '/' + path
			.map((part) => String(part).replace(/~/g, '~0').replace(/\//g, '~1'))
			.join('/');
	}

	return path;
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
