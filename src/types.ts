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
	 * Optional ID of the item being removed or replaced.
	 * Populated when getItemId option is configured for the item's parent path.
	 */
	id?: string | number;
};

export type Patches = Patch[];

export type NonPrimitive = object | Array<unknown>;

export interface RecordPatchesOptions {
	/**
	 * Include array length in patches (default: true)
	 */
	arrayLengthAssignment?: boolean;
	/**
	 * Compress patches by merging redundant operations (default: true)
	 */
	compressPatches?: boolean;
	/**
	 * Configuration for extracting item IDs for remove/replace patches.
	 * Maps paths to functions that extract IDs from item values.
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
