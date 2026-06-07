# Avatar Component Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a reusable `Avatar` component with algorithmic color-from-name and integrate it across all user references in the extension's webview.

**Architecture:** A single `Avatar.tsx` file exports both `Avatar` (circle + optional SVG progress ring) and `AvatarWithName` (avatar + name label, for table cells). Color is derived deterministically from the user's name via a weighted char-sum hash mapped to an HSL hue. TeamSection's inline avatar JSX is replaced by the component; all four table files replace their plain-text user fields with `AvatarWithName`.

**Tech Stack:** React (TSX), inline styles (matches existing codebase pattern — no styled-components in new file), no external dependencies.

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `src/webview/components/common/Avatar.tsx` | **Create** | `Avatar` + `AvatarWithName` exports, color algorithm |
| `src/webview/components/sections/TeamSection.tsx` | **Modify** | Replace inline avatar JSX (active L207–224, inactive L310–327) |
| `src/webview/components/common/UserStoriesTable.tsx` | **Modify** | L315: replace plain text assignee with `AvatarWithName` |
| `src/webview/components/common/TasksTable.tsx` | **Modify** | L233: replace plain text owner with `AvatarWithName` |
| `src/webview/components/common/TestCasesTable.tsx` | **Modify** | L219: replace plain text owner with `AvatarWithName` |
| `src/webview/components/common/DiscussionsTable.tsx` | **Modify** | L159: add `Avatar` before `AuthorName` in `MessageHeader` |

---

### Task 1: Create `Avatar.tsx` with color algorithm and `Avatar` component

**Files:**
- Create: `src/webview/components/common/Avatar.tsx`

- [ ] **Step 1: Create the file with the color algorithm and `Avatar` component**

```tsx
import React from 'react';

function getAvatarColor(name: string): string {
  if (!name || !name.trim()) {
    return 'hsl(0, 0%, 35%)';
  }
  let sum = 0;
  for (let i = 0; i < name.length; i++) {
    sum += name.charCodeAt(i) * (i + 1);
  }
  const hue = sum % 360;
  return `hsl(${hue}, 45%, 45%)`;
}

function getInitials(name: string): string {
  if (!name || !name.trim()) {
    return '?';
  }
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

interface AvatarProps {
  name: string;
  size?: number;
  showRing?: boolean;
  ringProgress?: number;
  ringColor?: string;
  fontSize?: number;
}

const Avatar: React.FC<AvatarProps> = ({
  name,
  size = 24,
  showRing = false,
  ringProgress = 0,
  ringColor = 'var(--vscode-charts-green, #4caf50)',
  fontSize,
}) => {
  const bg = getAvatarColor(name);
  const initials = getInitials(name);
  const fs = fontSize ?? Math.round(size * 0.38);

  if (!showRing) {
    return (
      <div
        style={{
          width: `${size}px`,
          height: `${size}px`,
          borderRadius: '50%',
          background: bg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontWeight: 'bold',
          fontSize: `${fs}px`,
          flexShrink: 0,
        }}
      >
        {initials}
      </div>
    );
  }

  // With progress ring: avatar sits inside an SVG ring.
  // The SVG is sized to avatar + 2*8px margin (matches original TeamSection layout).
  const margin = 8;
  const svgSize = size + margin * 2;
  const cx = svgSize / 2;
  const cy = svgSize / 2;
  const r = cx - 4; // leave room for stroke
  const circumference = 2 * Math.PI * r;
  const offset = circumference * (1 - ringProgress / 100);

  return (
    <div role="progressbar" aria-valuenow={ringProgress} aria-valuemin={0} aria-valuemax={100} style={{ position: 'relative' }}>
      <svg
        width={svgSize}
        height={svgSize}
        style={{
          position: 'absolute',
          top: `-${margin}px`,
          left: `-${margin}px`,
          transform: 'rotate(-90deg)',
        }}
      >
        <circle cx={cx} cy={cy} r={r} stroke="var(--vscode-widget-border)" strokeWidth="3" fill="none" />
        <circle
          cx={cx}
          cy={cy}
          r={r}
          stroke={ringColor}
          strokeWidth="3"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.5s ease, stroke 0.3s ease' }}
        />
      </svg>
      <div
        style={{
          width: `${size}px`,
          height: `${size}px`,
          borderRadius: '50%',
          background: bg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontWeight: 'bold',
          fontSize: `${fs}px`,
          marginBottom: '6px',
          flexShrink: 0,
        }}
      >
        {initials}
      </div>
    </div>
  );
};

export default Avatar;
```

- [ ] **Step 2: Add `AvatarWithName` named export at the bottom of the same file**

Append after the `export default Avatar;` line:

