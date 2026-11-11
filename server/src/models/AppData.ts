import { Schema, model } from 'mongoose';

const SetEntrySchema = new Schema(
  {
    weight: { type: Number, required: true },
    reps: { type: Number, required: true },
    rpe: { type: Number, default: null },
  },
  { _id: false },
);

const WorkoutEntrySchema = new Schema(
  {
    id: { type: String, required: true },
    exerciseId: { type: String, required: true },
    sets: { type: [SetEntrySchema], default: [] },
  },
  { _id: false },
);

const WorkoutSchema = new Schema(
  {
    id: { type: String, required: true },
    date: { type: String, required: true },
    entries: { type: [WorkoutEntrySchema], default: [] },
  },
  { _id: false },
);

const ExerciseSchema = new Schema(
  {
    id: { type: String, required: true },
    name: { type: String, required: true },
    category: { type: String, required: true },
    unit: { type: String, enum: ['kg', 'lb'], required: true },
  },
  { _id: false },
);

const BodyweightEntrySchema = new Schema(
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
