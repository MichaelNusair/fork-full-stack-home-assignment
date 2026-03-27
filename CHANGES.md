# Changes

## Issues Identified and Fixed

### Security

- **SQL injection in task search**: The `getTasks` controller built raw SQL by concatenating user input into a `$queryRawUnsafe` call. Replaced with Prisma's `contains` filter so queries are always parameterized.
- **XSS via `dangerouslySetInnerHTML`**: Task descriptions and comment content were rendered as raw HTML, opening the door to stored XSS. Switched to plain text rendering.
- **Hardcoded JWT fallback secret**: The auth middleware fell back to `'fallback-secret'` when `JWT_SECRET` was missing, which effectively disabled token security. Removed the fallback; the server now refuses to start without the variable set.
- **Missing authorization on mutations**: `updateTask`, `deleteTask`, and `deleteComment` performed no ownership check -- any authenticated user could modify any resource. Added ownership verification returning 403 when appropriate.
- **No rate limiting on auth endpoints**: Login and register had no protection against brute-force attacks. Added `express-rate-limit` (20 requests per 15-minute window) to those routes.

### Bugs

- **Port mismatch**: `server.ts` defaulted to port 5000 while the frontend proxy and `.env.example` assumed 3000. Aligned the default to 3000.
- **Frontend navigation on failed auth**: Login and Register navigated to `/dashboard` regardless of whether the API call succeeded. Wrapped calls in try/catch and display errors on failure.
- **Unhandled errors in backend controllers**: `register`, `login`, `createComment`, `getComments`, and `deleteComment` had no try/catch, so any database error would crash the process with an unhandled rejection.
- **Dual `useTasks` hook instances**: Dashboard and TaskList each created their own `useTasks`, so creating a task in Dashboard didn't refresh the list. Solved by having Dashboard call the API directly and forcing a TaskList remount via a React `key`.

### Performance

- **N+1 queries in `getTasks` and `getComments`**: Replaced loops that fetched related records one at a time with single Prisma queries using `include`.
- **Multiple PrismaClient instances**: Each controller created its own client, meaning three separate connection pools. Extracted a shared singleton in `backend/src/lib/prisma.ts`.
- **No pagination**: `getTasks` returned everything in one shot. Added `page`/`limit` query parameters with `skip`/`take` on the Prisma query and pagination metadata in the response envelope.

### Database Schema

- **Missing unique constraints**: Added `@unique` on `User.email`, `User.username`, and `Tag.name`. Added `@@unique` on `TaskAssignment(taskId, userId)` and `TaskTag(taskId, tagId)`.
- **Missing indexes**: Added `@@index` on `Task.userId`, `Task.status`, `Task.createdAt`, and `Comment.taskId`.
- **Missing cascade deletes**: Deleting a task failed if it had comments, assignments, or tags. Added `onDelete: Cascade` on the child relations.
- **Seed idempotency**: Updated seed to use `upsert` for users and tags (keyed on their unique fields) so the script can be re-run safely.

### Type Safety

- **Pervasive `any` types**: Replaced all `any` usages across hooks, components, services, and type definitions with proper TypeScript interfaces (`Task`, `User`, `Comment`, `TaskAssignment`, `PaginatedResponse`, `TaskFilters`, `CreateTaskInput`, `UpdateTaskInput`, `AuthResponse`, `RegisterInput`).

### Input Validation

- **Backend**: Added validation for email format, username length, password length, required fields, and valid enum values for status/priority. Comment creation now validates both `taskId` and `content` and confirms the task exists.
- **Frontend**: Added `required`/`minLength` attributes on form inputs. Added client-side validation in Login, Register, and TaskForm with inline error messages.

### UX Improvements

- **Error feedback**: All forms display error messages on failed submissions.
- **Loading states**: Submit buttons show loading text and disable during API calls.
- **Delete confirmation**: Task deletion prompts the user for confirmation.
- **Empty state**: The task list shows a helpful message when no tasks match the current filters.
- **Search and filtering**: Added a search input and status filter buttons to the dashboard -- the original `filters` state existed but was never wired to any UI.
- **Auth context**: Moved auth state from a local hook into a React Context so it's a single source of truth across the component tree.
- **Error boundary**: Wrapped the app in an `ErrorBoundary` to catch rendering errors gracefully instead of showing a blank page.
- **Render optimization**: Wrapped `TaskList` and `TaskForm` in `React.memo` and memoized callbacks with `useCallback` to reduce unnecessary re-renders.

## New Features

### Advanced Filtering & Search (Option B)

