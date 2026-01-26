# Visual Structure: Metrics Tab Implementation

## 📊 Metrics Tab Layout

```
┌─────────────────────────────────────────────────────────────────┐
│                        Project Analytics                         │
│                  Real-time insights from Rally                   │
└─────────────────────────────────────────────────────────────────┘

┌──────────────┬──────────────┬──────────────┬──────────────┐
│  Avg Velocity│Points Complet│Work In Prog  │Blocked Items │
│      42      │     85       │     12       │     2        │
│  (pts)       │              │              │              │
│ [Purple Grad]│[Pink Grad]   │[Teal Grad]   │[Red Grad]    │
└──────────────┴──────────────┴──────────────┴──────────────┘
                    ↑ SprintKPIs Component

┌─────────────────────────────────────────────────────────────────┐
│                     Velocity Trend (Last 6 Sprints)              │
│  ╭─────────────────────────────────────────────────────────────╮│
│  │ ▂▄▆█▆▅  ← Bar Chart (Story Points)                         ││
│  │ ─────── ← Line Chart (Moving Average)                       ││
│  ╰─────────────────────────────────────────────────────────────╯│
└─────────────────────────────────────────────────────────────────┘
           ↑ VelocityTrendChart Component (ECharts)

┌────────────────────────────┬────────────────────────────────────┐
│  State Distribution        │  Defects by Severity               │
│  ╭──────────────────────╮  │  ╭──────────────────────────────╮ │
│  │   ⊙ Donut Chart      │  │  │  ▣▣▣▣ Stacked Bars          │ │
│  │   • Completed (42%)  │  │  │  Critical: ██ open ░░ closed│ │
│  │   • In-Progress (35%)│  │  │  Major:    ██ open ░░ closed│ │
│  │   • Defined (23%)    │  │  │  Minor:    ██ open ░░ closed│ │
│  ╰──────────────────────╯  │  │  Cosmetic: ██ open ░░ closed│ │
│                            │  ╰──────────────────────────────╯ │
└────────────────────────────┴────────────────────────────────────┘
    ↑ StateDistributionPie      ↑ DefectSeverityChart (ECharts)
           (ECharts)
```

## 🏢 Teams Tab Layout

```
┌─────────────────────────────────────────────────────────────────┐
│                           Teams                                  │
└─────────────────────────────────────────────────────────────────┘

┌──────────────────────────┐
│      Team Members        │
│          12              │
│ (Last 6 Sprints)         │
│     [Purple Gradient]    │
└──────────────────────────┘
    ↑ Team Members Count KPI

┌─────────────────────────────────────────────────────────────────┐
│                        Team Members                              │
│  ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐   │
│  │  [MP]  │  │  [JD]  │  │  [AS]  │  │  [KL]  │  │  [RM]  │   │
│  │Marc Pla│  │John Doe│  │...     │  │...     │  │...     │   │
│  └────────┘  └────────┘  └────────┘  └────────┘  └────────┘   │
│                         ... more cards ...                       │
└─────────────────────────────────────────────────────────────────┘
             ↑ Grid of Team Member Cards (Auto-fit)
```

## 📁 Component Hierarchy

```
MainWebview.tsx
│
├── activeSection === 'metrics'
│   ├── Header (Project Analytics)
│   ├── <SprintKPIs />
│   │   ├── Avg Velocity Card (purple gradient)
│   │   ├── Points Completed Card (pink gradient)
│   │   ├── WIP Card (teal gradient)
│   │   └── Blocked Items Card (red/green gradient)
│   │
│   ├── <VelocityTrendChart />
│   │   └── ECharts Instance
│   │       ├── Bar Series (Story Points)
│   │       └── Line Series (Moving Average)
│   │
│   └── Grid (2 columns)
│       ├── <StateDistributionPie />
│       │   └── ECharts Instance (Donut)
│       │       └── State Data with Colors
│       │
│       └── <DefectSeverityChart />
│           └── ECharts Instance (Stacked Bar)
│               ├── Critical Open/Closed
│               ├── Major Open/Closed
│               ├── Minor Open/Closed
│               └── Cosmetic Open/Closed
│
└── activeSection === 'teams' (verified, not modified)
    ├── Team Members Count KPI
    └── Team Members Grid
        └── Member Cards (initials, name, font-weight: 400)
```