```tsx
interface AvatarWithNameProps {
  name: string;
  size?: number;
  emptyLabel?: string;
}

export const AvatarWithName: React.FC<AvatarWithNameProps> = ({
  name,
  size = 20,
  emptyLabel = 'Unassigned',
}) => {
  const isEmpty = !name || !name.trim();
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
      <Avatar name={name} size={size} />
      <span style={{ color: isEmpty ? '#6c757d' : undefined }}>
        {isEmpty ? emptyLabel : name}
      </span>
    </div>
  );
};
```

- [ ] **Step 3: Verify the file compiles — run the TypeScript check**

```bash
cd /Users/marcpla/Documents/Projectes/robert && npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors referencing `Avatar.tsx`.

- [ ] **Step 4: Commit**

```bash
git add src/webview/components/common/Avatar.tsx
git commit -m "feat: add Avatar component with HSL color-from-name algorithm"
```

---

### Task 2: Refactor TeamSection active member avatar

**Files:**
- Modify: `src/webview/components/sections/TeamSection.tsx`

The active member card currently computes `initials` manually (L146–150) and renders an inline avatar div (L207–224) inside an SVG progress ring. We replace both with the `Avatar` component.

Note: the progress ring `ringColor` is currently computed per-member from `percentage` (L153). We pass it through to `Avatar`.

- [ ] **Step 1: Add the Avatar import at the top of TeamSection.tsx**

At line 1, after `import { FC } from 'react';`, add:

```tsx
import React from 'react';
import Avatar from '../common/Avatar';
```

(TeamSection currently has no React import — check if JSX transform is configured. If `tsc --noEmit` passes without it, skip the React import.)

- [ ] **Step 2: Remove the inline initials computation and avatar div for active members**

In the `activeMembers.map` callback, delete these lines (approximately L146–150):

```tsx
const initials = member.name
  .split(' ')
  .map(part => part.charAt(0).toUpperCase())
  .join('')
  .slice(0, 2);
```

And replace the avatar container block (the `<div role="progressbar"...>` block, approximately L180–224) with:

```tsx
<Avatar
  name={member.name}
  size={48}
  showRing={true}
  ringProgress={percentage}
  ringColor={progressColor}
/>
```

- [ ] **Step 3: Remove the inline initials computation and avatar div for inactive members**

In the `inactiveMembers.map` callback, delete lines ~L267–271:

```tsx
const initials = member.name
  .split(' ')
  .map(part => part.charAt(0).toUpperCase())
  .join('')
  .slice(0, 2);
