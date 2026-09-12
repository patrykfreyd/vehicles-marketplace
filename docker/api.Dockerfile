# apps/api (NestJS). Runs via ts-node, not a compiled dist/ — the same
# runtime model as local dev (see the root README's "no build step"
# explanation): internal @vehicles-marketplace/* packages ship raw TS
# source, and NestJS's DI relies on emitDecoratorMetadata, which is why
# ts-node is used instead of an esbuild-based runner.
#
# Two targets, one shared install layer:
#   - dev        used only by docker-compose.local.yml (bind-mounted source,
#                `--watch` for hot reload)
#   - production used by Test and Production — this is the image that gets
#                built once and promoted between them, never rebuilt per
#                environment (see plans/02-environments-infrastructure.md §2)
FROM node:22-alpine AS base
WORKDIR /repo
RUN corepack enable

# Whole-workspace install: pnpm's workspace resolution needs every
# apps/*/package.json and packages/*/package.json present to match
# pnpm-lock.yaml, and internal packages are consumed as raw TS source (no
# per-package dist/ to selectively copy instead). Build-cache layering
# beyond this is Plan 35's job (CI/CD), not this plan's.
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml turbo.json ./
COPY apps ./apps
COPY packages ./packages
COPY prisma ./prisma
RUN pnpm install --frozen-lockfile

FROM base AS dev
ENV NODE_ENV=development
EXPOSE 3001
CMD ["pnpm", "--filter", "@vehicles-marketplace/api", "dev"]

FROM base AS production
ENV NODE_ENV=production
EXPOSE 3001
CMD ["pnpm", "--filter", "@vehicles-marketplace/api", "start"]
