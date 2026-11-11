import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { mutateDoc } from '../lib/store.js';
import { validateBody } from '../lib/validateBody.js';
import { commitSetsInputSchema } from '../validation.js';
import type { SetEntry } from '../models/AppData.js';

const router = Router();

router.post('/workouts/sets', validateBody(commitSetsInputSchema), async (req, res) => {
  const { date, exerciseId, sets } = req.body as { date: string; exerciseId: string; sets: SetEntry[] };

  const { doc, result } = await mutateDoc(d => {
    let workout = d.workouts.find(w => w.date === date);
    if (!workout) {
      // Mongoose casts pushed plain objects into subdocuments, so the
      // local variable must be re-read from the array afterward — the
      // original object is a detached copy and mutating it is a no-op.
      d.workouts.push({ id: randomUUID(), date, entries: [] });
      workout = d.workouts[d.workouts.length - 1];
    }
    let entry = workout.entries.find(e => e.exerciseId === exerciseId);
    if (!entry) {
      workout.entries.push({ id: randomUUID(), exerciseId, sets: [] });
      entry = workout.entries[workout.entries.length - 1];
    }
    entry.sets.push(...sets.map(s => ({ weight: s.weight, reps: s.reps, rpe: s.rpe ?? null })));
    return workout.id;
  });

  const workout = doc.workouts.find(w => w.id === result);
  res.status(201).json({ workout, workouts: doc.workouts });
});

router.delete('/workouts/:workoutId/entries/:entryId', async (req, res) => {
  const { workoutId, entryId } = req.params;

  const { doc } = await mutateDoc(d => {
    const workout = d.workouts.find(w => w.id === workoutId);
    if (!workout) return;
    workout.entries = workout.entries.filter(e => e.id !== entryId);
    if (!workout.entries.length) {
      d.workouts = d.workouts.filter(w => w.id !== workoutId);
    }
  });

  res.json({ workouts: doc.workouts });
});

router.delete('/workouts/:workoutId/entries/:entryId/sets/:setIndex', async (req, res) => {
  const { workoutId, entryId } = req.params;
  const setIndex = Number(req.params.setIndex);

  const { doc } = await mutateDoc(d => {
    const workout = d.workouts.find(w => w.id === workoutId);
    if (!workout) return;
    const entry = workout.entries.find(e => e.id === entryId);
    if (!entry) return;
    entry.sets = entry.sets.filter((_, i) => i !== setIndex);
    if (!entry.sets.length) {
      workout.entries = workout.entries.filter(e => e.id !== entryId);
    }
    if (!workout.entries.length) {
      d.workouts = d.workouts.filter(w => w.id !== workoutId);
    }
  });

  res.json({ workouts: doc.workouts });
});

export default router;
