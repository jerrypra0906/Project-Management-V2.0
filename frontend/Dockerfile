# Use nginx to serve static frontend files
FROM nginx:alpine

# Copy frontend files to nginx html directory
COPY . /usr/share/nginx/html

# Copy all nginx config files
COPY nginx.conf.local /etc/nginx/conf.d/nginx.conf.local
COPY nginx.conf.testing /etc/nginx/conf.d/nginx.conf.testing
COPY nginx.conf.production /etc/nginx/conf.d/nginx.conf.production

# Copy default config (defaults to local)
COPY nginx.conf.local /etc/nginx/conf.d/default.conf

# Create startup script to select config based on environment variable
RUN echo '#!/bin/sh' > /start-nginx.sh && \
    echo 'ENV_TYPE=${NGINX_ENV:-local}' >> /start-nginx.sh && \
    echo 'echo "Using nginx config for environment: ${ENV_TYPE}"' >> /start-nginx.sh && \
    echo 'cp /etc/nginx/conf.d/nginx.conf.${ENV_TYPE} /etc/nginx/conf.d/default.conf' >> /start-nginx.sh && \
    echo 'nginx -t' >> /start-nginx.sh && \
    echo 'exec nginx -g "daemon off;"' >> /start-nginx.sh && \
    chmod +x /start-nginx.sh

# Expose port 80
EXPOSE 80

# Use custom startup script
CMD ["/start-nginx.sh"]

