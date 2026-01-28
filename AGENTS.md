# patch-recorder Development Guidelines

## Project Overview

**patch-recorder** is a standalone TypeScript library that records JSON patches (RFC 6902) from mutations applied to objects, arrays, Maps, and Sets via a proxy interface. Unlike mutative or immer, it mutates the original object in place while recording changes, preserving object references and avoiding memory overhead from copying.

### Performance Characteristics

- **1.1-1.5x faster** for simple object mutations
- **4.5x faster** for array push operations
- **380x faster** for array index assignments (no array copying)
- **650x faster** for Map operations (no Map copying)

## Core Philosophy

1. **Reference Preservation**: Always mutate the original object in place, never create copies
2. **Immediate Patch Generation**: Generate patches as mutations occur, not at the end
3. **Simplicity**: Keep the implementation straightforward and easy to understand
4. **Type Safety**: Maintain full TypeScript type safety throughout
5. **RFC 6902 Compliance**: Generate valid JSON patches
6. **Performance First**: Avoid expensive operations like deep copying or value tracking

## Key Design Decisions

### 1. No Copying Strategy

**Critical**: Unlike mutative or immer, patch-recorder NEVER creates copies of objects or arrays. All mutations happen directly on the original object.

**Implementation**: When a property is set, we:
1. Record the old value
2. Mutate the original object
3. Generate a patch immediately

**Example**:
```typescript
const state = { user: { name: 'John' } };

recordPatches(state, (draft) => {
  draft.user.name = 'Jane';
});

// state is now { user: { name: 'Jane' } }
// state === originalState (same reference)
```

### 2. Patch Generation Timing

**Decision**: Generate patches immediately when mutations occur, not at the end.

**Rationale**:
- Simpler implementation (no need to compare copy vs original)
- More intuitive (patches reflect mutations as they happen)
- No dependency on copy creation
- Easy to optimize patches at the end if needed

**Implementation**:
```typescript
set(obj, prop, value) {
  const oldValue = obj[prop];
  
  // Use Object.is() for NaN-safe comparison
  if (Object.is(oldValue, value)) {
    return true; // Skip no-op
  }
  
  obj[prop] = value; // Mutate immediately
  
  // Generate patch immediately
  patches.push({
    op: oldValue === undefined ? 'add' : 'replace',
    path: [...basePath, prop],
    value: value
  });
}
```

### 3. Path Tracking

**Decision**: Track the current path from root to current object using `basePath` in the recorder state.

**Implementation**:
```typescript
interface RecorderState<T> {
  original: T;
  patches: Patches<any>;
  basePath: (string | number)[];
  options: RecordPatchesOptions & {internalPatchesOptions: PatchesOptions};
}

// When creating nested proxy
createProxy(nestedObj, [...state.basePath, prop], state);
```

### 4. Array Method Handling

**Decision**: Wrap mutating array methods to generate appropriate patches with minimal copying.

**Method-specific optimizations**:
- `push` → No copying needed, just track starting length
- `pop` → No copying needed, result contains removed element
- `shift` → No copying needed, result contains removed element
- `unshift` → No copying needed
- `splice` → No copying needed, result contains deleted elements array
- `sort`, `reverse` → **Full copy required** (need original for replace patch)

**Implementation uses module-level Sets for O(1) method lookup**:
```typescript
const MUTATING_METHODS = new Set(['push', 'pop', 'shift', 'unshift', 'splice', 'sort', 'reverse']);
const NON_MUTATING_METHODS = new Set(['map', 'filter', 'reduce', ...]);
```

### 5. Map/Set Semantics

**Decision**: Use keys as path elements for Map and Set operations.

**Implementation**:
```typescript
// Map
map.set('key', 'value');
// Patch: { op: 'replace', path: ['map', 'key'], value: 'value' }

// Set
set.add('value');
// Patch: { op: 'add', path: ['set', 'value'], value: 'value' }
```

**Important**: Map.get() returns proxies for ALL object values (not just Maps/Arrays) to enable nested mutation tracking.

### 6. Item ID Tracking (getItemId)

**Decision**: Allow users to optionally include item IDs in remove/replace patches.

**Rationale**:
- Array patches only include the index, not which item was removed/replaced
- Users often need to know which entity was affected without tracking indices
- Makes patches more meaningful for debugging and synchronization

**Implementation**:
```typescript
recordPatches(state, mutate, {
  getItemId: {
    items: (item) => item.id,
    users: (user) => user.userId,
    nested: {
      array: (item) => item._id
    }
  }
});

// Patch output:
// { op: 'remove', path: ['items', 3], id: 'item-123' }
// { op: 'replace', path: ['users', 1], value: {...}, id: 'user-456' }
```

