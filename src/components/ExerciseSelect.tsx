import type { Exercise } from '../lib/types';

interface ExerciseSelectProps {
  exercises: Exercise[];
  value: string;
  onChange: (id: string) => void;
  noneLabel?: string;
}

export function ExerciseSelect({ exercises, value, onChange, noneLabel }: ExerciseSelectProps) {
  const byCat: Record<string, Exercise[]> = {};
  exercises.forEach(ex => {
    (byCat[ex.category] = byCat[ex.category] || []).push(ex);
  });
  const categories = Object.keys(byCat).sort();

  return (
    <select value={value} onChange={e => onChange(e.target.value)}>
      {noneLabel && <option value="">{noneLabel}</option>}
      {categories.map(cat => (
        <optgroup label={cat} key={cat}>
          {byCat[cat]
            .slice()
            .sort((a, b) => a.name.localeCompare(b.name))
            .map(ex => (
              <option value={ex.id} key={ex.id}>{ex.name}</option>
            ))}
        </optgroup>
      ))}
    </select>
  );
}
