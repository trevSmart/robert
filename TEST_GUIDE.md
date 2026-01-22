# Robert Extension Testing Guide

This document provides comprehensive information about testing the Robert VS Code extension.

## Overview

The Robert extension uses a multi-layered testing approach:

1. **Unit Tests** - Using Vitest for testing individual components in isolation
2. **Integration Tests** - Using @vscode/test-electron for testing the extension in a real VS Code instance

## Testing Stack

- **[Vitest](https://vitest.dev/)** - Fast unit test framework with TypeScript support
- **[@vscode/test-electron](https://github.com/microsoft/vscode-test)** - Official VS Code extension testing framework
- **[Mocha](https://mochajs.org/)** - Test framework for integration tests
- **[c8](https://github.com/bcoe/c8)** - Code coverage tool

## Project Structure

```
robert/
├── src/
│   ├── **/*.test.ts          # Unit tests colocated with source files
│   ├── ErrorHandler.ts
│   ├── ErrorHandler.test.ts
│   ├── SettingsManager.ts
│   └── SettingsManager.test.ts
├── test/
│   ├── mocks/
│   │   └── vscode.ts         # Mock VS Code API for unit tests
│   ├── integration/
│   │   └── extension.test.ts # Integration tests
│   ├── suite/
│   │   └── index.ts          # Mocha test suite setup
│   └── runTest.ts            # Integration test runner
├── vitest.config.unit.ts     # Vitest config for unit tests
├── vitest.config.integration.ts
└── vitest.workspace.ts       # Multi-project workspace config
```

## Running Tests

### Quick Commands

```bash
# Run all tests (unit + integration)
npm test

# Run only unit tests
npm run test:unit

# Run unit tests in watch mode
npm run test:unit:watch

# Run unit tests with UI
npm run test:unit:ui

# Run integration tests
npm run test:integration

# Generate coverage report
npm run test:coverage
```

### Unit Tests

Unit tests use Vitest and test individual components in isolation:

```bash
# Run all unit tests once
npm run test:unit

# Run unit tests in watch mode (great for development)
npm run test:unit:watch

# Run unit tests with Vitest UI (visual test runner)
npm run test:unit:ui

# Run with coverage
npm run test:coverage
```

Unit tests are colocated with source files (e.g., `SettingsManager.test.ts` next to `SettingsManager.ts`).

### Integration Tests

Integration tests use @vscode/test-electron to test the extension in a real VS Code instance:

```bash
# Run integration tests
npm run test:integration
```

Integration tests are located in `test/integration/` and test:
- Extension activation
- Command registration
- Configuration availability
- Real VS Code API interactions

### Coverage

Generate and view test coverage:

```bash
npm run test:coverage
```

Coverage reports are generated in:
- `coverage/` - HTML coverage report (open `coverage/index.html` in browser)
- Console output with text summary

## Writing Tests

### Unit Tests

Unit tests should be colocated with the source file:

```typescript
// src/MyComponent.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MyComponent } from './MyComponent';

describe('MyComponent', () => {
  let component: MyComponent;

  beforeEach(() => {
    vi.clearAllMocks();
    component = new MyComponent();
  });

  describe('myMethod', () => {
    it('should do something', () => {
      const result = component.myMethod();
      expect(result).toBe('expected');
    });
  });
});
```

### Mocking VS Code API

The project includes a mock VS Code API at `test/mocks/vscode.ts`:

```typescript
import * as vscode from 'vscode'; // Automatically uses mock

// Mock is configured via vitest.config.unit.ts alias
// All VS Code API calls in unit tests use the mock
```

To customize mock behavior in a specific test:

```typescript
import { vi } from 'vitest';
import * as vscode from 'vscode';

it('should show error message', () => {
  const mockShowError = vi.mocked(vscode.window.showErrorMessage);
  
  myFunction();
  
  expect(mockShowError).toHaveBeenCalledWith('Error message');
});
```

### Integration Tests

Integration tests use real VS Code API:

```typescript
// test/integration/myfeature.test.ts
import * as assert from 'node:assert';
import * as vscode from 'vscode';

suite('My Feature Test Suite', () => {
  test('Should activate extension', async () => {
    const ext = vscode.extensions.getExtension('trevSmart.robert');
    assert.ok(ext);
    
    await ext.activate();
    assert.strictEqual(ext.isActive, true);
  });
});
```

## Test Configuration

### Vitest Configuration

The project uses workspace configuration for multiple test types:

**vitest.workspace.ts**
```typescript
import { defineWorkspace } from 'vitest/config';

export default defineWorkspace([
  'vitest.config.unit.ts',      // Unit tests
  'vitest.config.integration.ts' // Future vitest integration tests
]);
```

**vitest.config.unit.ts**
- Tests: `src/**/*.test.ts`
- Environment: Node.js
- Mocks: VS Code API via alias
- Coverage: Enabled with c8

### VS Code Test Configuration

**test/runTest.ts**
- Downloads VS Code if needed
- Launches Extension Development Host
- Runs tests from `test/suite/`

## Continuous Integration

Tests run automatically on:
- Pull requests
- Commits to main branch
- Pre-release builds

### CI Configuration

Add to `.github/workflows/test.yml`:

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run unit tests
        run: npm run test:unit
      
      - name: Run integration tests
        run: xvfb-run -a npm run test:integration
      
      - name: Upload coverage
        uses: codecov/codecov-action@b9fd7d16f6d7d1b5d2bec1a2887e65ceed900238 # v4
        with:
          files: ./coverage/coverage-final.json
          token: ${{ secrets.CODECOV_TOKEN }}
```

## Best Practices

### Unit Tests

1. **Test in isolation** - Mock all external dependencies
2. **One assertion per test** - Keep tests focused
3. **Use descriptive names** - Clearly state what is being tested
4. **Reset state** - Use `beforeEach` to reset mocks and state
5. **Test edge cases** - Test error conditions and boundary values

### Integration Tests

1. **Test user workflows** - Test features as users would use them
2. **Keep tests independent** - Don't rely on test execution order
3. **Use real VS Code API** - Don't mock VS Code in integration tests
4. **Test configuration** - Verify settings work correctly
5. **Clean up resources** - Dispose created resources in teardown

### General

1. **Write tests first** - TDD helps design better APIs
2. **Keep tests fast** - Fast tests encourage running them often
3. **Maintain high coverage** - Aim for >80% code coverage
4. **Update tests with code** - Keep tests in sync with implementation
5. **Document complex tests** - Add comments for non-obvious test logic

## Debugging Tests

### Unit Tests

Debug unit tests in VS Code:

1. Add a breakpoint in your test file
2. Open the test file
3. Click "Debug" button in Vitest UI, or
4. Add to `.vscode/launch.json`:

```json
{
  "type": "node",
  "request": "launch",
  "name": "Debug Unit Tests",
  "runtimeExecutable": "npm",
  "runtimeArgs": ["run", "test:unit"],
  "console": "integratedTerminal",
  "internalConsoleOptions": "neverOpen"
}
```

### Integration Tests

Debug integration tests:

1. Add a breakpoint in your test file
2. Press F5 to launch Extension Development Host
3. The breakpoint will be hit when the test runs

Or add to `.vscode/launch.json`:

```json
{
  "type": "extensionHost",
  "request": "launch",
  "name": "Debug Integration Tests",
  "runtimeExecutable": "${execPath}",
  "args": [
    "--extensionDevelopmentPath=${workspaceFolder}",
    "--extensionTestsPath=${workspaceFolder}/out/test/suite/index"
  ],
  "outFiles": ["${workspaceFolder}/out/**/*.js"]
}
```

## Troubleshooting

### Unit Tests

**Problem: Tests can't find modules**
- Solution: Check `vitest.config.unit.ts` alias configuration
- Ensure TypeScript paths are properly configured

**Problem: Mock not working**
- Solution: Verify mock is imported before the code being tested
- Clear mocks with `vi.clearAllMocks()` in `beforeEach`

**Problem: Singleton state persists between tests**
- Solution: Reset singleton instances in `beforeEach`:
  ```typescript
  beforeEach(() => {
    (MySingleton as any).instance = undefined;
  });
  ```

### Integration Tests

**Problem: Extension not found**
- Solution: Ensure `package.json` has correct publisher and name
- Run `npm run compile` before running tests

**Problem: Tests timeout**
- Solution: Increase timeout in `test/suite/index.ts`:
  ```typescript
  const mocha = new Mocha({
    timeout: 60000 // 60 seconds
  });
  ```

**Problem: Tests fail in CI but pass locally**
- Solution: Use `xvfb-run -a` on Linux for headless testing
- Add `--disable-gpu --no-sandbox` launch args

## Examples

### Testing a Singleton

```typescript
describe('MySingleton', () => {
  beforeEach(() => {
    // Reset singleton for each test
    (MySingleton as any).instance = undefined;
  });

  it('should return same instance', () => {
    const instance1 = MySingleton.getInstance();
    const instance2 = MySingleton.getInstance();
    expect(instance1).toBe(instance2);
  });
});
```

### Testing Async Functions

```typescript
it('should fetch data', async () => {
  const data = await myAsyncFunction();
  expect(data).toBeDefined();
});
```

### Testing Error Handling

```typescript
it('should handle errors gracefully', () => {
  const mockFn = vi.fn().mockImplementation(() => {
    throw new Error('Test error');
  });

  const result = errorHandler.executeWithErrorHandlingSync(
    mockFn,
    'Test'
  );

  expect(result).toBeUndefined();
  expect(vscode.window.showErrorMessage).toHaveBeenCalled();
});
```

### Testing VS Code Commands

```typescript
suite('Commands', () => {
  test('Should register commands', async () => {
    const commands = await vscode.commands.getCommands(true);
    assert.ok(commands.includes('robert.helloWorld'));
  });

  test('Should execute command', async () => {
    await vscode.commands.executeCommand('robert.helloWorld');
    // Verify command effects
  });
});
```

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [VS Code Extension Testing](https://code.visualstudio.com/api/working-with-extensions/testing-extension)
- [@vscode/test-electron](https://github.com/microsoft/vscode-test)
- [Mocha Documentation](https://mochajs.org/)
- [VS Code Extension Samples](https://github.com/microsoft/vscode-extension-samples)

## Contributing

When adding new features:

1. Write unit tests for new components
2. Update integration tests for new commands/features
3. Ensure all tests pass: `npm test`
4. Maintain or improve code coverage
5. Document complex test scenarios

For bug fixes:

1. Write a failing test that reproduces the bug
2. Fix the bug
3. Verify the test now passes
4. Ensure no regressions in other tests
