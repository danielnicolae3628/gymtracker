// ===================== Iron Log — Gym Progress Tracker =====================
// Vanilla JS, single-file app. All data lives in localStorage. No build step,
// no external dependencies — open index.html directly in a browser.
// ============================================================================

const STORAGE_KEY = 'ironlog.v1';

const DEFAULT_EXERCISES = [
  { name: 'Bench Press', category: 'Chest', unit: 'kg' },
  { name: 'Incline Dumbbell Press', category: 'Chest', unit: 'kg' },
  { name: 'Squat', category: 'Legs', unit: 'kg' },
  { name: 'Leg Press', category: 'Legs', unit: 'kg' },
  { name: 'Deadlift', category: 'Back', unit: 'kg' },
  { name: 'Barbell Row', category: 'Back', unit: 'kg' },
  { name: 'Pull Up', category: 'Back', unit: 'kg' },
  { name: 'Lat Pulldown', category: 'Back', unit: 'kg' },
  { name: 'Overhead Press', category: 'Shoulders', unit: 'kg' },
  { name: 'Lateral Raise', category: 'Shoulders', unit: 'kg' },
  { name: 'Bicep Curl', category: 'Arms', unit: 'kg' },
  { name: 'Tricep Pushdown', category: 'Arms', unit: 'kg' },
  { name: 'Plank', category: 'Core', unit: 'kg' },
];

function uid() {
  if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
  return 'id-' + Date.now() + '-' + Math.random().toString(16).slice(2);
}

function todayStr() {
  const d = new Date();
  const off = d.getTimezoneOffset();
  const local = new Date(d.getTime() - off * 60000);
  return local.toISOString().slice(0, 10);
}

function fmtDate(dstr) {
  const d = new Date(dstr + 'T00:00:00');
  return d.toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
}

function fmtDateShort(dstr) {
  const d = new Date(dstr + 'T00:00:00');
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

// ----------------------------- Data layer ----------------------------------

const Store = {
  data: null,

  load() {
    let raw = null;
    try { raw = localStorage.getItem(STORAGE_KEY); } catch (e) { /* ignore */ }
    if (raw) {
      try {
        this.data = JSON.parse(raw);
      } catch (e) {
        this.data = null;
      }
    }
    if (!this.data) {
      this.data = {
        exercises: DEFAULT_EXERCISES.map(e => ({ id: uid(), ...e })),
        workouts: [],   // { id, date, entries: [{ id, exerciseId, sets: [{weight, reps, rpe}] }] }
        bodyweight: [], // { id, date, weight }
      };
      this.save();
    }
    if (!this.data.bodyweight) this.data.bodyweight = [];
    return this.data;
  },

  save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    } catch (e) {
      toast('⚠️ Could not save — storage may be full or unavailable');
    }
  },

  getExercise(id) {
    return this.data.exercises.find(e => e.id === id);
  },

  findOrCreateWorkout(date) {
    let w = this.data.workouts.find(w => w.date === date);
    if (!w) {
      w = { id: uid(), date, entries: [] };
      this.data.workouts.push(w);
    }
    return w;
  },
};

// ----------------------------- Toast ----------------------------------------

let toastTimer = null;
function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
}

// ----------------------------- Tabs ------------------------------------------

function initTabs() {
  const btns = document.querySelectorAll('.tab-btn');
  btns.forEach(btn => {
    btn.addEventListener('click', () => {
      btns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
      document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
      if (btn.dataset.tab === 'progress') renderProgressTab();
      if (btn.dataset.tab === 'history') renderHistoryTab();
      if (btn.dataset.tab === 'exercises') renderExerciseManageList();
      if (btn.dataset.tab === 'data') renderOverviewStats();
    });
  });
}

// ----------------------------- Exercise dropdowns ----------------------------

