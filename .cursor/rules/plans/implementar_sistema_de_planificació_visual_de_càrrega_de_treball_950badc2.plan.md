---
name: Implementar Sistema de Planificació Visual de Càrrega de Treball
overview: Crear un sistema drag-and-drop interactiu per distribuir la càrrega de treball dels sprints entre els membres de l'equip, utilitzant les dades de Rally ja disponibles a l'extensió Robert.
todos:
  - id: install-react-dnd
    content: Afegir dependència react-dnd per funcionalitat drag-and-drop
    status: completed
  - id: create-workload-types
    content: Crear tipus TypeScript per estat de planificació (WorkloadPlan, UserCapacity, etc.)
    status: completed
  - id: implement-workload-calculator
    content: Implementar WorkloadCalculator amb lògica de validacions i auto-distribució
    status: completed
  - id: create-user-story-card
    content: Crear component UserStoryCard amb amplada proporcional a planEstimate
    status: completed
  - id: create-capacity-container
    content: Crear UserCapacityContainer amb feedback visual de sobrecàrrega
    status: completed
  - id: implement-workload-board
    content: Implementar WorkloadBoard amb lògica drag-and-drop completa
    status: completed
  - id: create-plan-workload-view
    content: Crear PlanWorkloadView component principal amb estat i controls
    status: completed
  - id: integrate-main-webview
    content: Integrar nova pestanya 'Plan' al NavigationBar del MainWebview
    status: completed
  - id: add-webview-messages
    content: Afegir missatges webview per guardar/carregar plans de treball
    status: completed
  - id: add-commands
    content: Registrar nous comandaments (openPlanningView, saveWorkloadPlan)
    status: completed
  - id: add-settings
    content: Afegir configuracions per capacitat per defecte i preferències de planificació
    status: completed
  - id: test-integration
    content: Provar integració completa amb dades reals de Rally
    status: completed
isProject: false
---

## Arquitectura General

El sistema es implementarà com una nova vista "Plan" integrada dins del MainWebview, reutilitzant l'arquitectura existent de React i les dades de Rally.

### 1. Components Principals

**PlanWorkloadView** - Component principal que gestionarà l'estat de la planificació

- **WorkloadBoard** - Tauler principal amb contenidors per cada usuari
- **UserStoryCard** - Targetes arrossegables amb amplada proporcional a planEstimate
- **UserCapacityContainer** - Contenidors que representen la capacitat de cada usuari
- **WorkloadCalculator** - Utilitats per càlculs de distribució i validacions

### 2. Estat i Dades

Utilitzarà les dades Rally existents:

- `userStories` amb `planEstimate` (hores)
- `users` del projecte
- Estat local per la distribució actual

### 3. Interfície d'Usuari

- **Drag & Drop intuitiu** amb feedback visual
- **Validacions automàtiques** de sobrecàrrega (vermell) i subutilització (groc)
- **Controls per**:
  - Auto-distribució equilibrada
  - Reset de planificació
  - Export de pla
  - Guardar/carregar plans

### 4. Integració amb Extensió

- **Nova pestanya** al NavigationBar del MainWebview
- **Missatges webview** per persistència d'estat
- **Comandaments** nous: `robert.openPlanningView`, `robert.saveWorkloadPlan`

## Flux de Dades

```mermaid
graph TD
    A[Rally API] --> B[Extension Cache]
    B --> C[MainWebview]
    C --> D[PlanWorkloadView]
    D --> E[WorkloadBoard]
    E --> F[UserCapacityContainer]
    E --> G[UserStoryCard]

    H[User Actions] --> I[Drag & Drop Handler]
    I --> J[Validation Logic]
    J --> K[State Updates]
    K --> L[UI Feedback]

    M[Save Plan] --> N[Webview Message]
    N --> O[Extension Storage]
```

## Implementació Tècnica

### Tecnologies Utilitzades

- **React** (ja disponible)
- **styled-components** (ja disponible)
- **React DnD** (nova dependència per drag-and-drop)
- **Arquitectura existent** de webviews i missatges

### Estructura de Fitxers

```
src/webview/components/
├── PlanWorkloadView.tsx          # Component principal
├── common/
│   ├── WorkloadBoard.tsx         # Tauler drag-and-drop
│   ├── UserCapacityContainer.tsx # Contenidor per usuari
│   ├── UserStoryCard.tsx         # Targeta arrossegable
│   └── WorkloadCalculator.ts     # Lògica de càlculs
```

### Validacions i Regles

- **Capacitat per defecte**: 40 hores/sprint (configurable)
- **Validacions visuals**:
  - >100% capacitat = vermell
  - 80-100% = groc
  - <80% = verd
- **Auto-distribució**: algoritme simple de distribució proporcional

### Persistència

- **Estat local** durant la sessió
- **Guardar plans** a settings de VS Code
- **Export** a formats JSON/CSV per compartir