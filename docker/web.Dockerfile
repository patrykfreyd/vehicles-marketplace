# apps/web (Next.js). Unlike api/worker, the `production` target here does
# run a real build step (`next build` needs a compiled output to `next
# start`) — internal @vehicles-marketplace/* packages are still consumed as
# raw TS source via Next's `transpilePackages` (see next.config.ts), so the
# whole workspace still needs to be present, not just apps/web.
FROM node:22-alpine AS base
WORKDIR /repo
RUN corepack enable

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml turbo.json ./
COPY apps ./apps
COPY packages ./packages
RUN pnpm install --frozen-lockfile

FROM base AS dev
ENV NODE_ENV=development
EXPOSE 3000
CMD ["pnpm", "--filter", "@vehicles-marketplace/web", "dev"]

FROM base AS production
ENV NODE_ENV=production
RUN pnpm --filter @vehicles-marketplace/web build
EXPOSE 3000
CMD ["pnpm", "--filter", "@vehicles-marketplace/web", "start"]
