# Optimizer Performance Comparison

## Overview

The patch-recorder optimizer was rewritten to use nested Maps instead of string-based path keys for better performance. This document summarizes the performance improvements and implementation details.

## Implementation Options

Two implementations are available:

1. **`compressPatchesWithNestedMaps`** (default) - Uses nested Map tree for path lookup
2. **`compressPatchesWithStringKeys`** - Uses `pathToKey()` to convert paths to strings

The default export `compressPatches` uses the nested Map implementation.

## Benchmark Results

| Test Scenario | Old (string keys) | New (nested Maps) | Speedup |
|---------------|-------------------|-------------------|---------|
| 5 patches, different paths | 1.84M ops/sec | 1.77M ops/sec | 1.04x slower |
| 5 patches, same path (mergeable) | 2.98M ops/sec | 3.23M ops/sec | 1.08x faster |
| 100 patches, different paths | 39.8K ops/sec | 62.9K ops/sec | **1.58x faster** |
| 100 patches, 10 unique paths | 72.7K ops/sec | 271K ops/sec | **3.73x faster** |
| 20 patches, depth 5 | 76.6K ops/sec | 98.2K ops/sec | **1.28x faster** |
| 20 patches, depth 10 | 51.6K ops/sec | 66.6K ops/sec | **1.29x faster** |
| 100 array patches (add/remove) | 65.0K ops/sec | 88.4K ops/sec | **1.36x faster** |
| Patches with symbols | 287K ops/sec | 407K ops/sec | **1.42x faster** |
| Push + pop cancellation | 194K ops/sec | 369K ops/sec | **1.90x faster** |

## Key Findings

1. **Best case**: 3.73x faster when there are many patches on few unique paths (typical real-world scenario)
2. **Worst case**: 1.04x slower for very few patches on different paths (negligible impact)
3. **Symbols**: 1.42x faster because symbols preserve identity (no `.toString()` conversion)
4. **Consistent improvement**: All meaningful test cases show 1.2-1.9x improvements

## Why Nested Maps are Faster

### String Key Approach (Old)
```typescript
const pathKey = pathToKey(patch.path);  // Allocates new string
const existing = pathMap.get(pathKey);
```
- **Cost**: O(pathLength) string allocation + O(1) Map lookup
- **Memory**: Stores string keys separately from path arrays
- **Symbols**: Must call `.toString()`, losing identity

### Nested Map Approach (New)
```typescript
const node = getOrCreateNode(root, patch.path);  // No string allocation
const existing = node.patch;
```
- **Cost**: O(pathDepth) Map lookups, no string allocation
- **Memory**: Reuses path elements as Map keys (strings, numbers, symbols, objects)
- **Symbols**: Preserves symbol identity using actual symbol as key

## Implementation Details

### PathNode Structure
```typescript
interface PathNode {
  patch?: Patch;
  children?: Map<string | number | symbol | object, PathNode>;
}
```

The nested Map forms a tree where:
- Root → first path element → second path element → ... → leaf node
- Leaf node contains the patch for that path
- Children are Map instances keyed by path elements

### Trade-offs

| Aspect | String Keys | Nested Maps |
|--------|-------------|-------------|
| String allocation | Required for each lookup | None |
| Symbol handling | `.toString()` conversion | Direct use as key |
| Object keys | `JSON.stringify()` | Reference equality |
| Memory overhead | Strings + paths | Map instances at each level |
| Small datasets | Slightly faster | Slightly slower |
| Large datasets | Slower | 1.3-3.7x faster |

## Future Improvements

Potential areas for future optimization:

1. **Configuration option**: Allow users to choose implementation based on their workload
2. **Hybrid approach**: Use string keys for very small patch sets, nested Maps for larger ones
3. **Custom optimizer**: Allow users to provide their own patch compression function

## Running Benchmarks

```bash
# Compare both implementations directly
pnpm bench --run bench/optimizer-compare.bench.ts

# Run all benchmarks
pnpm bench