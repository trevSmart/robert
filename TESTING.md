# Quick Start - Running Tests

This guide shows you how to quickly run the Robert extension test suite.

## Prerequisites

Ensure dependencies are installed:

```bash
npm install
```

## Running Tests

### Quick Test (Recommended)

Run all unit tests:

```bash
npm run test
```

Expected output:
```
✓ test/ErrorHandler.test.ts (19 tests) 23ms
✓ test/SettingsManager.test.ts (14 tests) 14ms
✓ test/extension.test.ts (3 tests) 386ms
✓ test/OutputChannelManager.test.ts (7 tests) 7ms
✓ src/libs/cache/CacheManager.test.ts (22 tests) 4027ms

Test Files  5 passed (5)
Tests  65 passed (65)
Duration  4.32s
```

### Watch Mode (Development)

Run tests in watch mode during development:

```bash
npm run test:watch
```

This will re-run tests automatically when you make changes.

### VS Code Integration Tests

Run tests within a VS Code instance:

```bash
npm run test:vscode
```

**Note**: This will download VS Code if needed and run tests in a real VS Code environment.

### Coverage Report

Generate test coverage report:

```bash
npm run test:coverage
```

View the HTML coverage report at: `coverage/index.html`

## Test Scripts Summary

| Command | Description |
|---------|-------------|
| `npm run test` | Run all unit tests once |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:ui` | Open interactive test UI |
| `npm run test:coverage` | Generate coverage report |
| `npm run test:vscode` | Run VS Code integration tests |
| `npm run pretest:vscode` | Compile code for VS Code tests |

## Test Organization

- **Unit Tests**: Fast tests using Vitest (no VS Code required)
  - Located in: `test/*.test.ts`
  - Run with: `npm run test`

- **Integration Tests**: Tests running in VS Code
  - Located in: `test/suite/*.test.ts`
  - Run with: `npm run test:vscode`

## Success Criteria

All tests should pass:
- ✅ 65 tests passing
- ✅ 0 tests failing
- ✅ Duration < 5 seconds (excluding intentional waits in cache tests)

## Troubleshooting

### Tests fail to run

```bash
# Reinstall dependencies
npm ci

# Rebuild
npm run compile
```

### VS Code tests fail

```bash
# Ensure code is compiled
npm run pretest:vscode

# Run tests
npm run test:vscode
```

### Module not found errors

Check that all imports use `.js` extensions:

```typescript
// ✅ Correct
import { Something } from './module.js';

// ❌ Incorrect
import { Something } from './module';
```

## More Information

- See [test/README.md](test/README.md) for detailed test documentation
- See [TEST_SUMMARY.md](TEST_SUMMARY.md) for complete test suite overview
