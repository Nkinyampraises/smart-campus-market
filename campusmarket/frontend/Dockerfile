FROM node:20-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

ARG VITE_API_URL
ENV VITE_API_URL=${VITE_API_URL}
ARG VITE_GOOGLE_CLIENT_ID
ENV VITE_GOOGLE_CLIENT_ID=${VITE_GOOGLE_CLIENT_ID}

RUN npm run build

FROM grafana/grafana:13.0.2 AS grafana-assets
USER root
RUN find /usr/share/grafana/public -type f -name '*.map' -delete

FROM nginx:1.30.3-alpine3.23

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
COPY --from=grafana-assets /usr/share/grafana/public /usr/share/nginx/html/grafana-oss/13.0.2/public

EXPOSE 80

HEALTHCHECK --interval=15s --timeout=5s --retries=10 \
  CMD wget -qO- http://127.0.0.1/ >/dev/null || exit 1
