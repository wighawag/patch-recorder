import type {RecorderState} from './types.js';
import {generateAddPatch, generateDeletePatch, generateReplacePatch} from './patches.js';
import {createProxy} from './proxy.js';

// Module-level Sets for O(1) lookup instead of O(n) array includes
const MUTATING_METHODS = new Set([
	'push',
	'pop',
	'shift',
	'unshift',
	'splice',
	'sort',
	'reverse',
]);

const NON_MUTATING_METHODS = new Set([
	'map',
	'filter',
	'reduce',
	'reduceRight',
	'forEach',
	'find',
	'findIndex',
	'some',
	'every',
	'includes',
	'indexOf',
	'lastIndexOf',
	'slice',
	'concat',
	'join',
	'flat',
	'flatMap',
	'at',
]);

/**
 * Handle array method calls and property access
 */
export function handleArrayGet(
	obj: any[],
	prop: string,
	path: (string | number)[],
	state: RecorderState<any>,
): any {
	// Mutating methods
	if (MUTATING_METHODS.has(prop)) {
		return (...args: any[]) => {
			// Optimized: only copy what's needed for each method
			const oldLength = obj.length;
			let oldValue: any[] | null = null;

			// Only create full copy for sort/reverse which need the entire old array
			if (prop === 'sort' || prop === 'reverse') {
				oldValue = [...obj];
			}

			const result = (Array.prototype as any)[prop].apply(obj, args);

			// Generate patches based on the method
			generateArrayPatches(state, obj, prop, args, result, path, oldValue, oldLength);

			return result;
		};
	}

	// Non-mutating methods - just return them bound to the array
	if (NON_MUTATING_METHODS.has(prop)) {
		return (Array.prototype as any)[prop].bind(obj);
	}

	// Property access
	if (prop === 'length') {
		return obj.length;
	}

	const value = obj[prop as any];

	// For numeric properties (array indices), check if the value is an object/array
	// If so, return a proxy to enable nested mutation tracking
	if (!isNaN(Number(prop)) && typeof value === 'object' && value !== null) {
		const index = Number(prop);
		return createProxy(value, [...path, index], state);
	}

	// For numeric properties (array indices), return the value
	// The main proxy handler's get will handle creating proxies for nested objects
	return value;
}

/**
 * Generate patches for array mutations
 */
function generateArrayPatches(
	state: RecorderState<any>,
	obj: any[],
	method: string,
	args: any[],
	result: any,
	path: (string | number)[],
	oldValue: any[] | null,
	oldLength: number,
) {
	switch (method) {
		case 'push': {
			// Generate add patches for each new element
			// oldLength is the starting index before push
			args.forEach((value, i) => {
				const index = oldLength + i;
				generateAddPatch(state, [...path, index], value);
			});
			// No length patch when array grows (aligned with mutative)
			break;
		}

		case 'pop': {
			if (state.options.arrayLengthAssignment !== false) {
				// Generate length replace patch (mutative uses this instead of remove)
				generateReplacePatch(state, [...path, 'length'], obj.length, oldLength);
			} else {
				// When arrayLengthAssignment is false, generate remove patch for last element
				generateDeletePatch(state, [...path, oldLength - 1], result);
			}
			break;
		}

		case 'shift': {
			// Remove first element (shifted elements are handled automatically by JSON Patch spec)
			// We don't have oldValue here, but the result of shift() is the removed element
			generateDeletePatch(state, [...path, 0], result);
			break;
		}

		case 'unshift': {
			// Add new elements at the beginning (shifted elements are handled automatically by JSON Patch spec)
			args.forEach((value, i) => {
				generateAddPatch(state, [...path, i], value);
			});
			break;
		}

		case 'splice': {
			const [start, deleteCount = 0, ...addItems] = args;
			const actualStart = start < 0 ? Math.max(oldLength + start, 0) : Math.min(start, oldLength);
			const actualDeleteCount = Math.min(deleteCount, oldLength - actualStart);
			const minCount = Math.min(actualDeleteCount, addItems.length);

			// For splice, we need the old values for delete operations
			// Since we don't have oldValue, we need to track what was deleted
			// The result of splice() is the array of deleted elements
			const deletedElements = result as any[];

			// First minCount elements: replace (overlap between add and delete)
			for (let i = 0; i < minCount; i++) {
				generateReplacePatch(state, [...path, actualStart + i], addItems[i], deletedElements[i]);
			}

			// Remaining add items: add
			for (let i = minCount; i < addItems.length; i++) {
				generateAddPatch(state, [...path, actualStart + i], addItems[i]);
			}

			// Remaining delete items: remove (generate in reverse order)
			for (let i = actualDeleteCount - 1; i >= minCount; i--) {
				generateDeletePatch(state, [...path, actualStart + i], deletedElements[i]);
			}

			break;
		}

		case 'sort':
		case 'reverse': {
			// These reorder the entire array - generate full replace
			// oldValue contains the array before the mutation
			generateReplacePatch(state, path, [...obj], oldValue);
			break;
		}
	}
}
