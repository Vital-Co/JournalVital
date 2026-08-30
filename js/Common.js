// ============ COMMON — shared across all pages ============

// ---- Constants ----
const LANG_KEY  = 'vital_lang';
const LANGS     = ['fr', 'eng', 'es'];
const THEME_KEY = 'vital_theme';
const THEMES    = ['light', 'green', 'blue', 'orange', 'rose', 'dark'];

// ---- Header controls ----

// The language switcher, theme dots and date were copy-pasted identically into
// every page. They're built here instead, into `<div class="header-right">`,
// before initLanguage()/initTheme() go looking for the buttons.
function buildHeaderControls() {
  const host = document.querySelector('.header-right');
  if (!host || host.dataset.built === '1') return;

  const langs = [['fr', 'Français'], ['eng', 'English'], ['es', 'Español']];
  const dots = [
    ['light', 'common.theme_light'], ['green', 'common.theme_green'],
    ['blue',  'common.theme_blue'],  ['orange', 'common.theme_orange'],
    ['rose',  'common.theme_rose'],  ['dark',  'common.theme_dark']
  ];

  host.innerHTML =
    '<div class="lang-switcher" role="group" aria-label="Langue / Language">'
    + langs.map(([code, label]) =>
        `<button type="button" class="lang-btn" data-lang="${code}" title="${label}">`
        + code.slice(0, 2).toUpperCase() + '</button>').join('')
    + '</div>'
    + '<div class="theme-switcher" role="group" data-i18n-aria-label="common.theme_chooser_aria">'
    + '<span class="theme-label" data-i18n="common.theme_chooser_label">Choisis ta couleur...</span>'
    + dots.map(([theme, key]) =>
        `<button type="button" class="theme-dot theme-dot-${theme}" data-theme="${theme}"`
        + ` data-i18n-aria-label="${key}" data-i18n-title="${key}"></button>`).join('')
    + '</div>'
    + '<div class="header-meta" id="today-date"></div>';

  host.dataset.built = '1';
}

// Common.js is loaded at the end of <body> on every page, so the header markup
// is in place before any page script runs.
buildHeaderControls();

// ---- Language ----

function getStoredLang() {
  try {
    const l = localStorage.getItem(LANG_KEY);
    return LANGS.includes(l) ? l : 'fr';
  } catch (e) { return 'fr'; }
}

// Hooks: each page can set these to run extra logic around language switch.
// _beforeLangSwitch(lang) is called before i18n.load (old translations still active).
// _onLangApplied(lang) is called after i18n.load + i18n.apply (new translations active).
let _beforeLangSwitch = null;
let _onLangApplied = null;

function applyLang(lang) {
  if (!LANGS.includes(lang)) lang = 'fr';
  try { localStorage.setItem(LANG_KEY, lang); } catch (e) {}
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.lang === lang);
  });
  document.documentElement.lang = lang === 'eng' ? 'en' : lang === 'es' ? 'es' : lang;
  if (typeof _beforeLangSwitch === 'function') _beforeLangSwitch(lang);
  return i18n.load(lang).then(() => {
    i18n.apply();
    // The header date is locale-formatted, so it has to be redrawn on every
    // switch. Doing it here means no page can forget to.
    setTodayDate();
    if (typeof _onLangApplied === 'function') _onLangApplied(lang);
  });
}

function initLanguage() {
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.addEventListener('click', () => applyLang(btn.dataset.lang));
  });
  const ready = applyLang(getStoredLang());
  window.addEventListener('storage', e => {
    if (e.key === LANG_KEY && e.newValue) applyLang(e.newValue);
  });
  return ready;
}

// ---- Theme ----

function getStoredTheme() {
  try {
    const t = localStorage.getItem(THEME_KEY);
    return THEMES.includes(t) ? t : 'light';
  } catch (e) { return 'light'; }
}

function applyTheme(theme) {
  if (!THEMES.includes(theme)) theme = 'light';
  if (theme === 'light') {
    document.documentElement.removeAttribute('data-theme');
  } else {
    document.documentElement.setAttribute('data-theme', theme);
  }
  try { localStorage.setItem(THEME_KEY, theme); } catch (e) {}
  document.querySelectorAll('.theme-dot').forEach(dot => {
    dot.classList.toggle('active', dot.dataset.theme === theme);
  });
}

function initTheme() {
  document.querySelectorAll('.theme-dot').forEach(dot => {
    dot.addEventListener('click', () => applyTheme(dot.dataset.theme));
  });
  applyTheme(getStoredTheme());
  window.addEventListener('storage', e => {
    if (e.key === THEME_KEY && e.newValue) applyTheme(e.newValue);
  });
}

