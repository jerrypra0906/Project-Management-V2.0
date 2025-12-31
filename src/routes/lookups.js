import express from 'express';
import store from '../store.js';

const router = express.Router();

router.get('/', (_req, res) => {
  const data = store.read();
  // Return minimal fields needed for display
  const users = data.users.map(u => ({ id: u.id, name: u.name }));
  const departments = data.departments.map(d => ({ id: d.id, name: d.name }));
  res.json({ users, departments });
});

export default router;



