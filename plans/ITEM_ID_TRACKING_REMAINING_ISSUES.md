# Item ID Tracking - Remaining Issues

This document describes remaining issues with `getItemId` tracking that were identified during review.

## Status: All Issues Fixed ✓

All identified issues have been resolved.

## Completed Fixes (Previous Session)

### Fix 1: AddPatch Missing `id` for Field Additions
When adding a new field to an existing array item, the `AddPatch` now includes `id` and `pathIndex`.

**Files changed:**
- `src/types.ts` - Updated `AddPatch` type to support optional `id`/`pathIndex`
- `src/patches.ts` - Extended `generateAddPatch` to accept and use item context
- `src/proxy.ts` - Updated proxy's `set` handler to pass `itemContext` to `generateAddPatch`

### Fix 2: Nested Array Operations Missing Parent Item ID
Array methods (push, pop, splice, etc.) on nested arrays inside tracked items now include the parent item's `id`.

**Files changed:**
- `src/proxy.ts` - Exported `findArrayItemContext`, fixed array element replacement
- `src/arrays.ts` - Updated `generateArrayPatches` to use `findArrayItemContext`

---

## Completed Fixes (This Session)

### Fix 3: Optimizer Preserves `id`/`pathIndex` When Merging Patches ✓

**Problem:** When the optimizer merged a `remove + add` sequence into a single `replace` patch, the `id` and `pathIndex` fields were lost.

**Solution:** Updated [`mergePatches()`](src/optimizer.ts:326) function to preserve `id` and `pathIndex` from either patch when creating the merged `replace` patch.

**Files changed:**
- `src/optimizer.ts` - Updated `mergePatches()` to preserve `id`/`pathIndex` in `remove + add → replace` merges

**Tests added:** `test/getItemId.test.ts` - "optimizer id/pathIndex preservation" describe block

---

### Fix 4: Map/Set Operations Inside Tracked Items Include Parent Item ID ✓

**Problem:** Map and Set operations (`map.set()`, `map.delete()`, `set.add()`, `set.delete()`) didn't include the parent array item's id when the Map/Set was nested inside a tracked array item.

**Solution:** 
- Updated `src/maps.ts` and `src/sets.ts` to import `findArrayItemContext` from `proxy.ts`
- All mutating methods (`set`, `delete`, `clear` for Maps; `add`, `delete`, `clear` for Sets) now call `findArrayItemContext` and pass the item context to patch generators
- Updated `src/patches.ts` to remove the `isMapOrSet !== 'map'` check that was blocking id extraction for Map operations

**Files changed:**
- `src/maps.ts` - Import `findArrayItemContext`, use it in `set()`, `delete()`, `clear()` methods
- `src/sets.ts` - Import `findArrayItemContext`, use it in `add()`, `delete()`, `clear()` methods
- `src/patches.ts` - Removed `isMapOrSet` check that blocked id extraction for nested Map operations

**Tests added:** `test/getItemId.test.ts` - "Map operations inside tracked items" and "Set operations inside tracked items" describe blocks

---

## Summary

All `getItemId` tracking issues have been resolved. The implementation now correctly:

1. **Optimizer patch merging**: Preserves `id` and `pathIndex` when merging `remove + add` into `replace`
2. **Map operations in tracked items**: Includes parent item id for `set()`, `delete()`, `clear()`
3. **Set operations in tracked items**: Includes parent item id for `add()`, `delete()`, `clear()`
4. **Nested arrays inside tracked items**: Correctly identifies the tracked parent item (not the deepest array item) when modifying fields in nested arrays of objects

## Related Files

- `src/optimizer.ts` - Patch compression/merging
- `src/maps.ts` - Map method handling
- `src/sets.ts` - Set method handling
- `src/proxy.ts` - `findArrayItemContext` function (already exported)
- `src/patches.ts` - Patch generation functions (already support item context)
- `test/getItemId.test.ts` - Tests for getItemId functionality

---

### Fix 5: Nested Arrays Inside Tracked Items ✓

**Problem:** When modifying a field in a nested array (array of objects inside a tracked item), the tracked item's id was not included in the patch.

**Example:**
```typescript
const state = {
    users: [
        {
            id: 'user-1',
            posts: [
                { postId: 'post-1', title: 'Hello' }
            ]
        }
    ]
};

const patches = recordPatches(state, (state) => {
    state.users[0].posts[0].title = 'Updated';
}, {
    getItemId: { users: (user) => user.id }  // Only tracking users
});

// Now correctly returns:
// { op: 'replace', path: ['users', 0, 'posts', 0, 'title'], value: 'Updated', id: 'user-1', pathIndex: 2 }
```

**Root cause:**
1. `findArrayItemContext` was scanning from the END of the path and returning the DEEPEST array item
2. For path `['users', 0, 'posts', 0, 'title']`, it returned `posts[0]` instead of `users[0]`
3. The `getItemId` function expected a user object but received a post object

**Solution:** 
Modified [`findArrayItemContext()`](src/proxy.ts:21) to:
1. Read the `getItemId` config from `state.options.getItemId`
2. Traverse the path and config in PARALLEL from the start (not the end)
3. Skip numeric indices when traversing the config (they don't exist in config structure)
4. When a function is found in the config, the NEXT numeric index identifies the tracked item
5. Return that tracked item, not the deepest array item

**Performance improvement:** The new approach is more efficient:
- Early termination: Stops as soon as it finds the first tracked array in the config
- No unnecessary scanning: Uses the config structure directly instead of scanning backward through the entire path
- Falls back to old behavior only when no `getItemId` config is provided

**Files changed:**
- `src/proxy.ts` - Rewrote `findArrayItemContext()` to coordinate with `getItemId` config

**Tests added to** `test/getItemId.test.ts`:
- "nested arrays inside tracked items (array of objects inside tracked item)" describe block:
  - 4 original tests (field modification, push, pop, deeply nested)
  - 3 additional edge case tests:
    - Map inside nested array of objects (`users[0].posts[0].metadata.set(...)`)
    - Set inside nested array of objects (`users[0].posts[0].tags.add(...)`)
    - Sort on nested array of objects (`users[0].posts.sort(...)`)
