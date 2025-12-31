import express from 'express';
import { 
  createDailySnapshot, 
  initializeDailySnapshots, 
  getAllMilestoneDurations,
  getMilestoneDurationBreakdown 
} from '../daily-snapshots.js';

const router = express.Router();

// Initialize daily snapshots system
router.post('/initialize', async (_req, res) => {
  try {
    await initializeDailySnapshots();
    res.json({ success: true, message: 'Daily snapshots system initialized' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create a daily snapshot for today
router.post('/create', async (_req, res) => {
  try {
    const snapshot = await createDailySnapshot();
    res.json({ success: true, snapshot });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get milestone durations for all initiatives
router.get('/milestone-durations', async (req, res) => {
  try {
    const { type } = req.query;
    const durations = await getAllMilestoneDurations(type);
    res.json(durations);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get milestone duration breakdown for a specific initiative
router.get('/milestone-durations/:initiativeId', async (req, res) => {
  try {
    const { initiativeId } = req.params;
    const breakdown = await getMilestoneDurationBreakdown(initiativeId);
    res.json(breakdown);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;

