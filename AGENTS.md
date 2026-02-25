# Robert - Agent Context Guide

Aquest document proporciona context complet del projecte Robert per agents IA, assegurant una comprensió ràpida i precisa de l'estructura, funcionalitat i arquitectura del projecte.

## 📋 Resum Executiu

**Robert** és una extensió de VS Code desenvolupada per IBM que integra funcionalitats de Rally (eina de gestió de projectes Agile). L'extensió proporciona una interfície webview per visualitzar i gestionar projectes, usuaris i user stories de Rally dins de VS Code.

### Informació Clau del Projecte
- **Nom**: Robert (IBM Robert)
- **Versió**: 0.0.4
- **Publisher**: ibm-robert
- **Tipus**: VS Code Extension
- **Tecnologies**: TypeScript, React, Vite, Rally API
- **Repositori**: https://github.com/ibm/robert-vscode-extension.git

## 🏗️ Arquitectura del Projecte

### Estructura de Directoris

```
Robert/
├── src/                          # Codi font TypeScript
│   ├── extension.ts              # Punt d'entrada principal
│   ├── RobertWebviewProvider.ts  # Gestor de webviews
│   ├── SettingsManager.ts        # Gestió de configuració
│   ├── ErrorHandler.ts           # Gestió d'errors centralitzada
│   ├── libs/rally/              # Integració amb Rally API
│   ├── templates/               # Plantilles HTML per webviews
│   ├── types/                   # Definicions de tipus TypeScript
│   ├── utils/                   # Utilitats compartides
│   └── webview/                 # Components React per webviews
├── out/                         # Codi compilat JavaScript
├── resources/                   # Recursos (icones, imatges)
├── dist/                        # Paquets VSIX generats
└── tmp/                         # Fitxers temporals
```

### Components Principals

#### 1. **Extension Entry Point** (`src/extension.ts`)
- Punt d'activació de l'extensió
- Registra comandaments i webview providers
- Gestiona l'estat global de Rally (`rallyData`)
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
- Suport per settings de Rally (API key, instance URL, project name)

#### 4. **Error Handler** (`src/ErrorHandler.ts`)
- Gestió centralitzada d'errors
- Logging estructurat al canal "Robert"
- Decoradors per maneig automàtic d'errors
- Captura d'errors globals (unhandled rejections, exceptions)

#### 5. **Rally Integration** (`src/libs/rally/`)
- **rallyServices.ts**: Funcions per consultar Rally API
  - `getProjects()`: Obtenir projectes
  - `getUsers()`: Obtenir usuaris
  - `getUserStories()`: Obtenir user stories
- **utils.ts**: Utilitats per configuració i queries de Rally
- Cache intel·ligent per optimitzar crides API

## 🔧 Configuració i Settings

### Settings Disponibles

| Setting | Tipus | Default | Descripció |
|---------|-------|---------|------------|
| `robert.apiEndpoint` | string | `https://rally.example.com` | Endpoint API |
| `robert.refreshInterval` | number | `30` | Interval refresc (5-3600s) |
| `robert.theme` | string | `auto` | Tema (`auto`, `light`, `dark`, `high-contrast`) |
| `robert.autoRefresh` | boolean | `true` | Refresc automàtic |
| `robert.notifications` | boolean | `true` | Notificacions |
| `robert.debugMode` | boolean | `false` | Mode debug |
| `robert.advancedFeatures` | boolean | `false` | Funcions avançades |
| `robert.maxResults` | number | `100` | Màxim resultats (10-1000) |
| `robert.timeout` | number | `5000` | Timeout peticions (1000-60000ms) |
| `robert.rallyInstance` | string | `https://rally1.rallydev.com` | URL instància Rally |
| `robert.rallyApiKey` | string | `""` | Clau API Rally |
| `robert.rallyProjectName` | string | `""` | Nom projecte Rally |

### Persistència
- Settings es guarden a configuració global VS Code
- Es mantenen entre sessions
- Es poden sincronitzar amb VS Code Sync

## 🎯 Funcionalitats Principals

### 1. **Integració Rally**
- Connexió amb Rally API utilitzant biblioteca `rally`
- Consulta de projectes, usuaris i user stories
- Cache intel·ligent per optimitzar rendiment
- Validació de configuració abans de crides API

### 2. **Interfície Webview**
- **Vista Principal**: Mostra informació de Rally amb logo IBM
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
- **rally**: Biblioteca per integració Rally API

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

### Build Process
1. **TypeScript Compilation**: `tsc -p ./`
2. **Webview Build**: `vite build` (React components)
3. **Linting**: `eslint --fix .`
4. **Packaging**: `vsce package --out dist/`

## 🎨 Interfície d'Usuari

### Webviews React
- **MainWebview.tsx**: Vista principal amb informació Rally
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
- Rally API key es guarda a configuració VS Code
- No es loggeja ni es mostra en plain text
- Validació abans d'utilitzar

### Configuració Rally
- URL instància Rally (HTTPS obligatori)
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

## Cursor Cloud specific instructions

This is a VS Code extension; it cannot be run standalone in the cloud VM. The primary development workflow is:

- **Lint**: `npm run lint` (pre-existing warnings/errors in the codebase; exit code 1 is expected)
- **Tests**: `npm test` runs Vitest. 138/139 tests pass; `test/extension.test.ts > should activate extension without errors` fails pre-existingly due to an incomplete VS Code API mock (`workspace.onDidChangeConfiguration`).
- **TypeScript compile**: `npx tsc -p ./` (clean, zero errors)
- **Webview build**: `npm run build:webview` (Vite, builds React webviews to `out/webview/`)
- **Watch mode**: `npm run watch` for TypeScript incremental compilation during development
- **VSIX packaging**: `npm run package` fails due to `vscode:prepublish` running `lint:fix` which exits 1 on pre-existing lint errors. Use `npm run compile:fast` for a quick compile without lint gating.

The collaboration server (`server/`) is optional. It requires PostgreSQL and is disabled by default (`robert.collaboration.enabled: false`). To build it: `cd server && npm run build`. It does not need to run for extension development.

The project uses two separate `package.json`/`package-lock.json` files: root for the extension, `server/` for the collaboration server. Both need `npm install` independently.