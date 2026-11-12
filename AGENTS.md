# Robert - Agent Context Guide

Aquest document proporciona context complet del projecte Robert per agents IA, assegurant una comprensió ràpida i precisa de l'estructura, funcionalitat i arquitectura del projecte.

## 📋 Resum Executiu

**Robert** és una eina d'IBM que integra Jira Cloud i Rally (gestió de projectes Agile) en una interfície React per visualitzar i gestionar projectes, sprints, usuaris i issues.

Es distribueix en **dues versions que es mantenen en paral·lel a partir del mateix codi**:
1. **Extensió de VS Code** (`src/extension.ts`): la UI viu dins d'un webview de VS Code.
2. **App d'escriptori standalone** (Electron, `src/standalone/main.ts`): la mateixa UI en una finestra pròpia, per a qui no fa servir VS Code. Vegeu la secció «🖥️ Versió Standalone (Electron)» més avall i [docs/STANDALONE.md](docs/STANDALONE.md).

### Informació Clau del Projecte
- **Nom**: Robert (IBM Robert)
- **Versió**: vegeu `version` a `package.json` (la comparteixen les dues versions)
- **Publisher**: trevSmart
- **Tipus**: VS Code Extension + app d'escriptori Electron
- **Tecnologies**: TypeScript, React, Vite, Electron, Jira Cloud REST API v3, Rally WSAPI
- **Repositori**: https://github.com/trevSmart/robert.git

## 🏗️ Arquitectura del Projecte

### Estructura de Directoris

```
Robert/
├── src/                          # Codi font TypeScript
│   ├── extension.ts              # Punt d'entrada de l'extensió de VS Code
│   ├── RobertWebviewProvider.ts  # Gestor de webviews
│   ├── SettingsManager.ts        # Gestió de configuració
│   ├── ErrorHandler.ts           # Gestió d'errors centralitzada
│   ├── libs/jira/                # Integració amb Jira Cloud REST API
│   ├── libs/rally/               # Integració amb Rally
│   ├── libs/provider/            # Selecció del provider actiu (Jira / Rally)
│   ├── standalone/              # Host de l'app d'escriptori (Electron)
│   ├── templates/               # Plantilles HTML per webviews
│   ├── types/                   # Definicions de tipus TypeScript
│   ├── utils/                   # Utilitats compartides
│   └── webview/                 # Components React per webviews
├── out/                         # Codi compilat JavaScript
├── resources/                   # Recursos (icones, imatges)
├── scripts/                     # Scripts auxiliars (p. ex. standalone-launch.cjs)
├── docs/STANDALONE.md           # Documentació de l'app standalone
├── electron-builder.yml         # Empaquetat de l'app standalone
├── dist/                        # Paquets VSIX i dist/standalone/ (instal·ladors)
└── tmp/                         # Fitxers temporals
```

### Components Principals

#### 1. **Extension Entry Point** (`src/extension.ts`)
- Punt d'activació de l'extensió
- Registra comandaments i webview providers
- Gestiona l'estat global de Jira (`jiraData`)
- Implementa status bar amb tooltip interactiu
- Detecta mode debug automàticament

