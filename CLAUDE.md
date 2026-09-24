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
pnpm test             # Run unit tests (Vitest, logic only — no jsdom yet)
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
`auth`, `customers`, `documents`, `meetings`, `tasks`, `creatives`, `paid-traffic`, `activities` (comms log), `social` (publishing + attribution), plus `WhatsApp`/`Gmail`/`GoTo` adapters.

**External integrations:** Google Drive/Calendar/Gmail, Meta Marketing API, GoTo Connect (VoIP + transcription), Evolution API (WhatsApp), Postiz (social publishing engine).

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
│   │   │                  #   (customers/[id]/social/* — link, composer, queue, feed)
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

## Social publishing (Postiz as the engine)

The system decides; Postiz executes. Composing, validating, scheduling, attribution
and results live here — publishing to the networks is delegated.

**Consume it over HTTP only, never copy its code.** Postiz is AGPL; copying would
impose AGPL on this repository. The API base is `/api/public/v1` and the key goes
in `Authorization` raw, without `Bearer`.

**The engine allows 90 requests/hour.** This constrains real design decisions, so
don't undo them casually:
- a post costs 1 request, plus 1 per image — batches are capped by *request cost*,
  not post count, and publish serially
- per-post metrics are fetched on demand (one click, one request), never in bulk on
  page load; a daily cron ingests them into `social_post_metrics`

**Its webhook fires only on success.** Every failure path in its workflow returns
before the webhook is sent, so a post that failed is knowable only by asking. That
is what `SocialReconciliationSchedulerService` does every 15 minutes, and why the
failure state is stored rather than only pushed over SSE.

**Two things have no public route:** creating a client group and connecting a social
account. Both stay a one-off step per customer in the Postiz UI (see issue #1905).

**Rules that must not drift:**
- house editorial rules run *before* the engine, never after — validating afterwards
  validates what already went out
- the customer ↔ group link is an id in a unique column, never a name match; group
  names are editable in the engine and matching by text fails silently into the
  wrong account
- carousel order is content: the chosen order is what uploads and what is stored
- acting on a post by id always verifies the post belongs to that customer's group —
  the engine would accept a bare id and act on any post in the organisation
- Instagram refuses a post with no image or video (Meta's rule, not the engine's), so
  `PROVIDERS_REQUIRING_MEDIA` rejects it here first — a request the outcome of which is
  already known must never spend one of the 90 requests/hour, which are shared with
  whoever is publishing for real
- an engine refusal surfaces as 502 **carrying the engine's own message**. It was a bare
  500 once: the reason sat in the server log in plain text while the caller got
  "Internal server error" and had no way to know what to fix

**Credentials live in the database, not in env.** Register them with
`POST /api/v1/admin/social-engine` — it takes effect immediately, with no deploy
and no SSH, so an agent can configure the system on its own. `GET` returns a
`keyFingerprint`, never the key; `POST /test` proves the key authenticates
without revealing it (and costs 1 of the 90 requests/hour, so it is never called
on page load).

The route accepts a **machine principal**: header `x-api-key: $INTERNAL_API_KEY`,
which the guard maps to the role `agent` — deliberately not `admin`, so the key
opens only routes that declare `@Roles(..., 'agent')` instead of becoming a master
key for everything an admin can do.

**The whole social domain declares it**, publishing included: an agent runs the
customer's account end to end (Bruno's decision, 2026-09-24). Publishing acts on
the customer's account and goes out in public, so this is a deliberate grant, not
an oversight — widen it no further without asking. Everything else stays on a
person's JWT; `/admin/meta-config` in particular still does, because the same
controller creates real ad accounts in the BM.

**Env:** `POSTIZ_API_URL`, `POSTIZ_API_KEY` remain as a bootstrap fallback only —
**the database wins when both exist**, otherwise a registration made through the
API would be silently ignored on a server that still carried the old variable.
`NEXT_PUBLIC_POSTIZ_URL` (frontend, only to link the operator to the engine for
that one-off step).

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
