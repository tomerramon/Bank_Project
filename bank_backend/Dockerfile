# Dockerfile - Recipe for your backend container

# Step 1: Start with Node.js 18 (like choosing base ingredients)
FROM node:18-alpine
# alpine = lightweight version (smaller, faster)

# Step 2: Set working directory inside container
WORKDIR /app
# Everything happens in /app folder

# Step 3: Copy package files first (optimization trick)
COPY package*.json ./
# Why separate? Docker caches this layer
# If package.json doesn't change, npm install is skipped (faster builds)

# Step 4: Install dependencies
RUN npm ci --only=production
# npm ci = clean install (faster, more reliable than npm install)
# --only=production = skip devDependencies (smaller image)

# Step 5: Copy your code
COPY . .
# Copies everything from your project folder

# Step 6: Expose port
EXPOSE 5000
# Tells Docker "this app uses port 5000"
# Doesn't actually open the port (docker-compose does that)

# Step 7: Health check (optional but professional)
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"
# Checks every 30s if app is healthy
# If /health endpoint returns 200, container is healthy

# Step 8: Run the app
CMD ["npm", "start"]
# This runs when container starts
# Uses npm start from your package.json

# Summary:
# - Small image (alpine)
# - Fast builds (caching)
# - Production-ready (no devDependencies)
# - Health checks (monitoring)