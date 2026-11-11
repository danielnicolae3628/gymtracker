import { Schema, model } from 'mongoose';

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
  date: string;
  entries: WorkoutEntry[];
}

export interface Exercise {
  id: string;
  name: string;
  category: string;
  unit: 'kg' | 'lb';
}

export interface BodyweightEntry {
  id: string;
  date: string;
  weight: number;
  liftLabel?: string;
  liftWeight?: number;
  liftReps?: number;
}

export interface AppData {
  _id: string;
  exercises: Exercise[];
  workouts: Workout[];
  bodyweight: BodyweightEntry[];
  __v: number;
}

const SetEntrySchema = new Schema<SetEntry>(
  {
    weight: { type: Number, required: true },
    reps: { type: Number, required: true },
    rpe: { type: Number, default: null },
  },
  { _id: false },
);

const WorkoutEntrySchema = new Schema<WorkoutEntry>(
  {
    id: { type: String, required: true },
    exerciseId: { type: String, required: true },
    sets: { type: [SetEntrySchema], default: [] },
  },
  { _id: false },
);

const WorkoutSchema = new Schema<Workout>(
  {
    id: { type: String, required: true },
    date: { type: String, required: true },
    entries: { type: [WorkoutEntrySchema], default: [] },
  },
  { _id: false },
);

const ExerciseSchema = new Schema<Exercise>(
  {
    id: { type: String, required: true },
    name: { type: String, required: true },
    category: { type: String, required: true },
    unit: { type: String, enum: ['kg', 'lb'], required: true },
  },
  { _id: false },
);

const BodyweightEntrySchema = new Schema<BodyweightEntry>(
  {
    id: { type: String, required: true },
    date: { type: String, required: true },
    weight: { type: Number, required: true },
    liftLabel: { type: String },
    liftWeight: { type: Number },
    liftReps: { type: Number },
  },
  { _id: false },
);

const AppDataSchema = new Schema({
  _id: { type: String },
  exercises: { type: [ExerciseSchema], default: [] },
  workouts: { type: [WorkoutSchema], default: [] },
  bodyweight: { type: [BodyweightEntrySchema], default: [] },
});

export const AppDataModel = model('AppData', AppDataSchema, 'appdata');
