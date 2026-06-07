# Avatar Component — Design Spec

**Date:** 2026-06-07  
**Status:** Approved

## Context

The Robert VS Code extension shows user references in multiple places:

- **Teams view** (`TeamSection.tsx`): circular avatar badges (48px active with SVG progress ring, 36px inactive) rendered inline with a hardcoded purple gradient.
- **Tables** (`UserStoriesTable`, `TasksTable`, `TestCasesTable`, `DiscussionsTable`): user fields ("Assigned To", "Author") shown as plain text with no visual indicator.

The goal is visual language consistency: every user reference in the UI gets the same avatar style, backed by a single reusable component.

---

## Design Decisions

| Decision | Choice | Reason |
|---|---|---|
| Avatar color | Derived from name via HSL hash | Scalable to any number of members; stable and deterministic |
| Color palette | Algorithmic (no hardcoded list) | Future-proof; no limit on team size |
| Avatar size in tables | 20px | Fits dense table rows without increasing row height |
| Avatar size in Teams | 48px (active), 36px (inactive) | Matches existing layout |
| Missing user | Placeholder circle `?` | Maintains column alignment |
| Reuse strategy | Single `Avatar` component + `AvatarWithName` export | One source of truth, minimal surface area |

---

## Color Algorithm

```
hue = weightedCharSum(name) % 360
color = hsl(hue, 45%, 45%)
```

**Weighted char sum** (avoids "Ana" == "Naa"):
```
sum = 0
for i, char in name:
  sum += charCode(char) * (i + 1)
```

Fixed saturation (45%) and lightness (45%) produce muted, readable colors that work on the dark background (`#1e1e1e`) with white initials. The hue space (0–360°) ensures visual separation between members even on large teams.

**Placeholder (empty name):** fixed color `hsl(0, 0%, 35%)` — neutral grey.

---

## Component API

### `Avatar` (default export)

```tsx
interface AvatarProps {
  name: string;           // Full name — drives initials and color
  size?: number;          // Diameter in px. Default: 24
  showRing?: boolean;     // Render SVG progress ring. Default: false
  ringProgress?: number;  // 0–100. Only used when showRing=true
  fontSize?: number;      // Initials font size. Default: size * 0.38
}
```

**Initials extraction:** first character of each of the first two whitespace-separated tokens, uppercased. Single-word names use the first two characters.

**Placeholder:** when `name` is empty or whitespace, renders `?` with the neutral grey color.

### `AvatarWithName` (named export)

```tsx
interface AvatarWithNameProps {
  name: string;
  size?: number;       // Default: 20
  emptyLabel?: string; // Text shown when name is empty. Default: 'Unassigned'
}
```

Renders `[Avatar] Name` as a flex row, `gap: 6px`, vertically centered. Used in all table cells.

---

## Files Changed

### New

- `src/webview/components/common/Avatar.tsx` — `Avatar` default export + `AvatarWithName` named export

### Modified

| File | Change |
|---|---|
| `src/webview/components/sections/TeamSection.tsx` | Replace inline avatar JSX (active ~L179–224, inactive ~L297–327) with `<Avatar>` |
| `src/webview/components/common/UserStoriesTable.tsx` | L315: replace plain text with `<AvatarWithName>` |
| `src/webview/components/common/DiscussionsTable.tsx` | L159: prepend `<Avatar>` before the author name in `MessageHeader` |
---

## Behaviour Details

### Progress ring (Teams active variant)

The SVG ring is drawn as a `circle` with `stroke-dasharray`/`stroke-dashoffset` derived from `ringProgress`. This logic moves from TeamSection into Avatar when `showRing=true`. The ring stroke uses the same avatar color (derived from name) with reduced opacity for the track.

### Column width

Tables currently size the "Assigned To" column by content. Adding a 20px avatar + 6px gap increases the minimum width by ~26px — acceptable without layout changes.

### Unassigned rows

`<AvatarWithName name="" emptyLabel="Unassigned" />` renders the neutral grey `?` circle + the label text in the existing muted color (`#6c757d`).

---

## Out of Scope

- Tooltip on hover (name already visible as text)
- Click interaction on table avatars
- Avatar image/photo support
- Color customization per user
