// ============ INDEX PAGE ============
// Common logic (lang, theme, date, constants) is in js/Common.js

const _langReady = initLanguage();
initTheme();
setTodayDate();

// ============ PLANNING CARD: current activity widget ============
(function updatePlanningCard(){
  const STORAGE_KEY = 'vital_plannings';
  const MAIN_KEY = 'vital_main_planning';

  function run(){
    const descEl = document.querySelector('[data-i18n="index.card_planning_desc"]');
    if(!descEl) return;

    const plannings = VitalStore.get(STORAGE_KEY, []);
    if(!Array.isArray(plannings) || plannings.length === 0){ resetLabel(descEl); return; }

    let mainIdx = null;
    if(plannings.length === 1){ mainIdx = 0; }
    else {
      const v = parseInt(VitalStore.getRaw(MAIN_KEY));
      if(v >= 0 && v < plannings.length) mainIdx = v;
    }
    if(mainIdx === null){ resetLabel(descEl); return; }

    const p = plannings[mainIdx];
    if(!p || !p.activities){ resetLabel(descEl); return; }

    const now = new Date();
    const jsDay = now.getDay();
    const dayIdx = jsDay === 0 ? 6 : jsDay - 1;
    const hour = now.getHours();
    const min = now.getMinutes();
    const slot = hour * 4 + Math.floor(min / 15);

    // Get weeks (compat with old single-week plannings)
    const weeks = (p.weeks && p.weeks.length) ? p.weeks : [{ grid: p.grid, sleepConfig: p.sleepConfig }];
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const dayOfYear = Math.floor((now - startOfYear) / 86400000) + 1;
    const isoWeek = Math.ceil((dayOfYear + startOfYear.getDay()) / 7);
    const weekIdx = weeks.length > 1 ? (isoWeek - 1) % weeks.length : 0;
    const grid = weeks[weekIdx].grid;
    if(!grid){ resetLabel(descEl); return; }

    const isQuarter = grid.length === 96;
    const ai = isQuarter ? grid[slot][dayIdx] : grid[hour][dayIdx];
    const act = (ai !== null && ai !== undefined) ? p.activities[ai] : null;

    if(!act){ resetLabel(descEl); return; }

    // Find end of current activity block
    let endLabel = '';
    let nextAct = null;
    if(isQuarter){
      let endSlot = slot;
      while(endSlot < 96 && grid[endSlot][dayIdx] === ai) endSlot++;
      if(endSlot < 96){
        const eH = Math.floor(endSlot / 4);
        const eM = (endSlot % 4) * 15;
        endLabel = String(eH).padStart(2,'0') + ':' + String(eM).padStart(2,'0');
        // Next activity
        const nai = grid[endSlot][dayIdx];
        if(nai !== null && nai !== undefined) nextAct = p.activities[nai];
      }
    }

    const actLabel = i18n.t('index.planning_activity_label') || 'Activité en cours :';
    const untilLabel = i18n.t('index.planning_until_label') || "Jusqu'à";
    const nextLabel = i18n.t('index.planning_next_label') || 'Ensuite :';

    const untilHtml = endLabel ? '<span class="idx-now-until">' + untilLabel + ' ' + endLabel + '</span>' : '';
    const nextHtml = nextAct ? '<span class="idx-now-next"><span class="idx-now-dot" style="background:' + nextAct.color + '"></span>' + nextLabel + ' ' + nextAct.title + '</span>' : '';

    descEl.innerHTML =
      '<div class="idx-now-widget">' +
        '<div class="idx-now-body">' +
          '<span class="idx-now-dot" style="background:' + act.color + '"></span>' +
          '<span class="idx-now-act-label">' + actLabel + '</span>' +
          '<span class="idx-now-act-name">' + act.title + '</span>' +
          untilHtml +
        '</div>' +
        (nextAct ? '<div class="idx-now-body">' + nextHtml + '</div>' : '') +
      '</div>';
    descEl.removeAttribute('data-i18n');
  }

  function resetLabel(el){
    const txt = i18n.t('index.card_planning_desc');
    if(txt) el.textContent = txt;
    el.setAttribute('data-i18n', 'index.card_planning_desc');
  }

  _langReady.then(()=>{ run(); });
  setInterval(run, 60000);
})();

