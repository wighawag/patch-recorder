import {createProxy} from './proxy.js';
import {compressPatches} from './optimizer.js';
import type {NonPrimitive, Draft, RecordPatchesOptions, Patches} from './types.js';

/**
 * Record JSON patches from mutations applied to an object, array, Map, or Set.
 * Unlike mutative or immer, this mutates the original object in place while recording changes.
 *
 * @param state - The state to record patches from
 * @param mutate - A function that receives a draft of the state and applies mutations
 * @param options - Configuration options
 * @returns Array of JSON patches (RFC 6902 compliant)
 *
 * @example
 * const state = { user: { name: 'John' } };
 * const patches = recordPatches(state, (draft) => {
 *   draft.user.name = 'Jane';
 * });
 * console.log(state.user.name); // 'Jane' (mutated in place!)
 * console.log(patches); // [{ op: 'replace', path: ['user', 'name'], value: 'Jane' }]
 */
export function recordPatches<
	T extends NonPrimitive,
	PatchesOption extends RecordPatchesOptions = {},
>(state: T, mutate: (state: Draft<T>) => void, options?: PatchesOption): Patches {
	const recorderState = {
		state,
		patches: [],
		basePath: [],
		options: {
			...options,
		},
	};

	// Create proxy
	const proxy = createProxy(state, [], recorderState) as Draft<T>;

	// Apply mutations
	mutate(proxy);

	// Return patches (optionally compressed)
	if (options?.compressPatches !== false) {
		return compressPatches(recorderState.patches);
	}

	return recorderState.patches as Patches;
}

// Re-export types
export type {
	NonPrimitive,
	Draft,
	RecordPatchesOptions,
	Patches,
	Patch,
	Operation,
} from './types.js';
