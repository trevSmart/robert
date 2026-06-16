# Team Member Detail View Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Afegir una vista de detall de membre d'equip dins de la secció Team, accessible fent clic en una targeta de membre, amb un subheader enganxat per tornar enrere — igual que la vista de detall d'una User Story a Portfolio.

**Architecture:** S'afegeix un nou component `TeamMemberDetail` que s'incrusta dins de `TeamSection`. `TeamSection` passa a tenir estat intern de navegació: `teamScreen` ('list' | 'memberDetail') i `selectedTeamMember`. El clic a qualsevol targeta de membre (actiu o inactiu) transiciona a la vista de detall. S'utilitza el component `ScreenHeader` existent per al subheader amb botó "tornar enrere".

**Tech Stack:** React (FC, useState), TypeScript, VSCode CSS variables, component `ScreenHeader` existent, component `Avatar` existent.

## Global Constraints

- Usar exclusivament `var(--vscode-*)` CSS variables per a colors i estils — cap color hardcoded.
- Seguir el patró de `AllUserStoriesView`: `ScreenHeader` amb `showBackButton={true}` i `onBack` per a la vista de detall.
- No modificar `MainWebview.tsx` — tota la navegació és interna a `TeamSection`.
- No afegir crides a l'API Rally en aquest pla — la vista de detall inicial mostrarà la informació ja disponible al `TeamMember` existent.
- Preservar tota la funcionalitat existent de `TeamSection` intacta.

---

## File Structure

**Modificats:**
- `src/webview/components/sections/TeamSection.tsx` — afegir estat intern `teamScreen`/`selectedTeamMember`, fer les targetes clicables amb `onClick`, mostrar `TeamMemberDetail` o la llista existent condicionalment.

**Creats:**
- `src/webview/components/sections/team/TeamMemberDetail.tsx` — component de detall d'un membre, rep `member: TeamMember` i `onBack: () => void`.

---

### Task 1: Crear el component `TeamMemberDetail`

**Files:**
- Create: `src/webview/components/sections/team/TeamMemberDetail.tsx`

**Interfaces:**
- Consumes: `TeamMember` (importat de `../TeamSection`)
- Produces: component `TeamMemberDetail` amb props `{ member: TeamMember; onBack: () => void }`

- [ ] **Step 1: Crear el fitxer `TeamMemberDetail.tsx`**

