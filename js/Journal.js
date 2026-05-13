// ============ JOURNAL PERSONNEL ============

(function () {
  'use strict';

  const STORAGE_KEY = 'vital_perso_journals';

  // ---- State ----
  let journals = [];      // [{id, name, createdAt, entries:[{id,date,texts:[],audios:[],images:[]}]}]
  let currentJournalId = null;
  let browseMode = 'all'; // 'all' | 'journal' | 'audio' | 'score'
  let _scoreTooltip = null;

  // Pending entry data (add tab)
  let pendingAudios = [];   // base64 data-urls
  let pendingImages = [];   // base64 data-urls
  let editingEntryId = null;

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
    ['view-browse', 'view-settings'].forEach(id => {
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
      browseMode = 'all';
      $('view-browse').classList.remove('hidden');
      document.querySelectorAll('.tabs .tab').forEach(t => t.classList.remove('active'));
      document.querySelector('.tab[data-view="browse"]').classList.add('active');
      renderBrowse();
      resetAddForm();
      if (!j || !j.entries || j.entries.length === 0) openAddModal();
    }
  }

  function openTab(view) {
    ['view-browse', 'view-settings'].forEach(id => {
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

  function openAddModal() {
    $('add-entry-modal').classList.remove('hidden');
    $('entry-title').focus();
  }

  function closeAddModal() {
    $('add-entry-modal').classList.add('hidden');
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
    editingEntryId = null;
    $('entry-title').value = '';
    $('entry-text').value = '';
    $('vocal-list').innerHTML = '';
    $('image-preview-list').innerHTML = '';
    $('save-status').textContent = '';
    $('save-entry-btn').textContent = i18n.t('perso.btn_save_entry');
    const cardLabel = document.querySelector('#add-entry-modal .card-label');
    if (cardLabel) cardLabel.textContent = i18n.t('perso.add_card_label');
    $('cancel-edit-btn').classList.add('hidden');
    if ($('score-toggle')) { $('score-toggle').checked = false; }
    if ($('entry-score')) { $('entry-score').value = 0; }
    if ($('entry-score-display')) { $('entry-score-display').textContent = '0'; }
    if ($('score-slider-row')) { $('score-slider-row').classList.add('hidden'); }
  }

  function startEditEntry(entry) {
    editingEntryId = entry.id;
    $('entry-title').value = entry.title || '';
    $('entry-text').value = entry.text || (entry.texts ? entry.texts.join('\n') : '');
    pendingAudios = (entry.audios || []).slice();
    pendingImages = (entry.images || []).slice();
    renderPendingAudios();
    renderPendingImages();
    $('save-status').textContent = '';
    $('save-entry-btn').textContent = i18n.t('perso.btn_update_entry');
    if (entry.score != null) {
      if ($('score-toggle')) { $('score-toggle').checked = true; }
      if ($('score-slider-row')) { $('score-slider-row').classList.remove('hidden'); }
      if ($('entry-score')) { $('entry-score').value = entry.score; }
      if ($('entry-score-display')) { $('entry-score-display').textContent = entry.score; }
    } else {
      if ($('score-toggle')) { $('score-toggle').checked = false; }
      if ($('score-slider-row')) { $('score-slider-row').classList.add('hidden'); }
      if ($('entry-score')) { $('entry-score').value = 0; }
      if ($('entry-score-display')) { $('entry-score-display').textContent = '0'; }
    }
    const cardLabel = document.querySelector('#add-entry-modal .card-label');
    if (cardLabel) cardLabel.textContent = i18n.t('perso.add_card_label_edit');
    $('cancel-edit-btn').classList.remove('hidden');
    openAddModal();
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

    if (editingEntryId) {
      const idx = j.entries.findIndex(e => e.id === editingEntryId);
      if (idx !== -1) {
        j.entries[idx] = {
          ...j.entries[idx],
          title: title,
          text: entryText,
          audios: pendingAudios.slice(),
          images: pendingImages.slice()
        };
        if ($('score-toggle') && $('score-toggle').checked) {
          j.entries[idx].score = parseInt($('entry-score').value, 10);
        } else {
          delete j.entries[idx].score;
        }
      }
    } else {
      const newEntry = {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        date: new Date().toISOString(),
        title: title,
        text: entryText,
        audios: pendingAudios.slice(),
        images: pendingImages.slice()
      };
      if ($('score-toggle') && $('score-toggle').checked) {
        newEntry.score = parseInt($('entry-score').value, 10);
      }
      j.entries.push(newEntry);
    }

    saveAll();
    resetAddForm();
    closeAddModal();
    openTab('browse');
  }

  // ---- Browse / filter ----
  function getFilteredSortedEntries() {
    const j = getJournal(currentJournalId);
    if (!j || !j.entries || j.entries.length === 0) return null;

    const mode = $('filter-mode').value;
    const d1 = $('filter-date1').value;
    const d2 = $('filter-date2').value;
    const scoreMode = $('score-filter-mode').value;
    const sv1 = parseInt($('score-filter-val1').value, 10);
    const sv2 = parseInt($('score-filter-val2').value, 10);
    const sortOrder = $('sort-order').value;

    let entries = j.entries.slice();

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

    if (scoreMode === 'exact') {
      entries = entries.filter(e => e.score != null && e.score === sv1);
    } else if (scoreMode === 'above') {
      entries = entries.filter(e => e.score != null && e.score >= sv1);
    } else if (scoreMode === 'below') {
      entries = entries.filter(e => e.score != null && e.score <= sv1);
    } else if (scoreMode === 'range') {
      const lo = sv1 < sv2 ? sv1 : sv2;
      const hi = sv1 < sv2 ? sv2 : sv1;
      entries = entries.filter(e => e.score != null && e.score >= lo && e.score <= hi);
    }

    if (sortOrder === 'date-asc') {
      entries.sort((a, b) => new Date(a.date) - new Date(b.date));
    } else if (sortOrder === 'score-desc') {
      entries.sort((a, b) => (b.score != null ? b.score : -Infinity) - (a.score != null ? a.score : -Infinity));
    } else if (sortOrder === 'score-asc') {
      entries.sort((a, b) => (a.score != null ? a.score : Infinity) - (b.score != null ? b.score : Infinity));
    } else {
      entries.sort((a, b) => new Date(b.date) - new Date(a.date));
    }

    return entries;
  }

  function renderBrowse() {
    const j = getJournal(currentJournalId);
    const list = $('browse-list');

    // Sync active state on view mode buttons
    document.querySelectorAll('.view-mode-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.mode === browseMode);
    });

    if (!j || !j.entries || j.entries.length === 0) {
      list.innerHTML = '<div class="perso-browse-empty">' + i18n.t('perso.browse_empty') + '</div>';
      return;
    }

    const entries = getFilteredSortedEntries();

    list.innerHTML = '';
    if (!entries || entries.length === 0) {
      list.innerHTML = '<div class="perso-browse-empty">' + i18n.t('perso.browse_no_results') + '</div>';
      return;
    }

    if (browseMode === 'journal') return renderModeJournal(entries, list);
    if (browseMode === 'audio')   return renderModeAudio(entries, list);
    if (browseMode === 'score')   return renderModeScore(entries, list);
    renderModeAll(entries, list);
  }

  function renderModeAll(entries, list) {
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

      if (entry.score != null) {
        html += '<div class="perso-entry-score">' + i18n.t('perso.entry_score_label', { score: entry.score }) + '</div>';
      }

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

      html += '<div class="perso-entry-actions">' +
        '<button class="perso-entry-edit" data-entry-id="' + entry.id + '">' + i18n.t('common.edit') + '</button>' +
        '<button class="perso-entry-delete" data-entry-id="' + entry.id + '">' + i18n.t('common.delete') + '</button>' +
        '</div>';

      div.innerHTML = html;
      list.appendChild(div);
    });

    list.querySelectorAll('[data-lightbox]').forEach(img => {
      img.addEventListener('click', () => openLightbox(img.src));
    });
    list.querySelectorAll('.perso-entry-edit').forEach(btn => {
      btn.addEventListener('click', () => {
        const j2 = getJournal(currentJournalId);
        if (!j2) return;
        const entry = j2.entries.find(e => e.id === btn.dataset.entryId);
        if (entry) startEditEntry(entry);
      });
    });
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

  function renderModeJournal(entries, list) {
    const wrap = document.createElement('div');
    wrap.className = 'jmode-wrap';

    entries.forEach(entry => {
      const d = new Date(entry.date);
      const dateStr = d.toLocaleDateString(getLangLocale(), { day: 'numeric', month: 'short', year: 'numeric' });
      const weekday = d.toLocaleDateString(getLangLocale(), { weekday: 'long' });
      const text = entry.text || (entry.texts && entry.texts.length ? entry.texts.join('\n') : '');

      const div = document.createElement('div');
      div.className = 'jmode-entry';
      div.innerHTML =
        '<div class="jmode-margin">' +
          '<span class="jmode-weekday">' + esc(weekday) + '</span>' +
          '<span class="jmode-date">' + esc(dateStr) + '</span>' +
          (entry.title ? '<span class="jmode-title">' + esc(entry.title) + '</span>' : '') +
        '</div>' +
        '<div class="jmode-body">' +
          (text
            ? '<div class="jmode-text">' + linkify(esc(text)) + '</div>'
            : '<div class="jmode-no-text">—</div>') +
        '</div>';
      wrap.appendChild(div);
    });

    list.appendChild(wrap);
  }

  function renderModeAudio(entries, list) {
    const audioEntries = entries.filter(e => e.audios && e.audios.length > 0);
    if (audioEntries.length === 0) {
      list.innerHTML = '<div class="perso-browse-empty">' + i18n.t('perso.browse_no_audio') + '</div>';
      return;
    }

    const wrap = document.createElement('div');
    wrap.className = 'amode-wrap';

    audioEntries.forEach(entry => {
      const d = new Date(entry.date);
      const dateStr = d.toLocaleDateString(getLangLocale(), { day: 'numeric', month: 'short', year: 'numeric' });
      const weekday = d.toLocaleDateString(getLangLocale(), { weekday: 'long' });

      const div = document.createElement('div');
      div.className = 'amode-entry';

      let audiosHtml = '';
      entry.audios.forEach(src => {
        audiosHtml += '<audio controls src="' + src + '"></audio>';
      });

      div.innerHTML =
        '<div class="amode-margin">' +
          '<span class="amode-weekday">' + esc(weekday) + '</span>' +
          '<span class="amode-date">' + esc(dateStr) + '</span>' +
          (entry.title ? '<span class="amode-title">' + esc(entry.title) + '</span>' : '') +
        '</div>' +
        '<div class="amode-body">' + audiosHtml + '</div>';

      wrap.appendChild(div);
    });

    list.appendChild(wrap);

    // Chain autoplay: when one audio ends, play the next
    const allAudios = [...list.querySelectorAll('audio')];
    allAudios.forEach((audio, i) => {
      audio.addEventListener('ended', () => {
        if (i + 1 < allAudios.length) allAudios[i + 1].play();
      });
    });
  }

  function getScoreTooltip() {
    if (!_scoreTooltip) {
      _scoreTooltip = document.createElement('div');
      _scoreTooltip.className = 'score-hover-tooltip';
      document.body.appendChild(_scoreTooltip);
    }
    _scoreTooltip.style.display = 'none';
    return _scoreTooltip;
  }

  function renderModeScore(entries, list) {
    const scored = entries.filter(e => e.score != null);
    if (scored.length === 0) {
      list.innerHTML = '<div class="perso-browse-empty">' + i18n.t('perso.browse_no_score') + '</div>';
      return;
    }

    const W = 760, H = 320;
    const PAD = { t: 30, r: 30, b: 72, l: 52 };
    const CW = W - PAD.l - PAD.r;
    const CH = H - PAD.t - PAD.b;
    const n = scored.length;
    const uid = 'sc' + Math.random().toString(36).slice(2, 7);

    function xp(i) { return PAD.l + (n === 1 ? CW / 2 : (i / (n - 1)) * CW); }
    function yp(s) { return PAD.t + ((10 - s) / 20) * CH; }

    const y0 = yp(0);

    // Grid lines + Y labels
    let grid = '';
    [-10, -5, 0, 5, 10].forEach(v => {
      const y = yp(v);
      const cls = v === 0 ? 'score-grid score-zero-line' : 'score-grid';
      grid += '<line class="' + cls + '" x1="' + PAD.l + '" y1="' + y.toFixed(1) + '" x2="' + (W - PAD.r) + '" y2="' + y.toFixed(1) + '"/>';
      const lbl = (v > 0 ? '+' : '') + v;
      grid += '<text class="score-axis-label" x="' + (PAD.l - 8) + '" y="' + (y + 4).toFixed(1) + '" text-anchor="end">' + lbl + '</text>';
    });

    // Area fill path (closed polygon from zero line through data back to zero)
    let fillPath = '';
    if (n > 1) {
      let d = 'M' + xp(0).toFixed(1) + ',' + y0.toFixed(1);
      d += ' L' + xp(0).toFixed(1) + ',' + yp(scored[0].score).toFixed(1);
      for (let i = 1; i < n; i++) {
        d += ' L' + xp(i).toFixed(1) + ',' + yp(scored[i].score).toFixed(1);
      }
      d += ' L' + xp(n - 1).toFixed(1) + ',' + y0.toFixed(1) + ' Z';
      fillPath =
        '<defs>' +
          '<clipPath id="' + uid + '-pos"><rect x="' + PAD.l + '" y="' + PAD.t + '" width="' + CW + '" height="' + (y0 - PAD.t).toFixed(1) + '"/></clipPath>' +
          '<clipPath id="' + uid + '-neg"><rect x="' + PAD.l + '" y="' + y0.toFixed(1) + '" width="' + CW + '" height="' + (H - PAD.b - y0).toFixed(1) + '"/></clipPath>' +
        '</defs>' +
        '<path class="score-fill-pos" d="' + d + '" clip-path="url(#' + uid + '-pos)"/>' +
        '<path class="score-fill-neg" d="' + d + '" clip-path="url(#' + uid + '-neg)"/>';
    }

    // Line
    let line = '';
    if (n > 1) {
      let d = scored.map((e, i) => (i === 0 ? 'M' : 'L') + xp(i).toFixed(1) + ',' + yp(e.score).toFixed(1)).join(' ');
      line = '<path class="score-line" d="' + d + '" fill="none"/>';
    }

    // Dots + labels + date ticks
    let dots = '', xlabels = '';
    scored.forEach((e, i) => {
      const x = xp(i), y = yp(e.score);
      const cls = e.score > 0 ? 'pos' : e.score < 0 ? 'neg' : 'neu';
      const slbl = (e.score > 0 ? '+' : '') + e.score;
      const dateStr = new Date(e.date).toLocaleDateString(getLangLocale(), { day: '2-digit', month: 'short' });
      dots += '<circle class="score-dot score-dot-' + cls + '" cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="6" data-idx="' + i + '"></circle>';
      dots += '<text class="score-dot-label score-dot-label-' + cls + '" x="' + x.toFixed(1) + '" y="' + (y - 12).toFixed(1) + '" text-anchor="middle">' + slbl + '</text>';
      const lx = x.toFixed(1), ly = (H - PAD.b + 18).toFixed(1);
      xlabels += '<text class="score-date-label" x="' + lx + '" y="' + ly + '" text-anchor="end" transform="rotate(-45 ' + lx + ' ' + ly + ')">' + esc(dateStr) + '</text>';
    });

    const svg =
      '<svg class="score-chart-svg" viewBox="0 0 ' + W + ' ' + H + '" xmlns="http://www.w3.org/2000/svg">' +
        fillPath + grid + line + dots + xlabels +
      '</svg>';

    const wrap = document.createElement('div');
    wrap.className = 'score-chart-wrap';
    wrap.innerHTML = svg;
    list.appendChild(wrap);

    // Hover tooltip on each dot
    const tooltip = getScoreTooltip();
    const svgEl = wrap.querySelector('svg');

    wrap.querySelectorAll('circle.score-dot').forEach(circle => {
      const e = scored[parseInt(circle.dataset.idx, 10)];

      circle.addEventListener('mouseenter', evt => {
        const text = e.text || (e.texts && e.texts.length ? e.texts.join('\n') : '');
        const truncated = text.length > 320 ? text.slice(0, 320) + '…' : text;
        const dateStr = new Date(e.date).toLocaleDateString(getLangLocale(), {
          weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
        });
        const slbl = (e.score > 0 ? '+' : '') + e.score;

        let html = '';
        if (e.title) html += '<div class="stt-title">' + esc(e.title) + '</div>';
        html += '<div class="stt-meta">' + esc(dateStr) + ' &nbsp;·&nbsp; ' + slbl + '</div>';
        if (truncated) html += '<div class="stt-text">' + esc(truncated).replace(/\n/g, '<br>') + '</div>';

        tooltip.innerHTML = html;
        tooltip.style.display = 'block';

        // Position anchored to dot via SVG coordinate transform
        try {
          const cx = parseFloat(circle.getAttribute('cx'));
          const cy = parseFloat(circle.getAttribute('cy'));
          const svgPt = svgEl.createSVGPoint();
          svgPt.x = cx;
          svgPt.y = cy;
          const screen = svgPt.matrixTransform(svgEl.getScreenCTM());
          const tw = tooltip.offsetWidth || 270;
          const th = tooltip.offsetHeight || 80;
          const vw = window.innerWidth;
          let x = screen.x + 16;
          if (x + tw > vw - 8) x = screen.x - tw - 16;
          let y = screen.y - th - 14;
          if (y < 8) y = screen.y + 18;
          tooltip.style.left = x + 'px';
          tooltip.style.top = y + 'px';
        } catch (_) {
          tooltip.style.left = (evt.clientX + 14) + 'px';
          tooltip.style.top = Math.max(8, evt.clientY - 80) + 'px';
        }
      });

      circle.addEventListener('mouseleave', () => {
        tooltip.style.display = 'none';
      });
    });

    // Hide tooltip when leaving the chart area entirely
    wrap.addEventListener('mouseleave', () => {
      tooltip.style.display = 'none';
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

  // ---- Score filter UI ----
  function updateScoreFilterUI() {
    const mode = $('score-filter-mode').value;
    const g1 = $('score-filter-val1-group');
    const g2 = $('score-filter-val2-group');
    const gb = $('score-filter-buttons-group');
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
    ['filter-mode', 'score-filter-mode', 'sort-order'].forEach(selId => {
      const sel = $(selId);
      if (sel) {
        sel.querySelectorAll('option').forEach(opt => {
          const key = opt.dataset.i18n;
          if (key) opt.textContent = i18n.t(key);
        });
      }
    });
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
      if (!tab.dataset.view) return;
      tab.addEventListener('click', () => openTab(tab.dataset.view));
    });
    $('open-add-modal-btn').addEventListener('click', openAddModal);
    $('close-add-modal-btn').addEventListener('click', () => { resetAddForm(); closeAddModal(); });
    $('add-entry-modal').addEventListener('click', e => {
      if (e.target === $('add-entry-modal')) { resetAddForm(); closeAddModal(); }
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
    $('cancel-edit-btn').addEventListener('click', () => {
      resetAddForm();
      closeAddModal();
    });

    // Score toggle & slider
    if ($('score-toggle')) {
      $('score-toggle').addEventListener('change', () => {
        $('score-slider-row').classList.toggle('hidden', !$('score-toggle').checked);
      });
    }
    if ($('entry-score')) {
      $('entry-score').addEventListener('input', () => {
        $('entry-score-display').textContent = $('entry-score').value;
      });
    }

    // Date filter
    $('filter-mode').addEventListener('change', () => { updateFilterUI(); renderBrowse(); });
    $('filter-apply-btn').addEventListener('click', renderBrowse);
    $('filter-reset-btn').addEventListener('click', () => {
      $('filter-mode').value = 'all';
      $('filter-date1').value = '';
      $('filter-date2').value = '';
      updateFilterUI();
      renderBrowse();
    });

    // Score filter
    $('score-filter-mode').addEventListener('change', () => { updateScoreFilterUI(); renderBrowse(); });
    $('score-filter-apply-btn').addEventListener('click', renderBrowse);
    $('score-filter-reset-btn').addEventListener('click', () => {
      $('score-filter-mode').value = 'all';
      $('score-filter-val1').value = '0';
      $('score-filter-val2').value = '10';
      updateScoreFilterUI();
      renderBrowse();
    });

    // Sort order
    $('sort-order').addEventListener('change', renderBrowse);

    // View mode buttons
    document.querySelectorAll('.view-mode-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        browseMode = btn.dataset.mode;
        renderBrowse();
      });
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
