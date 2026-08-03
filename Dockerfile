FROM node:22-alpine AS builder

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json tsconfig.base.json ./
COPY apps/backend/package.json apps/backend/
COPY packages/shared/package.json packages/shared/
COPY database/package.json database/

RUN pnpm install --frozen-lockfile

COPY . .

# Ensure all workspace dependencies are installed and buildable
RUN pnpm install --frozen-lockfile || pnpm install
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
COPY --from=builder /app/node_modules/.pnpmfile.cjs ./node_modules/.pnpmfile.cjs 2>/dev/null || true

USER nestjs

EXPOSE 4000

ENV NODE_ENV=production

CMD ["node", "dist/src/main.js"]
