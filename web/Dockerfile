# Build stage
FROM node:20-alpine as builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source and build
COPY . .
RUN npm run build

# Production stage with nginx
FROM nginx:alpine

# Copy built files
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx template (nginx:alpine supports envsubst automatically via /etc/nginx/templates/)
COPY nginx.conf.template /etc/nginx/templates/default.conf.template

# Railway uses PORT env variable, default to 80
ENV PORT=80

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
