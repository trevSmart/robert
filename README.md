## <img src="resources/icons/ibm-logo.webp" alt="IBM logo" width="50" style="position: relative; margin-right: 10px; top: 4px;"/> Robert - VS Code Extension

[![Dependabot automerge](https://github.com/trevSmart/robert/actions/workflows/dependabot-automerge.yml/badge.svg)](https://github.com/trevSmart/robert/actions/workflows/dependabot-automerge.yml)
[![CodeQL Advanced](https://github.com/trevSmart/robert/actions/workflows/codeql.yml/badge.svg)](https://github.com/trevSmart/robert/actions/workflows/codeql.yml)

Robert is a VS Code extension that integrates with Rally (Agile project management tool) to help you manage your projects, iterations, and user stories directly from VS Code.

## 🚀 Getting Started

### Prerequisites

- VS Code (v1.105.1 or higher)

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
- `npm run lint` - Lint all source files
- `npm run lint:fix` - Lint and auto-fix issues
- `npm run format` - Format code with Prettier
- `npm run package` - Create VSIX package

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

For automated testing and AI agents, see [ENVIRONMENT_VARIABLES.md](ENVIRONMENT_VARIABLES.md) and [test/AI_AGENT_TESTING.md](test/AI_AGENT_TESTING.md).

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
