// ============ PLANNING PAGE ============
// Common logic (lang, theme, date, constants) is in js/common.js

let _oldPresetTitles = [];

_beforeLangSwitch = function(lang) {
  // Capture old preset titles before loading new language
  _oldPresetTitles = getAllPresetActivities().map(p => p.title);
};

_onLangApplied = function(lang) {
  renderList();
  // Re-render creation view if currently open
  if (!viewCreate.classList.contains('hidden') && currentEdit) {
    // Re-translate preset activity titles in currentEdit
    const newPresets = getAllPresetActivities();
    currentEdit.activities.forEach(a => {
      const idx = _oldPresetTitles.indexOf(a.title);
      if (idx !== -1 && newPresets[idx]) {
        a.title = newPresets[idx].title;
        a.desc = newPresets[idx].desc;
      }
    });
    buildFullPage();
  }
  // Re-render read-only view if currently open
  if (!viewShow.classList.contains('hidden') && currentShowIdx !== null) {
    openPlanning(currentShowIdx);
  }
  // Update date
  setTodayDate();
};

initLanguage();
initTheme();
setTodayDate();

// ============ DONNÉES ============
const STORAGE_KEY = 'vital_plannings';
const MAIN_KEY = 'vital_main_planning';
function getDays() { return i18n.t('planning.days') || ['Lun','Mar','Mer','Jeu','Ven','Sam','Dim']; }
const SLOTS = 96;

const ACTIVITY_COLORS = [
  '#2c3e50','#e74c3c','#3498db','#2ecc71','#f39c12','#9b59b6',
  '#1abc9c','#e67e22','#34495e','#d35400','#16a085','#c0392b',
  '#8e44ad','#27ae60','#2980b9','#f1c40f','#7f8c8d','#e84393',
  '#00b894','#6c5ce7','#fd79a8','#a29bfe'
];

function getAllPresetActivities() {
  const presets = i18n.t('planning.activities_preset');
  if (presets && typeof presets === 'object') {
    return Object.entries(presets).map(([title, v]) => ({title, desc: v.desc || ''}));
  }
  return [
    {title:'Repas', desc:'Petit-déjeuner, déjeuner ou dîner'},
    {title:'Transport', desc:'Trajet domicile-travail'},
    {title:'Ménage', desc:'Tâches ménagères'},
    {title:'Courses', desc:'Faire les courses'},
    {title:'Vie sociale', desc:'Amis, famille, sorties'},
    {title:'Soins personnels', desc:'Douche, routine, bien-être'},
    {title:'Sieste', desc:'Repos en journée'},
    {title:'Travail', desc:'Heures de travail ou bureau'},
    {title:'Sport', desc:'Activité physique'},
    {title:'Études', desc:'Cours, révisions, devoirs'},
    {title:'Méditation', desc:'Méditation ou relaxation'},
    {title:'Lecture', desc:'Lire un livre ou des articles'},
    {title:'Loisirs créatifs', desc:'Dessin, musique, écriture...'},
    {title:'Écrans / Détente', desc:'Jeux vidéo, séries, réseaux sociaux'},
    {title:'Promenade', desc:'Marche, balade en extérieur'},
  ];
}
function getDefaultActivities() { return getAllPresetActivities().slice(0, 7); }
function getPresetActivities() { return getAllPresetActivities(); }

function getSleepActivity() { return {title: i18n.t('planning.sleep_activity_title') || 'Sommeil', desc: i18n.t('planning.sleep_activity_desc') || 'Repos nocturne', color:'#2c3e50'}; }
function getFreeActivity() { return {title: i18n.t('planning.free_activity_title') || 'Temps Libre', desc: i18n.t('planning.free_activity_desc') || 'Plage non attribuée', color:'#bdc3c7'}; }
const SLEEP_DURATIONS = ['6h','6h30','7h','7h30','8h','8h30','9h','9h30','10h','10h30','11h','12h'];

// ============ STATE ============
let plannings = [];
let currentEdit = null;
let currentBrush = 0;
let isMouseDown = false;
let currentShowIdx = null;

