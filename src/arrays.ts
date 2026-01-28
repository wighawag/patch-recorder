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
				// No length patch when array grows (aligned with mutative)
				break;
			}
	
			case 'pop': {
					if (state.options.arrayLengthAssignment !== false) {
						// Generate length replace patch (mutative uses this instead of remove)
						generateReplacePatch(state, [...path, 'length'], obj.length);
					} else {
						// When arrayLengthAssignment is false, generate remove patch for last element
						generateDeletePatch(state, [...path, oldValue.length - 1], result);
					}
					break;
				}

		case 'shift': {
				// Shift is complex - we need to update all remaining elements
				// Update all shifted elements (after the shift, each element moves to index - 1)
				for (let i = 0; i < obj.length; i++) {
					generateReplacePatch(state, [...path, i], oldValue[i + 1]);
				}
				// Add length patch when array shrinks (aligned with mutative)
				if (state.options.arrayLengthAssignment !== false) {
					generateReplacePatch(state, [...path, 'length'], obj.length);
				} else {
					// When arrayLengthAssignment is false, generate remove patch for last element
					generateDeletePatch(state, [...path, oldValue.length - 1], oldValue[oldValue.length - 1]);
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
				// No length patch when array grows (aligned with mutative)
				break;
			}

		case 'splice': {
				const [start, deleteCount, ...addItems] = args;
				const netChange = addItems.length - deleteCount;
	
				if (deleteCount === addItems.length) {
					// Same number of additions as deletions: use replace patches (aligned with mutative)
					for (let i = 0; i < addItems.length; i++) {
						generateReplacePatch(state, [...path, start + i], addItems[i]);
					}
				} else if (addItems.length > deleteCount) {
					// Array grows: add new items + replace shifted elements (no length patch)
					addItems.forEach((item, i) => {
						generateAddPatch(state, [...path, start + i], item);
					});
					// Update shifted elements
					const itemsToShift = oldValue.length - start - deleteCount;
					for (let i = 0; i < itemsToShift; i++) {
						generateReplacePatch(
							state,
							[...path, start + addItems.length + i],
							oldValue[start + deleteCount + i],
						);
					}
				} else {
					// Array shrinks: replace shifted elements + length patch
					const itemsToShift = oldValue.length - start - deleteCount;
					for (let i = 0; i < itemsToShift; i++) {
						generateReplacePatch(
							state,
							[...path, start + i],
							oldValue[start + deleteCount + i],
						);
					}
					// Add length patch when array shrinks (aligned with mutative)
					if (state.options.arrayLengthAssignment !== false) {
						generateReplacePatch(state, [...path, 'length'], obj.length);
					} else {
						// When arrayLengthAssignment is false, generate remove patches for deleted elements
						for (let i = 0; i < -netChange; i++) {
							generateDeletePatch(
								state,
								[...path, oldValue.length - 1 - i],
								oldValue[oldValue.length - 1 - i],
							);
						}
					}
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