function populateExerciseSelect(selectEl, selectedId) {
  const data = Store.data;
  const byCat = {};
  data.exercises.forEach(ex => {
    (byCat[ex.category] = byCat[ex.category] || []).push(ex);
  });
  selectEl.innerHTML = '';
  Object.keys(byCat).sort().forEach(cat => {
    const group = document.createElement('optgroup');
    group.label = cat;
    byCat[cat]
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name))
      .forEach(ex => {
        const opt = document.createElement('option');
        opt.value = ex.id;
        opt.textContent = ex.name;
        group.appendChild(opt);
      });
    selectEl.appendChild(group);
  });
  if (selectedId) selectEl.value = selectedId;
}

function refreshAllExerciseSelects() {
  const logSel = document.getElementById('logExercise');
  const prevLog = logSel.value;
  populateExerciseSelect(logSel, prevLog);

  const progSel = document.getElementById('progressExercise');
  const prevProg = progSel.value;
  populateExerciseSelect(progSel, prevProg);
}

// ----------------------------- LOG TAB ---------------------------------------

let pendingSets = []; // sets staged before being attached to an exercise in the session

function currentLogDate() {
  return document.getElementById('logDate').value || todayStr();
}

function initLogTab() {
  const dateInput = document.getElementById('logDate');
  dateInput.value = todayStr();
  dateInput.addEventListener('change', () => {
    pendingSets = [];
    renderPendingSets();
    renderSessionForDate();
    document.getElementById('sessionDateLabel').textContent = '— ' + fmtDateShort(dateInput.value);
  });
  document.getElementById('sessionDateLabel').textContent = '— ' + fmtDateShort(dateInput.value);

  document.getElementById('logExercise').addEventListener('change', () => {
    const ex = Store.getExercise(document.getElementById('logExercise').value);
    document.getElementById('weightUnitLabel').textContent = ex ? `(${ex.unit})` : '(kg)';
  });

  document.getElementById('btnAddExerciseInline').addEventListener('click', () => {
    document.querySelector('.tab-btn[data-tab="exercises"]').click();
    document.getElementById('exName').focus();
  });

  document.getElementById('btnAddSet').addEventListener('click', () => {
    const weight = parseFloat(document.getElementById('logWeight').value);
    const reps = parseInt(document.getElementById('logReps').value, 10);
    const rpeRaw = document.getElementById('logRpe').value;
    const rpe = rpeRaw === '' ? null : parseFloat(rpeRaw);

    if (isNaN(weight) || weight < 0) { toast('Enter a valid weight'); return; }
    if (isNaN(reps) || reps <= 0) { toast('Enter a valid rep count'); return; }

    pendingSets.push({ weight, reps, rpe });
    renderPendingSets();
    document.getElementById('logReps').focus();
  });

  document.getElementById('btnRepeatLast').addEventListener('click', () => {
    const exId = document.getElementById('logExercise').value;
    const last = findLastSetForExercise(exId);
    if (!last) { toast('No previous sets found for this exercise'); return; }
    pendingSets.push({ weight: last.weight, reps: last.reps, rpe: last.rpe ?? null });
    renderPendingSets();
  });

  renderSessionForDate();
}

function findLastSetForExercise(exId) {
  const workouts = Store.data.workouts
    .filter(w => w.entries.some(e => e.exerciseId === exId))
    .sort((a, b) => b.date.localeCompare(a.date));
  for (const w of workouts) {
    const entry = w.entries.find(e => e.exerciseId === exId);
    if (entry && entry.sets.length) return entry.sets[entry.sets.length - 1];
  }
  return null;
}

function renderPendingSets() {
  const wrap = document.getElementById('pendingSets');
  wrap.innerHTML = '';
  if (!pendingSets.length) return;

  pendingSets.forEach((s, i) => {
    const row = document.createElement('div');
    row.className = 'pending-set-row';
    row.innerHTML = `
      <div class="set-num">${i + 1}</div>
      <div class="set-detail">${s.weight} × ${s.reps}${s.rpe != null ? ` @RPE ${s.rpe}` : ''}</div>
      <button title="Remove">✕</button>
    `;
    row.querySelector('button').addEventListener('click', () => {
      pendingSets.splice(i, 1);
      renderPendingSets();
    });
    wrap.appendChild(row);
  });

  const saveBtn = document.createElement('button');
  saveBtn.className = 'btn btn-primary';
  saveBtn.style.marginTop = '8px';
  saveBtn.textContent = `Save ${pendingSets.length} set${pendingSets.length > 1 ? 's' : ''} to session`;
  saveBtn.addEventListener('click', commitPendingSets);
  wrap.appendChild(saveBtn);
}

