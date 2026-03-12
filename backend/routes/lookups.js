import express from 'express';
import store from '../store.js';

const router = express.Router();

router.get('/', async (_req, res) => {
  const data = await store.read();
  // Return fields needed for display and filtering
  const users = data.users.map(u => ({ 
    id: u.id, 
    name: u.name,
    email: u.email || null,
    active: u.active !== undefined ? u.active : true, // Default to true if not set
    role: u.role || null,
    type: u.type || null
  }));
  // Department display normalization (UI naming)
  const normalizeDepartmentName = (name) => {
    const n = String(name || '').trim();
    if (!n) return n;
    if (n.toLowerCase() === 'operation') return 'Industrial';
    if (n.toLowerCase() === 'trader') return 'Commercial';
    return n;
  };
  const departments = data.departments.map(d => ({ id: d.id, name: normalizeDepartmentName(d.name) }));
  res.json({ users, departments });
});

export default router;

