import express from 'express';
import store from '../store.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const router = express.Router();

// All admin routes require authentication and admin privileges
router.use(authenticateToken);
router.use(requireAdmin);

// Get all users
router.get('/users', async (req, res) => {
  try {
    const data = await store.read();
    // Don't return password hashes
    const users = data.users.map(u => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      departmentId: u.departmentId,
      active: u.active,
      isAdmin: !!u.isAdmin,
      emailActivated: u.emailActivated || false,
      createdAt: u.createdAt
    }));
    return res.json(users);
  } catch (e) {
    console.error('Get users error', e);
    return res.status(500).json({ error: 'Internal error' });
  }
});

// Get single user
router.get('/users/:id', async (req, res) => {
  try {
    const data = await store.read();
    const user = data.users.find(u => u.id === req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    return res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      departmentId: user.departmentId,
      active: user.active,
      isAdmin: !!user.isAdmin,
      emailActivated: user.emailActivated || false,
      createdAt: user.createdAt
    });
  } catch (e) {
    console.error('Get user error', e);
    return res.status(500).json({ error: 'Internal error' });
  }
});

// Update user
router.put('/users/:id', async (req, res) => {
  try {
    const { name, email, role, departmentId, active, isAdmin, emailActivated } = req.body || {};
    const data = await store.read();
    const user = data.users.find(u => u.id === req.params.id);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (name !== undefined) user.name = name;
    if (email !== undefined) user.email = email;
    if (role !== undefined) user.role = role;
    if (departmentId !== undefined) user.departmentId = departmentId;
    if (active !== undefined) user.active = active;
    if (isAdmin !== undefined) user.isAdmin = isAdmin ? 1 : 0;
    if (emailActivated !== undefined) user.emailActivated = emailActivated;

    await store.write(data);
    return res.json({ ok: true });
  } catch (e) {
    console.error('Update user error', e);
    return res.status(500).json({ error: 'Internal error' });
  }
});

// Create user
router.post('/users', async (req, res) => {
  try {
    const { name, email, role, departmentId, active, isAdmin, password } = req.body || {};
    if (!name || !email) {
      return res.status(400).json({ error: 'Name and email are required' });
    }

    const data = await store.read();
    const existing = data.users.find(u => u.email?.toLowerCase() === email.toLowerCase());
    if (existing) {
      return res.status(409).json({ error: 'User with this email already exists' });
    }

    const id = crypto.randomUUID();
    const passwordHash = password ? await bcrypt.hash(password, 10) : null;
    
    data.users.push({
      id,
      name,
      email,
      role: role || 'User',
      departmentId: departmentId || null,
      active: active !== undefined ? active : true,
      passwordHash,
      isAdmin: isAdmin ? 1 : 0,
      emailActivated: true, // Admin-created users are auto-activated
      activationToken: null,
      activationTokenExpiry: null,
      createdAt: new Date().toISOString()
    });

    await store.write(data);
    return res.json({ ok: true, id });
  } catch (e) {
    console.error('Create user error', e);
    return res.status(500).json({ error: 'Internal error' });
  }
});

// Delete user
router.delete('/users/:id', async (req, res) => {
  try {
    const data = await store.read();
    const index = data.users.findIndex(u => u.id === req.params.id);
    
    if (index === -1) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Prevent deleting yourself
    if (data.users[index].id === req.user.id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    data.users.splice(index, 1);
    await store.write(data);
    return res.json({ ok: true });
  } catch (e) {
    console.error('Delete user error', e);
    return res.status(500).json({ error: 'Internal error' });
  }
});

// Get user roles (for role management)
router.get('/roles', async (req, res) => {
  try {
    // Predefined list of available roles
    const predefinedRoles = [
      'Admin',
      'SeniorManagement',
      'PMO',
      'IT Manager',
      'IT PM',
      'ITPIC',
      'BusinessOwner',
      'User'
    ];
    
    const data = await store.read();
    // Get unique roles from users (to include any custom roles that might exist)
    const existingRoles = [...new Set(data.users.map(u => u.role).filter(Boolean))];
    
    // Combine predefined roles with existing custom roles, removing duplicates
    const allRoles = [...new Set([...predefinedRoles, ...existingRoles])];
    
    // Sort roles with predefined ones first, then custom ones
    const sortedRoles = [
      ...predefinedRoles.filter(r => allRoles.includes(r)),
      ...allRoles.filter(r => !predefinedRoles.includes(r))
    ];
    
    return res.json(sortedRoles);
  } catch (e) {
    console.error('Get roles error', e);
    return res.status(500).json({ error: 'Internal error' });
  }
});

// Update user roles in bulk
router.post('/users/bulk-update-roles', async (req, res) => {
  try {
    const { updates } = req.body || {}; // Array of { userId, role }
    if (!Array.isArray(updates)) {
      return res.status(400).json({ error: 'Updates must be an array' });
    }

    const data = await store.read();
    updates.forEach(({ userId, role }) => {
      const user = data.users.find(u => u.id === userId);
      if (user && role !== undefined) {
        user.role = role;
      }
    });

    await store.write(data);
    return res.json({ ok: true });
  } catch (e) {
    console.error('Bulk update roles error', e);
    return res.status(500).json({ error: 'Internal error' });
  }
});

export default router;

