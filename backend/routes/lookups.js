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
  const departments = data.departments.map(d => ({ id: d.id, name: d.name }));
  res.json({ users, departments });
});

export default router;

