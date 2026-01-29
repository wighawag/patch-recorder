# TODO - patch-recorder

## Design Decisions

### Error Handling
- **Non-writable properties**: Should throw when attempting to mutate (e.g., `Object.defineProperty(obj, 'prop', {writable: false})`)
- **Frozen objects**: Should throw when attempting to mutate frozen objects (`Object.freeze()`)
- **Frozen arrays**: Should throw when attempting to mutate frozen arrays

### Patch Compression

The optimizer should use **reference equality** (`===`) for comparisons, not deep equality, to avoid performance overhead.

#### Compression Rules

1. **Add + Delete on same path**: Should cancel each other out
   - Example: `state.prop = value; delete state.prop;` → No patches

2. **Replace + Replace back to original**: Should cancel out
   - Implementation: Store `oldValue` in a separate `Map<string, any>` (path → old value)
   - Key is `JSON.stringify(path)` to avoid modifying the Patch type (RFC 6902 compliance)
   - Example: `state.prop = 'new'; state.prop = 'original';` → No patches

3. **Array push + pop**: Should cancel out
   - Example: `state.arr.push(item); state.arr.pop();` → No patches

4. **Array splice add + remove**: Should optimize when it makes sense
   - Example: `state.arr.splice(1, 0, x); state.arr.splice(1, 1);` → Should cancel out

5. **Multiple operations on same path**: Keep only the final operation
   - Example: `state.prop = 1; state.prop = 2; state.prop = 3;` → Single replace patch

#### Implementation Notes

- The `oldValuesMap` is only initialized when `compressPatches` is enabled (default: true)
- This avoids unnecessary memory overhead when compression is disabled
- Reference equality is used for all comparisons to maintain performance

## Current Status

### Implemented ✅
- Non-writable property throws
- Frozen object/array throws
- Basic patch compression (same operations on same path)
- Add + Delete cancellation
- Multiple operations on same path optimization
- Replace + Replace back to original (using oldValuesMap)
- Array push + pop cancellation
- Array splice add + remove optimization (replace for overlap, add for remaining, remove for remaining in reverse order)
- Remove + Add at same index optimization (cancel if same value, otherwise replace)
- Sparse array handling (index within length = replace, out of bounds = add)

### Test Status
- Total tests: 239
- Passing: 239
- Failing: 0

## Completed Features

1. ✅ Fix remaining compression tests by ensuring proper patch cancellation
2. ✅ Implement remove + add optimization for arrays
3. ✅ Fix array splice patch generation for mixed add/remove scenarios
4. ✅ Fix sparse array handling to use replace instead of add for indices within length
5. ✅ Update applyPatches utility to handle array add operations correctly (splice vs direct assignment)

## Next Steps

1. Consider adding more edge case tests for complex scenarios
2. Benchmark performance with and without compression
3. Documentation updates