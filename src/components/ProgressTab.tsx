import { useMemo, useState } from 'react';
import { useData } from '../store/DataContext';
import { useToast } from '../store/ToastContext';
import { fmtDateShort, todayStr } from '../lib/utils';
import type { Metric } from '../lib/types';
import { ExerciseSelect } from './ExerciseSelect';
import { LineChart, type ChartPoint } from './LineChart';

const METRIC_KEY: Record<Metric, 'bestE1rm' | 'topWeight' | 'volume'> = {
  e1rm: 'bestE1rm',
  weight: 'topWeight',
  volume: 'volume',
};

export function ProgressTab() {
  const { data, getExercise, getExerciseSeries, addOrUpdateBodyweight, deleteBodyweight } = useData();
  const toast = useToast();

  const [exerciseId, setExerciseId] = useState(() => data.exercises[0]?.id ?? '');
  const [metric, setMetric] = useState<Metric>('e1rm');
  const [bwDate, setBwDate] = useState(todayStr());
  const [bwWeight, setBwWeight] = useState('');

  if (exerciseId && !data.exercises.some(e => e.id === exerciseId)) {
    setExerciseId(data.exercises[0]?.id ?? '');
  }

  const ex = exerciseId ? getExercise(exerciseId) : undefined;
  const series = exerciseId ? getExerciseSeries(exerciseId) : [];

  const accentColor = useMemo(
    () => getComputedStyle(document.documentElement).getPropertyValue('--accent').trim(),
    [],
  );
  const accent2Color = useMemo(
    () => getComputedStyle(document.documentElement).getPropertyValue('--accent-2').trim(),
    [],
  );

  const chartPoints: ChartPoint[] = series.map(p => ({
    label: fmtDateShort(p.date),
    value: p[METRIC_KEY[metric]],
  }));

  const bwEntries = data.bodyweight.slice().sort((a, b) => a.date.localeCompare(b.date));
  const bwPoints: ChartPoint[] = bwEntries.map(e => ({ label: fmtDateShort(e.date), value: e.weight }));
  const bwRecent = bwEntries.slice().reverse().slice(0, 8);

  function handleAddBodyweight() {
    const date = bwDate || todayStr();
    const weight = parseFloat(bwWeight);
    if (isNaN(weight) || weight <= 0) { toast('Enter a valid bodyweight'); return; }
    addOrUpdateBodyweight(date, weight);
    setBwWeight('');
    toast('Bodyweight logged');
  }

  return (
    <section className="tab-panel active">
      <div className="panel-grid">
        <div className="card">
          <h2>Progress by exercise</h2>
          <div className="field-row">
            <label className="grow">
              Exercise
              <ExerciseSelect exercises={data.exercises} value={exerciseId} onChange={setExerciseId} />
            </label>
          </div>

          {!exerciseId || !series.length ? (
            <>
              <div className="chart-toggle">
                {(['e1rm', 'weight', 'volume'] as Metric[]).map(m => (
                  <button
                    key={m}
                    className={`chip${metric === m ? ' active' : ''}`}
                    onClick={() => setMetric(m)}
                  >
                    {m === 'e1rm' ? 'Est. 1RM' : m === 'weight' ? 'Top weight' : 'Session volume'}
                  </button>
                ))}
              </div>
              <p className="empty-state">No data yet for this exercise.</p>
            </>
          ) : (
            <>
              <div className="stat-row">
                <div className="stat-tile">
                  <div className="stat-label">Best weight</div>
                  <div className="stat-value accent">{Math.max(...series.map(p => p.topWeight))}{ex!.unit}</div>
                </div>
                <div className="stat-tile">
                  <div className="stat-label">Best est. 1RM</div>
                  <div className="stat-value accent">{Math.max(...series.map(p => p.bestE1rm)).toFixed(1)}{ex!.unit}</div>
                </div>
                <div className="stat-tile">
                  <div className="stat-label">Best session volume</div>
                  <div className="stat-value">{Math.round(Math.max(...series.map(p => p.volume))).toLocaleString()}</div>
                </div>
                <div className="stat-tile">
                  <div className="stat-label">Sessions logged</div>
                  <div className="stat-value">{series.length}</div>
                </div>
              </div>

              <div className="chart-toggle">
                {(['e1rm', 'weight', 'volume'] as Metric[]).map(m => (
                  <button
                    key={m}
                    className={`chip${metric === m ? ' active' : ''}`}
                    onClick={() => setMetric(m)}
                  >
                    {m === 'e1rm' ? 'Est. 1RM' : m === 'weight' ? 'Top weight' : 'Session volume'}
                  </button>
                ))}
              </div>

              <LineChart points={chartPoints} color={accentColor} />

              <div>
                <table className="simple-table">
                  <thead>
                    <tr><th>Date</th><th>Sets</th><th>Top weight</th><th>Est. 1RM</th><th>Volume</th></tr>
                  </thead>
                  <tbody>
                    {series.slice().reverse().map((p, i) => (
                      <tr key={i}>
                        <td>{fmtDateShort(p.date)}</td>
                        <td>{p.sets.map(s => `${s.weight}×${s.reps}`).join(', ')}</td>
                        <td>{p.topWeight}{ex!.unit}</td>
                        <td>{p.bestE1rm.toFixed(1)}{ex!.unit}</td>
                        <td>{Math.round(p.volume).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        <div className="card">
          <h2>Bodyweight</h2>
          <div className="field-row">
            <label>
              Date
              <input type="date" value={bwDate} onChange={e => setBwDate(e.target.value)} />
            </label>
            <label className="grow">
              Weight <span>(kg)</span>
              <input
                type="number"
                inputMode="decimal"
                step="0.1"
                min="0"
                placeholder="e.g. 78.4"
                value={bwWeight}
                onChange={e => setBwWeight(e.target.value)}
              />
            </label>
            <button className="btn btn-primary" onClick={handleAddBodyweight}>Add</button>
          </div>

          {!bwEntries.length ? (
            <p className="empty-state">No bodyweight entries yet.</p>
          ) : (
            <>
              <LineChart points={bwPoints} color={accent2Color} height={220} />
              <table className="simple-table">
                <thead><tr><th>Date</th><th>Weight</th><th></th></tr></thead>
                <tbody>
                  {bwRecent.map(e => (
                    <tr key={e.id}>
                      <td>{fmtDateShort(e.date)}</td>
                      <td>{e.weight}</td>
                      <td>
                        <button className="del-x btn-sm btn-icon" onClick={() => deleteBodyweight(e.id)}>Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