function commitPendingSets() {
  const exId = document.getElementById('logExercise').value;
  if (!exId) { toast('Choose an exercise first'); return; }
  if (!pendingSets.length) return;

  const date = currentLogDate();
  const workout = Store.findOrCreateWorkout(date);
  let entry = workout.entries.find(e => e.exerciseId === exId);
  if (!entry) {
    entry = { id: uid(), exerciseId: exId, sets: [] };
    workout.entries.push(entry);
  }
  const wasPR = checkIfPR(exId, pendingSets);
  entry.sets.push(...pendingSets.map(s => ({ ...s })));
  pendingSets = [];
  Store.save();
  renderPendingSets();
  renderSessionForDate();
  toast(wasPR ? '🏆 New PR saved!' : 'Sets saved');
}

function checkIfPR(exId, newSets) {
  const bestBefore = getBestE1RM(exId);
  const bestNew = Math.max(...newSets.map(s => epley(s.weight, s.reps)));
  return bestNew > bestBefore;
}

function epley(weight, reps) {
  return weight * (1 + reps / 30);
}

function getBestE1RM(exId) {
  let best = 0;
  Store.data.workouts.forEach(w => {
    w.entries.forEach(e => {
      if (e.exerciseId !== exId) return;
      e.sets.forEach(s => {
        const e1 = epley(s.weight, s.reps);
        if (e1 > best) best = e1;
      });
    });
  });
  return best;
}

