// ============ INDEX PAGE ============
// Common logic (lang, theme, date, constants) is in js/common.js

const _langReady = initLanguage();
initTheme();
setTodayDate();

// ============ PLANNING CARD: current activity widget ============
(function updatePlanningCard(){
  const STORAGE_KEY = 'vital_plannings';
  const MAIN_KEY = 'vital_main_planning';

  function run(){
    const descEl = document.querySelector('[data-i18n="index.card_planning_desc"]');
    if(!descEl) return;

    const plannings = VitalStore.get(STORAGE_KEY, []);
    if(!Array.isArray(plannings) || plannings.length === 0){ resetLabel(descEl); return; }

    let mainIdx = null;
    if(plannings.length === 1){ mainIdx = 0; }
    else {
      const v = parseInt(VitalStore.getRaw(MAIN_KEY));
      if(v >= 0 && v < plannings.length) mainIdx = v;
    }
    if(mainIdx === null){ resetLabel(descEl); return; }

    const p = plannings[mainIdx];
    if(!p || !p.activities){ resetLabel(descEl); return; }

    const now = new Date();
    const jsDay = now.getDay();
    const dayIdx = jsDay === 0 ? 6 : jsDay - 1;
    const hour = now.getHours();
    const min = now.getMinutes();
    const slot = hour * 4 + Math.floor(min / 15);

    // Get weeks (compat with old single-week plannings)
    const weeks = (p.weeks && p.weeks.length) ? p.weeks : [{ grid: p.grid, sleepConfig: p.sleepConfig }];
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const dayOfYear = Math.floor((now - startOfYear) / 86400000) + 1;
    const isoWeek = Math.ceil((dayOfYear + startOfYear.getDay()) / 7);
    const weekIdx = weeks.length > 1 ? (isoWeek - 1) % weeks.length : 0;
    const grid = weeks[weekIdx].grid;
    if(!grid){ resetLabel(descEl); return; }

    const isQuarter = grid.length === 96;
    const ai = isQuarter ? grid[slot][dayIdx] : grid[hour][dayIdx];
    const act = (ai !== null && ai !== undefined) ? p.activities[ai] : null;

    if(!act){ resetLabel(descEl); return; }

    // Find end of current activity block
    let endLabel = '';
    let nextAct = null;
    if(isQuarter){
      let endSlot = slot;
      while(endSlot < 96 && grid[endSlot][dayIdx] === ai) endSlot++;
      if(endSlot < 96){
        const eH = Math.floor(endSlot / 4);
        const eM = (endSlot % 4) * 15;
        endLabel = String(eH).padStart(2,'0') + ':' + String(eM).padStart(2,'0');
        // Next activity
        const nai = grid[endSlot][dayIdx];
        if(nai !== null && nai !== undefined) nextAct = p.activities[nai];
      }
    }

    const actLabel = i18n.t('index.planning_activity_label') || 'Activité en cours :';
    const untilLabel = i18n.t('index.planning_until_label') || "Jusqu'à";
    const nextLabel = i18n.t('index.planning_next_label') || 'Ensuite :';

    const untilHtml = endLabel ? '<span class="idx-now-until">' + untilLabel + ' ' + endLabel + '</span>' : '';
    const nextHtml = nextAct ? '<span class="idx-now-next"><span class="idx-now-dot" style="background:' + nextAct.color + '"></span>' + nextLabel + ' ' + nextAct.title + '</span>' : '';

    descEl.innerHTML =
      '<div class="idx-now-widget">' +
        '<div class="idx-now-body">' +
          '<span class="idx-now-dot" style="background:' + act.color + '"></span>' +
          '<span class="idx-now-act-label">' + actLabel + '</span>' +
          '<span class="idx-now-act-name">' + act.title + '</span>' +
          untilHtml +
        '</div>' +
        (nextAct ? '<div class="idx-now-body">' + nextHtml + '</div>' : '') +
      '</div>';
    descEl.removeAttribute('data-i18n');
  }

  function resetLabel(el){
    const txt = i18n.t('index.card_planning_desc');
    if(txt) el.textContent = txt;
    el.setAttribute('data-i18n', 'index.card_planning_desc');
  }

  _langReady.then(()=>{ run(); });
  setInterval(run, 60000);
})();