// ---- Today date ----

function setTodayDate(dateOverride) {
  const el = document.getElementById('today-date');
  if (!el) return;
  const d = dateOverride || new Date();
  const lang = getStoredLang();
  const loc = lang === 'eng' ? 'en-GB' : lang === 'es' ? 'es-ES' : 'fr-FR';
  el.textContent = d.toLocaleDateString(loc, {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });
}

// ---- Locale helper ----

function getLangLocale() {
  const lang = getStoredLang();
  return lang === 'eng' ? 'en-GB' : lang === 'es' ? 'es-ES' : 'fr-FR';
}

// Clock label from minutes-since-midnight. French writes 19h / 19h30, the other
// locales use a colon.
function fmtClockMin(totalMin) {
  const h = String(Math.floor(totalMin / 60) % 24).padStart(2, '0');
  const m = totalMin % 60;
  if (getStoredLang() === 'fr') return m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, '0')}`;
  return `${h}:${String(m).padStart(2, '0')}`;
}

// ---- Planning grids ----
// Shared by the Planning page and the home page's "now" / "my day" widgets,
// which each used to carry their own copy of this week-selection maths.

// A planning stores one or more weeks; older ones kept a single grid at the top
// level. Returns a week array either way.
function planningWeeks(p) {
  if (p && p.weeks && p.weeks.length) return p.weeks;
  return [{ grid: p ? p.grid : null, sleepConfig: p ? p.sleepConfig : null }];
}

// Which week of a multi-week planning applies on `date` — the cycle advances
// with the ISO week number.
function planningWeekIndex(p, date) {
  const weeks = planningWeeks(p);
  if (weeks.length <= 1) return 0;
  const d = date || new Date();
  const startOfYear = new Date(d.getFullYear(), 0, 1);
  const dayOfYear = Math.floor((d - startOfYear) / 86400000) + 1;
  const isoWeek = Math.ceil((dayOfYear + startOfYear.getDay()) / 7);
  return (isoWeek - 1) % weeks.length;
}

// The grid in effect on `date`, or null when the planning has none.
function planningGridFor(p, date) {
  const week = planningWeeks(p)[planningWeekIndex(p, date)];
  return (week && week.grid) ? week.grid : null;
}

// Grid columns run Monday (0) to Sunday (6); JS getDay() puts Sunday first.
function planningDayIndex(date) {
  const js = (date || new Date()).getDay();
  return js === 0 ? 6 : js - 1;
}

// End (exclusive) of the run of identical cells containing `slot` in one column.
function planningBlockEnd(grid, dayIdx, slot) {
  const value = grid[slot][dayIdx];
  let end = slot;
  while (end < grid.length && grid[end][dayIdx] === value) end++;
  return end;
}

// ---- Modals ----

// Every page shows a modal the same way: an element with an id and a `hidden`
// class. What none of them had was Escape-to-dismiss, backdrop click, focus
// moved into the dialog and restored on close. That lives here now, so pages
// only have to call open()/close().
const VitalModal = {
  _returnFocus: new WeakMap(),
  // id -> function run instead of close() when the user dismisses with Escape or
  // a backdrop click. Pages register theirs when closing needs extra cleanup.
  _dismiss: {},

  onDismiss(id, fn) { this._dismiss[id] = fn; },

  isOpen(id) {
    const el = document.getElementById(id);
    return !!el && !el.classList.contains('hidden');
  },

  // Every dialog currently on screen, in DOM order — the last one is on top.
  visible() {
    return Array.from(document.querySelectorAll('[role="dialog"], [aria-modal="true"]'))
      .filter(el => el.id && !el.classList.contains('hidden'));
  },

  open(id) {
    const el = document.getElementById(id);
    if (!el) return null;
    if (el.classList.contains('hidden')) {
      this._returnFocus.set(el, document.activeElement);
    }
    el.classList.remove('hidden');
    if (!el.hasAttribute('role')) el.setAttribute('role', 'dialog');
    if (!el.hasAttribute('aria-modal')) el.setAttribute('aria-modal', 'true');
    const first = _modalFocusable(el)[0];
    if (first) { try { first.focus(); } catch (e) {} }
    return el;
  },

  close(id) {
    const el = document.getElementById(id);
    if (!el) return;
    const wasOpen = !el.classList.contains('hidden');
    el.classList.add('hidden');
    if (!wasOpen) return;
    const back = this._returnFocus.get(el);
    this._returnFocus.delete(el);
    if (back && document.contains(back)) { try { back.focus(); } catch (e) {} }
  },

  // Dismiss the topmost dialog. Returns true if one was open.
  closeTop() {
    const open = this.visible();
    const top = open[open.length - 1];
    if (!top) return false;
    this.dismiss(top.id);
    return true;
  },

  // User-initiated dismissal: hand off to the page's handler when it registered
  // one, so its cleanup still runs.
  dismiss(id) {
    const fn = this._dismiss[id];
    if (fn) fn(); else this.close(id);
  }
};

function _modalFocusable(root) {
  const sel = 'a[href], button:not([disabled]), input:not([type="hidden"]):not([disabled]),'
            + ' select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
  return Array.from(root.querySelectorAll(sel))
    .filter(el => el.offsetParent !== null || el === document.activeElement);
}

function initModals() {
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      if (VitalModal.closeTop()) e.preventDefault();
      return;
    }
    // Keep Tab inside the dialog on top.
    if (e.key !== 'Tab') return;
    const open = VitalModal.visible();
    const top = open[open.length - 1];
    if (!top) return;
    const items = _modalFocusable(top);
    if (items.length === 0) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && (document.activeElement === first || !top.contains(document.activeElement))) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  });

  // A click on the dialog root itself (i.e. the area around the panel) closes it.
  // Elements carrying data-close are handled by each page's own binding.
  document.addEventListener('click', e => {
    const dialogs = VitalModal.visible();
    const top = dialogs[dialogs.length - 1];
    if (top && e.target === top) VitalModal.dismiss(top.id);
  });
}

initModals();

// ---- HTML escaping ----

// Escape text destined for innerHTML. Names come from the user, so a value like
// `Pain <maison>` or one containing a quote would otherwise break the markup.
function escHtml(s) {
  if (s === null || s === undefined) return '';
  return String(s).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

// ---- Toast ----

// Small transient banner, bottom-centre. Used for things the user must notice
// but shouldn't have to dismiss — a failed save above all.
let _toastTimer = null;

function vitalToast(message, type) {
  if (!message) return;
  let el = document.getElementById('vital-toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'vital-toast';
    el.className = 'vital-toast';
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', 'polite');
    document.body.appendChild(el);
  }
  el.textContent = message;
  el.classList.toggle('vital-toast-error', type === 'error');
  el.classList.add('visible');
  if (_toastTimer) clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => { el.classList.remove('visible'); }, 6000);
}

// ============ DATA STORE — generic localStorage helpers ============

const _VS_KEY = 'V1t@lD';

function _vsXor(str, key) {
  let out = '';
  for (let i = 0; i < str.length; i++)
    out += String.fromCharCode(str.charCodeAt(i) ^ key.charCodeAt(i % key.length));
  return out;
}
// Byte array → binary string, in chunks. A spread (`String.fromCharCode(...bytes)`)
// blows the argument limit around 125 KB, which is well under the localStorage
// quota — a single photo or a couple of voice notes would fail to save.
function _vsBytesToBinary(bytes) {
  const CHUNK = 0x8000;
  let out = '';
  for (let i = 0; i < bytes.length; i += CHUNK) {
    out += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK));
  }
  return out;
}
function _vsEnc(str) { return btoa(_vsBytesToBinary(new TextEncoder().encode(_vsXor(str, _VS_KEY)))); }
function _vsDec(b64) { return _vsXor(new TextDecoder().decode(Uint8Array.from(atob(b64), c => c.charCodeAt(0))), _VS_KEY); }

// Distinguish "the browser is full" from any other write failure, so the user
// gets an actionable message instead of a generic one.
function _vsIsQuotaError(e) {
  if (!e) return false;
  return e.name === 'QuotaExceededError'
      || e.name === 'NS_ERROR_DOM_QUOTA_REACHED'
      || e.code === 22
      || e.code === 1014;
}

function _vsErrorMessage(reason) {
  const key = reason === 'quota' ? 'common.save_error_quota' : 'common.save_error';
  const fallback = reason === 'quota'
    ? "Enregistrement impossible : la mémoire du navigateur est pleine. Exporte puis supprime d'anciennes entrées (surtout les images et les notes vocales)."
    : "Enregistrement impossible. Tes dernières modifications n'ont pas été sauvegardées.";
  try {
    const t = i18n.t(key);
    return (typeof t === 'string' && t !== key) ? t : fallback;
  } catch (e) { return fallback; }
}

// Simple FNV-1a 32-bit hash for sanity checks
function _vsHash(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
}

const VitalStore = {
  // ---- Low-level read/write (encrypted + integrity check) ----
  get(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null) return fallback !== undefined ? fallback : null;
      const dec = _vsDec(raw);
      const parsed = JSON.parse(dec);
      if (parsed && typeof parsed === 'object' && parsed.__vs_h !== undefined) {
        const { __vs_h, __vs_d } = parsed;
        const json = JSON.stringify(__vs_d);
        if (_vsHash(json) !== __vs_h) {
          console.warn('VitalStore: integrity check failed for', key);
          return fallback !== undefined ? fallback : null;
        }
        return __vs_d;
      }
      return parsed;
    } catch (e) { return fallback !== undefined ? fallback : null; }
  },
  // Reason for the most recent failed write: 'quota' | 'error' | null.
  lastError: null,
  // Called on every failed write. Defaults to a visible toast so a save that
  // silently does nothing can't go unnoticed; pages may override it.
  onError(reason, key) { vitalToast(_vsErrorMessage(reason), 'error'); },
  set(key, value) {
    this.lastError = null;
    try {
      const json = JSON.stringify(value);
      const envelope = JSON.stringify({ __vs_h: _vsHash(json), __vs_d: value });
      localStorage.setItem(key, _vsEnc(envelope));
      return true;
    } catch (e) {
      this.lastError = _vsIsQuotaError(e) ? 'quota' : 'error';
      console.error('VitalStore.set failed', key, e);
      if (typeof this.onError === 'function') this.onError(this.lastError, key);
      return false;
    }
  },
  remove(key) {
    try { localStorage.removeItem(key); } catch (e) {}
  },
  getRaw(key) {
    try {
      const raw = localStorage.getItem(key);
      return raw === null ? null : _vsDec(raw);
    } catch (e) { return null; }
  },
  setRaw(key, value) {
    this.lastError = null;
    try { localStorage.setItem(key, _vsEnc(value)); return true; }
    catch (e) {
      this.lastError = _vsIsQuotaError(e) ? 'quota' : 'error';
      console.error('VitalStore.setRaw failed', key, e);
      if (typeof this.onError === 'function') this.onError(this.lastError, key);
      return false;
    }
  },

  // ---- ID generation ----
  newId(prefix) {
    return (prefix || '') + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6);
  },

  // ---- Index-based multi-journal pattern ----
  // indexKey stores [{id, name, createdAt, ...}], each item has its own storage at itemKeyFn(id)
  loadIndex(indexKey) {
    const arr = this.get(indexKey, []);
    return Array.isArray(arr) ? arr : [];
  },
  saveIndex(indexKey, index) {
    return this.set(indexKey, index);
  },
  loadItem(itemKey, defaults) {
    const raw = this.get(itemKey);
    if (!raw) return defaults ? Object.assign({}, defaults) : null;
    return defaults ? Object.assign({}, defaults, raw) : raw;
  },
  saveItem(itemKey, data) {
    return this.set(itemKey, data);
  },
  removeItem(itemKey) {
    this.remove(itemKey);
  },

  // ---- Blob / File → base64 data-URL ----
  blobToDataURL(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  },

  // ---- Export JSON file (with integrity hash) ----
  exportJSON(data, filename) {
    const json = JSON.stringify(data);
    const envelope = { __vs_h: _vsHash(json), data: data };
    const blob = new Blob([JSON.stringify(envelope, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  // ---- Import JSON file (returns Promise<object>, verifies integrity) ----
  // ---- Reorder an array in-place (swap item at idx with neighbour) ----
  moveItem(arr, idx, direction) {
    const newIdx = idx + direction;
    if (newIdx < 0 || newIdx >= arr.length) return false;
    const tmp = arr[idx];
    arr[idx] = arr[newIdx];
    arr[newIdx] = tmp;
    return true;
  },

  importJSON(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = evt => {
        try {
          const parsed = JSON.parse(evt.target.result);
          if (parsed && parsed.__vs_h !== undefined && parsed.data !== undefined) {
            const json = JSON.stringify(parsed.data);
            if (_vsHash(json) !== parsed.__vs_h) {
              reject(new Error('Integrity check failed: file may be corrupted'));
              return;
            }
            resolve(parsed.data);
          } else {
            resolve(parsed);
          }
        } catch (e) { reject(e); }
      };
      reader.onerror = reject;
      reader.readAsText(file);
    });
  }
};
