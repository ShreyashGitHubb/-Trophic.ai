# Build stage
FROM node:20 AS builder

WORKDIR /app

# Install build dependencies
COPY package*.json ./
RUN npm install

# Copy source
COPY . .

# Build the application
RUN npm run build

# Runtime stage
FROM node:20-slim

WORKDIR /app

# Copy built app and entry point
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/entry.js ./entry.js
COPY --from=builder /app/package.json ./package.json

# Copy node_modules to ensure all dependencies are present
# We use node:20 in both stages so the binaries are compatible
COPY --from=builder /app/node_modules ./node_modules

# Cloud Run defaults to port 8080
ENV PORT=8080
ENV NODE_ENV=production
EXPOSE 8080

# Start the server using our production wrapper
CMD ["node", "entry.js"]
