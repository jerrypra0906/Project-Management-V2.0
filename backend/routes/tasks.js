import express from 'express';
import store from '../store.js';
import crypto from 'crypto';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

const now = () => new Date().toISOString();
const uuid = () => crypto.randomUUID();

// Get all tasks for an initiative
router.get('/initiative/:initiativeId', authenticateToken, async (req, res) => {
  const data = await store.read();
  const tasks = (data.tasks || []).filter(t => t.initiativeId === req.params.initiativeId);
  // Sort by createdAt descending (newest first)
  tasks.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  res.json(tasks);
});

// Get a single task
router.get('/:id', authenticateToken, async (req, res) => {
  const data = await store.read();
  const task = (data.tasks || []).find(t => t.id === req.params.id);
  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }
  res.json(task);
});

// Create a new task
router.post('/', authenticateToken, async (req, res) => {
  const { initiativeId, name, description, startDate, endDate, assigneeId, status, milestone } = req.body;
  if (!initiativeId || !name || !name.trim()) {
    return res.status(400).json({ error: 'initiativeId and name are required' });
  }
  
  const data = await store.read();
  const id = uuid();
  const createdAt = now();
  const task = {
    id,
    initiativeId,
    name: name.trim(),
    description: description || null,
    startDate: startDate || null,
    endDate: endDate || null,
    assigneeId: assigneeId || null,
    status: status || 'Not Started',
    milestone: milestone || null,
    createdAt,
    updatedAt: null
  };
  
  if (!data.tasks) data.tasks = [];
  data.tasks.push(task);
  await store.write(data);
  
  res.status(201).json(task);
});

// Bulk create tasks (for upload)
router.post('/bulk', authenticateToken, async (req, res) => {
  const { initiativeId, tasks: taskList } = req.body;
  if (!initiativeId || !Array.isArray(taskList) || taskList.length === 0) {
    return res.status(400).json({ error: 'initiativeId and tasks array are required' });
  }
  
  const data = await store.read();
  if (!data.tasks) data.tasks = [];
  
  const created = [];
  const nowTime = now();
  
  for (const t of taskList) {
    if (!t.name || !t.name.trim()) continue; // Skip tasks without name
    
    const id = uuid();
    const task = {
      id,
      initiativeId,
      name: t.name.trim(),
      description: t.description || null,
      startDate: t.startDate || null,
      endDate: t.endDate || null,
      assigneeId: t.assigneeId || null,
      status: t.status || 'Not Started',
      milestone: t.milestone || null,
      createdAt: nowTime,
      updatedAt: null
    };
    data.tasks.push(task);
    created.push(task);
  }
  
  await store.write(data);
  res.status(201).json({ created: created.length, tasks: created });
});

// Update a task
router.put('/:id', authenticateToken, async (req, res) => {
  const { name, description, startDate, endDate, assigneeId, status, milestone } = req.body;
  
  const data = await store.read();
  const task = (data.tasks || []).find(t => t.id === req.params.id);
  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }
  
  if (name !== undefined) task.name = name.trim();
  if (description !== undefined) task.description = description || null;
  if (startDate !== undefined) task.startDate = startDate || null;
  if (endDate !== undefined) task.endDate = endDate || null;
  if (assigneeId !== undefined) task.assigneeId = assigneeId || null;
  if (status !== undefined) task.status = status || null;
  if (milestone !== undefined) task.milestone = milestone || null;
  task.updatedAt = now();
  
  await store.write(data);
  res.json(task);
});

// Delete a task
router.delete('/:id', authenticateToken, async (req, res) => {
  const data = await store.read();
  const task = (data.tasks || []).find(t => t.id === req.params.id);
  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }
  
  data.tasks = (data.tasks || []).filter(t => t.id !== req.params.id);
  await store.write(data);
  
  res.json({ ok: true });
});

export default router;

