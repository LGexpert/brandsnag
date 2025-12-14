# Full stack pnpm workspace (Vite + React + Express + Postgres)

## Prerequisites

- Node.js 20+
- pnpm (via Corepack recommended)
- Docker (for local Postgres)

## Setup

1. Install deps:

```bash
pnpm install
```

2. Create your local env file:

```bash
cp .env.example .env
```

3. Start Postgres:

```bash
docker compose up -d db
```

4. Run database migrations:

```bash
docker compose run --rm drizzle
```

## Development

Start frontend + backend together:

```bash
pnpm dev
```

- Frontend: http://localhost:5173
- Backend: http://localhost:3001
- Backend health: http://localhost:3001/health

## Scripts

- `pnpm dev` - run both apps in dev mode
- `pnpm build` - build all workspaces
- `pnpm test` - run tests (Vitest)
- `pnpm lint` - lint the repo
- `pnpm format` - format with Prettier

## Workspace layout

- `apps/frontend` - Vite + React + TS + TanStack Router/Query
- `apps/backend` - Express + TS + Drizzle + Postgres
- `packages/shared` - shared TypeScript types
