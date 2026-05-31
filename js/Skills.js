// ============ SKILLS — skill tracker with XP, levels, degression ============

const SK_INDEX_KEY = 'vital_skills_index';
const SK_ITEM_PREFIX = 'vital_skill_';

// ---- State ----
let skEditId = null;
let skTags = [];
let skType = 'time';
let skFilterTag = null;

// ---- Helpers ----

function skXpForLevel(level, baseXp, curve) {
  return Math.round(baseXp * Math.pow(curve, level - 1));
}

function skTotalXpForLevel(targetLevel, baseXp, curve) {
  let total = 0;
  for (let l = 1; l < targetLevel; l++) {
    total += skXpForLevel(l, baseXp, curve);
  }
  return total;
}

function skComputeLevel(totalXp, baseXp, curve, maxLevel) {
  let level = 1;
  let xpNeeded = 0;
  while (level < maxLevel) {
    const next = skXpForLevel(level, baseXp, curve);
    if (totalXp < xpNeeded + next) break;
    xpNeeded += next;
    level++;
  }
  const currentLevelXp = totalXp - xpNeeded;
  const nextLevelXp = level < maxLevel ? skXpForLevel(level, baseXp, curve) : 0;
  return { level, currentLevelXp, nextLevelXp, isMax: level >= maxLevel };
}

function skApplyDegression(skill) {
  if (!skill.degression || skill.degression <= 0) return skill.xp;
  if (!skill.lastEntry) return skill.xp;
  const hoursSince = (Date.now() - skill.lastEntry) / 3600000;
  if (hoursSince <= 0) return skill.xp;
  const loss = skill.degression * Math.pow(hoursSince, skill.degCurve || 1);
  return Math.max(0, skill.xp - loss);
}

// ---- Data ----

function skLoadAll() {
  return VitalStore.loadIndex(SK_INDEX_KEY);
}

function skSaveAll(list) {
  VitalStore.saveIndex(SK_INDEX_KEY, list);
}

function skGetAllTags(list) {
  const tags = new Set();
  list.forEach(s => (s.tags || []).forEach(t => tags.add(t)));
  return [...tags].sort();
}

// ---- Render ----

function skRenderList() {
  const list = skLoadAll();
  const container = document.getElementById('skill-list');
  const empty = document.getElementById('skill-empty');
  const filterEl = document.getElementById('tag-filter');

  // Tag filter
  const allTags = skGetAllTags(list);
  filterEl.innerHTML = '';
  if (allTags.length > 0) {
    const allBtn = document.createElement('button');
    allBtn.className = 'sk-tag-filter-btn' + (skFilterTag === null ? ' active' : '');
    allBtn.textContent = i18n.t('skill.filter_all') || 'All';
    allBtn.onclick = () => { skFilterTag = null; skRenderList(); };
    filterEl.appendChild(allBtn);
    allTags.forEach(tag => {
      const btn = document.createElement('button');
      btn.className = 'sk-tag-filter-btn' + (skFilterTag === tag ? ' active' : '');
      btn.textContent = tag;
      btn.onclick = () => { skFilterTag = tag; skRenderList(); };
      filterEl.appendChild(btn);
    });
  }

  // Filter
  const filtered = skFilterTag
    ? list.filter(s => (s.tags || []).includes(skFilterTag))
    : list;

  container.innerHTML = '';
  if (filtered.length === 0) {
    empty.classList.remove('hidden');
  } else {
    empty.classList.add('hidden');
    filtered.forEach((skill, visIdx) => {
      const realIdx = list.indexOf(skill);
      container.appendChild(skRenderItem(skill, realIdx, list.length));
    });
  }
}

