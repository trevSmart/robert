# Amagar Elements de Collaboration Quan Disabled Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Ocultar tab Collaboration, checkbox "Share with team" i botó "Sol·licitar Ajuda" cuando `collaborationEnabled === false`

**Architecture:** Lectura única del setting `collaborationEnabled` en MainWebview, pasado como prop a NavigationBar, Calendar y UserStoryForm. Cada componente renderiza condicionalmente sus elementos. Se actualiza la descripción del setting en package.json para indicar que requiere restart de la extensión.

**Tech Stack:** React, TypeScript, SettingsManager

---

## Task 1: Actualizar package.json con descripción del setting

**Files:**
- Modify: `package.json`

**Step 1: Leer la sección de contribuciones del settings**

Buscar en `package.json` la definición de `collaboration.enabled` dentro de `contributes.configuration.properties`.

**Step 2: Actualizar la descripción del setting**

```json
"collaboration.enabled": {
  "type": "boolean",
  "default": false,
  "description": "Enable collaboration features. Changing this setting requires restarting the extension to take effect."
}
```

**Step 3: Commit**

```bash
git add package.json
git commit -m "docs: update collaboration.enabled description to mention restart requirement"
```

---

## Task 2: Leer collaborationEnabled en MainWebview

**Files:**
- Modify: `src/webview/components/MainWebview.tsx:1-100` (import section and state setup)

**Step 1: Leer archivo actual para ver donde se leen otros settings**

Buscar en MainWebview.tsx donde se initialize state relacionado con settings. Debería estar cerca de donde se cargan settings de preferencias.

**Step 2: Agregar lectura del setting collaborationEnabled**

En la sección de inicialización de estado (cerca de otros settings como `debugMode`), agregar:

```typescript
const collaborationEnabled = SettingsManager.getInstance().getSetting('collaborationEnabled');
```

**Step 3: Commit**

```bash
git add src/webview/components/MainWebview.tsx
git commit -m "feat: read collaborationEnabled setting in MainWebview"
```

---

## Task 3: Pasar collaborationEnabled a NavigationBar

**Files:**
- Modify: `src/webview/components/MainWebview.tsx:2029` (línea aproximada del NavigationBar render)
- Modify: `src/webview/components/common/NavigationBar.tsx:101-171` (interface props y component definition)

**Step 1: Actualizar props interface de NavigationBar**

En `NavigationBar.tsx`, actualizar `NavigationBarProps`:

```typescript
interface NavigationBarProps {
	activeSection: Section;
	onSectionChange: (section: Section) => void;
	collaborationBadgeCount?: number;
	collaborationEnabled?: boolean;
}
```

**Step 2: Actualizar render de NavigationBar en MainWebview**

En `MainWebview.tsx` línea ~2029, actualizar:

```typescript
<NavigationBar 
  activeSection={activeSection} 
  onSectionChange={handleSectionChange} 
  collaborationBadgeCount={collaborationHelpRequestsCount}
  collaborationEnabled={collaborationEnabled}
/>
```

**Step 3: Commit**

```bash
git add src/webview/components/MainWebview.tsx src/webview/components/common/NavigationBar.tsx
git commit -m "feat: pass collaborationEnabled prop to NavigationBar"
```

---

## Task 4: Implementar conditional rendering en NavigationBar

**Files:**
- Modify: `src/webview/components/common/NavigationBar.tsx:171-184` (tabs array construction)

**Step 1: Filtrar tab collaboration del array de tabs**

En la función `useMemo` donde se definen los tabs (línea ~173-184), actualizar:

```typescript
const tabs = useMemo(
	() => {
		const allTabs = [
			{ id: 'search' as const, label: '', Icon: SearchIcon, iconOnly: true },
			{ id: 'home' as const, label: 'Home', Icon: HomeIcon, iconOnly: false },
			{ id: 'portfolio' as const, label: 'Portfolio', Icon: PortfolioIcon, iconOnly: false },
			{ id: 'team' as const, label: 'Team', Icon: TeamIcon, iconOnly: false },
			{ id: 'metrics' as const, label: 'Metrics', Icon: MetricsIcon, iconOnly: false },
			{ id: 'collaboration' as const, label: 'Collaboration', Icon: CollaborationIcon, iconOnly: false },
			{ id: 'library' as const, label: 'Library', Icon: LibraryIcon, iconOnly: false }
		];
		
		// Filter out collaboration tab if disabled
		return collaborationEnabled === false 
			? allTabs.filter(tab => tab.id !== 'collaboration')
			: allTabs;
	},
	[collaborationEnabled]
);
```

**Step 2: Commit**

```bash
git add src/webview/components/common/NavigationBar.tsx
git commit -m "feat: hide collaboration tab when collaborationEnabled is false"
```

---

## Task 5: Pasar collaborationEnabled a Calendar

**Files:**
- Modify: `src/webview/components/MainWebview.tsx:1973` (línea aproximada del Calendar render)
- Modify: `src/webview/components/common/Calendar.tsx:32-44` (interface props)

**Step 1: Actualizar interface CalendarProps**

En `Calendar.tsx`, actualizar `CalendarProps`:

```typescript
interface CalendarProps {
	currentDate?: Date;
	iterations?: Iteration[];
	userStories?: UserStory[];
	onMonthChange?: (date: Date) => void;
	debugMode?: boolean;
	currentUser?: CalendarCurrentUser | null;
	holidays?: Holiday[];
	onIterationClick?: (iteration: Iteration) => void;
	customEvents?: CustomCalendarEvent[];
	onSaveCustomEvent?: (event: CustomCalendarEvent) => void;
	onDeleteCustomEvent?: (eventId: string) => void;
	collaborationEnabled?: boolean;
}
```

