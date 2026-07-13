FROM node:20-alpine

ARG SERVICE_NAME
ARG PORT=3000
ARG NPM_CONFIG_STRICT_SSL=true

# Install node_modules at /app so shared event code can find packages too
WORKDIR /app
COPY services/${SERVICE_NAME}/package*.json ./
RUN npm config set strict-ssl ${NPM_CONFIG_STRICT_SSL} \
  && npm ci --omit=dev

# Copy the shared event bus used by the services.
COPY shared/ ./shared/

# Copy service source code
COPY services/${SERVICE_NAME}/ ./services/${SERVICE_NAME}/

# Set workdir to service so ../../shared/events resolves to /app/shared/events
WORKDIR /app/services/${SERVICE_NAME}

EXPOSE ${PORT}
CMD ["node", "server.js"]
