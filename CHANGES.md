# Changes

## Issues Identified and Fixed

### Security

- **SQL injection in task search**: The `getTasks` controller built raw SQL by concatenating user input directly into a `$queryRawUnsafe` call. Replaced with Prisma's `contains` filter for safe parameterized queries.
- **XSS via `dangerouslySetInnerHTML`**: Task descriptions and comment content were rendered as raw HTML. Switched to plain text rendering to prevent stored XSS.
- **Hardcoded JWT fallback secret**: The auth middleware and controllers fell back to `'fallback-secret'` when `JWT_SECRET` was missing. Removed the fallback; the server now refuses to start without it.
- **Missing authorization on mutations**: `updateTask`, `deleteTask`, and `deleteComment` didn't verify resource ownership. Added ownership checks returning 403 when the authenticated user doesn't own the resource.

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

## Architectural Decisions

- **Shared Prisma singleton** over per-controller instantiation to avoid wasting database connections.
- **Auth context** over per-component hook to ensure a single source of truth for the logged-in user.
- **Key-based remount** for refreshing the task list after creation, rather than passing callbacks between sibling state trees. Simpler to reason about and avoids tightly coupling Dashboard to TaskList internals.
- **Pagination metadata in the response envelope** (`{ tasks, pagination }`) rather than headers, since it's easier for frontend consumers and more explicit.

## Known Limitations

- No rate limiting on auth endpoints.
- No refresh token mechanism -- JWT expiry requires re-login.
- Pagination uses offset-based approach, which can skip/duplicate items if the list changes between pages. Cursor-based pagination would be more robust for real-time data.
- Error messages returned to the client from the backend are generic (e.g., "Failed to create task") to avoid leaking implementation details, but this means less specific feedback for debugging.
