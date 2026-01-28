import type {RecorderState} from './types.js';
import {Operation} from './types.js';
import {formatPath, cloneIfNeeded, findGetItemIdFn} from './utils.js';

/**
 * Generate a replace patch for property changes
 */
export function generateSetPatch(
	state: RecorderState<any>,
	path: (string | number)[],
	oldValue: any,
	newValue: any,
) {
	const patch: any = {
		op: Operation.Replace,
		path: formatPath(path, state.options),
		value: cloneIfNeeded(newValue),
	};

	// Add id if getItemId is configured for this path
	const getItemIdFn = findGetItemIdFn(path, state.options.getItemId);
	if (getItemIdFn && oldValue !== undefined) {
		const id = getItemIdFn(oldValue);
		if (id !== undefined && id !== null) {
			patch.id = id;
		}
	}

	state.patches.push(patch);
}

/**
 * Generate a remove patch for property deletions
 */
export function generateDeletePatch(
	state: RecorderState<any>,
	path: (string | number)[],
	oldValue: any,
) {
	const patch: any = {
		op: Operation.Remove,
		path: formatPath(path, state.options),
	};

	// Add id if getItemId is configured for this path
	const getItemIdFn = findGetItemIdFn(path, state.options.getItemId);
	if (getItemIdFn && oldValue !== undefined) {
		const id = getItemIdFn(oldValue);
		if (id !== undefined && id !== null) {
			patch.id = id;
		}
	}

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
	oldValue?: any,
) {
	const patch: any = {
		op: Operation.Replace,
		path: formatPath(path, state.options),
		value: cloneIfNeeded(value),
	};

	// Add id if getItemId is configured for this path
	const getItemIdFn = findGetItemIdFn(path, state.options.getItemId);
	if (getItemIdFn && oldValue !== undefined) {
		const id = getItemIdFn(oldValue);
		if (id !== undefined && id !== null) {
			patch.id = id;
		}
	}

	state.patches.push(patch);
}
