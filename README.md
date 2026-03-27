# Task Manager - Full Stack Home Assignment

A full-stack Task Management application built with React, TypeScript, Node.js, and Express.

> **Assignment Instructions**: For complete assignment details, requirements, and evaluation criteria, see [ASSIGNMENT.md](./ASSIGNMENT.md).

> **Changelog**: For a detailed list of all bug fixes, improvements, new features, and architectural decisions, see [CHANGES.md](./CHANGES.md).

## Overview

This is a Task Management application that allows users to:

- Register and authenticate (JWT-based)
- Create, update, and delete tasks with status and priority tracking
- View tasks in a traditional list or a drag-and-drop Kanban board
- Search, filter by status/priority, and save filter presets (URL-synced for shareable links)
- Track all changes through a paginated activity feed / audit log
- Add comments to tasks
- Assign tasks to team members

## Tech Stack

### Frontend

- React 18
- TypeScript
- Vite 5
- React Router v6
- Tailwind CSS 3
- Fetch API (no axios -- keeps the bundle lean)

### Backend

- Node.js
- Express 4
- TypeScript
- Prisma ORM
- PostgreSQL (via Docker)
- JWT Authentication (jsonwebtoken + bcryptjs)
- express-rate-limit (brute-force protection on auth endpoints)

## Prerequisites

Before you begin, ensure you have the following installed:

- Node.js (v18 or higher)
- npm or yarn
- Git
- Docker and Docker Compose (for PostgreSQL database)

## Setup Instructions

### 1. Clone the Repository

```bash
git clone <repository-url>
cd full-stack-home-assignment
```

### 2. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# IMPORTANT: JWT_SECRET is required -- the server will refuse to start without it.
# The .env.example provides a default value suitable for development.

# Start PostgreSQL database with Docker and setup database (migrate + seed)
npm run db:setup

# Start the development server
npm run dev
```

The `db:setup` script will:

1. Start the PostgreSQL Docker container
2. Wait for the database to be ready
3. Generate the Prisma client
4. Run migrations
5. Seed the database with sample data

The backend server will run on `http://localhost:3000`.

### 3. Frontend Setup

Open a new terminal window:

```bash
cd frontend

# Install dependencies
npm install

# Start the development server
npm run dev
```

The frontend will run on `http://localhost:5173` (Vite's default). API requests are proxied to `http://localhost:3000` via Vite's dev server proxy.

## Project Structure

```
full-stack-home-assignment/
├── frontend/
│   ├── src/
│   │   ├── components/       # UI components (TaskList, TaskForm, KanbanBoard, ActivityFeed, etc.)
│   │   ├── pages/            # Page components (Dashboard, Login, Register)
│   │   ├── hooks/            # Custom hooks (useTasks, useAuth, useActivities, useDebounce, useFilterParams)
│   │   ├── services/         # API service layer
│   │   ├── types/            # TypeScript type definitions
│   │   ├── App.tsx           # Root component with routing
│   │   └── main.tsx          # Entry point
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   └── package.json
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma     # Database schema (7 models)
│   │   └── migrations/       # Prisma migrations
│   ├── src/
│   │   ├── routes/           # Express route definitions
│   │   ├── controllers/      # Request handlers (auth, task, comment, activity)
│   │   ├── middleware/        # Auth middleware (JWT verification)
│   │   ├── lib/              # Shared utilities (Prisma singleton, activity logger)
│   │   ├── db/               # Database seed script
│   │   └── server.ts         # Express server entry point
│   ├── docker-compose.yml
│   └── package.json
├── ASSIGNMENT.md
├── CHANGES.md
└── README.md
```

## API Endpoints

All endpoints except auth require a valid JWT in the `Authorization: Bearer <token>` header.

### Authentication

- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current authenticated user

### Tasks

- `GET /api/tasks` - List tasks (paginated). Query params: `search`, `status`, `priority`, `sortBy`, `sortOrder`, `page`, `limit`
- `GET /api/tasks/:id` - Get a single task with comments
- `POST /api/tasks` - Create a task
- `PUT /api/tasks/:id` - Update a task (owner only)
- `DELETE /api/tasks/:id` - Delete a task (owner only)

### Comments

- `GET /api/comments?taskId=:id` - Get comments for a task
- `POST /api/comments` - Create a comment
- `DELETE /api/comments/:id` - Delete a comment (author only)

### Activities

- `GET /api/activities` - Activity audit log (paginated). Query params: `action`, `entityType`, `entityId`, `startDate`, `endDate`, `page`, `limit`

### Health

- `GET /health` - Health check

## Default Test Users

After seeding, you can log in with:

- Email: `john@example.com`, Password: `password123`
- Email: `jane@example.com`, Password: `password123`
- Email: `bob@example.com`, Password: `password123`

## Development

### Backend

- Development: `npm run dev` (uses tsx for hot reload)
- Build: `npm run build`
- Start: `npm start`

### Frontend

- Development: `npm run dev` (Vite dev server)
- Build: `npm run build`
- Preview: `npm run preview`

## Database

The application uses PostgreSQL running in a Docker container. The database is automatically set up when you run `npm run db:setup`.

### Docker Commands

- Start database: `npm run db:docker:up`
- Stop database: `npm run db:docker:down`
- Restart database: `npm run db:docker:restart`
- Full setup (start + migrate + seed): `npm run db:setup`

### Database Connection

Default connection details (from docker-compose.yml):

- Host: `localhost`
- Port: `5432`
- Database: `taskmanager`
- Username: `taskmanager`
- Password: `taskmanager123`

Connection string: `postgresql://taskmanager:taskmanager123@localhost:5432/taskmanager?schema=public`

## Notes

- The seed script is idempotent for users and tags (uses `upsert`), so it can be re-run safely.
- Auth endpoints are rate-limited to 20 requests per 15-minute window to prevent brute-force attacks.
- CORS is enabled for development. Adjust for production needs.
- The application is set up for development. For production, ensure proper environment variables and security configurations.

## Troubleshooting

**Database issues:**

- Ensure Docker is running: `docker ps`
- Ensure PostgreSQL container is up: `npm run db:docker:up`
- Check container logs: `docker logs task-manager-db`
- Reset database: `npm run db:docker:down && npm run db:docker:up && npm run db:migrate`
- Ensure Prisma client is generated: `npm run db:generate`

**Port conflicts:**

- Backend default: 3000 (change in `.env`)
- Frontend default: 5173 (change in `vite.config.ts`)

**Module not found errors:**

- Run `npm install` in both frontend and backend directories
- Ensure Prisma client is generated in backend
