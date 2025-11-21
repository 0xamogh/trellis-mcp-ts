# Use Node.js LTS Alpine for smaller image size
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code and config
COPY tsconfig.json ./
COPY src ./src

# Expose port (default 3000)
EXPOSE 3000

# Run the application using tsx
CMD ["npx", "-y", "tsx", "src/index.ts"]