function skRenderItem(skill, idx, total) {
  const effectiveXp = skApplyDegression(skill);
  const info = skComputeLevel(effectiveXp, skill.baseXp, skill.xpCurve, skill.maxLevel);
  const pct = info.isMax ? 100 : (info.nextLevelXp > 0 ? Math.round((info.currentLevelXp / info.nextLevelXp) * 100) : 0);

  const el = document.createElement('div');
  el.className = 'sk-item';
  el.style.cursor = 'pointer';
  el.addEventListener('click', (e) => {
    if (e.target.closest('button')) return;
    skOpenDetail(skill.id);
  });

  // Level badge
  const levelEl = document.createElement('div');
  levelEl.className = 'sk-level';
  if (info.isMax) levelEl.classList.add('max-level');
  else if (info.level > 1) levelEl.classList.add('shiny');
  levelEl.textContent = info.level;

  // Main
  const main = document.createElement('div');
  main.className = 'sk-item-main';

  // Name row
  const nameRow = document.createElement('div');
  nameRow.className = 'sk-item-name-row';
  const nameEl = document.createElement('span');
  nameEl.className = 'sk-item-name';
  nameEl.textContent = skill.name;
  const renameBtn = document.createElement('button');
  renameBtn.className = 'btn-rename';
  renameBtn.textContent = '✏️';
  renameBtn.title = i18n.t('common.rename') || 'Rename';
  renameBtn.onclick = () => skRename(skill.id);
  nameRow.appendChild(nameEl);
  nameRow.appendChild(renameBtn);

  // Meta
  const meta = document.createElement('div');
  meta.className = 'sk-item-meta';
  const typeSpan = document.createElement('span');
  typeSpan.className = 'sk-item-type';
  typeSpan.textContent = skill.type === 'time' ? (i18n.t('skill.type_time') || 'Time') : (i18n.t('skill.type_count') || 'Count');
  meta.appendChild(typeSpan);
  (skill.tags || []).forEach(t => {
    const tag = document.createElement('span');
    tag.className = 'sk-item-tag';
    tag.textContent = t;
    meta.appendChild(tag);
  });

  // Progress
  const progWrap = document.createElement('div');
  progWrap.className = 'sk-progress-wrap';
  const progBar = document.createElement('div');
  progBar.className = 'sk-progress-bar';
  const progFill = document.createElement('div');
  progFill.className = 'sk-progress-fill';
  if (info.isMax) progFill.classList.add('max');
  progFill.style.width = pct + '%';
  progBar.appendChild(progFill);
  const progText = document.createElement('span');
  progText.className = 'sk-progress-text';
  if (info.isMax) {
    progText.textContent = 'MAX ★';
  } else {
    progText.textContent = Math.round(info.currentLevelXp) + ' / ' + info.nextLevelXp + ' XP';
  }
  progWrap.appendChild(progBar);
  progWrap.appendChild(progText);

  main.appendChild(nameRow);
  main.appendChild(meta);
  main.appendChild(progWrap);

  // Actions
  const actions = document.createElement('div');
  actions.className = 'sk-item-actions';

  const btnUp = document.createElement('button');
  btnUp.textContent = '↑';
  btnUp.title = i18n.t('common.move_up') || 'Move up';
  btnUp.disabled = idx === 0;
  btnUp.onclick = () => skMove(idx, -1);

  const btnDown = document.createElement('button');
  btnDown.textContent = '↓';
  btnDown.title = i18n.t('common.move_down') || 'Move down';
  btnDown.disabled = idx === total - 1;
  btnDown.onclick = () => skMove(idx, 1);

  const btnXp = document.createElement('button');
  btnXp.className = 'btn-xp-gain';
  btnXp.textContent = '+XP';
  btnXp.title = i18n.t('skill.xp_gain_title') || 'Add XP';
  btnXp.onclick = () => skOpenXpGain(skill.id);

  const btnEdit = document.createElement('button');
  btnEdit.className = 'btn-edit';
  btnEdit.textContent = '✎';
  btnEdit.title = i18n.t('common.edit') || 'Edit';
  btnEdit.onclick = () => skOpenEdit(skill.id);

  const btnDel = document.createElement('button');
  btnDel.className = 'btn-del';
  btnDel.textContent = '✕';
  btnDel.title = i18n.t('common.delete') || 'Delete';
  btnDel.onclick = () => skDelete(skill.id);

  actions.appendChild(btnXp);
  actions.appendChild(btnUp);
  actions.appendChild(btnDown);
  actions.appendChild(btnEdit);
  actions.appendChild(btnDel);

  el.appendChild(levelEl);
  el.appendChild(main);
  el.appendChild(actions);
  return el;
}