```

And replace the avatar container block (~L297–327, the `<div style={{ position: 'relative' }}>` with the SVG border ring and the avatar div) with:

```tsx
<Avatar name={member.name} size={36} />
```

Note: the inactive variant currently renders a thin border-only SVG ring (not a progress ring). After this change, inactive members will have no ring — just the plain colored circle. This is intentional per spec (spec only specifies 48px active with ring, 36px inactive without).

- [ ] **Step 4: Verify compilation**

```bash
cd /Users/marcpla/Documents/Projectes/robert && npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/webview/components/sections/TeamSection.tsx
git commit -m "feat: replace inline avatar JSX in TeamSection with Avatar component"
```

---

### Task 3: Add AvatarWithName to UserStoriesTable

**Files:**
- Modify: `src/webview/components/common/UserStoriesTable.tsx`

The "Assigned To" cell is at L315:
```tsx
<td style={{ padding: '10px 12px', fontWeight: 'normal', color: userStory.assignee ? themeColors.foreground : '#6c757d', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{userStory.assignee || 'Unassigned'}</td>
```

- [ ] **Step 1: Add the AvatarWithName import**

At the top of `UserStoriesTable.tsx`, add:

```tsx
import { AvatarWithName } from './Avatar';
```

- [ ] **Step 2: Replace the assignee cell content**

Replace the entire `<td>` at L315 with:

```tsx
<td style={{ padding: '10px 12px', fontWeight: 'normal', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
  <AvatarWithName name={userStory.assignee || ''} size={20} emptyLabel="Unassigned" />
</td>
```

Note: `color` is removed from the `<td>` style because `AvatarWithName` handles the muted color for empty names internally.

- [ ] **Step 3: Verify compilation**

```bash
cd /Users/marcpla/Documents/Projectes/robert && npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/webview/components/common/UserStoriesTable.tsx
git commit -m "feat: add avatar to UserStoriesTable assigned-to column"
```

---

### Task 4: Add AvatarWithName to TasksTable

**Files:**
- Modify: `src/webview/components/common/TasksTable.tsx`

The owner cell is at L233:
```tsx
<td style={{ padding: '10px 12px', fontWeight: 'normal', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{task.owner || 'N/A'}</td>
```

- [ ] **Step 1: Add the AvatarWithName import**

At the top of `TasksTable.tsx`, add:

```tsx
import { AvatarWithName } from './Avatar';
```

- [ ] **Step 2: Replace the owner cell content**

```tsx
<td style={{ padding: '10px 12px', fontWeight: 'normal', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
  <AvatarWithName name={task.owner || ''} size={20} emptyLabel="N/A" />
</td>
```

- [ ] **Step 3: Verify compilation**

```bash
cd /Users/marcpla/Documents/Projectes/robert && npx tsc --noEmit 2>&1 | head -30
```

- [ ] **Step 4: Commit**

```bash
git add src/webview/components/common/TasksTable.tsx
git commit -m "feat: add avatar to TasksTable owner column"
```

---

### Task 5: Add AvatarWithName to TestCasesTable

**Files:**
- Modify: `src/webview/components/common/TestCasesTable.tsx`

The owner cell is at L219:
```tsx
<td style={{ padding: '10px 12px', fontWeight: 'normal', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{tc.owner || 'N/A'}</td>
```

- [ ] **Step 1: Add the AvatarWithName import**

At the top of `TestCasesTable.tsx`, add:

```tsx
import { AvatarWithName } from './Avatar';
```

- [ ] **Step 2: Replace the owner cell content**

```tsx
<td style={{ padding: '10px 12px', fontWeight: 'normal', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
  <AvatarWithName name={tc.owner || ''} size={20} emptyLabel="N/A" />
</td>
```

- [ ] **Step 3: Verify compilation**

```bash
cd /Users/marcpla/Documents/Projectes/robert && npx tsc --noEmit 2>&1 | head -30
```

- [ ] **Step 4: Commit**

```bash
git add src/webview/components/common/TestCasesTable.tsx
git commit -m "feat: add avatar to TestCasesTable owner column"
```

---

### Task 6: Add Avatar to DiscussionsTable

**Files:**
- Modify: `src/webview/components/common/DiscussionsTable.tsx`

DiscussionsTable uses styled-components (`MessageHeader`, `AuthorName`). The author is shown at L159 as `<AuthorName>{discussion.author || 'Unknown'}</AuthorName>` inside `<MessageHeader>`. We prepend an `Avatar` to `MessageHeader` — `MessageHeader` is already `display: flex; align-items: center; gap: 10px` so the avatar slots in naturally.

- [ ] **Step 1: Add the Avatar import**

At the top of `DiscussionsTable.tsx`, add:

```tsx
import Avatar from './Avatar';
```

- [ ] **Step 2: Add Avatar before AuthorName in MessageHeader**

Replace the `<MessageHeader>` block at L158–161:

```tsx
<MessageHeader>
  <AuthorName>{discussion.author || 'Unknown'}</AuthorName>
  <MessageDate>{formatDate(discussion.createdDate)}</MessageDate>
</MessageHeader>
```

With:

```tsx
<MessageHeader>
  <Avatar name={discussion.author || ''} size={20} />
  <AuthorName>{discussion.author || 'Unknown'}</AuthorName>
  <MessageDate>{formatDate(discussion.createdDate)}</MessageDate>
</MessageHeader>
```

Note: we keep `AuthorName` as-is (plain text, no `AvatarWithName`) because the date is a sibling in the same flex row — `AvatarWithName` would bundle name + text together and break the layout.

- [ ] **Step 3: Verify compilation**

```bash
cd /Users/marcpla/Documents/Projectes/robert && npx tsc --noEmit 2>&1 | head -30
```

- [ ] **Step 4: Commit**

```bash
git add src/webview/components/common/DiscussionsTable.tsx
git commit -m "feat: add avatar to DiscussionsTable author field"
```

---

## Self-Review Checklist

- [x] **Spec coverage:** color algorithm (Task 1), Avatar component (Task 1), AvatarWithName (Task 1), TeamSection refactor (Task 2), UserStoriesTable (Task 3), TasksTable (Task 4), TestCasesTable (Task 5), DiscussionsTable (Task 6). All spec sections covered.
- [x] **Placeholder scan:** no TBD, TODO, or vague steps. All code blocks are complete.
- [x] **Type consistency:** `AvatarProps.ringColor` is passed as `ringColor` in Task 2. `AvatarWithName` uses `emptyLabel` consistently in Tasks 3–5. `Avatar` default export used in Tasks 2 and 6. `AvatarWithName` named export used in Tasks 3–5.
- [x] **DiscussionsTable layout note:** documented why `AvatarWithName` is NOT used there (date sibling breaks the bundled layout).
- [x] **Inactive member ring:** documented why the inactive border SVG ring is removed (spec only requires 48px active ring).