function loadPlannings(){plannings=VitalStore.get(STORAGE_KEY,[]); if(!Array.isArray(plannings)) plannings=[];}
function savePlannings(){VitalStore.set(STORAGE_KEY,plannings);}

function getMainPlanning(){
  if(plannings.length===0) return null;
  if(plannings.length===1) return 0;
  const v=parseInt(VitalStore.getRaw(MAIN_KEY)); return (v>=0&&v<plannings.length)?v:null;
}
function setMainPlanning(idx){
  if(idx===null||idx===undefined) VitalStore.remove(MAIN_KEY); else VitalStore.setRaw(MAIN_KEY,String(idx));
}

// ============ VIEWS ============
const viewList = document.getElementById('view-list');
const viewCreate = document.getElementById('view-create');
const viewShow = document.getElementById('view-show');

function showView(id){
  [viewList,viewCreate,viewShow].forEach(v=>v.classList.add('hidden'));
  document.getElementById(id).classList.remove('hidden');
  window.scrollTo(0,0);
}

// ============ LIST VIEW ============
function renderList(){
  const el = document.getElementById('plannings-list');
  if(plannings.length===0){
    el.innerHTML=`<p style="font-family:var(--sans), sans-serif;font-size:14px;color:var(--ink-mute);text-align:center;padding:20px 0;">${i18n.t('planning.empty_list')}</p>`;
    return;
  }
  const mainIdx = getMainPlanning();
  el.innerHTML = plannings.map((p,i)=>`
    <div class="plan-card${i===mainIdx?' is-main':''}" data-idx="${i}">
      <label class="plan-card-main" title="${i18n.t('planning.main_planning_title')}">
        <input type="checkbox" class="main-check" data-idx="${i}" ${i===mainIdx?'checked':''}>
        <span class="plan-card-main-label">${i18n.t('planning.main_planning_label')}</span>
      </label>
      <div>
        <div class="plan-card-name">${esc(p.name)}</div>
        ${p.desc?`<div class="plan-card-desc">${esc(p.desc)}</div>`:''}
      </div>
      <div class="journal-card-actions">
        ${plannings.length > 1 ? `<span class="journal-card-reorder">
          <button class="btn-move" data-action="move-up" data-idx="${i}" title="${i18n.t('common.move_up')}"${i === 0 ? ' disabled' : ''}>▲</button>
          <button class="btn-move" data-action="move-down" data-idx="${i}" title="${i18n.t('common.move_down')}"${i === plannings.length - 1 ? ' disabled' : ''}>▼</button>
        </span>` : ''}
        <button class="btn-export-pdf" data-idx="${i}" title="${i18n.t('planning.btn_export_pdf_title')}">${i18n.t('planning.btn_export_pdf')}</button>
        <button class="btn-export-json" data-idx="${i}" title="${i18n.t('common.export')}">${i18n.t('common.export')}</button>
        <button class="btn-del" data-idx="${i}" title="${i18n.t('common.delete')}">${i18n.t('common.delete')}</button>
      </div>
    </div>
  `).join('');

  el.querySelectorAll('.main-check').forEach(cb=>cb.addEventListener('change',e=>{
    e.stopPropagation();
    const idx = +cb.dataset.idx;
    if(cb.checked){ setMainPlanning(idx); } else { setMainPlanning(null); }
    renderList();
  }));
  el.querySelectorAll('.main-check').forEach(cb=>cb.addEventListener('click',e=>e.stopPropagation()));
  el.querySelectorAll('.btn-del').forEach(b=>b.addEventListener('click',e=>{
    e.stopPropagation();
    const idx = +b.dataset.idx;
    if(confirm(i18n.t('planning.confirm_delete'))){
      const oldMain = getMainPlanning();
      plannings.splice(idx,1);
      if(oldMain===idx) setMainPlanning(null);
      else if(oldMain!==null && oldMain>idx) setMainPlanning(oldMain-1);
      savePlannings();renderList();
    }
  }));
  el.querySelectorAll('.btn-export-json').forEach(b=>b.addEventListener('click',e=>{
    e.stopPropagation();
    exportPlanningJSON(+b.dataset.idx);
  }));
  el.querySelectorAll('.btn-export-pdf').forEach(b=>b.addEventListener('click',e=>{
    e.stopPropagation();
    exportPlanningPDF(+b.dataset.idx);
  }));
  el.querySelectorAll('[data-action="move-up"]').forEach(b=>b.addEventListener('click',e=>{
    e.stopPropagation();
    const idx = +b.dataset.idx;
    const mainIdx = getMainPlanning();
    if (VitalStore.moveItem(plannings, idx, -1)) {
      if (mainIdx === idx) setMainPlanning(idx - 1);
      else if (mainIdx === idx - 1) setMainPlanning(idx);
      savePlannings(); renderList();
    }
  }));
  el.querySelectorAll('[data-action="move-down"]').forEach(b=>b.addEventListener('click',e=>{
    e.stopPropagation();
    const idx = +b.dataset.idx;
    const mainIdx = getMainPlanning();
    if (VitalStore.moveItem(plannings, idx, 1)) {
      if (mainIdx === idx) setMainPlanning(idx + 1);
      else if (mainIdx === idx + 1) setMainPlanning(idx);
      savePlannings(); renderList();
    }
  }));
  el.querySelectorAll('.plan-card').forEach(c=>c.addEventListener('click',()=>{
    openPlanning(+c.dataset.idx);
  }));
}

function esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}

// ============ OPEN PLANNING (read-only) ============
function openPlanning(idx){
  const p = plannings[idx];
  if(!p) return;
  currentShowIdx = idx;
  document.getElementById('show-plan-name').textContent = p.name;
  document.getElementById('show-plan-desc').textContent = p.desc||'';

  const legendEl = document.getElementById('show-legend');
  legendEl.innerHTML = p.activities.map(a=>`
    <div class="legend-item"><span class="legend-dot" style="background:${a.color}"></span>${esc(a.title)}</div>
  `).join('');

  const gridEl = document.getElementById('show-grid');
  let html = '<div class="vwg-header"></div>';
  getDays().forEach(d=>{html+=`<div class="vwg-header" style="grid-column:span 4">${d}</div>`;});

  const isQuarter = p.grid.length === 96;
  for(let h=0;h<24;h++){
    html+=`<div class="vwg-hour">${String(h).padStart(2,'0')}h</div>`;
    for(let d=0;d<7;d++){
      if(isQuarter){
        for(let q=0;q<4;q++){
          const s = h*4+q;
          const ai = p.grid[s][d];
          const act = ai!==null&&ai!==undefined ? p.activities[ai] : null;
          const isLast = q===3 ? ' qtr-last' : '';
          const qMin = q*15;
          const timeLabel = `${String(h).padStart(2,'0')}:${String(qMin).padStart(2,'0')}`;
          if(act){
            const txt = q===0 ? esc(act.title) : '';
            html+=`<div class="vwg-cell${isLast}" style="background:${act.color}" title="${timeLabel} — ${esc(act.title)}">${txt}</div>`;
          } else {
            html+=`<div class="vwg-cell empty${isLast}"></div>`;
          }
        }
      } else {
        const ai = p.grid[h][d];
        const act = ai!==null&&ai!==undefined ? p.activities[ai] : null;
        if(act){
          html+=`<div class="vwg-cell qtr-last" style="background:${act.color};grid-column:span 4" title="${esc(act.title)}">${esc(act.title)}</div>`;
        } else {
          html+=`<div class="vwg-cell empty qtr-last" style="grid-column:span 4"></div>`;
        }
      }
    }
  }
  gridEl.innerHTML = html;
  showView('view-show');
}

// ============ CREATE / EDIT ============
let colorIdx = 0;

function startNewPlanning(){
  currentEdit = {
    name:'',
    desc:'',
    sleepConfig: getDays().map(()=>({bedtime:'23:00', duration:'8h'})),
    activities:[...getDefaultActivities().map((p,i)=>({...p, color:ACTIVITY_COLORS[i%ACTIVITY_COLORS.length]}))],
    grid: Array.from({length:96},()=>Array(7).fill(null))
  };
  colorIdx = getDefaultActivities().length;
  document.getElementById('plan-name').value='';
  document.getElementById('plan-desc').value='';
  document.getElementById('err-save-palette').textContent='';
  document.getElementById('err-activities').textContent='';
  showView('view-create');
  buildFullPage();
}

