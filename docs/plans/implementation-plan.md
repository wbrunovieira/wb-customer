# WB Customer — Plano de Implementação

> **Última revisão:** 2026-04-14  
> Decisões arquiteturais registradas após sessão de refinamento.  
> **2026-04-13 (portal):** decisões do portal do cliente registradas.  
> **2026-04-14 (sessão 1):** Backend fases 1–5 concluídas. Frontend fases 1–2 concluídas. CustomerStatus `lead` removido. Fase 3 Frontend concluída. Google Drive + OAuth2 ativos.  
> **2026-04-14 (sessão 2):** Fase 4 Frontend concluída: lista global `/meetings`, formulário `/meetings/new` com email do cliente auto-populado + chips de participantes, lista por cliente, admin de tipos de reunião. `MeetingPresenter` criado (TDD) — corrige "Invalid Date" causado por entidades de domínio serializadas sem presenter. Cron de RSVP corrigido (janela 1h→30d, campo `endAt`→`startAt`). Coluna de confirmação do cliente (RSVP) na tabela. Página de detalhe `/customers/[id]/meetings/[meetingId]` pendente (link "Ver" existe mas página não implementada — adiada para Fase 5).  
> **2026-04-14 (sessão 3):** Fase 5 Frontend concluída. Portal do cliente completo: layout separado `/portal/*`, `/portal/meetings` (lista paginada com tabs de status), `/portal/meetings/[id]` (detalhe com RSVP, gravação, sumário, transcrição), `/portal/users` (master gerencia sub-usuários). Admin: `/customers/[id]/portal-users` com criar, revogar, editar inline, seletor de perfil (master/member) e eye toggle na senha. `UpdateCustomerPortalUserUseCase` (TDD, 6 testes). Refresh token corrigido: `middleware.ts` → `proxy.ts` (Next.js 16), `Buffer.from` → `atob()` (Edge Runtime). Total: 287 testes passando.  
> **2026-04-14 (sessão 4):** Fase 6 — gravação e transcrição de reuniões implementadas. `MeetingFilesFinderService` (pesquisa Drive em "Meet Recordings" por nome do título + fallback por data). `TranscriptorService` (client para API transcritor: submit MP4, poll status, get result). `MeetingRecordingDetectorService` reescrito com 3 passes: Pass 0 Drive-first (detecta reuniões via arquivos novos no Drive independente de horário agendado), Pass 1 time-based (marca reuniões expiradas como ended), Pass 2 retry (retenta reuniões ended sem gravação por até 4h). Estratégia de transcrição: 1º doc Gemini nativo do Meet (summary + transcript), fallback: envia MP4 ao transcritor externo. `MeetingTranscriptionPollerService` reescrito para usar `TranscriptorService`.  
> **2026-04-14 (sessão 5):** Página de detalhe de reunião implementada (`/customers/[id]/meetings/[meetingId]`): gravação embed Drive, transcrição, attendees RSVP, summary editável. `MeetingPresenter.toHTTP` corrigido para expor `nativeTranscriptUrl` e `transcriptText`. Link "Ver detalhes" adicionado nos cards da lista. Fases 7–11 planejadas: Tarefas (Scrum + ICE + Gantt + comentários ricos), Atividades (log de comunicações + integrações GoTo/Gmail/WhatsApp), Criativos (Drive + performance A/B), Tráfego Pago (Meta BM + campanhas), CRM do Cliente (funil de vendas + leads).

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

- [ ] Migrations (`sprints`, `tasks`, `checklist_items`, `task_tags`, `task_tag_links`, `task_comments`, `comment_attachments`, `image_annotations`, `comment_reactions`, `task_activity_logs`, `task_templates`)
- [ ] Domínio `tasks` completo com TDD
- [ ] Todos use-cases unit testados (in-memory repos)
- [ ] E2E: CRUD tasks, sprints, templates, comentários
- [ ] Frontend: lista, kanban, calendário, gantt, detalhe da tarefa
- [ ] Frontend: área de ideias separada
- [ ] Frontend: comentários ricos (áudio, imagem com anotação, anexos, reações)
- [ ] SSE + sino de notificações no header
- [ ] Cron de recorrência
- [ ] `tsc --noEmit` sem erros
- [ ] Commit + push GitHub

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

