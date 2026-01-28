export declare const Operation: {
	readonly Remove: 'remove';
	readonly Replace: 'replace';
	readonly Add: 'add';
};
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
	op: (typeof Operation)[keyof typeof Operation];
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
