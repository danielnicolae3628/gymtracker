import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';

const app = createApp();

describe('concurrent writes', () => {
  it('does not lose exercises created concurrently', async () => {
    const names = Array.from({ length: 8 }, (_, i) => `Concurrent-${i}`);
    await Promise.all(
      names.map(name => request(app).post('/api/exercises').send({ name, category: 'Other', unit: 'kg' })),
    );
    const res = await request(app).get('/api/data');
    const allFound = names.every(name => res.body.exercises.some((e: { name: string }) => e.name === name));
    expect(allFound).toBe(true);
  });

  it('does not lose sets appended concurrently to the same workout/entry', async () => {
    const exercises = (await request(app).get('/api/data')).body.exercises;
    const exerciseId = exercises[0].id;
    const date = '2026-03-01';
    await Promise.all(
      Array.from({ length: 6 }, (_, i) =>
        request(app)
          .post('/api/workouts/sets')
          .send({ date, exerciseId, sets: [{ weight: 10 + i, reps: 1, rpe: null }] }),
      ),
    );
    const res = await request(app).get('/api/data');
    const workout = res.body.workouts.find((w: { date: string }) => w.date === date);
    expect(workout.entries[0].sets).toHaveLength(6);
  });
});
