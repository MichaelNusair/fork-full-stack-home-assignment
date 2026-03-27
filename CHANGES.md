# Changes

## Issues Identified and Fixed

### Security

- **SQL injection in task search**: The `getTasks` controller built raw SQL by concatenating user input directly into a `$queryRawUnsafe` call. Replaced with Prisma's `contains` filter for safe parameterized queries.
- **XSS via `dangerouslySetInnerHTML`**: Task descriptions and comment content were rendered as raw HTML. Switched to plain text rendering to prevent stored XSS.
- **Hardcoded JWT fallback secret**: The auth middleware and controllers fell back to `'fallback-secret'` when `JWT_SECRET` was missing. Removed the fallback; the server now refuses to start without it.
- **Missing authorization on mutations**: `updateTask`, `deleteTask`, and `deleteComment` didn't verify resource ownership. Added ownership checks returning 403 when the authenticated user doesn't own the resource.
- **No rate limiting on auth endpoints**: Login and register had no protection against brute-force attacks. Added rate limiting (20 requests per 15-minute window) using `express-rate-limit`.

### Bugs

- **Port mismatch**: `server.ts` defaulted to port 5000, but the frontend proxy and `.env.example` assumed 3000. Aligned the default to 3000.
- **Frontend navigation on failed auth**: Login and Register navigated to `/dashboard` even when the API call threw. Added try/catch with error display.
- **Unhandled errors in backend controllers**: `register`, `login`, `createComment`, `getComments`, and `deleteComment` had no try/catch. Any DB error would crash the process.
- **Dual `useTasks` hook instances**: Dashboard and TaskList each instantiated their own `useTasks`, so creating a task in Dashboard didn't refresh the list. Solved by having Dashboard call the API directly and forcing a TaskList remount via a key.

### Performance

- **N+1 queries in `getTasks` and `getComments`**: Replaced manual loops that fetched related records one at a time with single Prisma queries using `include`.
- **Multiple PrismaClient instances**: Each controller created its own client (3 separate connection pools). Extracted a shared singleton in `backend/src/lib/prisma.ts`.
- **No pagination**: `getTasks` returned everything at once. Added `page`/`limit` query parameters with `skip`/`take` in the query and pagination metadata in the response.

### Database Schema

- **Missing unique constraints**: Added `@unique` on `User.email`, `User.username`, and `Tag.name`. Added `@@unique` on `TaskAssignment(taskId, userId)` and `TaskTag(taskId, tagId)`.
- **Missing indexes**: Added `@@index` on `Task.userId`, `Task.status`, `Task.createdAt`, and `Comment.taskId`.
- **Missing cascade deletes**: Deleting a task failed if it had comments/assignments/tags. Added `onDelete: Cascade` on the child relations.
- **Seed idempotency**: Updated seed to use `upsert` for users and tags (based on unique fields) so it can be re-run safely.

### Type Safety

- **Pervasive `any` types**: Replaced all `any` usages across hooks, components, services, and type definitions with proper TypeScript interfaces (`Task`, `User`, `Comment`, `TaskAssignment`, `PaginatedResponse`, `TaskFilters`, `CreateTaskInput`, `UpdateTaskInput`, `AuthResponse`, `RegisterInput`).

### Input Validation

- **Backend**: Added validation for email format, username length, password length, required fields, and valid enum values for status/priority. Comment creation now validates that both `taskId` and `content` are present and that the task exists.
- **Frontend**: Added `required`/`minLength` attributes on form inputs. Added client-side validation in Login, Register, and TaskForm with inline error messages.

### UX Improvements

- **Error feedback**: All forms now display error messages when submission fails.
- **Loading states**: Submit buttons show loading text and are disabled during API calls.
- **Delete confirmation**: Task deletion prompts for confirmation.
- **Empty state**: Task list shows a helpful message when no tasks exist.
- **Search and filtering**: Added a search input and status filter buttons to the dashboard (the original `filters` state was created but never wired to any UI).
- **Auth context**: Moved auth state from a local hook into a React Context so it's shared properly across the entire component tree instead of duplicated per-consumer.
- **Render optimization**: Wrapped `TaskList` and `TaskForm` in `React.memo` and memoized callbacks with `useCallback`.

## New Features

### Advanced Filtering & Search (Option B)

- **Priority filtering**: Added priority query parameter to `GET /api/tasks`. The dashboard now shows LOW / MEDIUM / HIGH toggle buttons alongside the existing status filters.
- **Debounced search**: Search input uses a 300ms debounce so keystrokes don't trigger a request per character.
- **URL-based filter state**: Filter values (search, status, priority) are synced to URL query parameters via `useSearchParams`. This means filtered views are shareable -- copy the URL and paste it to get the same filtered result.
- **Saved filter presets**: Users can save the current filter combination as a named preset (stored in localStorage). Presets appear as clickable pills above the task list and can be deleted.
- **Server-side sort support**: Backend now accepts `sortBy` and `sortOrder` query params, validated against a whitelist of allowed fields.

