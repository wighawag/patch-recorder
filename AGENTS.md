# patch-recorder Development Guidelines

## Project Overview

**patch-recorder** is a standalone TypeScript library that records JSON patches (RFC 6902) from mutations applied to objects, arrays, Maps, and Sets via a proxy interface. Unlike mutative or immer, it mutates the original object in place while recording changes, preserving object references and avoiding memory overhead from copying.

## Core Philosophy

1. **Reference Preservation**: Always mutate the original object in place, never create copies
2. **Immediate Patch Generation**: Generate patches as mutations occur, not at the end
3. **Simplicity**: Keep the implementation straightforward and easy to understand
4. **Type Safety**: Maintain full TypeScript type safety throughout
5. **RFC 6902 Compliance**: Generate valid JSON patches

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
  patches: Patches<true>;
  basePath: (string | number)[];
  options: RecordPatchesOptions;
}

// When creating nested proxy
createProxy(nestedObj, [...state.basePath, prop], state);
```

### 4. Array Method Handling

**Decision**: Wrap mutating array methods to generate appropriate patches.

**Special Cases**:
- `push` → Generate `add` patches for each new element
- `pop` → Generate `remove` patch for removed element
- `splice` → Generate `remove` patches for deleted elements, `add` patches for added elements
- `sort`, `reverse` → Generate `replace` patch for entire array (reordering is complex)

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
2. **Minimal State**: Keep recorder state minimal
3. **Patch Optimization**: Optional compression of redundant patches
4. **Benchmarking**: Compare performance with mutative for large objects

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

## Performance Optimization

### Optimization 1: Skip Unchanged Values

```typescript
set(obj, prop, value) {
  if (obj[prop] === value) {
    return true; // Skip if no change
  }
  // ... rest of logic
}
```

### Optimization 2: Patch Compression

```typescript
function compressPatches(patches) {
  // Merge consecutive operations on same path
  // Remove no-op patches
  // Remove patches that cancel each other
}
```

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