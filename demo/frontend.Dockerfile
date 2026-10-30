FROM node:24.19.0-bookworm-slim
WORKDIR /app/frontend
RUN chown node:node /app/frontend
COPY --chown=node:node frontend/package.json frontend/package-lock.json ./
USER node
RUN npm ci
COPY --chown=node:node frontend/ ./
RUN npm run build
CMD ["npm", "run", "preview", "--", "--host", "0.0.0.0", "--port", "4173", "--strictPort"]
