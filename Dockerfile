# Build stage
FROM node:20-alpine as build-stage

WORKDIR /app

# Copy package configuration files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy project files and build the app
COPY . .

# Recibe variables VITE_* como build args para que Vite las inyecte en el bundle.
# Pasar al hacer: docker build --build-arg VITE_1CLIC_API_KEY=xxx ...
# En Cloud Run: configurar como substitution variable en el trigger de Cloud Build.
ARG VITE_1CLIC_API_KEY
ENV VITE_1CLIC_API_KEY=$VITE_1CLIC_API_KEY

RUN npm run build

# Production stage
FROM nginx:stable-alpine as production-stage

# Copy the build output to replace the default nginx contents
COPY --from=build-stage /app/dist /usr/share/nginx/html

# Copy custom nginx configuration for SPA routing
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