function buildFullPage(){
  buildSleepWidget();
  buildGrid();
  renderActivities();
  buildBrushSelector();
}

// ============ SLEEP ============
function parseDuration(str){
  const m = str.match(/(\d+)h(\d+)?/);
  if(!m) return 32;
  const hours = parseInt(m[1]);
  const mins = m[2] ? parseInt(m[2]) : 0;
  return hours*4 + Math.round(mins/15);
}

function computeSleepSlots(){
  // Le sommeil "du jour d" représente la nuit qui SUIT le jour d (ex: "Lundi" = nuit lundi -> mardi).
  // - Si bedtime >= 12:00 : on se couche le soir du jour d -> sommeil démarre sur d, déborde sur (d+1)
  // - Si bedtime <  12:00 : on s'endort après minuit -> sommeil démarre directement sur (d+1)
  const slots = [];
  for(let d=0;d<7;d++){
    const sc = currentEdit.sleepConfig[d];
    const [hh,mm] = sc.bedtime.split(':').map(Number);
    const startSlot = hh*4 + Math.floor(mm/15);
    const dur = parseDuration(sc.duration);

    // Jour de DÉPART réel du coucher
    const startDay = (hh < 12) ? (d + 1) % 7 : d;

    for(let i=0;i<dur;i++){
      const absSlot = startSlot + i;
      const slot = absSlot % 96;
      const day = (absSlot >= 96) ? (startDay + 1) % 7 : startDay;
      slots.push({day, slot});
    }
  }
  return slots;
}

function generateBedtimeOptions(selected){
  // Ordre: 12h00 -> 23h45 (heures du soir), puis 00h00 -> 11h45 (heures du matin)
  // Reflète le déroulement réel d'une nuit (on traverse minuit visuellement).
  let opts = '';
  const hours = [];
  for(let h=12;h<24;h++) hours.push(h);
  for(let h=0;h<12;h++) hours.push(h);
  for(const h of hours){
    for(let m=0;m<60;m+=15){
      const val = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
      const label = `${String(h).padStart(2,'0')}h${String(m).padStart(2,'0')}`;
      opts += `<option value="${val}"${val===selected?' selected':''}>${label}</option>`;
    }
  }
  return opts;
}

function readSleepFromInputs(){
  document.querySelectorAll('.sleep-bedtime').forEach(sel=>{
    currentEdit.sleepConfig[+sel.dataset.day].bedtime = sel.value;
  });
  document.querySelectorAll('.sleep-duration').forEach(sel=>{
    currentEdit.sleepConfig[+sel.dataset.day].duration = sel.value;
  });
}

function onSleepChange(){
  readSleepFromInputs();
  // Clear sleep markers, recompute
  for(let s=0;s<96;s++) for(let d=0;d<7;d++){
    if(currentEdit.grid[s][d]==='sleep') currentEdit.grid[s][d]=null;
  }
  const sleepSlots = computeSleepSlots();
  currentEdit._sleepSet = new Set(sleepSlots.map(x=>x.slot+','+x.day));
  for(const {day,slot} of sleepSlots){
    currentEdit.grid[slot][day]='sleep';
  }
  buildSleepWidget();
  buildGrid();
}

