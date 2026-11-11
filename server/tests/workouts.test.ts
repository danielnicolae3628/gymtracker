import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';

const app = createApp();

async function getExerciseId(): Promise<string> {
  const res = await request(app).get('/api/data');
  return res.body.exercises[0].id;
}

describe('workouts API', () => {
  it('creates a new workout+entry when committing sets for the first time', async () => {
    const exerciseId = await getExerciseId();
    const res = await request(app)
      .post('/api/workouts/sets')
      .send({ date: '2026-01-01', exerciseId, sets: [{ weight: 100, reps: 5, rpe: 8 }] });
    expect(res.status).toBe(201);
    expect(res.body.workout.entries).toHaveLength(1);
    expect(res.body.workout.entries[0].sets).toEqual([{ weight: 100, reps: 5, rpe: 8 }]);
  });

  it('appends sets to an existing entry for the same exercise/date', async () => {
    const exerciseId = await getExerciseId();
    await request(app)
      .post('/api/workouts/sets')
      .send({ date: '2026-01-02', exerciseId, sets: [{ weight: 50, reps: 10, rpe: null }] });
    const res = await request(app)
      .post('/api/workouts/sets')
      .send({ date: '2026-01-02', exerciseId, sets: [{ weight: 55, reps: 8, rpe: null }] });
    expect(res.body.workout.entries).toHaveLength(1);
    expect(res.body.workout.entries[0].sets).toHaveLength(2);
  });

  it('rejects an invalid date format', async () => {
    const exerciseId = await getExerciseId();
    const res = await request(app)
      .post('/api/workouts/sets')
      .send({ date: '01-03-2026', exerciseId, sets: [{ weight: 1, reps: 1 }] });
    expect(res.status).toBe(400);
  });

  it('rejects an empty sets array', async () => {
    const exerciseId = await getExerciseId();
    const res = await request(app)
      .post('/api/workouts/sets')
      .send({ date: '2026-01-03', exerciseId, sets: [] });
    expect(res.status).toBe(400);
  });

  it('removes a single set and cascades to remove the now-empty entry/workout', async () => {
    const exerciseId = await getExerciseId();
    const commit = await request(app)
      .post('/api/workouts/sets')
      .send({ date: '2026-01-04', exerciseId, sets: [{ weight: 1, reps: 1, rpe: null }] });
    const workoutId = commit.body.workout.id;
    const entryId = commit.body.workout.entries[0].id;
    const res = await request(app).delete(`/api/workouts/${workoutId}/entries/${entryId}/sets/0`);
    expect(res.status).toBe(200);
    expect(res.body.workouts.some((w: { id: string }) => w.id === workoutId)).toBe(false);
  });

  it('removes an entry directly, cascading to remove the empty workout', async () => {
    const exerciseId = await getExerciseId();
    const commit = await request(app)
      .post('/api/workouts/sets')
      .send({ date: '2026-01-05', exerciseId, sets: [{ weight: 1, reps: 1, rpe: null }] });
    const workoutId = commit.body.workout.id;
    const entryId = commit.body.workout.entries[0].id;
    const res = await request(app).delete(`/api/workouts/${workoutId}/entries/${entryId}`);
    expect(res.body.workouts.some((w: { id: string }) => w.id === workoutId)).toBe(false);
  });
});
