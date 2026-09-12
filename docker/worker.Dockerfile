# apps/worker (NestJS application context, no HTTP — BullMQ processors land
# in a later plan). Shares source with apps/api rather than living in
# packages/, per the low-cost-stack doc, but is built/deployed as its own
# image so it can scale and restart independently of the API process. Same
# ts-node runtime model as docker/api.Dockerfile — see there for why.
FROM node:22-alpine AS base
WORKDIR /repo
RUN corepack enable

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml turbo.json ./
COPY apps ./apps
COPY packages ./packages
COPY prisma ./prisma
RUN pnpm install --frozen-lockfile

FROM base AS dev
ENV NODE_ENV=development
CMD ["pnpm", "--filter", "@vehicles-marketplace/worker", "dev"]

FROM base AS production
ENV NODE_ENV=production
CMD ["pnpm", "--filter", "@vehicles-marketplace/worker", "start"]
