FROM node:24.19.0-bookworm-slim
WORKDIR /app/backend
COPY backend/package.json backend/package-lock.json ./
RUN npm ci
COPY backend/ ./
RUN npm run build
USER node
CMD ["node", "dist/server.js"]
