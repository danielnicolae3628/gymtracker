import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { mutateDoc } from '../lib/store.js';
import { validateBody } from '../lib/validateBody.js';
import { exerciseInputSchema } from '../validation.js';

const router = Router();

router.post('/exercises', validateBody(exerciseInputSchema), async (req, res) => {
  const { name, category, unit } = req.body as { name: string; category: string; unit: 'kg' | 'lb' };

  const { doc, result } = await mutateDoc(d => {
    const exists = d.exercises.some(e => e.name.toLowerCase() === name.toLowerCase());
    if (exists) return null;
    const exercise = { id: randomUUID(), name, category, unit };
    d.exercises.push(exercise);
    return exercise;
  });

  if (!result) {
    res.status(409).json({ error: 'An exercise with that name already exists' });
    return;
  }
  res.status(201).json({ exercise: result, exercises: doc.exercises });
});

router.delete('/exercises/:id', async (req, res) => {
  const { doc } = await mutateDoc(d => {
    d.exercises = d.exercises.filter(e => e.id !== req.params.id);
  });
  res.json({ exercises: doc.exercises });
});

export default router;
