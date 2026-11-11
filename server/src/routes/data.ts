import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { AppDataModel } from '../models/AppData.js';
import { DEFAULT_EXERCISES } from '../defaultExercises.js';

const router = Router();
const SINGLETON_ID = 'singleton';

router.get('/data', async (_req, res) => {
  let doc = await AppDataModel.findById(SINGLETON_ID).lean();
  if (!doc) {
    const created = await AppDataModel.create({
      _id: SINGLETON_ID,
      exercises: DEFAULT_EXERCISES.map(e => ({ id: randomUUID(), ...e })),
      workouts: [],
      bodyweight: [],
    });
    doc = created.toObject();
  }
  res.json(doc);
});

router.put('/data', async (req, res) => {
  const { exercises, workouts, bodyweight } = req.body;
  if (!Array.isArray(exercises) || !Array.isArray(workouts) || !Array.isArray(bodyweight)) {
    res.status(400).json({ error: 'Invalid payload: exercises, workouts, and bodyweight must be arrays' });
    return;
  }
  const doc = await AppDataModel.findByIdAndUpdate(
    SINGLETON_ID,
    { _id: SINGLETON_ID, exercises, workouts, bodyweight },
    { upsert: true, new: true },
  ).lean();
  res.json(doc);
});

export default router;
