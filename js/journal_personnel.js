// ============ JOURNAL PERSONNEL ============

(function () {
  'use strict';

  const STORAGE_KEY = 'vital_perso_journals';

  // ---- State ----
  let journals = [];      // [{id, name, createdAt, entries:[{id,date,texts:[],audios:[],images:[]}]}]
  let currentJournalId = null;

  // Pending entry data (add tab)
  let pendingAudios = [];   // base64 data-urls
  let pendingImages = [];   // base64 data-urls

  // Voice recording
  let mediaRecorder = null;
  let audioChunks = [];

  // ---- DOM refs ----
  const $ = id => document.getElementById(id);

  // ---- Persistence ----
  function loadAll() {
    journals = VitalStore.get(STORAGE_KEY, []);
    if (!Array.isArray(journals)) journals = [];
  }
  function saveAll() {
    VitalStore.set(STORAGE_KEY, journals);
  }
  function getJournal(id) { return journals.find(j => j.id === id); }

  // ---- Navigation ----
  function showView(name) {
    ['view-home', 'view-welcome', 'main-app'].forEach(id => {
      const el = $(id);
      if (el) el.classList.add('hidden');
    });
    ['view-add', 'view-browse', 'view-settings'].forEach(id => {
      const el = $(id);
      if (el) el.classList.add('hidden');
    });

    if (name === 'home') {
      $('view-home').classList.remove('hidden');
      $('journal-name-row').classList.add('hidden');
      currentJournalId = null;
      renderHome();
    } else if (name === 'welcome') {
      $('view-welcome').classList.remove('hidden');
      $('journal-name-row').classList.add('hidden');
    } else if (name === 'journal') {
      $('main-app').classList.remove('hidden');
      $('journal-name-row').classList.remove('hidden');
      const j = getJournal(currentJournalId);
      if (j) $('journal-name-display').textContent = j.name;
      // open browse tab if journal has entries, otherwise add tab
      const defaultTab = (j && j.entries && j.entries.length > 0) ? 'browse' : 'add';
      $('view-' + defaultTab).classList.remove('hidden');
      document.querySelectorAll('.tabs .tab').forEach(t => t.classList.remove('active'));
      document.querySelector('.tab[data-view="' + defaultTab + '"]').classList.add('active');
      if (defaultTab === 'browse') renderBrowse();
      resetAddForm();
    }
  }

  function openTab(view) {
    ['view-add', 'view-browse', 'view-settings'].forEach(id => {
      const el = $(id);
      if (el) el.classList.add('hidden');
    });
    const target = $('view-' + view);
    if (target) target.classList.remove('hidden');
    document.querySelectorAll('.tabs .tab').forEach(t => {
      t.classList.toggle('active', t.dataset.view === view);
    });
    if (view === 'browse') renderBrowse();
  }

  // ---- Home rendering ----
  function renderHome() {
    const list = $('journals-list');
    if (!list) return;
    list.innerHTML = '';
    if (journals.length === 0) {
      list.innerHTML = '<div class="journals-empty"><div class="journals-empty-text">' +
        i18n.t('perso.empty_journals') + '</div></div>';
      return;
    }
    journals.forEach((j, idx) => {
      const card = document.createElement('div');
      card.className = 'journal-card';
      const count = j.entries ? j.entries.length : 0;
      const countLabel = count === 0 ? i18n.t('perso.entries_zero')
        : count === 1 ? i18n.t('perso.entries_one')
        : i18n.t('perso.entries_n', { n: count });
      card.innerHTML =
        '<div class="journal-card-main">' +
          '<div class="journal-card-name">' + esc(j.name || i18n.t('perso.journal_unnamed')) + '<button class="btn-rename" data-action="rename" data-id="' + j.id + '" title="' + i18n.t('common.rename') + '">✏️</button></div>' +
          '<div class="journal-card-meta">' +
            '<span class="journal-card-meta-item">' + countLabel + '</span>' +
          '</div>' +
        '</div>' +
        '<div class="journal-card-actions">' +
          (journals.length > 1 ? '<span class="journal-card-reorder">' +
            '<button class="btn-move" data-action="move-up" data-id="' + j.id + '" title="' + i18n.t('common.move_up') + '"' + (idx === 0 ? ' disabled' : '') + '>▲</button>' +
            '<button class="btn-move" data-action="move-down" data-id="' + j.id + '" title="' + i18n.t('common.move_down') + '"' + (idx === journals.length - 1 ? ' disabled' : '') + '>▼</button>' +
          '</span>' : '') +
          '<button class="btn-export-json" data-action="export" data-id="' + j.id + '" title="' + i18n.t('common.export') + '">' + i18n.t('common.export') + '</button>' +
          '<button class="btn-del" data-action="delete" data-id="' + j.id + '" title="' + i18n.t('common.delete') + '">' + i18n.t('common.delete') + '</button>' +
        '</div>';
      card.addEventListener('click', e => {
        if (e.target.closest('[data-action]')) return;
        currentJournalId = j.id;
        showView('journal');
      });
      list.appendChild(card);
    });

    list.querySelectorAll('[data-action="export"]').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        exportJournal(btn.dataset.id);
      });
    });
    list.querySelectorAll('[data-action="delete"]').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        deleteJournal(btn.dataset.id);
      });
    });
    list.querySelectorAll('[data-action="move-up"]').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        moveJournal(btn.dataset.id, -1);
      });
    });
    list.querySelectorAll('[data-action="move-down"]').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        moveJournal(btn.dataset.id, 1);
      });
    });
    list.querySelectorAll('[data-action="rename"]').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const id = btn.dataset.id;
        const j = getJournal(id);
        if (!j) return;
        const newName = prompt(i18n.t('common.rename'), j.name);
        if (newName && newName.trim()) {
          j.name = newName.trim();
          saveAll();
          renderHome();
        }
      });
    });
  }

  // ---- Move journal ----
  function moveJournal(id, direction) {
    const idx = journals.findIndex(j => j.id === id);
    if (idx < 0) return;
    const newIdx = idx + direction;
    if (newIdx < 0 || newIdx >= journals.length) return;
    VitalStore.moveItem(journals, idx, direction);
    saveAll();
    renderHome();
  }

  // ---- Create journal ----
  function createJournal() {
    const nameInput = $('config-journal-name');
    const name = (nameInput.value || '').trim();
    if (!name) {
      $('config-error').textContent = i18n.t('perso.error_name_required');
      return;
    }
    $('config-error').textContent = '';
    const j = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      name: name,
      createdAt: new Date().toISOString(),
      entries: []
    };
    journals.push(j);
    saveAll();
    nameInput.value = '';
    currentJournalId = j.id;
    showView('journal');
  }

  // ---- Delete journal ----
  function deleteJournal(id) {
    const j = getJournal(id);
    const name = j ? j.name : '';
    if (!confirm(i18n.t('perso.confirm_delete_journal', { name: name }))) return;
    journals = journals.filter(x => x.id !== id);
    saveAll();
    if (currentJournalId === id) {
      currentJournalId = null;
      showView('home');
    } else {
      renderHome();
    }
  }

  // ---- Export / Import ----
  function exportJournal(id) {
    const j = getJournal(id);
    if (!j) return;
    VitalStore.exportJSON(j, (j.name || 'journal') + '.json');
  }

  function importJournal(file) {
    VitalStore.importJSON(file).then(data => {
      if (!data.name || !Array.isArray(data.entries)) {
        alert(i18n.t('perso.alert_import_invalid'));
        return;
      }
      data.id = VitalStore.newId('');
      journals.push(data);
      saveAll();
      renderHome();
    }).catch(() => {
      alert(i18n.t('perso.alert_import_invalid'));
    });
  }

  // ---- Add entry ----
  function resetAddForm() {
    pendingAudios = [];
    pendingImages = [];
    $('entry-title').value = '';
    $('entry-text').value = '';
    $('vocal-list').innerHTML = '';
    $('image-preview-list').innerHTML = '';
    $('save-status').textContent = '';
  }

  // ---- Voice recording ----
  function toggleRecording() {
    const btn = $('vocal-rec-btn');
    const status = $('vocal-status');
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop();
      btn.textContent = i18n.t('perso.btn_record');
      btn.classList.remove('recording');
      status.textContent = '';
      return;
    }
    navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
      mediaRecorder = new MediaRecorder(stream);
      audioChunks = [];
      mediaRecorder.ondataavailable = e => { if (e.data.size > 0) audioChunks.push(e.data); };
      mediaRecorder.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(audioChunks, { type: 'audio/webm' });
        VitalStore.blobToDataURL(blob).then(dataUrl => {
          pendingAudios.push(dataUrl);
          renderPendingAudios();
        });
      };
      mediaRecorder.start();
      btn.textContent = i18n.t('perso.btn_stop');
      btn.classList.add('recording');
      status.textContent = i18n.t('perso.vocal_recording');
    }).catch(() => {
      status.textContent = i18n.t('perso.vocal_mic_refused');
    });
  }

  function renderPendingAudios() {
    const list = $('vocal-list');
    list.innerHTML = '';
    pendingAudios.forEach((src, i) => {
      const div = document.createElement('div');
      div.className = 'vocal-item';
      div.innerHTML = '<audio controls src="' + src + '"></audio>' +
        '<button class="vocal-remove" title="' + i18n.t('common.delete') + '">✕</button>';
      div.querySelector('.vocal-remove').addEventListener('click', () => {
        pendingAudios.splice(i, 1);
        renderPendingAudios();
      });
      list.appendChild(div);
    });
  }

  // ---- Images ----
  function handleImageInput(files) {
    Array.from(files).forEach(file => {
      VitalStore.blobToDataURL(file).then(dataUrl => {
        pendingImages.push(dataUrl);
        renderPendingImages();
      });
    });
  }

  function renderPendingImages() {
    const list = $('image-preview-list');
    list.innerHTML = '';
    pendingImages.forEach((src, i) => {
      const div = document.createElement('div');
      div.className = 'perso-image-preview-item';
      div.innerHTML = '<img src="' + src + '" alt="">' +
        '<button class="perso-img-remove" title="' + i18n.t('common.delete') + '">✕</button>';
      div.querySelector('.perso-img-remove').addEventListener('click', () => {
        pendingImages.splice(i, 1);
        renderPendingImages();
      });
      list.appendChild(div);
    });
  }

  // ---- Save entry ----
  function saveEntry() {
    const title = ($('entry-title').value || '').trim();
    if (!title) {
      $('save-status').textContent = i18n.t('perso.save_error_title_required');
          $('save-status').style.color = '#e53935';
      $('entry-title').focus();
      return;
    }
    const entryText = ($('entry-text').value || '').trim();
    if (!entryText && pendingAudios.length === 0 && pendingImages.length === 0) {
      $('save-status').textContent = i18n.t('perso.save_error_empty');
      $('save-status').style.color = '#e53935';
      return;
    }
    const j = getJournal(currentJournalId);
    if (!j) return;
    const entry = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      date: new Date().toISOString(),
      title: title,
      text: entryText,
      audios: pendingAudios.slice(),
      images: pendingImages.slice()
    };
    j.entries.push(entry);
    saveAll();
    const t = new Date().toLocaleTimeString(getLangLocale(), { hour: '2-digit', minute: '2-digit' });
    $('save-status').style.color = '';
    $('save-status').textContent = i18n.t('perso.save_status_saved_at', { t: t });
    resetAddForm();
  }

  // ---- Browse / filter ----
  function renderBrowse() {
    const j = getJournal(currentJournalId);
    const list = $('browse-list');
    if (!j || !j.entries || j.entries.length === 0) {
      list.innerHTML = '<div class="perso-browse-empty">' + i18n.t('perso.browse_empty') + '</div>';
      return;
    }

    const mode = $('filter-mode').value;
    const d1 = $('filter-date1').value;
    const d2 = $('filter-date2').value;

    let entries = j.entries.slice().sort((a, b) => new Date(b.date) - new Date(a.date));

    if (mode === 'exact' && d1) {
      entries = entries.filter(e => toDateStr(e.date) === d1);
    } else if (mode === 'after' && d1) {
      entries = entries.filter(e => toDateStr(e.date) >= d1);
    } else if (mode === 'before' && d1) {
      entries = entries.filter(e => toDateStr(e.date) <= d1);
    } else if (mode === 'range' && d1 && d2) {
      const lo = d1 < d2 ? d1 : d2;
      const hi = d1 < d2 ? d2 : d1;
      entries = entries.filter(e => { const ds = toDateStr(e.date); return ds >= lo && ds <= hi; });
    }

    list.innerHTML = '';
    if (entries.length === 0) {
      list.innerHTML = '<div class="perso-browse-empty">' + i18n.t('perso.browse_no_results') + '</div>';
      return;
    }

    entries.forEach(entry => {
      const div = document.createElement('div');
      div.className = 'perso-entry';

      const d = new Date(entry.date);
      const dateStr = d.toLocaleDateString(getLangLocale(), {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
      });
      const timeStr = d.toLocaleTimeString(getLangLocale(), { hour: '2-digit', minute: '2-digit' });

      let html = '';
      if (entry.title) {
        html += '<div class="perso-entry-title">' + esc(entry.title) + '</div>';
      }
      html += '<div class="perso-entry-date">' + dateStr + ' · ' + timeStr + '</div>';

      const entryTextContent = entry.text || (entry.texts && entry.texts.length ? entry.texts.join('\n') : '');
      if (entryTextContent) {
        html += '<div class="perso-entry-texts"><div class="perso-entry-text">' + linkify(esc(entryTextContent)) + '</div></div>';
      }

      if (entry.audios && entry.audios.length) {
        html += '<div class="perso-entry-audios">';
        entry.audios.forEach(src => {
          html += '<audio controls src="' + src + '"></audio>';
        });
        html += '</div>';
      }

      if (entry.images && entry.images.length) {
        html += '<div class="perso-entry-images">';
        entry.images.forEach(src => {
          html += '<img src="' + src + '" alt="" data-lightbox>';
        });
        html += '</div>';
      }

      html += '<button class="perso-entry-delete" data-entry-id="' + entry.id + '">' + i18n.t('common.delete') + '</button>';

      div.innerHTML = html;
      list.appendChild(div);
    });

    // Lightbox
    list.querySelectorAll('[data-lightbox]').forEach(img => {
      img.addEventListener('click', () => openLightbox(img.src));
    });

    // Delete entry
    list.querySelectorAll('.perso-entry-delete').forEach(btn => {
      btn.addEventListener('click', () => {
        if (!confirm(i18n.t('perso.confirm_delete_entry'))) return;
        const j2 = getJournal(currentJournalId);
        if (j2) {
          j2.entries = j2.entries.filter(e => e.id !== btn.dataset.entryId);
          saveAll();
          renderBrowse();
        }
      });
    });
  }

  // ---- Filter UI ----
  function updateFilterUI() {
    const mode = $('filter-mode').value;
    const g1 = $('filter-date1-group');
    const g2 = $('filter-date2-group');
    const gb = $('filter-buttons-group');
    if (mode === 'all') {
      g1.classList.add('hidden');
      g2.classList.add('hidden');
      if (gb) gb.classList.add('hidden');
    } else if (mode === 'range') {
      g1.classList.remove('hidden');
      g2.classList.remove('hidden');
      if (gb) gb.classList.remove('hidden');
    } else {
      g1.classList.remove('hidden');
      g2.classList.add('hidden');
      if (gb) gb.classList.remove('hidden');
    }
  }

  // ---- Lightbox ----
  function openLightbox(src) {
    const overlay = document.createElement('div');
    overlay.className = 'perso-lightbox';
    overlay.innerHTML = '<img src="' + src + '" alt="">';
    overlay.addEventListener('click', () => overlay.remove());
    document.body.appendChild(overlay);
  }

  // ---- Helpers ----
  function esc(s) {
    const d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
  }

  function toDateStr(iso) {
    return iso.slice(0, 10);
  }

  /** Turn URLs in escaped text into clickable links */
  function linkify(text) {
    return text.replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>');
  }

  // ---- i18n hooks ----
  _onLangApplied = function () {
    setTodayDate();
    // Re-translate select options
    const sel = $('filter-mode');
    if (sel) {
      sel.querySelectorAll('option').forEach(opt => {
        const key = opt.dataset.i18n;
        if (key) opt.textContent = i18n.t(key);
      });
    }
    if (currentJournalId) {
      const j = getJournal(currentJournalId);
      if (j) $('journal-name-display').textContent = j.name;
    }
    if (!$('view-home').classList.contains('hidden')) renderHome();
    if (!$('view-browse').classList.contains('hidden')) renderBrowse();
  };

  // ---- Init ----
  function init() {
    loadAll();

    initLanguage().then(() => {
      setTodayDate();
      showView('home');
    });
    initTheme();

    // Tabs
    document.querySelectorAll('.tabs .tab').forEach(tab => {
      tab.addEventListener('click', () => openTab(tab.dataset.view));
    });

    // Home buttons
    $('create-journal-btn').addEventListener('click', () => showView('welcome'));
    $('start-btn').addEventListener('click', createJournal);
    $('back-home-btn').addEventListener('click', () => showView('home'));

    // Import
    $('import-journal-btn').addEventListener('click', () => $('import-journal-file').click());
    $('import-journal-file').addEventListener('change', e => {
      if (e.target.files[0]) importJournal(e.target.files[0]);
      e.target.value = '';
    });

    // Add entry
    $('vocal-rec-btn').addEventListener('click', toggleRecording);
    $('image-input').addEventListener('change', e => {
      handleImageInput(e.target.files);
      e.target.value = '';
    });
    $('save-entry-btn').addEventListener('click', saveEntry);

    // Filter
    $('filter-mode').addEventListener('change', () => { updateFilterUI(); renderBrowse(); });
    $('filter-apply-btn').addEventListener('click', renderBrowse);
    $('filter-reset-btn').addEventListener('click', () => {
      $('filter-mode').value = 'all';
      $('filter-date1').value = '';
      $('filter-date2').value = '';
      updateFilterUI();
      renderBrowse();
    });

    // Settings — delete
    $('delete-journal-btn').addEventListener('click', () => {
      if (currentJournalId) deleteJournal(currentJournalId);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
