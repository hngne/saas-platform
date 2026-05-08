# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm install

# Copy source and prisma schemas
COPY . .

# Generate Prisma Clients
RUN npx prisma generate --schema=./prisma/schema.prisma
RUN npx prisma generate --schema=./prisma-retail/schema.prisma

# Build TypeScript
RUN npm run build

# Stage 2: Runner
FROM node:20-alpine

WORKDIR /app

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma-retail ./prisma-retail
COPY --from=builder /app/generated ./generated

EXPOSE 8080

CMD ["npm", "run", "start"]
