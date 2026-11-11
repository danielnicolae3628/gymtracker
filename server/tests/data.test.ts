import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';

const app = createApp();

describe('data API (bulk)', () => {
  it('PUT replaces the whole document', async () => {
    const payload = {
      exercises: [{ id: 'e1', name: 'Test Ex', category: 'Other', unit: 'kg' }],
      workouts: [],
      bodyweight: [],
    };
    const res = await request(app).put('/api/data').send(payload);
    expect(res.status).toBe(200);
    expect(res.body.exercises).toHaveLength(1);
    expect(res.body.exercises[0].name).toBe('Test Ex');
  });

  it('rejects a malformed bulk payload', async () => {
    const res = await request(app).put('/api/data').send({ exercises: 'nope', workouts: [], bodyweight: [] });
    expect(res.status).toBe(400);
  });
});
