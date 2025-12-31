import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import store from '../store.js';
import crypto from 'crypto';
import { isEmailDomainAllowed, sendActivationEmail } from '../services/email.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

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

    await store.write(data);

    // Send activation email only for allowed domains
    if (isAllowedDomain && activationToken) {
      const baseUrl = process.env.FRONTEND_URL || 'http://localhost:8080';
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
    if (!user || !user.passwordHash) {
      return res.status(401).json({ error: 'Invalid credentials' });
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
    const user = data.users.find(u => u.activationToken === token);
    
    if (!user) {
      return res.status(404).json({ error: 'Invalid activation token' });
    }

    // Check if token expired
    if (user.activationTokenExpiry && new Date(user.activationTokenExpiry) < new Date()) {
      return res.status(400).json({ error: 'Activation token has expired' });
    }

    // Activate user
    user.emailActivated = true;
    user.activationToken = null;
    user.activationTokenExpiry = null;

    await store.write(data);
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
      return res.json({ ok: true });
    }

    // For now, we just acknowledge the request; real email sending can be added later.
    console.log(`Password reset requested for ${email}`);
    return res.json({ ok: true });
  } catch (e) {
    console.error('Forgot-password error', e);
    return res.status(500).json({ error: 'Internal error' });
  }
});

export default router;

