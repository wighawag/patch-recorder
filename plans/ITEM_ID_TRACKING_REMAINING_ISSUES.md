# Item ID Tracking - Remaining Issues

This document describes remaining issues with `getItemId` tracking that were identified during review.

## Status: ALL ISSUES RESOLVED ✓

All issues in this document have been fixed and tests pass.

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
