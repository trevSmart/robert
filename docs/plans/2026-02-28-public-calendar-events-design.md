# Public Calendar Events Design
Date: 2026-02-28

## Context
Currently, custom calendar events are stored locally in VSCode's `globalState` per user and are never shared across team members. The request is to add a "Public" flag to custom events, allowing them to appear on other team members' calendars.

The solution uses the existing collaboration server (PostgreSQL + WebSocket) to persist and broadcast public events in real-time.

## Design

### 1. Data Model

**Frontend (Type Update)**
- File: `src/types/utils.d.ts`
- Update `CustomCalendarEvent` interface to add optional field:
  ```typescript
  isPublic?: boolean;           // false by default
  creatorRallyUserId?: string;  // stored for public events
  creatorName?: string;         // stored for public events
  ```

**Backend (New Database Table)**
- File: `server/src/db/migrations/<timestamp>_create_calendar_events.ts`
- New table `calendar_events`:
  ```sql
  id UUID PRIMARY KEY DEFAULT gen_random_uuid()
  creator_id UUID NOT NULL REFERENCES users(id)
  creator_rally_user_id TEXT NOT NULL
  creator_display_name TEXT NOT NULL
  date TEXT NOT NULL          -- YYYY-MM-DD format
  time TEXT                   -- HH:MM format, nullable
  title TEXT NOT NULL
  description TEXT
  color TEXT NOT NULL         -- hex color code
  created_at TIMESTAMP DEFAULT NOW()
  updated_at TIMESTAMP DEFAULT NOW()

  INDEX on (date)
  INDEX on (created_at DESC)
  ```

### 2. Backend Changes

**Endpoints** (new file: `server/src/routes/calendarEvents.ts`)
- `GET /api/calendar-events` → retrieve all public events
- `POST /api/calendar-events` → create new public event (requires `X-Rally-User-Id` header)
- `PUT /api/calendar-events/:id` → edit event (creator only)
- `DELETE /api/calendar-events/:id` → delete event (creator only)

Each request includes headers `X-Rally-User-Id` and `X-Display-Name` for authentication.

**WebSocket Broadcast** (update: `server/src/services/websocketService.ts`)
Add three new broadcast message types:
- `calendar:event:new` → sent to all connected clients when public event is created
- `calendar:event:updated` → sent to all connected clients when public event is edited
- `calendar:event:deleted` → sent to all connected clients when public event is deleted

Payload structure:
```typescript
{
  type: 'calendar:event:new' | 'calendar:event:updated' | 'calendar:event:deleted',
  event?: CustomCalendarEvent,  // for new/updated
  eventId?: string              // for deleted
}
```

### 3. Frontend - Modal Changes

**File:** `src/webview/components/common/Calendar.tsx`

- Add `isPublic` field to `modalForm` state (line 53):
  ```typescript
  const [modalForm, setModalForm] = useState({
    date: '', time: '', title: '', description: '', color: '#52a0e0', isPublic: false
  });
  ```

- Add checkbox UI in modal (after title field, around line 1750):
  ```tsx
  <label className="modal-form-group">
    <input
      type="checkbox"
      checked={modalForm.isPublic}
      onChange={(e) => setModalForm({ ...modalForm, isPublic: e.target.checked })}
    />
    <span>Event públic (visible per a tots els membres)</span>
  </label>
  ```

- Update `saveModal()` (line 801) to pass `isPublic` to the save handler:
  ```typescript
  const event: CustomCalendarEvent = {
    id: editingEvent?.id || crypto.randomUUID(),
    date: modalForm.date,
    time: modalForm.time || undefined,
    title: modalForm.title.trim(),
    description: modalForm.description.trim() || undefined,
    color: modalForm.color,
    isPublic: modalForm.isPublic
  };
  ```

### 4. Frontend - State & WebSocket Management

**File:** `src/webview/components/MainWebview.tsx`

- Add state for public calendar events (line 530):
  ```typescript
  const [publicCalendarEvents, setPublicCalendarEvents] = useState<CustomCalendarEvent[]>([]);
  ```

