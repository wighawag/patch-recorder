import {createProxy} from './proxy.js';
import {compressPatches} from './optimizer.js';
import type {
	NonPrimitive,
	Draft,
	RecordPatchesOptions,
	Patches,
	Patch,
	Operation,
	MutativePatchesOptions,
} from './types.js';

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
>(state: T, mutate: (state: Draft<T>) => void, options?: PatchesOption): Patches<PatchesOption> {
	const recorderState = {
		original: state,
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

	return recorderState.patches as Patches<PatchesOption>;
}

/**
 * Mutative-compatible API for easy switching between mutative and patch-recorder.
 * Returns [state, patches] tuple like mutative does.
 *
 * Unlike mutative, this mutates the original object in place (state === originalState).
 * The returned state is the same reference as the input state for API compatibility.
 *
 * @param state - The state to mutate and record patches from
 * @param mutate - A function that receives a draft of the state and applies mutations
 * @param options - Configuration options (enablePatches is forced but ignored - patches are always returned)
 * @returns Tuple [state, patches] where state is the mutated state (same reference as input)
 *
 * @example
 * const state = { user: { name: 'John' } };
 * const [nextState, patches] = create(state, (draft) => {
 *   draft.user.name = 'Jane';
 * }, {enabledPatches: true});
 * console.log(nextState === state); // true (mutated in place!)
 * console.log(patches); // [{ op: 'replace', path: ['user', 'name'], value: 'Jane' }]
 */
export function create<T extends NonPrimitive>(
	state: T,
	mutate: (state: Draft<T>) => void,
	options: MutativePatchesOptions & object & {enablePatches: true} = {enablePatches: true},
): [
	T,
	Patches<{
		pathAsArray: boolean;
		arrayLengthAssignment: boolean;
	}>,
] {
	// Extract enablePatches but ignore it (patches are always returned)

	const {enablePatches, ...mutativeOptions} = options;
	const patches = recordPatches(state, mutate, {
		...mutativeOptions,
	});
	return [state, patches];
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
