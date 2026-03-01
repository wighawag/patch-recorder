export const Operation = {
	Remove: 'remove',
	Replace: 'replace',
	Add: 'add',
} as const;

export type PatchOp = (typeof Operation)[keyof typeof Operation];

/**
 * Function that extracts an ID from an item value
 */
export type GetItemIdFunction = (value: any) => string | number | undefined | null;

/**
 * Recursive configuration for getItemId - can be a function or nested object
 */
export type GetItemIdConfig = {
	[key: string]: GetItemIdFunction | GetItemIdConfig;
};

export type PatchPath = (string | number | symbol | object)[];

/**
 * Item identity information.
 * Always includes both id and pathIndex together when present.
 * Use `patch.path.slice(0, patch.pathIndex)` to get the path to the item.
 */
interface PatchWithItemId {
	/**
	 * ID of the item being modified.
	 * Populated when getItemId option is configured and a field inside an array item is modified.
	 */
	id: string | number;
	/**
	 * Index indicating where in the path the item that `id` refers to ends.
	 *
	 * @example
	 * // For path ['items', 0, 'data', 'nested', 'value'] with pathIndex 2
	 * // The item path is ['items', 0]
	 */
	pathIndex: number;
}

/**
 * Patch without item identity information.
 */
interface PatchWithoutItemId {
	id?: undefined;
	pathIndex?: undefined;
}

/**
 * Base patch structure shared by all operations
 */
interface BasePatch {
	path: PatchPath;
}

/**
 * Add operation - adding a new value.
 * Includes item identity when adding a field TO an existing array item (the item is being modified).
 * Does NOT include item identity when adding a new item to an array.
 */
export type AddPatch = BasePatch & {
	op: typeof Operation.Add;
	value: any;
} & (PatchWithItemId | PatchWithoutItemId);

/**
 * Remove operation - removing a value.
 * Includes item identity when removing a field FROM an array item (not when removing the item itself).
 */
export type RemovePatch = BasePatch & {
	op: typeof Operation.Remove;
} & (PatchWithItemId | PatchWithoutItemId);

/**
 * Replace operation - replacing a value.
 * Includes oldValue for array length changes.
 * Includes item identity when modifying a field inside an array item.
 */
export type ReplacePatch = BasePatch & {
	op: typeof Operation.Replace;
	value: any;
	/**
	 * Previous value for replace operations on array length.
	 * Enables consumers to detect how many elements were removed without pre-snapshotting state.
	 */
	oldValue?: unknown;
} & (PatchWithItemId | PatchWithoutItemId);

/**
 * Union of all patch types.
 * - AddPatch: Adding new values (no item identity)
 * - RemovePatch: Removing values (has item identity when removing a field from an item)
 * - ReplacePatch: Replacing values (has item identity when modifying a field inside an item)
 */
export type Patch = AddPatch | RemovePatch | ReplacePatch;

export type Patches = Patch[];

export type NonPrimitive = object | Array<unknown>;

/**
 * Configuration options for recordPatches.
 */
export interface RecordPatchesOptions {
	/**
	 * Compress patches by merging redundant operations (default: true)
	 */
	compressPatches?: boolean;
	/**
	 * Include array length in patches (default: true)
	 */
	arrayLengthAssignment?: boolean;
	/**
	 * Configuration for extracting item IDs for replace patches on individual items.
	 * Maps paths to functions that extract IDs from item values.
	 *
	 * Note: Item IDs are only included when an item itself is modified (replaced),
	 * not when items are removed or the array length changes.
	 *
	 * @example
	 * ```typescript
	 * recordPatches(state, mutate, {
	 *   getItemId: {
	 *     items: (item) => item.id,
	 *     users: (user) => user.userId,
	 *     nested: {
	 *       array: (item) => item._id
	 *     }
	 *   }
	 * });
	 * ```
	 */
	getItemId?: GetItemIdConfig;
}

export interface RecorderState<T extends NonPrimitive> {
	state: T;
	patches: Patches;
	basePath: PatchPath;
	options: RecordPatchesOptions;
	/**
	 * Cache for proxies to avoid creating new ones on repeated property access
	 */
	proxyCache: WeakMap<object, any>;
}
