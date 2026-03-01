# Item ID Tracking - Remaining Issues

This document describes remaining issues with `getItemId` tracking that were identified during review.

## Status: One Issue Remaining

Previous issues have been fixed. One new issue was discovered during review.

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

## Related Files

- `src/optimizer.ts` - Patch compression/merging
- `src/maps.ts` - Map method handling
- `src/sets.ts` - Set method handling
- `src/proxy.ts` - `findArrayItemContext` function (already exported)
- `src/patches.ts` - Patch generation functions (already support item context)
- `test/getItemId.test.ts` - Tests for getItemId functionality

---

## Outstanding Issue: Nested Arrays Inside Tracked Items (BUG)

### Issue 5: Nested Array of Objects Inside Tracked Item Missing Tracked Item's ID

**Location:** `src/proxy.ts:21-44` and `src/utils.ts:146-200`

**Problem:** When modifying a field in a nested array (array of objects inside a tracked item), the tracked item's id is not included in the patch.

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

// Current: { op: 'replace', path: ['users', 0, 'posts', 0, 'title'], value: 'Updated' }
// Expected: { op: 'replace', path: ['users', 0, 'posts', 0, 'title'], value: 'Updated', id: 'user-1', pathIndex: 2 }
```

**Root cause:**
1. `findArrayItemContext` returns the DEEPEST array item (posts[0]) by scanning from the end of the path
2. `findGetItemIdFn` returns the `users` function which expects a user object
3. Since `posts[0]` doesn't have the user's `id` field, the id extraction fails

**Key difference from working cases:**
- This issue is about **arrays of objects** inside tracked items (e.g., `users[0].posts[0].title`)
- The working "nested array" tests are about **simple arrays** inside tracked items (e.g., `users[0].tags.push('new')`)
- Simple arrays work because there's only ONE numeric index in the path, so `findArrayItemContext` returns the correct item

**Fix approach:**
The `findArrayItemContext` function needs to find the array item that matches the `getItemId` config, not just the deepest numeric index. Options:
1. Pass `getItemId` config to `findArrayItemContext` and stop at the first numeric index that has a matching config
2. Create a new function that coordinates both `findArrayItemContext` and `findGetItemIdFn`
3. Change the iteration direction in `findArrayItemContext` to start from the root instead of the end

**Tests added:** `test/getItemId.test.ts` - `describe.todo('BUG: nested arrays inside tracked items')` block with 4 failing tests
