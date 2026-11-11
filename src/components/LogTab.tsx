import { useState } from 'react';
import { useData } from '../store/DataContext';
import { useToast } from '../store/ToastContext';
import { epley, fmtDateShort, todayStr } from '../lib/utils';
import type { SetEntry } from '../lib/types';
import { ExerciseSelect } from './ExerciseSelect';

interface LogTabProps {
  onGoToExercises: () => void;
}

export function LogTab({ onGoToExercises }: LogTabProps) {
  const { data, getExercise, commitSets, removeSet, removeEntry, findLastSetForExercise, getBestE1RM } = useData();
  const toast = useToast();

  const [logDate, setLogDate] = useState(todayStr());
  const [exerciseId, setExerciseId] = useState(() => data.exercises[0]?.id ?? '');
  const [weight, setWeight] = useState('');
  const [reps, setReps] = useState('');
  const [rpe, setRpe] = useState('');
  const [pendingSets, setPendingSets] = useState<SetEntry[]>([]);

  const ex = exerciseId ? getExercise(exerciseId) : undefined;
  const workout = data.workouts.find(w => w.date === logDate);

  if (exerciseId && !data.exercises.some(e => e.id === exerciseId)) {
    setExerciseId(data.exercises[0]?.id ?? '');
  }

  function resetDate(date: string) {
    setLogDate(date);
    setPendingSets([]);
  }

  function handleAddSet() {
    const w = parseFloat(weight);
    const r = parseInt(reps, 10);
    const rp = rpe === '' ? null : parseFloat(rpe);

    if (isNaN(w) || w < 0) { toast('Enter a valid weight'); return; }
    if (isNaN(r) || r <= 0) { toast('Enter a valid rep count'); return; }

    setPendingSets(ps => [...ps, { weight: w, reps: r, rpe: rp }]);
    setReps('');
  }

  function handleRepeatLast() {
    if (!exerciseId) { toast('Choose an exercise first'); return; }
    const last = findLastSetForExercise(exerciseId);
    if (!last) { toast('No previous sets found for this exercise'); return; }
    setPendingSets(ps => [...ps, { weight: last.weight, reps: last.reps, rpe: last.rpe ?? null }]);
  }

  function removePendingSet(index: number) {
    setPendingSets(ps => ps.filter((_, i) => i !== index));
  }

  async function handleCommit() {
    if (!exerciseId) { toast('Choose an exercise first'); return; }
    if (!pendingSets.length) return;
    const wasPR = await commitSets(logDate, exerciseId, pendingSets);
    if (wasPR === null) return; // save failed; context already showed an error toast
    setPendingSets([]);
    toast(wasPR ? '🏆 New PR saved!' : 'Sets saved');
  }

  return (
    <section className="tab-panel active">
      <div className="panel-grid">
        <div className="card">
          <h2>Log a set</h2>
          <div className="field-row">
            <label>
              Date
              <input type="date" value={logDate} onChange={e => resetDate(e.target.value || todayStr())} />
            </label>
            <label>
              Exercise
              <ExerciseSelect
                exercises={data.exercises}
                value={exerciseId}
                onChange={setExerciseId}
              />
            </label>
            <button
              className="btn-icon"
              title="Add new exercise"
              onClick={onGoToExercises}
            >
              + New
            </button>
          </div>

          <div className="field-row">
            <label className="grow">
              Weight <span>({ex ? ex.unit : 'kg'})</span>
              <input
                type="number"
                inputMode="decimal"
                step="0.5"
                min="0"
                placeholder="e.g. 60"
                value={weight}
                onChange={e => setWeight(e.target.value)}
              />
            </label>
            <label className="grow">
              Reps
              <input
                type="number"
                inputMode="numeric"
                step="1"
                min="0"
                placeholder="e.g. 8"
                value={reps}
                onChange={e => setReps(e.target.value)}
              />
            </label>
            <label className="grow">
              RPE <span className="muted">(optional)</span>
              <input
                type="number"
                inputMode="decimal"
                step="0.5"
                min="1"
                max="10"
                placeholder="1-10"
                value={rpe}
                onChange={e => setRpe(e.target.value)}
              />
            </label>
          </div>

          <div className="field-row">
            <button className="btn btn-primary" onClick={handleAddSet}>Add set</button>
            <button className="btn" title="Repeat last set for this exercise" onClick={handleRepeatLast}>
              Repeat last
            </button>
          </div>

          <div className="pending-sets">
            {pendingSets.map((s, i) => (
              <div className="pending-set-row" key={i}>
                <div className="set-num">{i + 1}</div>
                <div className="set-detail">
                  {s.weight} × {s.reps}{s.rpe != null ? ` @RPE ${s.rpe}` : ''}
                </div>
                <button title="Remove" onClick={() => removePendingSet(i)}>✕</button>
              </div>
            ))}
            {pendingSets.length > 0 && (
              <button className="btn btn-primary" style={{ marginTop: 8 }} onClick={handleCommit}>
                Save {pendingSets.length} set{pendingSets.length > 1 ? 's' : ''} to session
              </button>
            )}
          </div>
        </div>

        <div className="card">
          <h2>Today's session <span className="muted">— {fmtDateShort(logDate)}</span></h2>
          <div className="session-list">
            {!workout || !workout.entries.length ? (
              <p className="empty-state">No sets logged for this date yet.</p>
            ) : (
              workout.entries.map(entry => {
                const entryEx = getExercise(entry.exerciseId);
                if (!entryEx) return null;
                const bestBeforeToday = getBestE1RM(entry.exerciseId, logDate);
                const bestToday = Math.max(...entry.sets.map(s => epley(s.weight, s.reps)));
                const isPR = bestToday > bestBeforeToday && bestBeforeToday > 0;
                return (
                  <div className="session-exercise" key={entry.id}>
                    <div className="session-exercise-head">
                      <strong>
                        {entryEx.name}
                        {isPR && <span className="pr-badge">PR</span>}
                      </strong>
                      <button
                        className="btn-icon btn-sm"
                        onClick={() => removeEntry(workout!.id, entry.id)}
                      >
                        Remove exercise
                      </button>
                    </div>
                    <div className="set-chip-list">
                      {entry.sets.map((s, si) => (
                        <span className="set-chip" key={si}>
                          {s.weight}{entryEx.unit} × {s.reps}{s.rpe != null ? ` @${s.rpe}` : ''}{' '}
                          <button title="Remove set" onClick={() => removeSet(workout!.id, entry.id, si)}>✕</button>
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
