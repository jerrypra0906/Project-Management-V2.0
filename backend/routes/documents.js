import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import store from '../store.js';
import crypto from 'crypto';
import { authenticateToken } from '../middleware/auth.js';
import { sendCRCreationEmail } from '../services/email.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

const now = () => new Date().toISOString();
const uuid = () => crypto.randomUUID();

// Ensure uploads directory exists
// Use /app/uploads instead of /app/backend/uploads for better compatibility
const uploadsDir = path.join(process.cwd(), 'uploads');

// Create uploads directory synchronously on module load
(async () => {
  try {
    await fs.mkdir(uploadsDir, { recursive: true });
  } catch (error) {
    console.error('Error creating uploads directory:', error);
  }
})();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      // Ensure directory exists (should already exist from Dockerfile, but double-check)
      await fs.mkdir(uploadsDir, { recursive: true });
      cb(null, uploadsDir);
    } catch (error) {
      console.error('Error ensuring uploads directory exists:', error);
      cb(error, null);
    }
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuid()}-${file.originalname}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB max file size
  }
});

// Get all documents for an initiative
router.get('/initiative/:initiativeId', authenticateToken, async (req, res) => {
  const data = await store.read();
  const documents = (data.documents || []).filter(d => d.initiativeId === req.params.initiativeId);
  // Sort by uploadedAt descending (newest first)
  documents.sort((a, b) => (b.uploadedAt || '').localeCompare(a.uploadedAt || ''));
  res.json(documents);
});

// Upload a document
router.post('/', authenticateToken, upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const { initiativeId } = req.body;
  if (!initiativeId) {
    // Clean up uploaded file if initiativeId is missing
    await fs.unlink(req.file.path).catch(() => {});
    return res.status(400).json({ error: 'initiativeId is required' });
  }

  const data = await store.read();
  const id = uuid();
  const uploadedAt = now();
  
  const document = {
    id,
    initiativeId,
    fileName: req.file.originalname,
    filePath: req.file.path,
    sizeBytes: req.file.size,
    uploadedBy: req.user.id,
    uploadedAt
  };

  if (!data.documents) data.documents = [];
  data.documents.push(document);
  await store.write(data);

  // Check if this is a CR and send email with documents (only once)
  try {
    const initiative = data.initiatives.find(i => i.id === initiativeId);
    if (initiative && initiative.type === 'CR') {
      // Check if CR was created recently (within 10 minutes) to send email with documents
      const crCreatedAt = new Date(initiative.createdAt);
      const now = new Date();
      const minutesSinceCreation = (now - crCreatedAt) / (1000 * 60);
      
      // Only send email if CR was created recently (to avoid sending emails for old CRs when documents are added later)
      if (minutesSinceCreation <= 10) {
        // Get all documents for this CR
        const allDocuments = (data.documents || []).filter(d => d.initiativeId === initiativeId);
        
        // Check if email was already sent for this CR
        const emailFlag = `cr_email_pending_${initiativeId}`;
        const flag = global[emailFlag];
        
        // Only send email if it hasn't been sent yet
        if (flag && !flag.sent) {
          // Get user lookups for email addresses
          const userLookups = data.users.map(u => ({
            id: u.id,
            name: u.name,
            email: u.email || null
          }));
          
          // Prepare CR data for email
          const crData = {
            name: initiative.name,
            description: initiative.description,
            businessImpact: initiative.businessImpact,
            priority: initiative.priority,
            businessOwnerId: initiative.businessOwnerId,
            businessUserIds: initiative.businessUserIds,
            itPicId: initiative.itPicId,
            itPicIds: initiative.itPicIds,
            itManagerIds: initiative.itManagerIds
          };
          
          console.log(`[CR EMAIL] Sending email for CR ${initiative.name} with ${allDocuments.length} document(s)`);
          
          // Mark as sent before sending to prevent duplicates
          flag.sent = true;
          
          // Send email with all documents (asynchronously, don't block response)
          sendCRCreationEmail(crData, userLookups, allDocuments).then(() => {
            console.log(`[CR EMAIL] Email sent successfully for CR ${initiative.name}`);
            delete global[emailFlag];
          }).catch(error => {
            console.error('[EMAIL ERROR] Failed to send CR creation email with documents:', error);
            flag.sent = false; // Reset flag on error so we can retry
          });
        } else if (!flag) {
          console.log(`[CR EMAIL] Email already sent or CR is older than 10 minutes for ${initiative.name}`);
        }
      }
    }
  } catch (emailError) {
    console.error('[EMAIL ERROR] Error sending CR creation email:', emailError);
    // Don't fail the document upload if email fails
  }

  res.status(201).json(document);
});

// Download a document
router.get('/:id/download', authenticateToken, async (req, res) => {
  const data = await store.read();
  const document = (data.documents || []).find(d => d.id === req.params.id);
  
  if (!document) {
    return res.status(404).json({ error: 'Document not found' });
  }

  try {
    const filePath = document.filePath;
    const fileExists = await fs.access(filePath).then(() => true).catch(() => false);
    
    if (!fileExists) {
      return res.status(404).json({ error: 'File not found on server' });
    }

    res.download(filePath, document.fileName, (err) => {
      if (err) {
        console.error('Error downloading file:', err);
        if (!res.headersSent) {
          res.status(500).json({ error: 'Error downloading file' });
        }
      }
    });
  } catch (error) {
    console.error('Error serving file:', error);
    res.status(500).json({ error: 'Error serving file' });
  }
});

// Delete a document
router.delete('/:id', authenticateToken, async (req, res) => {
  const data = await store.read();
  const document = (data.documents || []).find(d => d.id === req.params.id);
  
  if (!document) {
    return res.status(404).json({ error: 'Document not found' });
  }

  // Only author or admin can delete
  if (document.uploadedBy !== req.user.id && !req.user.isAdmin) {
    return res.status(403).json({ error: 'You can only delete your own documents' });
  }

  // Delete file from filesystem
  try {
    await fs.unlink(document.filePath).catch(() => {
      // File might already be deleted, continue anyway
    });
  } catch (error) {
    console.error('Error deleting file:', error);
  }

  // Remove from database
  data.documents = (data.documents || []).filter(d => d.id !== req.params.id);
  await store.write(data);

  res.json({ ok: true });
});

export default router;

