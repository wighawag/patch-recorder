# patch-recorder Development Guidelines

## Development Workflow

### Test-Driven Development

**Always write a failing test first** before implementing any feature or fix:

1. Write a test that describes the expected behavior
2. Run `pnpm test` to verify the test fails
3. Implement the feature/fix
4. Run `pnpm test` to verify all tests pass

### Commands

```bash
# Build the project
pnpm build

# Run tests
pnpm test

# Run benchmarks
pnpm bench
```

### Testing Strategy

- **Unit tests**: Place in `test/` directory with `.test.ts` extension
- **Benchmarks**: Place in `bench/` directory with `.bench.ts` extension
- Use `vitest` for testing and `vitest bench` for benchmarks
- Run specific test files: `pnpm test test/getItemId.test.ts`

### Code Quality

- Run `pnpm format` before committing
- All tests must pass before merging
- Add JSDoc comments for public APIs
- Use TypeScript strict mode

### File Organization

```
src/           # Source files
test/          # Test files
bench/         # Benchmark files
plans/         # Design documents and plans
```

### Common Patterns

**Test structure:**
```typescript
import {describe, it, expect} from 'vitest';
import {recordPatches} from '../src/index';

describe('Feature Name', () => {
  it('should do something', () => {
    // Arrange
    const state = { /* initial state */ };
    
    // Act
    const patches = recordPatches(state, (state) => {
      // mutations
    });
    
    // Assert
    expect(state).toEqual({ /* expected state */ });
    expect(patches).toEqual([ /* expected patches */ ]);
  });
});
```

**Benchmark structure:**
```typescript
import {bench, describe} from 'vitest';
import {recordPatches} from '../src/index';

describe('Feature Benchmark', () => {
  bench('operation name', () => {
    // benchmark code
  });
});
```
