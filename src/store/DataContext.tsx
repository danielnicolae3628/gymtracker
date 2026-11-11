import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { AppData, Exercise, SeriesPoint, SetEntry, Unit } from '../lib/types';
import { DEFAULT_EXERCISES } from '../lib/defaultExercises';
import { epley, uid } from '../lib/utils';
import { useToast } from './ToastContext';
import {
  API_BASE,
  ApiError,
  commitSetsApi,
  createExercise,
  deleteBodyweightApi,
  deleteExerciseApi,
  fetchAppData,
  removeEntryApi,
  removeSetApi,
  saveAppData,
  upsertBodyweightApi,
} from '../lib/api';

function freshData(): AppData {
  return {
    exercises: DEFAULT_EXERCISES.map(e => ({ id: uid(), ...e })),
    workouts: [],
    bodyweight: [],
  };
}

export type AddExerciseResult = 'created' | 'duplicate' | 'error';

interface DataContextValue {
  data: AppData;
  getExercise: (id: string) => Exercise | undefined;
  addExercise: (name: string, category: string, unit: Unit) => Promise<AddExerciseResult>;
  deleteExercise: (id: string) => Promise<boolean>;
  usageCount: (exerciseId: string) => number;
  /** Returns whether the new sets set a PR, or null if the save failed. */
  commitSets: (date: string, exerciseId: string, sets: SetEntry[]) => Promise<boolean | null>;
  removeSet: (workoutId: string, entryId: string, setIndex: number) => Promise<void>;
  removeEntry: (workoutId: string, entryId: string) => Promise<void>;
  findLastSetForExercise: (exerciseId: string) => SetEntry | null;
  getBestE1RM: (exerciseId: string, beforeDate?: string) => number;
  getExerciseSeries: (exerciseId: string) => SeriesPoint[];
  addOrUpdateBodyweight: (
    date: string,
    weight: number,
    liftLabel?: string,
    liftWeight?: number,
    liftReps?: number,
  ) => Promise<boolean>;
  deleteBodyweight: (id: string) => Promise<void>;
  importData: (parsed: unknown) => Promise<void>;
  clearAll: () => Promise<void>;
}

const DataContext = createContext<DataContextValue | null>(null);

const SAVE_FAILED_MSG = '⚠️ Could not save — backend unreachable';

