# Instagram Publishing & Engagement Tracking

Feature para publicar conteúdo no Instagram diretamente pelo app e armazenar métricas de engajamento por post.

**Escopo inicial:** contas próprias da WB Digital Solutions e Salto Up (não por cliente).

---

## Visão Geral

```
Usuário seleciona criativo + escreve legenda
        ↓
Backend recebe arquivo (upload multipart)
        ↓
Backend serve URL pública temporária (/api/v1/media/temp/:token)
        ↓
Instagram API baixa a imagem e cria o post
        ↓
Backend armazena post_id + metadados
        ↓
Cron diário busca métricas (likes, views, reach, saves, comments)
```

---

## Pré-requisitos Meta

- System User com permissões: `instagram_basic`, `instagram_content_publish`, `instagram_manage_insights`
- Conta Instagram deve ser Business ou Creator vinculada a uma Página do Facebook
- Instagram Actor IDs configurados: WB Digital e Salto Up

---

## Backend

### Novo domínio: `social`

```
src/domain/social/
├── enterprise/entities/
│   ├── instagram-post.ts       # postId, accountId, caption, mediaUrl, publishedAt
│   └── instagram-metric.ts     # postId, date, likes, comments, reach, saves, views
├── application/
│   ├── repositories/
│   │   ├── i-instagram-post.repository.ts
│   │   └── i-instagram-metric.repository.ts
│   ├── services/
│   │   └── i-instagram-platform.adapter.ts  # publishPhoto, publishCarousel, getInsights
│   └── use-cases/
│       ├── publish-instagram-post.use-case.ts
│       ├── list-instagram-posts.use-case.ts
│       └── sync-instagram-metrics.use-case.ts
```

### Adapter Instagram Graph API

Endpoints utilizados:
- `POST /{ig-user-id}/media` — cria container (image_url, caption)
- `POST /{ig-user-id}/media_publish` — publica o container
- `GET /{ig-media-id}/insights` — métricas por post (likes, comments, reach, saved, impressions, video_views)

### Endpoint de mídia temporária

`GET /api/v1/media/temp/:token` — serve o arquivo em memória/disco por 15 min.
Token destruído após Instagram fazer o download (webhook) ou por TTL.

### Schema Prisma

```prisma
model InstagramPost {
  id          String   @id @default(uuid())
  account     String   // "wb" | "salto"
  igPostId    String   @unique
  caption     String?
  mediaUrl    String
  permalink   String?
  publishedAt DateTime
  createdAt   DateTime @default(now())

  metrics     InstagramMetric[]
}

model InstagramMetric {
  id        String          @id @default(uuid())
  postId    String
  post      InstagramPost   @relation(fields: [postId], references: [id])
  date      DateTime
  likes     Int             @default(0)
  comments  Int             @default(0)
  reach     Int             @default(0)
  saves     Int             @default(0)
  impressions Int           @default(0)
  videoViews  Int?

  @@unique([postId, date])
}
```

### Cron de sincronização

- Frequência: diária (ex.: 06:00)
- Busca todos os posts dos últimos 90 dias
- Upsert de `InstagramMetric` por post/data

---

## Frontend

### Nova seção: `/social`

```
app/(dashboard)/social/
├── page.tsx               # Feed de posts com métricas resumidas
├── new/page.tsx           # Formulário: conta, criativo/upload, legenda, hashtags
└── [postId]/page.tsx      # Detalhe do post com gráfico de métricas ao longo do tempo
```

### Tela "Novo Post"

- Seletor de conta: WB Digital Solutions | Salto Up
- Upload de imagem (drag-and-drop) ou seleção da galeria de criativos existente
- Campo de legenda com contador de caracteres (2.200 max)
- Preview do post antes de publicar
- Botão "Publicar agora" (futuro: agendar)

### Tela Feed

- Grid de posts com thumbnail, data, legenda resumida
- KPIs por post: likes, alcance, saves, comentários
- Ordenação por data ou por engajamento

---

## Fases de Implementação

### Fase 1 — Publicação
1. Endpoint de mídia temporária
2. Adapter Instagram (publishPhoto)
3. Use case + controller + action
4. UI: formulário de novo post com upload

### Fase 2 — Histórico
1. Entidade e repositório `InstagramPost`
2. Persistir post após publicação
3. Tela de feed com listagem

### Fase 3 — Métricas
1. Entidade e repositório `InstagramMetric`
2. Adapter `getInsights`
3. Use case `sync-instagram-metrics`
4. Cron diário
5. Gráfico de engajamento na tela de detalhe

### Fase 4 — Agendamento (opcional)
- Campo de data/hora no formulário
- Fila de publicação (Bull/BullMQ ou cron a cada 5 min)

---

## Decisões a Tomar Antes de Implementar

- [ ] Confirmar Instagram Actor IDs da WB e Salto Up
- [ ] Atualizar permissões do System User (`instagram_content_publish`, `instagram_manage_insights`)
- [ ] Definir se o menu "Social" fica no sidebar global ou dentro de cada conta
- [ ] Definir TTL dos arquivos temporários (sugestão: 15 min)
- [ ] Avaliar agendamento de posts na Fase 1 ou deixar para Fase 4
