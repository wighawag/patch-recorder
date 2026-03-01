import type {NonPrimitive, Patch, PatchPath, RecorderState} from './types.js';
import {Operation} from './types.js';
import {cloneIfNeeded, findGetItemIdFn} from './utils.js';

/**
 * Generate a replace patch for property changes.
 * Used for field modifications inside items (e.g., state.items[0].name = 'new')
 * 
 * @param parentItem - Optional parent item when modifying a field inside an array item.
 *                     Used to extract the item's ID for the patch.
 * @param itemPathIndex - Optional index indicating where the item path ends in the full path.
 *                        Used for pathIndex in the patch.
 * @param isMapOrSet - True if the parent is a Map or Set (skips getItemId for Maps)
 */
export function generateSetPatch(
	state: RecorderState<NonPrimitive>,
	path: PatchPath,
	newValue: unknown,
	parentItem?: unknown,
	itemPathIndex?: number,
	isMapOrSet?: 'map' | 'set',
) {
	const patch: any = {
		op: Operation.Replace,
		path,
		value: cloneIfNeeded(newValue),
	};

	// Add id for field modifications inside array items (not for Maps)
	// parentItem is provided when modifying a field inside an item
	if (parentItem !== undefined && isMapOrSet !== 'map') {
		const getItemIdFn = findGetItemIdFn(path, state.options.getItemId);
		if (getItemIdFn) {
			const id = getItemIdFn(parentItem);
			if (id !== undefined && id !== null) {
				patch.id = id;
				// Add pathIndex when id is present
				if (itemPathIndex !== undefined) {
					patch.pathIndex = itemPathIndex;
				}
			}
		}
	}

	state.patches.push(patch);
}

/**
 * Generate a remove patch for property deletions.
 * 
 * For ITEM removal (e.g., state.items.splice(1, 1)):
 *   - No id is included - the item is being removed, not modified.
 * 
 * For FIELD removal from an item (e.g., delete state.items[0].optional):
 *   - The id of the parent item is included - the item is being modified.
 * 
 * @param parentItem - Optional parent item when deleting a field from inside an array item.
 *                     Used to extract the item's ID for the patch.
 * @param itemPathIndex - Optional index indicating where the item path ends in the full path.
 */
export function generateDeletePatch(
	state: RecorderState<NonPrimitive>,
	path: PatchPath,
	_oldValue: unknown,
	parentItem?: unknown,
	itemPathIndex?: number,
) {
	const patch: any = {
		op: Operation.Remove,
		path: path,
	};

	// Add id for field deletions inside array items
	// parentItem is provided when deleting a field from inside an item
	if (parentItem !== undefined) {
		const getItemIdFn = findGetItemIdFn(path, state.options.getItemId);
		if (getItemIdFn) {
			const id = getItemIdFn(parentItem);
			if (id !== undefined && id !== null) {
				patch.id = id;
				// Add pathIndex when id is present
				if (itemPathIndex !== undefined) {
					patch.pathIndex = itemPathIndex;
				}
			}
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
 * Generate a replace patch for full item replacement in arrays.
 * Used when replacing an entire item (e.g., state.items[0] = newItem)
 * 
 * @param isMapOrSet - True if the parent is a Map or Set (skips getItemId for Maps)
 */
export function generateReplacePatch(
	state: RecorderState<any>,
	path: PatchPath,
	value: unknown,
	oldValue?: unknown,
	isMapOrSet?: 'map' | 'set',
) {
	const patch: Patch = {
		op: Operation.Replace,
		path: path,
		value: cloneIfNeeded(value),
	};

	// Include oldValue for array length changes to enable consumers to detect element removal
	if (path.length > 0 && path[path.length - 1] === 'length' && oldValue !== undefined) {
		patch.oldValue = oldValue;
	}

	// Add id of the NEW item for replace operations (arrays only, not Maps)
	// Maps already have their keys, so they don't need getItemId
	if (isMapOrSet !== 'map') {
		const getItemIdFn = findGetItemIdFn(path, state.options.getItemId);
		if (getItemIdFn && value !== undefined) {
			const id = getItemIdFn(value);
			if (id !== undefined && id !== null) {
				patch.id = id;
				// For item replacement, pathIndex is the path length (the item IS the path)
				patch.pathIndex = path.length;
			}
		}
	}

	state.patches.push(patch);
}
