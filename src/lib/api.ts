export const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

export async function fetchAppData(): Promise<import('./types').AppData> {
  const res = await fetch(`${API_BASE}/data`);
  if (!res.ok) throw new Error(`GET /data failed: ${res.status}`);
  return res.json();
}

export async function saveAppData(data: import('./types').AppData): Promise<void> {
  const res = await fetch(`${API_BASE}/data`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`PUT /data failed: ${res.status}`);
}
