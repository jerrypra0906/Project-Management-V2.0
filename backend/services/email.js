import nodemailer from 'nodemailer';
import 'dotenv/config';

const ALLOWED_DOMAINS = ['energi-up.com', 'kpn-corp.com', 'cemindo.com'];

export function isEmailDomainAllowed(email) {
  if (!email) return false;
  const domain = email.split('@')[1]?.toLowerCase();
  return ALLOWED_DOMAINS.includes(domain);
}

// Create email transporter based on environment variables
function createEmailTransporter() {
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : 587;
  const smtpUser = process.env.SMTP_USER;
  const smtpPassword = process.env.SMTP_PASSWORD;
  const smtpSecure = process.env.SMTP_SECURE === 'true' || smtpPort === 465;
  const fromEmail = process.env.EMAIL_FROM || 'noreply@energi-up.com';

  // If SMTP is not configured, return null (will fall back to console logging)
  if (!smtpHost || !smtpUser || !smtpPassword) {
    console.log('[EMAIL] SMTP not configured. Email will be logged to console.');
    return null;
  }

  return nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpSecure, // true for 465, false for other ports
    auth: {
      user: smtpUser,
      pass: smtpPassword,
    },
    // Optional: Add TLS options if needed
    tls: {
      rejectUnauthorized: process.env.SMTP_REJECT_UNAUTHORIZED !== 'false',
    },
  });
}

export async function sendActivationEmail(email, activationToken, baseUrl = 'http://localhost:8080') {
  if (!isEmailDomainAllowed(email)) {
    console.log(`[EMAIL SKIPPED] Domain not allowed for: ${email}`);
    return false;
  }

  const activationLink = `${baseUrl}/#activate/${activationToken}`;
  const fromEmail = process.env.EMAIL_FROM || 'noreply@energi-up.com';
  
  const transporter = createEmailTransporter();

  const emailContent = {
    from: `"Project Management System" <${fromEmail}>`,
    to: email,
    subject: 'Activate your account - Project Management System',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #3b82f6; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background-color: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; padding: 12px 24px; background-color: #3b82f6; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
          .link { color: #3b82f6; word-break: break-all; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to Project Management System</h1>
          </div>
          <div class="content">
            <p>Hello,</p>
            <p>Thank you for registering! Please click the button below to activate your account:</p>
            <p style="text-align: center;">
              <a href="${activationLink}" class="button">Activate Account</a>
            </p>
            <p>Or copy and paste this link into your browser:</p>
            <p class="link">${activationLink}</p>
            <p><strong>This link will expire in 24 hours.</strong></p>
            <p>If you did not register for this account, please ignore this email.</p>
          </div>
          <div class="footer">
            <p>This is an automated message from Project Management System.</p>
            <p>Please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
Welcome to Project Management System

Thank you for registering! Please click the following link to activate your account:

${activationLink}

This link will expire in 24 hours.

If you did not register for this account, please ignore this email.

---
This is an automated message from Project Management System.
Please do not reply to this email.
    `,
  };

  try {
    if (transporter) {
      // Send email using SMTP
      const info = await transporter.sendMail(emailContent);
      console.log(`[EMAIL SENT] Activation email sent to ${email}`);
      console.log(`[EMAIL INFO] Message ID: ${info.messageId}`);
      return true;
    } else {
      // Fallback to console logging if SMTP is not configured
      console.log('='.repeat(60));
      console.log('[ACTIVATION EMAIL - CONSOLE MODE]');
      console.log(`From: ${fromEmail}`);
      console.log(`To: ${email}`);
      console.log(`Subject: ${emailContent.subject}`);
      console.log(`Body:`);
      console.log(`Please click the following link to activate your account:`);
      console.log(activationLink);
      console.log(`This link will expire in 24 hours.`);
      console.log('='.repeat(60));
      return true;
    }
  } catch (error) {
    console.error('[EMAIL ERROR] Failed to send activation email:', error);
    // Fallback to console logging on error
    console.log('='.repeat(60));
    console.log('[ACTIVATION EMAIL - FALLBACK MODE]');
    console.log(`To: ${email}`);
    console.log(`Activation Link: ${activationLink}`);
    console.log('='.repeat(60));
    return false;
  }
}

