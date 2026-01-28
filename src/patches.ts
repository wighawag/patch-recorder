import type {RecorderState} from './types.js';
import {Operation} from './types.js';
import {formatPath, cloneIfNeeded} from './utils.js';

/**
 * Generate a replace patch for property changes
 */
export function generateSetPatch(
	state: RecorderState<any>,
	path: (string | number)[],
	oldValue: any,
	newValue: any,
) {
	const patch = {
		op: Operation.Replace,
		path: formatPath(path, state.options),
		value: cloneIfNeeded(newValue),
	};

	state.patches.push(patch);
	
	// Store the ORIGINAL value (before any mutations) for compression optimization
	// Only store if not already present to preserve the initial value
	if (state.oldValuesMap) {
		const pathKey = JSON.stringify(path);
		if (!state.oldValuesMap.has(pathKey)) {
			state.oldValuesMap.set(pathKey, oldValue);
		}
	}
}

/**
 * Generate a remove patch for property deletions
 */
export function generateDeletePatch(
	state: RecorderState<any>,
	path: (string | number)[],
	oldValue: any,
) {
	const patch = {
		op: Operation.Remove,
		path: formatPath(path, state.options),
	};

	state.patches.push(patch);

	// Store the removed value for optimization (remove+add at same index with different value = replace)
	if (state.oldValuesMap) {
		const pathKey = JSON.stringify(path);
		if (!state.oldValuesMap.has(pathKey)) {
			state.oldValuesMap.set(pathKey, oldValue);
		}
	}
}

/**
 * Generate an add patch for new properties
 */
export function generateAddPatch(state: RecorderState<any>, path: (string | number)[], value: any) {
	const patch = {
		op: Operation.Add,
		path: formatPath(path, state.options),
		value: cloneIfNeeded(value),
	};

	state.patches.push(patch);
}

/**
 * Generate a replace patch for full object/array replacement
 */
export function generateReplacePatch(
	state: RecorderState<any>,
	path: (string | number)[],
	value: any,
	oldValue?: any,
) {
	const patch = {
		op: Operation.Replace,
		path: formatPath(path, state.options),
		value: cloneIfNeeded(value),
	};

	state.patches.push(patch);

	// Store the ORIGINAL value (before any mutations) for compression optimization
	// Only store if not already present to preserve the initial value
	if (state.oldValuesMap && oldValue !== undefined) {
		const pathKey = JSON.stringify(path);
		if (!state.oldValuesMap.has(pathKey)) {
			state.oldValuesMap.set(pathKey, oldValue);
		}
	}
}
