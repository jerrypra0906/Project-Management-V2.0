# Email Configuration Guide

This guide explains how to configure email sending using your `@energi-up.com` domain.

## Environment Variables

Add the following environment variables to your `.env` file or Docker Compose configuration:

```env
# Email Configuration
EMAIL_FROM=noreply@energi-up.com
FRONTEND_URL=http://your-domain.com:8080

# SMTP Configuration
SMTP_HOST=smtp.energi-up.com          # Your SMTP server hostname
SMTP_PORT=587                          # SMTP port (587 for TLS, 465 for SSL)
SMTP_SECURE=false                      # true for SSL (port 465), false for TLS (port 587)
SMTP_USER=noreply@energi-up.com       # SMTP username (usually your email address)
SMTP_PASSWORD=your-smtp-password       # SMTP password
SMTP_REJECT_UNAUTHORIZED=true         # Set to false if using self-signed certificates
```

## Common SMTP Providers

### Option 1: Using Your Own SMTP Server (energi-up.com)
If you have your own mail server:
```env
SMTP_HOST=mail.energi-up.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=noreply@energi-up.com
SMTP_PASSWORD=your-mail-server-password
```

### Option 2: Using Gmail/Google Workspace
If you're using Google Workspace with your domain:
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=noreply@energi-up.com
SMTP_PASSWORD=your-app-specific-password
```

**Note:** For Gmail, you'll need to:
1. Enable 2-Factor Authentication
2. Generate an App-Specific Password
3. Use that password in `SMTP_PASSWORD`

### Option 3: Using Microsoft 365 / Outlook
If you're using Microsoft 365 with your domain:
```env
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=noreply@energi-up.com
SMTP_PASSWORD=your-office365-password
```

### Option 4: Using Other SMTP Services
- **SendGrid**: Use `smtp.sendgrid.net` with port 587
- **Mailgun**: Use `smtp.mailgun.org` with port 587
- **AWS SES**: Use your SES SMTP endpoint

## Setup Steps

1. **Create a `.env` file** in the project root (if it doesn't exist):
   ```bash
   cp .env.example .env  # If you have an example file
   ```

2. **Add your SMTP configuration** to the `.env` file using one of the options above.

3. **Update `docker-compose.yml`** - The environment variables are already configured to read from `.env`.

4. **Rebuild and restart the backend**:
   ```bash
   docker-compose build backend
   docker-compose restart backend
   ```

5. **Test the email** by registering a new user. Check the backend logs:
   ```bash
   docker logs project_management_backend --tail 50
   ```

## Fallback Mode

If SMTP is not configured, the system will automatically fall back to console logging mode. You'll see the activation link in the backend logs, which you can manually share with users.

## Troubleshooting

### Email not sending?
1. Check backend logs: `docker logs project_management_backend --tail 100`
2. Verify SMTP credentials are correct
3. Check if your SMTP server requires specific IP whitelisting
4. Verify firewall/network allows outbound SMTP connections (port 587 or 465)

### "Connection timeout" error?
- Check if `SMTP_HOST` is correct
- Verify `SMTP_PORT` matches your server configuration
- Check if your network/firewall blocks SMTP ports

### "Authentication failed" error?
- Verify `SMTP_USER` and `SMTP_PASSWORD` are correct
- For Gmail: Make sure you're using an App-Specific Password, not your regular password
- Check if your email account requires "Less secure app access" (not recommended, use App Passwords instead)

### "Certificate verification failed"?
- Set `SMTP_REJECT_UNAUTHORIZED=false` if using self-signed certificates (not recommended for production)

## Security Notes

- Never commit your `.env` file to version control
- Use strong, unique passwords for SMTP accounts
- Consider using App-Specific Passwords instead of main account passwords
- For production, use a dedicated email service account (not a personal email)