function renderSessionForDate() {
  const date = currentLogDate();
  const wrap = document.getElementById('sessionList');
  const workout = Store.data.workouts.find(w => w.date === date);

  if (!workout || !workout.entries.length) {
    wrap.innerHTML = '<p class="empty-state">No sets logged for this date yet.</p>';
    return;
  }

  wrap.innerHTML = '';
  workout.entries.forEach(entry => {
    const ex = Store.getExercise(entry.exerciseId);
    if (!ex) return;
    const bestE1rmBeforeToday = Math.max(0, ...Store.data.workouts
      .filter(w => w.date < date)
      .flatMap(w => w.entries.filter(e => e.exerciseId === ex.id))
      .flatMap(e => e.sets.map(s => epley(s.weight, s.reps))));
    const bestToday = Math.max(...entry.sets.map(s => epley(s.weight, s.reps)));
    const isPR = bestToday > bestE1rmBeforeToday && bestE1rmBeforeToday > 0;

    const card = document.createElement('div');
    card.className = 'session-exercise';
    card.innerHTML = `
      <div class="session-exercise-head">
        <strong>${escapeHtml(ex.name)}${isPR ? '<span class="pr-badge">PR</span>' : ''}</strong>
        <button class="btn-icon btn-sm" data-action="remove-entry">Remove exercise</button>
      </div>
      <div class="set-chip-list"></div>
    `;
    const chipList = card.querySelector('.set-chip-list');
    entry.sets.forEach((s, si) => {
      const chip = document.createElement('span');
      chip.className = 'set-chip';
      chip.innerHTML = `${s.weight}${ex.unit} × ${s.reps}${s.rpe != null ? ` @${s.rpe}` : ''} <button title="Remove set">✕</button>`;
      chip.querySelector('button').addEventListener('click', () => {
        entry.sets.splice(si, 1);
        if (!entry.sets.length) {
          workout.entries = workout.entries.filter(e => e !== entry);
        }
        if (!workout.entries.length) {
          Store.data.workouts = Store.data.workouts.filter(w => w !== workout);
        }
        Store.save();
        renderSessionForDate();
      });
      chipList.appendChild(chip);
    });
    card.querySelector('[data-action="remove-entry"]').addEventListener('click', () => {
      workout.entries = workout.entries.filter(e => e !== entry);
      if (!workout.entries.length) {
        Store.data.workouts = Store.data.workouts.filter(w => w !== workout);
      }
      Store.save();
      renderSessionForDate();
    });
    wrap.appendChild(card);
  });
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ----------------------------- HISTORY TAB ------------------------------------

function renderHistoryTab() {
  const wrap = document.getElementById('historyList');
  const filter = (document.getElementById('historySearch').value || '').toLowerCase();
  const workouts = Store.data.workouts.slice().sort((a, b) => b.date.localeCompare(a.date));

  const filtered = workouts.filter(w => {
    if (!filter) return true;
    return w.entries.some(e => {
      const ex = Store.getExercise(e.exerciseId);
      return ex && ex.name.toLowerCase().includes(filter);
    });
  });

  if (!filtered.length) {
    wrap.innerHTML = '<p class="empty-state">No workouts found.</p>';
    return;
  }

  wrap.innerHTML = '';
  filtered.forEach(w => {
    const totalSets = w.entries.reduce((n, e) => n + e.sets.length, 0);
    const totalVolume = w.entries.reduce((v, e) => v + e.sets.reduce((s, x) => s + x.weight * x.reps, 0), 0);

    const day = document.createElement('div');
    day.className = 'history-day';
    day.innerHTML = `
      <div class="history-day-head">
        <div class="hd-left">
          <div class="hd-date">${fmtDate(w.date)}</div>
          <div class="hd-meta">${w.entries.length} exercise${w.entries.length !== 1 ? 's' : ''} · ${totalSets} set${totalSets !== 1 ? 's' : ''} · ${Math.round(totalVolume).toLocaleString()} vol</div>
        </div>
        <div class="chevron">▶</div>
      </div>
      <div class="history-day-body"></div>
    `;
    const body = day.querySelector('.history-day-body');
    w.entries.forEach(entry => {
      const ex = Store.getExercise(entry.exerciseId);
      const exDiv = document.createElement('div');
      exDiv.className = 'history-exercise';
      exDiv.innerHTML = `
        <div class="history-exercise-head">
          <strong>${ex ? escapeHtml(ex.name) : '(deleted exercise)'}</strong>
          <button class="del-x" title="Delete this exercise entry">🗑</button>
        </div>
        <div class="set-chip-list">
          ${entry.sets.map(s => `<span class="set-chip">${s.weight}${ex ? ex.unit : ''} × ${s.reps}${s.rpe != null ? ` @${s.rpe}` : ''}</span>`).join('')}
        </div>
      `;
      exDiv.querySelector('.del-x').addEventListener('click', (evt) => {
        evt.stopPropagation();
        w.entries = w.entries.filter(e => e !== entry);
        if (!w.entries.length) {
          Store.data.workouts = Store.data.workouts.filter(x => x !== w);
        }
        Store.save();
        renderHistoryTab();
      });
      body.appendChild(exDiv);
    });

    day.querySelector('.history-day-head').addEventListener('click', () => {
      day.classList.toggle('open');
    });
    wrap.appendChild(day);
  });
}

// ----------------------------- PROGRESS TAB ------------------------------------

let currentMetric = 'e1rm';

function initProgressTab() {
  document.getElementById('progressExercise').addEventListener('change', renderProgressTab);
  document.querySelectorAll('.chart-toggle .chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.chart-toggle .chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      currentMetric = chip.dataset.metric;
      renderProgressTab();
    });
  });

  document.getElementById('bwDate').value = todayStr();
  document.getElementById('btnAddBw').addEventListener('click', () => {
    const date = document.getElementById('bwDate').value || todayStr();
    const weight = parseFloat(document.getElementById('bwWeight').value);
    if (isNaN(weight) || weight <= 0) { toast('Enter a valid bodyweight'); return; }
    const existing = Store.data.bodyweight.find(b => b.date === date);
    if (existing) existing.weight = weight;
    else Store.data.bodyweight.push({ id: uid(), date, weight });
    Store.save();
    document.getElementById('bwWeight').value = '';
    renderBodyweight();
    toast('Bodyweight logged');
  });

  renderBodyweight();
}

