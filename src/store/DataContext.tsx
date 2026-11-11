import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { AppData, BodyweightEntry, Exercise, SeriesPoint, SetEntry, Unit, WorkoutEntry } from '../lib/types';
import { DEFAULT_EXERCISES } from '../lib/defaultExercises';
import { epley, uid } from '../lib/utils';
import { useToast } from './ToastContext';

const STORAGE_KEY = 'ironlog.v1';

function freshData(): AppData {
  return {
    exercises: DEFAULT_EXERCISES.map(e => ({ id: uid(), ...e })),
    workouts: [],
    bodyweight: [],
  };
}

function loadInitialData(): AppData {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as AppData;
      if (!parsed.bodyweight) parsed.bodyweight = [];
      return parsed;
    } catch {
      /* fall through to fresh data */
    }
  }
  return freshData();
}

interface DataContextValue {
  data: AppData;
  getExercise: (id: string) => Exercise | undefined;
  addExercise: (name: string, category: string, unit: Unit) => boolean;
  deleteExercise: (id: string) => void;
  usageCount: (exerciseId: string) => number;
  commitSets: (date: string, exerciseId: string, sets: SetEntry[]) => boolean;
  removeSet: (workoutId: string, entryId: string, setIndex: number) => void;
  removeEntry: (workoutId: string, entryId: string) => void;
  findLastSetForExercise: (exerciseId: string) => SetEntry | null;
  getBestE1RM: (exerciseId: string, beforeDate?: string) => number;
  getExerciseSeries: (exerciseId: string) => SeriesPoint[];
  addOrUpdateBodyweight: (date: string, weight: number, liftLabel?: string, liftWeight?: number, liftReps?: number) => void;
  deleteBodyweight: (id: string) => void;
  importData: (parsed: unknown) => void;
  clearAll: () => void;
}

const DataContext = createContext<DataContextValue | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(loadInitialData);
  const toast = useToast();

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      toast('⚠️ Could not save — storage may be full or unavailable');
    }
  }, [data, toast]);

  const getExercise = useCallback((id: string) => data.exercises.find(e => e.id === id), [data.exercises]);

  const addExercise = useCallback((name: string, category: string, unit: Unit): boolean => {
    const trimmed = name.trim();
    if (!trimmed) return false;
    if (data.exercises.some(e => e.name.toLowerCase() === trimmed.toLowerCase())) return false;
    setData(d => ({ ...d, exercises: [...d.exercises, { id: uid(), name: trimmed, category, unit }] }));
    return true;
  }, [data.exercises]);

  const usageCount = useCallback((exerciseId: string) => {
    return data.workouts.reduce(
      (n, w) => n + w.entries.filter(e => e.exerciseId === exerciseId).length,
      0,
    );
  }, [data.workouts]);

  const deleteExercise = useCallback((id: string) => {
    setData(d => ({ ...d, exercises: d.exercises.filter(e => e.id !== id) }));
  }, []);

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
    (date: string, exerciseId: string, sets: SetEntry[]): boolean => {
      if (!sets.length) return false;
      const bestBefore = getBestE1RM(exerciseId);
      const bestNew = Math.max(...sets.map(s => epley(s.weight, s.reps)));
      const wasPR = bestNew > bestBefore;

      setData(d => {
        const workouts = d.workouts.slice();
        let wIdx = workouts.findIndex(w => w.date === date);
        let workout;
        if (wIdx === -1) {
          workout = { id: uid(), date, entries: [] as WorkoutEntry[] };
          wIdx = workouts.length;
          workouts.push(workout);
        } else {
          workout = { ...workouts[wIdx], entries: workouts[wIdx].entries.slice() };
          workouts[wIdx] = workout;
        }
        const eIdx = workout.entries.findIndex(e => e.exerciseId === exerciseId);
        if (eIdx === -1) {
          workout.entries.push({ id: uid(), exerciseId, sets: sets.map(s => ({ ...s })) });
        } else {
          const entry = workout.entries[eIdx];
          workout.entries[eIdx] = { ...entry, sets: [...entry.sets, ...sets.map(s => ({ ...s }))] };
        }
        return { ...d, workouts };
      });

      return wasPR;
    },
    [getBestE1RM],
  );

  const removeSet = useCallback((workoutId: string, entryId: string, setIndex: number) => {
    setData(d => {
      const workouts = d.workouts
        .map(w => {
          if (w.id !== workoutId) return w;
          const entries = w.entries
            .map(e => {
              if (e.id !== entryId) return e;
              const sets = e.sets.filter((_, i) => i !== setIndex);
              return { ...e, sets };
            })
            .filter(e => e.sets.length > 0);
          return { ...w, entries };
        })
        .filter(w => w.entries.length > 0);
      return { ...d, workouts };
    });
  }, []);

  const removeEntry = useCallback((workoutId: string, entryId: string) => {
    setData(d => {
      const workouts = d.workouts
        .map(w => (w.id === workoutId ? { ...w, entries: w.entries.filter(e => e.id !== entryId) } : w))
        .filter(w => w.entries.length > 0);
      return { ...d, workouts };
    });
  }, []);

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
    (date: string, weight: number, liftLabel?: string, liftWeight?: number, liftReps?: number) => {
      setData(d => {
        const existing = d.bodyweight.find(b => b.date === date);
        if (existing) {
          return {
            ...d,
            bodyweight: d.bodyweight.map(b =>
              b.date === date ? { ...b, weight, liftLabel, liftWeight, liftReps } : b,
            ),
          };
        }
        const entry: BodyweightEntry = { id: uid(), date, weight, liftLabel, liftWeight, liftReps };
        return { ...d, bodyweight: [...d.bodyweight, entry] };
      });
    },
    [],
  );

  const deleteBodyweight = useCallback((id: string) => {
    setData(d => ({ ...d, bodyweight: d.bodyweight.filter(b => b.id !== id) }));
  }, []);

  const importData = useCallback((parsed: unknown) => {
    const p = parsed as Partial<AppData>;
    if (!p.exercises || !p.workouts) throw new Error('Invalid format');
    setData({ exercises: p.exercises, workouts: p.workouts, bodyweight: p.bodyweight || [] });
  }, []);

  const clearAll = useCallback(() => {
    setData(freshData());
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

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData(): DataContextValue {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within DataProvider');
  return ctx;
}
