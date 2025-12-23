# Testing Guide for Robert Extension

This document explains how to test the Robert VS Code extension and verify that the blank view issue has been resolved.

## Prerequisites

Before testing, ensure you have:

1. Node.js (v18 or higher)
2. npm (v9 or higher)
3. VS Code (v1.74.0 or higher)

## Setup for Testing

### 1. Clean Installation

```bash
# Clone the repository
git clone https://github.com/trevSmart/robert.git
cd robert

# Install dependencies
npm install

# Build the extension
npm run compile
npm run build:webview
```

### 2. Verify Build Artifacts

Check that the following directories exist and contain files:

```bash
# Check extension code
ls -la out/src/

# Check webview components
ls -la out/webview/

# Verify main.js exists
ls -la out/webview/main.js

# Verify CSS exists
ls -la out/webview/textfield.css
```

Expected output:
- `out/src/extension.js` - Main extension entry point
- `out/webview/main.js` - Main webview React component (≈17 KB)
- `out/webview/settings.js` - Settings webview component (≈20 KB)
- `out/webview/logo.js` - Logo webview component (≈1 KB)
- `out/webview/textfield.css` - Styles for webview (≈131 KB)
- `out/webview/index.js` - React runtime bundle (≈554 KB)

## Running the Extension

### Method 1: Extension Development Host (Recommended)

1. Open the project in VS Code:
   ```bash
   code .
   ```

2. Press `F5` to launch the Extension Development Host

3. In the new window, open the Robert view:
   - Click the IBM bee logo in the Activity Bar (left sidebar), OR
   - Use Command Palette (`Cmd+Shift+P` / `Ctrl+Shift+P`)
   - Run command: `IBM Robert: Open Main View`

### Method 2: Install from VSIX

1. Package the extension:
   ```bash
   npm run package
   ```

2. Install the generated VSIX:
   ```bash
   code --install-extension dist/robert-*.vsix
   ```

3. Reload VS Code and open the Robert view

## What to Test

### 1. Basic View Loading

**Expected Behavior:**
- ✅ The Robert view should display without being blank
- ✅ You should see the IBM logo at the top
- ✅ The text "HOLA MÓN!" should be visible
- ✅ The page should have proper styling (not plain white/black)

**Previously (Bug):**
- ❌ Blank/white screen
- ❌ No content visible
- ❌ Console errors about missing main.js

### 2. Iterations Table

**Test Steps:**
1. Configure Rally settings first (if not configured):
   - Click the gear icon in the Robert view
   - Enter Rally Instance URL (e.g., `https://rally1.rallydev.com`)
   - Enter your Rally API Key
   - Enter your Rally Project Name
   - Click "Save Settings"

2. Click "Load Iterations" button

**Expected Behavior:**
- ✅ Loading indicator appears
- ✅ If configured correctly: List of Rally iterations appears
- ✅ If not configured: Error message appears asking to configure settings

### 3. User Stories

**Test Steps:**
1. After loading iterations, click on an iteration row
2. User stories table should appear below

**Expected Behavior:**
- ✅ User stories for the selected iteration appear
- ✅ Stories display with proper formatting and styling

### 4. Settings View

**Test Steps:**
1. Click the gear icon in the Robert view title bar
2. Settings view should appear

**Expected Behavior:**
- ✅ Settings form loads properly
- ✅ Form fields are styled correctly
- ✅ Can enter and save settings
- ✅ "Back to Main" button works

## Debugging

### View Output Logs

1. Open Output panel: `View > Output`
2. Select "Robert" from the dropdown
3. Check for any error messages

### Enable Debug Mode

Run command: `IBM Robert: Debug: Enable Debug Mode`
- This will show detailed logging in the Robert output channel

### Common Issues

#### Issue: Still seeing blank view

**Solution:**
```bash
# Clean and rebuild
rm -rf out/ dist/ node_modules/
npm install
npm run compile
npm run build:webview
```

Then reload VS Code window (`Developer: Reload Window`)

#### Issue: CSS not loading

**Check:**
- Verify `out/webview/textfield.css` exists
- Check browser DevTools in webview (Help > Toggle Developer Tools)
- Look for 404 errors for CSS files

#### Issue: React not mounting

**Check:**
- Verify `out/webview/main.js` exists
- Check console for "Failed to find root element" error
- Verify HTML has `<div id="root"></div>`

## Success Criteria

The bug is fixed if:

1. ✅ Main view displays content (not blank)
2. ✅ "HOLA MÓN!" text is visible
3. ✅ IBM logo appears at the top
4. ✅ Iterations table loads and displays
5. ✅ User stories can be loaded for an iteration
6. ✅ Settings view works correctly
7. ✅ No console errors in the webview

## Screenshots

### Before (Bug)
- Blank white/black screen
- No content visible

### After (Fixed)
- Content displays properly
- Logo, title, and "HOLA MÓN!" visible
- Tables and buttons styled correctly
- Rally data can be loaded

## Automated Testing

Currently, this extension does not have automated tests. To add tests:

1. Install testing framework: `npm install --save-dev @vscode/test-electron mocha`
2. Create test files in `test/` directory
3. Add test script to `package.json`
4. Run tests: `npm test`

## Additional Resources

- [VS Code Extension API](https://code.visualstudio.com/api)
- [VS Code Webview API](https://code.visualstudio.com/api/extension-guides/webview)
- [React Documentation](https://react.dev/)
- [Vite Documentation](https://vitejs.dev/)