function getExerciseSeries(exId) {
  const points = [];
  Store.data.workouts
    .filter(w => w.entries.some(e => e.exerciseId === exId))
    .sort((a, b) => a.date.localeCompare(b.date))
    .forEach(w => {
      const entry = w.entries.find(e => e.exerciseId === exId);
      const topWeight = Math.max(...entry.sets.map(s => s.weight));
      const bestE1rm = Math.max(...entry.sets.map(s => epley(s.weight, s.reps)));
      const volume = entry.sets.reduce((v, s) => v + s.weight * s.reps, 0);
      points.push({ date: w.date, topWeight, bestE1rm, volume, sets: entry.sets });
    });
  return points;
}

function renderProgressTab() {
  const exSel = document.getElementById('progressExercise');
  const exId = exSel.value;
  const statsWrap = document.getElementById('progressStats');
  const tableWrap = document.getElementById('progressTableWrap');
  const emptyEl = document.getElementById('progressEmpty');
  const canvas = document.getElementById('progressChart');

  if (!exId) { statsWrap.innerHTML = ''; tableWrap.innerHTML = ''; return; }
  const ex = Store.getExercise(exId);
  const series = getExerciseSeries(exId);

  if (!series.length) {
    statsWrap.innerHTML = '';
    tableWrap.innerHTML = '';
    emptyEl.style.display = 'block';
    canvas.style.display = 'none';
    return;
  }
  emptyEl.style.display = 'none';
  canvas.style.display = 'block';

  const bestWeight = Math.max(...series.map(p => p.topWeight));
  const bestE1rm = Math.max(...series.map(p => p.bestE1rm));
  const bestVolume = Math.max(...series.map(p => p.volume));
  const sessions = series.length;

  statsWrap.innerHTML = `
    <div class="stat-tile"><div class="stat-label">Best weight</div><div class="stat-value accent">${bestWeight}${ex.unit}</div></div>
    <div class="stat-tile"><div class="stat-label">Best est. 1RM</div><div class="stat-value accent">${bestE1rm.toFixed(1)}${ex.unit}</div></div>
    <div class="stat-tile"><div class="stat-label">Best session volume</div><div class="stat-value">${Math.round(bestVolume).toLocaleString()}</div></div>
    <div class="stat-tile"><div class="stat-label">Sessions logged</div><div class="stat-value">${sessions}</div></div>
  `;

  const metricKey = { e1rm: 'bestE1rm', weight: 'topWeight', volume: 'volume' }[currentMetric];
  const metricLabel = { e1rm: 'Est. 1RM (' + ex.unit + ')', weight: 'Top weight (' + ex.unit + ')', volume: 'Volume' }[currentMetric];
  const chartPoints = series.map(p => ({ label: fmtDateShort(p.date), value: p[metricKey] }));
  drawLineChart(canvas, chartPoints, { color: getComputedStyle(document.documentElement).getPropertyValue('--accent').trim(), yLabel: metricLabel });

  tableWrap.innerHTML = `
    <table class="simple-table">
      <thead><tr><th>Date</th><th>Sets</th><th>Top weight</th><th>Est. 1RM</th><th>Volume</th></tr></thead>
      <tbody>
        ${series.slice().reverse().map(p => `
          <tr>
            <td>${fmtDateShort(p.date)}</td>
            <td>${p.sets.map(s => `${s.weight}×${s.reps}`).join(', ')}</td>
            <td>${p.topWeight}${ex.unit}</td>
            <td>${p.bestE1rm.toFixed(1)}${ex.unit}</td>
            <td>${Math.round(p.volume).toLocaleString()}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

function renderBodyweight() {
  const canvas = document.getElementById('bwChart');
  const emptyEl = document.getElementById('bwEmpty');
  const listWrap = document.getElementById('bwListWrap');
  const entries = Store.data.bodyweight.slice().sort((a, b) => a.date.localeCompare(b.date));

  if (!entries.length) {
    emptyEl.style.display = 'block';
    canvas.style.display = 'none';
    listWrap.innerHTML = '';
    return;
  }
  emptyEl.style.display = 'none';
  canvas.style.display = 'block';

  const points = entries.map(e => ({ label: fmtDateShort(e.date), value: e.weight }));
  drawLineChart(canvas, points, { color: getComputedStyle(document.documentElement).getPropertyValue('--accent-2').trim(), yLabel: 'Bodyweight' });

  const recent = entries.slice().reverse().slice(0, 8);
  listWrap.innerHTML = `
    <table class="simple-table">
      <thead><tr><th>Date</th><th>Weight</th><th></th></tr></thead>
      <tbody>
        ${recent.map(e => `<tr><td>${fmtDateShort(e.date)}</td><td>${e.weight}</td><td><button class="del-x btn-sm btn-icon" data-id="${e.id}">Delete</button></td></tr>`).join('')}
      </tbody>
    </table>
  `;
  listWrap.querySelectorAll('.del-x').forEach(btn => {
    btn.addEventListener('click', () => {
      Store.data.bodyweight = Store.data.bodyweight.filter(b => b.id !== btn.dataset.id);
      Store.save();
      renderBodyweight();
    });
  });
}

// ----------------------------- Canvas line chart --------------------------------

function drawLineChart(canvas, points, opts = {}) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const dpr = window.devicePixelRatio || 1;
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

  const textColor = getComputedStyle(document.documentElement).getPropertyValue('--text-muted').trim() || '#8a90a0';
  const gridColor = getComputedStyle(document.documentElement).getPropertyValue('--border').trim() || '#2a2f3a';
  const lineColor = opts.color || '#ff6b35';

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

  // Line path
  const xFor = i => padL + (points.length === 1 ? plotW / 2 : (plotW * i) / (points.length - 1));
  const yFor = v => padT + plotH - ((v - minV) / (maxV - minV)) * plotH;

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

function hexToRgba(hex, alpha) {
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

// ----------------------------- EXERCISES TAB ------------------------------------

function initExercisesTab() {
  document.getElementById('btnAddExercise').addEventListener('click', () => {
    const name = document.getElementById('exName').value.trim();
    const category = document.getElementById('exCategory').value;
    const unit = document.getElementById('exUnit').value;
    if (!name) { toast('Enter an exercise name'); return; }
    if (Store.data.exercises.some(e => e.name.toLowerCase() === name.toLowerCase())) {
      toast('That exercise already exists');
      return;
    }
    Store.data.exercises.push({ id: uid(), name, category, unit });
    Store.save();
    document.getElementById('exName').value = '';
    refreshAllExerciseSelects();
    renderExerciseManageList();
    toast('Exercise added');
  });
}

function renderExerciseManageList() {
  const wrap = document.getElementById('exerciseList');
  const byCat = {};
  Store.data.exercises.forEach(ex => (byCat[ex.category] = byCat[ex.category] || []).push(ex));

  wrap.innerHTML = '';
  Object.keys(byCat).sort().forEach(cat => {
    const group = document.createElement('div');
    group.className = 'exercise-manage-group';
    group.innerHTML = `<h3>${cat}</h3>`;
    byCat[cat].sort((a, b) => a.name.localeCompare(b.name)).forEach(ex => {
      const usageCount = Store.data.workouts.reduce((n, w) => n + w.entries.filter(e => e.exerciseId === ex.id).length, 0);
      const row = document.createElement('div');
      row.className = 'exercise-row';
      row.innerHTML = `<span>${escapeHtml(ex.name)}<span class="ex-unit">${ex.unit}${usageCount ? ` · used ${usageCount}×` : ''}</span></span><button title="Delete exercise">🗑</button>`;
      row.querySelector('button').addEventListener('click', () => {
        if (usageCount > 0) {
          if (!confirm(`"${ex.name}" has ${usageCount} logged entr${usageCount === 1 ? 'y' : 'ies'}. Delete it anyway? Logged history for it will remain but show as deleted.`)) return;
        }
        Store.data.exercises = Store.data.exercises.filter(e => e.id !== ex.id);
        Store.save();
        refreshAllExerciseSelects();
        renderExerciseManageList();
        toast('Exercise deleted');
      });
      group.appendChild(row);
    });
    wrap.appendChild(group);
  });
}

// ----------------------------- DATA TAB ------------------------------------

function initDataTab() {
  document.getElementById('btnExport').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(Store.data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ironlog-backup-${todayStr()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast('Backup exported');
  });

  document.getElementById('importFile').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);
        if (!parsed.exercises || !parsed.workouts) throw new Error('Invalid format');
        if (!confirm('Import will replace all current data. Continue?')) return;
        Store.data = { exercises: parsed.exercises, workouts: parsed.workouts, bodyweight: parsed.bodyweight || [] };
        Store.save();
        refreshAllExerciseSelects();
        renderSessionForDate();
        renderHistoryTab();
        renderExerciseManageList();
        renderBodyweight();
        renderOverviewStats();
        document.getElementById('dataStatus').textContent = 'Import successful.';
        toast('Data imported');
      } catch (err) {
        document.getElementById('dataStatus').textContent = 'Import failed: invalid JSON file.';
        toast('Import failed');
      }
      e.target.value = '';
    };
    reader.readAsText(file);
  });

  document.getElementById('btnClearAll').addEventListener('click', () => {
    if (!confirm('This will permanently delete ALL workouts, exercises, and bodyweight entries. This cannot be undone. Continue?')) return;
    if (!confirm('Are you absolutely sure? Consider exporting a backup first.')) return;
    Store.data = { exercises: DEFAULT_EXERCISES.map(e => ({ id: uid(), ...e })), workouts: [], bodyweight: [] };
    Store.save();
    refreshAllExerciseSelects();
    renderSessionForDate();
    renderHistoryTab();
    renderExerciseManageList();
    renderBodyweight();
    renderOverviewStats();
    toast('All data cleared');
  });
}

