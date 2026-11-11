import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { mutateDoc } from '../lib/store.js';
import { validateBody } from '../lib/validateBody.js';
import { bodyweightInputSchema } from '../validation.js';

const router = Router();

router.post('/bodyweight', validateBody(bodyweightInputSchema), async (req, res) => {
  const { date, weight, liftLabel, liftWeight, liftReps } = req.body as {
    date: string;
    weight: number;
    liftLabel?: string;
    liftWeight?: number;
    liftReps?: number;
  };

  const { doc, result } = await mutateDoc(d => {
    const existing = d.bodyweight.find(b => b.date === date);
    if (existing) {
      existing.weight = weight;
      existing.liftLabel = liftLabel;
      existing.liftWeight = liftWeight;
      existing.liftReps = liftReps;
      return existing.id;
    }
    const entry = { id: randomUUID(), date, weight, liftLabel, liftWeight, liftReps };
    d.bodyweight.push(entry);
    return entry.id;
  });

  const entry = doc.bodyweight.find(b => b.id === result);
  res.status(201).json({ entry, bodyweight: doc.bodyweight });
});

router.delete('/bodyweight/:id', async (req, res) => {
  const { doc } = await mutateDoc(d => {
    d.bodyweight = d.bodyweight.filter(b => b.id !== req.params.id);
  });
  res.json({ bodyweight: doc.bodyweight });
});

export default router;