```tsx
import type { FC } from 'react';
import Avatar from '../../common/Avatar';
import ScreenHeader from '../../common/ScreenHeader';
import type { TeamMember } from '../TeamSection';

interface TeamMemberDetailProps {
  member: TeamMember;
  onBack: () => void;
}

const TeamMemberDetail: FC<TeamMemberDetailProps> = ({ member, onBack }) => {
  const percentage = member.progress.percentage;
  const progressColor =
    percentage >= 75
      ? 'var(--vscode-charts-green, #4caf50)'
      : percentage >= 50
        ? 'var(--vscode-charts-orange, #ff9800)'
        : percentage >= 25
          ? 'var(--vscode-charts-yellow, #ffc107)'
          : 'var(--vscode-charts-red, #f44336)';

  const hasActivity = member.progress.totalHours > 0 || (member.progress.userStoriesCount ?? 0) > 0;

  return (
    <div style={{ padding: '0 20px' }}>
      <ScreenHeader title={member.name} showBackButton={true} onBack={onBack} />

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '20px',
          paddingTop: '20px'
        }}
      >
        {/* Avatar gran amb progrés */}
        <Avatar
          name={member.name}
          size={72}
          showRing={hasActivity}
          ringProgress={percentage}
          ringColor={progressColor}
        />

        {/* Nom */}
        <h2
          style={{
            margin: 0,
            color: 'var(--vscode-foreground)',
            fontSize: '20px',
            fontWeight: '600'
          }}
        >
          {member.name}
        </h2>

        {/* Stats cards */}
        {hasActivity && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '12px',
              width: '100%',
              maxWidth: '480px'
            }}
          >
            {/* % completat */}
            <div
              style={{
                backgroundColor: 'var(--vscode-editor-background)',
                border: '1px solid var(--vscode-panel-border)',
                borderRadius: '8px',
                padding: '16px',
                textAlign: 'center'
              }}
            >
              <div
                style={{
                  fontSize: '24px',
                  fontWeight: '700',
                  color: progressColor
                }}
              >
                {percentage}%
              </div>
              <div
                style={{
                  fontSize: '11px',
                  color: 'var(--vscode-descriptionForeground)',
                  marginTop: '4px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}
              >
                Completed
              </div>
            </div>

            {/* Hores completades */}
            <div
              style={{
                backgroundColor: 'var(--vscode-editor-background)',
                border: '1px solid var(--vscode-panel-border)',
                borderRadius: '8px',
                padding: '16px',
                textAlign: 'center'
              }}
            >
              <div
                style={{
                  fontSize: '24px',
                  fontWeight: '700',
                  color: 'var(--vscode-foreground)'
                }}
              >
                {member.progress.completedHours}h
              </div>
              <div
                style={{
                  fontSize: '11px',
                  color: 'var(--vscode-descriptionForeground)',
                  marginTop: '4px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}
              >
                Done
              </div>
            </div>

            {/* Hores totals */}
            <div
              style={{
                backgroundColor: 'var(--vscode-editor-background)',
                border: '1px solid var(--vscode-panel-border)',
                borderRadius: '8px',
                padding: '16px',
                textAlign: 'center'
              }}
            >
              <div
                style={{
                  fontSize: '24px',
                  fontWeight: '700',
                  color: 'var(--vscode-foreground)'
                }}
              >
                {member.progress.totalHours}h
              </div>
              <div
                style={{
                  fontSize: '11px',
                  color: 'var(--vscode-descriptionForeground)',
                  marginTop: '4px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}
              >
                Total
              </div>
            </div>
          </div>
        )}

        {/* User stories count (si disponible) */}
        {hasActivity && (member.progress.userStoriesCount ?? 0) > 0 && (
          <div
            style={{
              backgroundColor: 'var(--vscode-editor-background)',
              border: '1px solid var(--vscode-panel-border)',
              borderRadius: '8px',
              padding: '12px 24px',
              textAlign: 'center'
            }}
          >
            <span style={{ color: 'var(--vscode-foreground)', fontSize: '14px' }}>
              <strong>{member.progress.userStoriesCount}</strong>
              {' '}user {member.progress.userStoriesCount === 1 ? 'story' : 'stories'} this sprint
            </span>
          </div>
        )}

        {/* Sense activitat */}
        {!hasActivity && (
          <p style={{ color: 'var(--vscode-descriptionForeground)', fontSize: '14px' }}>
            No activity recorded for this sprint.
          </p>
        )}
      </div>
    </div>
  );
};

export default TeamMemberDetail;
```

- [ ] **Step 2: Verificar que el fitxer existeix i compila**

```bash
cd /Users/marcpla/Documents/Projectes/robert && npx tsc --noEmit 2>&1 | grep -E "TeamMemberDetail|team/" | head -20
```

Esperat: cap error relacionat amb `TeamMemberDetail`.

- [ ] **Step 3: Commit**

```bash
git add src/webview/components/sections/team/TeamMemberDetail.tsx
git commit -m "feat: add TeamMemberDetail component"
```

---

### Task 2: Actualitzar `TeamSection` per suportar navegació interna

**Files:**
- Modify: `src/webview/components/sections/TeamSection.tsx`

**Interfaces:**
- Consumes: `TeamMemberDetail` de `./team/TeamMemberDetail`
- Produces: `TeamSection` amb estat intern que navega entre llista i detall

- [ ] **Step 1: Afegir `useState` i importar `TeamMemberDetail` a `TeamSection.tsx`**

