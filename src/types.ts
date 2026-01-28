export const Operation = {
	Remove: 'remove',
	Replace: 'replace',
	Add: 'add',
} as const;

export type PatchOp = (typeof Operation)[keyof typeof Operation];

export type PatchesOptions =
	| boolean
	| {
			/**
			 * The default value is `true`. If it's `true`, the path will be an array, otherwise it is a string.
			 */
			pathAsArray?: boolean;
			/**
			 * The default value is `true`. If it's `true`, the array length will be included in the patches, otherwise no include array length.
			 */
			arrayLengthAssignment?: boolean;
	  };

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

export interface IPatch {
	op: PatchOp;
	value?: any;
	/**
	 * Optional ID of the item being removed or replaced.
	 * Populated when getItemId option is configured for the item's parent path.
	 */
	id?: string | number;
}

export type Patch<P extends PatchesOptions = true> = P extends {
	pathAsArray: false;
}
	? IPatch & {
			path: string;
		}
	: P extends true | object
		? IPatch & {
				path: (string | number)[];
			}
		: IPatch & {
				path: string | (string | number)[];
			};

export type Patches<P extends PatchesOptions = true> = Patch<P>[];

export type NonPrimitive = object | Array<unknown>;

export interface RecordPatchesOptions {
	/**
	 * Return paths as arrays (default: true) or strings
	 */
	pathAsArray?: boolean;
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

export type Draft<T> = T;

export interface RecorderState<T> {
	original: T;
	patches: Patches<any>;
	basePath: (string | number)[];
	options: RecordPatchesOptions & {internalPatchesOptions: PatchesOptions};
}
