// ============ NUTRITION — food templates + consumption tracking ============

const NU_TPL_INDEX_KEY = 'vital_nutrition_templates';
const NU_ENTRIES_KEY   = 'vital_nutrition_entries';

const NU_DAY_START_HOUR = 6; // a "day" runs from 6am to 6am

// ---- State ----
let nuTplEditId = null;
let nuTplTags = [];
let nuTplMode = 'count';     // 'count' | 'quantity'
let nuTplCustoms = [];       // [{name, unit, value}]
let nuFilterTag = null;
let nuHistRange = 'week';
let nuHistSort = 'time-desc';

// ============ DATA ============

function nuLoadTemplates() {
  return VitalStore.loadIndex(NU_TPL_INDEX_KEY);
}
function nuSaveTemplates(list) {
  VitalStore.saveIndex(NU_TPL_INDEX_KEY, list);
}
function nuLoadEntries() {
  return VitalStore.get(NU_ENTRIES_KEY, []) || [];
}
function nuSaveEntries(list) {
  VitalStore.set(NU_ENTRIES_KEY, list);
}

function nuGetAllTags(list) {
  const tags = new Set();
  list.forEach(t => (t.tags || []).forEach(tag => tags.add(tag)));
  return [...tags].sort();
}

function nuFindTemplate(id) {
  return nuLoadTemplates().find(t => t.id === id) || null;
}

// ============ MACRO MATH ============

// Returns the multiplier to apply to template macros given an entry amount.
// - count mode: amount is the number of units → multiplier = amount
// - quantity mode: amount is in the qtyType unit → multiplier = amount / refQty
function nuMacroMultiplier(tpl, amount) {
  if (tpl.mode === 'count') return amount;
  const ref = tpl.refQty || 1;
  return amount / ref;
}

// Compute macros for one entry (base + custom).
function nuEntryMacros(entry, tpl) {
  tpl = tpl || nuFindTemplate(entry.tplId);
  if (!tpl) return { kcal: 0, protein: 0, lipids: 0, carbs: 0, fibers: 0, custom: {} };
  const m = nuMacroMultiplier(tpl, entry.amount);
  const out = {
    kcal:    (tpl.macros.kcal    || 0) * m,
    protein: (tpl.macros.protein || 0) * m,
    lipids:  (tpl.macros.lipids  || 0) * m,
    carbs:   (tpl.macros.carbs   || 0) * m,
    fibers:  (tpl.macros.fibers  || 0) * m,
    custom: {}
  };
  (tpl.customs || []).forEach(c => {
    out.custom[c.name] = { value: (c.value || 0) * m, unit: c.unit || '' };
  });
  return out;
}

// Day window: returns [startTs, endTs) for the "nutrition day" that includes ts.
function nuDayWindow(ts) {
  const d = new Date(ts);
  const start = new Date(d);
  start.setHours(NU_DAY_START_HOUR, 0, 0, 0);
  if (d.getHours() < NU_DAY_START_HOUR) {
    start.setDate(start.getDate() - 1);
  }
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return [start.getTime(), end.getTime()];
}

// Returns a YYYY-MM-DD key for the nutrition-day of ts.
function nuDayKey(ts) {
  const [s] = nuDayWindow(ts);
  const d = new Date(s);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return d.getFullYear() + '-' + m + '-' + day;
}

// ============ TEMPLATE MODAL ============

