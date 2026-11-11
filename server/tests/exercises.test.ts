import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';

const app = createApp();

describe('exercises API', () => {
  it('GET /api/data seeds default exercises on first load', async () => {
    const res = await request(app).get('/api/data');
    expect(res.status).toBe(200);
    expect(res.body.exercises.length).toBeGreaterThan(0);
    expect(res.body.workouts).toEqual([]);
  });

  it('creates a new exercise', async () => {
    const res = await request(app)
      .post('/api/exercises')
      .send({ name: 'Front Squat', category: 'Legs', unit: 'kg' });
    expect(res.status).toBe(201);
    expect(res.body.exercise.name).toBe('Front Squat');
    expect(res.body.exercises.some((e: { name: string }) => e.name === 'Front Squat')).toBe(true);
  });

  it('rejects an invalid unit', async () => {
    const res = await request(app)
      .post('/api/exercises')
      .send({ name: 'Bad', category: 'Legs', unit: 'stones' });
    expect(res.status).toBe(400);
  });

  it('rejects a blank name', async () => {
    const res = await request(app)
      .post('/api/exercises')
      .send({ name: '   ', category: 'Legs', unit: 'kg' });
    expect(res.status).toBe(400);
  });

  it('rejects a duplicate name (case-insensitive)', async () => {
    await request(app).post('/api/exercises').send({ name: 'Dup', category: 'Legs', unit: 'kg' });
    const res = await request(app).post('/api/exercises').send({ name: 'dup', category: 'Legs', unit: 'kg' });
    expect(res.status).toBe(409);
  });

  it('deletes an exercise', async () => {
    const created = await request(app)
      .post('/api/exercises')
      .send({ name: 'ToDelete', category: 'Other', unit: 'kg' });
    const id = created.body.exercise.id;
    const res = await request(app).delete(`/api/exercises/${id}`);
    expect(res.status).toBe(200);
    expect(res.body.exercises.some((e: { id: string }) => e.id === id)).toBe(false);
  });
});
