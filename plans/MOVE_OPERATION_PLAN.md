# Move Operation Implementation Plan

## Overview
Add a "move" operation option for patches that applies to arrays only, useful for tracking item repositioning without requiring remove/add operations. This is especially useful for drag-and-drop reordering scenarios where the patch reader only cares that items changed, not their specific indices.

## Requirements
- Follow RFC 6902 JSON Patch standard format: `{ "op": "move", "from": "/items/0", "path": "/items/3" }`
- Generate move patches when `enableMoveOp` option is true
- Support array reorder operations: **sort and reverse only** (initial implementation)
- Include optional `id` field when `getItemId` is configured
- Maintain backward compatibility (default behavior unchanged)

## Future Enhancements
- **splice()**: Could use referential equality to detect when removed items are the same reference as added items
- **unshift()**: Could generate move patches for existing items that shift right (currently not needed as only new items are added)

## Implementation Plan

### 1. Type Definitions (src/types.ts)

#### Changes:
- Add `Move` to `Operation` enum
- Update `RecordPatchesOptions` interface to include `enableMoveOp` option
- Update `RecorderState` to include the new option

```typescript
export const Operation = {
  Remove: 'remove',
  Replace: 'replace',
  Add: 'add',
  Move: 'move',  // NEW
} as const;

export interface RecordPatchesOptions {
  arrayLengthAssignment?: boolean;
  compressPatches?: boolean;
  getItemId?: GetItemIdConfig;
  enableMoveOp?: boolean;  // NEW - Enable move operation for array reordering
}
```

### 2. Patch Generation (src/patches.ts)

#### Add new function:
```typescript
/**
 * Generate a move patch for array item repositioning
 * Follows RFC 6902 JSON Patch format
 */
export function generateMovePatch(
  state: RecorderState<any>,
  fromPath: (string | number)[],
  toPath: (string | number)[],
  movedValue?: any,  // Optional: value being moved (for getItemId)
) {
  const patch: any = {
    op: Operation.Move,
    from: formatPath(fromPath, state.options),
    path: formatPath(toPath, state.options),
  };

  // Add id if getItemId is configured for the source path
  const getItemIdFn = findGetItemIdFn(fromPath, state.options.getItemId);
  if (getItemIdFn && movedValue !== undefined) {
    const id = getItemIdFn(movedValue);
    if (id !== undefined && id !== null) {
      patch.id = id;
    }
  }

  state.patches.push(patch);
}
```

### 3. Array Handling (src/arrays.ts)

#### Modify `generateArrayPatches` to support move operations for sort() and reverse():

**Note**: unshift() and splice() are not included in this initial implementation. They generate add/remove patches which is sufficient since:
- unshift() only adds new items at the beginning (no existing items need move patches)
- splice() with deletions/additions can be handled by remove/add patches
- Future enhancement: Could use referential equality to detect moves in splice()

**sort() and reverse() operations:**
```typescript
case 'sort':
case 'reverse': {
  if (state.options.enableMoveOp) {
    // Generate individual move patches for each element
    // Using Map for O(n) performance instead of O(n²) with indexOf()
    oldValue = [...obj]; // Copy original
    
    // Create a Map for O(1) index lookup
    // For duplicates, track which occurrence we're using
    const indexMap = new Map<any, number[]>();
    for (let i = 0; i < oldValue.length; i++) {
      const value = oldValue[i];
      if (!indexMap.has(value)) {
        indexMap.set(value, []);
      }
      indexMap.get(value)!.push(i);
    }
    
    for (let i = 0; i < obj.length; i++) {
      const newValue = obj[i];
      const indices = indexMap.get(newValue);
      
      if (indices && indices.length > 0) {
        // Get the next available index for this value (handles duplicates)
        const oldIndex = indices.shift()!;
        
        if (oldIndex !== i) {
          // Element moved from oldIndex to i
          generateMovePatch(
            state,
            [...path, oldIndex],  // from old position
            [...path, i],  // to new position
            newValue  // value being moved (for getItemId)
          );
        }
      }
    }
  } else {
    // Original: full replace patch
    generateReplacePatch(state, path, [...obj], oldValue);
  }
  break;
}
```

**Performance Note:** Using a Map with O(n) time complexity instead of nested O(n²) loops with indexOf(). This is critical for performance with large arrays.

### 4. Optimizer Updates (src/optimizer.ts)

#### Update `mergePatches` function to handle move operations:

```typescript
function mergePatches(patch1: any, patch2: any): any | null | undefined {
  const op1 = patch1.op;
  const op2 = patch2.op;

  // ... existing logic ...

  // New: Move operation handling
  if (op1 === 'move' && op2 === 'move') {
    // Move then move: update to final destination
    if (JSON.stringify(patch1.path) === JSON.stringify(patch2.from)) {
      // Chain moves: A -> B -> C becomes A -> C
      return {
        op: 'move',
        from: patch1.from,
        path: patch2.path,
        id: patch2.id || patch1.id
      };
    }
    if (JSON.stringify(patch1.from) === JSON.stringify(patch2.path)) {
      // Cancel out: A -> B -> A becomes no-op
      return null;
    }
  }

  if (op1 === 'move' && op2 === 'replace') {
    // Move then replace at destination: just move, value will be replaced at new location
    return patch1;
  }

  if (op1 === 'replace' && op2 === 'move') {
    // Replace then move: item at new location has new value
    return {
      op: 'replace',
      path: patch2.path,
      value: patch1.value,
      id: patch2.id || patch1.id
    };
  }

  if (op1 === 'move' && op2 === 'remove') {
    // Move then remove from destination: just remove from source
    return {
      op: 'remove',
      path: patch1.from
    };
  }

  if (op1 === 'remove' && op2 === 'move') {
    // Remove then move: can't move something that was removed
    return patch2; // Move operation on different item
  }

  // ... rest of existing logic ...
}
```

