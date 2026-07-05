# WB Customer — Customer & Delivery Management Platform

**Full-stack platform** that combines a CRM-style customer base with project/sprint/task management, time tracking, Google (Gmail/Meet) integration and document & image annotation. Built with **Domain-Driven Design** and **~180 test files**.

![NestJS](https://img.shields.io/badge/NestJS-E0234E?logo=nestjs&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-000000?logo=next.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-2D3748?logo=prisma&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?logo=postgresql&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?logo=docker&logoColor=white)

> Monorepo (`backend/` NestJS + Prisma, `frontend/`), architected with DDD and covered by ~180 test files.

## Highlights

- **Domain-Driven Design, full-stack** — the domain (customers, delivery, meetings, auth) is split into entities / value-objects / use-cases with framework and Prisma at the edges.
- **Customer management** — customer categories, contacts, employees, activity timeline and documents.
- **Delivery / project management** — sprints, tasks, checklists, tags, task templates, time entries, comments and **image annotations**.
- **Meetings & Google** — meeting types, meetings, and Google OAuth token integration (Gmail / Meet).
- **Auth done right** — separated `UserIdentity` / `UserProfile` / `UserAuthorization` with refresh tokens.
- **Security-conscious** — GitGuardian secret scanning wired in (`.gitguardian.yaml`).

## Tech stack

| Layer | Tech |
|---|---|
| **Backend** | NestJS · Prisma · PostgreSQL · DDD / Clean Architecture |
| **Frontend** | Next.js · React · TypeScript |
| **Integrations** | Google APIs (Gmail · Meet) |
| **Infra** | Docker Compose |

## Domain (Prisma, excerpt)

`Customer` · `CustomerCategory` · `Contact` · `CustomerEmployee` · `CustomerActivity` · `Document` · `Meeting` · `MeetingType` · `Sprint` · `Task` · `ChecklistItem` · `TimeEntry` · `TaskComment` · `ImageAnnotation`

## Getting started

```bash
cp .env.example .env
docker compose up -d
npm --prefix backend install && npm --prefix frontend install
npm --prefix backend run prisma:migrate
# run backend and frontend (see each package's scripts)
```

## Documentation

See [`docs/`](docs/) for architecture and module notes.
