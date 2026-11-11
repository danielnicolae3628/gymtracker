import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';

const app = createApp();

describe('bodyweight API', () => {
  it('creates a new bodyweight entry', async () => {
    const res = await request(app).post('/api/bodyweight').send({ date: '2026-02-01', weight: 80 });
    expect(res.status).toBe(201);
    expect(res.body.entry.weight).toBe(80);
  });

  it('upserts the same date instead of creating a duplicate', async () => {
    await request(app).post('/api/bodyweight').send({ date: '2026-02-02', weight: 81 });
    const res = await request(app)
      .post('/api/bodyweight')
      .send({ date: '2026-02-02', weight: 82, liftLabel: 'Bench', liftWeight: 60, liftReps: 8 });
    const entries = res.body.bodyweight.filter((b: { date: string }) => b.date === '2026-02-02');
    expect(entries).toHaveLength(1);
    expect(entries[0].weight).toBe(82);
    expect(entries[0].liftReps).toBe(8);
  });

  it('rejects a non-positive weight', async () => {
    const res = await request(app).post('/api/bodyweight').send({ date: '2026-02-03', weight: -5 });
    expect(res.status).toBe(400);
  });

  it('deletes a bodyweight entry', async () => {
    const created = await request(app).post('/api/bodyweight').send({ date: '2026-02-04', weight: 70 });
    const id = created.body.entry.id;
    const res = await request(app).delete(`/api/bodyweight/${id}`);
    expect(res.body.bodyweight.some((b: { id: string }) => b.id === id)).toBe(false);
  });
});
