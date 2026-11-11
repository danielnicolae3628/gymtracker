import express, { type Express } from 'express';
import cors from 'cors';
import dataRouter from './routes/data.js';
import exercisesRouter from './routes/exercises.js';
import workoutsRouter from './routes/workouts.js';
import bodyweightRouter from './routes/bodyweight.js';

export function createApp(): Express {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: '2mb' }));

  app.get('/health', (_req, res) => res.json({ ok: true }));
  app.use('/api', dataRouter);
  app.use('/api', exercisesRouter);
  app.use('/api', workoutsRouter);
  app.use('/api', bodyweightRouter);

  return app;
}
