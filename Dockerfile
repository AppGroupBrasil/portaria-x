# =====================================
# Build Stage — Frontend + Server
# =====================================
FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies for canvas (needed for face recognition)
RUN apk add --no-cache python3 make g++ pkgconfig pixman-dev cairo-dev pango-dev jpeg-dev giflib-dev

# Copy package files
COPY package.json package-lock.json ./

# Install all dependencies (including devDependencies for build)
RUN npm ci

# Copy source code
COPY . .

# Build frontend (Vite)
RUN npm run build

# Build server (TypeScript → JavaScript)
RUN npm run build:server

# =====================================
# Production Stage
# =====================================
FROM node:20-alpine AS production

# Install runtime dependencies for canvas
RUN apk add --no-cache pixman cairo pango jpeg giflib

# Create non-root user
RUN addgroup -g 1001 -S portariax && \
    adduser -S portariax -u 1001

WORKDIR /app

# Copy package files and install production deps only
COPY package.json package-lock.json ./
RUN apk add --no-cache --virtual .build-deps python3 make g++ pkgconfig pixman-dev cairo-dev pango-dev jpeg-dev giflib-dev \
    && npm ci --omit=dev \
    && apk del .build-deps

# Copy built frontend from builder
COPY --from=builder /app/dist ./dist

# Copy compiled server from builder
COPY --from=builder /app/dist-server ./dist-server

# Firebase service account is mounted at runtime via Coolify volume mount
# (was: COPY server/firebase-service-account.json — removed because file is gitignored)

# Copy public assets (logo, etc.)
COPY public ./public

# Copy face recognition models
COPY client/public/models ./public/models

# Create data directory for SQLite
RUN mkdir -p /app/data && chown -R portariax:portariax /app/data

# Set ownership
RUN chown -R portariax:portariax /app

# Switch to non-root user
USER portariax

# Environment
ENV NODE_ENV=production
ENV PORT=3001

# Expose port
EXPOSE 3001

# Health check (longer start-period for face model loading)
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3001/api/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))" || exit 1

# Start compiled server directly with Node
CMD ["node", "dist-server/index.js"]
