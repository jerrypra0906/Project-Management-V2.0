import express from 'express';
import store from '../store.js';
import crypto from 'crypto';
import { requireAdmin } from '../middleware/auth.js';

const router = express.Router();

const now = () => new Date().toISOString();

// Admin-only master data management
router.use(requireAdmin);

router.get('/', async (_req, res) => {
  const data = await store.read();
  const apps = (data.dwsApplications || []).slice().sort((a, b) => String(a.systemName || '').localeCompare(String(b.systemName || '')));
  res.json(apps);
});

router.post('/', async (req, res) => {
  const { systemName, productionUrl, stagingUrl, githubUrl } = req.body || {};
  if (!systemName || String(systemName).trim() === '') {
    return res.status(400).json({ error: 'System Name is required' });
  }
  const data = await store.read();
  if (!data.dwsApplications) data.dwsApplications = [];

  const id = crypto.randomUUID();
  const ts = now();
  data.dwsApplications.push({
    id,
    systemName: String(systemName).trim(),
    productionUrl: productionUrl ? String(productionUrl).trim() : null,
    stagingUrl: stagingUrl ? String(stagingUrl).trim() : null,
    githubUrl: githubUrl ? String(githubUrl).trim() : null,
    createdAt: ts,
    updatedAt: ts,
  });
  await store.write(data);
  res.status(201).json({ id });
});

router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { systemName, productionUrl, stagingUrl, githubUrl } = req.body || {};
  if (!systemName || String(systemName).trim() === '') {
    return res.status(400).json({ error: 'System Name is required' });
  }
  const data = await store.read();
  const idx = (data.dwsApplications || []).findIndex((a) => a.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });

  data.dwsApplications[idx] = {
    ...data.dwsApplications[idx],
    systemName: String(systemName).trim(),
    productionUrl: productionUrl ? String(productionUrl).trim() : null,
    stagingUrl: stagingUrl ? String(stagingUrl).trim() : null,
    githubUrl: githubUrl ? String(githubUrl).trim() : null,
    updatedAt: now(),
  };
  await store.write(data);
  res.json({ ok: true });
});

router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  const data = await store.read();
  const before = (data.dwsApplications || []).length;
  data.dwsApplications = (data.dwsApplications || []).filter((a) => a.id !== id);
  await store.write(data);
  res.json({ ok: true, deleted: before - data.dwsApplications.length });
});

export default router;

