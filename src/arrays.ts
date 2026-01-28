import type {RecorderState} from './types.js';
import {Operation} from './types.js';
import {generateAddPatch, generateDeletePatch, generateReplacePatch} from './patches.js';
import {createProxy} from './proxy.js';

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
	const mutatingMethods = ['push', 'pop', 'shift', 'unshift', 'splice', 'sort', 'reverse'];

	if (mutatingMethods.includes(prop)) {
		return (...args: any[]) => {
			const oldValue = [...obj]; // Snapshot before mutation
			const result = (Array.prototype as any)[prop].apply(obj, args);

			// Generate patches based on the method
			generateArrayPatches(state, obj, prop, args, result, path, oldValue);

			return result;
		};
	}

	// Non-mutating methods - just return them bound to the array
	const nonMutatingMethods = [
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
	];

	if (nonMutatingMethods.includes(prop)) {
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
	oldValue: any[],
) {
	switch (method) {
		case 'push': {
			// Generate add patches for each new element
			const startIndex = oldValue.length;
			args.forEach((value, i) => {
				const index = startIndex + i;
				generateAddPatch(state, [...path, index], value);
			});

			// Generate length patch if option is enabled
			if (state.options.arrayLengthAssignment !== false) {
				generateReplacePatch(state, [...path, 'length'], obj.length);
			}
			break;
		}

		case 'pop': {
			// Generate remove patch for the removed element
			const removedIndex = oldValue.length - 1;
			generateDeletePatch(state, [...path, removedIndex], result);

			// Generate length patch if option is enabled
			if (state.options.arrayLengthAssignment !== false) {
				generateReplacePatch(state, [...path, 'length'], obj.length);
			}
			break;
		}

		case 'shift': {
			// Generate remove patch for the removed element
			generateDeletePatch(state, [...path, 0], result);

			// Shift is complex - we need to update all remaining elements
			// Update all shifted elements (after the shift, each element moves to index - 1)
			for (let i = 0; i < obj.length; i++) {
				generateReplacePatch(state, [...path, i], oldValue[i + 1]);
			}

			// Generate length patch if option is enabled
			if (state.options.arrayLengthAssignment !== false) {
				generateReplacePatch(state, [...path, 'length'], obj.length);
			}
			break;
		}

		case 'unshift': {
			// Add new elements at the beginning
			args.forEach((value, i) => {
				generateAddPatch(state, [...path, i], value);
			});

			// Update all existing elements

			for (let i = 0; i < oldValue.length; i++) {
				generateReplacePatch(state, [...path, i + args.length], oldValue[i]);
			}

			// Generate length patch if option is enabled
			if (state.options.arrayLengthAssignment !== false) {
				generateReplacePatch(state, [...path, 'length'], obj.length);
			}

			break;
		}

		case 'splice': {
			const [start, deleteCount, ...addItems] = args;

			// Generate remove patches for deleted items
			for (let i = 0; i < deleteCount; i++) {
				generateDeletePatch(state, [...path, start], oldValue[start]);
			}

			// Generate add patches for new items
			addItems.forEach((item, i) => {
				generateAddPatch(state, [...path, start + i], item);
			});

			// If there are both deletions and additions, update the shifted elements

			const itemsToShift = oldValue.length - start - deleteCount;
			for (let i = 0; i < itemsToShift; i++) {
				generateReplacePatch(
					state,
					[...path, start + addItems.length + i],
					oldValue[start + deleteCount + i],
				);
			}

			// Generate length patch if option is enabled
			if (state.options.arrayLengthAssignment !== false) {
				generateReplacePatch(state, [...path, 'length'], obj.length);
			}

			break;
		}

		case 'sort':
		case 'reverse': {
			// These reorder the entire array - generate full replace
			generateReplacePatch(state, path, [...obj]);
			break;
		}
	}
}
