# WB Customer — Plano de Implementação

> **Última revisão:** 2026-04-16 (sessão 15–16)
> Decisões arquiteturais registradas após sessão de refinamento.  
> **2026-04-13 (portal):** decisões do portal do cliente registradas.  
> **2026-04-14 (sessão 1):** Backend fases 1–5 concluídas. Frontend fases 1–2 concluídas. CustomerStatus `lead` removido. Fase 3 Frontend concluída. Google Drive + OAuth2 ativos.  
> **2026-04-14 (sessão 2):** Fase 4 Frontend concluída: lista global `/meetings`, formulário `/meetings/new` com email do cliente auto-populado + chips de participantes, lista por cliente, admin de tipos de reunião. `MeetingPresenter` criado (TDD) — corrige "Invalid Date" causado por entidades de domínio serializadas sem presenter. Cron de RSVP corrigido (janela 1h→30d, campo `endAt`→`startAt`). Coluna de confirmação do cliente (RSVP) na tabela. Página de detalhe `/customers/[id]/meetings/[meetingId]` pendente (link "Ver" existe mas página não implementada — adiada para Fase 5).  
> **2026-04-14 (sessão 3):** Fase 5 Frontend concluída. Portal do cliente completo: layout separado `/portal/*`, `/portal/meetings` (lista paginada com tabs de status), `/portal/meetings/[id]` (detalhe com RSVP, gravação, sumário, transcrição), `/portal/users` (master gerencia sub-usuários). Admin: `/customers/[id]/portal-users` com criar, revogar, editar inline, seletor de perfil (master/member) e eye toggle na senha. `UpdateCustomerPortalUserUseCase` (TDD, 6 testes). Refresh token corrigido: `middleware.ts` → `proxy.ts` (Next.js 16), `Buffer.from` → `atob()` (Edge Runtime). Total: 287 testes passando.  
> **2026-04-14 (sessão 4):** Fase 6 — gravação e transcrição de reuniões implementadas. `MeetingFilesFinderService` (pesquisa Drive em "Meet Recordings" por nome do título + fallback por data). `TranscriptorService` (client para API transcritor: submit MP4, poll status, get result). `MeetingRecordingDetectorService` reescrito com 3 passes: Pass 0 Drive-first (detecta reuniões via arquivos novos no Drive independente de horário agendado), Pass 1 time-based (marca reuniões expiradas como ended), Pass 2 retry (retenta reuniões ended sem gravação por até 4h). Estratégia de transcrição: 1º doc Gemini nativo do Meet (summary + transcript), fallback: envia MP4 ao transcritor externo. `MeetingTranscriptionPollerService` reescrito para usar `TranscriptorService`.  
> **2026-04-14 (sessão 5):** Página de detalhe de reunião implementada (`/customers/[id]/meetings/[meetingId]`): gravação embed Drive, transcrição, attendees RSVP, summary editável. `MeetingPresenter.toHTTP` corrigido para expor `nativeTranscriptUrl` e `transcriptText`. Link "Ver detalhes" adicionado nos cards da lista. Fases 7–11 planejadas: Tarefas (Scrum + ICE + Gantt + comentários ricos), Atividades (log de comunicações + integrações GoTo/Gmail/WhatsApp), Criativos (Drive + performance A/B), Tráfego Pago (Meta BM + campanhas), CRM do Cliente (funil de vendas + leads).  
> **2026-04-14 (sessão 6–7):** Fase 7 implementada. Backend: migration `task_comments`/`comment_attachments`/`image_annotations`/`comment_reactions`; entidade `TaskComment`; use-cases: AddComment, ListComments, ResolveComment, ReactToComment, DeleteComment, AddSubtask, ProcessRecurringTasks; `RecurringTasksScheduler` (cron diário); `AllTasksController` com enrichment de `customerName`. Frontend: `/tasks` com coluna cliente, groupBy, filtros, botão "Nova tarefa" com busca de cliente; `/customers/[id]/tasks/[taskId]` com SubtasksSection + CommentsSection (respostas, reações emoji, resolver, soft-delete). Campos `startAt`/`endAt`/`estimatedHours` adicionados nos formulários de criação; inputs tipo `datetime-local`.  
> **2026-04-14 (sessão 8):** Fase 8 implementada. Backend: migration `activities`/`activity_attachments`; entidade `Activity` com complete/cancel/softDelete; use-cases: CreateActivity, UpdateActivity, GetActivity, ListCustomerActivities, DeleteActivity (12 testes); `ActivitiesController` com Swagger; `ActivitiesModule`. Frontend: `/customers/[id]/activities` timeline vertical com ícones por tipo, badges de status, filtros por tipo e status, formulário inline, botão de exclusão com toast. Sidebar + aba no cliente.  
> **2026-04-15 (sessão 9):** Fase 7 — pendências concluídas em TDD. Backend: `StartTimeTrackingUseCase`, `StopTimeTrackingUseCase`, `GetTaskTimeEntriesUseCase`, `ReorderTasksUseCase`; migration `time_entries`; `TaskTemplate` entity + migration; use-cases: `CreateTaskTemplateUseCase`, `ListTaskTemplatesUseCase`, `ApplyTaskTemplateUseCase`, `CreateTemplateFromTasksUseCase`; `TemplatesController` com Swagger; `AddCommentAttachmentUseCase`, `UploadCommentAudioUseCase`, `AddImageAnnotationUseCase`. Frontend: views Calendário e Gantt (SVG puro); `TimeTracker` no detalhe da tarefa; reorder within-column no kanban. Total: 369 testes passando (71 arquivos).  
> **2026-04-15 (sessão 10):** Fase 7 — frontend das pendências concluído. `/task-templates` (página global): listar, criar do zero com rows de tarefas, excluir, aplicar a qualquer cliente via modal. `TemplatesSection` na página de tarefas do cliente: aplicar template com um clique + criar template via multi-select das tarefas existentes. `CommentsSection` reescrita: botão 📎 de anexo de arquivo + gravador de áudio ao vivo com `MediaRecorder` e timer. `ImageAnnotationViewer`: imagem com pins numerados sobrepostos, modo crosshair para clicar e anotar. Link "Templates" no sidebar. Fase 7 totalmente concluída.
> **2026-04-15 (sessão 11):** Fase 9 — Comunicações. Backend: `WhatsAppWebhookService.recordSentMessage()` (TDD, 8 testes) — grava mensagens enviadas como activities, reaproveita janela de sessão de 2h. `EvolutionController.send()` atualizado para chamar `recordSentMessage` e aceitar `@CurrentUser()`. 9 testes de controller adicionados.
> **2026-04-15 (sessão 12):** Fase 10 — Criativos. Backend completo (TDD): 5 enums + 4 models Prisma (`Creative`, `CreativePerformance`, `CreativeStrategy`, `CreativeStrategyItem`); entidades DDD `Creative` + `CreativeStrategy`; 11 use-cases com specs; `PrismaCreative*` repositories; `GoogleCreativesFolderService` (Drive idempotente); `CreativesController` + `CreativeStrategiesController` com Swagger; `CreativesModule` no `AppModule`. Bug fix: 3 use-cases usavam `type CustomerRepo` (TypeScript alias, apagado em runtime) em vez de `ICustomerRepository`/`IStorageAdapter` — corrigido para injeção NestJS correta. DB atualizado via `prisma db push` (sem destruir dados). Frontend pendente: lista/detalhe de criativos, navegação no cliente.
> **2026-04-16 (sessão 13):** Criativos — frontend completo. `stage` (exploration/refinement/scale) + `parentCreativeId` + `variationAspects String[]` + `thumbnailUrl` adicionados ao backend/Prisma/frontend. Formulário de criação reescrito como multi-entry unificado: seleciona múltiplos arquivos (cada um vira criativo com ID próprio) ou adiciona entradas manualmente clonando a anterior; arquivo obrigatório com rollback automático se upload falhar. `CreativeCard` client component com lightbox (zoom, Escape, Drive link). Página global `/creatives` no menu lateral agrupada por cliente. SSE proxy reescrito com `node:http` (fix de body timeout de 5min do undici). Server action body limit aumentado para 50 MB.
> **2026-04-16 (sessão 14–15):** Tráfego Pago — FASE 11-A concluída. Design do domínio `paid-traffic` definido e implementado: 6 tabelas Prisma (MetaConfig, MetaAdAccount, Campaign, AdSet, Ad, AdDailyMetric), 5 entidades DDD, 6 repositórios (abstract classes), `IAdPlatformAdapter` stub, 19 use-cases com 561 testes passando, 6 Prisma repositories + mappers, 2 controllers com Swagger completo (22 rotas), `PaidTrafficModule` registrado. Commit: `feat(paid-traffic): add domain entities, use-cases, repositories and controller`.
> **2026-04-16 (sessão 16):** FASE 11-B + 11-C concluídas. Ver entregáveis abaixo.

---

## Visão Geral do Sistema

Sistema de gestão de clientes com controle de histórico, ações, documentos, propostas e reuniões integradas ao Google Workspace. Uso inicial solo (admin), com expansão planejada para funcionários com hierarquia de permissões e, futuramente, acesso do próprio cliente.

---

## Decisões Arquiteturais Registradas

| # | Decisão |
|---|---------|
| Auth | Seed cria admin fixo na inicialização se não existir (`seed.ts`). Credenciais em `.env`: `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD` |
| Auth | Só o admin cria contas de funcionários e define a senha diretamente |
| Auth | Multi-sessão permitida (mesmo usuário em vários dispositivos) |
| Auth | Reset de senha: implementar depois, quando app estiver no ar |
| Roles | `admin` → acesso total; `manager` → acesso parcial (a definir); `employee` → acesso básico; `customer` → portal do cliente (Fase 5) |
| Permissões | Futuro: delegação granular de tarefas (reuniões, todos) entre funcionários. Arquitetura deve suportar isso sem reescrever |
| Portal Cliente | O cliente acessa o mesmo sistema (mesma URL), mas com role `customer`. Vê somente os dados da própria empresa |
| Portal Cliente | `UserIdentity` com role `customer` é vinculado a um `Customer` via tabela `CustomerUser` (campo `customerId`) |
| Portal Cliente | `CustomerUser.customerRole`: `master` (primeiro usuário, criado pelo admin) e `member` (sub-usuários, criados pelo master). Outros sub-roles a definir |
| Portal Cliente | Admin cria o usuário master com email + senha definida. Master pode criar/gerenciar os próprios sub-usuários |
| Portal Cliente | `customerId` incluído no payload do JWT para usuários com role `customer`, permitindo filtro automático por empresa |
| Portal Cliente | Páginas do cliente (Fase 5): (1) gestão de usuários da empresa, (2) lista de reuniões da empresa (read-only) |
| Portal Cliente | Rotas do portal prefixadas em `/api/v1/portal/` para separar visualmente das rotas internas |
| Clientes | Cliente = empresa. Pode ter múltiplos **contatos** (pessoas). Reuniões/registros vinculados ao contato específico |
| Clientes | Um cliente pode ter múltiplos funcionários responsáveis (many-to-many) |
| Clientes | Quando funcionário é desativado: admin reatribui manualmente |
| Clientes | Sem exportação CSV por enquanto |
| Documentos | Uma **pasta por cliente** no Google Drive. Pasta criada automaticamente quando cliente é cadastrado. `driveFolderId` salvo no `Customer` |
| Documentos | Tipos aceitos: PDF, Word, Excel, imagens |
| Documentos | Sem versionamento. Cada upload é um novo documento |
| Documentos | Apenas armazenamento. Sem integração de assinatura digital |
| Documentos | Sem notificações de upload |
| Reuniões | **Pontos pendentes** (aprofundar na Fase 4): gravação/transcrição Meet, timezone, participantes múltiplos, notas pós-reunião, recorrência, reuniões sem cliente |
| Notificações | Gmail API planejada. Canal e gatilhos a definir na fase correspondente |
| API | Prefixo `/api/v1/` em todas as rotas |
| Real-time | Server-Sent Events (SSE) para notificações in-app |
| CI/CD | Ansible para produção (detalhes quando chegar lá). Por ora: só local |
| Multi-tenant | **Não agora.** Sistema para uso próprio. Pode virar SaaS no futuro, mas sem over-engineering prévio |
| LGPD | Última prioridade. Implementar após todas as features |
| Charts / Dashboard | **Tremor** (componentes de dashboard Tailwind-first: KPI cards, AreaChart, BarChart, DonutChart, Funnel) para gráficos padrão. **Recharts** para casos customizados (ex: Gantt). **Looker Studio descartado**: conflito com auth JWT próprio, exigiria BigQuery/Sheets para expor dados, e não suporta multi-tenant por `customerId` sem um report por cliente. |
| Portal Cliente Dashboard | `/portal/dashboard` — página de métricas para o cliente acompanhar seus números (leads, funil de conversão, criativos ativos, campanhas, reuniões). Implementada junto com as Fases 9–11 à medida que os dados ficam disponíveis. Usa Tremor + dados filtrados por `customerId` do JWT. |

---

## Roles e Permissões

```
admin    → cria/gerencia tudo, vê ações de todos os funcionários
manager  → subconjunto de recursos (a definir quando houver necessidade)
employee → acesso aos próprios clientes e tarefas delegadas
customer → portal do cliente — vê apenas dados da própria empresa
```

### Sub-roles do Portal (CustomerUserRole)

```
master → criado pelo admin; pode criar/gerenciar sub-usuários da empresa; vê todas as páginas do portal
member → criado pelo master; acesso a definir (TBD)
```

> A arquitetura de autorização deve usar uma estrutura extensível (ex: resource-based permissions futuramente), mas por ora `UserRole` enum com guard é suficiente.
>
> Para o portal, o `customerId` no JWT é a principal fronteira de segurança: garante que usuários `customer` nunca acessem dados de outro cliente.

---

## Modelo de Dados Revisado

```
Customer (empresa)
  ├── contacts[]       → pessoas da empresa (contato principal, outros)
  ├── employees[]      → funcionários responsáveis (many-to-many)
  ├── documents[]      → propostas e contratos
  ├── meetings[]       → reuniões (vinculadas a contato específico)
  ├── activities[]     → audit log
  └── driveFolderId    → pasta no Google Drive criada no cadastro
```

---

## Prisma Schema Completo

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ─────────────────────────────────────────
// AUTH
// ─────────────────────────────────────────

enum UserRole {
  admin
  manager
  employee
  customer        // portal do cliente — vinculado a um Customer via CustomerUser
}

enum CustomerUserRole {
  master          // criado pelo admin; pode gerenciar sub-usuários
  member          // criado pelo master; acesso a definir
}

model UserIdentity {
  id            String    @id @default(uuid())
  email         String    @unique
  passwordHash  String
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  deletedAt     DateTime?

  profile       UserProfile?
  authorization UserAuthorization?
  refreshTokens RefreshToken[]
}

model UserProfile {
  id        String   @id @default(uuid())
  userId    String   @unique
  name      String
  phone     String?
  avatarUrl String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  user UserIdentity @relation(fields: [userId], references: [id])
}

model UserAuthorization {
  id        String   @id @default(uuid())
  userId    String   @unique
  role      UserRole @default(employee)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  user UserIdentity @relation(fields: [userId], references: [id])
}

model RefreshToken {
  id        String    @id @default(uuid())
  userId    String
  token     String    @unique
  expiresAt DateTime
  revokedAt DateTime?
  createdAt DateTime  @default(now())

  user UserIdentity @relation(fields: [userId], references: [id])

  @@index([token])
  @@index([userId])
}

// ─────────────────────────────────────────
// CUSTOMERS
// ─────────────────────────────────────────

enum CustomerStatus {
  active    // padrão na criação
  inactive
}

enum CustomerActivityType {
  created
  updated
  assigned
  contact_added
  document_uploaded
  meeting_scheduled
  meeting_completed
  note_added
}

model CustomerCategory {
  id          String    @id @default(uuid())
  name        String    @unique
  description String?
  isActive    Boolean   @default(true)
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  deletedAt   DateTime?

  customers Customer[]
}

model Customer {
  id              String            @id @default(uuid())
  name            String                               // nome da empresa
  email           String            @unique            // email principal da empresa
  phone           String?
  document        String?           @unique            // CNPJ
  website         String?
  notes           String?
  status          CustomerStatus    @default(active)
  categoryId      String?
  driveFolderId   String?                              // pasta criada no Drive no cadastro
  createdByUserId String
  createdAt       DateTime          @default(now())
  updatedAt       DateTime          @updatedAt
  deletedAt       DateTime?

  category    CustomerCategory?
  contacts    Contact[]
  employees   CustomerEmployee[]
  documents   Document[]
  meetings    Meeting[]
  activities  CustomerActivity[]
}

