FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY index.html tsconfig.json vite.config.ts ./
COPY src/ ./src/
COPY public/ ./public/
COPY scripts/world-data.mjs scripts/darken-grass.mjs scripts/path-art.mjs ./scripts/
COPY editor/ ./editor/
RUN npm run build

FROM nginx:stable-alpine
COPY --from=build /app/dist/ /usr/share/nginx/html/
RUN test -s /usr/share/nginx/html/index.html && test -s /usr/share/nginx/html/map/simplemap.tmx
