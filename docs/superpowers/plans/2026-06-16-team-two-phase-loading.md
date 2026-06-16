# Team Two-Phase Loading Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Pintar la pestanya Team de seguida amb els membres actius de la iteració seleccionada i carregar la secció "Other Team Members" de manera diferida, alhora que s'arregla la cache filtrada per iteració per eliminar crides HTTP redundants a Rally.

**Architecture:** El handler `handleLoadTeamMembers` s'inverteix en dues fases: fase 1 (ràpida) calcula el progrés de la iteració seleccionada i en deriva els membres actius (1 missatge `teamMembersLoaded`); fase 2 (diferida) carrega els membres històrics dels 6 sprints amb crides paral·lelitzades (1 missatge `teamMembersOtherLoaded`). El webview pinta la vista amb la fase 1 i omple "Other" amb la fase 2, mostrant un spinner propi a la secció mentrestant. A més, `checkCacheForFilteredResults` aprèn a encertar per iteració comparant `objectId`.

**Tech Stack:** TypeScript, React (webview), Vitest (tests), VSCode extension API, Rally REST (lib pròpia).

## Global Constraints

- Català per a comentaris i textos de cara a l'usuari; identificadors de codi en anglès.
- Cap regressió en el comportament d'error actual de la fase 1 (`teamMembersError`, suport `needsConfiguration`).
- Els serveis del Team mantenen el comportament de pàgina única (≤100 stories per iteració, `PAGE_SIZE = 100`); no s'hi afegeix paginació.
- Tests amb Vitest (`npm test`), seguint el patró de `src/libs/cache/CacheManager.test.ts` (`import { describe, it, expect } from 'vitest'`).
- Commits freqüents, un per tasca.

## File Structure

- `src/libs/rally/rallyServices.ts` — Modificar:
  - Nou helper exportat `extractIterationId(ref)` (pur, testable).
  - `checkCacheForFilteredResults` usa el helper per encertar la clau `Iteration` per `objectId`.
  - `getRecentTeamMembers` paral·lelitza les crides per sprint.
  - `getAllTeamMembersProgress` retorna `{ progressMap, members }` i deriva membres si no en rep.
- `src/libs/rally/rallyServices.test.ts` — Crear: tests unitaris del helper i del matching de cache.
- `src/webview/messageHandlers/RallyMessageHandler.ts` — Modificar: `handleLoadTeamMembers` en dues fases.
- `src/webview/components/MainWebview.tsx` — Modificar: estat `teamOtherLoading`, handlers dels dos missatges, prop nova.
- `src/webview/components/sections/TeamSection.tsx` — Modificar: prop `otherMembersLoading` i spinner a la secció "Other".

---

### Task 1: Helper `extractIterationId` + fix de cache filtrada per iteració

**Files:**
- Modify: `src/libs/rally/rallyServices.ts:671-691` (`checkCacheForFilteredResults`)
- Create: `src/libs/rally/rallyServices.test.ts`

**Interfaces:**
- Produces:
  - `export function extractIterationId(ref: string | null | undefined): string | null` — extreu l'objectId numèric d'un ref d'iteració, sigui curt (`/iteration/12345`) o complet (`https://…/v2.0/iteration/12345`). Retorna `null` si l'entrada és buida.
  - `checkCacheForFilteredResults` segueix tenint la mateixa signatura `(query: RallyQuery, dataArray: RallyUserStory[]) => { results, source, count } | null`, però ara encerta per `Iteration` comparant `extractIterationId(query.Iteration)` contra `item.iteration?.objectId`.

- [ ] **Step 1: Write the failing test**

Crear `src/libs/rally/rallyServices.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { extractIterationId } from './rallyServices';

describe('extractIterationId', () => {
	it('extreu objectId d\'un ref curt', () => {
		expect(extractIterationId('/iteration/12345')).toBe('12345');
	});

	it('extreu objectId d\'un ref complet de Rally', () => {
		expect(extractIterationId('https://rally1.rallydev.com/slm/webservice/v2.0/iteration/67890')).toBe('67890');
	});

	it('retorna null per entrada buida', () => {
		expect(extractIterationId(undefined)).toBeNull();
		expect(extractIterationId(null)).toBeNull();
		expect(extractIterationId('')).toBeNull();
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- rallyServices`
Expected: FAIL — `extractIterationId is not a function` / no export.