model Contact {
  id         String   @id @default(uuid())
  customerId String
  name       String
  email      String?
  phone      String?
  role       String?  // ex: "CEO", "Gerente Financeiro"
  isPrimary  Boolean  @default(false)
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  customer Customer  @relation(fields: [customerId], references: [id])
  meetings Meeting[] @relation("MeetingContact")

  @@index([customerId])
}

model CustomerEmployee {
  customerId String
  userId     String
  assignedAt DateTime @default(now())
  assignedBy String

  customer Customer @relation(fields: [customerId], references: [id])

  @@id([customerId, userId])
  @@index([userId])
}

// Vincula um UserIdentity (role=customer) a uma empresa específica
model CustomerUser {
  id           String           @id @default(uuid())
  userId       String           @unique        // UserIdentity.id
  customerId   String
  customerRole CustomerUserRole @default(member)
  createdAt    DateTime         @default(now())
  createdBy    String                          // userId do admin/master que criou
  deletedAt    DateTime?

  customer Customer @relation(fields: [customerId], references: [id])

  @@index([customerId])
  @@map("customer_users")
}

model CustomerActivity {
  id          String               @id @default(uuid())
  customerId  String
  userId      String
  type        CustomerActivityType
  description String
  metadata    Json?
  createdAt   DateTime             @default(now())

  customer Customer @relation(fields: [customerId], references: [id])

  @@index([customerId])
  @@index([userId])
}

// ─────────────────────────────────────────
// DOCUMENTS
// ─────────────────────────────────────────

enum DocumentType {
  proposal
  contract
  addendum
  other
}

enum DocumentStatus {
  pending_signature
  signed
  expired
  cancelled
}

model Document {
  id               String         @id @default(uuid())
  customerId       String
  type             DocumentType
  title            String
  driveFileId      String
  driveViewUrl     String
  driveDownloadUrl String
  mimeType         String         // application/pdf, image/jpeg, etc.
  sizeBytes        Int?
  signedAt         DateTime?
  notes            String?
  status           DocumentStatus @default(pending_signature)
  uploadedByUserId String
  createdAt        DateTime       @default(now())
  updatedAt        DateTime       @updatedAt
  deletedAt        DateTime?

  customer Customer @relation(fields: [customerId], references: [id])

  @@index([customerId])
}

// ─────────────────────────────────────────
// MEETINGS
// ─────────────────────────────────────────

enum MeetingStatus {
  scheduled
  in_progress
  completed
  cancelled
  no_show
}

model MeetingType {
  id              String    @id @default(uuid())
  name            String
  description     String?
  durationMinutes Int       @default(60)
  color           String    @default("#3B82F6")
  isActive        Boolean   @default(true)
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  deletedAt       DateTime?

  meetings Meeting[]
}

model Meeting {
  id                String        @id @default(uuid())
  customerId        String
  contactId         String?                       // contato específico da empresa
  meetingTypeId     String
  title             String
  description       String?
  scheduledAt       DateTime
  durationMinutes   Int
  endedAt           DateTime?
  googleEventId     String?       @unique
  meetLink          String?
  status            MeetingStatus @default(scheduled)
  scheduledByUserId String
  attendeeEmails    String[]
  // preenchidos após conclusão (detalhes a definir na Fase 4)
  recordingUrl      String?
  transcriptionUrl  String?
  summaryText       String?
  internalNotes     String?       // anotações internas do funcionário
  createdAt         DateTime      @default(now())
  updatedAt         DateTime      @updatedAt

  customer    Customer    @relation(fields: [customerId], references: [id])
  contact     Contact?    @relation("MeetingContact", fields: [contactId], references: [id])
  meetingType MeetingType @relation(fields: [meetingTypeId], references: [id])

  @@index([customerId])
  @@index([scheduledAt])
}
```

---

## Arquitetura de Pastas — Backend

```
backend/src/
├── core/
│   ├── entity.ts
│   ├── aggregate-root.ts
│   ├── unique-entity-id.ts
│   ├── either.ts
│   └── domain/
│       ├── domain-event.ts
│       ├── events/domain-events.ts
│       └── unit-of-work.ts
│
├── domain/
│   ├── auth/
│   │   ├── enterprise/
│   │   │   ├── entities/
│   │   │   │   ├── user-identity.ts
│   │   │   │   ├── user-profile.ts
│   │   │   │   ├── user-authorization.ts
│   │   │   │   └── refresh-token.ts
│   │   │   ├── value-objects/
│   │   │   │   ├── email.vo.ts
│   │   │   │   ├── password.vo.ts
│   │   │   │   └── user-role.vo.ts
│   │   │   └── events/
│   │   │       └── user-created.event.ts
│   │   ├── application/
│   │   │   ├── use-cases/
│   │   │   │   ├── create-user.use-case.ts
│   │   │   │   ├── authenticate-user.use-case.ts
│   │   │   │   ├── refresh-access-token.use-case.ts
│   │   │   │   ├── logout.use-case.ts
│   │   │   │   ├── get-current-user.use-case.ts
│   │   │   │   ├── list-users.use-case.ts
│   │   │   │   └── update-user-profile.use-case.ts
│   │   │   └── repositories/
│   │   │       ├── i-user-identity.repository.ts
│   │   │       ├── i-user-profile.repository.ts
│   │   │       ├── i-user-authorization.repository.ts
│   │   │       ├── i-refresh-token.repository.ts
│   │   │       └── i-auth-unit-of-work.ts
│   │   └── domain/exceptions/
│   │
│   ├── customers/
│   │   ├── enterprise/
│   │   │   ├── entities/
│   │   │   │   ├── customer.ts
│   │   │   │   ├── contact.ts
│   │   │   │   └── customer-activity.ts
│   │   │   ├── value-objects/
│   │   │   │   ├── customer-status.vo.ts
│   │   │   │   └── cnpj.vo.ts
│   │   │   └── events/
│   │   │       ├── customer-created.event.ts
│   │   │       ├── customer-updated.event.ts
│   │   │       └── customer-assigned.event.ts
│   │   ├── application/
│   │   │   ├── use-cases/
│   │   │   │   ├── create-customer.use-case.ts
│   │   │   │   ├── update-customer.use-case.ts
│   │   │   │   ├── get-customer.use-case.ts
│   │   │   │   ├── list-customers.use-case.ts
│   │   │   │   ├── delete-customer.use-case.ts
│   │   │   │   ├── assign-employee.use-case.ts
│   │   │   │   ├── remove-employee.use-case.ts
│   │   │   │   ├── add-contact.use-case.ts
│   │   │   │   ├── update-contact.use-case.ts
│   │   │   │   ├── delete-contact.use-case.ts
│   │   │   │   └── list-customer-activities.use-case.ts
│   │   │   └── repositories/
│   │   │       ├── i-customer.repository.ts
│   │   │       ├── i-contact.repository.ts
│   │   │       └── i-customer-activity.repository.ts
│   │   └── domain/exceptions/
│   │
│   ├── documents/
│   │   ├── enterprise/
│   │   │   ├── entities/document.ts
│   │   │   ├── value-objects/
│   │   │   │   ├── document-type.vo.ts
│   │   │   │   └── document-status.vo.ts
│   │   │   └── events/document-uploaded.event.ts
│   │   ├── application/
│   │   │   ├── use-cases/
│   │   │   │   ├── upload-document.use-case.ts
│   │   │   │   ├── get-document.use-case.ts
│   │   │   │   ├── list-customer-documents.use-case.ts
│   │   │   │   ├── update-document-status.use-case.ts
│   │   │   │   └── delete-document.use-case.ts
│   │   │   ├── repositories/i-document.repository.ts
│   │   │   └── services/i-storage.adapter.ts
│   │   └── domain/exceptions/
│   │
│   └── meetings/
│       ├── enterprise/
│       │   ├── entities/
│       │   │   ├── meeting.ts
│       │   │   └── meeting-type.ts
│       │   ├── value-objects/meeting-status.vo.ts
│       │   └── events/
│       │       ├── meeting-scheduled.event.ts
│       │       └── meeting-completed.event.ts
│       ├── application/
│       │   ├── use-cases/
│       │   │   ├── schedule-meeting.use-case.ts
│       │   │   ├── get-meeting.use-case.ts
│       │   │   ├── list-customer-meetings.use-case.ts
│       │   │   ├── list-all-meetings.use-case.ts
│       │   │   ├── update-meeting.use-case.ts
│       │   │   ├── start-meeting.use-case.ts
│       │   │   ├── complete-meeting.use-case.ts
│       │   │   ├── cancel-meeting.use-case.ts
│       │   │   ├── create-meeting-type.use-case.ts
│       │   │   ├── list-meeting-types.use-case.ts
│       │   │   ├── update-meeting-type.use-case.ts
│       │   │   └── delete-meeting-type.use-case.ts
│       │   ├── repositories/
│       │   │   ├── i-meeting.repository.ts
│       │   │   └── i-meeting-type.repository.ts
│       │   └── services/i-calendar.adapter.ts
│       └── domain/exceptions/
│
└── infra/
    ├── http.module.ts
    ├── database/
    │   └── prisma/
    │       ├── prisma.service.ts
    │       ├── repositories/
    │       │   ├── auth/
    │       │   ├── customers/
    │       │   ├── documents/
    │       │   └── meetings/
    │       └── mappers/
    │           ├── auth/
    │           ├── customers/
    │           ├── documents/
    │           └── meetings/
    ├── modules/
    │   ├── auth/auth.module.ts
    │   ├── customers/customers.module.ts
    │   ├── documents/documents.module.ts
    │   └── meetings/meetings.module.ts
    ├── controllers/
    │   ├── auth.controller.ts          # POST /api/v1/auth/...
    │   ├── users.controller.ts         # /api/v1/users
    │   ├── customers.controller.ts     # /api/v1/customers
    │   ├── contacts.controller.ts      # /api/v1/customers/:id/contacts
    │   ├── documents.controller.ts     # /api/v1/customers/:id/documents
    │   ├── meetings.controller.ts      # /api/v1/customers/:id/meetings
    │   └── meeting-types.controller.ts # /api/v1/meeting-types
    ├── auth/
    │   ├── strategies/jwt.strategy.ts
    │   ├── strategies/local.strategy.ts
    │   └── guards/
    │       ├── jwt-auth.guard.ts
    │       └── roles.guard.ts
    ├── adapters/
    │   ├── storage/
    │   │   ├── i-storage.adapter.ts
    │   │   ├── google-drive.adapter.ts
    │   │   └── local-storage.adapter.ts  # dev/test
    │   └── calendar/
    │       ├── i-calendar.adapter.ts
    │       ├── google-calendar.adapter.ts
    │       └── mock-calendar.adapter.ts  # dev/test
    ├── sse/
    │   └── sse.service.ts              # Server-Sent Events
    ├── filters/http-exception.filter.ts
    ├── presenters/
    │   ├── user.presenter.ts
    │   ├── customer.presenter.ts
    │   ├── contact.presenter.ts
    │   ├── document.presenter.ts
    │   └── meeting.presenter.ts
    └── events/
        ├── events.module.ts
        └── handlers/
            ├── customer-created.handler.ts
            ├── customer-updated.handler.ts
            ├── customer-assigned.handler.ts
            ├── document-uploaded.handler.ts
            ├── meeting-scheduled.handler.ts
            └── meeting-completed.handler.ts
```

---

## Endpoints — `/api/v1/`

### Auth
```
POST   /api/v1/auth/sign-in
POST   /api/v1/auth/refresh
POST   /api/v1/auth/logout
```

### Users (admin gerencia funcionários)
```
POST   /api/v1/users              # admin cria funcionário
GET    /api/v1/users              # lista funcionários (admin)
GET    /api/v1/users/me           # usuário autenticado
PATCH  /api/v1/users/me          # atualiza próprio perfil
GET    /api/v1/users/:id          # admin vê funcionário
PATCH  /api/v1/users/:id         # admin atualiza funcionário
DELETE /api/v1/users/:id         # admin desativa funcionário (soft)
```

### Customer Categories (admin)
```
POST   /api/v1/customer-categories
GET    /api/v1/customer-categories
PATCH  /api/v1/customer-categories/:id
DELETE /api/v1/customer-categories/:id
```

### Customers
```
POST   /api/v1/customers
GET    /api/v1/customers          # ?status=&search=&employeeId=&categoryId=&page=&limit=
GET    /api/v1/customers/:id
PATCH  /api/v1/customers/:id
DELETE /api/v1/customers/:id      # admin only, soft delete

POST   /api/v1/customers/:id/employees          # assign employee
DELETE /api/v1/customers/:id/employees/:userId  # remove employee

GET    /api/v1/customers/:id/activities
```

### Contacts
```
POST   /api/v1/customers/:id/contacts
GET    /api/v1/customers/:id/contacts
PATCH  /api/v1/customers/:id/contacts/:contactId
DELETE /api/v1/customers/:id/contacts/:contactId
```

### Documents
```
POST   /api/v1/customers/:id/documents        # multipart/form-data
GET    /api/v1/customers/:id/documents        # ?type=&status=
GET    /api/v1/customers/:id/documents/:docId
PATCH  /api/v1/customers/:id/documents/:docId/status
DELETE /api/v1/customers/:id/documents/:docId  # admin only
```

### Meetings
```
POST   /api/v1/customers/:id/meetings
GET    /api/v1/customers/:id/meetings          # ?status=&typeId=
GET    /api/v1/customers/:id/meetings/:meetId
PATCH  /api/v1/customers/:id/meetings/:meetId  # reagendar
POST   /api/v1/customers/:id/meetings/:meetId/start
POST   /api/v1/customers/:id/meetings/:meetId/complete
POST   /api/v1/customers/:id/meetings/:meetId/cancel

GET    /api/v1/meetings                        # visão admin: todas as reuniões
```

### Meeting Types (admin)
```
POST   /api/v1/meeting-types
GET    /api/v1/meeting-types
PATCH  /api/v1/meeting-types/:id
DELETE /api/v1/meeting-types/:id
```

### Customer Portal Access (admin gerencia)
```
POST   /api/v1/customers/:id/portal-users          # admin cria usuário master para um cliente
GET    /api/v1/customers/:id/portal-users          # admin lista usuários do portal do cliente
DELETE /api/v1/customers/:id/portal-users/:userId  # admin revoga acesso
```

### Portal do Cliente (role=customer)
```
# Gestão de usuários da empresa (master only)
POST   /api/v1/portal/users              # master cria sub-usuário (member)
GET    /api/v1/portal/users              # master lista usuários da empresa
PATCH  /api/v1/portal/users/:id          # master atualiza sub-usuário
DELETE /api/v1/portal/users/:id          # master desativa sub-usuário

# Reuniões (read-only — todas as reuniões vinculadas à empresa)
GET    /api/v1/portal/meetings           # lista reuniões da empresa
GET    /api/v1/portal/meetings/:id       # detalhe da reunião
```

### SSE
```
GET    /api/v1/events              # Server-Sent Events stream (autenticado)
```

---

## Integração Google (OAuth2 Único)

> **Referência de implementação:** `/Users/brunovieira/projects/WB-crm/src/lib/google/`  
> Mesmas credenciais, mesmo padrão. Replicar de lá.

### Credenciais (salvas em `backend/.env` — não commitar)
> Valores reais estão no `backend/.env` local. Consulte também a memória `google_integration.md`.
```
GOOGLE_CLIENT_ID=<ver .env>
GOOGLE_CLIENT_SECRET=<ver .env>
GOOGLE_REDIRECT_URI=http://localhost:3003/api/v1/google/callback   # dev
# GOOGLE_REDIRECT_URI=https://seudominio.com/api/v1/google/callback # prod
TRANSCRIPTOR_BASE_URL=https://transcritor.wbdigitalsolutions.com
TRANSCRIPTOR_API_KEY=<ver .env>
CRON_SECRET=<ver .env>
```

### Modelo Prisma necessário
```prisma
model GoogleToken {
  id             String    @id @default(cuid())
  accessToken    String
  refreshToken   String
  expiresAt      DateTime
  scope          String
  email          String
  gmailHistoryId String?
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt
  @@map("google_tokens")
}
```

### Scopes OAuth2
```typescript
export const SCOPES = [
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.modify",
  "https://www.googleapis.com/auth/drive.readonly",
  "https://www.googleapis.com/auth/drive.file",
  "https://www.googleapis.com/auth/calendar",
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/userinfo.email",
]
```

### Fluxo OAuth (admin conecta uma vez)
```
GET  /api/v1/google/auth        → gera URL consentimento (admin only)
GET  /api/v1/google/callback    → troca code por tokens, salva no banco (singleton)
POST /api/v1/google/disconnect  → deleta token (admin only)
```
- Token salvo com ID fixo `"google-token-singleton"` via upsert
- Refresh automático: buffer de 5 min antes de expirar
- `getAuthenticatedClient()` sempre retorna cliente válido

### Funcionalidade 1 — Drive (docs de cliente)
- Estrutura de pastas: `WB-Customer/Documentos/{Nome do Cliente}/`
- `getOrCreateFolder(name, parentId?)` — busca ou cria pasta
- `uploadFile({ name, mimeType, content: Buffer, folderId })` → `{ id, webViewLink }`
- `driveFolderId` salvo em `Customer` na criação
- `driveFileId` e `driveViewUrl` salvos em `Document`
- URL de preview inline: `https://drive.google.com/file/d/{fileId}/preview`
- Referência: `/Users/brunovieira/projects/WB-crm/src/lib/google/drive.ts`
               `/Users/brunovieira/projects/WB-crm/src/lib/google/drive-folders.ts`

