# Production Dockerfile for AI Interview Prep Kit Generator
FROM node:20-alpine AS builder

WORKDIR /app

# Copy workspace package definitions
COPY package*.json ./
COPY server/package*.json ./server/
COPY client/package*.json ./client/

# Install dependencies
RUN npm install

# Copy source files
COPY . .

# Build server and client applications
RUN npm run build:server
RUN cd client && npm run build

# Production runtime stage
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001

# Copy workspace package definitions
COPY package*.json ./
COPY server/package*.json ./server/
COPY client/package*.json ./client/

# Install only production dependencies
RUN npm ci --omit=dev

# Copy compiled outputs
COPY --from=builder /app/server/dist ./server/dist
COPY --from=builder /app/client/out ./client/out

EXPOSE 3001 3000

CMD ["node", "server/dist/index.js"]