- [ ] **Step 3: Implement `extractIterationId`**

Afegir a `src/libs/rally/rallyServices.ts` (a prop de `checkCacheForFilteredResults`, abans de la línia 671):

```typescript
/**
 * Extreu l'objectId numèric d'un ref d'iteració de Rally.
 * Accepta tant refs curts (`/iteration/12345`) com complets
 * (`https://…/v2.0/iteration/12345`). Retorna null si l'entrada és buida.
 */
export function extractIterationId(ref: string | null | undefined): string | null {
	if (!ref) {
		return null;
	}
	const id = String(ref).split('/').pop();
	return id && id.length ? id : null;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- rallyServices`
Expected: PASS (els 3 casos de `extractIterationId`).

- [ ] **Step 5: Write the failing test for cache iteration matching**

Afegir a `src/libs/rally/rallyServices.test.ts`. La funció `checkCacheForFilteredResults` no està exportada; per testar-la l'exportem (canvi mínim) i la importem:

```typescript
import { extractIterationId, checkCacheForFilteredResults } from './rallyServices';

describe('checkCacheForFilteredResults (Iteration matching)', () => {
	const stories = [
		{ objectId: 'a', iteration: { objectId: '12345', _ref: '/iteration/12345', _refObjectName: 'Sprint 1' } },
		{ objectId: 'b', iteration: { objectId: '99999', _ref: '/iteration/99999', _refObjectName: 'Sprint 2' } }
	] as any[];

	it('encerta per ref curt comparant objectId', () => {
		const r = checkCacheForFilteredResults({ Iteration: '/iteration/12345' } as any, stories);
		expect(r?.results.map((s: any) => s.objectId)).toEqual(['a']);
		expect(r?.source).toBe('cache');
	});

	it('encerta per ref complet de Rally', () => {
		const r = checkCacheForFilteredResults({ Iteration: 'https://rally1.rallydev.com/slm/webservice/v2.0/iteration/99999' } as any, stories);
		expect(r?.results.map((s: any) => s.objectId)).toEqual(['b']);
	});

	it('retorna null si cap story coincideix amb la iteració', () => {
		const r = checkCacheForFilteredResults({ Iteration: '/iteration/00000' } as any, stories);
		expect(r).toBeNull();
	});
});
```

- [ ] **Step 6: Run test to verify it fails**

Run: `npm test -- rallyServices`
Expected: FAIL — `checkCacheForFilteredResults` no exportat i/o no encerta per `Iteration` (retorna null on hauria de trobar resultats).

- [ ] **Step 7: Export and fix `checkCacheForFilteredResults`**

A `src/libs/rally/rallyServices.ts`, canviar la signatura per exportar-la i afegir el matching especial d'`Iteration`:

```typescript
export function checkCacheForFilteredResults(query: RallyQuery, dataArray: RallyUserStory[]) {
	if (Object.keys(query).length && dataArray && dataArray.length) {
		const filteredResults = dataArray.filter(item =>
			Object.keys(query).every(key => {
				// Cas especial: la query filtra per `Iteration` amb un ref (curt o complet),
				// però la story cacheja el camp com `iteration` (objecte). Comparem per objectId.
				if (key === 'Iteration') {
					const queryId = extractIterationId(query[key] as string);
					const itemId = item.iteration?.objectId;
					return queryId != null && itemId != null && String(itemId) === String(queryId);
				}
				if (item[key as keyof RallyUserStory] === undefined) {
					return false;
				}
				return item[key as keyof RallyUserStory] === query[key];
			})
		);

		if (filteredResults.length) {
			return {
				results: filteredResults,
				source: 'cache',
				count: filteredResults.length
			};
		}
	}
	return null;
}
```

Nota: `item.iteration` és `{ objectId, _ref, _refObjectName } | null` segons el format de `formatUserStoriesAsync` (línies 642-648). Si el tipus `RallyUserStory.iteration` no exposa `objectId`, accedir-hi amb `(item.iteration as any)?.objectId`.

- [ ] **Step 8: Run test to verify it passes**

Run: `npm test -- rallyServices`
Expected: PASS (tots els casos: helper + cache matching).

- [ ] **Step 9: Commit**

```bash
git add src/libs/rally/rallyServices.ts src/libs/rally/rallyServices.test.ts
git commit -m "fix: cache hit for getUserStories iteration filter by objectId"
```

---

### Task 2: Paral·lelitzar les crides per sprint a `getRecentTeamMembers`

**Files:**
- Modify: `src/libs/rally/rallyServices.ts:1814-1843` (bucle dins `getRecentTeamMembers`)

**Interfaces:**
- Consumes: `getUserStories({ Iteration })` (Task 1, ara amb cache que encerta).
- Produces: `getRecentTeamMembers` manté la mateixa signatura i retorn (`{ teamMembers, source, count }`); només canvia internament de seqüencial a paral·lel.

- [ ] **Step 1: Replace the sequential loop with Promise.all**

A `src/libs/rally/rallyServices.ts`, substituir el bloc del bucle (línies ~1814-1843) per:

```typescript
		// Collect unique assignees from user stories in these iterations (in parallel).
		const assigneeSet = new Set<string>();

		const perIterationStories = await Promise.all(
			recentIterations.map(async iteration => {
				const iterationRef = `/iteration/${iteration.objectId}`;
				errorHandler.logDebug(`Querying user stories with iteration ref: ${iterationRef}`, 'rallyServices.getRecentTeamMembers');
				const userStoriesResult = await getUserStories({ Iteration: iterationRef });
				return userStoriesResult.userStories || [];
			})
		);

		for (const userStories of perIterationStories) {
			for (const userStory of userStories) {
				if (userStory.assignee && userStory.assignee !== 'Unassigned') {
					assigneeSet.add(userStory.assignee);
				}
			}
		}
```

- [ ] **Step 2: Compile to verify no type errors**

Run: `npm run compile:fast`
Expected: compila sense errors de TypeScript.

- [ ] **Step 3: Run existing tests**

Run: `npm test -- rallyServices`
Expected: PASS (els tests de Task 1 segueixen verds; cap regressió).

- [ ] **Step 4: Commit**

```bash
git add src/libs/rally/rallyServices.ts
git commit -m "perf: parallelize per-sprint queries in getRecentTeamMembers"
```

---

### Task 3: `getAllTeamMembersProgress` retorna `{ progressMap, members }`

**Files:**
- Modify: `src/libs/rally/rallyServices.ts:2120-2309` (`getAllTeamMembersProgress`)
- Modify: `src/webview/messageHandlers/RallyMessageHandler.ts:494` (consumidor — adaptat completament a Task 4)

**Interfaces:**
- Produces:
  - `getAllTeamMembersProgress(teamMembers?: string[], iterationId?: string): Promise<{ progressMap: Map<string, ProgressEntry>; members: string[] }>`
  - on `ProgressEntry = { completedHours: number; totalHours: number; percentage: number; source: string; userStoriesCount: number }`.
  - `members` són els assignees actius de la iteració (derivats de `storiesByUser` quan `teamMembers` ve buit/undefined; altrament, els `teamMembers` rebuts).

- [ ] **Step 1: Make `teamMembers` optional and derive members**

A `src/libs/rally/rallyServices.ts`, canviar la signatura i el cos. Capçalera:

```typescript
export async function getAllTeamMembersProgress(
	teamMembers?: string[],
	iterationId?: string
): Promise<{ progressMap: Map<string, { completedHours: number; totalHours: number; percentage: number; source: string; userStoriesCount: number }>; members: string[] }> {
	const progressMap = new Map<string, { completedHours: number; totalHours: number; percentage: number; source: string; userStoriesCount: number }>();
```

Tots els `return progressMap;` interns passen a `return { progressMap, members: resolvedMembers };` (vegeu sota). Als camins d'early-return on encara no s'han carregat stories (no iterations / no target iteration), `resolvedMembers` és `teamMembers ?? []`.

- [ ] **Step 2: Resolve members after grouping stories**

Després del pas 4 (agrupació `storiesByUser` / `assigneeNameMap`, línies ~2210-2231), afegir:

```typescript
		// Derive the active members from the iteration's stories when the caller
		// didn't provide a list (fast phase: we don't yet know the historical roster).
		const resolvedMembers = teamMembers && teamMembers.length
			? teamMembers
			: Array.from(assigneeNameMap.values()).sort();
```

I al bucle del pas 7, iterar sobre `resolvedMembers` en comptes de `teamMembers`:

```typescript
		for (const memberName of resolvedMembers) {
			// ... cos idèntic ...
		}
```

També, al pas 5 (recollida de `incompleteStoryIds`, línies ~2233-2246) la comprovació
`teamMembers.some(...)` ha d'usar `resolvedMembers`. Com que `resolvedMembers` es deriva
de les stories, quan no es passa llista cobreix tots els assignees de la iteració.

- [ ] **Step 3: Update return statements**

Final feliç (línia ~2300):

```typescript
		errorHandler.logInfo(`Successfully calculated progress for ${progressMap.size} team members`, 'rallyServices.getAllTeamMembersProgress');
		return { progressMap, members: resolvedMembers };
```

Early returns (no iterations / no target / catch): retornar `{ progressMap, members: teamMembers ?? [] }`. En aquests camins `progressMap` s'omple amb 0 per a cada membre de `teamMembers ?? []` (si ve buit, queda buit, que és correcte).

- [ ] **Step 4: Provisionally adapt the existing consumer so the build stays green**

El consumidor actual a `RallyMessageHandler.ts:494` fa `const progressMap = await getAllTeamMembersProgress(teamMembersResult.teamMembers, selectedIterationId);` i després `progressMap.get(...)`. Ara rep un objecte. Adaptar-lo provisionalment (Task 4 el reescriu del tot):

```typescript
				const { progressMap } = await getAllTeamMembersProgress(teamMembersResult.teamMembers, selectedIterationId);
```

Run: `npm run compile:fast`
Expected: compila net.

- [ ] **Step 5: Commit**

```bash
git add src/libs/rally/rallyServices.ts
git commit -m "refactor: getAllTeamMembersProgress returns progressMap and derived members"
```

---

### Task 4: Handler en dues fases (`handleLoadTeamMembers`)

**Files:**
- Modify: `src/webview/messageHandlers/RallyMessageHandler.ts:485-535`

**Interfaces:**
- Consumes: `getAllTeamMembersProgress(undefined, iterationId)` → `{ progressMap, members }` (Task 3); `getRecentTeamMembers(6)` → `{ teamMembers }` (Task 2).
- Produces (missatges al webview):
  - `{ command: 'teamMembersLoaded', teamMembers: Array<{ name, progress }>, iterationId }` — fase 1, només membres actius.
  - `{ command: 'teamMembersOtherLoaded', teamMembers: Array<{ name, progress }>, iterationId }` — fase 2, roster històric complet amb progrés (reaprofitat del `progressMap` de la fase 1; default 0).
  - `{ command: 'teamMembersError', error, needsConfiguration? }` — sense canvis.

- [ ] **Step 1: Rewrite `handleLoadTeamMembers` in two phases**

Substituir el cos de `handleLoadTeamMembers` (línies 485-535) per:

```typescript
	private async handleLoadTeamMembers(webview: vscode.Webview, message: any): Promise<void> {
		const selectedIterationId = message.iterationId as string | undefined;
		const iterationKey = selectedIterationId ?? 'current';

		// Phase 1 (fast): active members + progress for the selected iteration.
		try {
			this.errorHandler.logDebug('Loading team members — phase 1 (active members)', 'RallyMessageHandler');

			const { progressMap, members: activeMembers } = await getAllTeamMembersProgress(undefined, selectedIterationId);

			const activeWithProgress = activeMembers.map(name => ({
				name,
				progress: progressMap.get(name) || { completedHours: 0, totalHours: 0, percentage: 0, source: 'not-found', userStoriesCount: 0 }
			}));

			webview.postMessage({
				command: 'teamMembersLoaded',
				teamMembers: activeWithProgress,
				iterationId: iterationKey
			});
			this.errorHandler.logInfo(`Team members phase 1 loaded: ${activeWithProgress.length} active members`, 'RallyMessageHandler');

			// Phase 2 (deferred): historical roster from the last 6 sprints.
			try {
				const recent = await getRecentTeamMembers(6);
				const otherWithProgress = (recent?.teamMembers || []).map(name => ({
					name,
					progress: progressMap.get(name) || { completedHours: 0, totalHours: 0, percentage: 0, source: 'historical', userStoriesCount: 0 }
				}));

				webview.postMessage({
					command: 'teamMembersOtherLoaded',
					teamMembers: otherWithProgress,
					iterationId: iterationKey
				});
				this.errorHandler.logInfo(`Team members phase 2 loaded: ${otherWithProgress.length} historical members`, 'RallyMessageHandler');
			} catch (phase2Error) {
				// The view is already painted; just clear the section spinner.
				this.errorHandler.handleError(phase2Error instanceof Error ? phase2Error : new Error(String(phase2Error)), 'loadTeamMembers.phase2');
				webview.postMessage({
					command: 'teamMembersOtherLoaded',
					teamMembers: [],
					iterationId: iterationKey
				});
			}
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			this.errorHandler.handleError(error instanceof Error ? error : new Error(String(error)), 'loadTeamMembers');

			if (errorMessage.includes('Rally configuration error')) {
				webview.postMessage({
					command: 'teamMembersError',
					error: 'Please configure Rally settings first. Go to Settings and configure Rally API key, instance URL, and project name.',
					needsConfiguration: true
				});
			} else {
				webview.postMessage({
					command: 'teamMembersError',
					error: 'Failed to load team members'
				});
			}
		}
	}
```

- [ ] **Step 2: Compile to verify no type errors**

Run: `npm run compile:fast`
Expected: compila net (consumidor de Task 3 ja adaptat aquí).

- [ ] **Step 3: Commit**

```bash
git add src/webview/messageHandlers/RallyMessageHandler.ts
git commit -m "feat: two-phase Team loading in handleLoadTeamMembers"
```

---

### Task 5: Estat `teamOtherLoading` i handlers dels dos missatges al webview

**Files:**
- Modify: `src/webview/components/MainWebview.tsx:603` (declaració d'estat), `:1604-1621` (handlers)

**Interfaces:**
- Consumes: missatges `teamMembersLoaded` i `teamMembersOtherLoaded` (Task 4).
- Produces: estat `teamOtherLoading: boolean` passat a `TeamSection` com a prop `otherMembersLoading` (Task 6).

- [ ] **Step 1: Add the `teamOtherLoading` state**

A `src/webview/components/MainWebview.tsx`, després de la línia 603 (`selectedTeamIteration`):

```typescript
	const [teamOtherLoading, setTeamOtherLoading] = useState(false);
```

- [ ] **Step 2: Update `teamMembersLoaded` to start the section spinner**

Substituir el `case 'teamMembersLoaded'` (línies 1604-1621) per:

```typescript
				case 'teamMembersLoaded': {
					const completedTeamIteration = pendingTeamIterationRef.current;
					const requestedTeamIteration = requestedTeamIterationRef.current;
					pendingTeamIterationRef.current = null;
					teamMembersLoadingRef.current = false;
					setTeamMembersLoading(false);
					if (message.teamMembers) {
						setTeamMembers(message.teamMembers);
						setTeamMembersError(null);
						loadedTeamIterationRef.current = completedTeamIteration;
						// Phase 2 (Other Team Members) is still on its way.
						setTeamOtherLoading(true);
					} else {
						setTeamMembersError('Failed to load team members');
					}
					if (requestedTeamIteration && requestedTeamIteration !== completedTeamIteration) {
						loadTeamMembers(requestedTeamIteration === 'current' ? undefined : requestedTeamIteration);
					}
					break;
				}
```

- [ ] **Step 3: Add the `teamMembersOtherLoaded` handler**

Afegir immediatament després del `case 'teamMembersLoaded'`:

```typescript
				case 'teamMembersOtherLoaded': {
					// Ignore stale responses from a previously-selected iteration.
					if (message.iterationId && loadedTeamIterationRef.current && message.iterationId !== loadedTeamIterationRef.current) {
						break;
					}
					setTeamOtherLoading(false);
					if (Array.isArray(message.teamMembers) && message.teamMembers.length) {
						setTeamMembers(prev => {
							const byName = new Map(prev.map(m => [m.name, m]));
							for (const member of message.teamMembers) {
								// Active members already present win over historical entries.
								if (!byName.has(member.name)) {
									byName.set(member.name, member);
								}
							}
							return Array.from(byName.values());
						});
					}
					break;
				}
```

- [ ] **Step 4: Reset `teamOtherLoading` on error**

Al `case 'teamMembersError'` (ara desplaçat), afegir `setTeamOtherLoading(false);` just després de `setTeamMembersLoading(false);`.

- [ ] **Step 5: Compile webview to verify no type errors**

Run: `npm run compile:fast`
Expected: compila net.

- [ ] **Step 6: Commit**

```bash
git add src/webview/components/MainWebview.tsx
git commit -m "feat: handle two-phase Team messages and section loading state"
```

---

### Task 6: Spinner propi a la secció "Other Team Members"

**Files:**
- Modify: `src/webview/components/sections/TeamSection.tsx:25-33` (props), `:199-262` (secció Other)
- Modify: `src/webview/components/MainWebview.tsx` (passar la prop a `<TeamSection>`)

**Interfaces:**
- Consumes: `otherMembersLoading: boolean` (de `teamOtherLoading`, Task 5).

- [ ] **Step 1: Add the prop to `TeamSectionProps`**

A `src/webview/components/sections/TeamSection.tsx`, dins `TeamSectionProps` (línies 25-33), afegir:

```typescript
	otherMembersLoading: boolean;
```

I a la desestructuració del component (línia 35), afegir `otherMembersLoading`.

- [ ] **Step 2: Render the section spinner when loading and no inactive members yet**

A la secció "Other Team Members" (línies 199-262), embolcallar la condició actual. Substituir
l'obertura del bloc `{inactiveMembers.length > 0 && (` per una estructura que cobreixi els dos casos:

```tsx
								{(inactiveMembers.length > 0 || otherMembersLoading) && (
									<div>
										<h4
											style={{
												margin: '0 0 12px 0',
												color: 'var(--vscode-foreground)',
												fontSize: '13px',
												fontWeight: '600',
												textTransform: 'uppercase',
												letterSpacing: '0.5px',
												opacity: 0.7,
												textAlign: 'left'
											}}
										>
											Other Team Members
										</h4>
										{inactiveMembers.length === 0 && otherMembersLoading ? (
											<div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 0', color: 'var(--vscode-descriptionForeground)' }}>
												<div
													style={{
														border: '2px solid var(--vscode-panel-border)',
														borderTop: '2px solid var(--vscode-progressBar-background)',
														borderRadius: '50%',
														width: '14px',
														height: '14px',
														animation: 'spin 1s linear infinite'
													}}
												/>
												<span style={{ fontSize: '12px' }}>Loading other team members…</span>
											</div>
										) : (
											<div
												style={{
													display: 'grid',
													gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
													gap: '12px'
												}}
											>
												{/* ... mapeig d'inactiveMembers idèntic a l'actual ... */}
											</div>
										)}
									</div>
								)}
```

Conservar dins el `else` el mapeig existent d'`inactiveMembers` (línies 223-259) tal qual,
canviant només el tancament del bloc original.

- [ ] **Step 3: Pass the prop from MainWebview**

A `src/webview/components/MainWebview.tsx`, on es renderitza `<TeamSection ... />`, afegir:

```tsx
						otherMembersLoading={teamOtherLoading}
```

- [ ] **Step 4: Compile to verify no type errors**

Run: `npm run compile:fast`
Expected: compila net. La prop és obligatòria; verificar que totes les instàncies de `<TeamSection>` la passen.

- [ ] **Step 5: Commit**

```bash
git add src/webview/components/sections/TeamSection.tsx src/webview/components/MainWebview.tsx
git commit -m "feat: section spinner for Other Team Members during deferred load"
```

---

### Task 7: Verificació end-to-end i tests finals

**Files:**
- (cap canvi de codi previst; correccions si calen)

- [ ] **Step 1: Run the full test suite**

Run: `npm test`
Expected: tots els tests verds, inclosos els nous de `rallyServices.test.ts`.

- [ ] **Step 2: Full compile + lint**

Run: `npm run compile:fast`
Expected: compila net, sense errors de TypeScript.

- [ ] **Step 3: Manual smoke test (extensió)**

Llançar l'extensió (F5 / Run Extension), obrir la pestanya Team i verificar:
- La capçalera, el dropdown i els membres actius apareixen ràpidament (fase 1).
- "Other Team Members" mostra l'spinner i s'omple poc després (fase 2).
- Canviar de sprint al dropdown recarrega correctament les dues fases.
- Amb Rally no configurat, surt el banner d'error de configuració (sense regressió).

- [ ] **Step 4: Verify reduced Rally calls (debug logs)**

Activar debug mode (`ROBERT_DEBUG_MODE=true`) i comprovar als logs que la iteració current no es
consulta dues vegades a la xarxa (la segona via cache → font `cache`). Confirmar que les crides per
sprint a la fase 2 surten ~alhora (paral·lel).

- [ ] **Step 5: Final commit if any fix was needed**

```bash
git add -A
git commit -m "test: verify two-phase Team loading end-to-end"
```
