FROM node:22-alpine AS builder

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

COPY . .

RUN pnpm install --frozen-lockfile --config.strict-peer-dependencies=false

RUN pnpm --filter @el-bannawy/shared build
RUN pnpm --filter @el-bannawy/database generate
RUN pnpm --filter @el-bannawy/backend build

FROM node:22-alpine AS runner

WORKDIR /app

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nestjs

COPY --from=builder /app/apps/backend/package.json ./
COPY --from=builder /app/apps/backend/dist ./dist
COPY --from=builder /app/node_modules/.pnpm ./node_modules/.pnpm
COPY --from=builder /app/node_modules/@el-bannawy ./node_modules/@el-bannawy

USER nestjs

EXPOSE 4000

ENV NODE_ENV=production

CMD ["node", "dist/src/main.js"]
