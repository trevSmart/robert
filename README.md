## <img src="resources/icons/ibm-logo-modern.webp" alt="IBM logo" width="50" style="position: relative; margin-right: 10px; top: 4px;"/> Robert - VS Code Extension

[![Dependabot Updates](https://github.com/trevSmart/robert/actions/workflows/dependabot/dependabot-updates/badge.svg)](https://github.com/trevSmart/robert/actions/workflows/dependabot/dependabot-updates)
[![CodeQL Advanced](https://github.com/trevSmart/robert/actions/workflows/codeql.yml/badge.svg)](https://github.com/trevSmart/robert/actions/workflows/codeql.yml)

Robert is a VS Code extension that integrates with Rally (Agile project management tool) to help you manage your projects, iterations, and user stories directly from VS Code.

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm (v9 or higher)
- VS Code (v1.74.0 or higher)

### Installation from Source

1. Clone the repository:
   ```bash
   git clone https://github.com/trevSmart/robert.git
   cd robert
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the extension:
   ```bash
   npm run compile
   npm run build:webview
   ```

4. Open the project in VS Code:
   ```bash
   code .
   ```

5. Press `F5` to run the extension in a new Extension Development Host window.

### Installation from VSIX

1. Download the latest `.vsix` file from the [releases page](https://github.com/trevSmart/robert/releases)
2. Install it in VS Code:
   ```bash
   code --install-extension robert-x.x.x.vsix
   ```

## 🔧 Development

### Available Scripts

- `npm run compile` - Compile TypeScript extension code
- `npm run build:webview` - Build React webview components
- `npm run watch` - Watch mode for TypeScript compilation
- `npm run watch:webview` - Watch mode for webview components
- `npm run lint` - Lint all source files
- `npm run lint:fix` - Lint and auto-fix issues
- `npm run format` - Format code with Prettier
- `npm run package` - Create VSIX package
- `npm test` - Run all tests (unit + integration)
- `npm run test:unit` - Run unit tests with Vitest
- `npm run test:unit:watch` - Run unit tests in watch mode
- `npm run test:coverage` - Generate test coverage report
- `npm run test:integration` - Run integration tests with VS Code

### Building from Scratch

If you encounter a blank view or other issues, rebuild the extension:

```bash
# Clean build artifacts
rm -rf out/ dist/

# Reinstall dependencies
npm install

# Build everything
npm run compile
npm run build:webview
```

## 🧪 Testing

Robert uses a comprehensive testing approach:

- **Unit Tests**: Fast, isolated tests using [Vitest](https://vitest.dev/)
- **Integration Tests**: Full extension tests using [@vscode/test-electron](https://github.com/microsoft/vscode-test)

### Running Tests

```bash
# Run all tests
npm test

# Run only unit tests
npm run test:unit

# Run unit tests in watch mode (great for development)
npm run test:unit:watch

# Generate coverage report
npm run test:coverage

# Run integration tests (requires VS Code)
npm run test:integration
```

### Test Coverage

Current test coverage: **52%** and growing! 🎯

### Writing Tests

See [TEST_GUIDE.md](TEST_GUIDE.md) for detailed information on:
- Writing unit tests
- Writing integration tests
- Debugging tests
- Best practices
- Examples

## 📋 Configuration

Configure Rally settings in VS Code:

1. Open Settings (`Cmd+,` or `Ctrl+,`)
2. Search for "Robert"
3. Configure:
   - **Rally Instance URL**: Your Rally server URL (e.g., `https://rally1.rallydev.com`)
   - **Rally API Key**: Your Rally API key
   - **Rally Project Name**: The project you want to connect to

Or use the command palette:
- `IBM Robert: Open Settings`

## 🐛 Troubleshooting

### Blank View Issue

If you see a blank view when opening Robert:

1. Ensure you've built the webview components:
   ```bash
   npm run build:webview
   ```

2. Verify that `out/webview/` directory exists and contains `.js` files

3. Reload VS Code window (`Developer: Reload Window`)

### Other Issues

- Check the "Robert" output channel: `View > Output > Robert`
- Enable debug mode: `IBM Robert: Debug: Enable Debug Mode`

## 📝 License

See [LICENSE.md](LICENSE.md) for details.