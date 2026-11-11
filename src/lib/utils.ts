export function uid(): string {
  if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
  return 'id-' + Date.now() + '-' + Math.random().toString(16).slice(2);
}

export function todayStr(): string {
  const d = new Date();
  const off = d.getTimezoneOffset();
  const local = new Date(d.getTime() - off * 60000);
  return local.toISOString().slice(0, 10);
}

export function fmtDate(dstr: string): string {
  const d = new Date(dstr + 'T00:00:00');
  return d.toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
}

export function fmtDateShort(dstr: string): string {
  const d = new Date(dstr + 'T00:00:00');
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function epley(weight: number, reps: number): number {
  return weight * (1 + reps / 30);
}

export function hexToRgba(hex: string, alpha: number): string {
  hex = hex.trim();
  if (hex.startsWith('#')) {
    let c = hex.substring(1);
    if (c.length === 3) c = c.split('').map(x => x + x).join('');
    const num = parseInt(c, 16);
    const r = (num >> 16) & 255, g = (num >> 8) & 255, b = num & 255;
    return `rgba(${r},${g},${b},${alpha})`;
  }
  return hex;
}
