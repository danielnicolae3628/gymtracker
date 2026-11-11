export type Unit = 'kg' | 'lb';

export interface Exercise {
  id: string;
  name: string;
  category: string;
  unit: Unit;
}

export interface SetEntry {
  weight: number;
  reps: number;
  rpe: number | null;
}

export interface WorkoutEntry {
  id: string;
  exerciseId: string;
  sets: SetEntry[];
}

export interface Workout {
  id: string;
  date: string; // YYYY-MM-DD
  entries: WorkoutEntry[];
}

export interface BodyweightEntry {
  id: string;
  date: string; // YYYY-MM-DD
  weight: number;
}

export interface AppData {
  exercises: Exercise[];
  workouts: Workout[];
  bodyweight: BodyweightEntry[];
}

export type Metric = 'e1rm' | 'weight' | 'volume';

export interface SeriesPoint {
  date: string;
  topWeight: number;
  bestE1rm: number;
  volume: number;
  sets: SetEntry[];
}
