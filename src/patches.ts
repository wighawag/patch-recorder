import type {NonPrimitive, PatchPath, RecorderState, ReplacePatch, RemovePatch, AddPatch} from './types.js';
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
 * @param isMapOrSet - Deprecated/unused - Maps nested in tracked items now include parent item ID.
 */
export function generateSetPatch(
	state: RecorderState<NonPrimitive>,
	path: PatchPath,
	newValue: unknown,
	parentItem?: unknown,
	itemPathIndex?: number,
	isMapOrSet?: 'map' | 'set',
) {
	// Try to extract item id if parent item is provided
	// Note: The isMapOrSet flag is no longer checked here because:
	// - When a Map is nested inside a tracked array item, we want the parent item's id
	// - The parentItem passed in is the array item, not the Map entry
	let id: string | number | undefined;
	if (parentItem !== undefined) {
		const getItemIdFn = findGetItemIdFn(path, state.options.getItemId);
		if (getItemIdFn) {
			const extractedId = getItemIdFn(parentItem);
			if (extractedId !== undefined && extractedId !== null) {
				id = extractedId;
			}
		}
	}

	// Construct patch with proper type based on whether id is present
	const patch: ReplacePatch =
		id !== undefined && itemPathIndex !== undefined
			? {
					op: Operation.Replace,
					path,
					value: cloneIfNeeded(newValue),
					id,
					pathIndex: itemPathIndex,
				}
			: {
					op: Operation.Replace,
					path,
					value: cloneIfNeeded(newValue),
				};

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
	// Try to extract item id if parent item is provided
	let id: string | number | undefined;
	if (parentItem !== undefined) {
		const getItemIdFn = findGetItemIdFn(path, state.options.getItemId);
		if (getItemIdFn) {
			const extractedId = getItemIdFn(parentItem);
			if (extractedId !== undefined && extractedId !== null) {
				id = extractedId;
			}
		}
	}

	// Construct patch with proper type based on whether id is present
	const patch: RemovePatch =
		id !== undefined && itemPathIndex !== undefined
			? {
					op: Operation.Remove,
					path,
					id,
					pathIndex: itemPathIndex,
				}
			: {
					op: Operation.Remove,
					path,
				};

	state.patches.push(patch);
}

/**
 * Generate an add patch for new properties.
 * 
 * For adding a FIELD to an existing item (e.g., state.items[0].newField = 'value'):
 *   - The id of the parent item is included - the item is being modified.
 * 
 * For adding a NEW ITEM to an array (e.g., state.items.push(newItem)):
 *   - No id is included - we're not modifying an existing item.
 * 
 * @param parentItem - Optional parent item when adding a field to an array item.
 *                     Used to extract the item's ID for the patch.
 * @param itemPathIndex - Optional index indicating where the item path ends in the full path.
 */
export function generateAddPatch(
	state: RecorderState<any>,
	path: PatchPath,
	value: any,
	parentItem?: unknown,
	itemPathIndex?: number,
) {
	// Try to extract item id if parent item is provided
	let id: string | number | undefined;
	if (parentItem !== undefined) {
		const getItemIdFn = findGetItemIdFn(path, state.options.getItemId);
		if (getItemIdFn) {
			const extractedId = getItemIdFn(parentItem);
			if (extractedId !== undefined && extractedId !== null) {
				id = extractedId;
			}
		}
	}

	// Construct patch with proper type based on whether id is present
	const patch: AddPatch =
		id !== undefined && itemPathIndex !== undefined
			? {
					op: Operation.Add,
					path,
					value: cloneIfNeeded(value),
					id,
					pathIndex: itemPathIndex,
				}
			: {
					op: Operation.Add,
					path,
					value: cloneIfNeeded(value),
				};

	state.patches.push(patch);
}

/**
 * Generate a replace patch for full item replacement or array length changes.
 * Used for array length changes that need oldValue.
 * 
 * Note: This function is used for array length changes only.
 * For item replacements without id, use generateSetPatch instead.
 */
export function generateReplacePatch(
	state: RecorderState<any>,
	path: PatchPath,
	value: unknown,
	oldValue?: unknown,
) {
	// This function is now only used for array length changes
	const patch: ReplacePatch =
		path.length > 0 && path[path.length - 1] === 'length' && oldValue !== undefined
			? {
					op: Operation.Replace,
					path,
					value: cloneIfNeeded(value),
					oldValue,
				}
			: {
					op: Operation.Replace,
					path,
					value: cloneIfNeeded(value),
				};

	state.patches.push(patch);
}