function nuOpenTplModal(editId) {
  nuTplEditId = editId || null;
  nuTplTags = [];
  nuTplMode = 'count';
  nuTplCustoms = [];

  const titleEl = document.getElementById('tpl-modal-title');
  titleEl.textContent = editId
    ? (i18n.t('nutrition.tpl_modal_title_edit') || 'Modifier l\'aliment')
    : (i18n.t('nutrition.tpl_modal_title') || 'Nouveau template d\'aliment');

  // Reset
  document.getElementById('tpl-name').value = '';
  document.getElementById('tpl-tag-input').value = '';
  document.getElementById('tpl-qty-type').value = 'g';
  document.getElementById('tpl-ref-qty').value = 100;
  document.getElementById('tpl-kcal').value = 0;
  document.getElementById('tpl-protein').value = 0;
  document.getElementById('tpl-lipids').value = 0;
  document.getElementById('tpl-carbs').value = 0;
  document.getElementById('tpl-fibers').value = 0;
  document.getElementById('tpl-custom-name').value = '';
  document.getElementById('tpl-custom-unit').value = '';
  document.getElementById('tpl-custom-value').value = 0;
  document.getElementById('tpl-error').classList.add('hidden');

  if (editId) {
    const tpl = nuFindTemplate(editId);
    if (tpl) {
      document.getElementById('tpl-name').value = tpl.name || '';
      nuTplTags = [...(tpl.tags || [])];
      nuTplMode = tpl.mode || 'count';
      nuTplCustoms = (tpl.customs || []).map(c => ({...c}));
      document.getElementById('tpl-qty-type').value = tpl.qtyType || 'g';
      document.getElementById('tpl-ref-qty').value = tpl.refQty || 100;
      document.getElementById('tpl-kcal').value    = tpl.macros.kcal    || 0;
      document.getElementById('tpl-protein').value = tpl.macros.protein || 0;
      document.getElementById('tpl-lipids').value  = tpl.macros.lipids  || 0;
      document.getElementById('tpl-carbs').value   = tpl.macros.carbs   || 0;
      document.getElementById('tpl-fibers').value  = tpl.macros.fibers  || 0;
    }
  }

  nuApplyTplMode();
  nuRenderTplTags();
  nuRenderTplCustoms();
  document.getElementById('modal-template').classList.remove('hidden');
}

function nuCloseTplModal() {
  document.getElementById('modal-template').classList.add('hidden');
  nuTplEditId = null;
}

function nuApplyTplMode() {
  document.getElementById('tpl-mode-count').classList.toggle('active', nuTplMode === 'count');
  document.getElementById('tpl-mode-quantity').classList.toggle('active', nuTplMode === 'quantity');
  document.getElementById('tpl-qty-block').classList.toggle('hidden', nuTplMode !== 'quantity');
  const lbl = document.getElementById('tpl-macros-label');
  if (nuTplMode === 'count') {
    lbl.textContent = i18n.t('nutrition.macros_per_unit') || 'Macros pour 1 unité';
  } else {
    const qty = document.getElementById('tpl-ref-qty').value || 100;
    const type = document.getElementById('tpl-qty-type').value || 'g';
    const tpl = i18n.t('nutrition.macros_per_qty') || 'Macros pour {n} {u}';
    lbl.textContent = tpl.replace('{n}', qty).replace('{u}', type);
  }
}

function nuRenderTplTags() {
  const wrap = document.getElementById('tpl-tags');
  wrap.innerHTML = '';
  nuTplTags.forEach((tag, i) => {
    const el = document.createElement('span');
    el.className = 'sk-tag';
    el.textContent = tag;
    const rm = document.createElement('button');
    rm.className = 'sk-tag-remove';
    rm.type = 'button';
    rm.textContent = '×';
    rm.onclick = () => { nuTplTags.splice(i, 1); nuRenderTplTags(); };
    el.appendChild(rm);
    wrap.appendChild(el);
  });
}

function nuAddTplTag() {
  const input = document.getElementById('tpl-tag-input');
  const v = (input.value || '').trim();
  if (v && !nuTplTags.includes(v)) {
    nuTplTags.push(v);
    nuRenderTplTags();
  }
  input.value = '';
}

