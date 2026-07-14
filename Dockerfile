# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app

# Copy root configurations and workspace files
COPY package*.json tsconfig.base.json ./
COPY shared/package*.json ./shared/
COPY backend/package*.json ./backend/
COPY backend/prisma ./backend/prisma

# Install all dependencies (including devDependencies for compilation)
RUN npm ci

# Copy source code
COPY shared ./shared
COPY backend ./backend

# Build shared and backend workspaces
RUN npm run build -w shared
RUN npm run build -w backend

# Stage 2: Production Runner
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Copy root package.json for workspace resolution
COPY package*.json ./
COPY shared/package*.json ./shared/
COPY backend/package*.json ./backend/

# Install only production dependencies
RUN npm ci --omit=dev

# Copy compiled build outputs and Prisma schema
COPY --from=builder /app/shared/dist ./shared/dist
COPY --from=builder /app/backend/dist ./backend/dist
COPY --from=builder /app/backend/prisma ./backend/prisma

# Re-generate Prisma Client in the runner stage for the target OS (Linux)
RUN npx prisma generate --schema=backend/prisma/schema.prisma

# Set fallback port and expose it
ENV PORT=4000
EXPOSE 4000

CMD ["npm", "run", "start", "-w", "backend"]
