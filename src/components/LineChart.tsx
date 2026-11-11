import { useEffect, useRef } from 'react';
import { hexToRgba } from '../lib/utils';

export interface ChartPoint {
  label: string;
  value: number;
}

interface LineChartProps {
  points: ChartPoint[];
  color: string;
  width?: number;
  height?: number;
}

export function LineChart({ points, color, width = 800, height = 320 }: LineChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    draw(canvas, points, color, width, height);
  }, [points, color, width, height]);

  return <canvas ref={canvasRef} style={{ display: points.length ? 'block' : 'none' }} />;
}

function draw(canvas: HTMLCanvasElement, points: ChartPoint[], color: string, width: number, height: number) {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = width * dpr;
  canvas.height = height * dpr;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const W = width, H = height;
  ctx.clearRect(0, 0, W, H);
  if (!points.length) return;

  const padL = 46, padR = 16, padT = 16, padB = 30;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;

  const values = points.map(p => p.value).filter(v => !isNaN(v));
  let minV = Math.min(...values);
  let maxV = Math.max(...values);
  if (minV === maxV) { minV -= 1; maxV += 1; }
  const pad = (maxV - minV) * 0.12;
  minV = Math.max(0, minV - pad);
  maxV = maxV + pad;

  const root = document.documentElement;
  const textColor = getComputedStyle(root).getPropertyValue('--text-muted').trim() || '#8a90a0';
  const gridColor = getComputedStyle(root).getPropertyValue('--border').trim() || '#2a2f3a';
  const lineColor = color || '#ff6b35';

  ctx.font = '11px -apple-system, Segoe UI, Roboto, sans-serif';

  // Y gridlines + labels
  const ySteps = 4;
  ctx.strokeStyle = gridColor;
  ctx.fillStyle = textColor;
  ctx.lineWidth = 1;
  for (let i = 0; i <= ySteps; i++) {
    const v = minV + ((maxV - minV) * i) / ySteps;
    const y = padT + plotH - (plotH * i) / ySteps;
    ctx.beginPath();
    ctx.moveTo(padL, y + 0.5);
    ctx.lineTo(W - padR, y + 0.5);
    ctx.stroke();
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText(v.toFixed(v < 10 ? 1 : 0), padL - 8, y);
  }

  // X labels (thin out if many points)
  const maxLabels = Math.floor(plotW / 60);
  const step = Math.max(1, Math.ceil(points.length / Math.max(1, maxLabels)));
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  points.forEach((p, i) => {
    if (i % step !== 0 && i !== points.length - 1) return;
    const x = padL + (points.length === 1 ? plotW / 2 : (plotW * i) / (points.length - 1));
    ctx.fillText(p.label, x, H - padB + 8);
  });

  const xFor = (i: number) => padL + (points.length === 1 ? plotW / 2 : (plotW * i) / (points.length - 1));
  const yFor = (v: number) => padT + plotH - ((v - minV) / (maxV - minV)) * plotH;

  // Area fill
  ctx.beginPath();
  points.forEach((p, i) => {
    const x = xFor(i), y = yFor(p.value);
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  });
  ctx.lineTo(xFor(points.length - 1), padT + plotH);
  ctx.lineTo(xFor(0), padT + plotH);
  ctx.closePath();
  const grad = ctx.createLinearGradient(0, padT, 0, padT + plotH);
  grad.addColorStop(0, hexToRgba(lineColor, 0.25));
  grad.addColorStop(1, hexToRgba(lineColor, 0.02));
  ctx.fillStyle = grad;
  ctx.fill();

  // Line stroke
  ctx.beginPath();
  points.forEach((p, i) => {
    const x = xFor(i), y = yFor(p.value);
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  });
  ctx.strokeStyle = lineColor;
  ctx.lineWidth = 2.5;
  ctx.lineJoin = 'round';
  ctx.stroke();

  // Points
  points.forEach((p, i) => {
    const x = xFor(i), y = yFor(p.value);
    ctx.beginPath();
    ctx.arc(x, y, 3.2, 0, Math.PI * 2);
    ctx.fillStyle = lineColor;
    ctx.fill();
  });
}
