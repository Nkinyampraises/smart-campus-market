FROM node:20-alpine

ARG SERVICE_NAME
ARG PORT=3000

# Install node_modules at /app so shared code can find packages
WORKDIR /app
COPY services/${SERVICE_NAME}/package*.json ./
RUN npm install --omit=dev

# Copy shared modules (events, db, logger, etc.)
COPY shared/ ./shared/

# Copy service source code
COPY services/${SERVICE_NAME}/ ./services/${SERVICE_NAME}/

# Set workdir to service so ../../shared resolves correctly
WORKDIR /app/services/${SERVICE_NAME}

EXPOSE ${PORT}
CMD ["node", "server.js"]
