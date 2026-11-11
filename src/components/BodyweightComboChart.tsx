import { useEffect, useRef } from 'react';
import type { BodyweightEntry } from '../lib/types';
import { fmtDateShort } from '../lib/utils';

interface Series {
  key: 'weight' | 'liftWeight' | 'liftReps';
  label: string;
  color: string;
  dash: number[];
}

interface BodyweightComboChartProps {
  entries: BodyweightEntry[];
  width?: number;
  height?: number;
}

const SERIES_DEFS: Series[] = [
  { key: 'weight', label: 'Bodyweight', color: 'var(--accent-2)', dash: [] },
  { key: 'liftWeight', label: 'Lift weight', color: 'var(--accent)', dash: [7, 4] },
  { key: 'liftReps', label: 'Reps', color: 'var(--accent-3)', dash: [2, 3] },
];

function getActiveSeries(entries: BodyweightEntry[]): Series[] {
  return SERIES_DEFS.filter(s => entries.some(e => e[s.key] != null));
}

export function BodyweightComboChart({ entries, width = 800, height = 320 }: BodyweightComboChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const activeSeries = getActiveSeries(entries);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    draw(canvas, entries, getActiveSeries(entries), width, height);
  }, [entries, width, height]);

  return (
    <div>
      <div className="combo-legend">
        {activeSeries.map(s => (
          <span className="combo-legend-item" key={s.key}>
            <span className="combo-legend-dot" style={{ background: resolveColor(s.color) }} />
            {s.label}
          </span>
        ))}
      </div>
      <canvas ref={canvasRef} style={{ display: entries.length ? 'block' : 'none' }} />
      <p className="muted combo-note">Each line is scaled to its own range (0–100%) so trends are comparable.</p>
    </div>
  );
}

function resolveColor(cssVar: string): string {
  const match = /var\((--[\w-]+)\)/.exec(cssVar);
  if (!match) return cssVar;
  return getComputedStyle(document.documentElement).getPropertyValue(match[1]).trim() || '#8a90a0';
}

function draw(canvas: HTMLCanvasElement, entries: BodyweightEntry[], series: Series[], width: number, height: number) {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = width * dpr;
  canvas.height = height * dpr;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const W = width, H = height;
  ctx.clearRect(0, 0, W, H);
  if (!entries.length || !series.length) return;

  const padL = 40, padR = 16, padT = 16, padB = 30;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;

  const root = document.documentElement;
  const textColor = getComputedStyle(root).getPropertyValue('--text-muted').trim() || '#8a90a0';
  const gridColor = getComputedStyle(root).getPropertyValue('--border').trim() || '#2a2f3a';

  ctx.font = '11px -apple-system, Segoe UI, Roboto, sans-serif';

  // Y gridlines + labels (fixed 0-100%)
  const ySteps = 4;
  ctx.strokeStyle = gridColor;
  ctx.fillStyle = textColor;
  ctx.lineWidth = 1;
  for (let i = 0; i <= ySteps; i++) {
    const v = (100 * i) / ySteps;
    const y = padT + plotH - (plotH * i) / ySteps;
    ctx.beginPath();
    ctx.moveTo(padL, y + 0.5);
    ctx.lineTo(W - padR, y + 0.5);
    ctx.stroke();
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${v}%`, padL - 8, y);
  }

  // X labels (thin out if many points)
  const n = entries.length;
  const maxLabels = Math.floor(plotW / 60);
  const step = Math.max(1, Math.ceil(n / Math.max(1, maxLabels)));
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  entries.forEach((e, i) => {
    if (i % step !== 0 && i !== n - 1) return;
    const x = padL + (n === 1 ? plotW / 2 : (plotW * i) / (n - 1));
    ctx.fillText(fmtDateShort(e.date), x, H - padB + 8);
  });

  const xFor = (i: number) => padL + (n === 1 ? plotW / 2 : (plotW * i) / (n - 1));
  const yFor = (pct: number) => padT + plotH - (pct / 100) * plotH;

  for (const s of series) {
    const values = entries.map(e => e[s.key] as number | undefined);
    const defined = values.filter((v): v is number => v != null);
    if (!defined.length) continue;
    const min = Math.min(...defined);
    const max = Math.max(...defined);
    const color = resolveColor(s.color);

    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5;
    ctx.lineJoin = 'round';
    ctx.setLineDash(s.dash);

    let drawing = false;
    ctx.beginPath();
    values.forEach((v, i) => {
      if (v == null) { drawing = false; return; }
      const pct = max === min ? 50 : ((v - min) / (max - min)) * 100;
      const x = xFor(i), y = yFor(pct);
      if (!drawing) { ctx.moveTo(x, y); drawing = true; } else { ctx.lineTo(x, y); }
    });
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = color;
    values.forEach((v, i) => {
      if (v == null) return;
      const pct = max === min ? 50 : ((v - min) / (max - min)) * 100;
      const x = xFor(i), y = yFor(pct);
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();
    });
  }
}
