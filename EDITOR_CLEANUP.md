# Solució: Control d'Acumulació d'Editors

## Problema Principal
Quan l'extensió Robert es reiniciava, els editors anteriors quedaven oberts. Si obries un nou editor després del reinici, acabaves amb múltiples editors de Robert apilats (2, 3, o més).

## Problema Secundari
Quan obries l'editor de Robert, quedava tant l'ActivityBar de Robert com l'editor obert simultàniament, sense sentit i prenent espai de la UI.

## Solucions Implementades

### 1. **Neteja en l'Activació de l'Extensió** (`extension.ts`)

Afegida la funció `closeExistingRobertEditors()` que s'executa quan l'extensió s'activa:

```typescript
function closeExistingRobertEditors(outputManager: OutputChannelManager): void
```

**Que fa:**
- Detecta tots els tabs oberts que contenen "Robert" al nom
- Els tanca automàticament
- Registra les accions al canal de sortida

**Moment d'execució:** `activate()` → immediatament després de detectar el mode debug

### 2. **Control al Crear Editors** (`RobertWebviewProvider.ts`)

Millorada la funció `createWebviewPanel()` amb dues noves funcionalitats:

#### A) Tancar editors anteriors:
```typescript
private async _closeOtherRobertEditors(): Promise<void>
```

**Que fa:**
- Quan es crea un nou editor, verifica si hi ha altres editors de Robert oberts
- Tanca automàticament els editors antics (excepte l'actual)
- Evita que es creen múltiples editors per accident
- Registra les accions al canal de sortida

#### B) **NOVA**: Tancar ActivityBar i obrir FileExplorer:
```typescript
private async _switchFromActivityBarToFileExplorer(): Promise<void>
```

**Que fa:**
- Quan s'obri un editor Robert, tanca automàticament la vista de l'ActivityBar
- Mostra el FileExplorer en el seu lloc (com a defecte)
- Mantén l'editor Robert obert en una pestanya/panel
- Registra les accions al canal de sortida

**Moment d'execució:** `createWebviewPanel()` → després de crear el nou panel

### Com Funciona el Flux

```
Usuari: "Obrir editor Robert" (des de ActivityBar)
  ↓
createWebviewPanel() s'executa:
  1. Tanca altres editors Robert anteriors (_closeOtherRobertEditors)
  2. Crea el nou editor Robert en una pestanya
  3. Tanca l'ActivityBar Robert
  4. Obri el FileExplorer en el seu lloc (_switchFromActivityBarToFileExplorer)
  ↓
Resultat: 
  - 1 editor Robert obert en una pestanya
  - FileExplorer visible a l'ActivityBar (no Robert)
```

## Logs en el Canal "Robert"

Veurà logs com:

```
[Robert] 🚀 Extension activate() function called
[Robert] Found 1 existing Robert editor tab(s). Closing them to prevent accumulation...
[Robert] ✅ Closed editor tab: Robert
[Robert] Extension activated
[Robert] Command: openInEditor
[Robert] Switching from Robert Activity Bar to File Explorer
[Robert] ✅ File Explorer is now visible in the activity bar
```

O si no hi ha editors anteriors i s'obri el primer:

```
[Robert] No existing Robert editor tabs found. Clean slate!
[Robert] Command: openInEditor
[Robert] Switching from Robert Activity Bar to File Explorer
[Robert] ✅ File Explorer is now visible in the activity bar
```

## Beneficis

✅ **Automàtic**: No requereix accions del usuari
✅ **Transparent**: Els logs proporcionen visibilitat
✅ **Doble protección**: 
   - Tancat en activació (neteja editors antics)
   - Tancat en crear nou editor (evita duplicats)
   - Switch automàtic a FileExplorer (UX millor)

✅ **No destructiu**: Els editors es tanquen "correctament" sense perdre dades
✅ **UX Millorat**: L'ActivityBar es manté net amb el FileExplorer com a vista per defecte

## Proves Recomanades

1. **Obrir editor Robert**
   - `Robert.openInEditor` command / clic al botó
   - Verificar que apareix un tab "Robert"
   - Verificar que l'ActivityBar passa a FileExplorer

2. **Tancar l'editor Robert**
   - Clic a la X de la pestanya
   - L'ActivityBar es manté al FileExplorer

3. **Reobrir editor Robert**
   - `Robert.openInEditor` command
   - Verificar que es crea un nou editor (no multiple)
   - Verificar que l'ActivityBar torna a FileExplorer

4. **Reiniciar extensió (Ctrl+Shift+P → "Developer: Reload Window")**
   - Verificar al canal "Robert" que detecta editors anteriors
   - Reobrir editor Robert
   - Verificar el comportament normal

## Ubicació dels Canvis

- **`src/extension.ts`**: 
  - Funció `closeExistingRobertEditors()` (nova)
  - Crida en `activate()` (nova)

- **`src/RobertWebviewProvider.ts`**: 
  - Funció `_closeOtherRobertEditors()` (nova)
  - Funció `_switchFromActivityBarToFileExplorer()` (nova)
  - Crida en `createWebviewPanel()` (modificada)

## Compatibilitat

- ✅ MacOS
- ✅ Windows  
- ✅ Linux
- ✅ Compatible amb VS Code 1.60+

## Notas de Desenvolupament

- Utilitza `vscode.window.tabGroups` API (disponible en VS Code 1.80+)
- Utilitza `vscode.commands.executeCommand('workbench.view.explorer')` per mostrar FileExplorer
- Els logs registren totes les acciones per debugging
- Els errors de switch a FileExplorer no bloquegen la creació del nou editor
- L'ActivityBar original (Robert) pot ser mostrat altre cop si es clica a la seva icona, però l'editor roman obert
