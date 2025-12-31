import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import path from 'path';
import { fileURLToPath } from 'url';
import db from './store.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(morgan('dev'));

// Static frontend
app.use(express.static(path.join(__dirname, 'public')));
// Serve docs folder for static assets (logo, etc)
app.use('/docs', express.static(path.join(__dirname, '..', 'docs')));

// API routes
import initiativesRouter from './routes/initiatives.js';
import dashboardRouter from './routes/dashboard.js';
import crDashboardRouter from './routes/cr-dashboard.js';
import dailySnapshotsRouter from './routes/daily-snapshots.js';
import lookupsRouter from './routes/lookups.js';
app.use('/api/initiatives', initiativesRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/cr-dashboard', crDashboardRouter);
app.use('/api/daily-snapshots', dailySnapshotsRouter);
app.use('/api/lookups', lookupsRouter);

// Health
app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0'; // Listen on all network interfaces
app.listen(PORT, HOST, () => {
  console.log(`Server listening on:`);
  console.log(`  - Local:   http://localhost:${PORT}`);
  console.log(`  - Network: http://172.30.18.102:${PORT}`);
  
  // Initialize daily snapshots on server start
  import('./daily-snapshots.js').then(m => {
    m.initializeDailySnapshots();
  });
});

// Daily snapshot creation - runs every 24 hours to track milestone durations
setInterval(async () => {
  try {
    const snapshotMod = await import('./daily-snapshots.js');
    snapshotMod.createDailySnapshot();
  } catch (e) {
    console.error('Daily snapshot error:', e.message);
  }
}, 24 * 60 * 60 * 1000); // 24 hours

// 5-minute Google Sheets auto-sync (Project and CR tabs) if env configured
const SHEET_ID = process.env.SHEET_ID;
const GID = process.env.GID;
const CR_GID = process.env.CR_GID;
if (SHEET_ID && GID) {
  const runSync = async () => {
    try {
      // Dynamic import to avoid circular deps
      const { default: fetchModule } = await import('node:fetch').catch(() => ({ default: undefined }));
      
      // Sync Project tab
      const projectMod = await import('./sync_google_sheets.js');
      await projectMod.default();
      
      // Sync CR tab if configured
      if (CR_GID) {
        const crMod = await import('./sync_google_sheets_cr.js');
        await crMod.default();
      }
      
      // Create daily snapshot after sync to capture changes
      const snapshotMod = await import('./daily-snapshots.js');
      snapshotMod.createDailySnapshot();
    } catch (e) {
      console.error('Auto-sync error:', e.message);
    }
  };
  setInterval(runSync, 5 * 60 * 1000);
  // initial sync on boot (non-blocking)
  runSync();
}


