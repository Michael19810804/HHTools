# Build Stage
FROM node:18-alpine as build
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build Arguments (Can be overridden at build time)
ARG VITE_API_BASE_URL=/api
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY

# Set Environment Variables for Build Process
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY

# Build the application
RUN npm run build

# Production Stage
FROM nginx:alpine

# Copy built assets from build stage
COPY --from=build /app/dist /usr/share/nginx/html

# Copy custom nginx configuration
COPY nginx/default.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