- Load public events on calendar load (add to `loadIterations()` effect):
  ```typescript
  case 'loadIterations':
    // ... existing code ...
    // Add after existing load:
    if (section === 'home') {
      const events = await collaborationClient.getCalendarEvents();
      setPublicCalendarEvents(events);
    }
  ```

- WebSocket listeners for real-time updates (in message handler):
  ```typescript
  case 'calendar:event:new':
  case 'calendar:event:updated':
    setPublicCalendarEvents(prev => {
      const filtered = prev.filter(e => e.id !== message.event.id);
      return [...filtered, message.event];
    });
    break;
  case 'calendar:event:deleted':
    setPublicCalendarEvents(prev => prev.filter(e => e.id !== message.eventId));
    break;
  ```

- Pass merged events to Calendar:
  ```tsx
  <Calendar
    customEvents={[...customCalendarEvents, ...publicCalendarEvents]}
    // ... other props
  />
  ```

**File:** `src/libs/collaboration/collaborationClient.ts`

- Add new methods to handle calendar events:
  ```typescript
  async getCalendarEvents(): Promise<CustomCalendarEvent[]>
  async createCalendarEvent(event: CustomCalendarEvent): Promise<CustomCalendarEvent>
  async updateCalendarEvent(id: string, event: Partial<CustomCalendarEvent>): Promise<CustomCalendarEvent>
  async deleteCalendarEvent(id: string): Promise<void>
  ```

### 5. Save Logic Flow

**Creating a custom event:**
1. User opens "New Event" modal
2. Fills in date, time, title, description, color, and checks "Event públic" if desired
3. Clicks save:
   - If `isPublic: false` → save to `globalState` (current behavior)
   - If `isPublic: true` → `POST /api/calendar-events` via `CollaborationClient`

**Server receives public event:**
1. Validates request (user authenticated via headers)
2. Inserts into `calendar_events` table
3. Broadcasts `calendar:event:new` to all connected clients

**Other users receive event:**
1. WebSocket client receives `calendar:event:new`
2. Adds event to `publicCalendarEvents` state
3. Calendar re-renders with new event

### 6. Edit/Delete Logic

**Editing a public event:**
- Modal detects if `editingEvent` is public (has `creatorRallyUserId`)
- If creator is current user, allow edit → `PUT /api/calendar-events/:id`
- If creator is another user, disable edit controls (show in read-only mode)

**Deleting a public event:**
- Only show delete button if creator is current user
- `DELETE /api/calendar-events/:id` removes from server
- Server broadcasts `calendar:event:deleted` to all clients

## Verification

1. **Backend**
   - [ ] Migration creates `calendar_events` table
   - [ ] GET `/api/calendar-events` returns all public events
   - [ ] POST creates event, broadcasts `calendar:event:new` to all connected clients
   - [ ] PUT updates only if requester is creator
   - [ ] DELETE removes event, broadcasts `calendar:event:deleted`

2. **Frontend Modal**
   - [ ] Checkbox "Event públic" appears and toggles state
   - [ ] Creating private event saves to `globalState` (existing behavior)
   - [ ] Creating public event sends to server and broadcasts to team

3. **Calendar Display**
   - [ ] Private events (only for current user) render normally
   - [ ] Public events from all team members appear on calendar
   - [ ] Real-time updates work when another user creates/deletes event

4. **Permission Control**
   - [ ] Can only edit/delete own public events
   - [ ] Other users' public events show in read-only mode
   - [ ] Edit/delete buttons hidden for non-creators

## Files to Modify

- `src/types/utils.d.ts` — add `isPublic?`, `creatorRallyUserId?`, `creatorName?` to `CustomCalendarEvent`
- `src/webview/components/common/Calendar.tsx` — add modal checkbox, update state
- `src/webview/components/MainWebview.tsx` — add public event state, WebSocket listeners, merge events
- `src/libs/collaboration/collaborationClient.ts` — add calendar event methods
- `server/src/routes/calendarEvents.ts` (new file)
- `server/src/db/migrations/<timestamp>_create_calendar_events.ts` (new migration)
- `server/src/services/websocketService.ts` — add broadcast methods
- `server/src/index.ts` — register new route