function nuRenderTplCustoms() {
  const wrap = document.getElementById('tpl-custom-list');
  wrap.innerHTML = '';
  nuTplCustoms.forEach((c, i) => {
    const row = document.createElement('div');
    row.className = 'nu-custom-row';

    const name = document.createElement('span');
    name.className = 'nu-macro-name';
    name.textContent = c.name;

    const unit = document.createElement('span');
    unit.className = 'nu-macro-unit';
    unit.textContent = c.unit || '';

    const val = document.createElement('input');
    val.type = 'number';
    val.className = 'sk-input sk-input-sm';
    val.value = c.value;
    val.min = 0;
    val.step = 0.01;
    val.oninput = () => { nuTplCustoms[i].value = parseFloat(val.value) || 0; };

    const del = document.createElement('button');
    del.type = 'button';
    del.className = 'nu-custom-del';
    del.textContent = '×';
    del.onclick = () => { nuTplCustoms.splice(i, 1); nuRenderTplCustoms(); };

    row.appendChild(name);
    row.appendChild(unit);
    row.appendChild(val);
    row.appendChild(del);
    wrap.appendChild(row);
  });
}

function nuAddTplCustom() {
  const name = (document.getElementById('tpl-custom-name').value || '').trim();
  const unit = (document.getElementById('tpl-custom-unit').value || '').trim();
  const value = parseFloat(document.getElementById('tpl-custom-value').value) || 0;
  if (!name) return;
  if (nuTplCustoms.some(c => c.name.toLowerCase() === name.toLowerCase())) return;
  nuTplCustoms.push({ name, unit, value });
  document.getElementById('tpl-custom-name').value = '';
  document.getElementById('tpl-custom-unit').value = '';
  document.getElementById('tpl-custom-value').value = 0;
  nuRenderTplCustoms();
}

function nuSaveTpl() {
  const errEl = document.getElementById('tpl-error');
  errEl.classList.add('hidden');

  const name = (document.getElementById('tpl-name').value || '').trim();
  if (!name) {
    errEl.textContent = i18n.t('nutrition.error_name_required') || 'Le nom est obligatoire.';
    errEl.classList.remove('hidden');
    return;
  }

  const refQty = parseFloat(document.getElementById('tpl-ref-qty').value) || 0;
  if (nuTplMode === 'quantity' && refQty <= 0) {
    errEl.textContent = i18n.t('nutrition.error_ref_qty') || 'Quantité de référence invalide.';
    errEl.classList.remove('hidden');
    return;
  }

  const list = nuLoadTemplates();
  const data = {
    id: nuTplEditId || VitalStore.newId('nu_tpl_'),
    name,
    tags: [...nuTplTags],
    mode: nuTplMode,
    qtyType: nuTplMode === 'quantity' ? document.getElementById('tpl-qty-type').value : null,
    refQty: nuTplMode === 'quantity' ? refQty : null,
    macros: {
      kcal:    parseFloat(document.getElementById('tpl-kcal').value)    || 0,
      protein: parseFloat(document.getElementById('tpl-protein').value) || 0,
      lipids:  parseFloat(document.getElementById('tpl-lipids').value)  || 0,
      carbs:   parseFloat(document.getElementById('tpl-carbs').value)   || 0,
      fibers:  parseFloat(document.getElementById('tpl-fibers').value)  || 0
    },
    customs: nuTplCustoms.map(c => ({...c})),
    createdAt: Date.now()
  };

  if (nuTplEditId) {
    const idx = list.findIndex(t => t.id === nuTplEditId);
    if (idx >= 0) {
      data.createdAt = list[idx].createdAt;
      list[idx] = data;
    } else {
      list.push(data);
    }
  } else {
    list.push(data);
  }
  nuSaveTemplates(list);
  nuCloseTplModal();
  nuRenderAll();
}

function nuDeleteTpl(id) {
  if (!confirm(i18n.t('nutrition.confirm_delete_tpl') || 'Supprimer cet aliment ?')) return;
  const list = nuLoadTemplates().filter(t => t.id !== id);
  nuSaveTemplates(list);
  // Keep entries; they reference id but display will show "(deleted)".
  nuRenderAll();
}

// ============ ENTRY MODAL ============

