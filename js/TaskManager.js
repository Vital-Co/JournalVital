/* TaskManager — logique spécifique */

(function () {
  'use strict';

  const TASKS_KEY = 'vital_tm_tasks';
  const EVENTS_KEY = 'vital_tm_events';

  // ---- Helpers ----
  function loadTasks()  { return VitalStore.get(TASKS_KEY, []); }
  function saveTasks(a) { VitalStore.set(TASKS_KEY, a); }
  function loadEvents() { return VitalStore.get(EVENTS_KEY, []); }
  function saveEvents(a){ VitalStore.set(EVENTS_KEY, a); }

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
  document.getElementById('event-importance').addEventListener('input', e => {
    document.getElementById('event-importance-val').textContent = e.target.value;
  });

  // ---- Deadline toggle ----
  const dlToggle = document.getElementById('task-deadline-toggle');
  const dlFields = document.getElementById('task-deadline-fields');
  let deadlineOn = false;

  dlToggle.addEventListener('click', () => {
    deadlineOn = !deadlineOn;
    dlToggle.classList.toggle('active', deadlineOn);
    dlToggle.textContent = deadlineOn ? t('task.toggle_on', 'Oui') : t('task.toggle_off', 'Non');
    dlFields.classList.toggle('hidden', !deadlineOn);
  });

  // ---- Day toggles ----
  document.querySelectorAll('#task-days .tm-day').forEach(btn => {
    btn.addEventListener('click', () => btn.classList.toggle('active'));
  });

  // ---- Reset modal fields ----
  function resetTaskModal(data) {
    document.getElementById('task-name').value = data ? data.name : '';
    document.getElementById('task-duration').value = data ? data.duration : '';
    document.getElementById('task-time').value = data ? data.time || '' : '';
    document.getElementById('task-description').value = data ? data.description : '';
    document.getElementById('task-importance').value = data ? data.importance : 50;
    document.getElementById('task-importance-val').textContent = data ? data.importance : 50;
    document.getElementById('task-deadline-date').value = data && data.deadlineDate ? data.deadlineDate : '';
    document.getElementById('task-deadline-time').value = data && data.deadlineTime ? data.deadlineTime : '';
    document.getElementById('task-error').classList.add('hidden');

    // days
    document.querySelectorAll('#task-days .tm-day').forEach(btn => {
      btn.classList.toggle('active', data && data.days ? data.days.includes(btn.dataset.day) : false);
    });

    // tags
    taskTags.set(data && data.tags ? data.tags : []);

    // deadline
    deadlineOn = data ? !!data.deadlineOn : false;
    dlToggle.classList.toggle('active', deadlineOn);
    dlToggle.textContent = deadlineOn ? t('task.toggle_on', 'Oui') : t('task.toggle_off', 'Non');
    dlFields.classList.toggle('hidden', !deadlineOn);
  }

  function resetEventModal(data) {
    document.getElementById('event-name').value = data ? data.name : '';
    document.getElementById('event-duration').value = data ? data.duration : '';
    document.getElementById('event-date').value = data ? data.date || '' : '';
    document.getElementById('event-time').value = data ? data.time || '' : '';
    document.getElementById('event-description').value = data ? data.description : '';
    document.getElementById('event-importance').value = data ? data.importance : 50;
    document.getElementById('event-importance-val').textContent = data ? data.importance : 50;
    document.getElementById('event-error').classList.add('hidden');
    eventTags.set(data && data.tags ? data.tags : []);
  }

  // ---- Collect form data ----
  function collectTask() {
    const days = [];
    document.querySelectorAll('#task-days .tm-day.active').forEach(b => days.push(b.dataset.day));
    return {
      name: document.getElementById('task-name').value.trim(),
      duration: document.getElementById('task-duration').value.trim(),
      time: document.getElementById('task-time').value,
      days,
      tags: taskTags.get(),
      importance: +document.getElementById('task-importance').value,
      deadlineOn,
      deadlineDate: deadlineOn ? document.getElementById('task-deadline-date').value : '',
      deadlineTime: deadlineOn ? document.getElementById('task-deadline-time').value : '',
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
      importance: +document.getElementById('event-importance').value,
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

    active.forEach(task => {
      list.appendChild(buildTaskCard(task));
    });
  }

  function renderEvents() {
    const events = loadEvents();
    const list = document.getElementById('event-list');
    const empty = document.getElementById('event-empty');
    list.innerHTML = '';
    empty.classList.toggle('hidden', events.length > 0);

    events.forEach(ev => {
      list.appendChild(buildEventCard(ev));
    });
  }

  function buildTaskCard(task) {
    const div = document.createElement('div');
    div.className = 'tm-item';

    const main = document.createElement('div');
    main.className = 'tm-item-main';

    const name = document.createElement('div');
    name.className = 'tm-item-name' + (task.done ? ' done' : '');
    name.textContent = task.name;
    main.appendChild(name);

    const meta = document.createElement('div');
    meta.className = 'tm-item-meta';
    const typeSpan = document.createElement('span');
    typeSpan.className = 'tm-item-type';
    typeSpan.textContent = t('task.type_task', 'Tâche');
    meta.appendChild(typeSpan);
    (task.tags || []).forEach(tag => {
      const s = document.createElement('span');
      s.className = 'tm-item-tag';
      s.textContent = tag;
      meta.appendChild(s);
    });
    main.appendChild(meta);
    div.appendChild(main);

    const actions = document.createElement('div');
    actions.className = 'tm-item-actions';

    // Template
    const btnTpl = document.createElement('button');
    btnTpl.textContent = t('task.btn_template', '⧉');
    btnTpl.title = t('task.btn_template_title', 'Utiliser comme template');
    btnTpl.onclick = () => {
      editingTaskId = null;
      const copy = Object.assign({}, task);
      delete copy.id; delete copy.createdAt; delete copy.done;
      resetTaskModal(copy);
      document.querySelector('#modal-task .tm-title').textContent = t('task.modal_task_title', 'Nouvelle tâche');
      openModal('modal-task');
    };
    actions.appendChild(btnTpl);

    // Rename
    const btnRen = document.createElement('button');
    btnRen.textContent = t('task.btn_rename', '✎');
    btnRen.title = t('common.rename', 'Renommer');
    btnRen.onclick = () => {
      const newName = prompt(t('task.prompt_rename', 'Nouveau nom :'), task.name);
      if (newName && newName.trim()) {
        const tasks = loadTasks();
        const item = tasks.find(t => t.id === task.id);
        if (item) { item.name = newName.trim(); saveTasks(tasks); renderTasks(); }
      }
    };
    actions.appendChild(btnRen);

    // Done
    const btnDone = document.createElement('button');
    btnDone.className = 'btn-done';
    btnDone.textContent = '✓';
    btnDone.title = t('task.btn_done_title', 'Marquer comme achevée');
    btnDone.onclick = () => {
      const tasks = loadTasks();
      const item = tasks.find(t => t.id === task.id);
      if (item) { item.done = true; saveTasks(tasks); renderTasks(); }
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

  function buildEventCard(ev) {
    const div = document.createElement('div');
    div.className = 'tm-item';

    const main = document.createElement('div');
    main.className = 'tm-item-main';

    const name = document.createElement('div');
    name.className = 'tm-item-name';
    name.textContent = ev.name;
    main.appendChild(name);

    const meta = document.createElement('div');
    meta.className = 'tm-item-meta';
    const typeSpan = document.createElement('span');
    typeSpan.className = 'tm-item-type';
    typeSpan.textContent = t('task.type_event', 'Événement');
    meta.appendChild(typeSpan);
    (ev.tags || []).forEach(tag => {
      const s = document.createElement('span');
      s.className = 'tm-item-tag';
      s.textContent = tag;
      meta.appendChild(s);
    });
    main.appendChild(meta);
    div.appendChild(main);

    const actions = document.createElement('div');
    actions.className = 'tm-item-actions';

    // Template
    const btnTpl = document.createElement('button');
    btnTpl.textContent = t('task.btn_template', '⧉');
    btnTpl.title = t('task.btn_template_title', 'Utiliser comme template');
    btnTpl.onclick = () => {
      editingEventId = null;
      const copy = Object.assign({}, ev);
      delete copy.id; delete copy.createdAt;
      resetEventModal(copy);
      document.querySelector('#modal-event .tm-title').textContent = t('task.modal_event_title', 'Nouvel événement');
      openModal('modal-event');
    };
    actions.appendChild(btnTpl);

    // Rename
    const btnRen = document.createElement('button');
    btnRen.textContent = t('task.btn_rename', '✎');
    btnRen.title = t('common.rename', 'Renommer');
    btnRen.onclick = () => {
      const newName = prompt(t('task.prompt_rename', 'Nouveau nom :'), ev.name);
      if (newName && newName.trim()) {
        const events = loadEvents();
        const item = events.find(e => e.id === ev.id);
        if (item) { item.name = newName.trim(); saveEvents(events); renderEvents(); }
      }
    };
    actions.appendChild(btnRen);

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

  // ---- Init ----
  _onLangApplied = () => { renderTasks(); renderEvents(); };

  initLanguage().then(() => {
    initTheme();
    setTodayDate();
    renderTasks();
    renderEvents();
  });

})();