function skUpdateXpPerUnitLabel() {
  const label = document.getElementById('skill-xp-per-unit-label');
  const timeUnitSelect = document.getElementById('skill-time-unit');
  if (skType === 'time') {
    const unit = timeUnitSelect.value || 'minute';
    const key = 'skill.field_xp_per_' + unit;
    label.textContent = i18n.t(key) || 'XP per ' + unit;
    label.setAttribute('data-i18n', key);
    timeUnitSelect.style.display = '';
  } else {
    label.textContent = i18n.t('skill.field_xp_per_count') || 'XP per count';
    label.setAttribute('data-i18n', 'skill.field_xp_per_count');
    timeUnitSelect.style.display = 'none';
  }
}

// ---- Modal ----

function skOpenModal(editId) {
  skEditId = editId || null;
  skTags = [];
  skType = 'time';

  const modal = document.getElementById('modal-skill');
  const titleEl = modal.querySelector('.sk-title');

  if (skEditId) {
    const list = skLoadAll();
    const skill = list.find(s => s.id === skEditId);
    if (skill) {
      document.getElementById('skill-name').value = skill.name;
      skTags = [...(skill.tags || [])];
      skType = skill.type || 'time';
      document.getElementById('skill-xp-per-unit').value = skill.xpPerUnit || 1;
      document.getElementById('skill-time-unit').value = skill.timeUnit || 'minute';
      document.getElementById('skill-max-level').value = skill.maxLevel;
      document.getElementById('skill-base-xp').value = skill.baseXp;
      document.getElementById('skill-xp-curve').value = skill.xpCurve;
      document.getElementById('skill-xp-curve-val').textContent = parseFloat(skill.xpCurve).toFixed(2);
      document.getElementById('skill-degression').value = skill.degression || 0;
      document.getElementById('skill-deg-curve').value = skill.degCurve || 1;
      document.getElementById('skill-deg-curve-val').textContent = (skill.degCurve || 1).toFixed(2);
      titleEl.textContent = i18n.t('skill.modal_title_edit') || 'Edit skill';
    }
  } else {
    document.getElementById('skill-name').value = '';
    document.getElementById('skill-xp-per-unit').value = 1;
    document.getElementById('skill-time-unit').value = 'minute';
    document.getElementById('skill-max-level').value = 10;
    document.getElementById('skill-base-xp').value = 100;
    document.getElementById('skill-xp-curve').value = 1.5;
    document.getElementById('skill-xp-curve-val').textContent = '1.10';
    document.getElementById('skill-degression').value = 0;
    document.getElementById('skill-deg-curve').value = 1;
    document.getElementById('skill-deg-curve-val').textContent = '1.00';
    titleEl.textContent = i18n.t('skill.modal_title') || 'New skill';
  }

  // Type toggle
  document.getElementById('skill-type-time').classList.toggle('active', skType === 'time');
  document.getElementById('skill-type-count').classList.toggle('active', skType === 'count');
  skUpdateXpPerUnitLabel();

  skRenderModalTags();
  document.getElementById('skill-error').classList.add('hidden');
  modal.classList.remove('hidden');
}

function skCloseModal() {
  document.getElementById('modal-skill').classList.add('hidden');
  skEditId = null;
}

function skRenderModalTags() {
  const container = document.getElementById('skill-tags');
  container.innerHTML = '';
  skTags.forEach((t, i) => {
    const tag = document.createElement('span');
    tag.className = 'sk-tag';
    tag.textContent = t;
    const rm = document.createElement('button');
    rm.className = 'sk-tag-remove';
    rm.textContent = '×';
    rm.onclick = () => { skTags.splice(i, 1); skRenderModalTags(); };
    tag.appendChild(rm);
    container.appendChild(tag);
  });
}

function skAddTag() {
  const input = document.getElementById('skill-tag-input');
  const val = input.value.trim();
  if (val && !skTags.includes(val)) {
    skTags.push(val);
    skRenderModalTags();
  }
  input.value = '';
}

