# ─────────────────────────────────────────
# Stage 1: development
# ─────────────────────────────────────────
FROM node:22-alpine AS development

WORKDIR /app

RUN npm install -g pnpm

COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml ./

RUN pnpm install

COPY . .

RUN pnpm prisma generate

CMD ["pnpm", "start:dev"]

# ─────────────────────────────────────────
# Stage 2: builder
# ─────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

RUN npm install -g pnpm

COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml ./

RUN pnpm install --frozen-lockfile

COPY . .

RUN pnpm prisma generate
RUN pnpm build

# ─────────────────────────────────────────
# Stage 3: production
# ─────────────────────────────────────────
FROM node:22-alpine AS production

WORKDIR /app

ENV NODE_ENV=production

RUN npm install -g pnpm

COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml ./

RUN pnpm install --prod --frozen-lockfile

# O schema precisa vir antes do generate. Também fica na imagem porque o deploy
# roda `prisma migrate deploy` dentro deste container.
COPY prisma ./prisma

# Gera o client aqui em vez de copiar do builder: com pnpm o client não fica em
# node_modules/.prisma, e sim dentro de node_modules/.pnpm/@prisma+client@.../,
# então o COPY antigo apontava para um caminho que não existe.
RUN pnpm prisma generate

COPY --from=builder /app/dist ./dist

CMD ["node", "-r", "tsconfig-paths/register", "dist/main"]
