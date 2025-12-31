import express from 'express';
import bcrypt from 'bcryptjs';
import store from '../store.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Get current user profile
router.get('/', async (req, res) => {
  try {
    const userId = req.user.id;
    const data = await store.read();
    const user = data.users.find(u => u.id === userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Return user data without password hash
    const { passwordHash, activationToken, activationTokenExpiry, ...userData } = user;
    res.json(userData);
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update user profile
router.put('/', async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, email, departmentId } = req.body;
    
    if (!name || !email) {
      return res.status(400).json({ error: 'Name and email are required' });
    }
    
    const data = await store.read();
    const userIndex = data.users.findIndex(u => u.id === userId);
    
    if (userIndex === -1) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Check if email is already taken by another user
    const existingUser = data.users.find(u => u.id !== userId && u.email?.toLowerCase() === email.toLowerCase());
    if (existingUser) {
      return res.status(409).json({ error: 'Email already in use by another user' });
    }
    
    // Update user data
    data.users[userIndex] = {
      ...data.users[userIndex],
      name,
      email,
      ...(departmentId !== undefined && { departmentId })
    };
    
    await store.write(data);
    
    // Return updated user data without password hash
    const { passwordHash, activationToken, activationTokenExpiry, ...updatedUser } = data.users[userIndex];
    res.json(updatedUser);
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Change password
router.put('/password', async (req, res) => {
  try {
    const userId = req.user.id;
    const { currentPassword, newPassword, confirmPassword } = req.body;
    
    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({ error: 'Current password, new password, and confirm password are required' });
    }
    
    if (newPassword !== confirmPassword) {
      return res.status(400).json({ error: 'New password and confirm password do not match' });
    }
    
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters' });
    }
    
    const data = await store.read();
    const userIndex = data.users.findIndex(u => u.id === userId);
    
    if (userIndex === -1) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const user = data.users[userIndex];
    
    // Verify current password
    if (!user.passwordHash) {
      return res.status(400).json({ error: 'Current password is not set' });
    }
    
    const isValidPassword = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }
    
    // Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, 10);
    
    // Update password
    data.users[userIndex] = {
      ...data.users[userIndex],
      passwordHash: newPasswordHash
    };
    
    await store.write(data);
    
    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

