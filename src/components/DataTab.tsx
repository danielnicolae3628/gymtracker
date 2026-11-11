import { useRef, useState } from 'react';
import { useData } from '../store/DataContext';
import { useToast } from '../store/ToastContext';
import { todayStr } from '../lib/utils';

export function DataTab() {
  const { data, importData, clearAll } = useData();
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState('');

  function handleExport() {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ironlog-backup-${todayStr()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast('Backup exported');
  }

  function handleImportChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result as string);
        if (!confirm('Import will replace all current data. Continue?')) return;
        importData(parsed);
        setStatus('Import successful.');
        toast('Data imported');
      } catch {
        setStatus('Import failed: invalid JSON file.');
        toast('Import failed');
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  }

  function handleClearAll() {
    if (!confirm('This will permanently delete ALL workouts, exercises, and bodyweight entries. This cannot be undone. Continue?')) return;
    if (!confirm('Are you absolutely sure? Consider exporting a backup first.')) return;
    clearAll();
    toast('All data cleared');
  }

  const totalWorkouts = data.workouts.length;
  const totalSets = data.workouts.reduce((n, w) => n + w.entries.reduce((m, e) => m + e.sets.length, 0), 0);
  const totalVolume = data.workouts.reduce(
    (v, w) => v + w.entries.reduce((s, e) => s + e.sets.reduce((x, st) => x + st.weight * st.reps, 0), 0),
    0,
  );
  const totalExercises = data.exercises.length;

  return (
    <>
    <section className="tab-panel active">
      <div className="card">
        <h2>Backup &amp; restore</h2>
        <p className="muted">All data is stored locally in this browser (localStorage). Export a backup regularly, especially before clearing browser data.</p>
        <div className="field-row">
          <button className="btn btn-primary" onClick={handleExport}>Export JSON</button>
          <label className="btn" htmlFor="importFile">Import JSON</label>
          <input
            type="file"
            id="importFile"
            ref={fileInputRef}
            accept="application/json"
            style={{ display: 'none' }}
            onChange={handleImportChange}
            />
        </div>
        <div className="field-row">
          <button className="btn btn-danger" onClick={handleClearAll}>Clear all data</button>
        </div>
        <p className="muted">{status}</p>
      </div>
      <div className="card">
        <h2>Stats overview</h2>
        <div className="stat-row">
          <div className="stat-tile"><div className="stat-label">Workouts logged</div><div className="stat-value">{totalWorkouts}</div></div>
          <div className="stat-tile"><div className="stat-label">Total sets</div><div className="stat-value">{totalSets}</div></div>
          <div className="stat-tile"><div className="stat-label">Total volume lifted</div><div className="stat-value">{Math.round(totalVolume).toLocaleString()}</div></div>
          <div className="stat-tile"><div className="stat-label">Exercises tracked</div><div className="stat-value">{totalExercises}</div></div>
        </div>
      </div>
    </section>
    </>
  );
}