function nuOpenEntryModal(presetTplId) {
  const list = nuLoadTemplates();
  if (list.length === 0) {
    alert(i18n.t('nutrition.alert_no_template') || 'Crée d\'abord un aliment.');
    return;
  }
  const sel = document.getElementById('entry-template');
  sel.innerHTML = '';
  list.forEach(t => {
    const opt = document.createElement('option');
    opt.value = t.id;
    opt.textContent = t.name;
    sel.appendChild(opt);
  });
  if (presetTplId) sel.value = presetTplId;

  document.getElementById('entry-amount').value = 1;
  // Default datetime = now in local format
  const now = new Date();
  const pad = n => String(n).padStart(2, '0');
  document.getElementById('entry-when').value =
    now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate())
    + 'T' + pad(now.getHours()) + ':' + pad(now.getMinutes());
  document.getElementById('entry-error').classList.add('hidden');

  nuUpdateEntryUnitLabel();
  nuUpdateEntryPreview();
  document.getElementById('modal-entry').classList.remove('hidden');
}

function nuCloseEntryModal() {
  document.getElementById('modal-entry').classList.add('hidden');
}

function nuUpdateEntryUnitLabel() {
  const sel = document.getElementById('entry-template');
  const tpl = nuFindTemplate(sel.value);
  const unitEl = document.getElementById('entry-amount-unit');
  const lblEl = document.getElementById('entry-amount-label');
  if (!tpl) { unitEl.textContent = ''; return; }
  if (tpl.mode === 'count') {
    unitEl.textContent = i18n.t('nutrition.unit_count') || 'unité(s)';
    lblEl.textContent = i18n.t('nutrition.field_count') || 'Nombre';
  } else {
    unitEl.textContent = tpl.qtyType || 'g';
    lblEl.textContent = i18n.t('nutrition.field_amount') || 'Quantité';
  }
}

function nuUpdateEntryPreview() {
  const sel = document.getElementById('entry-template');
  const tpl = nuFindTemplate(sel.value);
  const amount = parseFloat(document.getElementById('entry-amount').value) || 0;
  const prev = document.getElementById('entry-preview');
  if (!tpl || amount <= 0) { prev.innerHTML = ''; return; }
  const m = nuEntryMacros({ tplId: tpl.id, amount }, tpl);
  const fmt = (v) => (Math.round(v * 10) / 10).toLocaleString(getLangLocale());
  prev.innerHTML =
    '<b>' + fmt(m.kcal) + '</b> kcal · '
    + 'P ' + fmt(m.protein) + 'g · '
    + 'L ' + fmt(m.lipids) + 'g · '
    + 'G ' + fmt(m.carbs) + 'g · '
    + 'F ' + fmt(m.fibers) + 'g';
}

function nuSaveEntry() {
  const tplId = document.getElementById('entry-template').value;
  const amount = parseFloat(document.getElementById('entry-amount').value);
  const whenStr = document.getElementById('entry-when').value;
  const errEl = document.getElementById('entry-error');
  errEl.classList.add('hidden');

  if (!tplId) { errEl.textContent = i18n.t('nutrition.error_template') || 'Aliment requis.'; errEl.classList.remove('hidden'); return; }
  if (!(amount > 0)) { errEl.textContent = i18n.t('nutrition.error_amount') || 'Quantité invalide.'; errEl.classList.remove('hidden'); return; }
  const ts = whenStr ? new Date(whenStr).getTime() : Date.now();
  if (isNaN(ts)) { errEl.textContent = i18n.t('nutrition.error_date') || 'Date invalide.'; errEl.classList.remove('hidden'); return; }

  const entries = nuLoadEntries();
  entries.push({
    id: VitalStore.newId('nu_e_'),
    tplId,
    amount,
    ts
  });
  nuSaveEntries(entries);
  nuCloseEntryModal();
  nuRenderAll();
}

function nuDeleteEntry(id) {
  const entries = nuLoadEntries().filter(e => e.id !== id);
  nuSaveEntries(entries);
  nuRenderAll();
}

// ============ TODAY WIDGET ============

