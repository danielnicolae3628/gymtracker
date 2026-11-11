import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { DataProvider, useData } from './DataContext';
import { ToastProvider } from './ToastContext';
import type { AppData } from '../lib/types';
import * as api from '../lib/api';

vi.mock('../lib/api', async () => {
  const actual = await vi.importActual<typeof api>('../lib/api');
  return {
    ...actual,
    fetchAppData: vi.fn(),
    saveAppData: vi.fn(),
    createExercise: vi.fn(),
    deleteExerciseApi: vi.fn(),
    commitSetsApi: vi.fn(),
    removeEntryApi: vi.fn(),
    removeSetApi: vi.fn(),
    upsertBodyweightApi: vi.fn(),
    deleteBodyweightApi: vi.fn(),
  };
});

const mockedApi = api as unknown as {
  fetchAppData: ReturnType<typeof vi.fn>;
  saveAppData: ReturnType<typeof vi.fn>;
  createExercise: ReturnType<typeof vi.fn>;
  deleteExerciseApi: ReturnType<typeof vi.fn>;
  commitSetsApi: ReturnType<typeof vi.fn>;
  removeEntryApi: ReturnType<typeof vi.fn>;
  removeSetApi: ReturnType<typeof vi.fn>;
  upsertBodyweightApi: ReturnType<typeof vi.fn>;
  deleteBodyweightApi: ReturnType<typeof vi.fn>;
};

function baseData(): AppData {
  return {
    exercises: [{ id: 'ex1', name: 'Bench Press', category: 'Chest', unit: 'kg' }],
    workouts: [],
    bodyweight: [],
  };
}

function wrapper({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <DataProvider>{children}</DataProvider>
    </ToastProvider>
  );
}

async function renderLoaded(initial: AppData = baseData()) {
  mockedApi.fetchAppData.mockResolvedValue(initial);
  const view = renderHook(() => useData(), { wrapper });
  await waitFor(() => expect(view.result.current.data.exercises.length).toBeGreaterThanOrEqual(0));
  return view;
}

afterEach(() => {
  vi.clearAllMocks();
});

