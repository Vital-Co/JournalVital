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

// ============ TODO PANEL — Tasks, Events, Planning ============
(function initTodoPanel() {
  const PL_KEY = 'vital_plannings';
  const MAIN_PL_KEY = 'vital_main_planning';
  const TASKS_KEY = 'vital_tm_tasks';
  const EVENTS_KEY = 'vital_tm_events';

  const panel = document.getElementById('todo-panel');
  const nowContent = document.getElementById('todo-now-content');
  const dayContent = document.getElementById('todo-day-content');

  function run() {
    const plannings = VitalStore.get(PL_KEY, []);
    const tasks = VitalStore.get(TASKS_KEY, []);
    const events = VitalStore.get(EVENTS_KEY, []);

    // Visibility check
    const hasData = plannings.length > 0 || tasks.length > 0 || events.length > 0;
    if (!hasData || !panel) {
      if (panel) panel.classList.add('hidden');
      return;
    }
    panel.classList.remove('hidden');

    const now = new Date();
    updateNowCard(now, plannings, tasks, events);
    updateDayWidget(now, plannings, tasks, events);
  }

  function parseDuration(str) {
    if (!str) return 0;
    let total = 0;
    const hMatch = str.match(/(\d+)\s*h/i);
    const mMatch = str.match(/(\d+)\s*m/i);
    if (hMatch) total += parseInt(hMatch[1]) * 60;
    if (mMatch) total += parseInt(mMatch[1]);
    return total;
  }

  function updateNowCard(now, plannings, tasks, events) {
    const todayStr = now.toISOString().slice(0, 10);
    const dayOfWeek = now.getDay();
    const dayIdx = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const hh = now.getHours();
    const mm = now.getMinutes();
    const nowMinutes = hh * 60 + mm;

    const mainIdx = parseInt(VitalStore.getRaw(MAIN_PL_KEY));
    const p = (!isNaN(mainIdx) && plannings[mainIdx]) ? plannings[mainIdx] : null;
    let grid = null, isQuarter = false;
    if (p) {
      const weeks = (p.weeks && p.weeks.length) ? p.weeks : [{ grid: p.grid }];
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      const dayOfYear = Math.floor((now - startOfYear) / 86400000) + 1;
      const isoWeek = Math.ceil((dayOfYear + startOfYear.getDay()) / 7);
      const weekIdx = weeks.length > 1 ? (isoWeek - 1) % weeks.length : 0;
      grid = weeks[weekIdx].grid;
      isQuarter = grid && grid.length === 96;
    }

    const freeTitle  = i18n.t('planning.free_activity_title')  || 'Temps Libre';
    const sleepTitle = i18n.t('planning.sleep_activity_title') || 'Sommeil';

    function fmtDur(totalMin) {
      if (totalMin <= 0) return '0 min';
      const h = Math.floor(totalMin / 60);
      const m = totalMin % 60;
      if (h > 0 && m > 0) return `${h}h${String(m).padStart(2, '0')}`;
      if (h > 0) return `${h}h`;
      return `${m} min`;
    }

    function fmtClock(totalMin) {
      const h = Math.floor(totalMin / 60) % 24;
      const m = totalMin % 60;
      return `${String(h).padStart(2, '0')}h${String(m).padStart(2, '0')}`;
    }

    function getPlanAct(refMin) {
      if (!grid) return null;
      const h = Math.floor(refMin / 60);
      const m = refMin % 60;
      if (h >= 24) return null;
      const idx = isQuarter ? grid[h * 4 + Math.floor(m / 15)]?.[dayIdx] : grid[h]?.[dayIdx];
      if (idx === null || idx === undefined) return { isFree: true, title: freeTitle, color: '#bdc3c7' };
      const act = p.activities[idx];
      if (!act || act.title === sleepTitle) return null;
      return { ai: idx, title: act.title, color: act.color };
    }

    function getBlockBounds(ai, refMin) {
      const h = Math.floor(refMin / 60);
      const m = refMin % 60;
      const cur = isQuarter ? h * 4 + Math.floor(m / 15) : h;
      const max = isQuarter ? 96 : 24;
      let end = cur + 1;
      while (end < max && grid[end]?.[dayIdx] === ai) end++;
      let start = cur;
      while (start > 0 && grid[start - 1]?.[dayIdx] === ai) start--;
      return {
        startMin: isQuarter ? Math.floor(start / 4) * 60 + (start % 4) * 15 : start * 60,
        endMin:   isQuarter ? Math.floor(end   / 4) * 60 + (end   % 4) * 15 : end   * 60
      };
    }

    // Build data for now + 2 upcoming hours
    const slots = [];
    for (let offset = 0; offset <= 2; offset++) {
      const slotH = hh + offset;
      if (slotH >= 24) break;

      const fromMin = offset === 0 ? nowMinutes : slotH * 60;
      const toMin   = (slotH + 1) * 60;

      const planAct = getPlanAct(fromMin);
      let blockEnd = null, blockStart = null, progress = null;
      if (offset === 0 && planAct && !planAct.isFree) {
        const b = getBlockBounds(planAct.ai, nowMinutes);
        blockEnd   = b.endMin;
        blockStart = b.startMin;
        const dur = blockEnd - blockStart;
        if (dur > 0) progress = Math.max(0, Math.min(1, (nowMinutes - blockStart) / dur));
      }

      const slotEvents = events.filter(e => {
        if (e.date !== todayStr || !e.time) return false;
        const [eh, em] = e.time.split(':').map(Number);
        const evStart = eh * 60 + em;
        return evStart + (parseDuration(e.duration) || 60) > fromMin && evStart < toMin;
      }).sort((a, b) => (b.importance || 0) - (a.importance || 0));

      const slotTasks = tasks.filter(t => {
        if (t.done || t.active === false) return false;
        let taskStart;
        if (t.taskMode === 'deadline') {
          if (t.deadlineDate !== todayStr || !t.deadlineTime) return false;
          const [th, tm] = t.deadlineTime.split(':').map(Number);
          taskStart = th * 60 + tm;
        } else {
          if (!t.days || !t.days.includes(dayOfWeek) || !t.time) return false;
          const [th, tm] = t.time.split(':').map(Number);
          taskStart = th * 60 + tm;
        }
        return taskStart + (parseDuration(t.duration) || 60) > fromMin && taskStart < toMin;
      }).sort((a, b) => (b.importance || 0) - (a.importance || 0));

      const hasContent = !!(planAct || slotEvents.length || slotTasks.length);
      if (offset > 0 && !hasContent) continue;

      slots.push({ offset, slotH, planAct, blockEnd, blockStart, progress, tasks: slotTasks, events: slotEvents, hasContent });
    }

    // Nothing at all for current + next 2 hours
    if (!slots.some(s => s.hasContent)) {
      nowContent.innerHTML = `<div class="todo-now-nothing-full">${i18n.t('index.todo.now_nothing')}</div>`;
      return;
    }

    const nowLabel  = i18n.t('index.todo.now_label')         || 'Maintenant';
    const planLabel = i18n.t('index.todo.planning_activity') || 'Planning';
    const evLabel   = i18n.t('index.todo.event_label')       || 'Événement';
    const taskLabel = i18n.t('index.todo.task_label')        || 'Tâche';

    let html = '<div class="todo-now-slots">';

    for (const slot of slots) {
      const isNow = slot.offset === 0;

      let timeInfo = '';
      if (isNow) {
        const endMin = slot.blockEnd || (hh + 1) * 60;
        const remaining = endMin - nowMinutes;
        if (remaining > 0) {
          timeInfo = `encore ${fmtDur(remaining)}`;
          if (slot.blockEnd) timeInfo += ` · jusqu'à ${fmtClock(slot.blockEnd)}`;
        }
      } else {
        const minsUntil = slot.slotH * 60 - nowMinutes;
        timeInfo = `dans ${fmtDur(minsUntil)}`;
      }

      const label  = isNow ? nowLabel : `${String(slot.slotH).padStart(2, '0')}h00`;
      const marker = isNow ? '▶' : '→';

      html += `<div class="todo-now-slot${isNow ? ' is-now' : ' is-next'}">`;
      html += `<div class="todo-now-slot-header">
        <span class="todo-now-slot-marker">${marker}</span>
        <span class="todo-now-slot-label">${label}</span>
        <span class="todo-now-slot-timeinfo">${timeInfo}</span>
      </div>`;

      if (isNow && slot.progress !== null) {
        const pct = Math.round(slot.progress * 100);
        html += `<div class="todo-now-progress">
          <div class="todo-now-progress-bar"><div class="todo-now-progress-fill" style="width:${pct}%"></div></div>
          <span class="todo-now-progress-pct">${pct}%</span>
        </div>`;
      }

      html += '<div class="todo-now-slot-items">';

      if (!slot.hasContent) {
        html += `<span class="todo-now-nothing">${i18n.t('index.todo.now_nothing')}</span>`;
      } else {
        if (slot.planAct) {
          html += `<div class="todo-now-row">
            <span class="todo-now-color-dot" style="background:${slot.planAct.color}"></span>
            <span class="todo-now-badge tnb-planning">${planLabel}</span>
            <span class="todo-now-item-name">${slot.planAct.title}</span>
          </div>`;
        }
        for (const ev of slot.events) {
          const ts = ev.time ? `<span class="todo-now-item-time">${ev.time}</span>` : '';
          html += `<div class="todo-now-row">
            <span class="todo-now-color-dot" style="background:#e74c3c"></span>
            <span class="todo-now-badge tnb-event">${evLabel}</span>
            ${ts}
            <span class="todo-now-item-name">${ev.name}</span>
          </div>`;
        }
        for (const t of slot.tasks) {
          const ttime = t.taskMode === 'deadline' ? t.deadlineTime : t.time;
          const ts = ttime ? `<span class="todo-now-item-time">${ttime}</span>` : '';
          html += `<div class="todo-now-row">
            <span class="todo-now-color-dot" style="background:#3498db"></span>
            <span class="todo-now-badge tnb-task">${taskLabel}</span>
            ${ts}
            <span class="todo-now-item-name">${t.name}</span>
          </div>`;
        }
      }

      html += '</div></div>';
    }

    html += '</div>';
    nowContent.innerHTML = html;
  }

  function updateDayWidget(now, plannings, tasks, events) {
    const todayStr = now.toISOString().slice(0, 10);
    const dayOfWeek = now.getDay();
    const dayIdx = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const mainIdx = parseInt(VitalStore.getRaw(MAIN_PL_KEY));
    const p = plannings[mainIdx];
    const sleepTitle = i18n.t('planning.sleep_activity_title') || 'Sommeil';
    const freeTitle  = i18n.t('planning.free_activity_title')  || 'Temps Libre';
    const nowLabel   = i18n.t('index.todo.now_label')          || 'Maintenant';
    const nowH = now.getHours();
    const nowM = now.getMinutes();
    const nowMinutes = nowH * 60 + nowM;

    let grid = null;
    if (p) {
      const weeks = (p.weeks && p.weeks.length) ? p.weeks : [{ grid: p.grid, sleepConfig: p.sleepConfig }];
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      const dayOfYear = Math.floor((now - startOfYear) / 86400000) + 1;
      const isoWeek = Math.ceil((dayOfYear + startOfYear.getDay()) / 7);
      const weekIdx = weeks.length > 1 ? (isoWeek - 1) % weeks.length : 0;
      grid = weeks[weekIdx].grid;
    }

    // Build per-hour data
    const hours = [];
    for (let h = 0; h < 24; h++) {
      let isSleep = false;
      let activity = null;

      if (grid) {
        const isQuarter = grid.length === 96;
        if (isQuarter) {
          const acts = [0,1,2,3].map(q => {
            const ai = grid[h*4+q][dayIdx];
            return (ai !== null && ai !== undefined) ? p.activities[ai] : null;
          });
          isSleep = acts.every(a => a && a.title === sleepTitle);
          if (!isSleep) {
            const first = acts[0];
            activity = (first && first.title !== sleepTitle)
              ? { name: first.title, color: first.color }
              : { name: freeTitle, color: '#bdc3c7' };
          }
        } else {
          const ai = grid[h][dayIdx];
          const act = (ai !== null && ai !== undefined) ? p.activities[ai] : null;
          if (act && act.title === sleepTitle) { isSleep = true; }
          else activity = act
            ? { name: act.title, color: act.color }
            : { name: freeTitle, color: '#bdc3c7' };
        }
      }
      if (isSleep) continue;

      const hourTasks = tasks.filter(t => {
        if (t.done || t.active === false) return false;
        if (t.taskMode === 'deadline') return t.deadlineDate === todayStr && t.deadlineTime && parseInt(t.deadlineTime.split(':')[0]) === h;
        return t.days && t.days.includes(dayOfWeek) && t.time && parseInt(t.time.split(':')[0]) === h;
      }).sort((a, b) => (b.importance || 0) - (a.importance || 0));

      const hourEvents = events.filter(e =>
        e.date === todayStr && e.time && parseInt(e.time.split(':')[0]) === h
      ).sort((a, b) => (b.importance || 0) - (a.importance || 0));

      if (!activity && !hourTasks.length && !hourEvents.length) continue;

      hours.push({
        h, activity,
        tasks:  hourTasks.map(t => ({ type: 'task',  name: t.name, time: t.time || null })),
        events: hourEvents.map(e => ({ type: 'event', name: e.name, time: e.time || null }))
      });
    }

    if (!hours.length) {
      dayContent.innerHTML = `<div class="todo-day-empty">${i18n.t('index.todo.now_nothing')}</div>`;
      return;
    }

    // Group consecutive same-activity hours into segments
    const segments = [];
    let seg = null;
    for (const hd of hours) {
      const key = hd.activity ? `${hd.activity.name}|${hd.activity.color}` : '__none__';
      if (seg && seg.key === key) {
        seg.endH = hd.h + 1;
        seg.items.push(...hd.tasks, ...hd.events);
      } else {
        seg = { startH: hd.h, endH: hd.h + 1, activity: hd.activity, key, items: [...hd.tasks, ...hd.events] };
        segments.push(seg);
      }
    }

    // Render timeline
    let nowInserted = false;
    let html = '<div class="todo-day-timeline">';

    const nowTimeStr = `${String(nowH).padStart(2,'0')}:${String(nowM).padStart(2,'0')}`;
    const nowMarkerHtml = `
      <div class="todo-day-now-bar"></div>
      <div class="todo-day-now-label">${nowLabel} ${nowTimeStr}</div>
      <div class="todo-day-now-bar"></div>`;

    for (const s of segments) {
      const segStartMin = s.startH * 60;
      const segEndMin   = s.endH   * 60;
      const isPast    = segEndMin   <= nowMinutes;
      const isCurrent = nowMinutes  >= segStartMin && nowMinutes < segEndMin;
      const isFuture  = segStartMin >  nowMinutes;

      // Now falls in a gap before this segment
      if (!nowInserted && isFuture) {
        nowInserted = true;
        html += `<div class="todo-day-between-now">${nowMarkerHtml}</div>`;
      }

      const span = s.endH - s.startH;
      const timeLabel = span > 1
        ? `${String(s.startH).padStart(2,'0')}h&nbsp;&ndash;&nbsp;${String(s.endH).padStart(2,'0')}h`
        : `${String(s.startH).padStart(2,'0')}h`;

      const classes = ['todo-day-segment'];
      if (isPast)    classes.push('is-past');
      if (isCurrent) classes.push('is-current');

      html += `<div class="${classes.join(' ')}">`;
      html += `<div class="todo-day-seg-time">${timeLabel}</div>`;
      html += `<div class="todo-day-seg-body">`;

      if (s.activity) {
        html += `<div class="todo-day-activity-pill" style="background:${s.activity.color}">${s.activity.name}</div>`;
      }

      // Now marker inside current segment (after the pill)
      if (isCurrent && !nowInserted) {
        nowInserted = true;
        html += `<div class="todo-day-now-marker">${nowMarkerHtml}</div>`;
      }

      for (const item of s.items) {
        const timeStr  = item.time ? `<span class="todo-day-item-time">${item.time}</span>` : '';
        const badge    = item.type === 'task' ? 'badge-task' : 'badge-event';
        const dotColor = item.type === 'task' ? '#3498db' : '#e74c3c';
        const badgeLabel = i18n.t(`index.todo.${item.type}_label`);
        html += `<div class="todo-day-item">
          <span class="todo-day-item-dot" style="background:${dotColor}"></span>
          <span class="todo-day-item-badge ${badge}">${badgeLabel}</span>
          ${timeStr}
          <span class="todo-day-item-name">${item.name}</span>
        </div>`;
      }

      html += '</div></div>';
    }

    // Now is after all segments
    if (!nowInserted) {
      html += `<div class="todo-day-between-now">${nowMarkerHtml}</div>`;
    }

    html += '</div>';
    dayContent.innerHTML = html;
  }

  _langReady.then(() => {
    run();
    // Align subsequent updates to the next exact minute boundary
    const _now = new Date();
    const _msToNextMin = (60 - _now.getSeconds()) * 1000 - _now.getMilliseconds();
    setTimeout(() => { run(); setInterval(run, 60000); }, _msToNextMin + 100);
  });
})();