### 5. Index Updates (src/index.ts)

#### Pass `enableMoveOp` option to internal patches options:

```typescript
export function recordPatches<T extends NonPrimitive>(
  state: T,
  mutate: (state: Draft<T>) => void,
  options: RecordPatchesOptions = {},
): Patches {
  const internalPatchesOptions = {
    arrayLengthAssignment: options.arrayLengthAssignment ?? true,
    enableMoveOp: options.enableMoveOp ?? false,  // NEW
  };

  const recorderState = {
    original: state,
    patches: [],
    basePath: [],
    options: {
      ...options,
      internalPatchesOptions,
    },
  };

  // ... rest of function ...
}
```

### 6. Test Coverage (test/)

Create new test file: `test/move-operation.test.ts`

#### Test cases to include:

1. **Basic move operations**
   - `sort()` generates individual move patches for each repositioned element
   - `reverse()` generates individual move patches for each repositioned element

2. **Move with getItemId**
   - Move patches include `id` field when `getItemId` is configured
   - ID is extracted from the moved value

3. **Multiple moves in one operation**
   - Sort operation generates multiple move patches (one per moved element)
   - Reverse operation generates multiple move patches (one per moved element)

4. **Backward compatibility**
   - When `enableMoveOp` is false (default), behavior is unchanged
   - Existing tests continue to pass

5. **Edge cases**
   - Moving to same index (should be no-op - not included in patches)
   - Empty array operations (sort/reverse on empty array)
   - Array with duplicate values (sort/reverse with duplicates)
   - Nested arrays (move patches for nested arrays)

6. **Optimization**
   - Move + move cancellation (A -> B -> A)
   - Move + move chaining (A -> B -> C)
   - Move + replace/remove interactions

### 7. Documentation Updates (README.md)

Add new section:

#### Move Operation

The `enableMoveOp` option enables generation of `move` patches for array reordering operations, following RFC 6902 JSON Patch specification.

```typescript
const state = { items: ['c', 'a', 'b'] };

const patches = recordPatches(state, (draft) => {
  draft.items.sort();
}, { enableMoveOp: true });

// patches:
// [
//   { op: 'move', from: ['items', 2], path: ['items', 0] },
//   { op: 'move', from: ['items', 0], path: ['items', 1] },
//   { op: 'move', from: ['items', 1], path: ['items', 2] }
// ]
```

**When to use:**
- Drag-and-drop reordering
- List position changes
- When you want to track that items moved without tracking their values

**Move with Item IDs:**

```typescript
const state = {
  items: [
    { id: 2, name: 'Item 2' },
    { id: 1, name: 'Item 1' }
  ]
};

const patches = recordPatches(state, (draft) => {
  draft.items.sort((a, b) => a.id - b.id);
}, { 
  enableMoveOp: true,
  getItemId: {
    items: (item) => item.id
  }
});

// patches:
// [
//   { op: 'move', from: ['items', 0], path: ['items', 1], id: 2 },
//   { op: 'move', from: ['items', 1], path: ['items', 0], id: 1 }
// ]
```

**Supported operations:**
- `sort()` - Moves each item to its sorted position
- `reverse()` - Moves each item to reversed position

**Note:** Other array operations (push, pop, shift, unshift, splice) use standard add/remove/replace patches.

## Implementation Notes

### RFC 6902 Compliance
The `move` operation follows RFC 6902 JSON Patch specification:
```json
{ "op": "move", "from": "/array/0", "path": "/array/3" }
```

### Performance Considerations
- Move patches are more efficient than remove + add for large arrays
- No value copying required (just tracking positions)
- Useful for scenarios where values are large but you only need to track reordering
- **O(n) time complexity** for move patch generation using Map-based index lookup (instead of O(n²) with nested loops)
- The Map approach handles duplicate values efficiently by tracking multiple indices per value

### Backward Compatibility
- Default behavior unchanged (`enableMoveOp: false`)
- Existing code continues to work without modifications
- Opt-in feature for users who need it

### Limitations
- Only `sort()` and `reverse()` generate move patches (initial implementation)
- Complex reordering generates many individual move patches (one per moved element)
- Move patches cannot be applied to objects, only arrays

## Testing Strategy

1. **Unit tests** for each function
2. **Integration tests** for full recordPatches workflow
3. **Backward compatibility tests** to ensure existing behavior unchanged
4. **Edge case tests** for array boundaries and special cases
5. **Compression tests** for move operation optimization

## Migration Guide

No migration needed - this is an opt-in feature. Users can enable it by adding `enableMoveOp: true` to their options.