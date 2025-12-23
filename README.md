## <img src="resources/icons/ibm-logo.webp" alt="IBM logo" width="50" style="position: relative; margin-right: 10px; top: 4px;"/> Robert - VS Code Extension

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

2. Install dependencies (automatically builds webview components via `prepare` script):
   ```bash
   npm install
   ```

3. Open the project in VS Code:
   ```bash
   code .
   ```

4. Press `F5` to run the extension in a new Extension Development Host window.

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

### Building from Scratch

If you encounter a blank view or other issues, rebuild the extension:

```bash
# Clean build artifacts
rm -rf out/ dist/

# Reinstall dependencies (automatically rebuilds via prepare script)
npm install
```

**Note:** The `prepare` script automatically runs `npm run build:webview` and compiles TypeScript after `npm install`.

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

**Note:** As of version 0.0.12, the extension automatically builds webview components after `npm install` via the `prepare` script. If you still encounter a blank view:

1. The extension will show a helpful error page with instructions if build files are missing
2. Check if the `out/webview/` directory exists and contains `.js` files
3. If missing, run:
   ```bash
   npm run build:webview
   ```
4. Reload VS Code window (`Developer: Reload Window`)

### Other Issues

- Check the "Robert" output channel: `View > Output > Robert`
- Enable debug mode: `IBM Robert: Debug: Enable Debug Mode`

## 📝 License

See [LICENSE.md](LICENSE.md) for details.