### Funcionalidade 2 — Gmail (futuro)
- Polling a cada 5 min via cron
- `gmailHistoryId` no `GoogleToken` controla ponto de início
- Cria `Activity` por e-mail recebido (tipo `email`)
- Referência: `/Users/brunovieira/projects/WB-crm/src/lib/google/gmail-poller.ts`

### Funcionalidade 3 — Google Meet/Calendar (Fase 4 frontend)
- `createMeetEvent()` → retorna `{ eventId, meetLink }`
- Crons: check-rsvp (5 min), check-transcriptions (5 min), check-recordings (15 min)
- Transcritor externo: `TRANSCRIPTOR_BASE_URL` + `TRANSCRIPTOR_API_KEY`
- Referência: `/Users/brunovieira/projects/WB-crm/src/lib/google/calendar.ts`

### Ordem de implementação Google
1. Migration `google_tokens`
2. `src/infra/google/auth.service.ts` — OAuth2, scopes, refresh
3. `src/infra/google/token-store.service.ts` — getStoredToken, saveToken
4. `src/infra/google/drive.service.ts` — uploadFile, getOrCreateFolder
5. Controller `GET /api/v1/google/auth` + `GET /api/v1/google/callback` + `POST /api/v1/google/disconnect`
6. Página `/admin/google` no frontend — conectar/desconectar, exibir email conectado
7. Trocar `LocalStorageAdapter` → `GoogleDriveAdapter`
8. Gmail poller (com fase de atividades)
9. Calendar/Meet (Fase 4)

---

## Variáveis de Ambiente

```env
# App
NODE_ENV=development
PORT=3000
API_PREFIX=api/v1

# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/wb_customer

# JWT
JWT_SECRET=your-super-secret-key-min-32-chars
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Seed (admin inicial — se não existir, cria)
SEED_ADMIN_EMAIL=bruno@wbdigitalsolutions.com
SEED_ADMIN_PASSWORD=Vidaplena20023@

# Google OAuth2 (Drive + Gmail + Calendar — um único OAuth2, admin conecta via /admin/google)
GOOGLE_CLIENT_ID=<ver backend/.env>
GOOGLE_CLIENT_SECRET=<ver backend/.env>
# Dev:        http://localhost:3003/api/v1/google/callback
# Produção:   https://customer.wbdigitalsolutions.com/api/v1/google/callback
# Ambos os URIs já estão registrados no Google Cloud Console (OAuth client)
GOOGLE_REDIRECT_URI=http://localhost:3003/api/v1/google/callback

# Transcritor externo
TRANSCRIPTOR_BASE_URL=https://transcritor.wbdigitalsolutions.com
TRANSCRIPTOR_API_KEY=BwzxPsLXLaWpqg9CyxO9UGmMR4ZHWfR7Jc5TFUAwf0I

# Cron / Internal
CRON_SECRET=jT/mimrva/LQ8qNzx7ebFuu+Pes3hfax8jFnELbzot0=

# Adapters
STORAGE_ADAPTER=google-drive   # local | google-drive
CALENDAR_ADAPTER=google-calendar  # mock | google-calendar
```

---

## Fases de Implementação

---

## FASE 1 — Fundação: Setup + Auth + Seed

### Escopo
- Estrutura de pastas (backend + frontend)
- Docker Compose (backend + postgres)
- Core DDD (Entity, AggregateRoot, Either, UniqueEntityID, UnitOfWork, DomainEvents)
- Domínio `auth` completo
- `seed.ts` com admin idempotente
- API prefixada em `/api/v1/`

### Entidades e VOs
- `UserIdentity`, `UserProfile`, `UserAuthorization`, `RefreshToken`
- VOs: `Email`, `Password` (bcrypt), `UserRole`
- Eventos: `UserCreatedEvent`

### Casos de Uso
- `CreateUserUseCase` — admin cria funcionário (UoW: identity + profile + authorization)
- `AuthenticateUserUseCase` — valida email/senha, retorna access + refresh token
- `RefreshAccessTokenUseCase` — valida refresh token, emite novo access token
- `LogoutUseCase` — revoga refresh token
- `GetCurrentUserUseCase` — retorna perfil do autenticado
- `ListUsersUseCase` — lista funcionários (admin)
- `UpdateUserProfileUseCase` — atualiza próprio perfil

### Seed
```typescript
// seed.ts — roda na inicialização
// Se SEED_ADMIN_EMAIL já existe no banco → ignora
// Caso contrário → cria admin com hash da SEED_ADMIN_PASSWORD
```

### Testes Fase 1

**Unit (src/**/*.spec.ts):**
- `UserIdentity` — criação, validação
- `Email` VO — válidos e inválidos
- `Password` VO — hash + compare
- `UserRole` VO — roles válidos/inválidos
- `CreateUserUseCase` — sucesso, email duplicado, role inválido
- `AuthenticateUserUseCase` — sucesso, credenciais erradas, usuário deletado
- `RefreshAccessTokenUseCase` — válido, expirado, revogado
- `LogoutUseCase` — revoga corretamente
- In-memory repositories para todos

**E2E (test/e2e/auth/):**
- `POST /api/v1/auth/sign-in` — 200, 401 credenciais erradas
- `POST /api/v1/auth/refresh` — 200, 401 token inválido/expirado
- `POST /api/v1/auth/logout` — 204
- `POST /api/v1/users` — 201 (admin), 403 (employee), 409 email duplicado
- `GET /api/v1/users/me` — 200, 401 sem token
- `PATCH /api/v1/users/me` — 200
- `GET /api/v1/users` — 200 (admin), 403 (employee)

### Entregáveis Fase 1 ✅ CONCLUÍDA
- [x] `docker compose up` sobe sem erros
- [x] Migrations aplicadas
- [x] Seed cria admin se não existir
- [x] Todos os testes unit passando
- [x] Todos os testes e2e passando
- [x] `tsc --noEmit` sem erros
- [x] Login funcionando no frontend (página simples com eye toggle, validação)
- [x] Commit + push GitHub

---

## FASE 2 — Clientes + Contatos + Atividades

### Escopo
- Domínio `customers` completo
- CRUD de categorias de clientes (admin)
- CRUD de clientes (empresa), incluindo campo `categoryId`
- CRUD de contatos por cliente
- Atribuição de funcionários ao cliente (many-to-many)
- Audit log de atividades

### Entidades e VOs
- `CustomerCategory` (aggregate root)
- `Customer` (aggregate root) — inclui `categoryId?`
- `Contact` (entity)
- `CustomerActivity` (entity)
- VOs: `CustomerStatus`, `Cnpj`
- Eventos: `CustomerCreatedEvent`, `CustomerUpdatedEvent`, `CustomerAssignedEvent`

### Casos de Uso
- `CreateCustomerCategoryUseCase`
- `ListCustomerCategoriesUseCase`
- `UpdateCustomerCategoryUseCase`
- `DeleteCustomerCategoryUseCase` — soft delete (admin)
- `CreateCustomerUseCase` — cria cliente + cria pasta no Drive (adapter)
- `UpdateCustomerUseCase`
- `GetCustomerUseCase`
- `ListCustomersUseCase` — paginado, filtros (status, search, employeeId, categoryId)
- `DeleteCustomerUseCase` — soft delete (admin)
- `AssignEmployeeUseCase` — vincula funcionário ao cliente
- `RemoveEmployeeUseCase` — desvincula funcionário
- `AddContactUseCase`
- `UpdateContactUseCase`
- `DeleteContactUseCase`
- `ListCustomerActivitiesUseCase`

### Testes Fase 2

**Unit:**
- `CustomerCategory` entity
- `Customer` entity
- `Cnpj` VO — válido/inválido
- `CustomerStatus` VO
- Todos os use-cases com in-memory repositories

**E2E (test/e2e/customers/):**
- CRUD completo de categorias
- CRUD completo de clientes (incluindo categoryId)
- Permissões por role (admin vs employee)
- CRUD de contatos
- Assign/remove employee
- Listagem de atividades

### Entregáveis Fase 2 ✅ CONCLUÍDA
- [x] Testes unit passando (263)
- [x] Testes e2e passando (97)
- [x] `tsc --noEmit` sem erros
- [x] CRUD no frontend com tabela paginada + filtros + detalhe do cliente
- [x] CustomerStatus `lead` removido via TDD; padrão agora é `active`
- [x] Sidebar com link ativo por rota
- [x] Commit + push GitHub

---

## FASE 3 — Documentos (Google Drive)

### Escopo
- Domínio `documents`
- Google Drive Adapter + Local Adapter (dev/test)
- Upload multipart → Drive → URL no banco
- Pasta por cliente criada na Fase 2

### Entidades e VOs
- `Document` (aggregate root)
- VOs: `DocumentType`, `DocumentStatus`
- Evento: `DocumentUploadedEvent`

### Adapters
```typescript
interface IStorageAdapter {
  uploadFile(params: {
    folderId: string
    fileName: string
    mimeType: string
    buffer: Buffer
  }): Promise<{ fileId: string; viewUrl: string; downloadUrl: string }>

  deleteFile(fileId: string): Promise<void>
}
```

### Casos de Uso
- `UploadDocumentUseCase`
- `GetDocumentUseCase`
- `ListCustomerDocumentsUseCase`
- `UpdateDocumentStatusUseCase`
- `DeleteDocumentUseCase` (admin, remove do Drive + soft delete)

### Testes Fase 3

**Unit:**
- `Document` entity
- `UploadDocumentUseCase` — mock adapter
- `DeleteDocumentUseCase` — verifica remoção do Drive

**E2E (test/e2e/documents/):**
- Upload (mock adapter local)
- Listagem com filtros
- Atualização de status
- Delete (admin)

### Entregáveis Fase 3
- [x] Testes unit passando
- [x] Testes e2e passando (local adapter)
- [x] `tsc --noEmit` sem erros
- [ ] Upload drag-and-drop no frontend ← **PRÓXIMA**
- [ ] Visualização e download funcionando
- [ ] Commit + push GitHub

---

## FASE 4 — Reuniões (Google Meet) ⚠️ TBD

> **Pontos a aprofundar antes de codar:**
> - Como recuperar gravação/transcrição do Google Meet (polling? webhook? manual?)
> - Plano Google Workspace: Business Plus ou superior necessário para gravação
> - Timezone handling (usuário e cliente podem estar em fusos diferentes)
> - Múltiplos funcionários em uma reunião: controle de quem vai?
> - Notas internas pós-reunião: campo livre ou estruturado?
> - Reuniões recorrentes: implementar ou só one-off?
> - Reuniões sem cliente vinculado (internas): necessário?

### Escopo (o que já está definido)
- Domínio `meetings`: `Meeting`, `MeetingType`
- Google Calendar Adapter + Mock Adapter
- Agendamento → cliente recebe convite via Google Calendar
- Iniciar reunião (meetLink)
- Concluir reunião + gravação/transcrição (a definir)
- Tipos de reunião configuráveis (admin)

### Entidades
- `Meeting` (aggregate root)
- `MeetingType` (aggregate root)
- VOs: `MeetingStatus`
- Eventos: `MeetingScheduledEvent`, `MeetingCompletedEvent`

### Adapters
```typescript
interface ICalendarAdapter {
  createEvent(params: {
    title: string
    description?: string
    startTime: Date
    durationMinutes: number
    attendeeEmails: string[]
  }): Promise<{ eventId: string; meetLink: string }>

  updateEvent(eventId: string, params: Partial<CreateEventParams>): Promise<void>
  cancelEvent(eventId: string): Promise<void>
  getEvent(eventId: string): Promise<CalendarEventDetails>
  // getRecording — TBD
}
```

### Testes Fase 4
- Unit: todos os use-cases com mocks
- E2E: CRUD de reuniões (mock calendar), tipos de reunião

### Entregáveis Fase 4 ✅ CONCLUÍDA
- [x] Perguntas TBD respondidas (mock calendar no lugar de Google Calendar)
- [x] Testes unit passando
- [x] Testes e2e passando
- [x] Fluxo completo no frontend (lista global, agendamento, por cliente, tipos admin)
- [x] MeetingPresenter (TDD) — serialização correta de datas e status
- [x] Cron RSVP corrigido — janela 30 dias, campo startAt
- [x] Coluna de confirmação RSVP na lista de reuniões
- [x] Commit + push GitHub
- [ ] Página de detalhe da reunião — adiada, implementar junto com Fase 5

---

---

## FASE 5 — Portal do Cliente

### Escopo
- `CustomerUser` model: vincula `UserIdentity` (role=customer) a uma empresa (`Customer`)
- `CustomerUserRole` enum: `master` | `member`
- Admin cria o usuário master de um cliente (email + senha definida)
- Master pode criar/desativar sub-usuários (members) da própria empresa
- `customerId` incluído no JWT payload para role `customer`
- Guard `CustomerPortalGuard`: extrai `customerId` do JWT e injeta no request
- Rotas `/api/v1/portal/*` acessíveis somente por role `customer`
- Rotas `/api/v1/customers/:id/portal-users` acessíveis somente por `admin`

### Novo modelo Prisma
```prisma
enum CustomerUserRole {
  master
  member
}

model CustomerUser {
  id           String           @id @default(uuid())
  userId       String           @unique
  customerId   String
  customerRole CustomerUserRole @default(member)
  createdAt    DateTime         @default(now())
  createdBy    String
  deletedAt    DateTime?

  customer Customer @relation(fields: [customerId], references: [id])

  @@index([customerId])
  @@map("customer_users")
}
```

### JWT — payload para role `customer`
```typescript
// access token payload
{
  userId: string
  role: 'customer'
  customerId: string        // ← adicionado para usuários do portal
  customerRole: 'master' | 'member'
}
```

### Entidades e VOs
- `CustomerUser` (entity no domínio `customers`)
- Exceções: `CustomerUserAlreadyExistsError`, `CustomerUserNotFoundError`

### Repositório
- `ICustomerUserRepository`: `create`, `findByUserId`, `findByCustomerId`, `softDelete`

### Casos de Uso (admin)
- `CreateCustomerPortalUserUseCase` — cria UserIdentity (role=customer) + CustomerUser (master); admin define senha
- `ListCustomerPortalUsersUseCase` — lista usuários do portal de um cliente
- `RevokeCustomerPortalAccessUseCase` — soft delete UserIdentity + CustomerUser

### Casos de Uso (portal — master)
- `CreateCustomerSubUserUseCase` — master cria member da própria empresa
- `ListCustomerSubUsersUseCase` — master lista membros da empresa
- `UpdateCustomerSubUserUseCase` — master atualiza dados do member
- `DeactivateCustomerSubUserUseCase` — master desativa member

### Casos de Uso (portal — todos)
- `ListPortalMeetingsUseCase` — lista reuniões da empresa do usuário logado (read-only)
- `GetPortalMeetingUseCase` — detalhe de uma reunião da empresa

### Guards
- `CustomerPortalGuard`: verifica role=customer + injeta `customerId` do JWT no request
- `CustomerRoleGuard` (sub-role): `@CustomerRoles('master')` para rotas exclusivas do master

### Testes Fase 5

**Unit:**
- `CustomerUser` entity
- Todos os use-cases com in-memory repos

**E2E (test/e2e/portal/):**
- Admin cria portal user master → login → vê reuniões
- Master cria member → member loga → vê reuniões
- Customer não acessa rotas de `/api/v1/customers` (403)
- Member não acessa rotas de gestão de usuários (403)
- Customer não vê dados de outro cliente (404/403)