#### 2. **Webview Provider** (`src/RobertWebviewProvider.ts`)
- Implementa `WebviewViewProvider` i `CustomTextEditorProvider`
- Gestiona múltiples tipus de webviews:
  - Activity bar view (vista lateral)
  - Custom editor (pestanya d'editor)
  - Separate panel (finestra independent)
- Suporta navegació entre vista principal i configuració
- Persistència d'estat per webview

#### 3. **Settings Manager** (`src/SettingsManager.ts`)
- Singleton per gestionar configuració persistent
- Integració amb VS Code Configuration API
- Validació automàtica de settings
- Suport per settings de Jira (email, API token, base URL, project key)

#### 4. **Error Handler** (`src/ErrorHandler.ts`)
- Gestió centralitzada d'errors
- Logging estructurat al canal "Robert"
- Decoradors per maneig automàtic d'errors
- Captura d'errors globals (unhandled rejections, exceptions)

#### 5. **Jira Integration** (`src/libs/jira/`)
- **jiraServices.ts**: Funcions per consultar Jira Cloud API
  - `getProjects()`: Obtenir projectes
  - `getUsers()`: Obtenir usuaris
  - `getUserStories()`: Obtenir user stories
- **utils.ts**: Utilitats per configuració i queries de Jira
- Cache intel·ligent per optimitzar crides API

## 🔧 Configuració i Settings

### Settings Disponibles

| Setting | Tipus | Default | Descripció |
|---------|-------|---------|------------|
| `robert.apiEndpoint` | string | `https://your-site.atlassian.net` | Endpoint API |
| `robert.refreshInterval` | number | `30` | Interval refresc (5-3600s) |
| `robert.theme` | string | `auto` | Tema (`auto`, `light`, `dark`, `high-contrast`) |
| `robert.autoRefresh` | boolean | `true` | Refresc automàtic |
| `robert.notifications` | boolean | `true` | Notificacions |
| `robert.debugMode` | boolean | `false` | Mode debug |
| `robert.advancedFeatures` | boolean | `false` | Funcions avançades |
| `robert.maxResults` | number | `100` | Màxim resultats (10-1000) |
| `robert.timeout` | number | `5000` | Timeout peticions (1000-60000ms) |
| `robert.jiraBaseUrl` | string | `https://jiracloudab.atlassian.net` | URL base de Jira Cloud |
| `robert.jiraEmail` | string | `""` | Email del compte Atlassian |
| `robert.jiraApiToken` | string | `""` | Token API de Jira |
| `robert.jiraProjectKey` | string | `DSS` | Clau del projecte Jira |

### Persistència
- Settings es guarden a configuració global VS Code
- Es mantenen entre sessions
- Es poden sincronitzar amb VS Code Sync

### Resolució de Configuració (Prioritat)

L'extensió resol la configuració en aquest ordre:

1. **VS Code Settings** (prioritat alta) - Configuració de l'usuari en VS Code
2. **Variables d'Entorn** (prioritat mitjana) - Variables del sistema (per a agents IA i CI/CD)
3. **Valors per Defecte** (prioritat baixa) - Defaults de l'extensió

Això permet que les agències IA configuren la connexió a Jira sense modificar fitxers de configuració de VS Code.

### Variables d'Entorn Suportades

Per a entorns de testing automatitzat i agentes IA:

```bash
# Jira Configuration
export ROBERT_JIRA_EMAIL="you@example.com"
export ROBERT_JIRA_API_TOKEN="your-api-token"
export ROBERT_JIRA_BASE_URL="https://your-site.atlassian.net"
export ROBERT_JIRA_PROJECT_KEY="DSS"

# Extension Settings
export ROBERT_DEBUG_MODE="true"
export ROBERT_AUTO_REFRESH="true"
export ROBERT_COLLABORATION_ENABLED="false"
```

**Documentació completa**: [ENVIRONMENT_VARIABLES.md](ENVIRONMENT_VARIABLES.md)

**Guia per a Agentes IA**: [test/AI_AGENT_TESTING.md](test/AI_AGENT_TESTING.md)

## 🎯 Funcionalitats Principals

### 1. **Integració Jira**
- Connexió amb Jira Cloud REST API v3 (fetch natiu, Basic auth)
- Consulta de projectes, usuaris i user stories
- Cache intel·ligent per optimitzar rendiment
- Validació de configuració abans de crides API

### 2. **Interfície Webview**
- **Vista Principal**: Mostra informació de Jira amb logo IBM
- **Vista Configuració**: Gestió de settings amb validació
- **Vista Logo**: Pantalla de logo IBM
- Suport per múltiples contexts (activity bar, editor, panel)

### 3. **Gestió d'Errors**
- Logging centralitzat al canal "Robert"
- Maneig d'errors amb fallback automàtic
- Notificacions d'error a l'usuari
- Stack traces detallats per debugging

### 4. **Status Bar**
- Item de status bar amb estats dinàmics
- Tooltip interactiu amb controls
- Comandaments per obrir panells

## 🛠️ Tecnologies i Dependències

### Core Dependencies
- **@types/vscode**: Tipus per VS Code API
- **typescript**: Compilador TypeScript

### Frontend Dependencies
- **react**: Framework UI
- **react-dom**: Renderitzat React
- **@types/react**: Tipus React
- **vite**: Build tool per webviews
- **@vitejs/plugin-react**: Plugin React per Vite

### Development Dependencies
- **@ESLint**: Linter i formatter
- **@vscode/vsce**: Packaging tool per extensions
- **vscrui**: UI components per VS Code
- **electron**: Runtime de l'app standalone (només devDependency; no entra al VSIX)
- **electron-builder**: Empaquetat de l'app standalone (dmg/zip, nsis, AppImage)

## 📝 Comandaments Disponibles

### Comandaments Principals
- `robert.helloWorld`: Missatge de benvinguda
- `robert.openView`: Obrir vista IBM Robert
- `robert.openMainView`: Obrir vista principal
- `robert.openSettings`: Obrir configuració
- `robert.openExtensionSettings`: Obrir configuració extensió
- `robert.showOutput`: Mostrar canal sortida Robert
- `robert.showPanelIfHidden`: Mostrar panell si està ocult


## 🐛 Debugging i Logging

### Canal de Sortida "Robert"
Any action performed by our extension must be logged to the "Robert" Output channel. Any errors or warnings must also be registered in the "Robert" Output channel.

A l'app standalone el mateix canal s'escriu a `<userData>/logs/robert.log` (menú View → Show Logs); des del codi font també surt pel terminal.
```
[Robert] ℹ️ INFO in Context:
[Robert] Time: 2024-01-15T10:30:00.000Z
[Robert] Message: Description
[Robert] ---
```

### Mode Debug
- Detecció automàtica de mode desenvolupament
- Logging verbose quan està habilitat
- Informació detallada d'extensió
- Focus automàtic al canal de sortida

### Tipus de Logs
- **INFO**: Informació general
- **WARNING**: Advertències
- **ERROR**: Errors amb stack trace
- **VIEW CREATED**: Creació de webviews
- **VIEW DESTROYED**: Destrucció de webviews

## 📦 Build i Packaging

### Scripts Disponibles
- `npm run compile`: Compilar TypeScript i formatar codi
- `npm run build:webview`: Construir webviews amb Vite
- `npm run watch`: Watch mode per desenvolupament
- `npm run lint`: Linting i formatatge
- `npm run package`: Generar paquet VSIX
- `npm run package:patch`: Incrementar versió i empaquetar
- `npm run standalone:build`: Compilar TypeScript + webview per a l'app standalone
- `npm run standalone:start`: Build + arrencar l'app standalone des del codi font
- `npm run standalone:dev`: Arrencar l'app standalone sense recompilar
- `npm run standalone:package`: Generar els instal·ladors de l'app standalone a `dist/standalone/`

### Build Process
1. **TypeScript Compilation**: `tsc -p ./`
2. **Webview Build**: `vite build` (React components)
3. **Linting**: `eslint --fix .`
4. **Packaging**: `vsce package --out dist/` (extensió) · `electron-builder --config electron-builder.yml` (standalone)

## 🎨 Interfície d'Usuari

### Webviews React
- **MainWebview.tsx**: Vista principal amb informació Jira
- **SettingsWebview.tsx**: Gestió de configuració
- **LogoWebview.tsx**: Pantalla de logo IBM

### Templates HTML
- **mainWebview.html**: Template principal
- **settingsWebview.html**: Template configuració
- **logoWebview.html**: Template logo

### Recursos
- **robert-logo-simple.png**: Logo IBM per activity bar
- **robert-logo.png**: Logo IBM per webviews
- **ibm-logo.webp**: Logo IBM general

## 🔒 Seguretat i Configuració

### API Keys
- El token API de Jira es guarda a configuració VS Code (extensió) o a `<userData>/settings.json` xifrat amb el clauer del sistema via `safeStorage` (app standalone)
- No es loggeja ni es mostra en plain text
- Validació abans d'utilitzar

### Configuració Jira
- URL base de Jira Cloud (HTTPS obligatori)
- Nom projecte per filtrar dades
- Timeout configurable per peticions

## 🚀 Desplegament

### Desenvolupament
1. `npm install`: Instal·lar dependències
2. `npm run watch`: Mode desenvolupament
3. F5 per executar Extension Development Host

### Producció
1. `npm run compile`: Compilar codi
2. `npm run build:webview`: Construir webviews
3. `npm run package`: Generar VSIX
4. `vsce publish`: Publicar a marketplace

### App standalone
1. `npm run standalone:start` per desenvolupar-la (equivalent a F5 per l'extensió)
2. `npm run standalone:package` per generar els instal·ladors del sistema operatiu actual a `dist/standalone/` (sense signar per defecte)

## 🖥️ Versió Standalone (Electron)

Robert es distribueix en **dues versions que s'han de mantenir totes dues**: l'extensió de VS Code i una aplicació d'escriptori standalone (Electron). Comparteixen tot el codi de producte; la versió standalone només afegeix un "host" a `src/standalone/` que fa el paper de VS Code.

- **Entrada**: `src/standalone/main.ts` (l'extensió continua sent `src/extension.ts`).
- **Shim de `vscode`**: `src/standalone/host/vscodeShim.ts` implementa el subconjunt de l'API de VS Code que fa servir el backend (configuració, output channel, `globalState`, notificacions, `openExternal`, comandes). `installVscodeModule.ts` fa que `require('vscode')` el retorni.
- **Webview**: `ElectronWebview.ts` implementa `vscode.Webview` sobre una `BrowserWindow`; `preload.ts` exposa `acquireVsCodeApi()` a la UI React.
- **Settings**: finestra generada a partir de `contributes.configuration` del `package.json`; es desen a `<userData>/settings.json` amb els tokens xifrats (`safeStorage`). Només es desen els camps editats; els no configurats segueixen les variables `ROBERT_*` i després el default, i el botó **Reset** elimina un valor explícit. Sense clauer real (Linux amb backend `basic_text`) no es desen tokens: cal fer servir variables d'entorn.
- **Precedència (les dues versions)**: valor configurat explícitament > variable `ROBERT_*` > default del `package.json`. `SettingsManager` llegeix els valors explícits amb `inspect()` (`readExplicit()`), perquè `get()` retorna el default del manifest i amagaria les variables d'entorn.
- **Scripts**: `npm run standalone:start` (build + arrencada), `npm run standalone:dev`, `npm run standalone:package` (instal·ladors a `dist/standalone/`).
- **Arrencada en desenvolupament**: `scripts/standalone-launch.cjs` treu `ELECTRON_RUN_AS_NODE` de l'entorn (els terminals de VS Code el defineixen) i, a macOS, executa Electron des d'una còpia del bundle anomenada "Robert" amb la icona de Robert (a `node_modules/.cache/robert-standalone/`), perquè el Dock i el menú no mostrin "Electron". Arrencar directament amb `electron out/src/standalone/main.js` funciona, però amb nom i icona d'Electron.
- **Nom de l'app**: el nom visible és "Robert" (`productName` a `electron-builder.yml`, `APP_NAME` a `main.ts`). El nom intern continua sent "IBM Robert" (`APP_INTERNAL_NAME`): és el que dona nom al directori de perfil i a l'element del clauer de macOS on `safeStorage` guarda la clau dels tokens. Si es canvia, es perden els settings i els tokens desats.
- **Actualitzacions**: l'app no s'actualitza sola; avisa quan hi ha una versió nova i obre la descàrrega de l'instal·lador (igual a macOS i Windows, sense signatura). Publicar una GitHub Release amb el tag = versió del `package.json` dispara `.github/workflows/release-standalone.yml`, que hi adjunta els `.dmg` (arm64 i x64) i l'`.exe`. Lògica a `src/standalone/updateCheck.ts`; menú «Check for Updates…». Vegeu «Releases and updates» a [docs/STANDALONE.md](docs/STANDALONE.md).
- **Perfil aïllat**: `ROBERT_STANDALONE_USER_DATA=<dir>` fa servir un altre directori de dades (útil per a proves).

### Regles per mantenir les dues versions

1. La lògica de producte va sempre al codi compartit (`src/webview/**`, message handlers, `src/libs/**`), mai a `src/standalone/` ni només a `src/extension.ts`.
2. Si el codi compartit comença a fer servir una API nova de `vscode`, cal afegir-la al shim (o fer-ne un no-op / error clar) i ampliar `src/standalone/host/sharedCodeOnShim.test.ts`.
3. Si la UI fa servir una variable CSS `--vscode-*` nova, cal afegir-la a les dues paletes de `src/standalone/host/theme.ts` (el test `host.test.ts` falla si en falta alguna).
4. Els settings nous es declaren com sempre al `package.json`; si són secrets, afegeix-los a `SECRET_SETTING_KEYS`.
5. Comprova els canvis a les dues versions (F5 per l'extensió, `npm run standalone:start` per l'app).

Documentació completa: [docs/STANDALONE.md](docs/STANDALONE.md)

## Cursor Cloud specific instructions

Scope: the main product is the VS Code extension (root `package.json`). `server/` is an **optional** collaboration backend (Express + WebSocket + PostgreSQL, disabled by default via `robert.collaboration.enabled`, with a deployed prod instance at `https://robert-8vdt.onrender.com`); it is not needed to develop/run the extension and requires a PostgreSQL DB to run locally.

Dependencies are installed automatically by the startup update script (`npm install` at repo root). Node 22 is used (matches `.github/workflows/copilot-setup-steps.yml`).

Standard commands (see root `package.json` scripts; do not duplicate here):
- Lint: `npm run lint`. Build (dev): `npx tsc -p ./` then `npm run build:webview` (or `npm run compile:fast`). Avoid `npm run compile` for a quick build — it also runs `format` + `lint:fix` which currently fail on pre-existing lint errors.
- Unit tests: `npm test` (vitest). VS Code integration tests: `npm run test:vscode` (downloads VS Code to `.vscode-test/`, runs headless under the existing `DISPLAY`).

Known-baseline failures (pre-existing in committed code, NOT environment problems — do not treat as regressions you must fix unless asked): `npm run lint` reports ~50 errors / ~190 warnings (React hooks / react-compiler rules), and `npm test` has 2 failing tests in `test/SettingsManager.test.ts` (mock `createOutputChannel` lacks `.error()`).

Running the extension in a GUI (headless desktop is available on `DISPLAY=:1`): there is no system `code` binary, but `npm run test:vscode` downloads one to `.vscode-test/vscode-linux-x64-<ver>/code`. Launch the Extension Development Host with:
`DISPLAY=:1 .vscode-test/vscode-linux-x64-<ver>/code --no-sandbox --disable-gpu --user-data-dir=/tmp/vscode-user --extensions-dir=/tmp/vscode-ext --extensionDevelopmentPath="$PWD" "$PWD/test-workspace"`
The `dbus`/`gpu` errors it prints are harmless in this sandbox. Build the webview (`npm run build:webview`) before launching or the side panel renders blank.

Network egress caveat (important): the Cloud Agent sandbox enforces an outbound allowlist. `github.com` (git) is reachable, but external HTTPS to `*.atlassian.net` and the collaboration server `robert-8vdt.onrender.com` may be blocked. In that case the "Robert" output channel showing Jira connection errors is a network restriction, not a bad API token or extension bug.