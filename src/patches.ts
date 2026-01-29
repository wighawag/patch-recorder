import type {NonPrimitive, Patch, PatchPath, RecorderState} from './types.js';
import {Operation} from './types.js';
import {cloneIfNeeded, findGetItemIdFn} from './utils.js';

/**
 * Generate a replace patch for property changes
 */
export function generateSetPatch(
	state: RecorderState<NonPrimitive>,
	path: PatchPath,
	oldValue: unknown,
	newValue: unknown,
) {
	const patch: any = {
		op: Operation.Replace,
		path,
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
	state: RecorderState<NonPrimitive>,
	path: PatchPath,
	oldValue: unknown,
) {
	const patch: Patch = {
		op: Operation.Remove,
		path: path,
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
export function generateAddPatch(state: RecorderState<any>, path: PatchPath, value: any) {
	const patch: Patch = {
		op: Operation.Add,
		path,
		value: cloneIfNeeded(value),
	};
	state.patches.push(patch);
}

/**
 * Generate a replace patch for full object/array replacement
 */
export function generateReplacePatch(
	state: RecorderState<any>,
	path: PatchPath,
	value: unknown,
	oldValue?: unknown,
) {
	const patch: Patch = {
		op: Operation.Replace,
		path: path,
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