function nuRenderToday() {
  const wrap = document.getElementById('nu-today-macros');
  const empty = document.getElementById('nu-today-empty');
  const [start, end] = nuDayWindow(Date.now());
  const entries = nuLoadEntries().filter(e => e.ts >= start && e.ts < end);

  const totals = { kcal: 0, protein: 0, lipids: 0, carbs: 0, fibers: 0 };
  const customs = {}; // name -> {value, unit}
  entries.forEach(e => {
    const m = nuEntryMacros(e);
    totals.kcal += m.kcal;
    totals.protein += m.protein;
    totals.lipids += m.lipids;
    totals.carbs += m.carbs;
    totals.fibers += m.fibers;
    Object.keys(m.custom).forEach(k => {
      if (!customs[k]) customs[k] = { value: 0, unit: m.custom[k].unit };
      customs[k].value += m.custom[k].value;
    });
  });

  const fmt = v => (Math.round(v * 10) / 10).toLocaleString(getLangLocale());
  const tile = (name, value, unit) => {
    const d = document.createElement('div');
    d.className = 'nu-macro-tile';
    d.innerHTML =
      '<div class="nu-macro-tile-name">' + name + '</div>'
      + '<div><span class="nu-macro-tile-value">' + fmt(value) + '</span>'
      + '<span class="nu-macro-tile-unit">' + unit + '</span></div>';
    return d;
  };

  wrap.innerHTML = '';
  wrap.appendChild(tile(i18n.t('nutrition.macro_kcal') || 'Kcal', totals.kcal, 'kcal'));
  wrap.appendChild(tile(i18n.t('nutrition.macro_protein') || 'Protéines', totals.protein, 'g'));
  wrap.appendChild(tile(i18n.t('nutrition.macro_lipids') || 'Lipides', totals.lipids, 'g'));
  wrap.appendChild(tile(i18n.t('nutrition.macro_carbs') || 'Glucides', totals.carbs, 'g'));
  wrap.appendChild(tile(i18n.t('nutrition.macro_fibers') || 'Fibres', totals.fibers, 'g'));
  Object.keys(customs).forEach(k => {
    wrap.appendChild(tile(k, customs[k].value, customs[k].unit || ''));
  });

  empty.classList.toggle('hidden', entries.length > 0);
}

// ============ TEMPLATE LIST ============

