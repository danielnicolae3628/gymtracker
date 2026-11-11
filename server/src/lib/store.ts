import { randomUUID } from 'node:crypto';
import { AppDataModel, type AppData } from '../models/AppData.js';
import { DEFAULT_EXERCISES } from '../defaultExercises.js';

export const SINGLETON_ID = 'singleton';
const MAX_RETRIES = 8;

/**
 * Loads the singleton document, atomically creating it (seeded with default
 * exercises) if it doesn't exist yet. `findOneAndUpdate` with `upsert: true`
 * is a single atomic operation, so concurrent first-requests never race to
 * insert the same _id twice.
 */
export async function getOrCreateDoc(): Promise<AppData> {
  const doc = await AppDataModel.findOneAndUpdate(
    { _id: SINGLETON_ID },
    {
      $setOnInsert: {
        _id: SINGLETON_ID,
        exercises: DEFAULT_EXERCISES.map(e => ({ id: randomUUID(), ...e })),
        workouts: [],
        bodyweight: [],
      },
    },
    { upsert: true, new: true },
  ).lean<AppData>();
  return doc!;
}

/**
 * Applies `mutator` to a freshly loaded plain-object copy of the document,
 * then persists it with an explicit compare-and-swap on the version key:
 * the update only takes effect if `__v` still matches what we read, and we
 * retry with a fresh read otherwise. This is done manually (rather than via
 * Mongoose's automatic `.save()` versioning) because that versioning isn't
 * reliable for deeply nested array mutations like `workouts[].entries[].sets`
 * — relying on it silently lost concurrent writes in testing.
 */
export async function mutateDoc<T>(mutator: (doc: AppData) => T): Promise<{ doc: AppData; result: T }> {
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const doc = await getOrCreateDoc();
    const expectedVersion = doc.__v;
    const result = mutator(doc);

    const updateResult = await AppDataModel.updateOne(
      { _id: SINGLETON_ID, __v: expectedVersion },
      {
        $set: { exercises: doc.exercises, workouts: doc.workouts, bodyweight: doc.bodyweight },
        $inc: { __v: 1 },
      },
    );

    if (updateResult.matchedCount === 1) {
      return { doc, result };
    }
    // Someone else saved in between (version mismatch) — retry with a fresh read.
  }
  throw new Error('Could not save document after retries (too much write contention)');
}
