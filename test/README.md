# Robert Extension - Test Suite

This directory contains the test suite for the IBM Robert VS Code extension.

## Test Structure

The test suite is organized into the following test files:

### Unit Tests (Vitest)

- **CacheManager.test.ts** - Tests for the cache management system
  - Basic operations (set, get, delete, clear)
  - TTL expiration
  - Statistics tracking
  - Cache size and entries
  - Edge cases and concurrent operations

- **SettingsManager.test.ts** - Tests for settings management
  - Singleton pattern
  - Getting and setting configuration values
  - Settings validation
  - Rally configuration validation

- **ErrorHandler.test.ts** - Tests for error handling
  - Singleton pattern
  - Error logging (errors, warnings, info, debug)
  - Async and sync error handling
  - View lifecycle logging

- **OutputChannelManager.test.ts** - Tests for output channel management
  - Singleton pattern
  - Output channel operations (append, show, clear)
  - Disposal

- **extension.test.ts** - Tests for extension lifecycle
  - Extension activation
  - Extension deactivation
  - Rally data structure

## Running Tests

### Run All Unit Tests

```bash
npm run test
```

### Run Tests in Watch Mode

```bash
npm run test:watch
```

### Run Tests with UI

```bash
npm run test:ui
```

### Run Tests with Coverage

```bash
npm run test:coverage
```

### Run VS Code Integration Tests

```bash
npm run test:vscode
```

## Testing with AI Agents

If you're testing the Robert extension with automated AI agents in virtual environments:

- **[AI Agent Testing Guide](./AI_AGENT_TESTING.md)** - Complete guide for setting up the extension for AI agent testing
- **[Setup Script](./example-ai-agent-setup.sh)** - Automated environment setup for agents
- **[Environment Variables Reference](../ENVIRONMENT_VARIABLES.md)** - All supported environment variables

The extension supports environment variable configuration, making it easy to test without modifying VS Code settings:

```bash
# Set Rally configuration via environment variables
export ROBERT_RALLY_API_KEY="your-api-key"
export ROBERT_RALLY_INSTANCE="https://rally1.rallydev.com"
export ROBERT_RALLY_PROJECT_NAME="TestProject"

# Run tests
npm test
```

## Test Configuration

### Vitest Configuration

The unit tests use Vitest as the test runner. Configuration is in `vitest.config.ts`:

- **Environment**: Node.js
- **Test Pattern**: `**/*.test.ts`
- **Coverage**: V8 provider with text, JSON, and HTML reporters
- **Timeout**: 10 seconds

### VS Code Test Configuration

VS Code integration tests use the VS Code Test CLI. Configuration is in `.vscode-test.js`:

- **Test Pattern**: `out/test/**/*.test.js`
- **VS Code Version**: Stable
- **Workspace**: `./test-workspace`
- **Test Framework**: Mocha with TDD UI
- **Timeout**: 20 seconds

## Writing Tests

### Unit Tests

Unit tests use Vitest with the following structure:

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('ComponentName', () => {
  beforeEach(() => {
    // Setup before each test
  });

  describe('methodName', () => {
    it('should do something', () => {
      // Test implementation
      expect(result).toBe(expected);
    });
  });
});
```

### Mocking VS Code API

The VS Code API is mocked in tests using Vitest's `vi.mock`:

```typescript
vi.mock('vscode', () => ({
  window: {
    createOutputChannel: vi.fn(() => ({
      appendLine: vi.fn(),
      show: vi.fn()
    }))
  }
}));
```

## Test Coverage

Run `npm run test:coverage` to generate coverage reports. Coverage reports are generated in:

- **Text**: Console output
- **JSON**: `coverage/coverage-final.json`
- **HTML**: `coverage/index.html`

## Continuous Integration

Tests are run automatically in CI/CD pipelines. Ensure all tests pass before merging PRs.

## Troubleshooting

### VS Code Module Not Found

If you encounter errors about the `vscode` module not being found, ensure that:

1. The `@types/vscode` package is installed
2. The VS Code API is properly mocked in your tests
3. You're using the correct import syntax

### Test Timeouts

If tests are timing out:

1. Increase the timeout in `vitest.config.ts` or `.vscode-test.js`
2. Check for async operations that aren't being awaited
3. Use `vi.useFakeTimers()` for time-based tests

### Mock Conflicts

If you encounter mock conflicts:

1. Use `vi.clearAllMocks()` in `beforeEach()` hooks
2. Ensure mocks are properly scoped to test files
3. Use `vi.resetModules()` if needed

## Contributing

When adding new features:

1. Write tests for new functionality
2. Ensure all tests pass before submitting PRs
3. Maintain test coverage above 70%
4. Follow existing test patterns and conventions