describe('DataProvider', () => {
  it('loads data from the backend on mount', async () => {
    const data = baseData();
    const { result } = await renderLoaded(data);
    expect(result.current.data).toEqual(data);
  });

  it('addExercise: returns "created" and applies the server-confirmed exercise list', async () => {
    const { result } = await renderLoaded();
    const newExercises = [...baseData().exercises, { id: 'ex2', name: 'Squat', category: 'Legs', unit: 'kg' as const }];
    mockedApi.createExercise.mockResolvedValue({ exercise: newExercises[1], exercises: newExercises });

    let outcome;
    await act(async () => {
      outcome = await result.current.addExercise('Squat', 'Legs', 'kg');
    });

    expect(outcome).toBe('created');
    expect(result.current.data.exercises).toEqual(newExercises);
  });

  it('addExercise: returns "duplicate" on a 409 and leaves local data unchanged', async () => {
    const { result } = await renderLoaded();
    mockedApi.createExercise.mockRejectedValue(new api.ApiError(409, 'exists'));

    let outcome;
    await act(async () => {
      outcome = await result.current.addExercise('Bench Press', 'Chest', 'kg');
    });

    expect(outcome).toBe('duplicate');
    expect(result.current.data.exercises).toEqual(baseData().exercises);
  });

  it('addExercise: returns "error" on an unexpected failure', async () => {
    const { result } = await renderLoaded();
    mockedApi.createExercise.mockRejectedValue(new Error('network down'));

    let outcome;
    await act(async () => {
      outcome = await result.current.addExercise('Deadlift', 'Back', 'kg');
    });

    expect(outcome).toBe('error');
  });

  it('commitSets: reports a PR and applies the server-confirmed workouts', async () => {
    const initial: AppData = {
      exercises: baseData().exercises,
      workouts: [
        {
          id: 'w0',
          date: '2026-01-01',
          entries: [{ id: 'e0', exerciseId: 'ex1', sets: [{ weight: 60, reps: 8, rpe: null }] }],
        },
      ],
      bodyweight: [],
    };
    const { result } = await renderLoaded(initial);

    const newWorkouts = [
      ...initial.workouts,
      { id: 'w1', date: '2026-01-02', entries: [{ id: 'e1', exerciseId: 'ex1', sets: [{ weight: 70, reps: 8, rpe: null }] }] },
    ];
    mockedApi.commitSetsApi.mockResolvedValue({ workout: newWorkouts[1], workouts: newWorkouts });

    let wasPR;
    await act(async () => {
      // 70 * (1 + 8/30) > 60 * (1 + 8/30) -> this is a PR
      wasPR = await result.current.commitSets('2026-01-02', 'ex1', [{ weight: 70, reps: 8, rpe: null }]);
    });

    expect(wasPR).toBe(true);
    expect(result.current.data.workouts).toEqual(newWorkouts);
  });

  it('commitSets: does not report a PR for a lighter/equal set', async () => {
    const initial: AppData = {
      exercises: baseData().exercises,
      workouts: [
        {
          id: 'w0',
          date: '2026-01-01',
          entries: [{ id: 'e0', exerciseId: 'ex1', sets: [{ weight: 100, reps: 5, rpe: null }] }],
        },
      ],
      bodyweight: [],
    };
    const { result } = await renderLoaded(initial);
    mockedApi.commitSetsApi.mockResolvedValue({ workout: initial.workouts[0], workouts: initial.workouts });

    let wasPR;
    await act(async () => {
      wasPR = await result.current.commitSets('2026-01-01', 'ex1', [{ weight: 40, reps: 5, rpe: null }]);
    });

    expect(wasPR).toBe(false);
  });

  it('commitSets: returns null and leaves data unchanged when the save fails', async () => {
    const { result } = await renderLoaded();
    mockedApi.commitSetsApi.mockRejectedValue(new Error('network down'));

    let wasPR;
    await act(async () => {
      wasPR = await result.current.commitSets('2026-01-01', 'ex1', [{ weight: 50, reps: 5, rpe: null }]);
    });

    expect(wasPR).toBeNull();
    expect(result.current.data.workouts).toEqual([]);
  });

  it('getBestE1RM / getExerciseSeries compute correctly from loaded data', async () => {
    const initial: AppData = {
      exercises: baseData().exercises,
      workouts: [
        { id: 'w0', date: '2026-01-01', entries: [{ id: 'e0', exerciseId: 'ex1', sets: [{ weight: 100, reps: 5, rpe: null }] }] },
        { id: 'w1', date: '2026-01-08', entries: [{ id: 'e1', exerciseId: 'ex1', sets: [{ weight: 110, reps: 3, rpe: null }] }] },
      ],
      bodyweight: [],
    };
    const { result } = await renderLoaded(initial);

    // Epley: 100 * (1 + 5/30) ≈ 116.67, 110 * (1 + 3/30) = 121
    expect(result.current.getBestE1RM('ex1')).toBeCloseTo(121, 5);
    expect(result.current.getBestE1RM('ex1', '2026-01-08')).toBeCloseTo(116.666, 2);

    const series = result.current.getExerciseSeries('ex1');
    expect(series.map(p => p.date)).toEqual(['2026-01-01', '2026-01-08']);
    expect(series[1].topWeight).toBe(110);
  });

  it('removeEntry applies the server-confirmed workouts list', async () => {
    const initial: AppData = {
      exercises: baseData().exercises,
      workouts: [
        { id: 'w0', date: '2026-01-01', entries: [{ id: 'e0', exerciseId: 'ex1', sets: [{ weight: 50, reps: 5, rpe: null }] }] },
      ],
      bodyweight: [],
    };
    const { result } = await renderLoaded(initial);
    mockedApi.removeEntryApi.mockResolvedValue({ workouts: [] });

    await act(async () => {
      await result.current.removeEntry('w0', 'e0');
    });

    expect(result.current.data.workouts).toEqual([]);
  });

  it('addOrUpdateBodyweight returns false and leaves data unchanged on failure', async () => {
    const { result } = await renderLoaded();
    mockedApi.upsertBodyweightApi.mockRejectedValue(new Error('offline'));

    let ok;
    await act(async () => {
      ok = await result.current.addOrUpdateBodyweight('2026-01-01', 80);
    });

    expect(ok).toBe(false);
    expect(result.current.data.bodyweight).toEqual([]);
  });

  it('deleteExercise returns true and applies the server-confirmed list on success', async () => {
    const { result } = await renderLoaded();
    mockedApi.deleteExerciseApi.mockResolvedValue({ exercises: [] });

    let ok;
    await act(async () => {
      ok = await result.current.deleteExercise('ex1');
    });

    expect(ok).toBe(true);
    expect(result.current.data.exercises).toEqual([]);
  });
});
