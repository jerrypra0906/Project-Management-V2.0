# Environment Configuration Guide

This project supports separate configurations for **Local**, **Testing**, and **Production** environments.

## Overview

The frontend nginx configuration is environment-specific:
- **Local**: Uses Docker service name `backend:3000` for API proxying
- **Testing**: Configurable backend URL for testing/staging environment
- **Production**: Uses production backend URL (e.g., `http://147.139.176.70:1819`)

## Quick Start

### Local Development (Default)

```bash
# Uses nginx.conf.local automatically
docker-compose up -d
```

Or explicitly:

```bash
docker-compose -f docker-compose.yml -f docker-compose.local.yml up -d
```

### Testing/Staging Environment

1. **Update `frontend/nginx.conf.testing`** with your testing backend URL
2. Start with testing config:

```bash
docker-compose -f docker-compose.yml -f docker-compose.testing.yml up -d
```

### Production Environment

1. **Update `frontend/nginx.conf.production`** with your production backend URL
2. Start with production config:

```bash
docker-compose -f docker-compose.yml -f docker-compose.production.yml up -d
```

## Using Environment Variable

You can also set the `NGINX_ENV` environment variable directly:

```bash
# Local
NGINX_ENV=local docker-compose up -d

# Testing
NGINX_ENV=testing docker-compose up -d

# Production
NGINX_ENV=production docker-compose up -d
```

## Configuration Files

### Nginx Configs

- `frontend/nginx.conf.local` - Local Docker development (uses `backend:3000`)
- `frontend/nginx.conf.testing` - Testing/staging environment
- `frontend/nginx.conf.production` - Production environment (AliCloud)

### Docker Compose Overrides

- `docker-compose.local.yml` - Local development overrides
- `docker-compose.testing.yml` - Testing environment overrides
- `docker-compose.production.yml` - Production environment overrides

## Updating Backend URLs

### For Testing Environment

Edit `frontend/nginx.conf.testing` and update the `proxy_pass` directives:

```nginx
location /api/ {
    proxy_pass http://your-testing-backend-url:port;
    # ... rest of config
}
```

### For Production Environment

Edit `frontend/nginx.conf.production` and update the `proxy_pass` directives:

```nginx
location /api/ {
    proxy_pass http://147.139.176.70:1819;  # Update to your production URL
    # ... rest of config
}
```

## Rebuilding After Config Changes

After updating nginx config files, rebuild the frontend container:

```bash
docker-compose build frontend
docker-compose up -d frontend
```

Or rebuild everything:

```bash
docker-compose build
docker-compose up -d
```

## Verifying Configuration

Check which nginx config is being used:

```bash
docker logs project_management_frontend | grep "Using nginx config"
```

You should see: `Using nginx config for environment: local` (or testing/production)

## Environment-Specific Settings

You can add environment-specific settings in the docker-compose override files:

- **Backend environment variables** (JWT_SECRET, SMTP settings, etc.)
- **Port mappings** (if different ports needed)
- **Volume mounts** (if different paths needed)
- **Resource limits** (CPU, memory)

## Troubleshooting

### Wrong Backend URL

If API calls fail, check:
1. Which nginx config is active: `docker logs project_management_frontend`
2. The backend URL in the active config file
3. Network connectivity between frontend and backend containers

### Config Not Updating

If changes to nginx configs aren't taking effect:
1. Rebuild the frontend container: `docker-compose build frontend`
2. Restart the frontend: `docker-compose restart frontend`
3. Check logs: `docker logs project_management_frontend`

## Best Practices

1. **Never commit production credentials** - Use environment variables or secrets management
2. **Test configs in testing environment** before deploying to production
3. **Keep configs in sync** - When updating one environment, consider if others need updates
4. **Document custom URLs** - Add comments in config files explaining custom URLs
5. **Use version control** - Track all config changes in git