- **Priority filtering**: Added a priority query parameter to `GET /api/tasks`. The dashboard shows LOW / MEDIUM / HIGH toggle buttons alongside the existing status filters.
- **Debounced search**: The search input uses a 300 ms debounce so typing doesn't fire a request on every keystroke.
- **URL-based filter state**: Filter values (search, status, priority) sync to URL query parameters via `useSearchParams`. Filtered views are shareable -- copy the URL and you get the same results.
- **Saved filter presets**: Users can save the current filter combination as a named preset (stored in localStorage). Presets appear as clickable pills and can be removed.
- **Server-side sort support**: Backend accepts `sortBy` and `sortOrder` query params, validated against a whitelist.

### Activity Feed / Audit Log (Option D)

- **ActivityLog database model**: New `ActivityLog` table with indexes on `userId`, `(entityType, entityId)`, and `createdAt`.
- **Automatic activity logging**: Every task and comment create/update/delete writes an activity log entry. For task updates, the metadata captures a before/after diff of changed fields. Logging is fire-and-forget so it never blocks the API response.
- **Activity API**: `GET /api/activities` with pagination and optional filters for action type, entity type, entity ID, and date range.
- **Activity feed UI**: A new "Activity" tab on the dashboard shows a chronological feed. Each entry displays the actor, action description, change details (for updates), and a relative timestamp. The feed has its own filter bar and pagination.

### Database Migration

Added a migration (`20260327000000_add_activity_log_and_constraints`) that reconciles schema drift from the original migration: drops the unused `Project` table, adds unique constraints, adds performance indexes, updates foreign keys to cascade on delete, and creates the `ActivityLog` table.

### Kanban Board View (Creative Feature)

- **Board view toggle**: Users can switch between a list view and a Kanban board via a toggle in the toolbar. The preference persists to localStorage.
- **Drag-and-drop status changes**: Tasks can be dragged between TODO, In Progress, and Done columns. The status update fires immediately with an optimistic UI update and automatic rollback on API failure.
- **Responsive column layout**: Three columns on desktop, stacked vertically on mobile.
- **No new dependencies**: Drag-and-drop uses the native HTML5 Drag and Drop API rather than a third-party library, keeping the bundle small.
- **Shared infrastructure**: The board reuses the same `useTasks` hook, filters, and search as the list view. Switching views preserves the current filter state.

## Architectural Decisions

- **Shared Prisma singleton** over per-controller instantiation to avoid wasting database connections.
- **Auth context** over per-component hook to ensure a single source of truth for the logged-in user.
- **Key-based remount** for refreshing the task list after creation, rather than passing callbacks between sibling state trees. Simpler to reason about and avoids tightly coupling Dashboard to TaskList internals.
- **Pagination metadata in the response envelope** (`{ tasks, pagination }`) rather than headers, since it's easier for frontend consumers and more explicit.
- **Fire-and-forget activity logging** -- the `logActivity` helper intentionally does not await the database write. A failed log entry should never cause a user-facing error on the actual operation. Failures are caught and logged to stderr.
- **URL-synced filters via `useSearchParams`** instead of component-local state. This makes filtered views bookmarkable and shareable with zero extra infrastructure, and keeps the filter state in sync with browser back/forward navigation.
- **Debounce at the display boundary** -- the raw search input value updates immediately (for responsive typing), but the debounced value is what gets passed to `useTasks`. This keeps the input snappy while limiting API calls.
- **Native HTML5 drag-and-drop** for the Kanban board instead of a library like `react-beautiful-dnd` or `dnd-kit`. The interaction model here is simple (move a card between three columns), so native DnD keeps the bundle lean. The trade-off is slightly less polish on touch devices, which is acceptable for a desktop-focused task management tool.
- **Higher page limit in board mode** (`limit=100`) -- the board fetches more tasks in one request so every card appears in its column without truncation. For a typical team's task count this is fine; a production version would move to per-column cursor-based loading.

## Known Limitations

- No refresh token mechanism -- JWT expiry requires re-login.
- Pagination uses an offset-based approach, which can skip or duplicate items if the list changes between pages. Cursor-based pagination would be more robust.
- Error messages returned from the backend are intentionally generic to avoid leaking implementation details, which means less specific feedback for debugging.
- Saved filter presets live in localStorage, so they don't sync across devices or survive clearing browser data.
- The `CommentList` component and `getTaskById` endpoint exist but aren't wired to a task detail page in the frontend -- adding one would let users view and manage comments.
- No automated tests. Unit tests for the controllers and integration tests for the API would be the highest-value addition.