Al principi del fitxer, substituir:
```tsx
import { FC } from 'react';
import Avatar from '../common/Avatar';
```
Per:
```tsx
import { FC, useState } from 'react';
import Avatar from '../common/Avatar';
import TeamMemberDetail from './team/TeamMemberDetail';
```

- [ ] **Step 2: Afegir estat intern de navegació dins del component**

Dins de `TeamSection` FC, just despres de les línies on es declara `const pastIterations`, afegir:

```tsx
const [selectedTeamMember, setSelectedTeamMember] = useState<TeamMember | null>(null);

const handleMemberClick = (member: TeamMember) => {
  setSelectedTeamMember(member);
};

const handleBackToTeam = () => {
  setSelectedTeamMember(null);
};
```

- [ ] **Step 3: Renderitzar `TeamMemberDetail` quan hi hagi un membre seleccionat**

Al principi del `return` del component, ABANS del `<div style={{ padding: '20px' }}>` existent, afegir:

```tsx
if (selectedTeamMember) {
  return <TeamMemberDetail member={selectedTeamMember} onBack={handleBackToTeam} />;
}
```

Queda al `return` principal:
```tsx
if (selectedTeamMember) {
  return <TeamMemberDetail member={selectedTeamMember} onBack={handleBackToTeam} />;
}

return (
  <div style={{ padding: '20px' }}>
    {/* ...codi existent... */}
  </div>
);
```

- [ ] **Step 4: Fer les targetes de membres actius clicables amb `onClick`**

A la targeta dels membres actius (el `<div key={member.name}>` dins de `activeMembers.map`), afegir `onClick`:

```tsx
<div
  key={member.name}
  onClick={() => handleMemberClick(member)}
  style={{
    backgroundColor: 'var(--vscode-editor-background)',
    border: '1px solid var(--vscode-panel-border)',
    borderRadius: '8px',
    padding: '12px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    cursor: 'pointer',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease'
  }}
  onMouseEnter={e => {
    e.currentTarget.style.transform = 'translateY(-2px)';
    e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.1)';
  }}
  onMouseLeave={e => {
    e.currentTarget.style.transform = 'translateY(0)';
    e.currentTarget.style.boxShadow = 'none';
  }}
>
```

(La targeta ja té `cursor: 'pointer'`, només cal afegir `onClick={() => handleMemberClick(member)}`.)

- [ ] **Step 5: Fer les targetes de membres inactius clicables amb `onClick`**

A la targeta dels membres inactius (el `<div key={member.name}>` dins de `inactiveMembers.map`), afegir igualment `onClick={() => handleMemberClick(member)`.

- [ ] **Step 6: Verificar que compila sense errors**

```bash
cd /Users/marcpla/Documents/Projectes/robert && npx tsc --noEmit 2>&1 | head -30
```

Esperat: cap error de TypeScript.

- [ ] **Step 7: Commit**

```bash
git add src/webview/components/sections/TeamSection.tsx
git commit -m "feat: add team member detail navigation to TeamSection"
```

---

## Self-Review

**Spec coverage:**
- ✅ Vista detall membre accessible fent clic a la targeta — Task 2, Step 4 & 5
- ✅ Subheader amb botó enrere fixat — `ScreenHeader` amb `showBackButton={true}` al `TeamMemberDetail`
- ✅ Patró igual que Portfolio (AllUserStoriesView → UserStoryDetail) — mateixa estructura amb `ScreenHeader`
- ✅ Membres actius i inactius navigables — Step 4 & 5 de Task 2

**Placeholder scan:** Cap TBD ni TODO al pla. Tots els passos de codi mostren el codi complet.

**Type consistency:**
- `TeamMember` importat des de `../TeamSection` a `TeamMemberDetail.tsx` ✅
- `member: TeamMember` i `onBack: () => void` usats de forma consistent ✅
- `handleMemberClick(member: TeamMember)` i `setSelectedTeamMember(null)` coherents ✅
