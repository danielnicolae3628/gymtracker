import { Router } from 'express';
import { AppDataModel } from '../models/AppData.js';
import { getOrCreateDoc, SINGLETON_ID } from '../lib/store.js';
import { validateBody } from '../lib/validateBody.js';
import { fullDataInputSchema } from '../validation.js';

const router = Router();

router.get('/data', async (_req, res) => {
  const doc = await getOrCreateDoc();
  res.json(doc);
});

// Bulk replace — used only for explicit, whole-dataset operations
// (JSON import, "clear all data"), never for routine single-field edits.
router.put('/data', validateBody(fullDataInputSchema), async (req, res) => {
  const { exercises, workouts, bodyweight } = req.body;
  const doc = await AppDataModel.findByIdAndUpdate(
    SINGLETON_ID,
    { _id: SINGLETON_ID, exercises, workouts, bodyweight },
    { upsert: true, new: true },
  ).lean();
  res.json(doc);
});

export default router;
