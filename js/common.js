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
