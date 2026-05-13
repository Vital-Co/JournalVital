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

// ============ TODO PANEL — Tasks, Events, Planning ============
(function initTodoPanel() {
  const PL_KEY = 'vital_plannings';
  const MAIN_PL_KEY = 'vital_main_planning';
  const TASKS_KEY = 'vital_tm_tasks';
  const EVENTS_KEY = 'vital_tm_events';

  const panel = document.getElementById('todo-panel');
  const nowContent = document.getElementById('todo-now-content');
  const dayContent = document.getElementById('todo-day-content');
  const questContent = document.getElementById('todo-quest-content');

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
    updateQuestLog(now, tasks, events);
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

    let mainIdx = plannings.length === 1 ? 0 : parseInt(VitalStore.getRaw(MAIN_PL_KEY));
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
    const stepMin = grid ? (isQuarter ? 15 : 60) : 60;
    const gridMax = grid ? (isQuarter ? 96 : 24) : 24;

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
      return m === 0
        ? `${String(h).padStart(2, '0')}h`
        : `${String(h).padStart(2, '0')}h${String(m).padStart(2, '0')}`;
    }

    // Returns the contiguous-same-cell block at refMin: { startMin, endMin, cell }
    // cell is null/undefined (free), an activity index, or 'sleep'.
    function getCellBlockAt(refMin) {
      if (!grid || refMin < 0 || refMin >= 24 * 60) return null;
      const cur = Math.floor(refMin / stepMin);
      if (cur >= gridMax) return null;
      const cell = grid[cur]?.[dayIdx];
      let end = cur + 1;
      while (end < gridMax && grid[end]?.[dayIdx] === cell) end++;
      let start = cur;
      while (start > 0 && grid[start - 1]?.[dayIdx] === cell) start--;
      return { startMin: start * stepMin, endMin: end * stepMin, cell };
    }

    function cellToPlanAct(cell) {
      if (cell === null || cell === undefined) return { isFree: true, title: freeTitle, color: '#bdc3c7' };
      if (!p) return null;
      const act = p.activities[cell];
      if (!act || act.title === sleepTitle) return null;
      return { ai: cell, title: act.title, color: act.color };
    }

    // Walk forward from now through activity blocks (quarter-aware), collecting
    // slots until we reach the 2-hour horizon or have enough material to show.
    const slots = [];
    const horizonMin = Math.min(nowMinutes + 120, 24 * 60);
    let cursor = nowMinutes;

    while (cursor < horizonMin && slots.length < 4) {
      let blockStart, blockEnd, planAct;

      if (grid) {
        const block = getCellBlockAt(cursor);
        if (!block) break;
        const cellAct = (block.cell !== null && block.cell !== undefined) ? p.activities[block.cell] : null;
        if (cellAct && cellAct.title === sleepTitle) {
          if (block.endMin <= cursor) break;
          cursor = block.endMin;
          continue;
        }
        blockStart = block.startMin;
        blockEnd   = block.endMin;
        planAct    = cellToPlanAct(block.cell);
      } else {
        const slotH = Math.floor(cursor / 60);
        blockStart = slotH * 60;
        blockEnd   = (slotH + 1) * 60;
        planAct    = null;
      }

      const isNow = nowMinutes >= blockStart && nowMinutes < blockEnd;
      const slotStart = isNow ? nowMinutes : blockStart;
      const slotEnd   = blockEnd;

      let progress = null;
      if (isNow && planAct && !planAct.isFree) {
        const dur = blockEnd - blockStart;
        if (dur > 0) progress = Math.max(0, Math.min(1, (nowMinutes - blockStart) / dur));
      }

      const slotEvents = events.filter(e => {
        if (e.date !== todayStr || !e.time) return false;
        const [eh, em] = e.time.split(':').map(Number);
        const evStart = eh * 60 + em;
        return evStart + (parseDuration(e.duration) || 60) > slotStart && evStart < slotEnd;
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
        return taskStart + (parseDuration(t.duration) || 60) > slotStart && taskStart < slotEnd;
      }).sort((a, b) => (b.importance || 0) - (a.importance || 0));

      const hasContent = !!(planAct || slotEvents.length || slotTasks.length);

      // Always include the first non-sleep slot (so the user sees their current
      // state); for subsequent slots, only include those with something to show.
      if (slots.length === 0 || hasContent) {
        slots.push({
          isNow, slotStart, slotEnd,
          planAct, blockStart, blockEnd, progress,
          tasks: slotTasks, events: slotEvents, hasContent
        });
      }

      if (slotEnd <= cursor) break;
      cursor = slotEnd;
    }

    // Nothing at all for current + upcoming horizon
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
      const isNow = slot.isNow;

      let timeInfo = '';
      if (isNow) {
        const endMin = slot.blockEnd || slot.slotEnd;
        const remaining = endMin - nowMinutes;
        if (remaining > 0) {
          timeInfo = `encore ${fmtDur(remaining)}`;
          if (slot.blockEnd) timeInfo += ` · jusqu'à ${fmtClock(slot.blockEnd)}`;
        }
      } else {
        const minsUntil = slot.slotStart - nowMinutes;
        timeInfo = `dans ${fmtDur(minsUntil)}`;
      }

      const label  = isNow ? nowLabel : fmtClock(slot.slotStart);
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
    const mainIdx = plannings.length === 1 ? 0 : parseInt(VitalStore.getRaw(MAIN_PL_KEY));
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

    const isQuarter = grid && grid.length === 96;
    const cellMin   = isQuarter ? 15 : 60;
    const cellCount = isQuarter ? 96 : 24;

    function fmtClock(totalMin) {
      const h = Math.floor(totalMin / 60) % 24;
      const m = totalMin % 60;
      return m === 0
        ? `${String(h).padStart(2, '0')}h`
        : `${String(h).padStart(2, '0')}h${String(m).padStart(2, '0')}`;
    }

    // Build per-cell data (cell = 15 min on quarter grids, 60 min otherwise).
    // Sleep cells are dropped, free cells are kept as a "free" pseudo-activity.
    const cells = [];
    for (let i = 0; i < cellCount; i++) {
      const startMin = i * cellMin;
      const endMin   = startMin + cellMin;
      let isSleep = false;
      let activity = null;

      if (grid) {
        const ai = grid[i][dayIdx];
        const act = (ai !== null && ai !== undefined) ? p.activities[ai] : null;
        if (act && act.title === sleepTitle) {
          isSleep = true;
        } else {
          activity = act
            ? { name: act.title, color: act.color }
            : { name: freeTitle, color: '#bdc3c7' };
        }
      }
      if (isSleep) continue;

      const cellTasks = tasks.filter(t => {
        if (t.done || t.active === false) return false;
        let tStart;
        if (t.taskMode === 'deadline') {
          if (t.deadlineDate !== todayStr || !t.deadlineTime) return false;
          const [th, tm] = t.deadlineTime.split(':').map(Number);
          tStart = th * 60 + tm;
        } else {
          if (!t.days || !t.days.includes(dayOfWeek) || !t.time) return false;
          const [th, tm] = t.time.split(':').map(Number);
          tStart = th * 60 + tm;
        }
        return tStart >= startMin && tStart < endMin;
      }).sort((a, b) => (b.importance || 0) - (a.importance || 0));

      const cellEvents = events.filter(e => {
        if (e.date !== todayStr || !e.time) return false;
        const [eh, em] = e.time.split(':').map(Number);
        const evStart = eh * 60 + em;
        return evStart >= startMin && evStart < endMin;
      }).sort((a, b) => (b.importance || 0) - (a.importance || 0));

      if (!activity && !cellTasks.length && !cellEvents.length) continue;

      cells.push({
        startMin, endMin, activity,
        tasks:  cellTasks.map(t  => ({ type: 'task',  name: t.name, time: (t.taskMode === 'deadline' ? t.deadlineTime : t.time) || null })),
        events: cellEvents.map(e => ({ type: 'event', name: e.name, time: e.time || null }))
      });
    }

    if (!cells.length) {
      dayContent.innerHTML = `<div class="todo-day-empty">${i18n.t('index.todo.now_nothing')}</div>`;
      return;
    }

    // Group consecutive same-activity cells into segments. Cells separated by
    // a dropped sleep cell don't merge (contiguity check on startMin/endMin).
    const segments = [];
    let seg = null;
    for (const c of cells) {
      const key = c.activity ? `${c.activity.name}|${c.activity.color}` : '__none__';
      const contiguous = seg && seg.endMin === c.startMin;
      if (seg && seg.key === key && contiguous) {
        seg.endMin = c.endMin;
        seg.items.push(...c.tasks, ...c.events);
      } else {
        seg = { startMin: c.startMin, endMin: c.endMin, activity: c.activity, key, items: [...c.tasks, ...c.events] };
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
      const isPast    = s.endMin   <= nowMinutes;
      const isCurrent = nowMinutes  >= s.startMin && nowMinutes < s.endMin;
      const isFuture  = s.startMin >  nowMinutes;

      // Now falls in a gap before this segment
      if (!nowInserted && isFuture) {
        nowInserted = true;
        html += `<div class="todo-day-between-now">${nowMarkerHtml}</div>`;
      }

      const timeLabel = (s.endMin - s.startMin) > cellMin
        ? `${fmtClock(s.startMin)}&nbsp;&ndash;&nbsp;${fmtClock(s.endMin)}`
        : fmtClock(s.startMin);

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

  function updateQuestLog(now, tasks, events) {
    if (!questContent) return;
    const todayStr = now.toISOString().slice(0, 10);

    // Deadline tasks (not done, not inactive)
    const questTasks = tasks.filter(t =>
      t.taskMode === 'deadline' && !t.done && t.active !== false && t.deadlineDate
    );
    // Events from today onwards
    const questEvents = events.filter(e => e.date && e.date >= todayStr);

    const entries = [
      ...questTasks.map(t => ({
        type: 'task',
        name: t.name,
        date: t.deadlineDate,
        time: t.deadlineTime || null,
        importance: t.importance || 0
      })),
      ...questEvents.map(e => ({
        type: 'event',
        name: e.name,
        date: e.date,
        time: e.time || null,
        importance: e.importance || 0
      }))
    ];

    if (!entries.length) {
      questContent.innerHTML = `<div class="quest-empty">${i18n.t('index.todo.now_nothing') || 'Rien à venir...'}</div>`;
      return;
    }

    // Sort: date asc, then importance desc
    entries.sort((a, b) => {
      if (a.date < b.date) return -1;
      if (a.date > b.date) return 1;
      return (b.importance || 0) - (a.importance || 0);
    });

    function daysUntil(dateStr) {
      const today = new Date(todayStr + 'T00:00:00');
      const d = new Date(dateStr + 'T00:00:00');
      return Math.round((d - today) / 86400000);
    }

    // Maps days-until to a green→red urgency color (HSL hue 120→0 over 14 days)
    function urgencyColor(days) {
      const clamped = Math.max(0, Math.min(14, days));
      const hue = Math.round((clamped / 14) * 120);
      return {
        bg: `hsla(${hue}, 70%, 50%, 0.10)`,
        border: `hsl(${hue}, 60%, 45%)`
      };
    }

    function relativeLabel(days) {
      if (days < 0) return `J${days}`;
      if (days === 0) return "Aujourd'hui";
      if (days === 1) return 'Demain';
      return `J+${days}`;
    }

    const taskLabel  = i18n.t('index.todo.task_label')  || 'Tâche';
    const eventLabel = i18n.t('index.todo.event_label') || 'Événement';

    let html = '';
    for (const entry of entries) {
      const days = daysUntil(entry.date);
      const { bg, border } = urgencyColor(days);
      const badgeClass = entry.type === 'task' ? 'badge-task' : 'badge-event';
      const badgeText  = entry.type === 'task' ? taskLabel : eventLabel;
      const imp = entry.importance != null ? Math.max(0, Math.min(100, +entry.importance)) : 0;
      const impHtml = `<span class="quest-imp-bar"><span class="quest-imp-bar-fill" style="width:${imp}%"></span></span>`;
      const timeHtml = entry.time ? `<span class="quest-time">${entry.time}</span>` : '';
      const dateLbl  = relativeLabel(days);

      html += `<div class="quest-entry" style="background:${bg};border-left-color:${border}">
        <div class="quest-entry-header">
          <span class="quest-entry-badge ${badgeClass}">${badgeText}</span>
          ${impHtml}
          <span class="quest-date-label">${dateLbl}</span>
        </div>
        <div class="quest-entry-name">${entry.name}${timeHtml}</div>
      </div>`;
    }
    questContent.innerHTML = html;
  }

  _langReady.then(() => {
    run();
    // Align subsequent updates to the next exact minute boundary
    const _now = new Date();
    const _msToNextMin = (60 - _now.getSeconds()) * 1000 - _now.getMilliseconds();
    setTimeout(() => { run(); setInterval(run, 60000); }, _msToNextMin + 100);
  });
})();
