import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import store from '../store.js';
import crypto from 'crypto';
import { isEmailDomainAllowed, sendActivationEmail } from '../services/email.js';
import nodemailer from 'nodemailer';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

// Create email transporter helper
function createEmailTransporter() {
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : 587;
  const smtpUser = process.env.SMTP_USER;
  const smtpPassword = process.env.SMTP_PASSWORD;
  const smtpSecure = process.env.SMTP_SECURE === 'true' || smtpPort === 465;

  if (!smtpHost || !smtpUser || !smtpPassword) {
    return null;
  }

  return nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpSecure,
    auth: {
      user: smtpUser,
      pass: smtpPassword,
    },
    tls: {
      rejectUnauthorized: process.env.SMTP_REJECT_UNAUTHORIZED !== 'false',
    },
  });
}

async function findUserByEmail(email) {
  const data = await store.read();
  const lower = String(email || '').toLowerCase();
  return data.users.find(u => String(u.email || '').toLowerCase() === lower) || null;
}

router.post('/register', async (req, res) => {
  try {
    const { name, email, password, confirmPassword } = req.body || {};
    if (!name || !email || !password || !confirmPassword) {
      return res.status(400).json({ error: 'Name, email, password and confirm password are required' });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ error: 'Passwords do not match' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const existing = await findUserByEmail(email);
    if (existing && existing.passwordHash) {
      return res.status(409).json({ error: 'User with this email already exists' });
    }

    const data = await store.read();
    const passwordHash = await bcrypt.hash(password, 10);
    
    // Check if email domain is allowed (for email activation)
    const isAllowedDomain = isEmailDomainAllowed(email);
    
    // All users start as not activated - they need either email activation (allowed domains) or admin approval (other domains)
    const emailActivated = false;
    
    // Generate activation token only for allowed domains
    const activationToken = isAllowedDomain ? crypto.randomBytes(32).toString('hex') : null;
    const activationTokenExpiry = isAllowedDomain ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() : null; // 24 hours

    if (existing && !existing.passwordHash) {
      existing.passwordHash = passwordHash;
      existing.emailActivated = emailActivated;
      existing.activationToken = activationToken;
      existing.activationTokenExpiry = activationTokenExpiry;
    } else if (!existing) {
      const id = crypto.randomUUID();
      data.users.push({
        id,
        name,
        email,
        role: 'User',
        departmentId: null,
        active: true,
        passwordHash,
        isAdmin: 0,
        emailActivated,
        activationToken,
        activationTokenExpiry,
      });
    }

    console.log(`[REGISTER] Saving user ${email} with activationToken: ${activationToken ? activationToken.substring(0, 8) + '...' : 'null'}, expiry: ${activationTokenExpiry}`);
    await store.write(data);
    console.log(`[REGISTER] User saved successfully`);

    // Send activation email only for allowed domains
    if (isAllowedDomain && activationToken) {
      const baseUrl = process.env.FRONTEND_URL || 'http://localhost:8080';
      console.log(`[REGISTER] Sending activation email to ${email}`);
      await sendActivationEmail(email, activationToken, baseUrl);
      return res.json({ 
        ok: true, 
        message: 'Registration successful. Please check your email to activate your account.',
        requiresActivation: true,
        activationMethod: 'email'
      });
    }

    // For non-allowed domains, inform user that admin approval is required
    return res.json({ 
      ok: true, 
      message: 'Registration successful. Your account is pending admin approval. You will be notified once your account is activated.',
      requiresActivation: true,
      activationMethod: 'admin'
    });
  } catch (e) {
    console.error('Register error', e);
    return res.status(500).json({ error: 'Internal error' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await findUserByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // If user exists but has no password, they need to register first
    if (!user.passwordHash) {
      return res.status(401).json({ 
        error: 'No password set for this account. Please register to set a password, or contact an administrator.',
        needsRegistration: true
      });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check email activation for non-admin users
    if (!user.isAdmin && !user.emailActivated) {
      const isAllowedDomain = isEmailDomainAllowed(user.email);
      const errorMessage = isAllowedDomain 
        ? 'Email not activated. Please check your email for the activation link.'
        : 'Account pending admin approval. Please contact an administrator to activate your account.';
      return res.status(403).json({ 
        error: errorMessage,
        requiresActivation: true,
        activationMethod: isAllowedDomain ? 'email' : 'admin'
      });
    }

    const token = jwt.sign(
      { sub: user.id, email: user.email, name: user.name, isAdmin: !!user.isAdmin },
      JWT_SECRET,
      { expiresIn: '8h' }
    );
    return res.json({
      token,
      user: { id: user.id, email: user.email, name: user.name, isAdmin: !!user.isAdmin },
    });
  } catch (e) {
    console.error('Login error', e);
    return res.status(500).json({ error: 'Internal error' });
  }
});

router.post('/activate', async (req, res) => {
  try {
    const { token } = req.body || {};
    if (!token) {
      return res.status(400).json({ error: 'Activation token is required' });
    }

    const data = await store.read();
    console.log(`[ACTIVATE] Looking for activation token: ${token.substring(0, 8)}...`);
    console.log(`[ACTIVATE] Total users: ${data.users.length}`);
    const usersWithActivationToken = data.users.filter(u => u.activationToken);
    console.log(`[ACTIVATE] Users with activationToken: ${usersWithActivationToken.length}`);
    if (usersWithActivationToken.length > 0) {
      console.log(`[ACTIVATE] Sample tokens: ${usersWithActivationToken.slice(0, 3).map(u => u.activationToken?.substring(0, 8) + '...').join(', ')}`);
    }
    
    const user = data.users.find(u => u.activationToken === token);
    
    if (!user) {
      console.log(`[ACTIVATE] Token not found in database`);
      return res.status(404).json({ error: 'Invalid activation token' });
    }
    
    console.log(`[ACTIVATE] Found user: ${user.email}, token expiry: ${user.activationTokenExpiry}`);

    // Check if token expired
    if (user.activationTokenExpiry && new Date(user.activationTokenExpiry) < new Date()) {
      console.log(`[ACTIVATE] Token expired. Expiry: ${user.activationTokenExpiry}, Now: ${new Date().toISOString()}`);
      return res.status(400).json({ error: 'Activation token has expired' });
    }
    
    console.log(`[ACTIVATE] Token valid, activating user ${user.email}`);

    // Activate user
    user.emailActivated = true;
    user.activationToken = null;
    user.activationTokenExpiry = null;

    console.log(`[ACTIVATE] Saving activated user ${user.email}`);
    await store.write(data);
    console.log(`[ACTIVATE] User activated successfully`);
    return res.json({ ok: true, message: 'Account activated successfully. You can now log in.' });
  } catch (e) {
    console.error('Activation error', e);
    return res.status(500).json({ error: 'Internal error' });
  }
});

router.post('/forgot-password', async (req, res) => {
  const { email } = req.body || {};
  if (!email) return res.status(400).json({ error: 'Email is required' });

  try {
    const user = await findUserByEmail(email);
    if (!user) {
      // Do not leak which emails exist
      return res.json({ ok: true, message: 'If an account exists with this email, a password reset link has been sent.' });
    }

    // Generate password reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour expiry

    // Save reset token to user
    const data = await store.read();
    const userIndex = data.users.findIndex(u => u.id === user.id);
    if (userIndex !== -1) {
      data.users[userIndex].resetToken = resetToken;
      data.users[userIndex].resetTokenExpiry = resetTokenExpiry;
      console.log(`[FORGOT PASSWORD] Saving reset token for ${user.email}: ${resetToken.substring(0, 8)}..., expiry: ${resetTokenExpiry}`);
      await store.write(data);
      console.log(`[FORGOT PASSWORD] Reset token saved successfully`);
    }

    // Send password reset email
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:8080';
    const resetLink = `${baseUrl}/#reset-password/${resetToken}`;
    const fromEmail = process.env.EMAIL_FROM || 'noreply@energi-up.com';

    const transporter = createEmailTransporter();

    const emailContent = {
      from: `"Project Management System" <${fromEmail}>`,
      to: email,
      subject: 'Password Reset Request - Project Management System',
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
            .warning { color: #dc2626; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Password Reset Request</h1>
            </div>
            <div class="content">
              <p>Hello,</p>
              <p>We received a request to reset your password for your Project Management System account.</p>
              <p>Click the button below to reset your password:</p>
              <p style="text-align: center;">
                <a href="${resetLink}" class="button">Reset Password</a>
              </p>
              <p>Or copy and paste this link into your browser:</p>
              <p class="link">${resetLink}</p>
              <p class="warning">This link will expire in 1 hour.</p>
              <p>If you did not request a password reset, please ignore this email. Your password will remain unchanged.</p>
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
Password Reset Request - Project Management System

We received a request to reset your password for your Project Management System account.

Please click the following link to reset your password:

${resetLink}

This link will expire in 1 hour.

If you did not request a password reset, please ignore this email. Your password will remain unchanged.

---
This is an automated message from Project Management System.
Please do not reply to this email.
      `,
    };

    if (transporter) {
      try {
        const info = await transporter.sendMail(emailContent);
        console.log(`[EMAIL SENT] Password reset email sent to ${email}`);
        console.log(`[EMAIL INFO] Message ID: ${info.messageId}`);
        console.log(`[EMAIL INFO] Response: ${info.response || 'N/A'}`);
        console.log(`[EMAIL INFO] From: ${fromEmail}`);
        console.log(`[EMAIL INFO] To: ${email}`);
        console.log(`[EMAIL INFO] Reset Link: ${resetLink}`);
      } catch (emailError) {
        console.error('[EMAIL ERROR] Failed to send password reset email:', emailError);
        console.error('[EMAIL ERROR] Error details:', {
          message: emailError.message,
          code: emailError.code,
          command: emailError.command,
          response: emailError.response,
          responseCode: emailError.responseCode
        });
        // Fallback to console logging
        console.log('='.repeat(60));
        console.log('[PASSWORD RESET EMAIL - FALLBACK MODE]');
        console.log(`To: ${email}`);
        console.log(`Reset Link: ${resetLink}`);
        console.log('='.repeat(60));
      }
    } else {
      // Fallback to console logging if SMTP is not configured
      console.log('='.repeat(60));
      console.log('[PASSWORD RESET EMAIL - CONSOLE MODE]');
      console.log(`From: ${fromEmail}`);
      console.log(`To: ${email}`);
      console.log(`Subject: ${emailContent.subject}`);
      console.log(`Reset Link: ${resetLink}`);
      console.log(`This link will expire in 1 hour.`);
      console.log('='.repeat(60));
    }

    return res.json({ ok: true, message: 'If an account exists with this email, a password reset link has been sent.' });
  } catch (e) {
    console.error('Forgot-password error', e);
    return res.status(500).json({ error: 'Internal error' });
  }
});

// Reset password with token
router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body || {};
    if (!token || !password) {
      return res.status(400).json({ error: 'Token and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const data = await store.read();
    console.log(`[RESET PASSWORD] Looking for token: ${token.substring(0, 8)}...`);
    console.log(`[RESET PASSWORD] Total users: ${data.users.length}`);
    const usersWithResetToken = data.users.filter(u => u.resetToken);
    console.log(`[RESET PASSWORD] Users with resetToken: ${usersWithResetToken.length}`);
    if (usersWithResetToken.length > 0) {
      console.log(`[RESET PASSWORD] Sample tokens: ${usersWithResetToken.slice(0, 3).map(u => u.resetToken?.substring(0, 8) + '...').join(', ')}`);
    }
    
    const user = data.users.find(u => u.resetToken === token);
    
    if (!user) {
      console.log(`[RESET PASSWORD] Token not found in database`);
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }
    
    console.log(`[RESET PASSWORD] Found user: ${user.email}, token expiry: ${user.resetTokenExpiry}`);

    // Check if token expired
    if (user.resetTokenExpiry && new Date(user.resetTokenExpiry) < new Date()) {
      return res.status(400).json({ error: 'Reset token has expired. Please request a new one.' });
    }

    // Update password
    const passwordHash = await bcrypt.hash(password, 10);
    user.passwordHash = passwordHash;
    user.resetToken = null;
    user.resetTokenExpiry = null;

    await store.write(data);
    return res.json({ ok: true, message: 'Password reset successfully. You can now log in with your new password.' });
  } catch (e) {
    console.error('Reset password error', e);
    return res.status(500).json({ error: 'Internal error' });
  }
});

export default router;

