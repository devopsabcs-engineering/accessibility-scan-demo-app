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
ENV NODE_OPTIONS="--max-old-space-size=1024"

# Install Playwright system dependencies and Chromium
RUN npx playwright install --with-deps chromium

# Install Puppeteer's Chrome for PDF generation
RUN npx puppeteer browsers install chrome

# Copy standalone output
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Copy axe-core so the scanner can read it at runtime
COPY --from=deps /app/node_modules/axe-core ./node_modules/axe-core

# Copy crawlee and related modules for site crawling
COPY --from=deps /app/node_modules/crawlee ./node_modules/crawlee
COPY --from=deps /app/node_modules/@crawlee ./node_modules/@crawlee
COPY --from=deps /app/node_modules/sitemapper ./node_modules/sitemapper
COPY --from=deps /app/node_modules/robots-parser ./node_modules/robots-parser
COPY --from=deps /app/node_modules/commander ./node_modules/commander

# Copy Azure Monitor OpenTelemetry for Application Insights
COPY --from=deps /app/node_modules/@azure ./node_modules/@azure
COPY --from=deps /app/node_modules/@opentelemetry ./node_modules/@opentelemetry

EXPOSE 3000

CMD ["node", "server.js"]
