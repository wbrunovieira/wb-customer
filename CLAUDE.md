# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## ⚠️ Sempre rastreie o trabalho como issues (skill `track-work`)

Toda feature, correção, melhoria ou débito técnico DEVE virar uma issue no
projeto "WB Customer Admin" (`cmor7l5c1000bpa017kplrgct`) no WB Project Manager,
agrupada no milestone da fase, com o status em dia (Backlog/Todo → In Progress →
Done). O board já tem issue: LISTE antes de criar. Antes de planejar ou iniciar
trabalho não-trivial, e sempre que descobrir um bug/melhoria, invoque a skill
**`track-work`** (`.claude/skills/track-work/SKILL.md`) — ela tem o projectId, os
status IDs, a localização da API key e o CLI `pm.sh`.

## Commands

### Backend (`/backend`)
```bash
pnpm start:dev        # Start with hot reload
pnpm build            # Compile NestJS app
pnpm test             # Run unit tests (Vitest)
pnpm test:watch       # Run unit tests in watch mode
pnpm test:e2e         # Run E2E tests
pnpm test:coverage    # Run tests with coverage report
pnpm type-check       # TypeScript check (not `npx tsc`)
pnpm seed             # Seed database (creates admin user)
```

Run a single test file:
```bash
pnpm vitest run src/domain/customers/use-cases/create-customer.spec.ts
```

### Frontend (`/frontend`)
```bash
pnpm dev              # Start Next.js dev server
pnpm build            # Build for production (also type-checks)
pnpm start            # Start production server
```

### Docker (root)
```bash
docker compose up     # Start backend + PostgreSQL (port 3003, DB on 5433)
```

## Architecture

This is a full-stack CRM/project management platform. The repo root has `/backend` and `/frontend` as separate apps with their own `package.json`/`pnpm-lock.yaml`.

### Backend — Clean/Hexagonal Architecture (NestJS + Prisma)

```
backend/src/
├── core/          # Either/Result pattern, base value objects
├── domain/        # Business logic, independent of frameworks
│   └── <feature>/ # entities/, use-cases/, repositories/ (interfaces), errors/
├── infra/
│   ├── adapters/  # External service integrations (Google, Meta, GoTo, WhatsApp)
│   ├── auth/      # JWT strategies, guards, decorators
│   ├── controllers/  # REST endpoints (HTTP layer only, delegates to use-cases)
│   ├── database/  # Prisma service + concrete repository implementations
│   ├── modules/   # NestJS feature modules wiring domain + infra
│   └── scheduled/ # Cron jobs
├── env/           # Zod-based env validation
└── test/          # E2E helpers and shared factories
```

**Key patterns:**
- **Either/Result**: All use-cases return `Either<DomainError, T>`. Left = failure, Right = success. Controllers unpack it and map to HTTP responses.
- **Repository interfaces** live in `domain/<feature>/repositories/`. Implementations live in `infra/database/`.
- **Use-cases** are plain classes injected with repository interfaces — no NestJS dependencies.
- **Roles**: `admin | manager | employee | customer`. Guards read from JWT payload.
- **Adapters toggle via env**: `STORAGE_ADAPTER=local|google-drive`, `CALENDAR_ADAPTER=mock|google-calendar`.

**Domains:**
`auth`, `customers`, `documents`, `meetings`, `tasks`, `creatives`, `paid-traffic`, `activities` (comms log), plus `WhatsApp`/`Gmail`/`GoTo` adapters.

**External integrations:** Google Drive/Calendar/Gmail, Meta Marketing API, GoTo Connect (VoIP + transcription), Evolution API (WhatsApp).

### Frontend — Next.js App Router (React 19 + Tailwind 4)

```
frontend/src/
├── app/
│   ├── (auth)/            # Login
│   ├── (dashboard)/       # Protected pages (sidebar layout)
│   │   ├── admin/         # Admin: Meta config, system settings
│   │   ├── customers/     # CRM: list, detail, contacts
│   │   ├── tasks/         # Kanban/calendar/gantt views
│   │   ├── traffic/       # Paid ads dashboard
│   │   ├── creatives/     # Media/creative management
│   │   ├── meetings/      # Calendar + Meet integration
│   │   └── documents/     # Drive-backed document management
│   ├── api/events/        # SSE endpoint for real-time notifications
│   ├── actions/           # Next.js Server Actions (mutations)
│   └── portal/            # Customer-facing portal (separate auth context)
├── components/
│   ├── layout/            # Sidebar, Header, navigation
│   └── ui/                # Reusable presentational components
├── lib/
│   ├── api-server.ts      # Server-side fetch wrapper (auth headers from session)
│   ├── definitions.ts     # Shared TypeScript types (API DTOs)
│   └── session.ts         # JWT session handling
└── proxy.ts               # API proxy config
```

**Key patterns:**
- Server Components by default; add `'use client'` only for interactivity.
- TanStack React Query for client-side server state (caching, refetching).
- React Hook Form + Zod for form validation.
- SSE (`/api/events`) for real-time notifications — no WebSocket.
- `@dnd-kit` for drag-and-drop (task board, sortable lists).

## Conventions

- **API-first — agents operate this system**: every capability the UI offers MUST be reachable through a documented API route. Never put business logic in a Next.js Server Action that has no backend equivalent; actions call the API, they don't replace it. Routes must be usable by a machine principal (API key), not only by a logged-in human, and scoped to least privilege.
- **Swagger on every route**: `@ApiTags`, `@ApiOperation`, `@ApiResponse`, and `@ApiBody`/`@ApiParam`/`@ApiQuery` on controllers; `@ApiProperty` on all DTOs.
- **TDD**: write tests before or alongside implementation. Unit tests for use-cases, E2E for HTTP layer.
- **Commit messages in English** (imperative, lowercase subject).
- **Never commit real credentials** — `.env.example` uses placeholder values only.
- **UI/UX quality**: strong hierarchy, spacing, loading/empty/error states, responsive layouts on all frontend work.

## Database

Prisma schema at `backend/prisma/schema.prisma`. After schema changes:
```bash
npx prisma migrate dev   # inside backend/
npx prisma generate      # regenerate client
```

Key model groups: `UserIdentity/UserProfile/UserAuthorization`, `Customer/Contact/CustomerEmployee`, `Task/Sprint/ChecklistItem/TimeEntry`, `Campaign/AdSet/Ad/AdDailyMetric`, `Creative/CreativePerformance`, `Meeting/MeetingType`, `Document`.