**Key points**:
- Only affects `remove` and `replace` patches (not `add`)
- The `id` is extracted from the OLD value being removed/replaced
- If the function returns `undefined` or `null`, no `id` field is added
- Uses a recursive object structure to match nested paths

### 7. No Original Value Tracking

**Decision**: Do NOT track original values for compression optimization.

**Rationale**:
- Tracking original values requires deep copying (expensive)
- Reference equality fails for objects/arrays modified and reverted
- The patterns this would optimize (replace-then-revert) indicate poor user code
- Simpler implementation is more maintainable

**What this means**: Operations like `x = 'new'; x = 'original'` will NOT cancel out to zero patches. The final patch will be `replace` with the final value.

## Development Guidelines

### File Organization

```
src/
├── index.ts              # Main entry point (recordPatches function)
├── types.ts              # Type definitions
├── proxy.ts              # Proxy handler implementation
├── patches.ts            # Patch generation functions
├── arrays.ts             # Array method handling
├── maps.ts               # Map method handling
├── sets.ts               # Set method handling
├── optimizer.ts          # Patch optimization (optional)
└── utils.ts              # Utility functions
```

### Coding Standards

1. **Type Safety**: Always use TypeScript types, avoid `any` when possible
2. **Immutability**: Keep internal state immutable where possible (patches array can be mutated)
3. **Error Handling**: Provide clear error messages for invalid operations
4. **Documentation**: Add JSDoc comments for all public APIs
5. **Testing**: Write tests for all code paths

### Testing Strategy

1. **Unit Tests**: Test each function independently
2. **Integration Tests**: Test the full recordPatches workflow
3. **Comparison Tests**: Compare patch output with mutative (where applicable)
4. **Edge Cases**: Test undefined, null, symbols, deep nesting
5. **Type Safety Tests**: Verify TypeScript compilation

### Performance Considerations

1. **Lazy Proxy Creation**: Only create proxies for properties that are accessed
2. **Minimal State**: Keep recorder state minimal (no oldValuesMap)
3. **Patch Compression**: Optional compression via `compressPatches` option (merges same-path operations)
4. **Array Method Optimization**: Only copy arrays for sort/reverse operations
5. **O(1) Method Lookup**: Use Sets instead of arrays for method name checking
6. **NaN-safe Equality**: Use `Object.is()` instead of `===` for value comparison

## Common Patterns

### Pattern 1: Basic Mutation

```typescript
const patches = recordPatches(state, (draft) => {
  draft.prop = newValue;
});
```

### Pattern 2: Nested Mutation

```typescript
const patches = recordPatches(state, (draft) => {
  draft.user.profile.name = 'Jane';
});
```

### Pattern 3: Array Operations

```typescript
const patches = recordPatches(state, (draft) => {
  draft.items.push(newValue);
  draft.items.splice(1, 1);
});
```

### Pattern 4: Collection Operations

```typescript
const patches = recordPatches(state, (draft) => {
  draft.map.set('key', 'value');
  draft.set.add('value');
});
```

### Pattern 5: Item ID Tracking

```typescript
const patches = recordPatches(state, (draft) => {
  draft.users.splice(1, 1); // Remove user at index 1
}, {
  getItemId: {
    users: (user) => user.id
  }
});
// Patches: [{ op: 'remove', path: ['users', 1], id: 'user-123' }]
```

## Testing Patterns

### Test Structure

```typescript
import {describe, it, expect} from 'vitest';
import {recordPatches} from '../src/index';

describe('Feature Name', () => {
  it('should do something', () => {
    // Arrange
    const state = { /* initial state */ };
    
    // Act
    const patches = recordPatches(state, (draft) => {
      // mutations
    });
    
    // Assert
    expect(state).toEqual({ /* expected state */ });
    expect(patches).toEqual([ /* expected patches */ ]);
  });
});
```

### Test Categories

1. **Basic Functionality**: Simple mutations, nested mutations
2. **Array Operations**: All array methods
3. **Collection Operations**: Map and Set methods
4. **Patch Accuracy**: Compare with mutative output
5. **Edge Cases**: Undefined, null, symbols, deep nesting
6. **Type Safety**: TypeScript compilation
7. **Optimization**: Patch compression
8. **Item ID Tracking**: getItemId option with arrays, Maps, Sets

## Common Pitfalls

### Pitfall 1: Mutating Before Recording

**Wrong**:
```typescript
state.user.name = 'Jane';
const patches = recordPatches(state, (draft) => {
  draft.user.name = 'John';
});
```

**Right**:
```typescript
const patches = recordPatches(state, (draft) => {
  draft.user.name = 'Jane';
});
```

### Pitfall 2: Ignoring Undefined Values