**Step 2: Actualizar render de Calendar en MainWebview**

En `MainWebview.tsx` línea ~1973, buscar el render de `<Calendar` y agregar:

```typescript
<Calendar
  {/* ... existing props ... */}
  collaborationEnabled={collaborationEnabled}
/>
```

**Step 3: Commit**

```bash
git add src/webview/components/MainWebview.tsx src/webview/components/common/Calendar.tsx
git commit -m "feat: pass collaborationEnabled prop to Calendar"
```

---

## Task 6: Implementar conditional rendering del checkbox en Calendar

**Files:**
- Modify: `src/webview/components/common/Calendar.tsx:1887-1893` (sección del checkbox de Public/Private)

**Step 1: Envolver checkbox en condicional**

En `Calendar.tsx` línea ~1887-1893, cambiar:

```typescript
{/* Public/Private Checkbox */}
{collaborationEnabled && (
	<div style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginTop: '8px' }}>
		<input type="checkbox" id="isPublicCheckbox" checked={modalForm.isPublic} onChange={e => setModalForm(f => ({ ...f, isPublic: e.target.checked }))} style={{ cursor: 'pointer' }} />
		<label htmlFor="isPublicCheckbox" style={{ fontSize: '12px', cursor: 'pointer', userSelect: 'none' }}>
			Share with team
		</label>
	</div>
)}
```

**Step 2: Commit**

```bash
git add src/webview/components/common/Calendar.tsx
git commit -m "feat: hide 'Share with team' checkbox when collaborationEnabled is false"
```

---

## Task 7: Pasar collaborationEnabled a UserStoryForm

**Files:**
- Modify: `src/webview/components/MainWebview.tsx` (búsqueda del render de UserStoryForm)
- Modify: `src/webview/components/common/UserStoryForm.tsx:73-78` (interface props)

**Step 1: Actualizar interface UserStoryFormProps**

En `UserStoryForm.tsx`, actualizar `UserStoryFormProps`:

```typescript
interface UserStoryFormProps {
	userStory: UserStory;
	selectedAdditionalTab?: AdditionalTabKey;
	onAdditionalTabChange?: (tab: AdditionalTabKey) => void;
	additionalTabContent?: Partial<Record<AdditionalTabKey, ReactNode>>;
	collaborationEnabled?: boolean;
}
```

**Step 2: Buscar y actualizar render de UserStoryForm en MainWebview**

En `MainWebview.tsx`, buscar el render de `<UserStoryForm` y agregar prop:

```typescript
<UserStoryForm
  userStory={selectedUserStory}
  {/* ... existing props ... */}
  collaborationEnabled={collaborationEnabled}
/>
```

**Step 3: Commit**

```bash
git add src/webview/components/MainWebview.tsx src/webview/components/common/UserStoryForm.tsx
git commit -m "feat: pass collaborationEnabled prop to UserStoryForm"
```

---

## Task 8: Implementar conditional rendering del botón "Sol·licitar Ajuda"

**Files:**
- Modify: `src/webview/components/common/UserStoryForm.tsx:340-378` (sección del botón Request help)

**Step 1: Envolver botón en condicional**

En `UserStoryForm.tsx` línea ~340-378 (donde está el botón "Sol·licitar Ajuda"), cambiar:

```typescript
{collaborationEnabled && (
	<button
		{/* ... existing button props and styling ... */}
	>
		<HelpIcon size="14px" />
		{requestSupportLoading ? 'Sol·licitant...' : 'Sol·licitar Ajuda'}
	</button>
)}
```

Asegurarse de mantener toda la estructura de styles y event handlers existentes.

**Step 2: Commit**

```bash
git add src/webview/components/common/UserStoryForm.tsx
git commit -m "feat: hide 'Request help' button when collaborationEnabled is false"
```

---

## Task 9: Verificar que no hay referencias rotas

**Files:**
- Check: `src/webview/components/MainWebview.tsx`
- Check: `src/webview/components/common/NavigationBar.tsx`
- Check: `src/webview/components/common/Calendar.tsx`
- Check: `src/webview/components/common/UserStoryForm.tsx`

**Step 1: Compilar TypeScript para verificar tipos**

```bash
npm run compile
```

Expected: Sin errores de TypeScript. Si hay errores, revisar que todos los props fueron pasados correctamente.

**Step 2: Buscar cualquier referencia a colaboración que no haya sido considerada**

```bash
grep -r "collaboration" src/webview/components --include="*.tsx" | grep -v "collaborationEnabled" | grep -v "CollaborationSection" | grep -v "CollaborationView"
```

Expected: Solo coincidencias en CollaborationSection y CollaborationView, que no necesitan cambios.

**Step 3: Commit**

```bash
git add -A
git commit -m "chore: verify no broken references after collaboration feature hiding"
```

---

## Task 10: Actualizar tests si existen

**Files:**
- Check: `test/suite/extension.test.ts`
- Modify: Si existen tests para NavigationBar, Calendar o UserStoryForm

**Step 1: Buscar tests relacionados**

```bash
grep -r "NavigationBar\|Calendar\|UserStoryForm" test/ --include="*.ts"
```

**Step 2: Si existen tests, actualizar mocks de props**

Si hay tests que renderizan estos componentes, agregar `collaborationEnabled={true}` o `collaborationEnabled={false}` a los mocks según sea necesario.

**Step 3: Ejecutar tests**

```bash
npm test
```

Expected: Todos los tests pasan.

**Step 4: Commit (si hay cambios)**

```bash
git add test/
git commit -m "test: update component mocks with collaborationEnabled prop"
```
