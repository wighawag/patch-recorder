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

export type Patch = {
	path: PatchPath;
	op: PatchOp;
	value?: any;
	/**
	 * Optional previous value for replace operations on array length.
	 * Enables consumers to detect how many elements were removed without pre-snapshotting state.
	 */
	oldValue?: unknown;
	/**
	 * Optional ID of the item being removed or replaced.
	 * Populated when getItemId option is configured for the item's parent path.
	 */
	id?: string | number;
};

export type Patches = Patch[];

export type NonPrimitive = object | Array<unknown>;

/**
 * Base options shared by all configurations
 */
interface BaseRecordPatchesOptions {
	/**
	 * Compress patches by merging redundant operations (default: true)
	 */
	compressPatches?: boolean;
}

/**
 * Options when using getItemId - requires arrayLengthAssignment to be false
 * because length patches cannot include individual item IDs.
 */
interface RecordPatchesOptionsWithItemId extends BaseRecordPatchesOptions {
	/**
	 * Must be false when using getItemId.
	 * Length patches cannot include individual item IDs.
	 */
	arrayLengthAssignment: false;
	/**
	 * Configuration for extracting item IDs for remove/replace patches.
	 * Maps paths to functions that extract IDs from item values.
	 *
	 * @example
	 * ```typescript
	 * recordPatches(state, mutate, {
	 *   arrayLengthAssignment: false,
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
	getItemId: GetItemIdConfig;
}

/**
 * Options when not using getItemId - arrayLengthAssignment can be any value
 */
interface RecordPatchesOptionsWithoutItemId extends BaseRecordPatchesOptions {
	/**
	 * Include array length in patches (default: true)
	 */
	arrayLengthAssignment?: boolean;
	/**
	 * Not available unless arrayLengthAssignment is false
	 */
	getItemId?: undefined;
}

/**
 * Configuration options for recordPatches.
 *
 * Note: getItemId requires arrayLengthAssignment: false because length patches
 * (e.g., { op: 'replace', path: ['arr', 'length'], value: 2, oldValue: 3 })
 * cannot include the IDs of individual items that were removed.
 */
export type RecordPatchesOptions =
	| RecordPatchesOptionsWithItemId
	| RecordPatchesOptionsWithoutItemId;

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