// ============ MOOD LOG ============
(function initMoodLog() {
  const MOOD_KEY = 'vital_mood_logs';
  const logModal = document.getElementById('mood-log-modal');
  const histModal = document.getElementById('mood-history-modal');
  const slider = document.getElementById('mood-score-slider');
  const scoreDisplay = document.getElementById('mood-score-display');
  const commentEl = document.getElementById('mood-comment');
  const canvas = document.getElementById('mood-chart-canvas');
  const tooltip = document.getElementById('mood-tooltip');
  const emptyMsg = document.getElementById('mood-history-empty');

  function loadMoods() { return VitalStore.get(MOOD_KEY, []); }
  function saveMoods(arr) { VitalStore.set(MOOD_KEY, arr); }

  function moodColor(v) {
    if (v <= -7) return '#d32f2f';
    if (v <= -4) return '#e65100';
    if (v <= -1) return '#f9a825';
    if (v <= 1)  return '#9e9e9e';
    if (v <= 4)  return '#66bb6a';
    if (v <= 7)  return '#2e7d32';
    return '#1b5e20';
  }

  // --- Score display update ---
  function updateScoreDisplay() {
    const v = parseInt(slider.value, 10);
    scoreDisplay.textContent = (v > 0 ? '+' : '') + v;
    scoreDisplay.style.color = moodColor(v);
  }
  slider.addEventListener('input', updateScoreDisplay);

  // --- Open / close helpers ---
  function openLogModal() {
    slider.value = 0;
    commentEl.value = '';
    updateScoreDisplay();
    logModal.classList.remove('hidden');
  }
  function closeLogModal() { logModal.classList.add('hidden'); }
  function openHistModal() {
    histModal.classList.remove('hidden');
    drawChart();
  }
  function closeHistModal() {
    histModal.classList.add('hidden');
    tooltip.classList.add('hidden');
  }

  document.getElementById('mood-log-btn').addEventListener('click', openLogModal);
  document.getElementById('mood-log-cancel-btn').addEventListener('click', closeLogModal);
  document.getElementById('mood-log-backdrop').addEventListener('click', closeLogModal);
  document.getElementById('mood-history-btn').addEventListener('click', openHistModal);
  document.getElementById('mood-history-close-btn').addEventListener('click', closeHistModal);
  document.getElementById('mood-history-backdrop').addEventListener('click', closeHistModal);
  document.getElementById('mood-history-reset-btn').addEventListener('click', function() {
    if (!confirm('Supprimer tout l\'historique des humeurs ?')) return;
    saveMoods([]);
    drawChart();
  });

  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      if (!logModal.classList.contains('hidden')) closeLogModal();
      if (!histModal.classList.contains('hidden')) closeHistModal();
    }
  });

  // --- Save mood ---
  document.getElementById('mood-log-save-btn').addEventListener('click', function() {
    const score = parseInt(slider.value, 10);
    const comment = commentEl.value.trim();
    const entry = {
      id: VitalStore.newId('mood_'),
      ts: Date.now(),
      score: score,
      comment: comment
    };
    const moods = loadMoods();
    moods.push(entry);
    saveMoods(moods);
    closeLogModal();
    drawMiniChart();
  });

  // --- Chart drawing ---
  let chartPoints = []; // [{x, y, entry}] for tooltip hit-testing

  function drawChart() {
    const moods = loadMoods();
    chartPoints = [];
    tooltip.classList.add('hidden');

    if (!moods.length) {
      canvas.style.display = 'none';
      emptyMsg.classList.remove('hidden');
      return;
    }
    canvas.style.display = 'block';
    emptyMsg.classList.add('hidden');

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.parentElement.getBoundingClientRect();
    const W = Math.floor(rect.width - 48);
    const H = 280;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);

    const cs = getComputedStyle(document.documentElement);
    const inkMute = cs.getPropertyValue('--ink-mute').trim() || '#999';
    const lineSoft = cs.getPropertyValue('--line-soft').trim() || '#eee';

    const pad = { top: 20, right: 20, bottom: 30, left: 36 };
    const cw = W - pad.left - pad.right;
    const ch = H - pad.top - pad.bottom;

    // Zero line
    const zeroY = pad.top + ch / 2;
    ctx.strokeStyle = lineSoft;
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(pad.left, zeroY);
    ctx.lineTo(pad.left + cw, zeroY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Y axis labels
    ctx.fillStyle = inkMute;
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText('+10', pad.left - 6, pad.top);
    ctx.fillText('0', pad.left - 6, zeroY);
    ctx.fillText('−10', pad.left - 6, pad.top + ch);

    // Points
    const sorted = moods.slice().sort((a, b) => a.ts - b.ts);
    const xStep = sorted.length === 1 ? 0 : cw / (sorted.length - 1);

    for (let i = 0; i < sorted.length; i++) {
      const e = sorted[i];
      const px = sorted.length === 1 ? pad.left + cw / 2 : pad.left + i * xStep;
      const py = pad.top + ch / 2 - (e.score / 10) * (ch / 2);
      chartPoints.push({ x: px, y: py, entry: e });
    }

    // Draw line
    if (chartPoints.length > 1) {
      ctx.strokeStyle = inkMute;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(chartPoints[0].x, chartPoints[0].y);
      for (let i = 1; i < chartPoints.length; i++) {
        ctx.lineTo(chartPoints[i].x, chartPoints[i].y);
      }
      ctx.stroke();
    }

    // Draw dots
    for (const p of chartPoints) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
      ctx.fillStyle = moodColor(p.entry.score);
      ctx.fill();
      ctx.strokeStyle = cs.getPropertyValue('--paper').trim() || '#fff';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // X axis date labels (first, last, middle if >4)
    ctx.fillStyle = inkMute;
    ctx.font = '9px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const fmtDate = ts => {
      const d = new Date(ts);
      return d.toLocaleDateString(getLangLocale(), { day: 'numeric', month: 'short' });
    };
    const fmtTime = ts => {
      const d = new Date(ts);
      return d.toLocaleTimeString(getLangLocale(), { hour: '2-digit', minute: '2-digit' });
    };
    if (chartPoints.length >= 1) {
      ctx.fillText(fmtDate(sorted[0].ts), chartPoints[0].x, pad.top + ch + 8);
    }
    if (chartPoints.length >= 2) {
      ctx.fillText(fmtDate(sorted[sorted.length - 1].ts), chartPoints[chartPoints.length - 1].x, pad.top + ch + 8);
    }
    if (chartPoints.length >= 5) {
      const mid = Math.floor(chartPoints.length / 2);
      ctx.fillText(fmtDate(sorted[mid].ts), chartPoints[mid].x, pad.top + ch + 8);
    }
  }

  // --- Tooltip on hover ---
  canvas.addEventListener('mousemove', function(e) {
    if (!chartPoints.length) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const mx = (e.clientX - rect.left) * (canvas.width / dpr / rect.width);
    const my = (e.clientY - rect.top) * (canvas.height / dpr / rect.height);
    let closest = null, minDist = 20;
    for (const p of chartPoints) {
      const d = Math.hypot(p.x - mx, p.y - my);
      if (d < minDist) { minDist = d; closest = p; }
    }
    if (closest) {
      const d = new Date(closest.entry.ts);
      const dateStr = d.toLocaleDateString(getLangLocale(), { day: 'numeric', month: 'short', year: 'numeric' });
      const timeStr = d.toLocaleTimeString(getLangLocale(), { hour: '2-digit', minute: '2-digit' });
      const score = closest.entry.score;
      let text = dateStr + ' ' + timeStr + '\nHumeur : ' + (score > 0 ? '+' : '') + score;
      if (closest.entry.comment) text += '\n' + closest.entry.comment;
      tooltip.textContent = text;
      tooltip.classList.remove('hidden');
      // Position relative to mood-body
      const bodyRect = canvas.parentElement.getBoundingClientRect();
      let tx = e.clientX - bodyRect.left + 12;
      let ty = e.clientY - bodyRect.top - 10;
      if (tx + 220 > bodyRect.width) tx = tx - 240;
      tooltip.style.left = tx + 'px';
      tooltip.style.top = ty + 'px';
    } else {
      tooltip.classList.add('hidden');
    }
  });
  canvas.addEventListener('mouseleave', function() {
    tooltip.classList.add('hidden');
  });

  // --- Mini chart in banner ---
  const miniCanvas = document.getElementById('mood-mini-chart');
  function drawMiniChart() {
    const moods = loadMoods();
    const dpr = window.devicePixelRatio || 1;
    const container = miniCanvas.parentElement;
    const W = Math.floor(container.clientWidth) || 200;
    const H = Math.floor(container.clientHeight) || 70;
    miniCanvas.width = W * dpr;
    miniCanvas.height = H * dpr;
    miniCanvas.style.width = W + 'px';
    miniCanvas.style.height = H + 'px';
    const ctx = miniCanvas.getContext('2d');
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, W, H);

    if (!moods.length) {
      const cs = getComputedStyle(document.documentElement);
      ctx.fillStyle = cs.getPropertyValue('--ink-mute').trim() || '#999';
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Aucune donnée', W / 2, H / 2);
      return;
    }

    const cs = getComputedStyle(document.documentElement);
    const inkMute = cs.getPropertyValue('--ink-mute').trim() || '#999';
    const lineSoft = cs.getPropertyValue('--line-soft').trim() || '#eee';
    const pad = { top: 6, right: 6, bottom: 6, left: 6 };
    const cw = W - pad.left - pad.right;
    const ch = H - pad.top - pad.bottom;

    // Zero line
    const zeroY = pad.top + ch / 2;
    ctx.strokeStyle = lineSoft;
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(pad.left, zeroY);
    ctx.lineTo(pad.left + cw, zeroY);
    ctx.stroke();
    ctx.setLineDash([]);

    const sorted = moods.slice().sort((a, b) => a.ts - b.ts);
    const xStep = sorted.length === 1 ? 0 : cw / (sorted.length - 1);
    const pts = [];
    for (let i = 0; i < sorted.length; i++) {
      const e = sorted[i];
      const px = sorted.length === 1 ? pad.left + cw / 2 : pad.left + i * xStep;
      const py = pad.top + ch / 2 - (e.score / 10) * (ch / 2);
      pts.push({ x: px, y: py, entry: e });
    }

    // Line
    if (pts.length > 1) {
      ctx.strokeStyle = inkMute;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
      ctx.stroke();
    }

    // Dots
    const paperColor = cs.getPropertyValue('--paper').trim() || '#fff';
    for (const p of pts) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
      ctx.fillStyle = moodColor(p.entry.score);
      ctx.fill();
      ctx.strokeStyle = paperColor;
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }

  // Draw mini chart on load
  drawMiniChart();

  // Redraw after reset
  document.getElementById('mood-history-reset-btn').addEventListener('click', function() {
    setTimeout(drawMiniChart, 50);
  });
})();
