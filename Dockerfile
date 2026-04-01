# Stage 1: Install dependencies
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# Stage 2: Build the application
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx next build

# Stage 3: Production image with Playwright browsers
FROM node:20-bookworm-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV NODE_OPTIONS="--max-old-space-size=1536"

# Install procps (provides 'ps' command needed by Crawlee memory monitoring)
# and Playwright system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends procps \
    && rm -rf /var/lib/apt/lists/*

# Copy standalone output
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Copy all node_modules from deps to ensure serverExternalPackages
# (crawlee, @azure/monitor-opentelemetry, etc.) have all transitive dependencies
COPY --from=deps /app/node_modules ./node_modules

# Install Playwright Chromium and Puppeteer Chrome AFTER node_modules are in place
# so the installed browser versions match the packages in node_modules
RUN npx playwright install --with-deps chromium
RUN npx puppeteer browsers install chrome

EXPOSE 3000

CMD ["node", "server.js"]
