# syntax=docker/dockerfile:1.7
# Railway build for expert-portal (Next.js 15, standalone output)
# Build context should be the monorepo root (railway.json sets this).

FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /repo

# --- deps ---
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/expert-portal/package.json apps/expert-portal/package.json
# Fetch only what expert-portal needs. --ignore-scripts avoids native builds we don't need here.
RUN pnpm install --frozen-lockfile --filter expert-portal... --ignore-scripts

# --- build ---
FROM base AS build
COPY --from=deps /repo/node_modules ./node_modules
COPY --from=deps /repo/apps/expert-portal/node_modules ./apps/expert-portal/node_modules
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY apps/expert-portal ./apps/expert-portal
WORKDIR /repo/apps/expert-portal

# NEXT_PUBLIC_* must be available at build time — Next.js inlines them into the
# client bundle. Railway passes service Variables as build args when ARG is declared.
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_PORTAL_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_PORTAL_URL=$NEXT_PUBLIC_PORTAL_URL
ENV NEXT_TELEMETRY_DISABLED=1

RUN pnpm run build

# --- runtime ---
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Next.js standalone output bundles only what's needed
COPY --from=build /repo/apps/expert-portal/.next/standalone ./
COPY --from=build /repo/apps/expert-portal/.next/static ./apps/expert-portal/.next/static
EXPOSE 3000
CMD ["node", "apps/expert-portal/server.js"]
