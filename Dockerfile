FROM node:22-alpine AS builder

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

COPY . .

RUN pnpm install --frozen-lockfile --config.strict-peer-dependencies=false

RUN pnpm --filter @el-bannawy/shared build
RUN pnpm --filter @el-bannawy/database generate
RUN pnpm --filter @el-bannawy/backend build
RUN pnpm --filter @el-bannawy/backend deploy /out --prod --legacy

FROM node:22-alpine AS runner

WORKDIR /app

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nestjs

COPY --from=builder /out ./out

USER nestjs

EXPOSE 4000

ENV NODE_ENV=production

CMD ["node", "out/dist/src/main.js"]
