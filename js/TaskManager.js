/* TaskManager — logique spécifique */

(function () {
  'use strict';

  const TASKS_KEY         = 'vital_tm_tasks';
  const EVENTS_KEY        = 'vital_tm_events';
  const TASK_HISTORY_KEY  = 'vital_tm_task_history';
  const EVENT_ARCHIVE_KEY = 'vital_tm_event_archive';

  // ---- Helpers ----
  function loadTasks()        { return VitalStore.get(TASKS_KEY, []); }
  function saveTasks(a)       { VitalStore.set(TASKS_KEY, a); }
  function loadEvents()       { return VitalStore.get(EVENTS_KEY, []); }
  function saveEvents(a)      { VitalStore.set(EVENTS_KEY, a); }
  function loadTaskHistory()  { return VitalStore.get(TASK_HISTORY_KEY, []); }
  function saveTaskHistory(a) { VitalStore.set(TASK_HISTORY_KEY, a); }
  function loadEventArchive() { return VitalStore.get(EVENT_ARCHIVE_KEY, []); }
  function saveEventArchive(a){ VitalStore.set(EVENT_ARCHIVE_KEY, a); }

  function t(key, fallback) {
    try { return i18n.t(key) || fallback || key; }
    catch(e) { return fallback || key; }
  }

  // ---- Modal helpers ----
  function openModal(id) { document.getElementById(id).classList.remove('hidden'); }
  function closeModal(id){ document.getElementById(id).classList.add('hidden'); }

  document.querySelectorAll('[data-close]').forEach(el => {
    el.addEventListener('click', () => closeModal(el.dataset.close));
  });

  // ---- Tags helper ----
  function setupTags(containerId, inputId, addBtnId) {
    const tags = [];
    const container = document.getElementById(containerId);
    const input = document.getElementById(inputId);
    const btn = document.getElementById(addBtnId);

    function render() {
      container.innerHTML = '';
      tags.forEach((tag, i) => {
        const span = document.createElement('span');
        span.className = 'tm-tag';
        span.textContent = tag;
        const rm = document.createElement('button');
        rm.type = 'button';
        rm.className = 'tm-tag-remove';
        rm.textContent = '×';
        rm.onclick = () => { tags.splice(i, 1); render(); };
        span.appendChild(rm);
        container.appendChild(span);
      });
    }

    function add() {
      const v = input.value.trim();
      if (v && !tags.includes(v)) { tags.push(v); render(); }
      input.value = '';
    }

    btn.addEventListener('click', add);
    input.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); add(); } });

    return {
      get: () => [...tags],
      set: (arr) => { tags.length = 0; arr.forEach(t => tags.push(t)); render(); },
      clear: () => { tags.length = 0; render(); }
    };
  }

  const taskTags  = setupTags('task-tags',  'task-tag-input',  'task-tag-add');
  const eventTags = setupTags('event-tags', 'event-tag-input', 'event-tag-add');

  // ---- Range display ----
  document.getElementById('task-importance').addEventListener('input', e => {
    document.getElementById('task-importance-val').textContent = e.target.value;
  });

  // ---- Task mode toggle (repeat vs deadline) ----
  const modeRepeatBtn = document.getElementById('task-mode-repeat');
  const modeDeadlineBtn = document.getElementById('task-mode-deadline');
  const repeatFields = document.getElementById('task-repeat-fields');
  const deadlineOnlyFields = document.getElementById('task-deadline-only-fields');
  let taskMode = 'repeat'; // 'repeat' or 'deadline'

  function setTaskMode(mode) {
    taskMode = mode;
    modeRepeatBtn.classList.toggle('active', mode === 'repeat');
    modeDeadlineBtn.classList.toggle('active', mode === 'deadline');
    repeatFields.classList.toggle('hidden', mode !== 'repeat');
    deadlineOnlyFields.classList.toggle('hidden', mode !== 'deadline');
  }

  modeRepeatBtn.addEventListener('click', () => setTaskMode('repeat'));
  modeDeadlineBtn.addEventListener('click', () => setTaskMode('deadline'));

  // ---- Day toggles ----
  document.querySelectorAll('#task-days .tm-day').forEach(btn => {
    btn.addEventListener('click', () => btn.classList.toggle('active'));
  });

  // ---- Helper: today's date as YYYY-MM-DD ----
  function todayDate() { return new Date().toISOString().slice(0, 10); }

  function todayTime() {
    const now = new Date();
    return String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
  }

  // ---- Reset modal fields ----
  function resetTaskModal(data) {
    document.getElementById('task-name').value = data ? data.name : '';
    document.getElementById('task-duration').value = data ? data.duration : '00:00';
    document.getElementById('task-time').value = data ? data.time || '' : todayTime();
    document.getElementById('task-week-interval').value = data ? (data.weekInterval || 1) : 1;
    document.getElementById('task-description').value = data ? data.description : '';
    document.getElementById('task-importance').value = data ? data.importance : 50;
    document.getElementById('task-importance-val').textContent = data ? data.importance : 50;
    document.getElementById('task-deadline-date').value = data && data.deadlineDate ? data.deadlineDate : todayDate();
    document.getElementById('task-deadline-time').value = data && data.deadlineTime ? data.deadlineTime : todayTime();
    document.getElementById('task-error').classList.add('hidden');

    // days
    document.querySelectorAll('#task-days .tm-day').forEach(btn => {
      btn.classList.toggle('active', data && data.days ? data.days.includes(btn.dataset.day) : false);
    });

    // tags
    taskTags.set(data && data.tags ? data.tags : []);

    // mode
    setTaskMode(data && data.taskMode === 'deadline' ? 'deadline' : 'repeat');
  }

  function resetEventModal(data) {
    document.getElementById('event-name').value = data ? data.name : '';
    document.getElementById('event-duration').value = data ? data.duration : '00:00';
    document.getElementById('event-date').value = data ? data.date || '' : todayDate();
    document.getElementById('event-time').value = data ? data.time || '' : todayTime();
    document.getElementById('event-description').value = data ? data.description : '';
    document.getElementById('event-error').classList.add('hidden');
    eventTags.set(data && data.tags ? data.tags : []);
  }

  // ---- Collect form data ----
  function collectTask() {
    const days = [];
    document.querySelectorAll('#task-days .tm-day.active').forEach(b => days.push(+b.dataset.day));
    return {
      name: document.getElementById('task-name').value.trim(),
      duration: document.getElementById('task-duration').value.trim(),
      time: taskMode === 'repeat' ? document.getElementById('task-time').value : '',
      days: taskMode === 'repeat' ? days : [],
      weekInterval: taskMode === 'repeat' ? (parseInt(document.getElementById('task-week-interval').value) || 1) : 1,
      tags: taskTags.get(),
      importance: +document.getElementById('task-importance').value,
      taskMode,
      deadlineDate: taskMode === 'deadline' ? document.getElementById('task-deadline-date').value : '',
      deadlineTime: taskMode === 'deadline' ? document.getElementById('task-deadline-time').value : '',
      description: document.getElementById('task-description').value.trim()
    };
  }

  function collectEvent() {
    return {
      name: document.getElementById('event-name').value.trim(),
      duration: document.getElementById('event-duration').value.trim(),
      date: document.getElementById('event-date').value,
      time: document.getElementById('event-time').value,
      tags: eventTags.get(),
      description: document.getElementById('event-description').value.trim()
    };
  }

  // ---- Editing state ----
  let editingTaskId = null;
  let editingEventId = null;

  // ---- Open modals ----
  document.getElementById('btn-new-task').addEventListener('click', () => {
    editingTaskId = null;
    resetTaskModal(null);
    document.querySelector('#modal-task .tm-title').textContent = t('task.modal_task_title', 'Nouvelle tâche');
    openModal('modal-task');
  });

  document.getElementById('btn-new-event').addEventListener('click', () => {
    editingEventId = null;
    resetEventModal(null);
    document.querySelector('#modal-event .tm-title').textContent = t('task.modal_event_title', 'Nouvel événement');
    openModal('modal-event');
  });

  // ---- Save task ----
  document.getElementById('task-save-btn').addEventListener('click', () => {
    const data = collectTask();
    if (!data.name) {
      const err = document.getElementById('task-error');
      err.textContent = t('task.error_name_required', 'Le nom est obligatoire.');
      err.classList.remove('hidden');
      return;
    }
    const tasks = loadTasks();
    if (editingTaskId) {
      const idx = tasks.findIndex(t => t.id === editingTaskId);
      if (idx >= 0) Object.assign(tasks[idx], data);
    } else {
      data.id = VitalStore.newId('t_');
      data.type = 'task';
      data.done = false;
      data.active = true;
      data.activatedAt = new Date().toISOString();
      data.createdAt = new Date().toISOString();
      tasks.push(data);
    }
    saveTasks(tasks);
    closeModal('modal-task');
    renderTasks();
  });

  // ---- Save event ----
  document.getElementById('event-save-btn').addEventListener('click', () => {
    const data = collectEvent();
    if (!data.name) {
      const err = document.getElementById('event-error');
      err.textContent = t('task.error_name_required', 'Le nom est obligatoire.');
      err.classList.remove('hidden');
      return;
    }
    const events = loadEvents();
    if (editingEventId) {
      const idx = events.findIndex(e => e.id === editingEventId);
      if (idx >= 0) Object.assign(events[idx], data);
    } else {
      data.id = VitalStore.newId('e_');
      data.type = 'event';
      data.createdAt = new Date().toISOString();
      events.push(data);
    }
    saveEvents(events);
    closeModal('modal-event');
    renderEvents();
  });

  // ---- Render lists ----
  function renderTasks() {
    const tasks = loadTasks();
    const list = document.getElementById('task-list');
    const empty = document.getElementById('task-empty');
    list.innerHTML = '';

    const active = tasks.filter(t => !t.done);
    empty.classList.toggle('hidden', active.length > 0);

    active.forEach((task, idx) => {
      list.appendChild(buildTaskCard(task, idx, active.length));
    });
  }

  function renderEvents() {
    const events = loadEvents();
    const list = document.getElementById('event-list');
    const empty = document.getElementById('event-empty');
    list.innerHTML = '';
    empty.classList.toggle('hidden', events.length > 0);

    events.forEach((ev, idx) => {
      list.appendChild(buildEventCard(ev, idx, events.length));
    });
  }

  function getNextOccurrence(task) {
    if (!task.days || !task.days.length) return null;
    const now = new Date();
    const useInterval = task.weekInterval && task.weekInterval > 1 && task.activatedAt;

    if (useInterval) {
      const intervalMs = task.weekInterval * 7 * 24 * 60 * 60 * 1000;
      const activatedAt = new Date(task.activatedAt);
      let earliest = null;

      for (const dayOfWeek of task.days) {
        const activatedDow = activatedAt.getDay();
        const daysToMonday = activatedDow === 0 ? -6 : 1 - activatedDow;
        const weekStart = new Date(activatedAt);
        weekStart.setHours(0, 0, 0, 0);
        weekStart.setDate(weekStart.getDate() + daysToMonday);

        const dowOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        const anchor = new Date(weekStart);
        anchor.setDate(anchor.getDate() + dowOffset);
        if (task.time) {
          const [hh, mm] = task.time.split(':').map(Number);
          anchor.setHours(hh, mm, 0, 0);
        } else {
          anchor.setHours(23, 59, 0, 0);
        }

        let candidate = new Date(anchor);
        if (candidate <= now) {
          const elapsed = now.getTime() - candidate.getTime();
          const intervalsNeeded = Math.ceil(elapsed / intervalMs);
          candidate = new Date(candidate.getTime() + intervalsNeeded * intervalMs);
        }
        if (!earliest || candidate < earliest) earliest = candidate;
      }
      return earliest;
    } else {
      for (let offset = 0; offset < 8; offset++) {
        const candidate = new Date(now);
        candidate.setDate(candidate.getDate() + offset);
        const dayOfWeek = candidate.getDay();
        if (task.days.includes(dayOfWeek)) {
          if (task.time) {
            const [hh, mm] = task.time.split(':').map(Number);
            candidate.setHours(hh, mm, 0, 0);
          } else {
            candidate.setHours(23, 59, 0, 0);
          }
          if (candidate > now) return candidate;
        }
      }
      return null;
    }
  }

  function buildTaskCard(task, idx, total) {
    const div = document.createElement('div');
    div.className = 'tm-item' + (task.active === false ? ' inactive' : '');

    const main = document.createElement('div');
    main.className = 'tm-item-main';

    const nameRow = document.createElement('div');
    nameRow.className = 'tm-item-name-row';
    const name = document.createElement('span');
    name.className = 'tm-item-name' + (task.done ? ' done' : '');
    name.textContent = task.name;
    nameRow.appendChild(name);
    // Rename button next to title
    const btnRen = document.createElement('button');
    btnRen.className = 'btn-rename';
    btnRen.textContent = '✏️';
    btnRen.title = t('common.rename', 'Renommer');
    btnRen.onclick = (e) => {
      e.stopPropagation();
      const newName = prompt(t('task.prompt_rename', 'Nouveau nom :'), task.name);
      if (newName && newName.trim()) {
        const tasks = loadTasks();
        const item = tasks.find(t => t.id === task.id);
        if (item) { item.name = newName.trim(); saveTasks(tasks); renderTasks(); }
      }
    };
    nameRow.appendChild(btnRen);
    main.appendChild(nameRow);

    // Time info (center)
    const timeInfo = document.createElement('div');
    timeInfo.className = 'tm-item-timeinfo';
    if (task.taskMode === 'deadline') {
      const dlDate = task.deadlineDate || '';
      const dlTime = task.deadlineTime || '';
      if (dlDate) {
        const deadlineMs = new Date(dlDate + 'T' + (dlTime || '23:59')).getTime();
        const nowMs = Date.now();
        const diffMs = deadlineMs - nowMs;
        const diffDays = diffMs / (1000 * 60 * 60 * 24);
        // Urgency color: green (>7d) -> yellow (3-7d) -> orange (1-3d) -> red (<1d)
        let urgencyColor = '#4caf50';
        if (diffDays < 0) urgencyColor = '#b71c1c';
        else if (diffDays < 1) urgencyColor = '#e53935';
        else if (diffDays < 3) urgencyColor = '#ff9800';
        else if (diffDays < 7) urgencyColor = '#fdd835';
        const dlLabel = document.createElement('span');
        dlLabel.className = 'tm-timeinfo-deadline';
        dlLabel.style.borderLeft = '4px solid ' + urgencyColor;
        dlLabel.style.paddingLeft = '6px';
        const dateStr = new Date(dlDate + 'T' + (dlTime || '00:00')).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
        dlLabel.textContent = '⏰ ' + dateStr + (dlTime ? ' ' + dlTime : '');
        timeInfo.appendChild(dlLabel);
        const remaining = document.createElement('span');
        remaining.className = 'tm-timeinfo-remaining';
        remaining.style.color = urgencyColor;
        if (diffDays < 0) {
          remaining.textContent = '⚠ ' + t('task.overdue', 'en retard');
        } else {
          let timeStr;
          if (diffDays < 1) {
            const h = Math.floor(diffMs / 3600000);
            const m = Math.floor((diffMs % 3600000) / 60000);
            timeStr = h + 'h' + (m < 10 ? '0' : '') + m;
          } else {
            const d = Math.floor(diffDays);
            const remH = Math.floor((diffMs % 86400000) / 3600000);
            timeStr = d + 'j' + (remH > 0 ? remH + 'h' : '');
          }
          remaining.textContent = t('task.deadline_in', 'Deadline dans {time}').replace('{time}', timeStr);
        }
        timeInfo.appendChild(remaining);
      }
      if (task.duration) {
        const durSpan = document.createElement('span');
        durSpan.className = 'tm-timeinfo-timer';
        durSpan.textContent = '⏱ ' + t('task.field_duration', 'Durée') + ': ' + task.duration;
        timeInfo.appendChild(durSpan);
      }
    } else {
      // Repeat mode
      const dayNames = [t('task.day_sun','Dim'), t('task.day_mon','Lun'), t('task.day_tue','Mar'), t('task.day_wed','Mer'), t('task.day_thu','Jeu'), t('task.day_fri','Ven'), t('task.day_sat','Sam')];
      if (task.days && task.days.length) {
        const daysStr = task.days.map(d => dayNames[d]).join(', ');
        const repSpan = document.createElement('span');
        repSpan.className = 'tm-timeinfo-repeat';
        repSpan.textContent = '🔁 ' + daysStr;
        timeInfo.appendChild(repSpan);
        if (task.time) {
          const timeSpan = document.createElement('span');
          timeSpan.className = 'tm-timeinfo-repeat';
          timeSpan.textContent = '🕐 ' + task.time + (task.duration ? '  ⏱ ' + t('task.field_duration', 'Durée') + ': ' + task.duration : '');
          timeInfo.appendChild(timeSpan);
        } else if (task.duration) {
          const durSpan = document.createElement('span');
          durSpan.className = 'tm-timeinfo-timer';
          durSpan.textContent = '⏱ ' + t('task.field_duration', 'Durée') + ': ' + task.duration;
          timeInfo.appendChild(durSpan);
        }
        // Next occurrence
        const now = new Date();
        const nextOccurrence = getNextOccurrence(task);
        if (nextOccurrence) {
          const diffMs = nextOccurrence - now;
          const diffH = Math.floor(diffMs / 3600000);
          const diffM = Math.floor((diffMs % 3600000) / 60000);
          let timeStr;
          if (diffH >= 24) {
            timeStr = Math.floor(diffH / 24) + 'j' + ((diffH % 24) > 0 ? (diffH % 24) + 'h' : '');
          } else {
            timeStr = diffH + 'h' + (diffM < 10 ? '0' : '') + diffM;
          }
          const timerSpan = document.createElement('span');
          timerSpan.className = 'tm-timeinfo-timer';
          timerSpan.textContent = t('task.next_in', 'Prochaine fois dans {time}').replace('{time}', timeStr);
          timeInfo.appendChild(timerSpan);
        }
      }
    }
    main.appendChild(timeInfo);

    // Importance (bottom right)
    if (task.importance !== undefined && task.importance !== null) {
      const imp = document.createElement('div');
      imp.className = 'tm-item-importance';
      imp.textContent = task.importance + '/100';
      main.appendChild(imp);
    }

    // Description (hover tooltip – follows cursor, above-right)
    if (task.description) {
      const desc = document.createElement('div');
      desc.className = 'tm-item-desc-hover';
      desc.textContent = task.description;
      div.appendChild(desc);
      div.addEventListener('mousemove', (e) => {
        desc.style.display = 'block';
        desc.style.left = (e.clientX + 12) + 'px';
        desc.style.top = (e.clientY - desc.offsetHeight - 8) + 'px';
      });
      div.addEventListener('mouseleave', () => { desc.style.display = 'none'; });
    }

    div.appendChild(main);

    const actions = document.createElement('div');
    actions.className = 'tm-item-actions';

    // Active toggle
    const isActive = task.active !== false;
    const btnToggle = document.createElement('button');
    btnToggle.className = 'btn-active-toggle' + (isActive ? ' is-active' : ' is-inactive');
    btnToggle.textContent = isActive ? '●' : '○';
    btnToggle.title = isActive
      ? t('task.btn_deactivate', 'Désactiver')
      : t('task.btn_activate', 'Activer');
    btnToggle.onclick = () => {
      const tasks = loadTasks();
      const item = tasks.find(t => t.id === task.id);
      if (item) {
        item.active = !isActive;
        if (!isActive) item.activatedAt = new Date().toISOString();
        saveTasks(tasks);
        renderTasks();
      }
    };
    actions.appendChild(btnToggle);

    // Reorder arrows
    if (total > 1) {
      const reorder = document.createElement('span');
      reorder.className = 'journal-card-reorder';
      const btnUp = document.createElement('button');
      btnUp.className = 'btn-move';
      btnUp.textContent = '▲';
      btnUp.title = t('common.move_up', 'Monter');
      btnUp.disabled = idx === 0;
      btnUp.onclick = () => { moveTask(task.id, -1); };
      const btnDown = document.createElement('button');
      btnDown.className = 'btn-move';
      btnDown.textContent = '▼';
      btnDown.title = t('common.move_down', 'Descendre');
      btnDown.disabled = idx === total - 1;
      btnDown.onclick = () => { moveTask(task.id, 1); };
      reorder.appendChild(btnUp);
      reorder.appendChild(btnDown);
      actions.appendChild(reorder);
    }

    // Edit
    const btnEdit = document.createElement('button');
    btnEdit.className = 'btn-edit';
    btnEdit.textContent = '✎';
    btnEdit.title = t('task.btn_edit', 'Modifier');
    btnEdit.onclick = (e) => {
      e.stopPropagation();
      editingTaskId = task.id;
      resetTaskModal(task);
      document.querySelector('#modal-task .tm-title').textContent = t('task.modal_task_edit_title', 'Modifier la tâche');
      openModal('modal-task');
    };
    actions.appendChild(btnEdit);

    // Done
    const btnDone = document.createElement('button');
    btnDone.className = 'btn-done';
    btnDone.textContent = '✓';
    btnDone.title = t('task.btn_done_title', 'Marquer comme achevée');
    btnDone.onclick = () => {
      const isRepeat = task.taskMode !== 'deadline';
      const confirmMsg = isRepeat
        ? t('task.confirm_done_repeat', 'Enregistrer une occurrence accomplie ?')
        : t('task.confirm_done_deadline', 'Archiver cette tâche comme achevée ?');
      if (!confirm(confirmMsg)) return;

      const histEntry = {
        id: VitalStore.newId('th_'),
        taskId: task.id,
        taskName: task.name,
        mode: isRepeat ? 'repeat' : 'deadline',
        completedAt: new Date().toISOString(),
        tags: task.tags || [],
        importance: task.importance,
        description: task.description || ''
      };
      const hist = loadTaskHistory();
      hist.push(histEntry);
      saveTaskHistory(hist);

      if (!isRepeat) {
        const tasks = loadTasks();
        const item = tasks.find(t => t.id === task.id);
        if (item) { item.done = true; saveTasks(tasks); }
      }
      renderTasks();
    };
    actions.appendChild(btnDone);

    // Delete
    const btnDel = document.createElement('button');
    btnDel.className = 'btn-del';
    btnDel.textContent = '✕';
    btnDel.title = t('common.delete', 'Supprimer');
    btnDel.onclick = () => {
      if (!confirm(t('task.confirm_delete', 'Supprimer cet élément ?'))) return;
      const tasks = loadTasks().filter(t => t.id !== task.id);
      saveTasks(tasks);
      renderTasks();
    };
    actions.appendChild(btnDel);

    div.appendChild(actions);
    return div;
  }

  function buildEventCard(ev, idx, total) {
    const div = document.createElement('div');
    div.className = 'tm-item';

    const main = document.createElement('div');
    main.className = 'tm-item-main';

    const nameRow = document.createElement('div');
    nameRow.className = 'tm-item-name-row';
    const name = document.createElement('span');
    name.className = 'tm-item-name';
    name.textContent = ev.name;
    nameRow.appendChild(name);
    // Rename button next to title
    const btnRen = document.createElement('button');
    btnRen.className = 'btn-rename';
    btnRen.textContent = '✏️';
    btnRen.title = t('common.rename', 'Renommer');
    btnRen.onclick = (e) => {
      e.stopPropagation();
      const newName = prompt(t('task.prompt_rename', 'Nouveau nom :'), ev.name);
      if (newName && newName.trim()) {
        const events = loadEvents();
        const item = events.find(e => e.id === ev.id);
        if (item) { item.name = newName.trim(); saveEvents(events); renderEvents(); }
      }
    };
    nameRow.appendChild(btnRen);
    main.appendChild(nameRow);

    // Time info
    const timeInfo = document.createElement('div');
    timeInfo.className = 'tm-item-timeinfo';
    if (ev.date) {
      const evDate = new Date(ev.date + (ev.time ? 'T' + ev.time : 'T00:00'));
      const now = new Date();
      const diffMs = evDate - now;
      const dateStr = ev.date + (ev.time ? ' 🕐 ' + ev.time : '');
      const dateSpan = document.createElement('span');
      dateSpan.className = 'tm-timeinfo-deadline';
      dateSpan.textContent = '📅 ' + dateStr;
      timeInfo.appendChild(dateSpan);

      const remaining = document.createElement('span');
      remaining.className = 'tm-timeinfo-remaining';
      if (diffMs < 0) {
        remaining.textContent = t('task.overdue', 'en retard');
        remaining.style.color = '#e74c3c';
      } else {
        const diffH = Math.floor(diffMs / 3600000);
        const diffM = Math.floor((diffMs % 3600000) / 60000);
        let timeStr;
        if (diffH >= 24) {
          timeStr = Math.floor(diffH / 24) + 'j' + ((diffH % 24) > 0 ? (diffH % 24) + 'h' : '');
        } else {
          timeStr = diffH + 'h' + (diffM < 10 ? '0' : '') + diffM;
        }
        remaining.textContent = t('task.event_in', 'Dans {time}').replace('{time}', timeStr);
        // Color from green to red based on proximity (7 days = green, 0 = red)
        const hoursLeft = diffMs / 3600000;
        const ratio = Math.max(0, Math.min(1, 1 - hoursLeft / 168));
        const r = Math.round(46 + ratio * (231 - 46));
        const g = Math.round(204 - ratio * (204 - 76));
        const b = Math.round(113 - ratio * (113 - 60));
        remaining.style.color = `rgb(${r},${g},${b})`;
      }
      timeInfo.appendChild(remaining);
    }
    if (ev.duration) {
      const durSpan = document.createElement('span');
      durSpan.className = 'tm-timeinfo-timer';
      durSpan.textContent = '⏱ ' + t('task.field_duration', 'Durée') + ': ' + ev.duration;
      timeInfo.appendChild(durSpan);
    }
    main.appendChild(timeInfo);

    // Description (hover tooltip – follows cursor, above-right)
    if (ev.description) {
      const desc = document.createElement('div');
      desc.className = 'tm-item-desc-hover';
      desc.textContent = ev.description;
      div.appendChild(desc);
      div.addEventListener('mousemove', (e) => {
        desc.style.display = 'block';
        desc.style.left = (e.clientX + 12) + 'px';
        desc.style.top = (e.clientY - desc.offsetHeight - 8) + 'px';
      });
      div.addEventListener('mouseleave', () => { desc.style.display = 'none'; });
    }

    div.appendChild(main);

    const actions = document.createElement('div');
    actions.className = 'tm-item-actions';

    // Reorder arrows
    if (total > 1) {
      const reorder = document.createElement('span');
      reorder.className = 'journal-card-reorder';
      const btnUp = document.createElement('button');
      btnUp.className = 'btn-move';
      btnUp.textContent = '▲';
      btnUp.title = t('common.move_up', 'Monter');
      btnUp.disabled = idx === 0;
      btnUp.onclick = () => { moveEvent(ev.id, -1); };
      const btnDown = document.createElement('button');
      btnDown.className = 'btn-move';
      btnDown.textContent = '▼';
      btnDown.title = t('common.move_down', 'Descendre');
      btnDown.disabled = idx === total - 1;
      btnDown.onclick = () => { moveEvent(ev.id, 1); };
      reorder.appendChild(btnUp);
      reorder.appendChild(btnDown);
      actions.appendChild(reorder);
    }

    // Edit
    const btnEditEv = document.createElement('button');
    btnEditEv.className = 'btn-edit';
    btnEditEv.textContent = '✎';
    btnEditEv.title = t('task.btn_edit', 'Modifier');
    btnEditEv.onclick = (e) => {
      e.stopPropagation();
      editingEventId = ev.id;
      resetEventModal(ev);
      document.querySelector('#modal-event .tm-title').textContent = t('task.modal_event_edit_title', "Modifier l'événement");
      openModal('modal-event');
    };
    actions.appendChild(btnEditEv);

    // Delete
    const btnDel = document.createElement('button');
    btnDel.className = 'btn-del';
    btnDel.textContent = '✕';
    btnDel.title = t('common.delete', 'Supprimer');
    btnDel.onclick = () => {
      if (!confirm(t('task.confirm_delete', 'Supprimer cet élément ?'))) return;
      const events = loadEvents().filter(e => e.id !== ev.id);
      saveEvents(events);
      renderEvents();
    };
    actions.appendChild(btnDel);

    div.appendChild(actions);
    return div;
  }

  // ---- Auto-archive past events ----
  function autoArchiveEvents() {
    const events = loadEvents();
    const archive = loadEventArchive();
    const now = new Date();
    const remaining = [];
    let changed = false;

    events.forEach(ev => {
      if (ev.date) {
        const evDate = new Date(ev.date + (ev.time ? 'T' + ev.time : 'T23:59'));
        if (evDate < now) {
          archive.push(Object.assign({}, ev, { archivedAt: new Date().toISOString() }));
          changed = true;
          return;
        }
      }
      remaining.push(ev);
    });

    if (changed) {
      saveEvents(remaining);
      saveEventArchive(archive);
    }
  }

  // ---- Render history modals ----
  function renderTaskHistory() {
    const body = document.getElementById('task-history-body');
    const history = loadTaskHistory().slice().reverse();
    body.innerHTML = '';

    if (!history.length) {
      const empty = document.createElement('div');
      empty.className = 'tm-history-empty';
      empty.textContent = t('task.history_empty_tasks', "Aucune occurrence enregistrée pour l'instant.");
      body.appendChild(empty);
      return;
    }

    history.forEach(entry => {
      const card = document.createElement('div');
      card.className = 'tm-hist-item';

      const top = document.createElement('div');
      top.className = 'tm-hist-top';

      const badge = document.createElement('span');
      badge.className = 'tm-hist-badge tm-hist-badge-' + entry.mode;
      badge.textContent = entry.mode === 'repeat'
        ? t('task.history_badge_occurrence', 'Occurrence')
        : t('task.history_badge_archived', 'Archivée');
      top.appendChild(badge);

      const name = document.createElement('span');
      name.className = 'tm-hist-name';
      name.textContent = entry.taskName;
      top.appendChild(name);

      card.appendChild(top);

      const meta = document.createElement('div');
      meta.className = 'tm-hist-meta';

      const dateLabel = entry.mode === 'repeat'
        ? t('task.history_completed_at', 'Achevée le')
        : t('task.history_archived_at', 'Archivée le');
      const dateStr = new Date(entry.completedAt).toLocaleString(undefined, {
        day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
      });
      const dateSpan = document.createElement('span');
      dateSpan.textContent = dateLabel + ' ' + dateStr;
      meta.appendChild(dateSpan);

      if (entry.tags && entry.tags.length) {
        const tagsSpan = document.createElement('span');
        tagsSpan.className = 'tm-hist-tags';
        tagsSpan.textContent = entry.tags.join(', ');
        meta.appendChild(tagsSpan);
      }

      card.appendChild(meta);
      body.appendChild(card);
    });
  }

  function renderEventHistory() {
    const body = document.getElementById('event-history-body');
    const archive = loadEventArchive().slice().reverse();
    body.innerHTML = '';

    if (!archive.length) {
      const empty = document.createElement('div');
      empty.className = 'tm-history-empty';
      empty.textContent = t('task.history_empty_events', 'Aucun événement passé pour l\'instant.');
      body.appendChild(empty);
      return;
    }

    archive.forEach(ev => {
      const card = document.createElement('div');
      card.className = 'tm-hist-item';

      const top = document.createElement('div');
      top.className = 'tm-hist-top';

      const badge = document.createElement('span');
      badge.className = 'tm-hist-badge tm-hist-badge-past';
      badge.textContent = t('task.history_badge_past', 'Passé');
      top.appendChild(badge);

      const name = document.createElement('span');
      name.className = 'tm-hist-name';
      name.textContent = ev.name;
      top.appendChild(name);

      card.appendChild(top);

      const meta = document.createElement('div');
      meta.className = 'tm-hist-meta';

      if (ev.date) {
        const dateSpan = document.createElement('span');
        dateSpan.textContent = '📅 ' + ev.date + (ev.time ? ' ' + ev.time : '');
        meta.appendChild(dateSpan);
      }
      if (ev.duration) {
        const durSpan = document.createElement('span');
        durSpan.textContent = '⏱ ' + ev.duration;
        meta.appendChild(durSpan);
      }
      if (ev.tags && ev.tags.length) {
        const tagsSpan = document.createElement('span');
        tagsSpan.className = 'tm-hist-tags';
        tagsSpan.textContent = ev.tags.join(', ');
        meta.appendChild(tagsSpan);
      }

      card.appendChild(meta);
      body.appendChild(card);
    });
  }

  // ---- History button listeners ----
  document.getElementById('btn-task-history').addEventListener('click', () => {
    renderTaskHistory();
    openModal('modal-task-history');
  });

  document.getElementById('btn-event-history').addEventListener('click', () => {
    renderEventHistory();
    openModal('modal-event-history');
  });

  // ---- Move helpers ----
  function moveTask(id, direction) {
    const tasks = loadTasks();
    const idx = tasks.findIndex(t => t.id === id);
    if (idx < 0) return;
    const newIdx = idx + direction;
    if (newIdx < 0 || newIdx >= tasks.length) return;
    const tmp = tasks[idx];
    tasks[idx] = tasks[newIdx];
    tasks[newIdx] = tmp;
    saveTasks(tasks);
    renderTasks();
  }

  function moveEvent(id, direction) {
    const events = loadEvents();
    const idx = events.findIndex(e => e.id === id);
    if (idx < 0) return;
    const newIdx = idx + direction;
    if (newIdx < 0 || newIdx >= events.length) return;
    const tmp = events[idx];
    events[idx] = events[newIdx];
    events[newIdx] = tmp;
    saveEvents(events);
    renderEvents();
  }

  // ---- Init ----
  _onLangApplied = () => { renderTasks(); renderEvents(); };

  initLanguage().then(() => {
    initTheme();
    setTodayDate();
    autoArchiveEvents();
    renderTasks();
    renderEvents();
  });

})();
