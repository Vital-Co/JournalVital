// ============ COMMON — shared across all pages ============

// ---- Constants ----
const LANG_KEY  = 'vital_lang';
const LANGS     = ['fr', 'eng', 'es'];
const THEME_KEY = 'vital_theme';
const THEMES    = ['light', 'green', 'blue', 'orange', 'rose', 'dark'];

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

// ============ DATA STORE — generic localStorage helpers ============

const _VS_KEY = 'V1t@lD';

function _vsXor(str, key) {
  let out = '';
  for (let i = 0; i < str.length; i++)
    out += String.fromCharCode(str.charCodeAt(i) ^ key.charCodeAt(i % key.length));
  return out;
}
function _vsEnc(str) { return btoa(String.fromCharCode(...new TextEncoder().encode(_vsXor(str, _VS_KEY)))); }
function _vsDec(b64) { return _vsXor(new TextDecoder().decode(Uint8Array.from(atob(b64), c => c.charCodeAt(0))), _VS_KEY); }

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
  set(key, value) {
    try {
      const json = JSON.stringify(value);
      const envelope = JSON.stringify({ __vs_h: _vsHash(json), __vs_d: value });
      localStorage.setItem(key, _vsEnc(envelope));
      return true;
    } catch (e) { console.error('VitalStore.set failed', key, e); return false; }
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
    try { localStorage.setItem(key, _vsEnc(value)); return true; }
    catch (e) { return false; }
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
