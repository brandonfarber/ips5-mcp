# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# Production stage
FROM node:22-alpine

WORKDIR /app

ENV NODE_ENV=production
ENV MCP_TRANSPORT=http
ENV PORT=80

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist
COPY docs ./docs

EXPOSE 80

CMD ["node", "dist/index.js"]
