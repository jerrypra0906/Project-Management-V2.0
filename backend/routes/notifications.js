import express from 'express';
import store from '../store.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// All notification routes require authentication
router.use(authenticateToken);

// Get all notifications for the current user
router.get('/', async (req, res) => {
  try {
    const data = await store.read();
    console.log('Get notifications - Current user ID:', req.user.id);
    console.log('Total notifications in DB:', (data.notifications || []).length);
    console.log('All notification user IDs:', (data.notifications || []).map(n => ({ id: n.id, userId: n.userId, title: n.title })));
    
    const notifications = (data.notifications || [])
      .filter(n => n.userId === req.user.id)
      .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')); // Newest first
    
    console.log('Filtered notifications for user:', notifications.length);
    res.json(notifications);
  } catch (e) {
    console.error('Get notifications error', e);
    return res.status(500).json({ error: 'Internal error' });
  }
});

// Get unread notification count
router.get('/unread-count', async (req, res) => {
  try {
    const data = await store.read();
    const unreadCount = (data.notifications || [])
      .filter(n => n.userId === req.user.id && !n.read)
      .length;
    
    res.json({ count: unreadCount });
  } catch (e) {
    console.error('Get unread count error', e);
    return res.status(500).json({ error: 'Internal error' });
  }
});

// Mark notification as read
router.put('/:id/read', async (req, res) => {
  try {
    const data = await store.read();
    const notification = (data.notifications || []).find(n => n.id === req.params.id);
    
    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    
    // Only the owner can mark as read
    if (notification.userId !== req.user.id) {
      return res.status(403).json({ error: 'You can only mark your own notifications as read' });
    }
    
    notification.read = true;
    await store.write(data);
    
    res.json({ ok: true });
  } catch (e) {
    console.error('Mark notification as read error', e);
    return res.status(500).json({ error: 'Internal error' });
  }
});

// Mark all notifications as read
router.put('/read-all', async (req, res) => {
  try {
    const data = await store.read();
    const userNotifications = (data.notifications || []).filter(n => n.userId === req.user.id && !n.read);
    
    userNotifications.forEach(n => {
      n.read = true;
    });
    
    await store.write(data);
    
    res.json({ ok: true, count: userNotifications.length });
  } catch (e) {
    console.error('Mark all notifications as read error', e);
    return res.status(500).json({ error: 'Internal error' });
  }
});

export default router;