// ============ SLEEP WIDGET BUILDER ============
function buildSleepWidget(){
  const el = document.getElementById('sleep-widget');
  let html = `<div class="sleep-widget">`;
  html += `<div class="sleep-widget-title">${i18n.t('planning.sleep_widget_title')}</div>`;
  html += `<div class="sleep-grid">`;
  for(let d=0;d<7;d++){
    const sc = currentEdit.sleepConfig[d];
    html += `<div class="sleep-day">`;
    html += `<div class="sleep-day-label">${getDays()[d]}</div>`;
    html += `<span class="sleep-field-label">${i18n.t('planning.sleep_bedtime_label')}</span>`;
    html += `<select class="sleep-bedtime" data-day="${d}">${generateBedtimeOptions(sc.bedtime)}</select>`;
    html += `<span class="sleep-field-label">${i18n.t('planning.sleep_duration_label')}</span>`;
    html += `<select class="sleep-duration" data-day="${d}">${SLEEP_DURATIONS.map(dur=>`<option value="${dur}"${dur===sc.duration?' selected':''}>${dur}</option>`).join('')}</select>`;
    html += `</div>`;
  }
  html += `</div></div>`;
  el.innerHTML = html;

  el.querySelectorAll('.sleep-bedtime, .sleep-duration').forEach(inp=>{
    inp.addEventListener('change', onSleepChange);
  });
}

// ============ GRID BUILDER ============
function buildGrid(){
  const gridEl = document.getElementById('week-grid');
  const sleepSlots = computeSleepSlots();
  currentEdit._sleepSet = new Set(sleepSlots.map(x=>x.slot+','+x.day));
  // Mark sleep in grid
  for(let s=0;s<96;s++) for(let d=0;d<7;d++){
    if(currentEdit._sleepSet.has(s+','+d)) currentEdit.grid[s][d]='sleep';
    else if(currentEdit.grid[s][d]==='sleep') currentEdit.grid[s][d]=null;
  }

  let html = '<div class="week-columns">';
  for(let d=0;d<7;d++){
    html += `<div class="day-col-wrap">`;
    html += `<div class="day-col-header">${getDays()[d]}</div>`;
    html += `<div class="day-col-cells">`;
    for(let s=0;s<96;s++){
      const h = Math.floor(s/4);
      const q = s%4;
      const qMin = q*15;
      const timeStr = `${String(h).padStart(2,'0')}:${String(qMin).padStart(2,'0')}`;
      const isSleep = currentEdit._sleepSet.has(s+','+d);
      const ai = currentEdit.grid[s][d];
      const act = (ai!==null && ai!=='sleep') ? currentEdit.activities[ai] : null;
      const hourStart = q===0 ? ' hour-start' : '';
      let cellClass = 'wg-cell' + hourStart;
      let bg = '';
      let content = '';
      if(isSleep){
        cellClass += ' sleep-cell';
        if(q===0) content = `<span class="wg-time-label">${String(h).padStart(2,'0')}h</span>`;
      } else if(act){
        bg = `background:${act.color}`;
      } else {
        cellClass += ' empty';
        if(q===0) content = `<span class="wg-time-label">${String(h).padStart(2,'0')}h</span>`;
      }
      html += `<div class="${cellClass}" data-s="${s}" data-d="${d}" style="${bg}" title="${timeStr}">${content}</div>`;
    }
    html += `</div></div>`;
  }
  html += '</div>';
  gridEl.innerHTML = html;

  updateAllLabels();

  // Mouse events for painting
  gridEl.querySelectorAll('.wg-cell:not(.sleep-cell)').forEach(cell=>{
    cell.addEventListener('mousedown',e=>{e.preventDefault();isMouseDown=true;paintCell(cell);});
    cell.addEventListener('mouseenter',()=>{if(isMouseDown)paintCell(cell);});
    cell.addEventListener('touchstart',e=>{e.preventDefault();paintCell(cell);},{passive:false});
    cell.addEventListener('touchmove',e=>{
      e.preventDefault();
      const touch = e.touches[0];
      const el = document.elementFromPoint(touch.clientX, touch.clientY);
      if(el&&el.classList.contains('wg-cell')&&!el.classList.contains('sleep-cell'))paintCell(el);
    },{passive:false});
  });
}

