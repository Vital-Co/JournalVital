/**
 * i18n — Minimal localization loader.
 *
 * Usage:
 *   // Load once (async, at page startup):
 *   await i18n.load('fr');
 *
 *   // Translate a key:
 *   i18n.t('common.back')                     // → "Retour"
 *   i18n.t('planning.days.0')                 // → "Lun"
 *   i18n.t('addiction.catchup_days_ago', {n: 3}) // → "il y a 3 jours"
 *
 *   // Apply to DOM (elements with data-i18n="key"):
 *   i18n.apply();
 *
 * Template tokens: {key} in strings are replaced by values passed in the
 * params object. A missing param leaves the token untouched.
 *
 * Plural shorthand: {s} is replaced by 's' when params.n > 1, else ''.
 */

const i18n = (() => {
  let _strings = {};
  let _lang = 'fr';

  /**
   * Load a locale JSON file from i18n/<lang>.json (relative to this script).
   * Returns a promise that resolves once the locale is ready.
   */
  async function load(lang) {
    lang = lang || 'fr';
    try {
      const base = _scriptDir();
      const resp = await fetch(base + lang + '.json');
      if (!resp.ok) throw new Error('HTTP ' + resp.status);
      _strings = await resp.json();
      _lang = lang;
    } catch (e) {
      console.error('[i18n] Failed to load locale "' + lang + '":', e);
    }
  }

  /** True when a key resolves in the current locale. Never warns. */
  function has(key) {
    return _get(key) !== undefined;
  }

  /** Translate key (dot-separated path) with optional interpolation params. */
  function t(key, params) {
    const val = _get(key);
    if (val === undefined || val === null) {
      console.warn('[i18n] Missing key:', key);
      return key;
    }
    if (typeof val !== 'string') return val; // arrays / objects returned as-is
    return _interpolate(val, params);
  }

  /**
   * Apply translations to the DOM.
   * Elements with data-i18n="key" get their textContent replaced.
   * Elements with data-i18n-html="key" get their innerHTML replaced.
   * Elements with data-i18n-placeholder="key" get their placeholder replaced.
   * Elements with data-i18n-title="key" get their title replaced.
   * Elements with data-i18n-aria-label="key" get their aria-label replaced.
   */
  function apply(root) {
    root = root || document;
    root.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.dataset.i18n;
      const val = t(key);
      if (typeof val === 'string') el.textContent = val;
    });
    root.querySelectorAll('[data-i18n-html]').forEach(el => {
      const key = el.dataset.i18nHtml;
      const val = t(key);
      if (typeof val === 'string') el.innerHTML = val;
    });
    root.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const key = el.dataset.i18nPlaceholder;
      const val = t(key);
      if (typeof val === 'string') el.placeholder = val;
    });
    root.querySelectorAll('[data-i18n-title]').forEach(el => {
      const key = el.dataset.i18nTitle;
      const val = t(key);
      if (typeof val === 'string') el.title = val;
    });
    root.querySelectorAll('[data-i18n-aria-label]').forEach(el => {
      const key = el.dataset.i18nAriaLabel;
      const val = t(key);
      if (typeof val === 'string') el.setAttribute('aria-label', val);
    });
  }

  // ---- internals ----

  function _get(key) {
    return key.split('.').reduce((obj, k) => {
      if (obj === undefined || obj === null) return undefined;
      return obj[k];
    }, _strings);
  }

  function _interpolate(str, params) {
    if (!params) return str;
    return str.replace(/\{(\w+)\}/g, (_, k) => {
      if (k === 's') return (params.n !== undefined && params.n > 1) ? 's' : '';
      return params[k] !== undefined ? params[k] : '{' + k + '}';
    });
  }

  function _scriptDir() {
    // Finds the directory of this script so locale files can be resolved
    // relative to i18n/ regardless of the calling HTML page's location.
    const scripts = document.querySelectorAll('script[src]');
    for (const s of scripts) {
      if (s.src.includes('i18n.js')) {
        return s.src.replace(/i18n\.js[^/]*$/, '');
      }
    }
    return 'i18n/';
  }

  return { load, has, t, apply };
})();