### Entregáveis Fase 5 ✅ CONCLUÍDA
- [x] Migration com `customer_users` e enum `CustomerUserRole`
- [x] Testes unit passando (287)
- [x] Testes e2e passando (97)
- [x] `tsc --noEmit` sem erros
- [x] Frontend: layout portal, `/portal/meetings`, `/portal/meetings/[id]`, `/portal/users`
- [x] Admin: `/customers/[id]/portal-users` com edição inline, role selector, eye toggle
- [x] `UpdateCustomerPortalUserUseCase` + `PATCH` endpoint
- [x] Refresh token + proxy.ts (Next.js 16 / Edge Runtime)
- [x] Commit + push GitHub

> **Extensão planejada (Fases 9–11):** `/portal/dashboard` — painel de métricas para o cliente. Implementado incrementalmente conforme os dados de criativos, tráfego pago e CRM forem disponibilizados. Usa **Tremor** para KPI cards e gráficos (AreaChart, BarChart, Funnel). Autenticação já garantida pelo `customerId` no JWT.

---

## Fase 6 — Gravação e Transcrição de Reuniões ✅ CONCLUÍDA

### Estratégia de detecção (cron 15 min — 3 passes)

**Pass 0 — Drive-first:** Varre `Meet Recordings` nos últimos 6h. Extrai título do nome do arquivo → encontra reuniões agendadas com título correspondente → marca como ended + busca gravação. Detecta reuniões que aconteceram fora do horário agendado.

**Pass 1 — Time-based:** Encontra reuniões com `startAt` há mais de 30 min → marca como ended → busca gravação.

**Pass 2 — Retry:** Reuniões ended sem `recordingDriveId` nas últimas 4h → retenta busca (Google pode demorar >15 min para processar).

### Estratégia de transcrição (prioridade)

1. **Doc Gemini nativo do Meet** — exportado como texto plano. Seção `📝 Observações` = summary. Seção `📖 Transcrição` = transcript raw (só aparece se o usuário habilitou transcrição no Meet).  
2. **Fallback: transcritor externo** — se não veio transcrição nativa, envia MP4 via `POST /transcriptions/video`. `MeetingTranscriptionPollerService` faz polling a cada 5 min até `status=done`.

### Serviços criados/reescritos
- `MeetingFilesFinderService` — pesquisa Drive (listagem recente + busca por título), exporta Google Doc como texto, baixa MP4
- `TranscriptorService` — client do `transcritor.wbdigitalsolutions.com` (submit video, poll status, get result)
- `MeetingRecordingDetectorService` — reescrito com 3-pass strategy
- `MeetingTranscriptionPollerService` — reescrito para usar `TranscriptorService`

### Entregáveis Fase 6 ✅
- [x] `MeetingFilesFinderService` + `TranscriptorService`
- [x] `MeetingRecordingDetectorService` — 3-pass strategy
- [x] `MeetingTranscriptionPollerService` — polling correto
- [x] tsc sem erros, 287 testes passando
- [x] Commit + push GitHub

---

## FASE 7 — Tarefas (Scrum Board por Cliente)

### Visão geral

Domínio `tasks`. Cada cliente tem seu próprio board Scrum. Tarefas avançam de `backlog` → `todo` → `in_progress` → `review` → `done`. Existe uma área separada de **ideias** (não poluem o backlog).

### Conceitos-chave

| Conceito | Detalhe |
|----------|---------|
| Sprint | Por cliente. Nome + data início/fim. Tarefas associadas ao sprint |
| ICE Score | `impact × confidence / effort`. Quanto maior, maior prioridade |
| Progresso | Calculado automaticamente: % de subtarefas/checklist concluídos |
| Ideias | Status `idea_could` ("poderíamos") e `idea_should` ("deveríamos") — visíveis em área separada, fora do backlog |
| Recorrência | `daily | weekly | monthly | custom` — cria automaticamente na data certa |
| Template | Conjunto de tarefas salvo como template; aplicável a qualquer cliente |

### Modelo Prisma (additions)

```prisma
enum TaskStatus {
  idea_could      // "poderíamos fazer" — ideia especulativa
  idea_should     // "deveríamos fazer" — faz sentido mas ainda não é hora
  backlog         // pronta para fazer (slot de entrada do Scrum)
  todo            // comprometida no sprint
  in_progress
  review
  done
  cancelled
}

enum RecurrenceType {
  none
  daily
  weekly
  monthly
  custom
}

model Sprint {
  id         String   @id @default(uuid())
  customerId String
  name       String
  startAt    DateTime
  endAt      DateTime
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  customer Customer @relation(fields: [customerId], references: [id])
  tasks    Task[]

  @@index([customerId])
  @@map("sprints")
}

model Task {
  id               String         @id @default(uuid())
  customerId       String
  sprintId         String?
  parentTaskId     String?        // subtarefa: aponta para task pai
  title            String
  description      String?        // texto rico (markdown)
  status           TaskStatus     @default(backlog)
  ownerUserId      String         // criador / responsável principal
  assigneeUserId   String?        // usuário designado para executar
  startAt          DateTime?
  endAt            DateTime?
  estimatedHours   Float?
  trackedSeconds   Int            @default(0)
  impact           Int?           // 1–10
  confidence       Int?           // 1–10
  effort           Int?           // 1–10 (maior = mais esforço = menor score)
  // iceScore = impact * confidence / effort  (calculado no presenter/frontend)
  recurrenceType   RecurrenceType @default(none)
  recurrenceRule   Json?          // ex: { "daysOfWeek": [1,3,5] }
  progress         Int            @default(0)  // 0–100, recalculado ao salvar
  boardPosition    Int            @default(0)  // ordem no kanban por status
  createdAt        DateTime       @default(now())
  updatedAt        DateTime       @updatedAt
  deletedAt        DateTime?

  customer    Customer        @relation(fields: [customerId], references: [id])
  sprint      Sprint?         @relation(fields: [sprintId], references: [id])
  parent      Task?           @relation("TaskSubtasks", fields: [parentTaskId], references: [id])
  subtasks    Task[]          @relation("TaskSubtasks")
  checklist   ChecklistItem[]
  tags        TaskTagLink[]
  comments    TaskComment[]
  activityLog TaskActivityLog[]

  @@index([customerId])
  @@index([sprintId])
  @@index([assigneeUserId])
  @@map("tasks")
}

model ChecklistItem {
  id        String   @id @default(uuid())
  taskId    String
  text      String
  isDone    Boolean  @default(false)
  position  Int      @default(0)
  createdAt DateTime @default(now())

  task Task @relation(fields: [taskId], references: [id])

  @@index([taskId])
  @@map("checklist_items")
}

model TaskTag {
  id         String   @id @default(uuid())
  customerId String?  // null = tag global; preenchido = tag do cliente
  name       String
  color      String   @default("#3B82F6")
  createdAt  DateTime @default(now())

  links TaskTagLink[]

  @@map("task_tags")
}

model TaskTagLink {
  taskId String
  tagId  String

  task Task    @relation(fields: [taskId], references: [id])
  tag  TaskTag @relation(fields: [tagId], references: [id])

  @@id([taskId, tagId])
  @@map("task_tag_links")
}

model TaskComment {
  id         String    @id @default(uuid())
  taskId     String
  userId     String
  content    String?   // null se só áudio
  audioUrl   String?   // URL Drive/S3
  isResolved Boolean   @default(false)
  parentId   String?   // resposta a outro comentário
  createdAt  DateTime  @default(now())
  updatedAt  DateTime  @updatedAt
  deletedAt  DateTime?

  task        Task              @relation(fields: [taskId], references: [id])
  parent      TaskComment?      @relation("CommentReplies", fields: [parentId], references: [id])
  replies     TaskComment[]     @relation("CommentReplies")
  attachments CommentAttachment[]
  reactions   CommentReaction[]
  annotations ImageAnnotation[]

  @@index([taskId])
  @@map("task_comments")
}

model CommentAttachment {
  id        String   @id @default(uuid())
  commentId String
  url       String
  mimeType  String   // image/*, video/*, application/pdf, etc.
  fileName  String
  sizeBytes Int?
  createdAt DateTime @default(now())

  comment TaskComment @relation(fields: [commentId], references: [id])

  @@map("comment_attachments")
}

model ImageAnnotation {
  id          String @id @default(uuid())
  commentId   String
  attachmentId String // CommentAttachment.id — a imagem anotada
  x           Float  // 0–100 (percentual da largura)
  y           Float  // 0–100 (percentual da altura)
  number      Int    // marcador visual exibido na imagem
  text        String // descrição do que deve ser feito nessa área
  mentionedUserId String? // sinalizar para outro usuário

  comment TaskComment @relation(fields: [commentId], references: [id])

  @@map("image_annotations")
}

model CommentReaction {
  commentId String
  userId    String
  emoji     String
  createdAt DateTime @default(now())

  comment TaskComment @relation(fields: [commentId], references: [id])

  @@id([commentId, userId, emoji])
  @@map("comment_reactions")
}

model TaskActivityLog {
  id        String   @id @default(uuid())
  taskId    String
  userId    String
  action    String   // "created" | "status_changed" | "assigned" | "comment_added" | ...
  fromValue String?
  toValue   String?
  createdAt DateTime @default(now())

  task Task @relation(fields: [taskId], references: [id])

  @@index([taskId])
  @@map("task_activity_logs")
}

model TaskTemplate {
  id          String   @id @default(uuid())
  name        String
  description String?
  tasks       Json     // array de definições de tarefas serializadas
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@map("task_templates")
}
```

### Entidades do Domínio

- `Sprint` (aggregate root)
- `Task` (aggregate root) — auto-referência para subtarefas
- `ChecklistItem` (entity)
- `TaskTag` (aggregate root)
- `TaskComment` (entity)
- `CommentAttachment` (entity)
- `ImageAnnotation` (entity)
- `CommentReaction` (value object)
- `TaskActivityLog` (entity)
- `TaskTemplate` (aggregate root)

### VOs

- `TaskStatus` — `idea_could | idea_should | backlog | todo | in_progress | review | done | cancelled`
- `RecurrenceType` — `none | daily | weekly | monthly | custom`

### Casos de Uso

**Sprints:**
- `CreateSprintUseCase`
- `UpdateSprintUseCase`
- `DeleteSprintUseCase`
- `ListSprintsUseCase`

**Tasks:**
- `CreateTaskUseCase` — cria tarefa + log "created"
- `UpdateTaskUseCase` — atualiza campos + log de mudanças
- `MoveTaskStatusUseCase` — avança/retrocede status + recalcula progresso + log
- `DeleteTaskUseCase` (soft)
- `GetTaskUseCase`
- `ListCustomerTasksUseCase` — paginado, filtros (status, sprint, assignee, tag, tipo ideia/backlog)
- `AssignTaskUseCase`
- `AddSubtaskUseCase`
- `AddChecklistItemUseCase`
- `ToggleChecklistItemUseCase` — marca done/undone + recalcula progresso da task pai
- `ReorderTasksUseCase` — reordena kanban (atualiza `boardPosition`)
- `StartTimeTrackUseCase` / `StopTimeTrackUseCase`

**Tags:**
- `CreateTagUseCase`
- `AttachTagUseCase` / `DetachTagUseCase`
- `ListTagsUseCase`

**Comentários:**
- `AddCommentUseCase` — texto, áudio, anexos
- `ReplyToCommentUseCase`
- `ReactToCommentUseCase`
- `ResolveCommentUseCase`
- `AddImageAnnotationUseCase`
- `DeleteCommentUseCase` (soft)

**Templates:**
- `SaveTaskTemplateUseCase` — seleciona tarefas existentes → serializa
- `ApplyTemplateToCustomerUseCase` — instancia todas as tarefas do template para um cliente
- `ListTemplatesUseCase`
- `DeleteTemplateUseCase`

**Recorrência (cron diário):**
- `ProcessRecurringTasksUseCase` — cria cópia das tarefas recorrentes na data correta

### Views Frontend

| View | Rota |
|------|------|
| Lista (padrão) | `/customers/[id]/tasks` |
| Kanban | `/customers/[id]/tasks?view=kanban` |
| Calendário | `/customers/[id]/tasks?view=calendar` |
| Gantt | `/customers/[id]/tasks?view=gantt` |
| Ideias | `/customers/[id]/tasks/ideas` |
| Sprints | `/customers/[id]/tasks/sprints` |
| Templates | `/tasks/templates` (admin) |
| Detalhe da tarefa | `/customers/[id]/tasks/[taskId]` |

### Endpoints

```
# Sprints
POST   /api/v1/customers/:id/sprints
GET    /api/v1/customers/:id/sprints
PATCH  /api/v1/customers/:id/sprints/:sprintId
DELETE /api/v1/customers/:id/sprints/:sprintId

# Tasks
POST   /api/v1/customers/:id/tasks
GET    /api/v1/customers/:id/tasks          # ?status=&sprintId=&assignee=&view=list|kanban|calendar|gantt&ideas=true
GET    /api/v1/customers/:id/tasks/:taskId
PATCH  /api/v1/customers/:id/tasks/:taskId
DELETE /api/v1/customers/:id/tasks/:taskId
PATCH  /api/v1/customers/:id/tasks/:taskId/status
PATCH  /api/v1/customers/:id/tasks/reorder

# Subtasks
POST   /api/v1/customers/:id/tasks/:taskId/subtasks

# Checklist
POST   /api/v1/customers/:id/tasks/:taskId/checklist
PATCH  /api/v1/customers/:id/tasks/:taskId/checklist/:itemId
DELETE /api/v1/customers/:id/tasks/:taskId/checklist/:itemId

# Comments
POST   /api/v1/customers/:id/tasks/:taskId/comments
GET    /api/v1/customers/:id/tasks/:taskId/comments
POST   /api/v1/customers/:id/tasks/:taskId/comments/:commentId/replies
POST   /api/v1/customers/:id/tasks/:taskId/comments/:commentId/reactions
PATCH  /api/v1/customers/:id/tasks/:taskId/comments/:commentId/resolve
DELETE /api/v1/customers/:id/tasks/:taskId/comments/:commentId

# Tags
POST   /api/v1/task-tags
GET    /api/v1/task-tags               # ?customerId=
POST   /api/v1/customers/:id/tasks/:taskId/tags/:tagId
DELETE /api/v1/customers/:id/tasks/:taskId/tags/:tagId

# Templates
POST   /api/v1/task-templates
GET    /api/v1/task-templates
POST   /api/v1/task-templates/:templateId/apply/:customerId
DELETE /api/v1/task-templates/:templateId
```

### SSE — Notificações em Tempo Real

Fase 7 inclui o sino de notificações no header. Eventos publicados via EventBus interno e entregues ao frontend via SSE (`GET /api/v1/events`):

- `task.assigned` → notifica o `assigneeUserId`
- `task.status_changed` → notifica owner e assignee
- `comment.added` → notifica owner e assignee da task
- `comment.mention` → notifica usuário mencionado em anotação de imagem

### Entregáveis Fase 7

**Backend — concluído ✅**
- [x] Migration: `sprints`, `tasks`, `checklist_items`, `task_tags`, `task_tag_links`, `task_activity_logs`
- [x] Entidades: `Task`, `Sprint`, `ChecklistItem`, `TaskTag`, `TaskActivityLog` com TDD (unit tests)
- [x] Use-cases: CreateTask, UpdateTask, DeleteTask, GetTask, ListCustomerTasks, ListAllTasks, MoveTaskStatus
- [x] Use-cases: AddChecklistItem, ToggleChecklistItem, DeleteChecklistItem
- [x] Use-cases: CreateSprint, UpdateSprint, DeleteSprint, ListSprints
- [x] Use-cases: CreateTaskTag, ListTaskTags, AttachTaskTag, DetachTaskTag
- [x] Use-cases: GetTaskActivityLog
- [x] E2E: CRUD tasks, sprints, checklist, tags (21 testes passando)
- [x] `GET /api/v1/tasks` — listagem global com filtros
- [x] SSE `GET /api/v1/events` + NotificationsService + TaskNotificationsSubscriber
- [x] `tsc --noEmit` sem erros

**Frontend — concluído ✅**
- [x] `/tasks` — página global com tabela, filtro por status, paginação
- [x] `/customers/[id]/tasks` — lista + kanban (drag & drop com @dnd-kit) + área de ideias
- [x] `/customers/[id]/tasks/[taskId]` — detalhe: checklist, tags, ICE score, log de atividade, edição, status changer
- [x] Server actions: create/update/delete task, checklist, sprint, tag attach/detach, moveStatus
- [x] Sino de notificações no header com SSE via `/api/events` proxy
- [x] Botão "Tarefas" na página do cliente
- [x] Item "Tarefas" no sidebar