function skSave() {
  const name = document.getElementById('skill-name').value.trim();
  if (!name) {
    const err = document.getElementById('skill-error');
    err.textContent = i18n.t('skill.error_name_required') || 'Name is required.';
    err.classList.remove('hidden');
    return;
  }

  const list = skLoadAll();
  const data = {
    name,
    tags: [...skTags],
    type: skType,
    xpPerUnit: parseFloat(document.getElementById('skill-xp-per-unit').value) || 1,
    timeUnit: skType === 'time' ? document.getElementById('skill-time-unit').value : undefined,
    maxLevel: parseInt(document.getElementById('skill-max-level').value) || 10,
    baseXp: parseInt(document.getElementById('skill-base-xp').value) || 100,
    xpCurve: parseFloat(document.getElementById('skill-xp-curve').value) || 1.1,
    degression: parseFloat(document.getElementById('skill-degression').value) || 0,
    degCurve: parseFloat(document.getElementById('skill-deg-curve').value) || 1,
  };

  if (skEditId) {
    const idx = list.findIndex(s => s.id === skEditId);
    if (idx >= 0) {
      Object.assign(list[idx], data);
    }
  } else {
    list.push({
      id: VitalStore.newId('sk_'),
      ...data,
      xp: 0,
      lastEntry: null,
      createdAt: Date.now(),
    });
  }

  skSaveAll(list);
  skCloseModal();
  skRenderList();
}

// ---- Actions ----

function skRename(id) {
  const list = skLoadAll();
  const skill = list.find(s => s.id === id);
  if (!skill) return;
  const newName = prompt(i18n.t('skill.prompt_rename') || 'New name:', skill.name);
  if (newName && newName.trim()) {
    skill.name = newName.trim();
    skSaveAll(list);
    skRenderList();
  }
}

function skOpenEdit(id) {
  skOpenModal(id);
}

function skDelete(id) {
  const list = skLoadAll();
  const skill = list.find(s => s.id === id);
  if (!skill) return;
  if (!confirm((i18n.t('skill.confirm_delete') || 'Delete this skill?') + '\n' + skill.name)) return;
  const newList = list.filter(s => s.id !== id);
  skSaveAll(newList);
  skRenderList();
}

function skMove(idx, dir) {
  const list = skLoadAll();
  if (VitalStore.moveItem(list, idx, dir) !== false) {
    skSaveAll(list);
    skRenderList();
  }
}

// ---- XP Gain Modal ----

let skXpGainId = null;

function skOpenXpGain(id) {
  const list = skLoadAll();
  const skill = list.find(s => s.id === id);
  if (!skill) return;
  skXpGainId = id;

  document.getElementById('xp-gain-skill-name').textContent = skill.name;
  document.getElementById('xp-gain-value').value = 1;

  // Set unit label
  const unitEl = document.getElementById('xp-gain-unit');
  if (skill.type === 'time') {
    const tu = skill.timeUnit || 'minute';
    unitEl.textContent = i18n.t('skill.time_unit_' + tu) || tu;
  } else {
    unitEl.textContent = i18n.t('skill.xp_gain_unit_count') || 'x';
  }

  // Set label
  const label = document.getElementById('xp-gain-label');
  if (skill.type === 'time') {
    label.textContent = i18n.t('skill.xp_gain_duration') || 'Duration';
  } else {
    label.textContent = i18n.t('skill.xp_gain_count') || 'Count';
  }

  skUpdateXpGainPreview();
  document.getElementById('modal-xp-gain').classList.remove('hidden');
}

function skCloseXpGain() {
  document.getElementById('modal-xp-gain').classList.add('hidden');
  skXpGainId = null;
}

function skCalcXpGain(skill, amount) {
  if (skill.type === 'count') {
    return amount * (skill.xpPerUnit || 1);
  }
  // Time: convert input (in timeUnit) to the unit's XP rate
  return amount * (skill.xpPerUnit || 1);
}

function skUpdateXpGainPreview() {
  if (!skXpGainId) return;
  const list = skLoadAll();
  const skill = list.find(s => s.id === skXpGainId);
  if (!skill) return;
  const amount = parseFloat(document.getElementById('xp-gain-value').value) || 0;
  const xp = skCalcXpGain(skill, amount);
  const preview = document.getElementById('xp-gain-preview');
  preview.textContent = '+' + Math.round(xp * 100) / 100 + ' XP';
}

