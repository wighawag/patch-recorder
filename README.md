# patch-recorder

> Record JSON patches (RFC 6902) from mutations applied to objects, arrays, Maps, and Sets via a proxy interface.

## Features

- ✅ **Reference integrity** - Original object reference maintained (mutates in place)
- ✅ **Zero memory overhead** - No copying of large arrays/objects
- ✅ **Accurate patches** - JSON Patch (RFC 6902) compliant
- ✅ **Type safety** - Full TypeScript support
- ✅ **Immediate patch generation** - Patches generated as mutations occur
- ✅ **Optional optimization** - Can compress/merge redundant patches
- ✅ **Full collection support** - Works with objects, arrays, Maps, and Sets

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
- Similar performance to mutative for most operations
- Slightly faster for object and Map operations
- Comparable performance for large array operations

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

#### Parameters

- **`state`** (`T extends NonPrimitive`): The state object to mutate and record patches from
- **`mutate`** `(state: Draft<T>) => void`: Callback function that performs mutations on the draft
- **`options`** (`RecordPatchesOptions`, optional): Configuration options

#### Options

```typescript
interface RecordPatchesOptions {
  /**
   * Return paths as arrays (default: true) or strings
   */
  pathAsArray?: boolean;
  
  /**
   * Include array length in patches (default: true)
   */
  arrayLengthAssignment?: boolean;
  
  /**
   * Optimize patches by merging redundant operations (default: false)
   */
  optimize?: boolean;
}
```

#### Returns

`Patches<true>` - Array of JSON patches

## Usage Examples

### Basic Object Mutations

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
//   { op: 'replace', path: ['items', 1], value: 3 },
//   { op: 'replace', path: ['items', 'length'], value: 3 }
// ]
```

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

### Using Options

```typescript
const state = { value: 1 };

// Use string paths instead of arrays
const patches2 = recordPatches(state, (draft) => {
  draft.value = 3;
}, { pathAsArray: false });
console.log(patches2);
// [{ op: 'replace', path: '/value', value: 3 }]

// Optimize patches (merge redundant operations)
const patches3 = recordPatches(state, (draft) => {
  draft.value = 4;
  draft.value = 5;
  draft.value = 5; // no-op
}, { optimize: true });
console.log(patches3);
// [{ op: 'replace', path: ['value'], value: 5 }]
```

## Comparison with Mutative

| Feature | Mutative | patch-recorder |
|---------|----------|----------------|
| Reference preservation | ❌ No (creates copy) | ✅ Yes (mutates in place) |
| Memory overhead | ❌ Yes (copies) | ✅ No |
| Patch accuracy | ✅ Excellent | ✅ Excellent |
| Type safety | ✅ Excellent | ✅ Excellent |
| API similarity | ✅ Similar | ✅ Similar |
| Use case | Immutable state | Mutable with tracking |

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
| Simple object mutation | 0.0272ms | 0.0110ms | **2.48x** |
| Medium nested object | 0.0268ms | 0.0114ms | **2.35x** |
| Large nested object | 0.0094ms | 0.0040ms | **2.38x** |
| Array push (100k elements) | 3.277ms | 1.155ms | **2.84x** |
| Array index (100k elements) | 2.966ms | 0.004ms | **826x** |
| Map operations (100k entries) | 11.384ms | 0.011ms | **1,067x** |

**Memory Usage:**
- **Mutative**: Creates copies (memory overhead proportional to state size)
- **patch-recorder**: 0 MB overhead (mutates in place, no copying)

### Performance Analysis

The benchmark results reveal patch-recorder's massive advantage for operations that would require copying large data structures:

- **Object mutations** (2.35-2.48x faster) - Consistent speedups due to simpler proxy overhead
- **Array push** (2.84x faster) - Avoids copying entire arrays on mutation
- **Array index assignment** (826x faster) - **Massive speedup** by not copying 100k-element arrays
- **Map operations** (1,067x faster) - **Incredible speedup** by not copying 100k-entry Maps

**Why the dramatic differences?**
- patch-recorder mutates in place, so array index assignment and Map operations don't require copying
- mutative's copy-on-write approach is elegant but incurs significant overhead for large collections
- The advantage scales with data size - the larger the collection, the bigger the speedup

**Note on mutative's performance:** Mutative is impressively fast for object mutations and offers excellent immutability guarantees. Its speedups of 2-3x for objects are reasonable trade-offs for immutable state management.

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
2. **Patch compression**: Reduces redundant patches via `optimize` option

## License

MIT © [Ronan Sandford](https://github.com/wighawag)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.