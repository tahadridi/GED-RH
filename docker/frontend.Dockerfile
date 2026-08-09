# ---- Build stage ----
FROM node:22-alpine AS build
WORKDIR /app

COPY ged-frontend/package.json ged-frontend/package-lock.json ./
RUN npm ci

COPY ged-frontend/ ./
RUN npm run build -- --configuration production

# ---- Runtime stage ----
FROM nginx:alpine AS runtime
COPY --from=build /app/dist/ged-frontend/browser /usr/share/nginx/html
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