function skConfirmXpGain() {
  if (!skXpGainId) return;
  const list = skLoadAll();
  const skill = list.find(s => s.id === skXpGainId);
  if (!skill) return;
  const amount = parseFloat(document.getElementById('xp-gain-value').value) || 0;
  if (amount <= 0) return;

  const xpGained = skCalcXpGain(skill, amount);
  // Commit degression before adding new XP so accumulated loss is not erased
  const beforeDeg = skill.xp || 0;
  const afterDeg = skApplyDegression(skill);
  const degressionLoss = afterDeg - beforeDeg; // negative or zero
  const now = Date.now();
  const prevTs = skill.lastEntry || now;
  skill.xp = afterDeg + xpGained;
  skill.lastEntry = now;
  if (!skill.entries) skill.entries = [];

  // Split degression into hourly tick entries with correct timestamps
  if (degressionLoss < 0 && skill.degression > 0) {
    const elapsed = now - prevTs;
    const totalHours = elapsed / 3600000;
    const fullHours = Math.floor(totalHours);
    const degCurve = skill.degCurve || 1;

    if (fullHours >= 1) {
      // Compute XP lost at each hour boundary to create per-hour ticks
      for (let h = 1; h <= fullHours; h++) {
        const lossAtH = skill.degression * Math.pow(h, degCurve);
        const lossAtPrev = skill.degression * Math.pow(h - 1, degCurve);
        const tickLoss = -(lossAtH - lossAtPrev);
        const tickTs = prevTs + h * 3600000;
        skill.entries.push({ ts: tickTs, xp: tickLoss, type: 'degression' });
      }
      // Remaining partial hour
      if (totalHours > fullHours) {
        const lossTotal = skill.degression * Math.pow(totalHours, degCurve);
        const lossAtFull = skill.degression * Math.pow(fullHours, degCurve);
        const remainder = -(lossTotal - lossAtFull);
        if (remainder < -0.001) {
          skill.entries.push({ ts: now, xp: remainder, type: 'degression' });
        }
      }
    } else {
      // Less than 1 hour elapsed — single tick
      skill.entries.push({ ts: now, xp: degressionLoss, type: 'degression' });
    }
  }

  skill.entries.push({ ts: now, xp: xpGained, type: 'gain' });
  skSaveAll(list);
  skCloseXpGain();
  skShowXpAnim(xpGained);
  skRenderList();
}

function skShowXpAnim(xp) {
  const el = document.getElementById('xp-anim');
  const text = document.getElementById('xp-anim-text');
  text.textContent = '+' + Math.round(xp * 100) / 100 + ' XP';
  el.classList.remove('hidden');
  el.classList.remove('sk-xp-anim-play');
  void el.offsetWidth; // force reflow
  el.classList.add('sk-xp-anim-play');
  setTimeout(() => {
    el.classList.add('hidden');
    el.classList.remove('sk-xp-anim-play');
  }, 1500);
}

// ---- Skill Detail Modal ----

let _skTooltip = null;

function skGetTooltip() {
  if (!_skTooltip) {
    _skTooltip = document.createElement('div');
    _skTooltip.className = 'sk-hover-tooltip';
    document.body.appendChild(_skTooltip);
  }
  _skTooltip.style.display = 'none';
  return _skTooltip;
}

function skOpenDetail(id) {
  const list = skLoadAll();
  const skill = list.find(s => s.id === id);
  if (!skill) return;

  document.getElementById('skill-detail-title').textContent = skill.name;

  // Info summary
  const effectiveXp = skApplyDegression(skill);
  const info = skComputeLevel(effectiveXp, skill.baseXp, skill.xpCurve, skill.maxLevel);
  const infoEl = document.getElementById('skill-detail-info');
  const lvlLabel = (i18n.t('skill.detail_level') || 'Level') + ' ' + info.level;
  const xpLabel = Math.round(effectiveXp) + ' XP';
  infoEl.innerHTML = '<span class="sk-detail-level">' + lvlLabel + '</span> · <span class="sk-detail-xp">' + xpLabel + '</span>';

  // Chart
  const entries = (skill.entries || []).slice(-100);
  const chartEl = document.getElementById('skill-detail-chart');
  const emptyEl = document.getElementById('skill-detail-empty');
  chartEl.innerHTML = '';

  if (entries.length === 0) {
    emptyEl.classList.remove('hidden');
    chartEl.classList.add('hidden');
  } else {
    emptyEl.classList.add('hidden');
    chartEl.classList.remove('hidden');
    skRenderChart(entries, chartEl);
  }

  document.getElementById('modal-skill-detail').classList.remove('hidden');
}

