# patch-recorder

> Record JSON patches (RFC 6902) from mutations applied to objects, arrays, Maps, and Sets via a proxy interface.

## Features

- ✅ **Reference integrity** - Original object reference maintained (mutates in place)
- ✅ **Zero memory overhead** - No copying of large arrays/objects
- ✅ **Accurate patches** - JSON Patch (RFC 6902) compliant
- ✅ **Type safety** - Full TypeScript support
- ✅ **Immediate patch generation** - Patches generated as mutations occur
- ✅ **Optimization enabled by default** - Automatically compresses/merges redundant patches
- ✅ **Full collection support** - Works with objects, arrays, Maps, and Sets
- ✅ **Item ID tracking** - Optionally include item IDs in remove/replace patches

## Installation

```bash
npm install patch-recorder
# or
pnpm add patch-recorder
# or
yarn add patch-recorder
```

## Quick Start

```typescript
import {recordPatches} from 'patch-recorder';

const state = {
  user: { name: 'John', age: 30 },
  items: [1, 2, 3]
};

const patches = recordPatches(state, (draft) => {
  draft.user.name = 'Jane';
  draft.items.push(4);
});

console.log(state.user.name); // 'Jane' (mutated in place!)
console.log(patches);
// [
//   { op: 'replace', path: ['user', 'name'], value: 'Jane' },
//   { op: 'add', path: ['items', 3], value: 4 }
// ]
```

## Core Difference from Mutative/Immer

Unlike mutative or immer, **patch-recorder mutates the original object in place** while recording changes. This is its primary advantage:

**Reference Integrity:**
- **Zero memory overhead** from copying objects
- **Original object references are preserved** throughout the operation
- Perfect for scenarios where you need both mutation tracking AND direct object manipulation

**Performance:**
- Substantially faster than mutative (1.1x to 650x depending on operation)
- Especially dramatic speedups for array index and Map operations
- Consistent performance improvements across all data types

```typescript
// With patch-recorder
const state = { user: { name: 'John' } };
const patches = recordPatches(state, (draft) => {
  draft.user.name = 'Jane';
});

// state === originalState (same reference)
// state.user.name === 'Jane'
```

## API

### `recordPatches(state, mutate, options?)`

Records JSON patches from mutations applied to the state.

### `create(state, mutate, options?)`

Mutative-compatible API for easy switching between mutative and patch-recorder. Returns `[state, patches]` tuple like mutative does.

**Key difference from mutative:** Unlike mutative which creates a new state copy, this mutates the original object in place. The returned `state` is the same reference as the input state.

**Note:** The `enablePatches` option is forced to `true` by default for full mutative compatibility (patches are always returned).

#### Parameters (both functions)

- **`state`** (`T extends NonPrimitive`): The state object to mutate and record patches from
- **`mutate`** `(state: Draft<T>) => void`: Callback function that performs mutations on the draft
- **`options`** (`RecordPatchesOptions`, optional): Configuration options

#### Options

For `recordPatches`:

