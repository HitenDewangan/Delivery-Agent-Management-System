# Delivery Agent Management System

Full-stack admin application for managing delivery agents.

> **Status: Phase 1 (project foundation).** Agent CRUD, caching, and the dashboard UI are
> implemented in later phases. This README will be expanded to the full documentation at the end.

## Technology stack

| Layer    | Technology                                                |
| -------- | --------------------------------------------------------- |
| Frontend | Next.js (App Router), TypeScript, Tailwind CSS, shadcn/ui |
| Backend  | Node.js, Express, TypeScript, Zod                         |
| Data     | PostgreSQL (Prisma added in Phase 2), Redis               |
| Tooling  | ESLint, Prettier, Docker Compose                          |

## Project structure

```
delivery-agent-management/
├── backend/            Express + TypeScript API
├── frontend/           Next.js admin dashboard
├── docker-compose.yml  PostgreSQL + Redis
├── .env.example        Docker Compose variables
└── README.md
```

## Prerequisites

- Node.js 20+ and npm
- Docker with Compose v2

## Setup

```bash
# 1. Environment files
cp .env.example .env
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
# Edit .env and backend/.env so the database password matches.

# 2. Start PostgreSQL and Redis
docker compose up -d
docker compose ps          # both services should report "healthy"

# 3. Install dependencies
(cd backend && npm install)
(cd frontend && npm install)

# 4. Run (two terminals)
cd backend  && npm run dev   # http://localhost:4000
cd frontend && npm run dev   # http://localhost:3000
```

## Health check

```bash
curl http://localhost:4000/health
```

Returns `200` with `status: "ok"` when PostgreSQL and Redis are reachable. If only Redis is down it
returns `200` with `status: "degraded"` (Redis is a cache, never the source of truth). If PostgreSQL
is down it returns `503` with `status: "error"`.

## Scripts

Run inside `backend/` or `frontend/`:

| Script                                | Purpose                         |
| ------------------------------------- | ------------------------------- |
| `npm run dev`                         | Start the development server    |
| `npm run build`                       | Production build                |
| `npm run typecheck`                   | TypeScript check without emit   |
| `npm run lint` / `npm run lint:fix`   | ESLint                          |
| `npm run format` / `format:check`     | Prettier                        |
| `npm start` (backend)                 | Run compiled build from `dist/` |
