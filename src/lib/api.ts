import type { AppData, BodyweightEntry, Exercise, SetEntry, Unit, Workout } from './types';

export const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: init?.body ? { 'Content-Type': 'application/json' } : undefined,
    ...init,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new ApiError(res.status, body?.error || `${init?.method || 'GET'} ${path} failed: ${res.status}`);
  }
  return res.json();
}

export function fetchAppData(): Promise<AppData> {
  return request('/data');
}

// Bulk replace — only for explicit whole-dataset operations (import, clear all).
export function saveAppData(data: AppData): Promise<AppData> {
  return request('/data', { method: 'PUT', body: JSON.stringify(data) });
}

export function createExercise(
  name: string,
  category: string,
  unit: Unit,
): Promise<{ exercise: Exercise; exercises: Exercise[] }> {
  return request('/exercises', { method: 'POST', body: JSON.stringify({ name, category, unit }) });
}

export function deleteExerciseApi(id: string): Promise<{ exercises: Exercise[] }> {
  return request(`/exercises/${id}`, { method: 'DELETE' });
}

export function commitSetsApi(
  date: string,
  exerciseId: string,
  sets: SetEntry[],
): Promise<{ workout: Workout; workouts: Workout[] }> {
  return request('/workouts/sets', { method: 'POST', body: JSON.stringify({ date, exerciseId, sets }) });
}

export function removeEntryApi(workoutId: string, entryId: string): Promise<{ workouts: Workout[] }> {
  return request(`/workouts/${workoutId}/entries/${entryId}`, { method: 'DELETE' });
}

export function removeSetApi(
  workoutId: string,
  entryId: string,
  setIndex: number,
): Promise<{ workouts: Workout[] }> {
  return request(`/workouts/${workoutId}/entries/${entryId}/sets/${setIndex}`, { method: 'DELETE' });
}

export function upsertBodyweightApi(
  date: string,
  weight: number,
  liftLabel?: string,
  liftWeight?: number,
  liftReps?: number,
): Promise<{ entry: BodyweightEntry; bodyweight: BodyweightEntry[] }> {
  return request('/bodyweight', {
    method: 'POST',
    body: JSON.stringify({ date, weight, liftLabel, liftWeight, liftReps }),
  });
}

export function deleteBodyweightApi(id: string): Promise<{ bodyweight: BodyweightEntry[] }> {
  return request(`/bodyweight/${id}`, { method: 'DELETE' });
}