### Activity Feed / Audit Log (Option D)

- **ActivityLog database model**: New `ActivityLog` table with indexes on `userId`, `(entityType, entityId)`, and `createdAt` for efficient querying.
- **Automatic activity logging**: Every task creation, update, and deletion, as well as comment creation and deletion, writes an activity log entry. For task updates, the metadata captures a diff of changed fields (old and new values). Logging is fire-and-forget so it never blocks the API response.
- **Activity API**: `GET /api/activities` endpoint with pagination and optional filters for action type, entity type, entity ID, and date range.
- **Activity feed UI**: A new "Activity" tab on the dashboard shows a chronological feed of all actions. Each entry displays the actor, action description, change details (for updates), and a relative timestamp. The feed has its own filter bar (action type dropdown, date range pickers) and pagination.

### Database Migration

- Added a migration (`20260327000000_add_activity_log_and_constraints`) that reconciles the schema drift from the original migration: drops the unused `Project` table, adds unique constraints, adds performance indexes, updates foreign keys to cascade on delete, and creates the new `ActivityLog` table.

### Kanban Board View (Creative Feature)

- **Board view toggle**: Users can switch between a traditional list view and a Kanban board via a toggle in the toolbar. The preference is persisted to localStorage.
- **Drag-and-drop status changes**: Tasks can be dragged between TODO, In Progress, and Done columns. The status update fires immediately via an optimistic UI update, with automatic rollback on API failure.
- **Responsive column layout**: Three columns on desktop (`sm:grid-cols-3`), stacked vertically on mobile.
- **Inline editing from the board**: Clicking Edit on a card opens an edit panel above the board columns, keeping the board layout undisturbed.
- **No new dependencies**: Drag-and-drop is implemented with the native HTML5 Drag and Drop API, avoiding additional library weight.
- **Shared infrastructure**: The board reuses the same `useTasks` hook, filters, and search as the list view. Switching views preserves the current filter state.

## Architectural Decisions

- **Shared Prisma singleton** over per-controller instantiation to avoid wasting database connections.
- **Auth context** over per-component hook to ensure a single source of truth for the logged-in user.
- **Key-based remount** for refreshing the task list after creation, rather than passing callbacks between sibling state trees. Simpler to reason about and avoids tightly coupling Dashboard to TaskList internals.
- **Pagination metadata in the response envelope** (`{ tasks, pagination }`) rather than headers, since it's easier for frontend consumers and more explicit.
- **Fire-and-forget activity logging** -- the `logActivity` helper intentionally does not `await` the database write. A failed log entry should never cause a user-facing error on the actual operation. Failures are caught and logged to stderr.
- **URL-synced filters via `useSearchParams`** instead of component-local state. This makes filtered views bookmark-able and shareable with zero extra infrastructure, and keeps the filter state in sync with the browser's back/forward navigation.
- **Debounce at the display boundary** -- the raw search input value is stored immediately (for responsive typing), but the debounced value is what gets passed to `useTasks`. This keeps the input snappy while preventing excessive API calls.
- **Native HTML5 drag-and-drop** for the Kanban board instead of a library like `react-beautiful-dnd` or `dnd-kit`. The interaction model is simple (move a card between three columns), so native DnD keeps the bundle lean and avoids an extra dependency. The trade-off is slightly less polish on touch devices, which is acceptable for a desktop-focused task management tool.
- **Higher page limit in board mode** (`limit=100`) -- the board fetches all tasks in one request so every card appears in its column without pagination controls. For a typical team's task count this is fine; a production version would switch to per-column cursor-based loading.

## Known Limitations

- No refresh token mechanism -- JWT expiry requires re-login.
- Pagination uses offset-based approach, which can skip/duplicate items if the list changes between pages. Cursor-based pagination would be more robust for real-time data.
- Error messages returned to the client from the backend are generic (e.g., "Failed to create task") to avoid leaking implementation details, but this means less specific feedback for debugging.
- Saved filter presets are stored in localStorage, so they don't roam across devices or persist after clearing browser data. A server-backed approach would be needed for production.
- The `CommentList` component and `getTaskById` endpoint exist but aren't used -- there is no task detail view in the frontend. Adding one would let users see and manage comments.
- No automated tests. The project has no test runner or test files. Unit tests for the controllers and integration tests for the API would be the highest-value addition.