function updateAllLabels(){
  for(let d=0;d<7;d++){
    let prevAct = null;
    for(let s=0;s<96;s++){
      const cell = document.querySelector(`.wg-cell[data-s="${s}"][data-d="${d}"]`);
      if(!cell) continue;
      if(cell.classList.contains('sleep-cell')){ prevAct=null; continue; }
      const ai = currentEdit.grid[s][d];
      const act = (ai!==null && ai!=='sleep') ? currentEdit.activities[ai] : null;
      const h = Math.floor(s/4), q = s%4;
      const tl = q===0 ? `<span class="wg-time-label">${String(h).padStart(2,'0')}h</span>` : '';
      if(act){
        if(ai !== prevAct){
          cell.innerHTML = tl + `<span class="wg-act-label">${esc(act.title)}</span>`;
        } else {
          cell.innerHTML = tl;
        }
        prevAct = ai;
      } else {
        cell.innerHTML = q===0 ? tl : '';
        prevAct = null;
      }
    }
  }
}

document.addEventListener('mouseup',()=>{isMouseDown=false;});

function isSleepSlot(s, d){
  return currentEdit._sleepSet && currentEdit._sleepSet.has(s+','+d);
}

function paintCell(cell){
  const s = +cell.dataset.s;
  const d = +cell.dataset.d;
  if(currentBrush===null) return;
  if(isSleepSlot(s,d)) return;
  const actIdx = currentBrush;
  const act = currentEdit.activities[actIdx];
  if(currentEdit.grid[s][d]==='sleep') return;
  if(currentEdit.grid[s][d] === actIdx){
    currentEdit.grid[s][d] = null;
    cell.style.background = '';
    cell.classList.add('empty');
  } else {
    currentEdit.grid[s][d] = actIdx;
    cell.style.background = act.color;
    cell.classList.remove('empty');
  }
  updateDayLabels(d);
}

function updateDayLabels(d){
  let prevAct = null;
  for(let s=0;s<96;s++){
    const cell = document.querySelector(`.wg-cell[data-s="${s}"][data-d="${d}"]`);
    if(!cell) continue;
    if(cell.classList.contains('sleep-cell')){ prevAct=null; continue; }
    const ai = currentEdit.grid[s][d];
    const act = (ai!==null && ai!=='sleep') ? currentEdit.activities[ai] : null;
    const h = Math.floor(s/4), q = s%4;
    const tl = q===0 ? `<span class="wg-time-label">${String(h).padStart(2,'0')}h</span>` : '';
    if(act){
      if(ai !== prevAct){
        cell.innerHTML = tl + `<span class="wg-act-label">${esc(act.title)}</span>`;
      } else {
        cell.innerHTML = tl;
      }
      prevAct = ai;
    } else {
      cell.innerHTML = q===0 ? tl : '';
      prevAct = null;
    }
  }
}

// ============ BRUSH SELECTOR ============
function buildBrushSelector(){
  const el = document.getElementById('brush-selector');
  let html = '';
  currentEdit.activities.forEach((a,i)=>{
    html+=`<button class="brush-btn${i===0?' active':''}" data-idx="${i}" style="background:${a.color}">${esc(a.title)}</button>`;
  });
  el.innerHTML = html;
  currentBrush = 0;

  el.querySelectorAll('.brush-btn').forEach(b=>b.addEventListener('click',()=>{
    currentBrush = +b.dataset.idx;
    el.querySelectorAll('.brush-btn').forEach(x=>x.classList.remove('active'));
    b.classList.add('active');
  }));
}

// ============ ACTIVITIES ============
function renderActivities(){
  const el = document.getElementById('act-list');
  el.innerHTML = currentEdit.activities.map((a,i)=>`
    <div class="act-item">
      <span class="act-color" style="background:${a.color}"></span>
      <span class="act-title">${esc(a.title)}</span>
      <button class="act-remove" data-idx="${i}" title="${i18n.t('common.delete')}">✕</button>
    </div>
  `).join('');
  el.querySelectorAll('.act-remove').forEach(b=>b.addEventListener('click',()=>{
    const idx = +b.dataset.idx;
    for(let s=0;s<96;s++) for(let d=0;d<7;d++){
      if(currentEdit.grid[s][d]===idx) currentEdit.grid[s][d]=null;
      else if(currentEdit.grid[s][d]>idx && currentEdit.grid[s][d]!=='sleep') currentEdit.grid[s][d]--;
    }
    currentEdit.activities.splice(idx,1);
    if(currentBrush >= currentEdit.activities.length) currentBrush = Math.max(0, currentEdit.activities.length-1);
    renderActivities();
    buildBrushSelector();
    buildGrid();
  }));

  const sel = document.getElementById('act-preset-select');
  const existing = new Set(currentEdit.activities.map(a=>a.title));
  sel.innerHTML = `<option value="">${esc(i18n.t('planning.activities_common_placeholder'))}</option>` +
    getPresetActivities().filter(p=>!existing.has(p.title)).map((p,i)=>`<option value="${i}">${esc(p.title)}</option>`).join('');
}