**Concluído na iteração seguinte ✅**
- [x] Migration: `task_comments`, `comment_attachments`, `image_annotations`, `comment_reactions`
- [x] Comentários: texto, reações emoji, respostas em cadeia, marcar como resolvido, soft-delete
- [x] Subtarefas: `AddSubtaskUseCase` + `SubtasksSection` frontend com barra de progresso
- [x] Recorrência: `ProcessRecurringTasksUseCase` + `RecurringTasksScheduler` (cron diário)
- [x] `/tasks` global: coluna cliente, groupBy, filtros, botão "Nova tarefa" com busca de cliente
- [x] Campos `startAt`, `endAt`, `estimatedHours` nos formulários de criação (datetime-local)

**Concluído na sessão 9 ✅**
- [x] Migration: `time_entries`; use-cases: `StartTimeTracking`, `StopTimeTracking`, `GetTaskTimeEntries` (TDD)
- [x] `ReorderTasksUseCase` — persiste `boardPosition` após drag no kanban (TDD)
- [x] Entidade `TaskTemplate` + migration `task_templates`
- [x] Use-cases: `CreateTaskTemplate`, `ListTaskTemplates`, `ApplyTaskTemplate`, `CreateTemplateFromTasks` (TDD, 13 testes)
- [x] `TemplatesController` com Swagger (`POST /task-templates`, `GET /task-templates`, `POST /task-templates/:id/apply/:customerId`, `POST /task-templates/from-tasks`, `DELETE /task-templates/:id`)
- [x] `AddCommentAttachmentUseCase` — upload via `IStorageAdapter`, salva `CommentAttachment` (TDD)
- [x] `UploadCommentAudioUseCase` — valida MIME audio, retorna `audioUrl` (TDD)
- [x] `AddImageAnnotationUseCase` — auto-incrementa número de anotação por comentário (TDD)
- [x] View Calendário (`?view=calendar`) — grid mensal com tarefas nos dias previstos
- [x] View Gantt (`?view=gantt`) — SVG puro com barras e tooltips (sem dependência recharts)
- [x] `TimeTracker` no detalhe da tarefa com timer ao vivo

**Concluído na sessão 10 ✅**
- [x] `/task-templates` — página global: listar templates, criar do zero (rows de tarefas editáveis com horas/impacto), excluir, aplicar a qualquer cliente via modal
- [x] `TemplatesSection` na página de tarefas do cliente: aplica template com um clique; cria template a partir de tarefas selecionadas via checkboxes
- [x] Link "Templates" no sidebar
- [x] `AddCommentForm` reescrita: botão 📎 abre file picker, arquivo é enviado junto ao comentário via `addCommentAttachment`
- [x] Gravador de áudio ao vivo com `MediaRecorder` + timer; ao parar, cria comentário com `audioUrl` via `createAudioComment`
- [x] `ImageAnnotationViewer`: imagem com pins numerados sobrepostos em `(x%, y%)`; modo "Anotar" com cursor crosshair — clique na imagem marca ponto, campo de texto salva a anotação
- [x] Server actions: `addCommentAttachment`, `createAudioComment`, `addImageAnnotation`, `listTemplates`, `createTemplate`, `createTemplateFromTasks`, `applyTemplate`, `deleteTemplate`

**Fase 7 — 100% concluída ✅**

---

## FASE 8 — Atividades (Log de Comunicações)

### Visão geral

Domínio `activities`. Registra todas as comunicações com o cliente: emails, WhatsApp, ligações telefônicas, notas manuais. Fase 8 implementa o CRUD manual; as **automações** (GoTo VoIP, Gmail, Evolution WhatsApp) serão integradas posteriormente com detalhes fornecidos na hora da implementação.

### Tipos de atividade

| Tipo | Manual | Automático |
|------|--------|-----------|
| `email` | Escrever/enviar pelo sistema | Gmail API — identifica por email do contato |
| `whatsapp` | Registrar manualmente | Evolution API — cada mensagem cria uma atividade |
| `phone_call` | Registrar manualmente | GoTo VoIP — identifica por número, grava áudio, transcreve |
| `note` | Anotação livre | — |
| `meeting` | Auto-criado pelo domínio `meetings` | — |

### Ciclo de status

`scheduled → open → done | cancelled | skipped`

### Modelo Prisma (additions)

```prisma
enum ActivityType {
  email
  whatsapp
  phone_call
  note
  meeting
}

enum ActivityStatus {
  scheduled
  open
  done
  cancelled
  skipped
}

model Activity {
  id               String         @id @default(uuid())
  customerId       String
  contactId        String?
  type             ActivityType
  status           ActivityStatus @default(open)
  subject          String?        // assunto do email, título da nota
  description      String?        // corpo da mensagem / transcrição
  scheduledAt      DateTime?
  occurredAt       DateTime?
  durationSecs     Int?           // duração da ligação
  audioUrl         String?        // URL do áudio (GoTo → S3)
  transcriptText   String?        // transcrição do áudio
  externalId       String?        // GoTo callId | Gmail messageId | Evolution messageId
  direction        String?        // "inbound" | "outbound"
  createdByUserId  String
  assignedToUserId String?
  createdAt        DateTime       @default(now())
  updatedAt        DateTime       @updatedAt

  customer    Customer           @relation(fields: [customerId], references: [id])
  contact     Contact?           @relation(fields: [contactId], references: [id])
  attachments ActivityAttachment[]

  @@index([customerId])
  @@index([externalId])
  @@map("activities")
}

model ActivityAttachment {
  id         String   @id @default(uuid())
  activityId String
  url        String
  mimeType   String
  fileName   String
  sizeBytes  Int?
  createdAt  DateTime @default(now())

  activity Activity @relation(fields: [activityId], references: [id])

  @@map("activity_attachments")
}
```

### Casos de Uso

- `CreateActivityUseCase`
- `UpdateActivityUseCase` (status, descrição)
- `GetActivityUseCase`
- `ListCustomerActivitiesUseCase` — paginado, filtros (type, status, dateRange)
- `DeleteActivityUseCase` (soft)
- `AddActivityAttachmentUseCase`

**Automações (a implementar na fase — detalhes fornecidos na hora):**
- `CreateActivityFromGoToCallUseCase` — webhook GoTo → cria activity phone_call + áudio S3 + transcrição
- `CreateActivityFromGmailUseCase` — Gmail polling → identifica email por contato → cria activity email
- `CreateActivityFromWhatsAppUseCase` — Evolution webhook → cria activity whatsapp
- `SendEmailUseCase` — compõe e envia email via Gmail API
- `SendWhatsAppUseCase` — envia mensagem via Evolution API

### Endpoints

```
GET    /api/v1/customers/:id/activities        # ?type=&status=&from=&to=
POST   /api/v1/customers/:id/activities
GET    /api/v1/customers/:id/activities/:actId
PATCH  /api/v1/customers/:id/activities/:actId
DELETE /api/v1/customers/:id/activities/:actId

# Email (via Gmail API)
POST   /api/v1/customers/:id/activities/:actId/send-email

# Webhooks (integrações externas)
POST   /api/v1/webhooks/goto          # GoTo VoIP
POST   /api/v1/webhooks/gmail         # Gmail push notification
POST   /api/v1/webhooks/whatsapp      # Evolution API
```

### EventBus / Pub-Sub

- Mensagens WhatsApp e emails do cliente publicam eventos internos
- SSE entrega notificações ao frontend em tempo real (sino no header)
- Eventos: `activity.new_message` → notifica usuário responsável pelo cliente

### Entregáveis Fase 8

- [x] Migrations (`activities`, `activity_attachments`)
- [x] Domínio `activities` com TDD (12 testes: Create, Update, Get, List, Delete)
- [x] CRUD manual de atividades no frontend com filtros e timeline por cliente
- [x] E2E tests (15 testes: POST, GET list, GET single, PATCH, DELETE)
- [x] `POST /google/check-recordings` e `/google/check-transcriptions` (cron HTTP externo via CRON_SECRET)
- [x] Rota de audit log renomeada de `:id/activities` → `:id/audit` (evita conflito com ActivitiesController)
- [x] `tsc --noEmit` sem erros
- [x] Commit + push GitHub
- [x] Clicar no número do contato → link `tel:` abre GoTo app (PhoneLink component) — ver Fase 8.1
- [x] GoTo webhook → Activity automática + gravação + transcrição — ver Fase 8.1
- [x] WhatsApp via Evolution → Activity + WhatsAppMessage + transcrição de áudios — ver Fase 8.2
- [x] Gmail poll + envio → Activity automática + compose modal — ver Fase 8.3
- [ ] EventBus + SSE para notificações de mensagens recebidas (pós Fase 8.3)

---

## FASE 8.1 — GoTo Connect (VoIP)

### Visão geral

Integração com GoTo Connect para registrar automaticamente ligações como Activities. O fluxo é unidirecional: usuário discam pelo app GoTo (link `tel:` no frontend), GoTo envia webhook ao CRM quando a chamada termina, CRM busca o relatório completo, associa ao cliente/contato e cria a Activity.

### Fluxo

1. **Click-to-call**: `<a href="tel:+55...">` no frontend abre o app GoTo no SO (sem integração de API para discar)
2. **Chamada**: GoTo gerencia inteiramente (VOIP, gravação)
3. **Webhook**: GoTo envia `REPORT_SUMMARY` para `POST /api/v1/goto/webhook?secret=GOTO_WEBHOOK_SECRET`
4. **Processamento**: valida secret → busca relatório completo na GoTo API → normaliza número → match para Contact/Customer → cria Activity
5. **Gravação** (background, se `outcome=answered`): baixa MP3 via GoTo API → sobe para Google Drive (pasta do cliente) → atualiza Activity
6. **Transcrição** (cron 10min): submete MP3 para Transcriptor → quando done, salva JSON de segmentos em `gotoTranscriptText`

### Autenticação GoTo

OAuth2 com access_token + refresh_token armazenados no banco (`GoToToken` model). Auto-refresh quando expira (buffer 60s). Tokens iniciais são semeados via variáveis de ambiente na primeira inicialização.

### Prisma additions

```prisma
model GoToToken {
  id           String   @id @default("singleton")
  accessToken  String   @map("access_token")
  refreshToken String   @map("refresh_token")
  expiresAt    DateTime @map("expires_at")
  updatedAt    DateTime @updatedAt @map("updated_at")
  @@map("goto_tokens")
}
```

Campos adicionados ao model `Activity`:
```
gotoCallId              String?   @unique @map("goto_call_id")
gotoCallOutcome         String?   @map("goto_call_outcome")   // answered|voicemail|no_answer|busy
gotoDuration            Int?      @map("goto_duration")       // segundos
gotoRecordingDriveId    String?   @map("goto_recording_drive_id")
gotoRecordingUrl        String?   @map("goto_recording_url")
gotoRecordingUrl2       String?   @map("goto_recording_url2")
gotoTranscriptionJobId  String?   @map("goto_transcription_job_id")
gotoTranscriptText      String?   @map("goto_transcript_text")
callContactType         String?   @map("call_contact_type")   // decisor|gatekeeper
```

### Serviços

- `GoToTokenService` — guarda/renova access_token; singleton no banco
- `GoToApiClient` — `getCallReport(conversationSpaceId)`, `downloadRecording(recordingId)` 
- `GoToWebhookService` — processa payload do webhook, normaliza telefone, match → Contact/Customer, cria Activity
- `GoToRecordingService` — cron: baixa MP3 de Activities sem recording, sobe para Drive
- `GoToTranscriptionService` — cron: submete MP3 ao Transcriptor, faz poll até done

### Endpoints

```
POST /api/v1/goto/webhook?secret=          → recebe REPORT_SUMMARY do GoTo (sem auth JWT)
POST /api/v1/goto/check-recordings?secret= → cron: baixa gravações pendentes
POST /api/v1/goto/check-transcriptions?secret= → cron: poll transcrições pendentes
```

### Phone matching

Normaliza removendo não-dígitos. Testa com/sem código país (55) e com/sem DDD. Match priority: `Contact.phone` → `Customer.phone`. Ignora se `deletedAt != null`.

### Entregáveis Fase 8.1

- [x] Migration: `goto_tokens` + campos GoTo no `activities`
- [x] `GoToTokenService` + auto-refresh
- [x] `GoToApiClient` (relatório + download de gravação)
- [x] `GoToWebhookService` + phone matching + Activity creation
- [x] `GoToRecordingService` + `GoToTranscriptionService` (crons)
- [x] `GoToController` (webhook + 2 crons)
- [x] Env vars: `GOTO_CLIENT_ID`, `GOTO_CLIENT_SECRET`, `GOTO_ACCOUNT_KEY`, `GOTO_WEBHOOK_SECRET`, `GOTO_DEFAULT_OWNER_ID`, `GOTO_ACCESS_TOKEN`, `GOTO_REFRESH_TOKEN`, `GOTO_TOKEN_EXPIRES_AT`
- [x] `tsc --noEmit` sem erros
- [x] Commit + push GitHub
- [ ] `PhoneLink` component no frontend (link `tel:` com ícone)
- [ ] Player de áudio inline na Activity (lê Drive URL)
- [ ] Transcrição expandível com timestamps

---

## FASE 8.2 — WhatsApp via Evolution API

### Visão geral

Integração bidirecional com WhatsApp via Evolution API. Mensagens recebidas e enviadas geram Activities com sessão de 2h (agrupamento). Áudios e vídeos são transcritos automaticamente.

### Fluxo de recebimento

1. Mensagem chega → Evolution → webhook `POST /api/v1/evolution/webhook` (header `x-webhook-secret`)
2. Filtra: apenas `messages.upsert`, ignora grupos (`@g.us`)
3. Normaliza JID → telefone → match Contact/Customer
4. Sessão 2h: busca Activity do mesmo número nas últimas 2h; se existe, adiciona linha à description; se não, cria nova Activity
5. Cria `WhatsAppMessage` (idempotência por `messageId`)
6. Background: baixa mídia → sobe para Drive → submete áudio/vídeo ao Transcriptor

### Fluxo de envio

1. Server action chama Evolution: `POST {EVOLUTION_API_URL}/message/sendText/{EVOLUTION_INSTANCE}`
2. Evolution entrega no WhatsApp e devolve webhook com `fromMe: true`
3. Webhook processa igual ao recebimento (sender = "Você")

### Prisma additions

```prisma
model WhatsAppMessage {
  id                      String    @id @default(uuid())
  activityId              String    @map("activity_id")
  messageId               String    @unique @map("message_id")
  remoteJid               String    @map("remote_jid")
  fromMe                  Boolean   @map("from_me")
  senderName              String?   @map("sender_name")
  text                    String?
  messageType             String    @map("message_type")
  mediaLabel              String?   @map("media_label")
  mediaDriveId            String?   @map("media_drive_id")
  mediaUrl                String?   @map("media_url")
  mediaTranscriptionJobId String?   @map("media_transcription_job_id")
  mediaTranscriptText     String?   @map("media_transcript_text")
  timestamp               DateTime

  activity Activity @relation(fields: [activityId], references: [id])

  @@index([activityId])
  @@index([remoteJid])
  @@map("whatsapp_messages")
}
```

### Endpoints

```
POST /api/v1/evolution/webhook                     → recebe mensagens (sem auth JWT)
POST /api/v1/evolution/check-transcriptions?secret= → cron: poll transcrições de áudios
POST /api/v1/customers/:id/whatsapp/send           → envia mensagem (admin/employee)
```

### Entregáveis Fase 8.2

- [x] Migration: `whatsapp_messages`
- [x] `EvolutionApiClient` (sendText + getBase64FromMediaMessage)
- [x] `WhatsAppWebhookService` (parse + match + session grouping + Activity creation)
- [x] `WhatsAppMediaService` (download + Drive upload + Transcriptor submit + poll cron)
- [x] `EvolutionController` (webhook + cron + send)
- [x] Env vars: `EVOLUTION_API_URL`, `EVOLUTION_API_KEY`, `EVOLUTION_INSTANCE`, `EVOLUTION_WEBHOOK_SECRET`, `EVOLUTION_OWNER_ID`
- [x] `tsc --noEmit` sem erros
- [x] Commit + push GitHub
- [ ] Frontend: botão "Enviar WhatsApp" na página do cliente/contato
- [ ] Frontend: exibe `WhatsAppMessage` cards dentro da Activity (chat bubble style)
- [ ] Frontend: transcrição expandível em áudios

---

## FASE 8.3 — Gmail (envio + recebimento)

### Visão geral

Integração Gmail usando o token OAuth2 único da empresa (GoogleToken singleton). Poll a cada 5min para emails recebidos. Envio com rich text e anexos. Threads completas. Reply mantém threadId.

