import jwt from 'jsonwebtoken';
import store from '../store.js';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

export async function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Verify user still exists and is active
    const data = await store.read();
    const user = data.users.find(u => u.id === decoded.sub);
    
    if (!user || !user.active) {
      return res.status(401).json({ error: 'User not found or inactive' });
    }

    // Check email activation for non-admin users
    if (!user.isAdmin && !user.emailActivated) {
      return res.status(403).json({ error: 'Email not activated. Please check your email for activation link.' });
    }

    req.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      isAdmin: !!user.isAdmin,
      role: user.role
    };
    
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
}

export function requireAdmin(req, res, next) {
  if (!req.user || !req.user.isAdmin) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

