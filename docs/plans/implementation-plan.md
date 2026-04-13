# WB Customer — Plano de Implementação

> **Última revisão:** 2026-04-13  
> Decisões arquiteturais registradas após sessão de refinamento.

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
| Roles | `admin` → acesso total; `manager` → acesso parcial (a definir); `employee` → acesso básico; `customer` → acesso futuro (TBD) |
| Permissões | Futuro: delegação granular de tarefas (reuniões, todos) entre funcionários. Arquitetura deve suportar isso sem reescrever |
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
customer → acesso futuro (TBD — algumas informações a definir)
```

> A arquitetura de autorização deve usar uma estrutura extensível (ex: resource-based permissions futuramente), mas por ora `UserRole` enum com guard é suficiente.

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
  customer
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
  lead
  active
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
  status          CustomerStatus    @default(lead)
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

### SSE
```
GET    /api/v1/events              # Server-Sent Events stream (autenticado)
```

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

# Google Drive
GOOGLE_SERVICE_ACCOUNT_JSON='{...}'
GOOGLE_DRIVE_ROOT_FOLDER_ID=your-root-folder-id

# Google Calendar (Fase 4 — TBD)
# GOOGLE_CALENDAR_SERVICE_ACCOUNT_JSON='{...}'
# GOOGLE_CALENDAR_ID=calendar-id@group.calendar.google.com

# Gmail API (Notificações — TBD)
# GMAIL_CLIENT_ID=
# GMAIL_CLIENT_SECRET=
# GMAIL_REFRESH_TOKEN=

# Adapters (feature flags para dev/test)
STORAGE_ADAPTER=local        # local | google-drive
CALENDAR_ADAPTER=mock        # mock | google-calendar
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

### Entregáveis Fase 1
- [ ] `docker compose up` sobe sem erros
- [ ] Migrations aplicadas
- [ ] Seed cria admin se não existir
- [ ] Todos os testes unit passando
- [ ] Todos os testes e2e passando
- [ ] `tsc --noEmit` sem erros
- [ ] Login funcionando no frontend (página simples)
- [ ] Commit + push GitHub

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

### Entregáveis Fase 2
- [ ] Testes unit passando
- [ ] Testes e2e passando
- [ ] `tsc --noEmit` sem erros
- [ ] CRUD no frontend com tabela paginada + filtros + detalhe do cliente
- [ ] Commit + push GitHub

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
- [ ] Testes unit passando
- [ ] Testes e2e passando (local adapter)
- [ ] `tsc --noEmit` sem erros
- [ ] Upload drag-and-drop no frontend
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

### Entregáveis Fase 4
- [ ] Perguntas TBD respondidas
- [ ] Testes unit passando
- [ ] Testes e2e passando
- [ ] Fluxo completo no frontend
- [ ] Commit + push GitHub

---

## Fases Futuras (backlog)

| Feature | Fase |
|---------|------|
| Notificações Gmail API | 5 |
| SSE (Server-Sent Events) notificações in-app | 5 |
| Acesso do cliente ao sistema (portal) | 6 |
| Delegação de tarefas (todos) entre funcionários | 7 |
| Reset de senha por email | 8 |
| LGPD — exclusão de dados pessoais | Última |
| SaaS / multi-tenant | Pós-produto |

---

## Checklist por Fase

| Fase | Domínio | Unit | E2E | TypeCheck | Frontend | GitHub |
|------|---------|------|-----|-----------|----------|--------|
| 1 | Auth + Usuários | ✅ | ✅ | ✅ | Login | ✅ |
| 2 | Clientes + Contatos | ✅ | ✅ | ✅ | CRUD | ✅ |
| 3 | Documentos + Drive | ✅ | ✅ | ✅ | Upload/View | ✅ |
| 4 | Reuniões + Meet | ✅ | ✅ | ✅ | Agenda | ✅ |

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