### Fluxo de recebimento

1. Cron 5min → `GET /api/v1/google/gmail-poll` (header `x-api-key: INTERNAL_API_KEY`)
2. `gmail.users.history.list(gmailHistoryId, labelId=INBOX)` → mensagens novas
3. `gmail.users.messages.get(id, format=full)` → extrai From, Subject, Body
4. Match `From` email → Contact/Customer (idempotência via `emailMessageId @unique`)
5. Cria Activity `type=email` com campos email; emite SSE `EMAIL_RECEIVED`
6. Atualiza `gmailHistoryId` no banco para próximo poll

### Fluxo de envio

1. Server action valida payload com Zod
2. `buildMimeMessage()`: text/html simples ou multipart/mixed com anexos
3. Gmail API: `users.messages.send({ raw, threadId? })`
4. Cria Activity `type=email` (emailReplied=false)
5. Se reply: marca todos os emails da thread como `emailReplied=true`

### Prisma additions

Campos adicionados ao model `Activity`:
```
emailMessageId   String?  @unique @map("email_message_id")
emailThreadId    String?  @map("email_thread_id")
emailSubject     String?  @map("email_subject")
emailFromAddress String?  @map("email_from_address")
emailFromName    String?  @map("email_from_name")
emailReplied     Boolean  @default(false) @map("email_replied")
```

Campo adicionado ao model `GoogleToken`:
```
gmailHistoryId   String?  @map("gmail_history_id")
```

### Endpoints

```
GET  /api/v1/google/gmail-poll    → cron poll (x-api-key header)
POST /api/v1/customers/:id/email  → envia email (admin/employee)
```

### Entregáveis Fase 8.3

- [x] Migration: campos email no `activities` (emailMessageId, emailThreadId, emailReplied, etc.)
- [x] `GmailService` (pollInbox via history API + send + buildMimeMessage com anexos)
- [x] `GmailPollerService` (match sender email → Contact/Customer, cria Activity)
- [x] `GmailController` (GET /google/gmail-poll com x-api-key, POST /customers/:id/email)
- [x] Reply automático marca emailReplied=true em toda a thread
- [x] Env vars: `INTERNAL_API_KEY`
- [x] `tsc --noEmit` sem erros
- [x] Commit + push GitHub
- [ ] Frontend: `EmailComposeModal` (to, cc, rich text, anexos, Ctrl+Enter)
- [ ] Frontend: badge "Aguardando resposta" em Activities de email recebido sem reply
- [ ] Frontend: botão "Responder" abre modal pré-preenchido com threadId

---

## FASE 9 — Criativos

### Visão geral

Domínio `creatives`. Cada cliente tem sua biblioteca de criativos (imagens, vídeos, carrosséis) armazenados na pasta do cliente no Google Drive. Foco em registrar todas as informações necessárias para uso em tráfego pago e medir performance ao longo do tempo.

### Estratégias de teste

| Estratégia | Descrição |
|------------|-----------|
| **A — Exploração** | Testar ~10 criativos com orçamento pequeno por 5 dias. Identificar o(s) campeão(ões) |
| **B — Lapidação** | Criar variações do campeão da exploração e testar para refinar |

### Modelo Prisma (additions)

```prisma
enum CreativeType {
  image
  video
  carousel
}

enum CreativeStatus {
  draft
  active
  paused
  archived
}

enum ExplorationPhase {
  exploration   // A — teste inicial com ~10 criativos
  refinement    // B — variações do campeão
}

model Creative {
  id                String         @id @default(uuid())
  customerId        String
  type              CreativeType
  status            CreativeStatus @default(draft)
  title             String
  textInCreative    String?        // texto sobreposto no criativo
  captionText       String?        // legenda para publicação
  designDescription String?        // briefing para o designer / descrição do vídeo
  campaignObjective String?        // ex: "conversão", "reconhecimento de marca"
  driveFileId       String?        // arquivo no Drive (imagem ou vídeo)
  driveUrl          String?
  thumbnailUrl      String?        // miniatura para listagem
  explorationBatchId String?       // agrupa criativos do mesmo lote de exploração
  createdByUserId   String
  createdAt         DateTime       @default(now())
  updatedAt         DateTime       @updatedAt
  deletedAt         DateTime?

  customer     Customer              @relation(fields: [customerId], references: [id])
  performance  CreativePerformance[]
  campaigns    CampaignCreativeLink[]

  @@index([customerId])
  @@map("creatives")
}

model CreativePerformance {
  id          String           @id @default(uuid())
  creativeId  String
  date        DateTime         @db.Date
  phase       ExplorationPhase
  impressions Int              @default(0)
  clicks      Int              @default(0)
  cpc         Float?           // custo por clique
  cpm         Float?           // custo por mil impressões
  spent       Float?
  conversions Int              @default(0)
  reach       Int?

  creative Creative @relation(fields: [creativeId], references: [id])

  @@unique([creativeId, date])
  @@index([creativeId])
  @@map("creative_performances")
}
```

### Casos de Uso

- `UploadCreativeUseCase` — upload Drive + salva metadados
- `UpdateCreativeUseCase`
- `DeleteCreativeUseCase` (soft + remove Drive)
- `ListCustomerCreativesUseCase` — filtros (type, status, phase)
- `GetCreativeUseCase`
- `RecordCreativePerformanceUseCase` — registra métricas diárias
- `GetCreativePerformanceSummaryUseCase` — agrega performance por criativo/lote

### Endpoints

```
POST   /api/v1/customers/:id/creatives
GET    /api/v1/customers/:id/creatives     # ?type=&status=&batchId=
GET    /api/v1/customers/:id/creatives/:creativeId
PATCH  /api/v1/customers/:id/creatives/:creativeId
DELETE /api/v1/customers/:id/creatives/:creativeId

POST   /api/v1/customers/:id/creatives/:creativeId/performance
GET    /api/v1/customers/:id/creatives/:creativeId/performance
```

### Entregáveis Fase 9

- [ ] Migrations (`creatives`, `creative_performances`)
- [ ] Domínio `creatives` com TDD
- [ ] Frontend: galeria de criativos por cliente com preview
- [ ] Upload drag-and-drop (imagem/vídeo) → Drive
- [ ] Registro de métricas de performance por criativo
- [ ] Visualização de lotes de exploração com comparativo de performance
- [ ] `tsc --noEmit` sem erros
- [ ] Commit + push GitHub

---

## FASE 11 — Tráfego Pago

> **Renumeração:** Era FASE 10. CRM passa a ser FASE 12.

### Visão Geral

Domínio `paid-traffic`. Gestão completa de campanhas de Meta Ads a partir do próprio sistema: criação de campanhas/ad sets/anúncios, seleção de criativos já cadastrados, publicação direta na Meta Marketing API, e sincronização automática diária de métricas por anúncio. Dashboard completo por cliente.

**Decisões arquiteturais desta fase:**
- Admin tem 1 Business Manager (BM) Meta e gerencia vários clientes, cada um com seu próprio Ad Account (`act_XXXXX`) dentro ou associado ao BM do admin
- Autenticação via **System User permanente** (token que não expira, criado no BM do admin) — ideal para automações server-side; armazenado criptografado no banco
- Hierarquia real Meta mapeada: `Campaign → AdSet → Ad → Creative`
- Fluxo de publicação em 2 etapas: `draft → pronto_para_publicar → (botão Publicar) → ativo no Meta`
- Métricas sincronizadas por **anúncio individualmente** (nível `ad`) via cron diário às 8h
- Abstração `IAdPlatformAdapter` garante extensibilidade para Google Ads, TikTok Ads etc. no futuro
- Pixel por cliente: armazenado no `MetaAdAccount` e usado nas campanhas de conversão

---

### FASE 11-A — Backend: Domínio, Entidades, Repositórios, Controller

**Commit:** `feat(paid-traffic): add domain entities, use-cases, repositories and controller`

#### Novos modelos Prisma

```prisma
// ─────────────────────────────────────────
// PAID TRAFFIC
// ─────────────────────────────────────────

// Config global do admin para a plataforma Meta
// Singleton — sempre 1 registro com id = "meta-config-singleton"
model MetaConfig {
  id              String   @id @default("meta-config-singleton")
  appId           String                    // Meta App ID
  appSecret       String                    // Meta App Secret (criptografado)
  systemUserToken String                    // System User permanent token (criptografado)
  bmId            String                    // Business Manager ID
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@map("meta_config")
}

// Config por cliente: qual ad account, página e pixel usam
model MetaAdAccount {
  id                 String   @id @default(uuid())
  customerId         String   @unique
  adAccountId        String                  // "act_XXXXX"
  pageId             String?                 // Facebook Page ID (obrigatório para criar ads)
  pixelId            String?                 // Meta Pixel ID (para campanhas de conversão)
  instagramActorId   String?                 // Instagram account ID (para placement IG)
  accountName        String?                 // nome legível do ad account
  isActive           Boolean  @default(true)
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt

  customer Customer @relation(fields: [customerId], references: [id])

  @@map("meta_ad_accounts")
}

enum CampaignObjective {
  CONVERSIONS          // campanha de conversão (requer pixel)
  LINK_CLICKS          // tráfego para URL
  REACH                // alcance máximo
  BRAND_AWARENESS      // reconhecimento de marca
  LEAD_GENERATION      // formulário de leads nativo Meta
  VIDEO_VIEWS          // visualizações de vídeo
  POST_ENGAGEMENT      // engajamento em post
}

enum CampaignPublishStatus {
  draft                // criado localmente, não enviado ao Meta
  ready_to_publish     // marcado como pronto, aguardando aprovação/publicação
  publishing           // em processo de envio para o Meta
  published            // ativo no Meta (metaCampaignId preenchido)
  publish_failed       // tentativa de publicação falhou (ver publishError)
}

enum CampaignStatus {
  active
  paused
  archived
}

// Campanha de tráfego pago
model Campaign {
  id              String                @id @default(uuid())
  customerId      String
  name            String
  objective       CampaignObjective
  status          CampaignStatus        @default(active)
  publishStatus   CampaignPublishStatus @default(draft)
  plannedBudget   Float?                // orçamento previsto (R$)
  dailyBudget     Float?                // orçamento diário (R$) — usado no Meta
  startAt         DateTime?
  endAt           DateTime?
  notes           String?
  metaCampaignId  String?               // preenchido após publicação no Meta
  publishError    String?               // mensagem de erro da última tentativa
  createdByUserId String
  createdAt       DateTime              @default(now())
  updatedAt       DateTime              @updatedAt

  customer     Customer      @relation(fields: [customerId], references: [id])
  adSets       AdSet[]
  leads        CrmLeadSnapshot[] // leads oriundos desta campanha (Fase 12)

  @@index([customerId])
  @@map("campaigns")
}

// Conjunto de anúncios (AdSet)
// Define orçamento, público-alvo, posicionamento e cronograma
model AdSet {
  id              String         @id @default(uuid())
  campaignId      String
  name            String
  status          CampaignStatus @default(active)
  publishStatus   CampaignPublishStatus @default(draft)
  dailyBudget     Float?         // orçamento diário deste adset (R$)
  totalBudget     Float?         // orçamento total (R$) — alternativa ao diário
  startAt         DateTime?
  endAt           DateTime?
  targeting       Json?          // JSON livre com parâmetros de targeting do Meta
                                 // Ex: {"age_min":25,"age_max":45,"interests":[{"id":"6003107902433","name":"Marketing"}]}
  optimizationGoal String?       // "CONVERSIONS" | "LINK_CLICKS" | "REACH" | etc.
  billingEvent    String?        // "IMPRESSIONS" | "LINK_CLICKS"
  metaAdSetId     String?        // preenchido após publicação no Meta
  publishError    String?
  createdAt       DateTime       @default(now())
  updatedAt       DateTime       @updatedAt

  campaign Campaign @relation(fields: [campaignId], references: [id], onDelete: Cascade)
  ads      Ad[]

  @@index([campaignId])
  @@map("ad_sets")
}

enum AdCallToAction {
  LEARN_MORE
  SHOP_NOW
  SIGN_UP
  CONTACT_US
  BOOK_NOW
  DOWNLOAD
  GET_QUOTE
  SUBSCRIBE
  WATCH_MORE
  NO_BUTTON
}

// Anúncio individual — vinculado a um Creative do sistema
model Ad {
  id              String         @id @default(uuid())
  adSetId         String
  creativeId      String?        // Creative do sistema (imagem/vídeo já no Drive)
  name            String
  status          CampaignStatus @default(active)
  publishStatus   CampaignPublishStatus @default(draft)
  primaryText     String?        // texto principal do anúncio (até ~500 chars)
  headline        String?        // título do anúncio (até ~40 chars)
  description     String?        // descrição (até ~30 chars)
  callToAction    AdCallToAction @default(LEARN_MORE)
  destinationUrl  String?        // URL de destino (landing page)
  metaAdId        String?        // preenchido após publicação no Meta
  metaCreativeId  String?        // ID do AdCreative no Meta (gerado na publicação)
  publishError    String?
  createdAt       DateTime       @default(now())
  updatedAt       DateTime       @updatedAt

  adSet        AdSet          @relation(fields: [adSetId], references: [id], onDelete: Cascade)
  creative     Creative?      @relation(fields: [creativeId], references: [id])
  dailyMetrics AdDailyMetric[]

  @@index([adSetId])
  @@index([creativeId])
  @@map("ads")
}

// Métricas por anúncio por dia (sincronizadas da Meta Marketing API)
// Granularidade: nível "ad" da API de Insights do Meta
model AdDailyMetric {
  id          String   @id @default(uuid())
  adId        String
  campaignId  String   // desnormalizado para facilitar agregações por campanha
  date        DateTime @db.Date
  impressions Int      @default(0)
  clicks      Int      @default(0)    // link clicks
  reach       Int      @default(0)
  spent       Float    @default(0)    // valor gasto (R$)
  conversions Int      @default(0)    // purchases / leads / etc. dependendo do objetivo
  results     Int      @default(0)    // "results" do Meta (varia por objetivo)
  ctr         Float?                  // click-through rate (%)
  cpc         Float?                  // custo por clique (R$)
  cpm         Float?                  // custo por mil impressões (R$)
  cpp         Float?                  // custo por resultado
  roas        Float?                  // return on ad spend (receita / gasto)
  frequency   Float?                  // média de vezes que cada pessoa viu o anúncio

  ad       Ad      @relation(fields: [adId], references: [id], onDelete: Cascade)

  @@unique([adId, date])
  @@index([adId])
  @@index([campaignId])
  @@index([date])
  @@map("ad_daily_metrics")
}
```

> **Obs.:** Adicionar ao modelo `Creative` existente a relação reversa: `ads Ad[]`
> **Obs.:** Adicionar ao modelo `Customer` existente: `campaigns Campaign[]`, `metaAdAccount MetaAdAccount?`

#### Estrutura de pastas backend

```
src/domain/paid-traffic/
  enterprise/
    entities/
      campaign.ts
      ad-set.ts
      ad.ts
      ad-daily-metric.ts
      meta-config.ts
      meta-ad-account.ts
    value-objects/
      campaign-objective.vo.ts
      campaign-publish-status.vo.ts
      campaign-status.vo.ts
  application/
    repositories/
      i-campaign.repository.ts
      i-ad-set.repository.ts
      i-ad.repository.ts
      i-ad-daily-metric.repository.ts
      i-meta-config.repository.ts
      i-meta-ad-account.repository.ts
    services/
      i-ad-platform.adapter.ts        ← interface abstrata para Meta/Google/TikTok
    use-cases/
      # MetaConfig
      save-meta-config.use-case.ts
      get-meta-config.use-case.ts
      # MetaAdAccount
      save-meta-ad-account.use-case.ts
      get-meta-ad-account.use-case.ts
      # Campaign
      create-campaign.use-case.ts
      update-campaign.use-case.ts
      mark-campaign-ready.use-case.ts  ← muda publishStatus para ready_to_publish
      archive-campaign.use-case.ts
      list-customer-campaigns.use-case.ts
      get-campaign.use-case.ts
      delete-campaign.use-case.ts
      # AdSet
      create-ad-set.use-case.ts
      update-ad-set.use-case.ts
      delete-ad-set.use-case.ts
      # Ad
      create-ad.use-case.ts
      update-ad.use-case.ts
      delete-ad.use-case.ts
      # Metrics (manual input — sem Meta API ainda)
      record-ad-daily-metrics.use-case.ts
      get-campaign-dashboard.use-case.ts  ← agrega métricas para o dashboard

src/infra/
  database/prisma/
    repositories/paid-traffic/
      prisma-campaign.repository.ts
      prisma-ad-set.repository.ts
      prisma-ad.repository.ts
      prisma-ad-daily-metric.repository.ts
      prisma-meta-config.repository.ts
      prisma-meta-ad-account.repository.ts
    mappers/paid-traffic/
      campaign.mapper.ts
      ad-set.mapper.ts
      ad.mapper.ts
      meta-config.mapper.ts
      meta-ad-account.mapper.ts
  adapters/
    ad-platform/
      meta-ad-platform.adapter.ts    ← implementação concreta (Fase 11-B)
  controllers/
    paid-traffic.controller.ts
    meta-config.controller.ts
  paid-traffic.module.ts
```

