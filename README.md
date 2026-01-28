# patch-recorder

> Record JSON patches (RFC 6902) from mutations applied to objects, arrays, Maps, and Sets via a proxy interface.

## Features

- ✅ **Reference preservation** - Original object reference maintained (mutates in place)
- ✅ **No memory overhead** - No copying of large arrays/objects
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

Unlike mutative or immer, **patch-recorder mutates the original object in place** while recording changes. This means:

- No memory overhead from copying objects
- Original object references are preserved
- Perfect for scenarios where you need both mutation tracking AND direct object manipulation

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
   * Enable patch generation (default: true)
   */
  enablePatches?: boolean;
  
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

// Disable patch generation
const patches1 = recordPatches(state, (draft) => {
  draft.value = 2;
}, { enablePatches: false });
console.log(patches1); // []

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

### Memory Usage

- **No copying**: Original object mutated in place
- **Patch storage**: Only patches array stored (minimal overhead)
- **Proxy creation**: One proxy per object accessed during mutation

### Time Complexity

- **Property access**: O(1) for direct access, O(1) for proxy
- **Property mutation**: O(1) + patch generation
- **Array operations**: O(n) for some operations (same as native)
- **Nested mutations**: O(depth) for proxy creation

### Optimization Opportunities

1. **Lazy proxy creation**: Only creates proxies for accessed properties
2. **Patch compression**: Reduces redundant patches via `optimize` option
3. **Skip patch generation**: If patches not needed (set `enablePatches: false`)

## License

MIT © [Ronan Sandford](https://github.com/wighawag)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.