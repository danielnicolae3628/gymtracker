import { z } from 'zod';

const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD');

export const setEntrySchema = z.object({
  weight: z.number().nonnegative(),
  reps: z.number().int().positive(),
  rpe: z.number().min(1).max(10).nullable().optional(),
});

export const exerciseInputSchema = z.object({
  name: z.string().trim().min(1),
  category: z.string().trim().min(1),
  unit: z.enum(['kg', 'lb']),
});

export const exerciseSchema = exerciseInputSchema.extend({
  id: z.string().min(1),
});

export const workoutEntrySchema = z.object({
  id: z.string().min(1),
  exerciseId: z.string().min(1),
  sets: z.array(setEntrySchema),
});

export const workoutSchema = z.object({
  id: z.string().min(1),
  date: dateStr,
  entries: z.array(workoutEntrySchema),
});

export const bodyweightEntrySchema = z.object({
  id: z.string().min(1),
  date: dateStr,
  weight: z.number().positive(),
  liftLabel: z.string().trim().min(1).optional(),
  liftWeight: z.number().nonnegative().optional(),
  liftReps: z.number().int().positive().optional(),
});

export const commitSetsInputSchema = z.object({
  date: dateStr,
  exerciseId: z.string().min(1),
  sets: z.array(setEntrySchema).min(1),
});

export const bodyweightInputSchema = z.object({
  date: dateStr,
  weight: z.number().positive(),
  liftLabel: z.string().trim().min(1).optional(),
  liftWeight: z.number().nonnegative().optional(),
  liftReps: z.number().int().positive().optional(),
});

export const fullDataInputSchema = z.object({
  exercises: z.array(exerciseSchema),
  workouts: z.array(workoutSchema),
  bodyweight: z.array(bodyweightEntrySchema),
});