- **`pathAsArray`** (boolean, default: `true`) - Return paths as arrays or strings
- **`arrayLengthAssignment`** (boolean, default: `true`) - When `true`, includes length patches when array shrinks (pop, shift, splice delete). When `false`, omits length patches entirely. Aligned with mutative's behavior.
- **`compressPatches`** (boolean, default: `true`) - Compress patches by merging redundant operations
- **`getItemId`** (object, optional) - Configuration for extracting item IDs (see [Item ID Tracking](#item-id-tracking))

For `create` (additional options for mutative compatibility):
- **`enablePatches`** (boolean, default: `true`) - Always true, patches are always returned

#### Returns

- **`recordPatches`**: Returns `Patches<true>` - Array of JSON patches
- **`create`**: Returns `[T, Patches<true>]` - Tuple of mutated state and patches

## Usage Examples

### Using `recordPatches`

#### Basic Object Mutations

```typescript
const state = { count: 0, name: 'test' };

const patches = recordPatches(state, (draft) => {
  draft.count = 5;
  draft.name = 'updated';
});

console.log(patches);
// [
//   { op: 'replace', path: ['count'], value: 5 },
//   { op: 'replace', path: ['name'], value: 'updated' }
// ]
```

### Nested Object Mutations

```typescript
const state = {
  user: {
    profile: {
      name: 'John',
      age: 30
    }
  }
};

const patches = recordPatches(state, (draft) => {
  draft.user.profile.name = 'Jane';
  draft.user.profile.age = 31;
});

console.log(patches);
// [
//   { op: 'replace', path: ['user', 'profile', 'name'], value: 'Jane' },
//   { op: 'replace', path: ['user', 'profile', 'age'], value: 31 }
// ]
```

### Array Operations

```typescript
const state = { items: [1, 2, 3] };

const patches = recordPatches(state, (draft) => {
  draft.items.push(4);           // add
  draft.items[1] = 10;           // replace
  draft.items.shift();           // remove
});

console.log(patches);
// [
//   { op: 'add', path: ['items', 3], value: 4 },
//   { op: 'replace', path: ['items', 1], value: 10 },
//   { op: 'remove', path: ['items', 0] },
//   { op: 'replace', path: ['items', 0], value: 2 },
//   { op: 'replace', path: ['items', 1], value: 3 }
// ]
```

**Note:** Array length patches are included only when the array shrinks (pop, shift, splice delete operations) to optimize performance. This aligns with mutative's behavior. When the array grows (push, unshift, splice add operations), length patches are omitted as the length change is implied by the add operations themselves.

### Map Operations

```typescript
const state = { map: new Map([['a', 1]]) };

const patches = recordPatches(state, (draft) => {
  draft.map.set('b', 2);         // add
  draft.map.set('a', 10);        // replace
  draft.map.delete('b');         // remove
});

console.log(patches);
// [
//   { op: 'add', path: ['map', 'b'], value: 2 },
//   { op: 'replace', path: ['map', 'a'], value: 10 },
//   { op: 'remove', path: ['map', 'b'] }
// ]
```

### Set Operations

```typescript
const state = { set: new Set([1, 2]) };

const patches = recordPatches(state, (draft) => {
  draft.set.add(3);              // add
  draft.set.delete(2);           // remove
});

console.log(patches);
// [
//   { op: 'add', path: ['set', 3], value: 3 },
//   { op: 'remove', path: ['set', 2] }
// ]
```

### Using `create` (Mutative-compatible API)

The `create` function provides the same API as mutative for easy switching:

```typescript
import {create} from 'patch-recorder';

const state = { user: { name: 'John' } };

const [nextState, patches] = create(state, (draft) => {
  draft.user.name = 'Jane';
});

console.log(nextState.user.name); // 'Jane' (mutated in place!)
console.log(nextState === state); // true (same reference - unlike mutative)
console.log(patches);
// [{ op: 'replace', path: ['user', 'name'], value: 'Jane' }]
```

#### Easy Migration from Mutative

```typescript
// Before (with mutative)
import {create} from 'mutative';
const [newState, patches] = create(state, mutate, {enablePatches: true});
// newState !== state (mutative creates a copy)

// After (with patch-recorder) - EXACT SAME CODE!
import {create} from 'patch-recorder';
const [nextState, patches] = create(state, mutate, {enablePatches: true});
// nextState === state (patch-recorder mutates in place)
```

**No code changes needed** - just change the import! The `enablePatches` option is forced to `true` by default, so it's always enabled.

### Using Options

For `recordPatches`:

```typescript
const state = { value: 1 };

// Use string paths instead of arrays
const patches = recordPatches(state, (draft) => {
  draft.value = 3;
}, { pathAsArray: false });
console.log(patches);
// [{ op: 'replace', path: '/value', value: 3 }]

// Compress patches (merge redundant operations) - enabled by default
const patches = recordPatches(state, (draft) => {
  draft.value = 4;
  draft.value = 5;
  draft.value = 5; // no-op
});
// To disable compression:
// const patches = recordPatches(state, (draft) => { ... }, { compressPatches: false });
console.log(patches);
// [{ op: 'replace', path: ['value'], value: 5 }]

// For create function, you also have to pass enablePatches (it's always true)
const [nextState, patches] = create(state, (draft) => {
  draft.value = 5;
}, { enablePatches: true, pathAsArray: false, compressPatches: true });
```

### Item ID Tracking

When working with arrays, the patch path only tells you the index, not which item was affected. The `getItemId` option allows you to include item IDs in `remove` and `replace` patches, making it easier to track which items changed.

```typescript
const state = {
  users: [
    { id: 'user-1', name: 'Alice' },
    { id: 'user-2', name: 'Bob' },
    { id: 'user-3', name: 'Charlie' },
  ]
};

const patches = recordPatches(state, (draft) => {
  draft.users.splice(1, 1); // Remove Bob
}, {
  getItemId: {
    users: (user) => user.id  // Extract ID from each user
  }
});

console.log(patches);
// [{ op: 'remove', path: ['users', 1], id: 'user-2' }]
// Without getItemId, you'd only know index 1 was removed, not that it was Bob
```

#### Configuration Structure

The `getItemId` option is an object that mirrors your data structure:

```typescript
recordPatches(state, mutate, {
  getItemId: {
    // Top-level arrays
    items: (item) => item.id,
    users: (user) => user.userId,
    
    // Nested paths - use nested objects
    app: {
      data: {
        todos: (todo) => todo._id
      }
    },
    
    // Maps - same as arrays
    entityMap: (entity) => entity.internalId
  }
});
```

#### Works with Maps and Sets too

```typescript
const state = {
  entityMap: new Map([
    ['key1', { internalId: 'entity-1', data: 'value1' }],
  ]),
  itemSet: new Set([
    { id: 'set-item-1', value: 1 }
  ])
};

const patches = recordPatches(state, (draft) => {
  draft.entityMap.delete('key1');
}, {
  getItemId: {
    entityMap: (entity) => entity.internalId
  }
});

console.log(patches);
// [{ op: 'remove', path: ['entityMap', 'key1'], id: 'entity-1' }]
```

#### When IDs are included

- **`remove`** patches always include `id` when configured
- **`replace`** patches include `id` (of the OLD value being replaced)
- **`add`** patches do NOT include `id` (the value already contains it)

#### ID can be undefined/null

If the `getItemId` function returns `undefined` or `null`, the `id` field is omitted from the patch. This is useful when some items might not have IDs.

## Comparison with Mutative

| Feature | Mutative | patch-recorder |
|---------|----------|----------------|
| Reference preservation | ❌ No (creates copy) | ✅ Yes (mutates in place) |
| Memory overhead | ❌ Yes (copies) | ✅ No |
| Patch accuracy | ✅ Excellent | ✅ Excellent |
| Type safety | ✅ Excellent | ✅ Excellent |
| API compatibility | - | ✅ `create()` function provides same API |
| Use case | Immutable state | Mutable with tracking |
| Performance | Fast | 1.1-650x faster |

### Easy Migration

```typescript
// Switching from mutative to patch-recorder is simple:
// Just change the import - no other changes needed!

// Before
import {create} from 'mutative';
const [nextState, patches] = create(state, mutate, {enablePatches: true});

// After - EXACT SAME CODE!
import {create} from 'patch-recorder';
const [nextState, patches] = create(state, mutate, {enablePatches: true});

// Note: patch-recorder mutates in place, so nextState === state
// If you rely on immutability, you may need to clone before mutation
```

### When to Use patch-recorder

Use **patch-recorder** when you need:
- To mutate state in place while tracking changes
- Zero memory overhead from copying
- To preserve object references
- To integrate with systems that require direct mutation

Use **mutative** when you need:
- Immutable state management
- To create new state versions
- Functional programming patterns

## Performance

patch-recorder provides substantial performance improvements over mutative while maintaining **reference integrity** as its key differentiator. When properly benchmarking just the mutation operations (excluding state creation), patch-recorder shows dramatic speedups:

### Benchmark Results

| Operation | Mutative | patch-recorder | Speedup |
|-----------|----------|----------------|---------|
| Simple object mutation | 0.0215ms | 0.0148ms | **1.45x** |
| Medium nested object | 0.0254ms | 0.0221ms | **1.15x** |
| Large nested object | 0.0088ms | 0.0078ms | **1.13x** |
| Array push (100k elements) | 3.0311ms | 0.6809ms | **4.45x** |
| Array index (100k elements) | 2.6097ms | 0.0069ms | **380x** |
| Map operations (100k entries) | 10.4033ms | 0.0160ms | **650x** |

**Memory Usage:**
- **Mutative**: Creates copies (memory overhead proportional to state size)
- **patch-recorder**: 0 MB overhead (mutates in place, no copying)

### Performance Analysis

The benchmark results reveal patch-recorder's massive advantage for operations that would require copying large data structures:

- **Object mutations** (1.13-1.45x faster) - Consistent speedups due to simpler proxy overhead
- **Array push** (4.45x faster) - Avoids copying entire arrays on mutation
- **Array index assignment** (380x faster) - **Massive speedup** by not copying 100k-element arrays
- **Map operations** (650x faster) - **Incredible speedup** by not copying 100k-entry Maps

**Why the dramatic differences?**
- patch-recorder mutates in place, so array index assignment and Map operations don't require copying
- mutative's copy-on-write approach is elegant but incurs significant overhead for large collections
- The advantage scales with data size - the larger the collection, the bigger the speedup

**Note on mutative's performance:** Mutative is impressively fast for object mutations and offers excellent immutability guarantees. Its speedups of ~1.1-1.5x for objects are reasonable trade-offs for immutable state management.

### Run Benchmarks

You can run the benchmarks locally:

```bash
npm run benchmark
```

### Memory Usage

- **No copying**: Original object mutated in place
- **Patch storage**: Only patches array stored (minimal overhead)
- **Proxy creation**: One proxy per object accessed during mutation

### Time Complexity

- **Property access**: O(1) for direct access, O(1) for proxy
- **Property mutation**: O(1) + patch generation
- **Array operations**: O(n) for some operations (same as native)
- **Nested mutations**: O(depth) for proxy creation

### When to Choose patch-recorder

**Choose patch-recorder if you need:**
- **Reference integrity** - Objects and arrays maintain their identity
- **Zero memory overhead** - No copying of state
- **Direct mutation** - Mutate in place while tracking changes
- **Integration with mutable systems** - Systems that require direct object manipulation

**Choose mutative if you need:**
- **Immutable state** - Create new state versions
- **Functional programming patterns** - Prefer immutability
- **State versioning** - Need to track multiple state versions

### Optimization Tips

1. **Lazy proxy creation**: Only creates proxies for accessed properties
2. **Patch compression**: Reduces redundant patches via `compressPatches` option

## License

MIT © [Ronan Sandford](https://github.com/wighawag)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.