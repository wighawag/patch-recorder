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
	
	// Store old value in a separate map for compression optimization
	if (state.oldValuesMap) {
		state.oldValuesMap.set(JSON.stringify(path), oldValue);
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
) {
	const patch = {
		op: Operation.Replace,
		path: formatPath(path, state.options),
		value: cloneIfNeeded(value),
	};

	state.patches.push(patch);
}
