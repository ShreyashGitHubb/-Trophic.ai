# Build stage
FROM node:20 AS builder

WORKDIR /app

# Install build dependencies
COPY package*.json ./
RUN npm install

# Copy source
COPY . .

# Build the application
# Explicitly set NITRO_PRESET to node-server or node_server
ENV NITRO_PRESET=node-server
RUN npm run build

# Runtime stage
FROM node:20-slim

WORKDIR /app

# Copy built app and production dependencies
COPY --from=builder /app/.output ./.output
COPY --from=builder /app/package.json ./package.json

# Cloud Run defaults to port 8080
ENV PORT=8080
EXPOSE 8080

# Start the server
CMD ["node", ".output/server/index.mjs"]
