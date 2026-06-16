# Càrrega en dues fases de la pestanya Team

**Data:** 2026-06-16
**Estat:** Disseny aprovat, pendent d'implementació

## Problema

En obrir la pestanya Team per primer cop, tota la vista triga a aparèixer. El handler
`handleLoadTeamMembers` ([RallyMessageHandler.ts:485](../../../src/webview/messageHandlers/RallyMessageHandler.ts#L485))
fa dues operacions **en sèrie** i no envia res al webview fins que totes dues acaben:

1. `getRecentTeamMembers(6)` — descobreix la llista de tots els membres dels últims 6 sprints.
   Internament fa **6 crides `getUserStories` en sèrie** (una per sprint) dins un `for…await`
   ([rallyServices.ts:1817-1843](../../../src/libs/rally/rallyServices.ts#L1817-L1843)).
   Cada round-trip espera l'anterior → ~6× latència encadenada.
2. `getAllTeamMembersProgress(...)` — 1 crida per la iteració current; calcula hores/percentatge.

La llista completa de membres (les 6 crides) només serveix per descobrir noms que apareixen a
la secció **"Other Team Members"** (membres sense activitat a la sprint current). Els membres
**actius** depenen únicament de la iteració current, que ja es calcula a `getAllTeamMembersProgress`.

### Fetch redundant detectat (ES RESOL en aquest disseny)

`checkCacheForFilteredResults` ([rallyServices.ts:671-691](../../../src/libs/rally/rallyServices.ts#L671))
compara `item['Iteration'] === query['Iteration']`. Però la user story formatada desa el camp
com `iteration` (minúscula) i és un **objecte** `{objectId, _ref, _refObjectName}`
([rallyServices.ts:642-648](../../../src/libs/rally/rallyServices.ts#L642-L648)), no un string
`/iteration/12345`. Per tant la comprovació de cache filtrada per iteració **sempre falla** i cada
`getUserStories({Iteration})` va sempre a la xarxa.

A més, els consumidors passen el filtre `Iteration` en **dos formats diferents**:
- Serveis del Team: `/iteration/${objectId}` (ref curt) —
  [rallyServices.ts:1821](../../../src/libs/rally/rallyServices.ts#L1821), 1921, 2204.
- `loadUserStories` del webview: `iteration._ref`, que és el **ref complet** de Rally
  (`https://…/v2.0/iteration/12345`) — [MainWebview.tsx:798](../../../src/webview/components/MainWebview.tsx#L798)
  via [RallyMessageHandler.ts:192](../../../src/webview/messageHandlers/RallyMessageHandler.ts#L192).

El fix ha de ser robust als dos formats comparant per `objectId`.

`getIterations()` es crida dos cops però la segona va a cache TTL de 30 min
([rallyServices.ts:744-754](../../../src/libs/rally/rallyServices.ts#L744-L754)), així que no és
un round-trip real.

## Objectiu

Pintar la vista completa de Team de seguida (membres actius + estructura), i carregar la secció
"Other Team Members" de manera diferida amb un spinner propi a la secció. No es perd cap informació.

## Arquitectura: dues fases

### Fase 1 (ràpida) — progrés de la iteració seleccionada

- `getAllTeamMembersProgress` ja carrega totes les stories de la iteració current/seleccionada i
  les agrupa per assignee (`storiesByUser`, [rallyServices.ts:2212-2231](../../../src/libs/rally/rallyServices.ts#L2212-L2231)).
  Es modifica perquè, quan no rebi llista de membres, **derivi els assignees actius** d'aquestes
  stories i retorni tant el progrés com la llista de membres actius.
- El provider envia `teamMembersLoaded` amb només els membres actius i el seu progrés.
- El webview pinta la vista completa. La secció "Other Team Members" mostra el seu spinner propi.

### Fase 2 (diferida) — membres històrics dels 6 sprints

- `getRecentTeamMembers(6)`, amb les 6 crides **paral·lelitzades** (`Promise.all` en comptes de
  `for…await`).
- El provider envia `teamMembersOtherLoaded` amb la llista històrica completa (amb progrés reaprofitat
  del `progressMap` de la fase 1; els no-actius tindran progrés 0).
- El webview calcula "Other" = històrics − actius i omple la secció, traient l'spinner.

### Flux de dades

```
Webview → loadTeamMembers(iterationId)
Provider:
  ├─ Fase 1: getAllTeamMembersProgress(undefined, iterationId)
  │            → { progressMap, members: activeMembers }
  │          postMessage('teamMembersLoaded', { teamMembers: actius+progrés, iterationId })   ← vista pintada
  └─ Fase 2: getRecentTeamMembers(6)   [6 crides en Promise.all]
             postMessage('teamMembersOtherLoaded', { teamMembers: històrics+progrés, iterationId })   ← omple "Other"
```

La fase 2 s'`await`-eja després d'enviar la fase 1, de manera que no bloqueja el render inicial.

## Canvis per fitxer

### 1. `src/libs/rally/rallyServices.ts` — `getAllTeamMembersProgress` (línia 2120)

- `teamMembers` passa a ser opcional. Quan no es passa (o ve buit), derivar la llista de membres
  actius de les claus de `storiesByUser` (mapejant del nom normalitzat al nom original via
  `assigneeNameMap`).
- Canviar el tipus de retorn a `{ progressMap, members }` on `members: string[]` són els assignees
  actius de la iteració. El càlcul intern de progrés no canvia.
- Adaptar tots els consumidors actuals d'aquesta funció al nou retorn.

### 1b. `src/libs/rally/rallyServices.ts` — fix cache filtrada per iteració (`checkCacheForFilteredResults`, línia 671)

- Afegir maneig especial de la clau `Iteration`: extreure l'objectId del valor de la query (que pot
  venir com a ref curt `/iteration/12345` o ref complet `https://…/iteration/12345`) amb un helper
  tipus `extractIterationId(ref)` (p. ex. `String(ref).split('/').pop()`), i comparar-lo contra
  `item.iteration?.objectId`.
- La resta de claus mantenen la comparació estricta actual (`item[key] === query[key]`).
- Conseqüència: `getUserStories({ Iteration })` reaprofita stories ja a `rallyData.userStories` per
  iteració. La iteració current consultada per la fase 1 i per `getRecentTeamMembers` deixa de
  generar dues crides HTTP a la xarxa.

**Paginació (no és regressió):** quan la cache filtrada encerta, `getUserStories` retorna fins a
`PAGE_SIZE` (=100) resultats ([rallyServices.ts:874-886](../../../src/libs/rally/rallyServices.ts#L874-L886)).
Els serveis del Team ja consumeixen avui **només la primera pàgina** de cada iteració: llegeixen
`userStoriesResult.userStories` un sol cop, sense bucle de paginació
([rallyServices.ts:1824-1825](../../../src/libs/rally/rallyServices.ts#L1824-L1825),
[2205-2206](../../../src/libs/rally/rallyServices.ts#L2205-L2206)). El fix manté exactament aquest
comportament (≤100 stories per iteració) tant per la via API com per la via cache, així que **no
introdueix cap regressió**. Si en el futur cal cobrir iteracions amb >100 stories, és un canvi
independent (paginar els serveis del Team). Es deixa una prova que documenti el límit de pàgina.

### 2. `src/libs/rally/rallyServices.ts` — `getRecentTeamMembers` (línia 1817)

- Substituir el `for (const iteration of recentIterations) { await getUserStories(...) }` per
  `Promise.all(recentIterations.map(it => getUserStories({ Iteration: ... })))` i fusionar els
  assignees després. Cache i forma de retorn es mantenen.

### 3. `src/webview/messageHandlers/RallyMessageHandler.ts` — `handleLoadTeamMembers` (línia 485)

- Invertir l'ordre:
  1. `const { progressMap, members: activeMembers } = await getAllTeamMembersProgress(undefined, iterationId);`
     → `postMessage('teamMembersLoaded', { teamMembers: <actius amb progrés>, iterationId })`.
  2. `const recent = await getRecentTeamMembers(6);`
     → muntar `teamMembers` històrics amb progrés (reaprofitant `progressMap`; default 0)
     → `postMessage('teamMembersOtherLoaded', { teamMembers: <històrics amb progrés>, iterationId })`.
- Maneig d'errors: la fase 1 manté el comportament actual (`teamMembersError`, incloent
  `needsConfiguration`). Si la fase 2 falla, no s'emet error global: es loga i s'envia
  `teamMembersOtherLoaded` amb llista buida perquè el webview tregui l'spinner.

### 4. `src/webview/components/MainWebview.tsx`

- `case 'teamMembersLoaded'` (línia 1604): igual que ara, però marca l'spinner de la secció Other
  com a actiu (`setTeamOtherLoading(true)`). La guarda de iteració
  (`loadedTeamIterationRef`/`requestedTeamIterationRef`) es manté lligada a aquesta fase.
- Nou `case 'teamMembersOtherLoaded'`: fusionar històrics amb els actius ja presents (dedup per
  `name`, els actius manen) i `setTeamOtherLoading(false)`. Ignorar el missatge si el seu
  `iterationId` no coincideix amb la iteració carregada (evita pintar "Other" d'una selecció obsoleta).
- Nou estat `const [teamOtherLoading, setTeamOtherLoading] = useState(false)`.
- Passar `otherMembersLoading={teamOtherLoading}` a `TeamSection`.

### 5. `src/webview/components/sections/TeamSection.tsx`

- Nova prop `otherMembersLoading: boolean` a `TeamSectionProps`.
- A la secció "Other Team Members": si `otherMembersLoading` i encara no hi ha inactius, mostrar el
  títol "Other Team Members" amb un spinner petit a sota (reusant l'estil del spinner existent de
  les línies 81-90, en mida reduïda). Quan arribin els inactius, substituir per la graella habitual.

## Maneig d'errors

- **Fase 1 falla:** comportament actual intacte (`teamMembersError`, banner global, suport
  `needsConfiguration`).
- **Fase 2 falla:** la vista ja està pintada. Es loga l'error i s'envia `teamMembersOtherLoaded`
  amb llista buida → l'spinner desapareix i "Other" queda buida. Sense banner global.

## Comportament amb el dropdown de sprint passat

En triar un sprint passat ([TeamSection.tsx:113-132](../../../src/webview/components/sections/TeamSection.tsx#L113)),
`loadTeamMembers(iterationId)` es torna a cridar. El disseny funciona igual: la fase 1 calcula el
progrés de la iteració **seleccionada** (membres actius en aquell sprint) i la fase 2 carrega els
històrics dels 6 sprints (independent de la selecció). El `iterationId` als missatges permet
descartar respostes obsoletes si l'usuari canvia de selecció enmig de la càrrega.

## Fora d'abast (YAGNI)

- Reduir les 6 crides a 1 amb un filtre `OR` d'iteracions (no es prioritza; la paral·lelització ja
  redueix la latència a ~1 round-trip).
- Paginar els serveis del Team per cobrir iteracions amb >100 stories (comportament preexistent de
  pàgina única, no és regressió d'aquest disseny).
- Canviar el nombre de sprints històrics (es manté 6).