#### Interface `IAdPlatformAdapter`

```typescript
// src/domain/paid-traffic/application/services/i-ad-platform.adapter.ts

export interface CreateMetaCampaignParams {
  adAccountId: string
  name: string
  objective: string        // Meta campaign objective string
  status: 'ACTIVE' | 'PAUSED'
  specialAdCategories?: string[]
}

export interface CreateMetaAdSetParams {
  adAccountId: string
  campaignId: string       // metaCampaignId
  name: string
  status: 'ACTIVE' | 'PAUSED'
  dailyBudget?: number     // em centavos (Meta usa centavos)
  lifetimeBudget?: number
  startTime?: string       // ISO 8601
  endTime?: string
  targeting: Record<string, unknown>
  optimizationGoal: string
  billingEvent: string
}

export interface CreateMetaAdParams {
  adAccountId: string
  adSetId: string          // metaAdSetId
  name: string
  status: 'ACTIVE' | 'PAUSED'
  // creative params
  pageId: string
  imageUrl?: string        // URL pública da imagem (ou usar uploadedImageHash)
  videoId?: string         // Meta video ID (se vídeo foi uploadado antes)
  primaryText: string
  headline?: string
  description?: string
  callToAction: string
  link: string             // URL de destino
}

export interface SyncMetricsParams {
  adAccountId: string
  adIds: string[]          // metaAdIds
  dateRange: { since: string; until: string }  // YYYY-MM-DD
}

export interface AdMetricsResult {
  metaAdId: string
  date: string
  impressions: number
  clicks: number
  reach: number
  spend: number
  conversions: number
  results: number
  ctr: number | null
  cpc: number | null
  cpm: number | null
  cpp: number | null
  roas: number | null
  frequency: number | null
}

export abstract class IAdPlatformAdapter {
  abstract createCampaign(params: CreateMetaCampaignParams): Promise<{ externalId: string }>
  abstract createAdSet(params: CreateMetaAdSetParams): Promise<{ externalId: string }>
  abstract uploadImage(adAccountId: string, imageBuffer: Buffer, filename: string): Promise<{ imageHash: string; url: string }>
  abstract createAd(params: CreateMetaAdParams): Promise<{ externalId: string; creativeId: string }>
  abstract pauseCampaign(adAccountId: string, metaCampaignId: string): Promise<void>
  abstract resumeCampaign(adAccountId: string, metaCampaignId: string): Promise<void>
  abstract syncMetrics(params: SyncMetricsParams): Promise<AdMetricsResult[]>
}
```

#### Casos de Uso — detalhes importantes

**`GetCampaignDashboardUseCase`** — retorna:
```typescript
interface CampaignDashboardResponse {
  campaign: CampaignSummary
  totals: {
    impressions: number
    clicks: number
    reach: number
    spent: number
    conversions: number
    ctr: number | null
    cpc: number | null
    roas: number | null
  }
  dailySeries: Array<{        // últimos N dias (padrão: 30)
    date: string              // YYYY-MM-DD
    impressions: number
    clicks: number
    spent: number
    conversions: number
  }>
  adSetBreakdown: Array<{
    adSet: AdSetSummary
    ads: Array<{
      ad: AdSummary
      creative: CreativeSummary | null
      totals: MetricTotals
    }>
  }>
}
```

#### Endpoints Fase 11-A

```
# Meta Config (admin)
POST   /api/v1/admin/meta-config
GET    /api/v1/admin/meta-config
PATCH  /api/v1/admin/meta-config

# Meta Ad Account por cliente
POST   /api/v1/customers/:customerId/meta-account
GET    /api/v1/customers/:customerId/meta-account
PATCH  /api/v1/customers/:customerId/meta-account

# Campaigns
POST   /api/v1/customers/:customerId/campaigns
GET    /api/v1/customers/:customerId/campaigns          # ?status=&publishStatus=&objective=
GET    /api/v1/customers/:customerId/campaigns/:campaignId
PATCH  /api/v1/customers/:customerId/campaigns/:campaignId
POST   /api/v1/customers/:customerId/campaigns/:campaignId/mark-ready   # draft → ready_to_publish
DELETE /api/v1/customers/:customerId/campaigns/:campaignId

# AdSets
POST   /api/v1/customers/:customerId/campaigns/:campaignId/ad-sets
PATCH  /api/v1/customers/:customerId/campaigns/:campaignId/ad-sets/:adSetId
DELETE /api/v1/customers/:customerId/campaigns/:campaignId/ad-sets/:adSetId

# Ads (dentro de AdSet)
POST   /api/v1/customers/:customerId/campaigns/:campaignId/ad-sets/:adSetId/ads
PATCH  /api/v1/customers/:customerId/campaigns/:campaignId/ad-sets/:adSetId/ads/:adId
DELETE /api/v1/customers/:customerId/campaigns/:campaignId/ad-sets/:adSetId/ads/:adId

# Metrics (manual input para quando não tiver Meta API configurada)
POST   /api/v1/customers/:customerId/campaigns/:campaignId/metrics      # registra métricas manualmente por data
GET    /api/v1/customers/:customerId/campaigns/:campaignId/dashboard    # dashboard agregado
```

#### Testes Fase 11-A

Todos os use-cases com in-memory repositories seguindo o padrão TDD do projeto:
- `create-campaign.use-case.spec.ts`
- `update-campaign.use-case.spec.ts`
- `mark-campaign-ready.use-case.spec.ts`
- `create-ad-set.use-case.spec.ts`
- `create-ad.use-case.spec.ts`
- `record-ad-daily-metrics.use-case.spec.ts`
- `get-campaign-dashboard.use-case.spec.ts`
- E2E: `test/e2e/paid-traffic/campaigns.e2e-spec.ts`

#### Entregáveis Fase 11-A ✅ CONCLUÍDA

- [x] Migration Prisma com todos os novos modelos
- [x] Entidades de domínio com TDD
- [x] Todos os use-cases com specs (19 use-cases, 561 testes)
- [x] Repositórios Prisma + mappers
- [x] `PaidTrafficModule` registrado no `AppModule`
- [x] Controller com Swagger completo (22 rotas)
- [x] `tsc --noEmit` sem erros
- [x] Commit: `feat(paid-traffic): add domain entities, use-cases, repositories and controller`

---

### FASE 11-B — Backend: Integração Meta Marketing API

**Commit:** `feat(paid-traffic): add Meta Marketing API adapter and publish/sync flows`