**Issue**: Setting a property to `undefined` should generate a patch.

**Solution**: Always generate patches, even if value is `undefined`.

### Pitfall 3: Array Reordering

**Issue**: `sort()` and `reverse()` reorder arrays, which is hard to patch element-by-element.

**Solution**: Generate a full `replace` patch for the entire array.

### Pitfall 4: Symbol Keys

**Issue**: Symbols can be used as object keys but JSON patches don't support them.

**Solution**: Handle symbol keys specially or skip them in patches.

### Pitfall 5: Circular References

**Issue**: Circular references can cause infinite loops in patch generation.

**Solution**: Detect circular references and either skip or throw error.

### Pitfall 6: Sparse Array Holes vs Undefined

**Issue**: A sparse array hole (`[1, , 3]`) is not the same as having `undefined` at that index.

**Solution**: Setting a hole to `undefined` explicitly creates the property, generating a `replace` patch.

```typescript
const state = { items: [1, , 3] };
recordPatches(state, (draft) => {
  draft.items[1] = undefined; // Generates replace patch, NOT a no-op
});
```

### Pitfall 7: Expecting Revert Detection

**Issue**: Without original value tracking, operations that revert to original value won't cancel.

**Example**:
```typescript
const state = { value: 'original' };
recordPatches(state, (draft) => {
  draft.value = 'new';
  draft.value = 'original'; // Does NOT cancel - generates replace patch
});
// Patches: [{ op: 'replace', path: ['value'], value: 'original' }]
```

**Solution**: This is expected behavior. If you need revert detection, do it in your application layer.

## Performance Optimization

### Optimization 1: Skip Unchanged Values (NaN-safe)

```typescript
set(obj, prop, value) {
  // Use Object.is() for NaN-safe comparison
  // NaN === NaN is false, but Object.is(NaN, NaN) is true
  if (Object.is(obj[prop], value)) {
    return true; // Skip if no change
  }
  // ... rest of logic
}
```

### Optimization 2: Patch Compression (compressPatches)

```typescript
function compressPatches(patches: Patches<true>): Patches<true> {
  // Group patches by path
  // Merge same-path operations:
  //   - replace + replace → keep latest replace
  //   - add + remove → cancel out (return null)
  //   - remove + add → convert to replace
  //   - add + replace → keep replace
  // Cancel array push + pop operations
  // Remove out-of-bounds patches after length changes
}
```

**Note**: We do NOT track original values, so replace-then-revert sequences will NOT cancel out.

### Optimization 3: Lazy Proxy Creation

```typescript
get(obj, prop) {
  const value = obj[prop];
  
  // Only create proxy if the value is an object and we actually access it
  if (typeof value === 'object' && value !== null) {
    return createProxy(value, [...path, prop], state);
  }
  
  return value;
}
```

### Optimization 4: Array Method Optimization

```typescript
// Module-level Sets for O(1) lookup
const MUTATING_METHODS = new Set(['push', 'pop', 'shift', 'unshift', 'splice', 'sort', 'reverse']);

// Only copy arrays when necessary (sort/reverse need full copy)
if (prop === 'sort' || prop === 'reverse') {
  oldValue = [...obj];  // Full copy only for reorder operations
}
// Other methods use result value or length tracking
```

### Optimization 5: JSON Pointer Format (pathAsArray: false)

```typescript
// Correct RFC 6901 JSON Pointer format
function formatPath(path: (string | number)[]): string {
  if (path.length === 0) return '';
  return '/' + path
    .map(part => String(part).replace(/~/g, '~0').replace(/\//g, '~1'))
    .join('/');
}
// ['items', 0, 'name'] → '/items/0/name'
```

## Debugging Tips

### Enable Debug Logging

```typescript
const patches = recordPatches(state, (draft) => {
  // mutations
}, { debug: true }); // Log all operations
```

### Compare with Mutative

```typescript
import {create} from 'mutative';
import {recordPatches} from 'patch-recorder';

const state = { /* ... */ };

// Mutative patches
const [_, mutativePatches] = create(state, (draft) => {
  // mutations
}, { enablePatches: true });

// patch-recorder patches
const patches = recordPatches(JSON.parse(JSON.stringify(state)), (draft) => {
  // same mutations
});

// Compare
console.log('Mutative:', mutativePatches);
console.log('patch-recorder:', patches);
```

### Inspect Proxy Behavior

```typescript
const proxy = createProxy(obj, [], state);
console.log(proxy); // Shows proxy trap
```

## Questions?

If you encounter issues or have questions:
1. Check the test files for examples
2. Compare with mutative's behavior
3. Review RFC 6902 (JSON Patch specification)
4. Consult the main plan document (plans/INITIAL_PLAN.md)