import type {Patch, RecorderState, RecordPatchesOptions} from './types.js';
import {Operation} from './types.js';
import {formatPath, cloneIfNeeded, findGetItemIdFn} from './utils.js';

/**
 * Generate a replace patch for property changes
 */
export function generateSetPatch<PatchesOption extends RecordPatchesOptions>(
	state: RecorderState<any, PatchesOption>,
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
export function generateDeletePatch<PatchesOption extends RecordPatchesOptions>(
	state: RecorderState<any, PatchesOption>,
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
export function generateAddPatch<PatchesOption extends RecordPatchesOptions>(
	state: RecorderState<any, PatchesOption>,
	path: (string | number)[],
	value: any,
) {
	const patch: Patch<PatchesOption> = {
		op: Operation.Add,
		path: formatPath(path, state.options),
		value: cloneIfNeeded(value),
	} as Patch<PatchesOption>; // TODO why cast needed?

	state.patches.push(patch);
}

/**
 * Generate a replace patch for full object/array replacement
 */
export function generateReplacePatch<PatchesOption extends RecordPatchesOptions>(
	state: RecorderState<any, PatchesOption>,
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