function renderOverviewStats() {
  const wrap = document.getElementById('overviewStats');
  const totalWorkouts = Store.data.workouts.length;
  const totalSets = Store.data.workouts.reduce((n, w) => n + w.entries.reduce((m, e) => m + e.sets.length, 0), 0);
  const totalVolume = Store.data.workouts.reduce((v, w) => v + w.entries.reduce((s, e) => s + e.sets.reduce((x, st) => x + st.weight * st.reps, 0), 0), 0);
  const totalExercises = Store.data.exercises.length;

  wrap.innerHTML = `
    <div class="stat-tile"><div class="stat-label">Workouts logged</div><div class="stat-value">${totalWorkouts}</div></div>
    <div class="stat-tile"><div class="stat-label">Total sets</div><div class="stat-value">${totalSets}</div></div>
    <div class="stat-tile"><div class="stat-label">Total volume lifted</div><div class="stat-value">${Math.round(totalVolume).toLocaleString()}</div></div>
    <div class="stat-tile"><div class="stat-label">Exercises tracked</div><div class="stat-value">${totalExercises}</div></div>
  `;
}

// ----------------------------- History search ------------------------------------

function initHistorySearch() {
  document.getElementById('historySearch').addEventListener('input', renderHistoryTab);
}

// ----------------------------- Init ------------------------------------

function init() {
  Store.load();
  initTabs();
  refreshAllExerciseSelects();
  initLogTab();
  initProgressTab();
  initExercisesTab();
  initDataTab();
  initHistorySearch();

  const ex = Store.getExercise(document.getElementById('logExercise').value);
  document.getElementById('weightUnitLabel').textContent = ex ? `(${ex.unit})` : '(kg)';

  renderHistoryTab();
  renderExerciseManageList();
  renderOverviewStats();
}

document.addEventListener('DOMContentLoaded', init);
