# IBM Robert — Standalone desktop app (Electron)

Robert ships in two flavours built from **the same codebase**:

| | VS Code extension | Standalone app |
|---|---|---|
| Entry point | `src/extension.ts` | `src/standalone/main.ts` |
| Host | VS Code extension host | Electron main process |
| UI | Webview view / panel | `BrowserWindow` |
| Settings UI | VS Code Settings (`robert.*`) | Generated Settings window (Cmd/Ctrl+,) |
| Settings storage | VS Code `settings.json` | `<userData>/settings.json` (tokens encrypted with the OS keychain via `safeStorage`) |
| `globalState` | VS Code Memento | `<userData>/globalState.json` |
| "Robert" output channel | Output panel | `<userData>/logs/robert.log` (View → Show Logs) |
| Package | `npm run package` → `dist/*.vsix` | `npm run standalone:package` → `dist/standalone/` |

`<userData>` is `~/Library/Application Support/IBM Robert` on macOS, `%APPDATA%\IBM Robert` on Windows and `~/.config/IBM Robert` on Linux. Set `ROBERT_STANDALONE_USER_DATA` to use another profile directory. The `ROBERT_*` environment variables documented in [ENVIRONMENT_VARIABLES.md](../ENVIRONMENT_VARIABLES.md) keep working as fallbacks.

## How it works

Nothing in the product code is forked. The standalone app plays the role VS Code plays for the extension:

```
React webview (src/webview/**)              ← unchanged
   │ acquireVsCodeApi().postMessage / window "message" events
   ▼
preload.ts  ── IPC ──  ElectronWebview (implements vscode.Webview)
                                │
RobertWebviewProvider, WebviewMessageDispatcher, handlers,   ← unchanged
SettingsManager, ErrorHandler, Jira/Rally providers
                                │ require('vscode')
                                ▼
                   host/vscodeShim.ts (subset of the vscode API)
                     ├─ ConfigurationStore  (workspace.getConfiguration)
                     ├─ FileMemento         (context.globalState)
                     ├─ FileLogChannel      (window.createOutputChannel)
                     └─ Electron            (notifications, openExternal, clipboard)
```

- `installVscodeModule.ts` hooks `Module._load` so every `require('vscode')` in the compiled backend gets the shim.
- `appProtocol.ts` serves the webview bundle and resources over a private `robert-app://` scheme (the counterpart of `vscode-webview://` URIs) and confines reads to the app root.
- `host/theme.ts` injects the `--vscode-*` CSS variables and the `vscode-dark` / `vscode-light` body class that VS Code normally provides, following the OS theme.
- Windows run with `contextIsolation` and `sandbox`; navigation away from the app is blocked and web links open in the default browser.

## Developing

```bash
npm run standalone:start    # tsc + vite build, then launch Electron
npm run standalone:dev      # launch without rebuilding
npm run standalone:package  # build installers for the current OS into dist/standalone/
```

Both launch commands go through `scripts/standalone-launch.cjs`, which:

- removes `ELECTRON_RUN_AS_NODE` from the environment (terminals inside VS Code export it, and it makes Electron behave like plain Node: `Cannot find module 'electron'`);
- on macOS, runs Electron from a cached copy of the bundle renamed to **IBM Robert** with Robert's icon (`node_modules/.cache/robert-standalone/`, rebuilt when Electron or the icon change). The Dock name, the app menu title and the Dock icon come from the bundle's `Info.plist`, so the stock `node_modules/electron` binary would show "Electron" with Electron's icon. Packaged builds get the right name and icon from electron-builder.

Running `electron out/src/standalone/main.js` directly still works, just with Electron's name and icon.

Running from source enables the same dev features as the F5 Extension Development Host (Test tab, verbose logging, log mirroring to the terminal).

## Keeping both versions working

- **Put product logic in shared code** (`src/webview/**`, message handlers, `src/libs/**`). Both hosts get it for free.
- **Using a new `vscode` API in shared code?** Add it to `src/standalone/host/vscodeShim.ts` (or make it a no-op / clear "not available in the standalone app" error). `src/standalone/host/sharedCodeOnShim.test.ts` exercises shared code on the shim — extend it when you add shim surface.
- **New `--vscode-*` CSS variable in the webview?** Add it to both palettes in `host/theme.ts`; `host.test.ts` fails if a variable used in `src/webview` is missing.
- **New setting?** Declare it in `package.json` `contributes.configuration` as usual — the standalone Settings window is generated from it. Secrets must also be listed in `SECRET_SETTING_KEYS` (`host/ConfigurationStore.ts`).
- **New command in `extension.ts`?** If it makes sense outside VS Code, register it in `main.ts` and/or add it to the app menu.

## Not available in the standalone app

These depend on VS Code itself and degrade gracefully (logged, or a notification):

- Status bar item and its tooltip.
- "Open tutorial in editor" (needs a text editor).
- Test-tab experiments that use VS Code / Cursor chat and `vscode.lm`.

## Packaging notes

- `electron-builder.yml` overrides `main` to `out/src/standalone/main.js`; the VS Code extension keeps using `package.json` `main`.
- Builds are unsigned by default. Code signing / notarization for macOS and Windows needs certificates configured in CI (see the electron-builder docs) before distributing installers broadly.
- The VSIX excludes `out/src/standalone/**` (`.vscodeignore`), and `electron` / `electron-builder` are dev dependencies, so the extension package is unaffected.
