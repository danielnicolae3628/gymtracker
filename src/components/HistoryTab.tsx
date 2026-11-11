import { useMemo, useState } from 'react';
import { useData } from '../store/DataContext';
import { fmtDate } from '../lib/utils';

export function HistoryTab() {
  const { data, getExercise, removeEntry } = useData();
  const [search, setSearch] = useState('');
  const [openDays, setOpenDays] = useState<Set<string>>(new Set());

  const filter = search.trim().toLowerCase();

  const filtered = useMemo(() => {
    const workouts = data.workouts.slice().sort((a, b) => b.date.localeCompare(a.date));
    if (!filter) return workouts;
    return workouts.filter(w =>
      w.entries.some(e => {
        const ex = getExercise(e.exerciseId);
        return ex && ex.name.toLowerCase().includes(filter);
      }),
    );
  }, [data.workouts, filter, getExercise]);

  function toggleDay(id: string) {
    setOpenDays(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  return (
    <section className="tab-panel active">
      <div className="card">
        <div className="card-header-row">
          <h2>Workout history</h2>
          <input
            type="search"
            placeholder="Filter by exercise…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="history-list">
          {!filtered.length ? (
            <p className="empty-state">
              {data.workouts.length ? 'No workouts found.' : 'No workouts logged yet. Head to the Log tab to get started.'}
            </p>
          ) : (
            filtered.map(w => {
              const totalSets = w.entries.reduce((n, e) => n + e.sets.length, 0);
              const totalVolume = w.entries.reduce((v, e) => v + e.sets.reduce((s, x) => s + x.weight * x.reps, 0), 0);
              const open = openDays.has(w.id);
              return (
                <div className={`history-day${open ? ' open' : ''}`} key={w.id}>
                  <div className="history-day-head" onClick={() => toggleDay(w.id)}>
                    <div className="hd-left">
                      <div className="hd-date">{fmtDate(w.date)}</div>
                      <div className="hd-meta">
                        {w.entries.length} exercise{w.entries.length !== 1 ? 's' : ''} · {totalSets} set{totalSets !== 1 ? 's' : ''} · {Math.round(totalVolume).toLocaleString()} vol
                      </div>
                    </div>
                    <div className="chevron">▶</div>
                  </div>
                  <div className="history-day-body">
                    {w.entries.map(entry => {
                      const ex = getExercise(entry.exerciseId);
                      return (
                        <div className="history-exercise" key={entry.id}>
                          <div className="history-exercise-head">
                            <strong>{ex ? ex.name : '(deleted exercise)'}</strong>
                            <button
                              className="del-x"
                              title="Delete this exercise entry"
                              onClick={e => {
                                e.stopPropagation();
                                removeEntry(w.id, entry.id);
                              }}
                            >
                              🗑
                            </button>
                          </div>
                          <div className="set-chip-list">
                            {entry.sets.map((s, si) => (
                              <span className="set-chip" key={si}>
                                {s.weight}{ex ? ex.unit : ''} × {s.reps}{s.rpe != null ? ` @${s.rpe}` : ''}
                              </span>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </section>
  );
}
