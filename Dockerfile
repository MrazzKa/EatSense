# Production Dockerfile for EatSense API (Monorepo)
# This Dockerfile is optimized for Railway deployment

# Build stage
FROM node:22-alpine AS builder

# Install build dependencies
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    cairo-dev \
    pango-dev \
    giflib-dev \
    librsvg-dev

# Set working directory
WORKDIR /app

# Install pnpm globally
RUN npm install -g pnpm@9

# Copy root package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Copy scripts needed for postinstall (patch-iap.js) BEFORE installing dependencies
COPY scripts ./scripts

# Copy apps/api package files
COPY apps/api/package.json ./apps/api/

# Install dependencies (root + api)
RUN pnpm install --frozen-lockfile

# Copy Prisma schema
COPY apps/api/prisma ./apps/api/prisma

# Generate Prisma client (needed for build)
RUN pnpm --filter ./apps/api exec prisma generate --schema prisma/schema.prisma

# Copy source code
COPY apps/api ./apps/api
COPY tsconfig.json ./

# Build the application
RUN pnpm --filter ./apps/api build

# Production stage
FROM node:22-alpine AS production

# Install runtime dependencies
RUN apk add --no-cache \
    curl \
    cairo \
    pango \
    giflib \
    librsvg

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S eatsense -u 1001

# Set working directory
WORKDIR /app

# Install pnpm globally
RUN npm install -g pnpm@9

# Copy root package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Copy scripts needed for postinstall (patch-iap.js)
COPY scripts ./scripts

# Copy apps/api package files
COPY apps/api/package.json ./apps/api/

# Install production dependencies + dev dependencies needed for seeds (ts-node, tsconfig-paths)
# We need ts-node for running seed scripts in start:railway
# Use --ignore-scripts=false to allow postinstall to run (it needs scripts/patch-iap.js)
RUN pnpm install --frozen-lockfile --filter ./apps/api

# Copy built application from builder stage
COPY --from=builder --chown=eatsense:nodejs /app/apps/api/dist ./apps/api/dist

# Copy Prisma schema for migrations and client generation
COPY --chown=eatsense:nodejs apps/api/prisma ./apps/api/prisma

# Generate Prisma client in production stage (fast operation, avoids pnpm store path issues)
# This is needed for migrations and runtime
RUN pnpm --filter ./apps/api exec prisma generate --schema prisma/schema.prisma

# Copy scripts and configs needed for start:railway
COPY --chown=eatsense:nodejs apps/api/scripts ./apps/api/scripts
COPY --chown=eatsense:nodejs apps/api/tsconfig.json ./apps/api/
COPY --chown=eatsense:nodejs apps/api/prisma/seeds ./apps/api/prisma/seeds

# Create directories for uploads and logs
RUN mkdir -p apps/api/uploads apps/api/logs && \
    chown -R eatsense:nodejs apps/api/uploads apps/api/logs

# Switch to non-root user
USER eatsense

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# Start the application using Railway start command
# This runs migrations and seeds before starting
CMD ["pnpm", "--filter", "./apps/api", "run", "start:railway"]