function addActivity(title, desc){
  if(!title.trim()) return;
  if(currentEdit.activities.some(a=>a.title.toLowerCase()===title.trim().toLowerCase())){
    document.getElementById('err-activities').textContent=i18n.t('planning.error_activity_exists');
    return;
  }
  document.getElementById('err-activities').textContent='';
  const c = ACTIVITY_COLORS[colorIdx % ACTIVITY_COLORS.length];
  colorIdx++;
  currentEdit.activities.push({title:title.trim(), desc:desc.trim()||'', color:c});
  renderActivities();
  buildBrushSelector();
}

function addPresetFromSelect(){
  const sel = document.getElementById('act-preset-select');
  const filtered = getPresetActivities().filter(p=>!new Set(currentEdit.activities.map(a=>a.title)).has(p.title));
  const idx = +sel.value;
  if(isNaN(idx)||!filtered[idx]) return;
  addActivity(filtered[idx].title, filtered[idx].desc);
}

document.getElementById('act-preset-select').addEventListener('change', addPresetFromSelect);

document.getElementById('btn-add-custom').addEventListener('click',()=>{
  const t = document.getElementById('act-custom-title');
  const d = document.getElementById('act-custom-desc');
  if(!t.value.trim()){document.getElementById('err-activities').textContent=i18n.t('planning.error_title_required');return;}
  addActivity(t.value, d.value);
  t.value=''; d.value='';
});

// ============ SAVE ============
function savePlanning(){
  const name = document.getElementById('plan-name').value.trim();
  if(!name){
    document.getElementById('err-save-palette').textContent=i18n.t('planning.error_name_required');
    return;
  }
  if(currentEdit.activities.length<1){
    document.getElementById('err-save-palette').textContent=i18n.t('planning.error_activity_required');
    return;
  }
  document.getElementById('err-save-palette').textContent='';

  readSleepFromInputs();
  currentEdit.name = name;
  currentEdit.desc = document.getElementById('plan-desc').value.trim();

  // Add sleep as activity for storage
  const sleepIdx = currentEdit.activities.length;
  currentEdit.activities.push({...getSleepActivity()});

  // Convert 'sleep' markers to sleepIdx
  for(let s=0;s<96;s++) for(let d=0;d<7;d++){
    if(currentEdit.grid[s][d]==='sleep') currentEdit.grid[s][d]=sleepIdx;
  }

  // Fill empty slots with "Temps Libre"
  const freeTitle = getFreeActivity().title;
  let freeIdx = currentEdit.activities.findIndex(a=>a.title===freeTitle);
  if(freeIdx<0){
    currentEdit.activities.push({...getFreeActivity()});
    freeIdx = currentEdit.activities.length-1;
  }
  for(let s=0;s<96;s++) for(let d=0;d<7;d++){
    if(currentEdit.grid[s][d]===null) currentEdit.grid[s][d]=freeIdx;
  }

  plannings.push({
    name: currentEdit.name,
    desc: currentEdit.desc,
    activities: currentEdit.activities,
    grid: currentEdit.grid,
    sleepConfig: currentEdit.sleepConfig,
    created: new Date().toISOString()
  });
  savePlannings();
  currentEdit = null;
  showView('view-list');
  renderList();
}

document.getElementById('btn-save-planning-palette').addEventListener('click', savePlanning);

// ============ EXPORT JSON ============
function exportPlanningJSON(idx) {
  const p = plannings[idx];
  VitalStore.exportJSON(p, 'Planning_' + p.name.replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '_') + '.json');
}

