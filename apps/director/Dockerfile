# Build stage - must be run from monorepo root context
# docker build -f apps/director/Dockerfile -t director .
FROM node:22-bookworm-slim AS build

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate

WORKDIR /app

# Install build dependencies for canvas and other native modules
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    python3 \
    libcairo2-dev \
    libpango1.0-dev \
    libjpeg-dev \
    libgif-dev \
    librsvg2-dev \
    pkg-config \
  && rm -rf /var/lib/apt/lists/*

# Copy root monorepo configuration
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY turbo.json ./

# Copy workspace packages that director depends on
COPY packages/core ./packages/core
COPY packages/db ./packages/db
COPY packages/auth ./packages/auth
COPY packages/api ./packages/api

# Copy the director app
COPY apps/director ./apps/director

# Install dependencies at root level (resolves workspace:* links)
RUN pnpm install --frozen-lockfile --ignore-scripts

# Build workspace dependencies in order
RUN pnpm --filter @openvideo/core run build
RUN pnpm --filter @openvideo/db run build
RUN pnpm --filter @openvideo/auth run build
RUN pnpm --filter @openvideo/api run build

# Build the director app
RUN pnpm --filter @openvideo/director run build

# Copy SKILL.md files to dist for production
RUN cd apps/director/src/skills/library && \
    find . -name "*.md" -exec cp --parents {} ../../dist/src/skills/library \;

# Runner stage - minimal production image
FROM node:22-bookworm-slim AS runner

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate

ENV NODE_ENV=production

WORKDIR /app

# Install runtime dependencies for canvas and build tools for native modules
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    python3 \
    libcairo2 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libjpeg62-turbo \
    libgif7 \
    librsvg2-2 \
  && rm -rf /var/lib/apt/lists/*

# Copy workspace package.json files for production install
COPY --from=build /app/package.json /app/pnpm-workspace.yaml /app/pnpm-lock.yaml ./
COPY --from=build /app/packages/core/package.json ./packages/core/
COPY --from=build /app/packages/db/package.json ./packages/db/
COPY --from=build /app/packages/auth/package.json ./packages/auth/
COPY --from=build /app/packages/api/package.json ./packages/api/
COPY --from=build /app/apps/director/package.json ./apps/director/

# Install production dependencies (native modules will build)
RUN pnpm install --prod --frozen-lockfile

# Copy built artifacts from build stage
COPY --from=build /app/packages/core/dist ./packages/core/dist
COPY --from=build /app/packages/db/dist ./packages/db/dist
COPY --from=build /app/packages/auth/dist ./packages/auth/dist
COPY --from=build /app/packages/api/dist ./packages/api/dist
COPY --from=build /app/apps/director/dist ./apps/director/dist

ENV PORT=8080
EXPOSE 8080

CMD ["node", "apps/director/dist/src/main.js"]