## 🔄 Data Flow Diagram

```
User Opens Metrics Tab
        ↓
handleSectionChange('metrics')
        ↓
loadIterations() triggered
        ↓
Iterations loaded from Rally API
        ↓
useEffect watches [activeSection, iterations, portfolioUserStories, defects]
        ↓
metricsUtils calculations run:
├── calculateVelocity() → velocityData
├── calculateAverageVelocity() → averageVelocity
├── calculateCompletedPoints() → completedPoints
├── calculateWIP() → wip
├── calculateBlockedItems() → blockedItems
├── groupByState() → stateDistribution
└── aggregateDefectsBySeverity() → defectsBySeverity
        ↓
State updated with calculated metrics
        ↓
Components re-render with new data:
├── SprintKPIs receives KPI props
├── VelocityTrendChart receives velocityData
├── StateDistributionPie receives stateDistribution
└── DefectSeverityChart receives defectsBySeverity
```

## 🎨 Color Scheme

### Sprint KPIs Cards
- **Avg Velocity**: `linear-gradient(135deg, #6b7a9a 0%, #7a6b9a 100%)` (purple)
- **Points Completed**: `linear-gradient(135deg, #9a7a8a 0%, #9a6b7a 100%)` (pink)
- **WIP**: `linear-gradient(135deg, #6b8a9a 0%, #7a9a9a 100%)` (teal)
- **Blocked Items**: 
  - Normal: `linear-gradient(135deg, #7a9a8a 0%, #8a9a7a 100%)` (green)
  - Warning: `linear-gradient(135deg, #d32f2f 0%, #c62828 100%)` (red)

### State Distribution Colors
- **Completed**: `#4caf50` (green)
- **In-Progress**: `#2196f3` (blue)
- **Defined**: `#9e9e9e` (gray)
- **Other states**: Auto-generated from state name

### Defect Severity Colors
- **Critical**: 
  - Open: `#d32f2f` (red)
  - Closed: `#ffcdd2` (light red, 60% opacity)
- **Major**: 
  - Open: `#ff9800` (orange)
  - Closed: `#ffe0b2` (light orange, 60% opacity)
- **Minor**: 
  - Open: `#fbc02d` (yellow)
  - Closed: `#fff9c4` (light yellow, 60% opacity)
- **Cosmetic**: 
  - Open: `#7e57c2` (purple)
  - Closed: `#d1c4e9` (light purple, 60% opacity)

## 📊 Chart Types Used

1. **ECharts Bar Chart** (Velocity Trend)
   - Type: Mixed (Bar + Line)
   - Features: Tooltip, Legend, Grid
   - Responsive: Yes

2. **ECharts Pie Chart** (State Distribution)
   - Type: Donut (radius: ['40%', '70%'])
   - Features: Tooltip, Legend, Labels
   - Responsive: Yes

3. **ECharts Stacked Bar Chart** (Defect Severity)
   - Type: Stacked Bar (horizontal)
   - Features: Tooltip, Legend, Grid
   - Stack: Open/Closed per severity
   - Responsive: Yes

## 🎯 Responsive Behavior

### Sprint KPIs
- Grid: `repeat(auto-fit, minmax(120px, 1fr))`
- Wraps to multiple rows on small screens
- Min width: 120px per card

### Velocity Chart
- Full width, responsive height
- Adapts to container size
- ECharts auto-resize on window resize

### State & Defect Charts
- Grid: `1fr 1fr` (2 equal columns)
- On mobile: Would need CSS @media query to stack vertically
- Each chart: Responsive within its column

### Team Members Grid
- Grid: `repeat(auto-fit, minmax(200px, 1fr))`
- Min width: 200px per card
- Auto-wraps based on available width

## 🔒 Theme Support

All components use VSCode CSS variables:
- `var(--vscode-foreground)` - Text color
- `var(--vscode-descriptionForeground)` - Secondary text
- `var(--vscode-editor-background)` - Background
- `var(--vscode-panel-border)` - Borders
- `var(--vscode-errorForeground)` - Error messages

Charts automatically adapt colors based on theme using `isLightTheme()` utility.