function skCloseDetail() {
  document.getElementById('modal-skill-detail').classList.add('hidden');
  if (_skTooltip) _skTooltip.style.display = 'none';
}

function skRenderChart(entries, container) {
  const n = entries.length;
  const W = 700, H = 300;
  const PAD = { t: 30, r: 30, b: 72, l: 60 };
  const CW = W - PAD.l - PAD.r;
  const CH = H - PAD.t - PAD.b;
  const uid = 'skc' + Math.random().toString(36).slice(2, 7);

  const maxXp = Math.max(...entries.map(e => e.xp));
  const minXp = Math.min(...entries.map(e => e.xp), 0);
  const range = (maxXp - minXp) || 1;

  function xp(i) { return PAD.l + (n === 1 ? CW / 2 : (i / (n - 1)) * CW); }
  function yp(v) { return PAD.t + ((maxXp - v) / range) * CH; }

  // Grid lines
  const steps = 5;
  let grid = '';
  for (let s = 0; s <= steps; s++) {
    const v = minXp + (range * s / steps);
    const y = yp(v);
    grid += '<line class="sk-chart-grid" x1="' + PAD.l + '" y1="' + y.toFixed(1) + '" x2="' + (W - PAD.r) + '" y2="' + y.toFixed(1) + '"/>';
    grid += '<text class="sk-chart-axis" x="' + (PAD.l - 8) + '" y="' + (y + 4).toFixed(1) + '" text-anchor="end">' + Math.round(v) + '</text>';
  }

  // Zero line if applicable
  if (minXp < 0 && maxXp > 0) {
    const y0 = yp(0);
    grid += '<line class="sk-chart-zero" x1="' + PAD.l + '" y1="' + y0.toFixed(1) + '" x2="' + (W - PAD.r) + '" y2="' + y0.toFixed(1) + '"/>';
  }

  // Area fill
  let fillPath = '';
  if (n > 1) {
    const yBase = yp(Math.max(minXp, 0));
    let d = 'M' + xp(0).toFixed(1) + ',' + yBase.toFixed(1);
    for (let i = 0; i < n; i++) d += ' L' + xp(i).toFixed(1) + ',' + yp(entries[i].xp).toFixed(1);
    d += ' L' + xp(n - 1).toFixed(1) + ',' + yBase.toFixed(1) + ' Z';
    fillPath = '<path class="sk-chart-fill" d="' + d + '"/>';
  }

  // Line
  let line = '';
  if (n > 1) {
    let d = entries.map((e, i) => (i === 0 ? 'M' : 'L') + xp(i).toFixed(1) + ',' + yp(e.xp).toFixed(1)).join(' ');
    line = '<path class="sk-chart-line" d="' + d + '" fill="none"/>';
  }

  // Dots + date labels
  let dots = '', xlabels = '';
  const locale = (typeof getLangLocale === 'function') ? getLangLocale() : 'fr';
  entries.forEach((e, i) => {
    const x = xp(i), y = yp(e.xp);
    const isDeg = e.type === 'degression';
    const lbl = (isDeg ? '' : '+') + Math.round(e.xp * 100) / 100;
    const dotClass = isDeg ? 'sk-chart-dot sk-chart-dot-loss' : 'sk-chart-dot';
    dots += '<circle class="' + dotClass + '" cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="5" data-idx="' + i + '"/>';
    dots += '<text class="sk-chart-dot-label" x="' + x.toFixed(1) + '" y="' + (y - 10).toFixed(1) + '" text-anchor="middle">' + lbl + '</text>';
    const dateStr = new Date(e.ts).toLocaleDateString(locale, { day: '2-digit', month: 'short' });
    const lx = x.toFixed(1), ly = (H - PAD.b + 18).toFixed(1);
    xlabels += '<text class="sk-chart-date" x="' + lx + '" y="' + ly + '" text-anchor="end" transform="rotate(-45 ' + lx + ' ' + ly + ')">' + dateStr + '</text>';
  });

  const svg = '<svg class="sk-chart-svg" viewBox="0 0 ' + W + ' ' + H + '" xmlns="http://www.w3.org/2000/svg">' +
    fillPath + grid + line + dots + xlabels + '</svg>';

  const wrap = document.createElement('div');
  wrap.className = 'sk-chart-wrap';
  wrap.innerHTML = svg;
  container.appendChild(wrap);

  // Hover tooltips
  const tooltip = skGetTooltip();
  const svgEl = wrap.querySelector('svg');

  wrap.querySelectorAll('circle.sk-chart-dot').forEach(circle => {
    const e = entries[parseInt(circle.dataset.idx, 10)];
    circle.addEventListener('mouseenter', evt => {
      const dateStr = new Date(e.ts).toLocaleDateString(locale, {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
      });
      const isDeg = e.type === 'degression';
      const xpStr = (isDeg ? '' : '+') + (Math.round(e.xp * 100) / 100) + ' XP';
      const xpClass = isDeg ? 'skt-xp skt-xp-loss' : 'skt-xp';
      tooltip.innerHTML = '<div class="' + xpClass + '">' + xpStr + '</div><div class="skt-date">' + dateStr + '</div>';
      tooltip.style.display = 'block';
      try {
        const cx = parseFloat(circle.getAttribute('cx'));
        const cy = parseFloat(circle.getAttribute('cy'));
        const pt = svgEl.createSVGPoint();
        pt.x = cx; pt.y = cy;
        const screen = pt.matrixTransform(svgEl.getScreenCTM());
        const tw = tooltip.offsetWidth || 200;
        const th = tooltip.offsetHeight || 60;
        let x = screen.x + 16;
        if (x + tw > window.innerWidth - 8) x = screen.x - tw - 16;
        let y = screen.y - th - 14;
        if (y < 8) y = screen.y + 18;
        tooltip.style.left = x + 'px';
        tooltip.style.top = y + 'px';
      } catch (_) {
        tooltip.style.left = (evt.clientX + 14) + 'px';
        tooltip.style.top = Math.max(8, evt.clientY - 60) + 'px';
      }
    });
    circle.addEventListener('mouseleave', () => { tooltip.style.display = 'none'; });
  });
  wrap.addEventListener('mouseleave', () => { tooltip.style.display = 'none'; });
}

