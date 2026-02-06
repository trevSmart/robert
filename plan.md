# Pla: Refactor UI - Tabs modulars + Sticky NavigationBar

## Context
`MainWebview.tsx` té 3,174 línies amb tot el contingut de les 7 pestanyes en un sol component.
L'objectiu és: (1) separar cada pestanya en un mòdul independent, i (2) fer la barra de navegació sticky amb scroll al contingut.

## Ordre d'execució

### Fase 1: Sticky NavigationBar + Scroll al contingut
**Per què primer:** És un canvi CSS/layout petit i independent que dona feedback visual immediat.

**Canvis:**
1. **`styled.ts`** - Modificar `Container` i `ContentArea`:
   - `Container`: canviar a `height: 100vh; display: flex; flex-direction: column;`
   - Afegir un `StickyNav` wrapper amb `flex-shrink: 0`
   - `ContentArea`: canviar a `flex: 1; overflow-y: auto; min-height: 0;`

2. **`MainWebview.tsx`** - Ajustar el layout del return:
   - Envolver `NavigationBar` amb el wrapper sticky
   - El `ContentArea` passa a ser l'àrea scrollable

### Fase 2: Extreure cada secció a un mòdul independent
**Estratègia:** Extreure el JSX de cada secció a un component propi, passant les props necessàries des de MainWebview. L'estat es queda a MainWebview (no cal context/zustand per ara).

**Nous fitxers a crear:**

| Fitxer | Contingut actual extret |
|--------|----------------------|
| `sections/SearchSection.tsx` | Línia ~1914-2043 (search input + resultats) |
| `sections/TeamSection.tsx` | Línia ~2046-2368 (team dashboard) |
| `sections/MetricsSection.tsx` | Línia ~2486-2530 (analytics + charts) |
| `sections/LibrarySection.tsx` | Línia ~2370-2484 + 2537-3108 (banners + tutorials) |

**Notes:**
- `Calendar`, `CollaborationView` i `Portfolio` ja són components externs, no cal extreure'ls.
- Les icones SVG no usades (prefixades amb `_`) es podran eliminar.
- Cada component nou rep les props que necessita via interface.
- El `MainWebview.tsx` passarà de ~3,174 a ~1,200-1,400 línies.

### Resum d'impacte
- 4 fitxers nous a `src/webview/components/sections/`
- Modificació de `MainWebview.tsx` (reducció ~60% de línies)
- Modificació de `styled.ts` (nous styled components per layout)
- Zero canvis funcionals - refactor pur