function nuRenderTemplates() {
  const list = nuLoadTemplates();
  const container = document.getElementById('nu-template-list');
  const empty = document.getElementById('nu-template-empty');
  const filterEl = document.getElementById('nu-tag-filter');

  // Tag filter
  const allTags = nuGetAllTags(list);
  filterEl.innerHTML = '';
  if (allTags.length > 0) {
    const allBtn = document.createElement('button');
    allBtn.className = 'sk-tag-filter-btn' + (nuFilterTag === null ? ' active' : '');
    allBtn.textContent = i18n.t('nutrition.filter_all') || 'Tous';
    allBtn.onclick = () => { nuFilterTag = null; nuRenderTemplates(); };
    filterEl.appendChild(allBtn);
    allTags.forEach(tag => {
      const btn = document.createElement('button');
      btn.className = 'sk-tag-filter-btn' + (nuFilterTag === tag ? ' active' : '');
      btn.textContent = tag;
      btn.onclick = () => { nuFilterTag = tag; nuRenderTemplates(); };
      filterEl.appendChild(btn);
    });
  }

  const filtered = nuFilterTag
    ? list.filter(t => (t.tags || []).includes(nuFilterTag))
    : list;

  container.innerHTML = '';
  if (filtered.length === 0) {
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');
  filtered.forEach(tpl => container.appendChild(nuRenderTplItem(tpl)));
}

function nuRenderTplItem(tpl) {
  const row = document.createElement('div');
  row.className = 'nu-tpl-item';

  const main = document.createElement('div');
  main.className = 'nu-tpl-main';

  const name = document.createElement('div');
  name.className = 'nu-tpl-name';
  name.textContent = tpl.name;
  main.appendChild(name);

  const meta = document.createElement('div');
  meta.className = 'nu-tpl-meta';
  const mode = document.createElement('span');
  mode.className = 'nu-tpl-mode';
  if (tpl.mode === 'count') {
    mode.textContent = i18n.t('nutrition.mode_count') || 'Par unité';
  } else {
    mode.textContent = (i18n.t('nutrition.mode_quantity') || 'Par quantité')
      + ' (' + (tpl.refQty || 0) + ' ' + (tpl.qtyType || 'g') + ')';
  }
  meta.appendChild(mode);
  (tpl.tags || []).forEach(t => {
    const tg = document.createElement('span');
    tg.className = 'nu-tpl-tag';
    tg.textContent = t;
    meta.appendChild(tg);
  });
  main.appendChild(meta);

  const macros = document.createElement('div');
  macros.className = 'nu-tpl-macros';
  const fmt = v => (Math.round(v * 10) / 10);
  macros.innerHTML =
    '<span>' + fmt(tpl.macros.kcal) + ' kcal</span>'
    + '<span>P ' + fmt(tpl.macros.protein) + 'g</span>'
    + '<span>L ' + fmt(tpl.macros.lipids) + 'g</span>'
    + '<span>G ' + fmt(tpl.macros.carbs) + 'g</span>'
    + '<span>F ' + fmt(tpl.macros.fibers) + 'g</span>';
  main.appendChild(macros);

  row.appendChild(main);

  const actions = document.createElement('div');
  actions.className = 'nu-tpl-actions';

  const btnAdd = document.createElement('button');
  btnAdd.className = 'btn-add';
  btnAdd.textContent = i18n.t('nutrition.btn_add_entry') || '+';
  btnAdd.title = i18n.t('nutrition.btn_add_entry_title') || 'Ajouter une consommation';
  btnAdd.onclick = () => nuOpenEntryModal(tpl.id);

  const btnDetail = document.createElement('button');
  btnDetail.textContent = i18n.t('nutrition.btn_detail') || 'Détails';
  btnDetail.onclick = () => nuOpenDetail(tpl.id);

  const btnEdit = document.createElement('button');
  btnEdit.textContent = '✎';
  btnEdit.title = i18n.t('common.edit') || 'Modifier';
  btnEdit.onclick = () => nuOpenTplModal(tpl.id);

  const btnDel = document.createElement('button');
  btnDel.className = 'btn-del';
  btnDel.textContent = '×';
  btnDel.title = i18n.t('common.delete') || 'Supprimer';
  btnDel.onclick = () => nuDeleteTpl(tpl.id);

  actions.appendChild(btnAdd);
  actions.appendChild(btnDetail);
  actions.appendChild(btnEdit);
  actions.appendChild(btnDel);
  row.appendChild(actions);
  return row;
}

// ============ DETAIL MODAL ============

function nuOpenDetail(tplId) {
  const tpl = nuFindTemplate(tplId);
  if (!tpl) return;
  document.getElementById('tpl-detail-title').textContent = tpl.name;

  const info = document.getElementById('tpl-detail-info');
  const fmt = v => (Math.round(v * 10) / 10);
  const base = tpl.mode === 'count'
    ? (i18n.t('nutrition.detail_per_unit') || 'Par unité')
    : (i18n.t('nutrition.detail_per') || 'Pour') + ' ' + (tpl.refQty || 0) + ' ' + (tpl.qtyType || 'g');
  info.innerHTML =
    '<b>' + base + ':</b> '
    + fmt(tpl.macros.kcal) + ' kcal · '
    + 'P ' + fmt(tpl.macros.protein) + 'g · '
    + 'L ' + fmt(tpl.macros.lipids) + 'g · '
    + 'G ' + fmt(tpl.macros.carbs) + 'g · '
    + 'F ' + fmt(tpl.macros.fibers) + 'g'
    + ((tpl.customs && tpl.customs.length)
        ? '<br>' + tpl.customs.map(c => c.name + ': ' + fmt(c.value) + (c.unit || '')).join(' · ')
        : '');

  const entries = nuLoadEntries()
    .filter(e => e.tplId === tplId)
    .sort((a, b) => b.ts - a.ts);

  const listEl = document.getElementById('tpl-detail-entries');
  const emptyEl = document.getElementById('tpl-detail-empty');
  listEl.innerHTML = '';
  if (entries.length === 0) {
    emptyEl.classList.remove('hidden');
  } else {
    emptyEl.classList.add('hidden');
    entries.forEach(e => listEl.appendChild(nuRenderEntryRow(e, tpl)));
  }
  document.getElementById('modal-tpl-detail').classList.remove('hidden');
}

function nuCloseDetail() {
  document.getElementById('modal-tpl-detail').classList.add('hidden');
}

// ============ HISTORY ============

function nuHistoryStartTs() {
  const now = Date.now();
  if (nuHistRange === 'all') return 0;
  if (nuHistRange === 'day') return nuDayWindow(now)[0];
  const days = nuHistRange === 'week' ? 7 : nuHistRange === 'month' ? 30 : 365;
  const [start] = nuDayWindow(now);
  return start - (days - 1) * 86400000;
}

function nuSortEntries(entries, tplMap) {
  const sortKey = nuHistSort;
  const macroFor = (e) => {
    const m = nuEntryMacros(e, tplMap[e.tplId]);
    return m;
  };
  const arr = [...entries];
  if (sortKey.startsWith('time')) {
    arr.sort((a, b) => sortKey === 'time-desc' ? b.ts - a.ts : a.ts - b.ts);
  } else {
    const [field, dir] = sortKey.split('-');
    arr.sort((a, b) => {
      const va = macroFor(a)[field] || 0;
      const vb = macroFor(b)[field] || 0;
      return dir === 'desc' ? vb - va : va - vb;
    });
  }
  return arr;
}

function nuRenderHistory() {
  const startTs = nuHistoryStartTs();
  const entries = nuLoadEntries().filter(e => e.ts >= startTs);
  const tplList = nuLoadTemplates();
  const tplMap = {};
  tplList.forEach(t => tplMap[t.id] = t);

  // ---- Chart (kcal per nutrition-day) ----
  nuRenderChart(entries);

  // ---- List ----
  const sorted = nuSortEntries(entries, tplMap);
  const listEl = document.getElementById('nu-history-list');
  const emptyEl = document.getElementById('nu-history-empty');
  listEl.innerHTML = '';
  if (sorted.length === 0) {
    emptyEl.classList.remove('hidden');
  } else {
    emptyEl.classList.add('hidden');
    sorted.forEach(e => listEl.appendChild(nuRenderEntryRow(e, tplMap[e.tplId])));
  }
}

function nuRenderEntryRow(entry, tpl) {
  const row = document.createElement('div');
  row.className = 'nu-entry-item';

  const time = document.createElement('div');
  time.className = 'nu-entry-time';
  const d = new Date(entry.ts);
  time.textContent = d.toLocaleString(getLangLocale(), {
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
  });
  row.appendChild(time);

  const name = document.createElement('div');
  name.className = 'nu-entry-name';
  name.textContent = tpl ? tpl.name : (i18n.t('nutrition.deleted_template') || '(aliment supprimé)');
  row.appendChild(name);

  const amount = document.createElement('div');
  amount.className = 'nu-entry-amount';
  if (tpl) {
    const unit = tpl.mode === 'count'
      ? (i18n.t('nutrition.unit_count_short') || '×')
      : (tpl.qtyType || 'g');
    amount.textContent = entry.amount + ' ' + unit;
  } else {
    amount.textContent = entry.amount;
  }
  row.appendChild(amount);

  const kcal = document.createElement('div');
  kcal.className = 'nu-entry-kcal';
  const m = nuEntryMacros(entry, tpl);
  kcal.textContent = (Math.round(m.kcal * 10) / 10) + ' kcal';
  row.appendChild(kcal);

  const del = document.createElement('button');
  del.className = 'nu-entry-del';
  del.textContent = '×';
  del.title = i18n.t('common.delete') || 'Supprimer';
  del.onclick = () => nuDeleteEntry(entry.id);
  row.appendChild(del);

  return row;
}

function nuRenderChart(entries) {
  const wrap = document.getElementById('nu-chart');
  wrap.innerHTML = '';

  // Build day buckets
  const startTs = nuHistoryStartTs();
  const endDayStart = nuDayWindow(Date.now())[0];
  // Determine the first day shown
  let firstDayStart;
  if (nuHistRange === 'all') {
    if (entries.length === 0) { return; }
    firstDayStart = nuDayWindow(Math.min.apply(null, entries.map(e => e.ts)))[0];
  } else if (nuHistRange === 'day') {
    firstDayStart = endDayStart;
  } else {
    const days = nuHistRange === 'week' ? 7 : nuHistRange === 'month' ? 30 : 365;
    firstDayStart = endDayStart - (days - 1) * 86400000;
  }

  const buckets = {};
  entries.forEach(e => {
    if (e.ts < startTs) return;
    const k = nuDayKey(e.ts);
    if (!buckets[k]) buckets[k] = 0;
    const m = nuEntryMacros(e);
    buckets[k] += m.kcal;
  });

  // Walk days
  const days = [];
  for (let t = firstDayStart; t <= endDayStart; t += 86400000) {
    const k = nuDayKey(t + 86400000 / 2); // midpoint stays within the same nutrition-day
    days.push({ ts: t, key: k, value: buckets[k] || 0 });
  }

  const max = Math.max(1, ...days.map(d => d.value));
  const locale = getLangLocale();
  days.forEach(d => {
    const bar = document.createElement('div');
    bar.className = 'nu-chart-bar' + (d.value === 0 ? ' nu-chart-bar-empty' : '');
    bar.style.height = (d.value / max * 100) + '%';
    const dateStr = new Date(d.ts).toLocaleDateString(locale, { day: '2-digit', month: '2-digit' });
    bar.setAttribute('data-label', dateStr + ' — ' + Math.round(d.value) + ' kcal');
    wrap.appendChild(bar);
  });
}

// ============ RENDER ALL ============

function nuRenderAll() {
  nuRenderToday();
  nuRenderTemplates();
  nuRenderHistory();
}

// ============ INIT ============

function nuInit() {
  // Buttons
  document.getElementById('btn-new-template').addEventListener('click', () => nuOpenTplModal());
  document.getElementById('btn-new-entry').addEventListener('click', () => nuOpenEntryModal());

  // Template modal
  document.getElementById('tpl-save-btn').addEventListener('click', nuSaveTpl);
  document.querySelectorAll('[data-close="modal-template"]').forEach(el => el.addEventListener('click', nuCloseTplModal));
  document.getElementById('tpl-mode-count').addEventListener('click', () => { nuTplMode = 'count'; nuApplyTplMode(); });
  document.getElementById('tpl-mode-quantity').addEventListener('click', () => { nuTplMode = 'quantity'; nuApplyTplMode(); });
  document.getElementById('tpl-qty-type').addEventListener('change', nuApplyTplMode);
  document.getElementById('tpl-ref-qty').addEventListener('input', nuApplyTplMode);
  document.getElementById('tpl-tag-add').addEventListener('click', nuAddTplTag);
  document.getElementById('tpl-tag-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); nuAddTplTag(); }
  });
  document.getElementById('tpl-custom-add').addEventListener('click', nuAddTplCustom);

  // Entry modal
  document.getElementById('entry-save-btn').addEventListener('click', nuSaveEntry);
  document.querySelectorAll('[data-close="modal-entry"]').forEach(el => el.addEventListener('click', nuCloseEntryModal));
  document.getElementById('entry-template').addEventListener('change', () => { nuUpdateEntryUnitLabel(); nuUpdateEntryPreview(); });
  document.getElementById('entry-amount').addEventListener('input', nuUpdateEntryPreview);

  // Detail modal
  document.querySelectorAll('[data-close="modal-tpl-detail"]').forEach(el => el.addEventListener('click', nuCloseDetail));

  // History controls
  document.getElementById('nu-hist-range').addEventListener('change', e => { nuHistRange = e.target.value; nuRenderHistory(); });
  document.getElementById('nu-hist-sort').addEventListener('change', e => { nuHistSort = e.target.value; nuRenderHistory(); });

  nuRenderAll();
}

// ---- Boot ----
_onLangApplied = () => nuRenderAll();

initTheme();
initLanguage().then(() => {
  setTodayDate();
  nuInit();
});
