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

EXPOSE 3000

CMD ["node", "server.js"]
