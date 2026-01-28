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

export interface IPatch {
	op: PatchOp;
	value?: any;
}

export type Patch<P extends PatchesOptions = any> = P extends {
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

export type Patches<P extends PatchesOptions = any> = Patch<P>[];

export type NonPrimitive = object | Array<unknown>;

export interface RecordPatchesOptions {
	/**
	 * Enable patch generation (default: true)
	 */
	enablePatches?: boolean;
	/**
	 * Return paths as arrays (default: true) or strings
	 */
	pathAsArray?: boolean;
	/**
	 * Include array length in patches (default: true)
	 */
	arrayLengthAssignment?: boolean;
	/**
	 * Optimize patches by merging redundant operations (default: false)
	 */
	optimize?: boolean;
}

export type Draft<T> = T;

export interface RecorderState<T> {
	original: T;
	patches: Patches<any>;
	basePath: (string | number)[];
	options: RecordPatchesOptions & {internalPatchesOptions: PatchesOptions};
}