export function DataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>({ exercises: [], workouts: [], bodyweight: [] });
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const toast = useToast();

  useEffect(() => {
    fetchAppData()
      .then(d => {
        setData(d);
        setLoaded(true);
      })
      .catch(() => {
        setLoadError(true);
        setLoaded(true);
      });
  }, []);

  const getExercise = useCallback((id: string) => data.exercises.find(e => e.id === id), [data.exercises]);

  const addExercise = useCallback(
    async (name: string, category: string, unit: Unit): Promise<AddExerciseResult> => {
      const trimmed = name.trim();
      if (!trimmed) return 'error';
      try {
        const { exercises } = await createExercise(trimmed, category, unit);
        setData(d => ({ ...d, exercises }));
        return 'created';
      } catch (err) {
        if (err instanceof ApiError && err.status === 409) return 'duplicate';
        toast(SAVE_FAILED_MSG);
        return 'error';
      }
    },
    [toast],
  );

  const usageCount = useCallback((exerciseId: string) => {
    return data.workouts.reduce(
      (n, w) => n + w.entries.filter(e => e.exerciseId === exerciseId).length,
      0,
    );
  }, [data.workouts]);

  const deleteExercise = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        const { exercises } = await deleteExerciseApi(id);
        setData(d => ({ ...d, exercises }));
        return true;
      } catch {
        toast(SAVE_FAILED_MSG);
        return false;
      }
    },
    [toast],
  );

  const getBestE1RM = useCallback((exerciseId: string, beforeDate?: string) => {
    let best = 0;
    for (const w of data.workouts) {
      if (beforeDate != null && !(w.date < beforeDate)) continue;
      for (const e of w.entries) {
        if (e.exerciseId !== exerciseId) continue;
        for (const s of e.sets) {
          const e1 = epley(s.weight, s.reps);
          if (e1 > best) best = e1;
        }
      }
    }
    return best;
  }, [data.workouts]);

  const commitSets = useCallback(
    async (date: string, exerciseId: string, sets: SetEntry[]): Promise<boolean | null> => {
      if (!sets.length) return false;
      const bestBefore = getBestE1RM(exerciseId);
      const bestNew = Math.max(...sets.map(s => epley(s.weight, s.reps)));
      const wasPR = bestNew > bestBefore;

      try {
        const { workouts } = await commitSetsApi(date, exerciseId, sets);
        setData(d => ({ ...d, workouts }));
        return wasPR;
      } catch {
        toast(SAVE_FAILED_MSG);
        return null;
      }
    },
    [getBestE1RM, toast],
  );

  const removeSet = useCallback(
    async (workoutId: string, entryId: string, setIndex: number) => {
      try {
        const { workouts } = await removeSetApi(workoutId, entryId, setIndex);
        setData(d => ({ ...d, workouts }));
      } catch {
        toast(SAVE_FAILED_MSG);
      }
    },
    [toast],
  );

  const removeEntry = useCallback(
    async (workoutId: string, entryId: string) => {
      try {
        const { workouts } = await removeEntryApi(workoutId, entryId);
        setData(d => ({ ...d, workouts }));
      } catch {
        toast(SAVE_FAILED_MSG);
      }
    },
    [toast],
  );

  const findLastSetForExercise = useCallback((exerciseId: string): SetEntry | null => {
    const workouts = data.workouts
      .filter(w => w.entries.some(e => e.exerciseId === exerciseId))
      .slice()
      .sort((a, b) => b.date.localeCompare(a.date));
    for (const w of workouts) {
      const entry = w.entries.find(e => e.exerciseId === exerciseId);
      if (entry && entry.sets.length) return entry.sets[entry.sets.length - 1];
    }
    return null;
  }, [data.workouts]);

  const getExerciseSeries = useCallback((exerciseId: string): SeriesPoint[] => {
    const points: SeriesPoint[] = [];
    data.workouts
      .filter(w => w.entries.some(e => e.exerciseId === exerciseId))
      .slice()
      .sort((a, b) => a.date.localeCompare(b.date))
      .forEach(w => {
        const entry = w.entries.find(e => e.exerciseId === exerciseId)!;
        const topWeight = Math.max(...entry.sets.map(s => s.weight));
        const bestE1rm = Math.max(...entry.sets.map(s => epley(s.weight, s.reps)));
        const volume = entry.sets.reduce((v, s) => v + s.weight * s.reps, 0);
        points.push({ date: w.date, topWeight, bestE1rm, volume, sets: entry.sets });
      });
    return points;
  }, [data.workouts]);

  const addOrUpdateBodyweight = useCallback(
    async (date: string, weight: number, liftLabel?: string, liftWeight?: number, liftReps?: number) => {
      try {
        const { bodyweight } = await upsertBodyweightApi(date, weight, liftLabel, liftWeight, liftReps);
        setData(d => ({ ...d, bodyweight }));
        return true;
      } catch {
        toast(SAVE_FAILED_MSG);
        return false;
      }
    },
    [toast],
  );

  const deleteBodyweight = useCallback(
    async (id: string) => {
      try {
        const { bodyweight } = await deleteBodyweightApi(id);
        setData(d => ({ ...d, bodyweight }));
      } catch {
        toast(SAVE_FAILED_MSG);
      }
    },
    [toast],
  );

  const importData = useCallback(
    async (parsed: unknown) => {
      const p = parsed as Partial<AppData>;
      if (!p.exercises || !p.workouts) throw new Error('Invalid format');
      const full: AppData = { exercises: p.exercises, workouts: p.workouts, bodyweight: p.bodyweight || [] };
      const saved = await saveAppData(full);
      setData(saved);
    },
    [],
  );

  const clearAll = useCallback(async () => {
    const saved = await saveAppData(freshData());
    setData(saved);
  }, []);

  const value = useMemo<DataContextValue>(
    () => ({
      data,
      getExercise,
      addExercise,
      deleteExercise,
      usageCount,
      commitSets,
      removeSet,
      removeEntry,
      findLastSetForExercise,
      getBestE1RM,
      getExerciseSeries,
      addOrUpdateBodyweight,
      deleteBodyweight,
      importData,
      clearAll,
    }),
    [
      data,
      getExercise,
      addExercise,
      deleteExercise,
      usageCount,
      commitSets,
      removeSet,
      removeEntry,
      findLastSetForExercise,
      getBestE1RM,
      getExerciseSeries,
      addOrUpdateBodyweight,
      deleteBodyweight,
      importData,
      clearAll,
    ],
  );

  if (!loaded) {
    return <div className="app-loading">Loading your data…</div>;
  }

  if (loadError) {
    return (
      <div className="app-loading">
        ⚠️ Could not reach the backend at {API_BASE}.<br />
        Make sure the server (and MongoDB) are running, then reload.
      </div>
    );
  }

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData(): DataContextValue {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within DataProvider');
  return ctx;
}
