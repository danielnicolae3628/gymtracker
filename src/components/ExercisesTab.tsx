import { useEffect, useRef, useState } from 'react';
import { useData } from '../store/DataContext';
import { useToast } from '../store/ToastContext';
import { EXERCISE_CATEGORIES } from '../lib/defaultExercises';
import type { Unit } from '../lib/types';

interface ExercisesTabProps {
  focusNameToken?: number;
}

export function ExercisesTab({ focusNameToken }: ExercisesTabProps) {
  const { data, addExercise, deleteExercise, usageCount } = useData();
  const toast = useToast();
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (focusNameToken) nameInputRef.current?.focus();
  }, [focusNameToken]);

  const [name, setName] = useState('');
  const [category, setCategory] = useState(EXERCISE_CATEGORIES[0]);
  const [unit, setUnit] = useState<Unit>('kg');

  async function handleAdd() {
    if (!name.trim()) { toast('Enter an exercise name'); return; }
    const result = await addExercise(name, category, unit);
    if (result === 'duplicate') { toast('That exercise already exists'); return; }
    if (result === 'error') return; // context already showed an error toast
    setName('');
    toast('Exercise added');
  }

  async function handleDelete(id: string, exName: string) {
    const count = usageCount(id);
    if (count > 0) {
      const ok = confirm(
        `"${exName}" has ${count} logged entr${count === 1 ? 'y' : 'ies'}. Delete it anyway? Logged history for it will remain but show as deleted.`,
      );
      if (!ok) return;
    }
    await deleteExercise(id);
    toast('Exercise deleted');
  }

  const byCat: Record<string, typeof data.exercises> = {};
  data.exercises.forEach(ex => {
    (byCat[ex.category] = byCat[ex.category] || []).push(ex);
  });
  const categories = Object.keys(byCat).sort();

  return (
    <section className="tab-panel active">
      <div className="panel-grid">
        <div className="card">
          <h2>Add exercise</h2>
          <div className="field-row">
            <label className="grow">
              Name
              <input
                type="text"
                ref={nameInputRef}
                placeholder="e.g. Incline Dumbbell Press"
                value={name}
                onChange={e => setName(e.target.value)}
              />
            </label>
          </div>
          <div className="field-row">
            <label className="grow">
              Category
              <select value={category} onChange={e => setCategory(e.target.value)}>
                {EXERCISE_CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </label>
            <label>
              Unit
              <select value={unit} onChange={e => setUnit(e.target.value as Unit)}>
                <option value="kg">kg</option>
                <option value="lb">lb</option>
              </select>
            </label>
          </div>
          <button className="btn btn-primary" onClick={handleAdd}>Add exercise</button>
        </div>

        <div className="card">
          <h2>Your exercises</h2>
          <div className="exercise-manage-list">
            {categories.map(cat => (
              <div className="exercise-manage-group" key={cat}>
                <h3>{cat}</h3>
                {byCat[cat]
                  .slice()
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map(ex => {
                    const count = usageCount(ex.id);
                    return (
                      <div className="exercise-row" key={ex.id}>
                        <span>
                          {ex.name}
                          <span className="ex-unit">{ex.unit}{count ? ` · used ${count}×` : ''}</span>
                        </span>
                        <button title="Delete exercise" onClick={() => handleDelete(ex.id, ex.name)}>🗑</button>
                      </div>
                    );
                  })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