// ---- Init ----

function skInit() {
  // New skill button
  document.getElementById('btn-new-skill').addEventListener('click', () => skOpenModal());

  // Save
  document.getElementById('skill-save-btn').addEventListener('click', skSave);

  // Close modal
  document.querySelectorAll('[data-close="modal-skill"]').forEach(el => {
    el.addEventListener('click', skCloseModal);
  });

  // XP Gain modal
  document.querySelectorAll('[data-close="modal-xp-gain"]').forEach(el => {
    el.addEventListener('click', skCloseXpGain);
  });

  // Detail modal
  document.querySelectorAll('[data-close="modal-skill-detail"]').forEach(el => {
    el.addEventListener('click', skCloseDetail);
  });
  document.getElementById('xp-gain-confirm-btn').addEventListener('click', skConfirmXpGain);
  document.getElementById('xp-gain-value').addEventListener('input', skUpdateXpGainPreview);

  // Tag add
  document.getElementById('skill-tag-add').addEventListener('click', skAddTag);
  document.getElementById('skill-tag-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); skAddTag(); }
  });

  // Type toggle
  document.getElementById('skill-type-time').addEventListener('click', () => {
    skType = 'time';
    document.getElementById('skill-type-time').classList.add('active');
    document.getElementById('skill-type-count').classList.remove('active');
    skUpdateXpPerUnitLabel();
  });
  document.getElementById('skill-type-count').addEventListener('click', () => {
    skType = 'count';
    document.getElementById('skill-type-count').classList.add('active');
    document.getElementById('skill-type-time').classList.remove('active');
    skUpdateXpPerUnitLabel();
  });

  // Time unit select
  document.getElementById('skill-time-unit').addEventListener('change', () => {
    skUpdateXpPerUnitLabel();
  });

  // Range sliders
  document.getElementById('skill-xp-curve').addEventListener('input', e => {
    document.getElementById('skill-xp-curve-val').textContent = parseFloat(e.target.value).toFixed(2);
  });
  document.getElementById('skill-deg-curve').addEventListener('input', e => {
    document.getElementById('skill-deg-curve-val').textContent = parseFloat(e.target.value).toFixed(2);
  });

  // Render
  skRenderList();
}

// ---- Boot ----
_onLangApplied = () => skRenderList();

initTheme();
initLanguage().then(() => {
  setTodayDate();
  skInit();
});
