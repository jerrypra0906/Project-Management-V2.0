# Use Node.js LTS version
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application files
COPY backend/ ./backend/
COPY frontend/ ./frontend/
COPY docs/ ./docs/

# Create uploads directory
RUN mkdir -p /app/uploads

# Expose port
EXPOSE 3000

# Set environment to production
ENV NODE_ENV=production

# Start the server
CMD ["node", "backend/server.js"]

