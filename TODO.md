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
   - Example: `draft.prop = value; delete draft.prop;` → No patches

2. **Replace + Replace back to original**: Should cancel out
   - Implementation: Store `oldValue` in a separate `Map<string, any>` (path → old value)
   - Key is `JSON.stringify(path)` to avoid modifying the Patch type (RFC 6902 compliance)
   - Example: `draft.prop = 'new'; draft.prop = 'original';` → No patches

3. **Array push + pop**: Should cancel out
   - Example: `draft.arr.push(item); draft.arr.pop();` → No patches

4. **Array splice add + remove**: Should optimize when it makes sense
   - Example: `draft.arr.splice(1, 0, x); draft.arr.splice(1, 1);` → Should cancel out

5. **Multiple operations on same path**: Keep only the final operation
   - Example: `draft.prop = 1; draft.prop = 2; draft.prop = 3;` → Single replace patch

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

### In Progress 🔄
- Replace + Replace back to original (needs oldValuesMap integration)
- Array push + pop cancellation
- Array splice add + remove optimization

### Test Status
- Total tests: 144
- Passing: 138
- Failing: 6 (all compression-related tests)

## Next Steps

1. Fix remaining compression tests by ensuring proper patch cancellation
2. Consider adding more edge case tests for complex scenarios
3. Benchmark performance with and without compression
4. Documentation updates