// ============ EXPORT PDF ============
function exportPlanningPDF(idx) {
  const p = plannings[idx];
  const DAYS_SHORT = getDays();
  function escHtml(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

  const legend = p.activities.map(a=>
    `<div class="leg-item"><span class="leg-dot" style="background:${a.color}"></span><span>${escHtml(a.title)}</span></div>`
  ).join('');

  let tableRows = '';
  for(let h=0;h<24;h++){
    for(let q=0;q<4;q++){
      const s = h*4+q;
      const timeLabel = q===0 ? `${String(h).padStart(2,'0')}h` : '';
      let cells = `<td class="tc">${timeLabel}</td>`;
      for(let d=0;d<7;d++){
        const ai = p.grid[s][d];
        const act = (ai!==null&&ai!==undefined) ? p.activities[ai] : null;
        cells += `<td class="dc" style="background:${act?act.color:'#eeeeee'}"></td>`;
      }
      tableRows += `<tr${q===0?' class="hs"':''}>${cells}</tr>`;
    }
  }

  const html = `<!DOCTYPE html>
<html lang="fr"><head><meta charset="UTF-8"><title>${escHtml(p.name)}</title>
<style>
  @page{size:A4 portrait;margin:12mm}
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:-apple-system,Arial,sans-serif;font-size:11px;color:#222}
  h1{font-size:17px;font-weight:500;margin-bottom:3px;letter-spacing:-.01em}
  .desc{font-size:11px;color:#777;font-style:italic;margin-bottom:8px}
  .legend{display:flex;flex-wrap:wrap;gap:5px 12px;margin-bottom:10px;padding-bottom:8px;border-bottom:1px solid #ddd}
  .leg-item{display:inline-flex;align-items:center;gap:4px;font-size:10px;color:#333}
  .leg-dot{width:9px;height:9px;border-radius:50%;flex-shrink:0}
  table{border-collapse:collapse;width:100%;table-layout:fixed}
  thead th{padding:4px 2px;font-size:10px;font-weight:600;text-align:center;border-bottom:2px solid #aaa;background:#f8f8f8}
  th.tc-head{width:26px}
  td.tc{width:26px;padding:0 4px 0 0;font-size:8px;color:#999;text-align:right;vertical-align:top;border-right:1px solid #ddd;line-height:5px}
  td.dc{height:5px;border-right:1px solid rgba(255,255,255,.25)}
  tr.hs td{border-top:1px solid #ccc}
  tr.hs td.tc{font-size:9px;color:#555}
</style></head><body>
  <h1>${escHtml(p.name)}</h1>
  ${p.desc?`<p class="desc">${escHtml(p.desc)}</p>`:''}
  <div class="legend">${legend}</div>
  <table>
    <thead><tr><th class="tc-head"></th>${DAYS_SHORT.map(d=>`<th>${d}</th>`).join('')}</tr></thead>
    <tbody>${tableRows}</tbody>
  </table>
</body></html>`;

  const win = window.open('','_blank','width=820,height=700');
  if(!win){ alert(i18n.t('planning.alert_popup_blocked')); return; }
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(()=>{ win.print(); }, 400);
}

// ============ IMPORT JSON ============
document.getElementById('btn-import-planning').addEventListener('click',()=>{
  document.getElementById('import-file-input').click();
});
document.getElementById('import-file-input').addEventListener('change',function(e){
  const file = e.target.files[0];
  if(!file) return;
  VitalStore.importJSON(file).then(data => {
    if(!data.name||!Array.isArray(data.activities)||!Array.isArray(data.grid)){
      alert(i18n.t('planning.alert_json_invalid'));
      return;
    }
    plannings.push(data);
    savePlannings();
    renderList();
  }).catch(() => {
    alert(i18n.t('planning.alert_json_error'));
  });
  e.target.value='';
});

// ============ NAVIGATION ============
document.getElementById('btn-new-planning').addEventListener('click', startNewPlanning);
document.getElementById('btn-back-list').addEventListener('click',()=>{showView('view-list');renderList();});
document.getElementById('btn-back-list2').addEventListener('click',()=>{showView('view-list');renderList();});

// ============ INIT ============
loadPlannings();
renderList();