> **Pré-requisito para esta fase:** Admin precisa ter criado um Meta App e configurado as credenciais. Passos:
> 1. Acesse [developers.facebook.com](https://developers.facebook.com) → Create App → Business
> 2. Adicionar produto "Marketing API"
> 3. Copiar App ID e App Secret para `META_APP_ID` e `META_APP_SECRET` no `.env`
> 4. No Business Manager → System Users → criar System User (Admin level) → gerar token com permissões: `ads_management`, `ads_read`, `business_management`, `pages_read_engagement`, `pages_manage_ads`
> 5. Copiar token para `META_SYSTEM_USER_TOKEN` no `.env`
> 6. Configurar via `POST /api/v1/admin/meta-config` (token é criptografado antes de salvar)

#### Variáveis de ambiente novas

```env
# Meta Marketing API
META_APP_ID=<app id do meta>
META_APP_SECRET=<app secret do meta>
META_SYSTEM_USER_TOKEN=<system user permanent token>
META_API_VERSION=v21.0                # versão atual da Graph API
META_ENCRYPTION_KEY=<32 chars random> # para criptografar tokens no banco
```

#### `MetaAdPlatformAdapter` — implementação

```typescript
// src/infra/adapters/ad-platform/meta-ad-platform.adapter.ts
// Usa o pacote 'facebook-nodejs-business-sdk' ou chamadas HTTP diretas via fetch

// Base URL: https://graph.facebook.com/{META_API_VERSION}/

// createCampaign → POST /{adAccountId}/campaigns
// createAdSet    → POST /{adAccountId}/adsets
// uploadImage    → POST /{adAccountId}/adimages (multipart/form-data)
// createAdCreative → POST /{adAccountId}/adcreatives
// createAd       → POST /{adAccountId}/ads
// syncMetrics    → GET /{adId}/insights?fields=impressions,clicks,reach,spend,...&time_range={...}
//                  ou batch: POST /  com array de requests
```

#### Novo use-case: `PublishCampaignUseCase`

Fluxo completo de publicação:
1. Valida que `publishStatus === ready_to_publish`
2. Busca `MetaAdAccount` do cliente (lança erro se não configurado)
3. Chama `IAdPlatformAdapter.createCampaign` → guarda `metaCampaignId`
4. Para cada `AdSet`:
   - Chama `createAdSet` → guarda `metaAdSetId`
   - Para cada `Ad`:
     - Se criativo é imagem: faz upload da imagem para o Meta → obtém `imageHash`
     - Chama `createAd` → guarda `metaAdId` + `metaCreativeId`
5. Atualiza `campaign.publishStatus = published`
6. Salva tudo via repositórios
7. Em caso de erro parcial: registra `publishError`, status = `publish_failed`

```
POST /api/v1/customers/:customerId/campaigns/:campaignId/publish
```

#### Novo use-case: `SyncCampaignMetricsUseCase`

1. Busca todas as campanhas `published` com `metaCampaignId` preenchido
2. Para cada campanha, busca todos os ads com `metaAdId` preenchido
3. Chama `IAdPlatformAdapter.syncMetrics` para o dia anterior (ou range especificado)
4. Faz upsert em `AdDailyMetric` para cada ad + data
5. Pode ser chamado manualmente (`POST .../sync`) ou pelo cron

```
POST /api/v1/customers/:customerId/campaigns/:campaignId/sync  # manual trigger
```

#### `MetricsSyncSchedulerService` — cron diário

```typescript
// Roda todo dia às 08:00 (horário de Brasília)
@Cron('0 8 * * *', { timeZone: 'America/Sao_Paulo' })
async syncAllCampaigns() {
  // busca todas as campanhas publicadas de todos os clientes
  // executa SyncCampaignMetricsUseCase para cada uma
  // loga erros mas não para o processo
}
```

#### Endpoint adicional

```
POST /api/v1/customers/:customerId/campaigns/:campaignId/publish  # publica no Meta
POST /api/v1/customers/:customerId/campaigns/:campaignId/sync     # força sync manual
POST /api/v1/customers/:customerId/campaigns/:campaignId/pause    # pausa no Meta
POST /api/v1/customers/:customerId/campaigns/:campaignId/resume   # reativa no Meta
```

#### Entregáveis Fase 11-B

- [ ] `MetaAdPlatformAdapter` implementado (ou stub se credenciais não disponíveis — injetar mock em dev)
- [ ] `PublishCampaignUseCase` com TDD (mock do adapter)
- [ ] `SyncCampaignMetricsUseCase` com TDD (mock do adapter)
- [ ] `MetricsSyncSchedulerService` (cron 8h)
- [ ] Variáveis de ambiente documentadas no `.env.example`
- [ ] Admin pode configurar Meta via `/admin/meta-config` (UI)
- [ ] `tsc --noEmit` sem erros
- [ ] Commit: `feat(paid-traffic): add Meta Marketing API adapter and publish/sync flows`

---

### FASE 11-C — Frontend: Dashboard e Gestão de Campanhas

**Commit:** `feat(paid-traffic): add traffic dashboard, campaign management and creative selector`

#### Páginas

```
/customers/[id]/traffic                           ← dashboard geral do cliente
/customers/[id]/traffic/campaigns/new             ← criar campanha + ad sets + ads
/customers/[id]/traffic/campaigns/[campaignId]    ← detalhe com métricas, ads e botão publicar
```

#### `/customers/[id]/traffic` — Dashboard

Seções:
1. **KPI cards** (Tremor `Metric`): Gasto Total, Impressões, Cliques, Conversões, CTR médio, ROAS — período selecionável (7d / 30d / 90d / personalizado)
2. **Gráfico de linha** (Tremor `LineChart`): Gasto vs. Conversões por dia
3. **Gráfico de barras** (Tremor `BarChart`): Cliques por campanha
4. **Tabela de campanhas**: nome, objetivo, status (badge colorido), publishStatus, orçamento previsto vs. gasto, conversões, botão "Ver detalhes"
5. **Botão "Nova Campanha"** → `/customers/[id]/traffic/campaigns/new`

#### `/customers/[id]/traffic/campaigns/new` — Criar Campanha

Formulário em etapas (wizard com 3 passos):

**Passo 1 — Campanha:**
- Nome
- Objetivo (select com labels em PT: Conversões, Tráfego, Alcance, etc.)
- Orçamento diário / orçamento planejado total
- Datas de início e fim (opcionais)
- Notas

**Passo 2 — Ad Sets:**
- Botão "Adicionar Ad Set" (pode ter múltiplos)
- Por Ad Set: nome, orçamento diário próprio (opcional — herda da campanha), targeting (textarea JSON por enquanto — evoluir para UI no futuro), datas

**Passo 3 — Anúncios:**
- Por Ad Set → lista de anúncios
- Por anúncio:
  - **Seletor de criativo** (componente `CreativePicker`): grid com thumbnails dos criativos cadastrados do cliente, filtros por tipo/etapa, seleção por clique
  - Texto principal (textarea)
  - Headline, Descrição
  - CTA (select)
  - URL de destino

Ao finalizar → cria campanha como `draft` → redireciona para detalhe.

#### `CreativePicker` — componente reutilizável

```typescript
// Abre um modal/painel lateral
// Busca criativos do cliente via API
// Mostra grid de thumbnails com: título, tipo, etapa, status
// Seleção: clique no card → confirmar seleção
// Props: customerId, value (creativeId | null), onChange
```

#### `/customers/[id]/traffic/campaigns/[campaignId]` — Detalhe da Campanha

Seções:
1. **Header**: nome da campanha, status badge, publishStatus badge, botões de ação:
   - Se `draft`: "Marcar como Pronto" → muda para `ready_to_publish`
   - Se `ready_to_publish`: botão destacado **"Publicar no Meta"** → chama publish endpoint → feedback de progresso
   - Se `published`: "Sincronizar Métricas" + "Pausar Campanha"
   - Sempre: "Editar" + "Arquivar"
2. **Métricas da campanha** (KPI cards + gráfico de linha — período selecionável)
3. **Ad Sets expandíveis**: cada ad set mostra seus anúncios
4. **Por anúncio**: thumbnail do criativo vinculado, texto do anúncio, métricas individuais (impressões, cliques, CTR, CPC, conversões, gasto), status badge
5. **Seção de configuração Meta** (colapsável): mostra ad account ID, page ID, pixel ID configurados para o cliente; link para editar

#### Sidebar — novo item

Adicionar "Tráfego" no menu lateral do sidebar, com ícone de gráfico de barras. A aba fica ativa para rotas `/customers/[id]/traffic/*`.

> **Nota:** O item do sidebar fica dentro da navegação do cliente (não global), pois tráfego é sempre por cliente. Na aba do cliente (`/customers/[id]`) deve aparecer "Tráfego" ao lado de "Criativos", "Tarefas", etc.

#### Navegação na página do cliente

Na página `/customers/[id]` (ou no layout do cliente), adicionar "Tráfego" como aba/link de navegação, ao lado de Criativos, Tarefas, Atividades, etc.

#### Definições de tipos frontend

```typescript
// src/lib/definitions.ts — adicionar:

export type CampaignObjective =
  | 'CONVERSIONS' | 'LINK_CLICKS' | 'REACH'
  | 'BRAND_AWARENESS' | 'LEAD_GENERATION'
  | 'VIDEO_VIEWS' | 'POST_ENGAGEMENT'

export type CampaignPublishStatus =
  | 'draft' | 'ready_to_publish' | 'publishing' | 'published' | 'publish_failed'

export type CampaignStatus = 'active' | 'paused' | 'archived'

export type AdCallToAction =
  | 'LEARN_MORE' | 'SHOP_NOW' | 'SIGN_UP' | 'CONTACT_US'
  | 'BOOK_NOW' | 'DOWNLOAD' | 'GET_QUOTE' | 'SUBSCRIBE'
  | 'WATCH_MORE' | 'NO_BUTTON'

export type Campaign = {
  id: string
  customerId: string
  name: string
  objective: CampaignObjective
  status: CampaignStatus
  publishStatus: CampaignPublishStatus
  plannedBudget: number | null
  dailyBudget: number | null
  startAt: string | null
  endAt: string | null
  notes: string | null
  metaCampaignId: string | null
  publishError: string | null
  createdAt: string
  adSets?: AdSet[]
}

export type AdSet = {
  id: string
  campaignId: string
  name: string
  status: CampaignStatus
  publishStatus: CampaignPublishStatus
  dailyBudget: number | null
  totalBudget: number | null
  startAt: string | null
  endAt: string | null
  targeting: Record<string, unknown> | null
  optimizationGoal: string | null
  billingEvent: string | null
  metaAdSetId: string | null
  ads?: Ad[]
}

export type Ad = {
  id: string
  adSetId: string
  creativeId: string | null
  name: string
  status: CampaignStatus
  publishStatus: CampaignPublishStatus
  primaryText: string | null
  headline: string | null
  description: string | null
  callToAction: AdCallToAction
  destinationUrl: string | null
  metaAdId: string | null
  creative?: Creative | null
  metrics?: AdDailyMetric[]
}

export type AdDailyMetric = {
  id: string
  adId: string
  campaignId: string
  date: string
  impressions: number
  clicks: number
  reach: number
  spent: number
  conversions: number
  results: number
  ctr: number | null
  cpc: number | null
  cpm: number | null
  cpp: number | null
  roas: number | null
  frequency: number | null
}

export type MetaAdAccount = {
  id: string
  customerId: string
  adAccountId: string
  pageId: string | null
  pixelId: string | null
  instagramActorId: string | null
  accountName: string | null
  isActive: boolean
}

export type CampaignDashboard = {
  campaign: Campaign
  totals: {
    impressions: number
    clicks: number
    reach: number
    spent: number
    conversions: number
    ctr: number | null
    cpc: number | null
    roas: number | null
  }
  dailySeries: Array<{
    date: string
    impressions: number
    clicks: number
    spent: number
    conversions: number
  }>
  adSetBreakdown: Array<{
    adSet: AdSet
    ads: Array<{
      ad: Ad
      creative: Creative | null
      totals: {
        impressions: number
        clicks: number
        spent: number
        conversions: number
        ctr: number | null
        cpc: number | null
        roas: number | null
      }
    }>
  }>
}
```

#### Server Actions frontend

```typescript
// src/app/actions/campaigns.ts
export async function createCampaign(customerId, data): Promise<{ campaignId?: string; message?: string }>
export async function updateCampaign(customerId, campaignId, data): Promise<{ message?: string }>
export async function markCampaignReady(customerId, campaignId): Promise<{ message?: string }>
export async function publishCampaign(customerId, campaignId): Promise<{ message?: string }>
export async function syncCampaignMetrics(customerId, campaignId): Promise<{ message?: string }>
export async function archiveCampaign(customerId, campaignId): Promise<{ message?: string }>
export async function createAdSet(customerId, campaignId, data): Promise<{ adSetId?: string; message?: string }>
export async function updateAdSet(customerId, campaignId, adSetId, data): Promise<{ message?: string }>
export async function deleteAdSet(customerId, campaignId, adSetId): Promise<void>
export async function createAd(customerId, campaignId, adSetId, data): Promise<{ adId?: string; message?: string }>
export async function updateAd(customerId, campaignId, adSetId, adId, data): Promise<{ message?: string }>
export async function deleteAd(customerId, campaignId, adSetId, adId): Promise<void>
export async function saveMetaAdAccount(customerId, data): Promise<{ message?: string }>
```

#### Entregáveis Fase 11-C

- [ ] Dashboard `/customers/[id]/traffic` com KPIs + gráficos (Tremor)
- [ ] Formulário wizard de criação de campanha (3 passos)
- [ ] Componente `CreativePicker` (modal com grid de criativos do cliente)
- [ ] Detalhe da campanha com breakdown por ad + botão publicar
- [ ] Configuração `MetaAdAccount` por cliente (formulário + exibição)
- [ ] Navegação "Tráfego" no menu do cliente
- [ ] Server actions em `campaigns.ts`
- [ ] Tipos em `definitions.ts`
- [ ] `tsc --noEmit` sem erros
- [ ] Commit: `feat(paid-traffic): add traffic dashboard, campaign management and creative selector`

---

### Notas para o próximo agente implementar esta fase

1. **Ordem de implementação:** 11-A → 11-B → 11-C. Cada uma gera um commit separado.
2. **Padrão DDD obrigatório:** abstract class para injection tokens NestJS (não `type`). Ver bugs da Fase 10 como referência.
3. **TDD obrigatório:** unit specs com in-memory repos para todos os use-cases. E2E para os endpoints principais.
4. **Swagger obrigatório:** `@ApiTags`, `@ApiOperation`, `@ApiResponse`, `@ApiBody`/`@ApiParam`/`@ApiQuery`, `@ApiProperty` em todos os DTOs.
5. **Meta API:** Se credenciais não estiverem disponíveis na Fase 11-B, criar `MockMetaAdPlatformAdapter` que retorna IDs falsos e logar chamadas — permite testar o fluxo sem conta Meta real.
6. **Criptografia de tokens:** Usar `crypto.createCipheriv` (AES-256-GCM) com `META_ENCRYPTION_KEY` do `.env` para criptografar `systemUserToken` e `appSecret` antes de salvar no banco.
7. **Tremor para gráficos:** Já está na decisão arquitetural do projeto. Instalar `@tremor/react` se ainda não estiver.
8. **`CreativePicker`:** Reutilizável — será usado também na Fase 12 (CRM) para associar criativos a leads/campanhas.
9. **Fase 11-B pode ser adiada:** Se as credenciais Meta não estiverem prontas, entregar 11-A e 11-C (com métricas manuais) e fazer 11-B depois como patch.

---

## FASE 11 — CRM do Cliente (Dashboard de Leads via Sincronização)

### Visão geral

**Este módulo NÃO é um CRM.** É um **painel de estatísticas sincronizado com um CRM externo** (rotas a serem fornecidas na implementação). Os vendedores continuam trabalhando no CRM deles — este sistema consome a API do CRM, armazena um snapshot local dos leads e exibe as métricas atualizadas em tempo real (ou via polling/webhook).

O objetivo é responder: quantos leads chegaram, de qual campanha vieram, qual é a conversão por etapa do funil, e qual o tempo de atendimento dos vendedores.

### Fluxo

```
CRM externo (vendedores atualizando leads)
    ↓  webhook ou polling periódico
SyncLeadsUseCase — atualiza snapshot local
    ↓
Dashboard por cliente — métricas calculadas
```

### Modelo Prisma (additions)

> O modelo local é um **snapshot somente leitura** dos dados do CRM externo. Não serve para edição — apenas para cálculo de métricas.

```prisma
// Snapshot de um lead vindo do CRM externo
model CrmLeadSnapshot {
  id               String    @id @default(uuid())
  customerId       String    // cliente WB ao qual esse lead pertence
  externalId       String    // ID do lead no CRM externo
  campaignId       String?   // PaidTrafficCampaign de origem (Fase 10)
  name             String?
  email            String?
  phone            String?
  currentStage     String    // nome da etapa atual no CRM externo (ex: "qualificado")
  stageOrder       Int       // posição ordinal da etapa (0, 1, 2...) para cálculo de funil
  source           String?   // origem do lead no CRM externo
  assignedTo       String?   // nome do vendedor no CRM externo
  firstContactAt   DateTime? // quando o 1º contato foi feito
  closedAt         DateTime? // quando foi ganho ou perdido
  isWon            Boolean   @default(false)
  isLost           Boolean   @default(false)
  lastSyncAt       DateTime  @default(now())
  createdAtCrm     DateTime? // data de criação no CRM externo
  createdAt        DateTime  @default(now())
  updatedAt        DateTime  @updatedAt

  customer  Customer              @relation(fields: [customerId], references: [id])
  campaign  PaidTrafficCampaign?  @relation(fields: [campaignId], references: [id])
  stageHistory CrmLeadStageHistory[]

  @@unique([customerId, externalId])
  @@index([customerId])
  @@index([campaignId])
  @@map("crm_lead_snapshots")
}

// Histórico de mudanças de etapa capturadas a cada sync
model CrmLeadStageHistory {
  id         String   @id @default(uuid())
  leadId     String
  fromStage  String?
  toStage    String
  detectedAt DateTime @default(now())

  lead CrmLeadSnapshot @relation(fields: [leadId], references: [id])

  @@index([leadId])
  @@map("crm_lead_stage_history")
}

// Configuração do CRM externo por cliente
model CrmIntegration {
  id           String   @id @default(uuid())
  customerId   String   @unique
  crmType      String   // ex: "kommo" | "hubspot" | "pipedrive" | "custom"
  apiBaseUrl   String
  apiKey       String   // armazenado criptografado ou via secret manager
  webhookToken String?  // token para validar webhooks recebidos
  lastSyncAt   DateTime?
  isActive     Boolean  @default(true)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  customer Customer @relation(fields: [customerId], references: [id])

  @@map("crm_integrations")
}
```

### Casos de Uso

- `ConfigureCrmIntegrationUseCase` — salva configuração da API do CRM externo para um cliente
- `SyncLeadsUseCase` — consome API do CRM externo → upsert em `CrmLeadSnapshot` + detecta mudanças de etapa
- `GetCrmFunnelMetricsUseCase` — calcula a partir do snapshot:
  - Total de leads por etapa
  - % de conversão de cada etapa para a próxima
  - Tempo médio em cada etapa (via `CrmLeadStageHistory`)
  - Tempo médio de primeiro atendimento (`firstContactAt - createdAtCrm`)
  - Leads por campanha de tráfego pago (join com Fase 10)
- `GetCrmLeadListUseCase` — lista leads sincronizados com filtros

**Cron / Webhook:**
- `CrmSyncSchedulerService` — polling periódico (ex: a cada 10 min) ou receptor de webhook
- Rota recebe `POST /api/v1/webhooks/crm/:customerId` para sync imediato via push

### Endpoints

```
# Configuração
POST   /api/v1/customers/:id/crm-integration
GET    /api/v1/customers/:id/crm-integration
PATCH  /api/v1/customers/:id/crm-integration
POST   /api/v1/customers/:id/crm-integration/sync   # força sync manual

# Dados (somente leitura — vêm do snapshot)
GET    /api/v1/customers/:id/crm/leads              # ?stage=&assignedTo=&campaignId=
GET    /api/v1/customers/:id/crm/funnel             # métricas do funil
GET    /api/v1/customers/:id/crm/metrics            # totais, tempo médio, leads por campanha

# Webhook receptor
POST   /api/v1/webhooks/crm/:customerId
```

### Frontend

- **Dashboard de funil:** gráfico de funil com % por etapa + leads totais
- **Métricas de atendimento:** tempo médio de 1º contato por vendedor
- **Leads por campanha:** join com Fase 10 mostrando custo por lead, conversão
- **Lista de leads:** tabela somente leitura dos leads sincronizados
- **Status de sync:** última sincronização, botão "Sincronizar agora"

> Os campos disponíveis no funil (nomes de etapas, ordem) são lidos dinamicamente da API do CRM externo na primeira sincronização e salvos em `CrmIntegration.stagesConfig (Json)`.

### Entregáveis Fase 11

- [ ] Migrations (`crm_lead_snapshots`, `crm_lead_stage_history`, `crm_integrations`)
- [ ] Domínio `crm` com TDD (sync, metrics calculation)
- [ ] `CrmSyncSchedulerService` (cron + webhook receptor)
- [ ] Frontend: dashboard de funil de conversão
- [ ] Frontend: métricas por vendedor e por campanha
- [ ] Frontend: configuração da integração (URL + API key)
- [ ] `tsc --noEmit` sem erros
- [ ] Commit + push GitHub

---

## Fases Futuras (backlog)

| Feature | Fase |
|---------|------|
| Reset de senha por email | Pós-11 |
| Sub-roles do portal (`member` com permissões granulares) | Pós-11 |
| Integração GoTo VoIP (detalhe na Fase 8) | 8 |
| Integração Gmail automático (detalhe na Fase 8) | 8 |
| Integração WhatsApp via Evolution (detalhe na Fase 8) | 8 |
| Integração Meta Marketing API (detalhe na Fase 10) | 10 |
| LGPD — exclusão de dados pessoais | Última |
| SaaS / multi-tenant | Pós-produto |

---

## Deploy Produção

**Subdomínio:** `customer.wbdigitalsolutions.com`  
**Infraestrutura:** Ansible (detalhes a definir quando chegar na fase de deploy)

### Variáveis de ambiente produção (`backend/.env`)

```env
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://...

# Google OAuth2
GOOGLE_CLIENT_ID=<ver backend/.env>
GOOGLE_CLIENT_SECRET=<ver backend/.env>
GOOGLE_REDIRECT_URI=https://customer.wbdigitalsolutions.com/api/v1/google/callback

STORAGE_ADAPTER=google-drive
CALENDAR_ADAPTER=google-calendar
```

### Google Cloud Console — URIs de redirecionamento registrados

| Ambiente | URI |
|----------|-----|
| Desenvolvimento | `http://localhost:3003/api/v1/google/callback` |
| Produção | `https://customer.wbdigitalsolutions.com/api/v1/google/callback` |

> Ambos registrados no OAuth client `154238465749-34m0g...` → "URIs de redirecionamento autorizados".  
> **Atenção:** o path é `/api/v1/google/callback` (com prefixo `/v1/`). Se o reverse proxy remover o prefixo, ajustar o path registrado.

### Checklist deploy

- [ ] Configurar reverse proxy (nginx/caddy) para `customer.wbdigitalsolutions.com` → backend porta 3000
- [ ] Configurar variáveis de ambiente de produção
- [ ] Rodar `prisma migrate deploy` (não `dev`)
- [ ] Rodar seed em produção: `npx ts-node src/infra/database/prisma/seed.ts`
- [ ] Acessar `/admin/google` e reconectar Google (token é por banco — não migra automaticamente)
- [ ] Testar upload de documento e verificar pasta no Drive
- [ ] Testar agendamento de reunião e verificar evento no Calendar

---

## Checklist por Fase

| Fase | Domínio | Unit | E2E | TypeCheck | Frontend | GitHub |
|------|---------|------|-----|-----------|----------|--------|
| 1 | Auth + Usuários | ✅ | ✅ | ✅ | ✅ Login | ✅ |
| 2 | Clientes + Contatos | ✅ | ✅ | ✅ | ✅ CRUD | ✅ |
| 3 | Documentos + Drive | ✅ | ✅ | ✅ | ✅ Upload/View | ✅ |
| 4 | Reuniões + Meet | ✅ | ✅ | ✅ | ✅ Agenda/RSVP | ✅ |
| 5 | Portal do Cliente | ✅ | ✅ | ✅ | ✅ Usuários + Reuniões | ✅ |
| 6 | Gravação + Transcrição | ✅ | ⬜ | ✅ | ✅ Detalhe reunião | ✅ |
| 7 | Tarefas (core + comentários + subtarefas + recorrência) | ✅ | ✅ | ✅ | ✅ Lista/Kanban/Detalhe/Comentários/Subtarefas | ✅ |
| 8 | Atividades (CRUD manual) | ✅ | ⬜ | ✅ | ✅ Timeline + filtros | ✅ |

---

## Convenções

### Backend
1. Casos de uso retornam `Either<ErrorType, ResponseType>`
2. Controllers tratam o Either e lançam exceções HTTP
3. Repositórios: interfaces no domínio, implementações Prisma na infra
4. Unit of Work para operações multi-tabela
5. Mappers sempre: Prisma ↔ Domain Entity ↔ HTTP Response
6. Zod para validação dentro dos casos de uso
7. In-memory repositories para testes unit
8. Schema PostgreSQL isolado por suite e2e
9. Domain Events para comunicação entre domínios
10. Soft delete em todas as entidades principais
11. Prefixo global `/api/v1/`

### Frontend
1. Componentes < 150 linhas, uma responsabilidade
2. Framer Motion para animações (fadeIn, slideIn, staggerChildren)
3. React Hook Form + Zod para validação de formulários
4. RSC onde possível, `use client` apenas quando necessário
5. Skeleton loaders para estados de loading
6. Páginas orquestram, não contêm lógica de negócio