- [ ] Migrations (`activities`, `activity_attachments`)
- [ ] Domínio `activities` com TDD
- [ ] CRUD manual de atividades no frontend com filtros e timeline por cliente
- [ ] Clicar no email do contato → abre composer (Gmail API)
- [ ] Clicar no número do contato → discagem GoTo
- [ ] Automações: GoTo, Gmail, WhatsApp (quando detalhes fornecidos)
- [ ] EventBus + SSE para notificações de mensagens recebidas
- [ ] `tsc --noEmit` sem erros
- [ ] Commit + push GitHub

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

## FASE 10 — Tráfego Pago

### Visão geral

Domínio `paid-traffic`. Gestão de campanhas de Meta Ads vinculadas à conta BM do admin. Registra dados diários de performance por campanha e por criativo. Integração com Meta Marketing API fornece dados de cada criativo na fase de exploração.

### Modelo Prisma (additions)

```prisma
enum CampaignStatus {
  active
  paused
  archived
}

model PaidTrafficCampaign {
  id             String         @id @default(uuid())
  customerId     String
  name           String
  status         CampaignStatus @default(active)
  objective      String?        // "CONVERSIONS" | "BRAND_AWARENESS" | etc.
  plannedBudget  Float?
  spentBudget    Float          @default(0)
  startAt        DateTime?
  endAt          DateTime?
  metaCampaignId String?        // ID da campanha no Meta BM
  metaAdSetId    String?        // conjunto de anúncios
  notes          String?
  createdAt      DateTime       @default(now())
  updatedAt      DateTime       @updatedAt

  customer      Customer               @relation(fields: [customerId], references: [id])
  dailyMetrics  CampaignDailyMetric[]
  creativeLinks CampaignCreativeLink[]
  leads         Lead[]                 // leads vindos desta campanha (Fase 11)

  @@index([customerId])
  @@map("paid_traffic_campaigns")
}

model CampaignDailyMetric {
  id          String   @id @default(uuid())
  campaignId  String
  date        DateTime @db.Date
  impressions Int      @default(0)
  clicks      Int      @default(0)
  spent       Float    @default(0)
  conversions Int      @default(0)
  reach       Int?
  cpc         Float?
  cpm         Float?

  campaign PaidTrafficCampaign @relation(fields: [campaignId], references: [id])

  @@unique([campaignId, date])
  @@index([campaignId])
  @@map("campaign_daily_metrics")
}

model CampaignCreativeLink {
  campaignId String
  creativeId String
  phase      ExplorationPhase

  campaign PaidTrafficCampaign @relation(fields: [campaignId], references: [id])
  creative Creative             @relation(fields: [creativeId], references: [id])

  @@id([campaignId, creativeId])
  @@map("campaign_creative_links")
}
```

### Casos de Uso

- `CreateCampaignUseCase`
- `UpdateCampaignUseCase`
- `ArchiveCampaignUseCase`
- `ListCustomerCampaignsUseCase` — filtros (status, dateRange)
- `RecordCampaignDailyMetricsUseCase` — registra dados do dia
- `LinkCreativeToCampaignUseCase`
- `GetCampaignPerformanceSummaryUseCase` — retorna totais + série histórica

**Integração Meta (futura — detalhes na hora):**
- `SyncMetaCampaignMetricsUseCase` — importa dados via Meta Marketing API

### Endpoints

```
POST   /api/v1/customers/:id/campaigns
GET    /api/v1/customers/:id/campaigns       # ?status=active|paused|archived
GET    /api/v1/customers/:id/campaigns/:campaignId
PATCH  /api/v1/customers/:id/campaigns/:campaignId
DELETE /api/v1/customers/:id/campaigns/:campaignId

POST   /api/v1/customers/:id/campaigns/:campaignId/metrics
GET    /api/v1/customers/:id/campaigns/:campaignId/metrics    # ?from=&to=

POST   /api/v1/customers/:id/campaigns/:campaignId/creatives/:creativeId
DELETE /api/v1/customers/:id/campaigns/:campaignId/creatives/:creativeId
```

### Entregáveis Fase 10

- [ ] Migrations (`paid_traffic_campaigns`, `campaign_daily_metrics`, `campaign_creative_links`)
- [ ] Domínio `paid-traffic` com TDD
- [ ] Frontend: lista de campanhas por cliente com status ativo/inativo
- [ ] Dashboard de métricas diárias (gráfico de linha: gasto, cliques, conversões)
- [ ] Vinculação campanha ↔ criativos (fase exploração/lapidação)
- [ ] Orçamento previsto vs gasto
- [ ] `tsc --noEmit` sem erros
- [ ] Commit + push GitHub

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
| 5 | Portal do Cliente | ✅ | ✅ | ✅ | ⬜ Usuários + Reuniões | ⬜ |

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
