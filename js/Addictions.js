  // ============ LOCALISATION & THEME ============
  // Common logic (lang, theme, date, constants) is in js/Common.js

  _onLangApplied = function() {
    if (typeof render === 'function') render();
  };

  const i18nReady = initLanguage();
  initTheme();

  // ============ DATA MODEL ============

  // ============ UNIT TYPES ============
  // Chaque type définit comment on saisit, affiche, et gère la conso.
  // - decimals : nbre de décimales d'affichage
  // - step : incrément des inputs
  // - integerOnly : si true, force l'arrondi à l'entier (compteur)
  // - format(value) : retourne une string lisible "12 g" / "1h30" / "3 fois"
  // - shortFormat(value) : version courte pour les tableaux/cartes
  const UNIT_TYPES = {
    grams: {
      id: 'grams',
      get name()             { return i18n.t('addiction.unit_types.grams.name'); },
      get hint()             { return i18n.t('addiction.unit_types.grams.hint'); },
      shortSuffix: 'g',
      get perDay()           { return i18n.t('addiction.unit_types.grams.perDay'); },
      decimals: 2,
      step: 0.1,
      configStep: 0.1,
      configEndStep: 0.05,
      integerOnly: false,
      get todayLabel()       { return i18n.t('addiction.unit_types.grams.todayLabel'); },
      get configStartLabel() { return i18n.t('addiction.unit_types.grams.configStartLabel'); },
      get configStartHint()  { return i18n.t('addiction.unit_types.grams.configStartHint'); },
      get configEndLabel()   { return i18n.t('addiction.unit_types.grams.configEndLabel'); },
      get configEndHint()    { return i18n.t('addiction.unit_types.grams.configEndHint'); },
      defaultStart: 5,
      defaultEnd: 0,
      tolerance: 0.01,
      format(v) { return `${this.shortFormat(v)} g`; },
      shortFormat(v) {
        if (v === null || v === undefined || v === '') return '—';
        const n = parseFloat(v);
        if (isNaN(n)) return '—';
        // strip trailing zeros mais max 2 décimales
        return (Math.round(n * 100) / 100).toString();
      }
    },
    deciliters: {
      id: 'deciliters',
      get name()             { return i18n.t('addiction.unit_types.deciliters.name'); },
      get hint()             { return i18n.t('addiction.unit_types.deciliters.hint'); },
      shortSuffix: 'dl',
      get perDay()           { return i18n.t('addiction.unit_types.deciliters.perDay'); },
      decimals: 1,
      step: 0.5,
      configStep: 0.5,
      configEndStep: 0.5,
      integerOnly: false,
      get todayLabel()       { return i18n.t('addiction.unit_types.deciliters.todayLabel'); },
      get configStartLabel() { return i18n.t('addiction.unit_types.deciliters.configStartLabel'); },
      get configStartHint()  { return i18n.t('addiction.unit_types.deciliters.configStartHint'); },
      get configEndLabel()   { return i18n.t('addiction.unit_types.deciliters.configEndLabel'); },
      get configEndHint()    { return i18n.t('addiction.unit_types.deciliters.configEndHint'); },
      defaultStart: 10,
      defaultEnd: 0,
      tolerance: 0.05,
      format(v) { return `${this.shortFormat(v)} dl`; },
      shortFormat(v) {
        if (v === null || v === undefined || v === '') return '—';
        const n = parseFloat(v);
        if (isNaN(n)) return '—';
        return (Math.round(n * 10) / 10).toString();
      }
    },
    minutes: {
      id: 'minutes',
      get name()             { return i18n.t('addiction.unit_types.minutes.name'); },
      get hint()             { return i18n.t('addiction.unit_types.minutes.hint'); },
      shortSuffix: 'min',
      get perDay()           { return i18n.t('addiction.unit_types.minutes.perDay'); },
      decimals: 0,
      step: 5,
      configStep: 15,
      configEndStep: 5,
      integerOnly: true,
      get todayLabel()       { return i18n.t('addiction.unit_types.minutes.todayLabel'); },
      get configStartLabel() { return i18n.t('addiction.unit_types.minutes.configStartLabel'); },
      get configStartHint()  { return i18n.t('addiction.unit_types.minutes.configStartHint'); },
      get configEndLabel()   { return i18n.t('addiction.unit_types.minutes.configEndLabel'); },
      get configEndHint()    { return i18n.t('addiction.unit_types.minutes.configEndHint'); },
      defaultStart: 240, // 4h
      defaultEnd: 0,
      tolerance: 0.5,
      format(v) {
        if (v === null || v === undefined || v === '') return '—';
        const n = Math.round(parseFloat(v));
        if (isNaN(n)) return '—';
        if (n < 60) return `${n} min`;
        const h = Math.floor(n / 60);
        const m = n % 60;
        return m === 0 ? `${h}h` : `${h}h${String(m).padStart(2,'0')}`;
      },
      shortFormat(v) {
        if (v === null || v === undefined || v === '') return '—';
        const n = Math.round(parseFloat(v));
        if (isNaN(n)) return '—';
        if (n < 60) return `${n}min`;
        const h = Math.floor(n / 60);
        const m = n % 60;
        return m === 0 ? `${h}h` : `${h}h${String(m).padStart(2,'0')}`;
      }
    },
    occurrences: {
      id: 'occurrences',
      get name()             { return i18n.t('addiction.unit_types.occurrences.name'); },
      get hint()             { return i18n.t('addiction.unit_types.occurrences.hint'); },
      shortSuffix: 'fois',
      get perDay()           { return i18n.t('addiction.unit_types.occurrences.perDay'); },
      decimals: 0,
      step: 1,
      configStep: 1,
      configEndStep: 1,
      integerOnly: true,
      get todayLabel()       { return i18n.t('addiction.unit_types.occurrences.todayLabel'); },
      get configStartLabel() { return i18n.t('addiction.unit_types.occurrences.configStartLabel'); },
      get configStartHint()  { return i18n.t('addiction.unit_types.occurrences.configStartHint'); },
      get configEndLabel()   { return i18n.t('addiction.unit_types.occurrences.configEndLabel'); },
      get configEndHint()    { return i18n.t('addiction.unit_types.occurrences.configEndHint'); },
      defaultStart: 20,
      defaultEnd: 0,
      tolerance: 0.5,
      format(v) {
        if (v === null || v === undefined || v === '') return '—';
        const n = Math.round(parseFloat(v));
        if (isNaN(n)) return '—';
        return n === 1 ? '1 fois' : `${n} fois`;
      },
      shortFormat(v) {
        if (v === null || v === undefined || v === '') return '—';
        const n = Math.round(parseFloat(v));
        if (isNaN(n)) return '—';
        return n.toString();
      }
    },
    milliliters: {
      id: 'milliliters',
      get name()             { return i18n.t('addiction.unit_types.milliliters.name'); },
      get hint()             { return i18n.t('addiction.unit_types.milliliters.hint'); },
      shortSuffix: 'ml',
      get perDay()           { return i18n.t('addiction.unit_types.milliliters.perDay'); },
      decimals: 0,
      step: 5,
      configStep: 10,
      configEndStep: 5,
      integerOnly: true,
      get todayLabel()       { return i18n.t('addiction.unit_types.milliliters.todayLabel'); },
      get configStartLabel() { return i18n.t('addiction.unit_types.milliliters.configStartLabel'); },
      get configStartHint()  { return i18n.t('addiction.unit_types.milliliters.configStartHint'); },
      get configEndLabel()   { return i18n.t('addiction.unit_types.milliliters.configEndLabel'); },
      get configEndHint()    { return i18n.t('addiction.unit_types.milliliters.configEndHint'); },
      defaultStart: 200,
      defaultEnd: 0,
      tolerance: 0.5,
      format(v) {
        if (v === null || v === undefined || v === '') return '—';
        const n = Math.round(parseFloat(v));
        if (isNaN(n)) return '—';
        return `${n} ml`;
      },
      shortFormat(v) {
        if (v === null || v === undefined || v === '') return '—';
        const n = Math.round(parseFloat(v));
        if (isNaN(n)) return '—';
        return n.toString();
      }
    },
    money: {
      id: 'money',
      get name()             { return i18n.t('addiction.unit_types.money.name'); },
      get hint()             { return i18n.t('addiction.unit_types.money.hint'); },
      shortSuffix: '¤',
      get perDay()           { return i18n.t('addiction.unit_types.money.perDay'); },
      decimals: 0,
      step: 5,
      configStep: 10,
      configEndStep: 5,
      integerOnly: true,
      get todayLabel()       { return i18n.t('addiction.unit_types.money.todayLabel'); },
      get configStartLabel() { return i18n.t('addiction.unit_types.money.configStartLabel'); },
      get configStartHint()  { return i18n.t('addiction.unit_types.money.configStartHint'); },
      get configEndLabel()   { return i18n.t('addiction.unit_types.money.configEndLabel'); },
      get configEndHint()    { return i18n.t('addiction.unit_types.money.configEndHint'); },
      defaultStart: 50,
      defaultEnd: 0,
      tolerance: 0.5,
      format(v) {
        if (v === null || v === undefined || v === '') return '—';
        const n = Math.round(parseFloat(v));
        if (isNaN(n)) return '—';
        return `${n} ¤`;
      },
      shortFormat(v) {
        if (v === null || v === undefined || v === '') return '—';
        const n = Math.round(parseFloat(v));
        if (isNaN(n)) return '—';
        return n.toString();
      }
    }
  };

  function getUnit() {
    // Défensif : appelé tôt (avant que `state` soit déclaré) lors de l'init du module
    let id = 'grams';
    try {
      if (typeof state !== 'undefined' && state && state.unitType) id = state.unitType;
    } catch (e) {
      // TDZ : state pas encore déclaré, on garde 'grams'
    }
    return UNIT_TYPES[id] || UNIT_TYPES.grams;
  }

  // ============ DATA MODEL (suite) ============
  // Configuration par défaut si non spécifiée
  const DEFAULT_TOTAL_WEEKS = 8;
  const DEFAULT_CURVE = 'standard';
  const MIN_WEEKS = 1;
  const MAX_WEEKS = 52;

  // Heure de changement de jour pour le journal (0-23).
  // Avant cette heure, on considère qu'on est encore « la veille  ».
  // Ex : 6 = le jour change à 06h00 (les consos de nuit restent sur le jour précédent).
  const DAY_BOUNDARY_HOUR = 6;

  // ============ COURBES DE PROGRESSION ============
  // Chaque courbe est une fonction qui prend (totalWeeks) et renvoie un tableau
  // de ratios de longueur totalWeeks. Le ratio représente la fraction de
  // (startDose - endDose) qui reste APRÀ S la semaine.
  // ratios[0] = part de la "distance" qui reste en fin de semaine 1 (proche de 1 = peu enlevé)
  // ratios[totalWeeks-1] = part qui reste à la dernière semaine avant phase libre (proche de 0 = presque fini)
  //
  // Pour simplifier on raisonne sur des positions normalisées x â   [0, 1] :
  //   x = i / totalWeeks pour le palier i (1-indexé : i = 1..totalWeeks)
  // Et on définit f(x) qui descend de 1 vers 0.

  const CURVES = {
    linear: {
      id: 'linear',
      get name()    { return i18n.t('addiction.curves.linear.name'); },
      get tagline() { return i18n.t('addiction.curves.linear.tagline'); },
      get hint()    { return i18n.t('addiction.curves.linear.hint'); },
      fn: (i, N) => 1 - (i / N)
    },
    soft: {
      id: 'soft',
      get name()    { return i18n.t('addiction.curves.soft.name'); },
      get tagline() { return i18n.t('addiction.curves.soft.tagline'); },
      get hint()    { return i18n.t('addiction.curves.soft.hint'); },
      fn: (i, N) => 1 - Math.pow(i / N, 2)
    },
    standard: {
      id: 'standard',
      get name()    { return i18n.t('addiction.curves.standard.name'); },
      get tagline() { return i18n.t('addiction.curves.standard.tagline'); },
      get hint()    { return i18n.t('addiction.curves.standard.hint'); },
      fn: (i, N) => {
        const x = i / N;
        const k = 8;
        const raw = 1 / (1 + Math.exp(k * (x - 0.5)));
        // Normalisation pour que f(0)=1 et f(1)=0
        const f0 = 1 / (1 + Math.exp(k * (-0.5)));
        const f1 = 1 / (1 + Math.exp(k * (0.5)));
        return (raw - f1) / (f0 - f1);
      }
    },
    aggressive: {
      id: 'aggressive',
      get name()    { return i18n.t('addiction.curves.aggressive.name'); },
      get tagline() { return i18n.t('addiction.curves.aggressive.tagline'); },
      get hint()    { return i18n.t('addiction.curves.aggressive.hint'); },
      fn: (i, N) => Math.pow(1 - (i / N), 2)
    }
  };

  // Génère les ratios pour une courbe donnée et un nombre de semaines
  // Évalue une courbe à la semaine `i` (1-indexée) sur un plan de `totalWeeks` semaines.
  // SÉMANTIQUE : la courbe va de "presque 1" (semaine 1) à "presque 0" (semaine N),
  // sans jamais atteindre exactement 0 avant la phase libre. La phase libre = palier N+1
  // est gérée séparément dans buildPaliers et impose la dose finale (typiquement 0).
  //
  // Astuce d'implémentation : on évalue f(i, N+1) au lieu de f(i, N), ce qui décale
  // la convergence vers 0 d'un cran. Résultat :
  //   - semaine 1 : ratio …  proche de 1 (peu enlevé)
  //   - semaine N : ratio > 0 (palier le plus bas, mais PAS encore zéro)
  //   - phase libre : forcé à endDose dans buildPaliers
  function curveRatio(i, totalWeeks, curveId) {
    const curve = CURVES[curveId] || CURVES[DEFAULT_CURVE];
    let r = curve.fn(i, totalWeeks + 1);
    return Math.max(0, Math.min(1, r));
  }

  function generateRatios(totalWeeks, curveId) {
    const ratios = [];
    for (let i = 1; i <= totalWeeks; i++) {
      ratios.push(curveRatio(i, totalWeeks, curveId));
    }
    return ratios;
  }

  // Note générique pour une semaine — adaptée à la position dans le plan
  function roundDose(d) {
    const u = getUnit();
    if (u.integerOnly) {
      return Math.max(0, Math.round(d));
    }
    if (u.id === 'deciliters') {
      // Arrondi à 0.5 dl
      return Math.round(d * 2) / 2;
    }
    // grammes : arrondi à 0.05
    return Math.round(d * 20) / 20;
  }

  // Construit les paliers : N paliers de descente + 1 palier "phase libre" final
  // totalWeeks et curveId sont optionnels (fallback aux valeurs du state)
  function buildPaliers(startDose, endDose, totalWeeks, curveId) {
    const N = totalWeeks || (state && state.totalWeeks) || DEFAULT_TOTAL_WEEKS;
    const cId = curveId || (state && state.curveType) || DEFAULT_CURVE;
    const range = startDose - endDose;
    const ratios = generateRatios(N, cId);

    const paliers = [];
    for (let i = 0; i < N; i++) {
      const week = i + 1;
      paliers.push({
        week,
        phase: 1,
        dose: roundDose(endDose + range * ratios[i]),
        progression: Math.round(ratios[i] * 100)
      });
    }

    // Phase libre finale (week = N+1)
    const finalDose = roundDose(endDose);
    paliers.push({
      week: N + 1,
      phase: 3,
      dose: finalDose,
      progression: 0
    });
    return paliers;
  }

  // Valeurs par défaut (avant configuration utilisateur)
  let PALIERS = buildPaliers(5, 0, DEFAULT_TOTAL_WEEKS, DEFAULT_CURVE);

  // ============ ABSTINENCE — milestones ============
  // Paliers symboliques pour le mode abstinence. Ils ne se "débloquent" pas :
  // ils se franchissent automatiquement quand le compteur de jours grandit.
  // Chaque milestone porte un seuil en jours et une étiquette humaine.
  // Au-delà du dernier seuil, on génère des paliers annuels (1 an, 2 ans, 3 ans...).
  function getAbstainMilestones() {
    const raw = i18n.t('addiction.abstain_milestones');
    if (Array.isArray(raw) && raw.length > 0) return raw;
    // Fallback inline si i18n pas encore chargé
    return [
      { days: 1,    label: '24 heures',  short: '24h',    gender: 'f', note: 'Le premier jour. Souvent le plus difficile.' },
      { days: 3,    label: '72 heures',  short: '72h',    gender: 'f', note: 'Pic du manque physique pour beaucoup d\'addictions. Ça redescend après.' },
      { days: 7,    label: '7 jours',    short: '7j',     gender: 'm', note: 'Première semaine. Le corps commence à se réguler.' },
      { days: 14,   label: '14 jours',   short: '14j',    gender: 'm', note: 'Deux semaines. Le sommeil revient souvent à ce stade.' },
      { days: 30,   label: '30 jours',   short: '30j',    gender: 'm', note: 'Premier mois. Un seuil net — l\'envie reflue, des marges reviennent.' },
      { days: 60,   label: '60 jours',   short: '60j',    gender: 'm', note: 'Deuxième mois. Les nouveaux automatismes prennent place.' },
      { days: 90,   label: '90 jours',   short: '90j',    gender: 'm', note: 'Trois mois. Beaucoup de littérature parle d\'une stabilisation neuro à ce seuil.' },
      { days: 180,  label: '6 mois',     short: '6 mois', gender: 'm', note: 'Six mois. Le cerveau a eu le temps de se réorganiser durablement.' },
      { days: 365,  label: '1 an',       short: '1 an',   gender: 'm', note: 'Un an. C\'est un nouveau territoire.' }
    ];
  }
  const ABSTAIN_MILESTONES = null; // remplacé par getAbstainMilestones()

  // Génère les milestones jusqu'à un certain nombre de jours (au moins quelques uns au-delà du current).
  // Au-delà de 365j, on ajoute des paliers annuels (2 ans, 3 ans, etc.)
  function getMilestones(currentDays) {
    const all = [...getAbstainMilestones()];
    // Ajoute autant de paliers annuels que nécessaire pour couvrir current + au moins 1 palier de plus.
    const minTopDays = Math.max(365 * 2, currentDays + 365);
    let years = 2;
    while (years * 365 <= minTopDays) {
      all.push({
        days: years * 365,
        label: i18n.t('addiction.milestone_years_label', {n: years}),
        short: i18n.t('addiction.milestone_years_label', {n: years}),
        gender: 'm',
        note: i18n.t('addiction.milestone_years_note', {n: years})
      });
      years++;
    }
    return all;
  }

  // Renvoie le prochain milestone non encore atteint, ou null si tous sont franchis (très improbable).
  function nextMilestone(currentDays) {
    const milestones = getMilestones(currentDays);
    return milestones.find(m => m.days > currentDays) || null;
  }

  // Renvoie le dernier milestone franchi, ou null si aucun.
  function lastMilestoneReached(currentDays) {
    const milestones = getMilestones(currentDays);
    let last = null;
    for (const m of milestones) {
      if (m.days <= currentDays) last = m;
      else break;
    }
    return last;
  }

  // ============ ABSTINENCE — calcul du streak ============
  // Renvoie le nombre de jours du streak en cours.
  // Calcul : days between currentStreakStart et today, inclusif (le jour de départ compte comme jour 1
  // si on est encore dans la même journée).
  // Edge case : si currentStreakStart est null, on retourne 0.
  // Edge case : si currentStreakStart > today (shouldn't happen mais sécurité), retourne 0.
  function currentStreakDays() {
    if (!state.currentStreakStart) return 0;
    const today = todayISO();
    const diff = daysBetween(state.currentStreakStart, today);
    if (diff < 0) return 0;
    // Le jour de départ compte comme "jour 1" : on a tenu 1 jour le jour même où on a démarré.
    return diff + 1;
  }

  // Renvoie le record (meilleur streak passé), ou 0 s'il n'y en a pas.
  function bestStreakDays() {
    if (!Array.isArray(state.streakHistory) || state.streakHistory.length === 0) return 0;
    return state.streakHistory.reduce((max, s) => Math.max(max, s.days || 0), 0);
  }

  // Format humain : 0 → "0 jour", 1 → "1 jour", 30 → "30 jours", 60 → "2 mois (60j)", 365 → "1 an (365j)"
  function formatStreakDays(days) {
    if (days <= 1) return `${days} jour`;
    if (days < 30) return `${days} jours`;
    if (days < 365) {
      const months = Math.floor(days / 30);
      return `${days} jours <small>· ${months} mois</small>`;
    }
    const years = Math.floor(days / 365);
    const remDays = days - (years * 365);
    if (remDays === 0) return `${days} jours <small>· ${years} ${years === 1 ? 'an' : 'ans'}</small>`;
    return `${days} jours <small>· ${years} ${years === 1 ? 'an' : 'ans'} et ${remDays} j</small>`;
  }

  // Marque le jour comme "tenu". Crée le streak si pas encore démarré.
  // Idempotent : si déjà marqué tenu aujourd'hui, ne fait rien (renvoie false).
  // Renvoie true si une modif a eu lieu.
  function markTodayHeld() {
    const today = todayISO();
    const existing = state.logs[today];
    if (existing && existing.kind === 'held') return false;

    // Si c'est le tout premier log et qu'aucun streak n'est démarré, on initialise le streak à aujourd'hui
    if (!state.currentStreakStart) {
      state.currentStreakStart = today;
    }

    state.logs[today] = {
      kind: 'held',
      note: existing && existing.note ? existing.note : '',
      savedAt: new Date().toISOString()
    };
    state.palierStartDate = today;
    return true;
  }

  // Marque le jour comme "rechute". Termine le streak en cours (l'archive si > 0 jour),
  // remet le compteur à zéro. Le compteur ne redémarre pas automatiquement : il faudra
  // que l'utilisateur marque demain "journée tenue" pour repartir.
  // Idempotent : si déjà marqué rechute aujourd'hui, met à jour la note seulement.
  function markTodayRelapse(note) {
    const today = todayISO();
    const existing = state.logs[today];

    // Si déjà rechute aujourd'hui, on met à jour la note seulement (pas de double-archivage)
    if (existing && existing.kind === 'relapse') {
      state.logs[today] = {
        kind: 'relapse',
        note: note || '',
        savedAt: new Date().toISOString()
      };
      return false;
    }

    // Archiver le streak en cours (s'il existe et a au moins 1 jour)
    if (state.currentStreakStart) {
      // Le dernier jour "tenu" est celui d'avant aujourd'hui (puisqu'aujourd'hui est rechute).
      // Mais si on rechute le jour même où on a démarré le streak, days = 1 et endDate = startDate.
      // On n'archive un streak que s'il a fait au moins 1 jour entier passé (i.e. days >= 2 OU le streak a démarré avant aujourd'hui).
      // Simplification : on archive toujours si days > 0 ; si rechute le jour 1 même, on enregistre quand même 0 jour tenu.
      // Calcul propre du nombre de jours réellement tenus avant aujourd'hui :
      const heldBeforeToday = daysBetween(state.currentStreakStart, today); // 0 si rechute jour 1
      if (heldBeforeToday > 0) {
        state.streakHistory.push({
          startDate: state.currentStreakStart,
          endDate: dateAddDays(today, -1),
          days: heldBeforeToday,
          relapseNote: note || ''
        });
      }
    }

    state.currentStreakStart = null;
    state.logs[today] = {
      kind: 'relapse',
      note: note || '',
      savedAt: new Date().toISOString()
    };
    state.palierStartDate = today;
    return true;
  }

  // ============ MULTI-JOURNAUX ============
  // Modèle de stockage :
  //  - 'vital_journals_index' : [{ id, name, createdAt }]
  //  - 'vital_journal_<id>'   : state du journal (started, unitType, ..., logs)
  //  - 'vital_active_journal' : id du journal actif (mémoire UX)
  const INDEX_KEY = 'vital_journals_index';
  const ACTIVE_KEY = 'vital_active_journal';

  function journalStorageKey(id) {
    return 'vital_journal_' + id;
  }

  function newJournalId() {
    return VitalStore.newId('j_');
  }

  function loadJournalsIndex() {
    return VitalStore.loadIndex(INDEX_KEY);
  }

  function saveJournalsIndex(index) {
    return VitalStore.saveIndex(INDEX_KEY, index);
  }

  // ID du journal actuellement ouvert. null = aucun (on est sur la page d'accueil).
  let activeJournalId = null;

  // state shape (par journal) :
  // Mode 'taper' (descente) : { started, journalMode, unitType, startDose, endDose, totalWeeks, curveType, currentWeek, palierStartDate, logs, ... }
  // Mode 'abstain' (abstinence) : { started, journalMode, unitType, currentStreakStart, streakHistory[], logs }
  //   - currentStreakStart : ISO date (YYYY-MM-DD) du jour où le streak en cours a commencé. null si pas encore démarré.
  //   - streakHistory : tableau de streaks passés, chacun { startDate, endDate, days, relapseNote }
  //   - logs : { 'YYYY-MM-DD': { kind: 'held'|'relapse', note, savedAt } }
  let state = {
    started: false,
    journalMode: 'taper',
    unitType: 'grams',
    startDose: 5,
    endDose: 0,
    totalWeeks: DEFAULT_TOTAL_WEEKS,
    curveType: DEFAULT_CURVE,
    currentWeek: 1,
    palierStartDate: null,
    logs: {},
    // Champs spécifiques abstinence
    abstainLabel: '',
    currentStreakStart: null,
    streakHistory: []
  };

  let currentNote = '';
  let currentDose = '';
  let currentTitle = '';
  let currentNotes = [];  // tableau de { text, time } — multi-notes texte
  let currentDoses = [];  // tableau de { value, time } — multi-doses
  let currentAudios = []; // tableau de data-URLs base64 (audio/webm ou audio/ogg)
  let mediaRecorder = null;
  let mediaStream = null;
  let isRecording = false;
  let timerInterval = null;
  let timerSeconds = 600;
  let timerRunning = false;

  // ============ VOCAL NOTE — helpers ============

  function blobToDataURL(blob) {
    return VitalStore.blobToDataURL(blob);
  }

  function stopRecording() {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
    }
    if (mediaStream) {
      mediaStream.getTracks().forEach(t => t.stop());
      mediaStream = null;
    }
    isRecording = false;
  }

  async function toggleRecording(mode) {
    // mode = 'taper' ou 'abstain'
    const btn = document.getElementById('vocal-rec-btn-' + mode);
    const statusEl = document.getElementById('vocal-status-' + mode);

    if (isRecording) {
      // Stop
      stopRecording();
      if (btn) { btn.textContent = i18n.t('addiction.btn_record'); btn.classList.remove('recording'); }
      if (statusEl) statusEl.textContent = '';
      return;
    }

    // Start
    try {
      mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      if (statusEl) statusEl.textContent = i18n.t('addiction.vocal_mic_refused');
      return;
    }

    const chunks = [];
    const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus'
      : (MediaRecorder.isTypeSupported('audio/ogg;codecs=opus') ? 'audio/ogg;codecs=opus' : '');
    mediaRecorder = mimeType ? new MediaRecorder(mediaStream, { mimeType }) : new MediaRecorder(mediaStream);

    mediaRecorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };
    mediaRecorder.onstop = async () => {
      const blob = new Blob(chunks, { type: mediaRecorder.mimeType });
      const dataUrl = await blobToDataURL(blob);
      currentAudios.push(dataUrl);
      renderVocalList(mode);
    };

    mediaRecorder.start();
    isRecording = true;
    if (btn) { btn.textContent = i18n.t('addiction.btn_stop'); btn.classList.add('recording'); }
    if (statusEl) statusEl.textContent = i18n.t('addiction.vocal_recording');
  }

  function renderVocalList(mode) {
    const container = document.getElementById('vocal-list-' + mode);
    if (!container) return;
    if (currentAudios.length === 0) { container.innerHTML = ''; return; }
    let html = '';
    currentAudios.forEach((dataUrl, idx) => {
      html += `<div class="vocal-item">
        <audio controls src="${dataUrl}" preload="metadata"></audio>
        <button type="button" class="vocal-remove" data-vocal-idx="${idx}" title="Supprimer">✕</button>
      </div>`;
    });
    container.innerHTML = html;
    container.querySelectorAll('.vocal-remove').forEach(btn => {
      btn.addEventListener('click', () => {
        const i = parseInt(btn.dataset.vocalIdx, 10);
        currentAudios.splice(i, 1);
        renderVocalList(mode);
      });
    });
  }

  // ============ MULTI-DOSES — helpers ============

  function renderDoseList() {
    const container = document.getElementById('dose-list-taper');
    const totalRow = document.getElementById('dose-total-row');
    const totalVal = document.getElementById('dose-total-value');
    if (!container) return;
    if (currentDoses.length === 0) {
      container.innerHTML = '';
      if (totalRow) totalRow.classList.add('hidden');
      return;
    }
    const u = getUnit();
    let html = '';
    currentDoses.forEach((entry, idx) => {
      const timeStr = entry.time ? new Date(entry.time).toLocaleTimeString('fr-FR', {hour:'2-digit', minute:'2-digit'}) : '';
      html += `<div class="dose-list-item">
        <span class="dose-list-item-value">${u.format(entry.value)}</span>
        <span class="dose-list-item-time">${timeStr}</span>
        <button type="button" class="dose-remove" data-dose-idx="${idx}" title="Supprimer">✕</button>
      </div>`;
    });
    container.innerHTML = html;
    container.querySelectorAll('.dose-remove').forEach(btn => {
      btn.addEventListener('click', () => {
        const i = parseInt(btn.dataset.doseIdx, 10);
        currentDoses.splice(i, 1);
        renderDoseList();
        renderHero();
      });
    });
    // Total
    const total = currentDoses.reduce((s, d) => s + d.value, 0);
    if (totalRow) {
      totalRow.classList.remove('hidden');
      if (totalVal) totalVal.textContent = u.format(total);
    }
  }

  function getDoseTotal() {
    return currentDoses.reduce((s, d) => s + d.value, 0);
  }

  // ============ MULTI-NOTES TEXTE — helpers ============

  function renderTextNoteList(mode) {
    const container = document.getElementById('text-note-list-' + mode);
    if (!container) return;
    if (currentNotes.length === 0) { container.innerHTML = ''; return; }
    let html = '';
    currentNotes.forEach((entry, idx) => {
      const timeStr = entry.time ? new Date(entry.time).toLocaleTimeString('fr-FR', {hour:'2-digit', minute:'2-digit'}) : '';
      html += `<div class="text-note-item">
        <div class="text-note-item-body">
          <div class="text-note-item-text">${escapeHtml(entry.text)}</div>
          <div class="text-note-item-time">${timeStr}</div>
        </div>
        <button type="button" class="text-note-remove" data-note-idx="${idx}" title="Supprimer">✕</button>
      </div>`;
    });
    container.innerHTML = html;
    container.querySelectorAll('.text-note-remove').forEach(btn => {
      btn.addEventListener('click', () => {
        const i = parseInt(btn.dataset.noteIdx, 10);
        currentNotes.splice(i, 1);
        renderTextNoteList(mode);
      });
    });
  }

  function renderAudiosHtml(audios) {
    if (!Array.isArray(audios) || audios.length === 0) return '';
    let html = '<div class="history-audios">';
    audios.forEach(src => {
      html += `<audio controls src="${src}" preload="metadata"></audio>`;
    });
    html += '</div>';
    return html;
  }

  // Flag debug : activé si l'URL contient ?debug=1
  // Affiche une rangée de boutons fast-forward dans la status bar (cf. renderDebugBar)
  const DEBUG_MODE = (() => {
    try {
      const params = new URLSearchParams(window.location.search);
      return params.get('debug') === '1';
    } catch (e) { return false; }
  })();

  // Renvoie un objet Date décalé de DAY_BOUNDARY_HOUR heures.
  // Avant DAY_BOUNDARY_HOUR le matin, on est encore « hier  » pour le journal.
  function effectiveNow() {
    const d = new Date();
    d.setHours(d.getHours() - DAY_BOUNDARY_HOUR);
    return d;
  }

  function todayISO() {
    // Date locale (pas UTC) — sinon décalage en fonction du fuseau horaire
    // Décalée de DAY_BOUNDARY_HOUR pour que le jour change à cette heure.
    const d = effectiveNow();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  function formatDateFR(iso) {
    const d = new Date(iso + 'T00:00:00');
    return d.toLocaleDateString('fr-FR', { weekday:'short', day:'numeric', month:'short' });
  }

  function formatDateNumeric(iso) {
    const d = new Date(iso + 'T00:00:00');
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  }

  function formatDateLong() {
    const d = effectiveNow();
    const loc = getLangLocale();
    return d.toLocaleDateString(loc, { weekday:'long', day:'numeric', month:'long', year:'numeric' });
  }

  function daysBetween(iso1, iso2) {
    const d1 = new Date(iso1 + 'T00:00:00');
    const d2 = new Date(iso2 + 'T00:00:00');
    return Math.floor((d2 - d1) / (1000 * 60 * 60 * 24));
  }

  function dateAddDays(iso, n) {
    const d = new Date(iso + 'T00:00:00');
    d.setDate(d.getDate() + n);
    // Reconstruction en local (pas via toISOString, qui convertit en UTC
    // et peut faire perdre/gagner un jour selon le fuseau horaire)
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  // ============ STORAGE (localStorage) ============
  // loadState : charge le state du journal actif (par son ID).
  // saveState : sauve le state du journal actif.
  // Si activeJournalId est null, ces fonctions sont des no-ops sécurisées.
  function defaultState() {
    return {
      started: false,
      journalMode: 'taper',
      unitType: 'grams',
      startDose: 5,
      endDose: 0,
      totalWeeks: DEFAULT_TOTAL_WEEKS,
      curveType: DEFAULT_CURVE,
      currentWeek: 1,
      palierStartDate: null,
      logs: {},
      // Raisons
      reasons: [],
      // Règles
      rules: [],
      // Champs spécifiques abstinence
      abstainLabel: '',
      currentStreakStart: null,
      streakHistory: []
    };
  }

  function loadState() {
    if (!activeJournalId) {
      state = defaultState();
      PALIERS = buildPaliers(state.startDose, state.endDose, state.totalWeeks, state.curveType);
      return;
    }
    state = VitalStore.loadItem(journalStorageKey(activeJournalId), defaultState());
    PALIERS = buildPaliers(state.startDose, state.endDose, state.totalWeeks, state.curveType);
  }

  function saveState() {
    if (!activeJournalId) return false;
    return VitalStore.saveItem(journalStorageKey(activeJournalId), state);
  }

  // ============ MULTI-JOURNAUX — opérations ============
  function getJournalById(id) {
    return loadJournalsIndex().find(j => j.id === id) || null;
  }

  function createJournal(name) {
    const trimmed = (name || '').trim() || i18n.t('addiction.journal_unnamed');
    const id = newJournalId();
    const journal = {
      id,
      name: trimmed,
      createdAt: new Date().toISOString()
    };
    const index = loadJournalsIndex();
    index.push(journal);
    saveJournalsIndex(index);
    // Ne sauve pas encore de state — il sera créé au moment où l'utilisateur clique "Commencer"
    return journal;
  }

  function deleteJournal(id) {
    const index = loadJournalsIndex().filter(j => j.id !== id);
    saveJournalsIndex(index);
    VitalStore.removeItem(journalStorageKey(id));
    if (VitalStore.getRaw(ACTIVE_KEY) === id) {
      VitalStore.remove(ACTIVE_KEY);
    }
  }

  function openJournal(id) {
    activeJournalId = id;
    VitalStore.setRaw(ACTIVE_KEY, id);
    loadState();
    render();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function goHome() {
    activeJournalId = null;
    VitalStore.remove(ACTIVE_KEY);
    // Reset l'onglet actif sur "Aujourd'hui" pour la prochaine ouverture
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    const todayTab = document.querySelector('.tab[data-view="today"]');
    if (todayTab) todayTab.classList.add('active');
    ['today','overview','history','reasons','rules','quit'].forEach(v => {
      const el = document.getElementById('view-' + v);
      if (el) el.classList.toggle('hidden', v !== 'today');
    });
    loadState();
    render();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Donne un aperçu rapide d'un journal pour la home (sans toucher à `state`)
  function getJournalPreview(id) {
    try {
      const s = VitalStore.get(journalStorageKey(id));
      if (!s) return { started: false };
      const unitId = (s.unitType && UNIT_TYPES[s.unitType]) ? s.unitType : 'grams';
      const unit = UNIT_TYPES[unitId];
      const logsCount = s.logs ? Object.keys(s.logs).length : 0;
      const journalMode = (s.journalMode === 'abstain') ? 'abstain' : 'taper';

      const base = {
        started: !!s.started,
        journalMode,
        unitName: unit.name,
        unitId,
        logsCount
      };

      if (journalMode === 'abstain') {
        // Calcul du streak en cours pour la preview (sans toucher à state global)
        let currentDays = 0;
        if (s.currentStreakStart) {
          const today = todayISO();
          const diff = daysBetween(s.currentStreakStart, today);
          currentDays = diff < 0 ? 0 : diff + 1;
        }
        const history = Array.isArray(s.streakHistory) ? s.streakHistory : [];
        const bestDays = history.reduce((mx, x) => Math.max(mx, x.days || 0), 0);
        return Object.assign(base, {
          abstainLabel: typeof s.abstainLabel === 'string' ? s.abstainLabel : '',
          currentStreakDays: currentDays,
          bestStreakDays: bestDays,
          streakCount: history.length
        });
      }

      // Mode taper
      const week = s.currentWeek || 1;
      const total = (typeof s.totalWeeks === 'number' && s.totalWeeks >= MIN_WEEKS) ? s.totalWeeks : DEFAULT_TOTAL_WEEKS;
      const finished = week > total;
      return Object.assign(base, {
        week,
        totalWeeks: total,
        finished,
        startDose: s.startDose,
        endDose: s.endDose
      });
    } catch (e) {
      return { started: false };
    }
  }

  // ============ PALIER LOGIC ============
  function currentPalier() {
    return PALIERS.find(p => p.week === state.currentWeek) || PALIERS[PALIERS.length - 1];
  }


  function streakLogs() {
    // returns all days from palierStartDate up to today (palier may extend
    // beyond 7 days when the user has failed days and hasn't advanced yet)
    if (!state.palierStartDate) return [];
    const days = [];
    const today = todayISO();
    let cursor = state.palierStartDate;
    while (cursor <= today) {
      days.push({ date: cursor, log: state.logs[cursor] || null });
      cursor = dateAddDays(cursor, 1);
    }
    return days;
  }

  function dayStatus(date, log, palier) {
    if (!log) return 'pending';
    if (state.journalMode === 'abstain') {
      return log.kind === 'held' ? 'done' : 'miss';
    }
    if (log.dose === undefined || log.dose === null || log.dose === '') return 'pending';
    const dose = parseFloat(log.dose);
    const unitForLog = UNIT_TYPES[log.unitType];
    const tolerance = unitForLog.tolerance != null ? unitForLog.tolerance : 0.01;
    const overDose = dose > palier.dose + tolerance;
    if (overDose) return 'miss';
    return 'done';
  }

  function consecutiveDoneDays() {
    const palier = currentPalier();
    const days = streakLogs();
    let count = 0;
    const today = todayISO();
    for (const d of days) {
      if (d.date > today) break;
      const status = dayStatus(d.date, d.log, palier);
      if (status === 'done') {
        count++;
      } else if (status === 'miss') {
        // Seul un dépassement réel (dose loggée > cible) reset le streak.
        count = 0;
      }
      // Jour passé non loggué (status === 'pending' && d.date < today) :
      // on ne compte pas ce jour comme done, mais on ne reset pas non plus.
      // Oublier de logger n'est pas la même chose que dépasser la dose.
      // Jour "pending" qui est aujourd'hui : on ne touche pas — pas encore tranché.
    }
    return count;
  }

  // Retourne la liste des dates entre palierStartDate et today-1 qui sont
  // 'pending' (= passées et sans log avec dose). Sert au rattrapage : quand
  // l'utilisateur log aujourd'hui, on lui demande de remplir ces jours pour
  // que les stats du palier soient complètes.
  // Portée : palier en cours uniquement.
  // Retourne un tableau de strings ISO (YYYY-MM-DD), ordre chronologique.
  function findPendingDays() {
    if (!state.palierStartDate) return [];
    const palier = currentPalier();
    const today = todayISO();
    const pending = [];
    let cursor = state.palierStartDate;
    while (cursor < today) { // strictement < today : on ne rattrape pas aujourd'hui
      const log = state.logs[cursor] || null;
      if (dayStatus(cursor, log, palier) === 'pending') {
        pending.push(cursor);
      }
      cursor = dateAddDays(cursor, 1);
    }
    return pending;
  }

  // ============ RENDER ============
  function render() {
    renderHeader();

    const homeView = document.getElementById('view-home');
    const welcomeView = document.getElementById('view-welcome');
    const mainApp = document.getElementById('main-app');
    const titleMain = document.getElementById('header-title-main');
    const titleSub = document.getElementById('header-title-sub');

    // Cas 1 : aucun journal actif → page d'accueil (liste des journaux)
    if (!activeJournalId) {
      homeView.classList.remove('hidden');
      welcomeView.classList.add('hidden');
      mainApp.classList.add('hidden');
      document.getElementById('journal-name-row').classList.add('hidden');
      // Header : titre = "Le Journal Vital", pas de sous-titre
      titleMain.innerHTML = 'Le Journal Vital';
      titleSub.classList.add('hidden');
      titleSub.textContent = '';
      renderHome();
      return;
    }

    // Un journal est actif → afficher la rangée nom + bouton retour
    const nameRow = document.getElementById('journal-name-row');
    const nameDisplay = document.getElementById('journal-name-display');
    nameRow.classList.remove('hidden');
    const journal = getJournalById(activeJournalId);
    if (journal) {
      // Header : titre reste "Le Journal Vital", nom du journal en grand en dessous
      titleMain.innerHTML = 'Le Journal Vital';
      titleSub.classList.add('hidden');
      nameDisplay.textContent = journal.name;
    } else {
      titleMain.innerHTML = 'Le Journal Vital';
      titleSub.classList.add('hidden');
      nameDisplay.textContent = '';
    }
    homeView.classList.add('hidden');

    // Cas 2 : journal actif mais pas encore démarré → welcome (config)
    if (!state.started) {
      welcomeView.classList.remove('hidden');
      mainApp.classList.add('hidden');
      renderWelcome();
      return;
    }

    // Cas 3 : journal actif et démarré → app
    welcomeView.classList.add('hidden');
    mainApp.classList.remove('hidden');

    // Bascule UI selon le mode du journal
    applyJournalModeUI();

    if (state.journalMode === 'abstain') {
      renderStatusBarAbstain();
      renderTodayAbstain();
      renderHistory();
    } else {
      renderStatusBar();
      renderHero();
      renderTodayLog();
      renderOverview();
      renderHistory();
      updateProgress();
    }
    renderDebugBar();
  }

  // Affiche/cache les blocs UI en fonction du mode actif.
  // Doit être appelé chaque fois qu'on entre dans la vue main-app.
  function applyJournalModeUI() {
    const isAbstain = state.journalMode === 'abstain';

    // Status bars
    const sbTaper = document.getElementById('status-bar-taper');
    const sbAbstain = document.getElementById('status-bar-abstain');
    if (sbTaper) sbTaper.classList.toggle('hidden', isAbstain);
    if (sbAbstain) sbAbstain.classList.toggle('hidden', !isAbstain);

    // Vues today (les deux dans le même <section view-today>)
    const taperView = document.getElementById('today-taper-view');
    const abstainView = document.getElementById('today-abstain-view');
    if (taperView) taperView.classList.toggle('hidden', isAbstain);
    if (abstainView) abstainView.classList.toggle('hidden', !isAbstain);

    // Tab "Plan complet" : caché en mode abstinence (pas de plan multi-paliers)
    const tabOverview = document.getElementById('tab-overview');
    if (tabOverview) tabOverview.classList.toggle('hidden', isAbstain);

    // Raison aléatoire sur la bannière
    const reasonEls = [document.getElementById('status-reason-taper'), document.getElementById('status-reason-abstain')];
    reasonEls.forEach(el => {
      if (!el) return;
      if (Array.isArray(state.reasons) && state.reasons.length > 0) {
        el.textContent = state.reasons[Math.floor(Math.random() * state.reasons.length)];
        el.classList.remove('hidden');
      } else {
        el.classList.add('hidden');
      }
    });

    // Raisons
    const reasonsListEl = document.getElementById('reasons-list');
    if (reasonsListEl) {
      if (Array.isArray(state.reasons) && state.reasons.length > 0) {
        reasonsListEl.innerHTML = state.reasons.map((r, i) => {
          const num = ['i','ii','iii','iv','v','vi','vii','viii','ix','x'][i] || (i + 1);
          return `<div class="rule"><div class="rule-num">${num}.</div><div class="rule-text">${escapeHtml(r)}</div></div>`;
        }).join('');
      } else {
        reasonsListEl.innerHTML = `<div style="color:var(--ink-mute); font-style:italic;">${i18n.t('addiction.reasons_empty')}</div>`;
      }
    }

    // Règles — onglet visible uniquement si des règles existent
    const hasRules = Array.isArray(state.rules) && state.rules.length > 0;
    const tabRules = document.getElementById('tab-rules');
    if (tabRules) tabRules.classList.toggle('hidden', !hasRules);

    const rulesListEl = document.getElementById('rules-list');
    if (rulesListEl) {
      if (hasRules) {
        rulesListEl.innerHTML = state.rules.map((r, i) => {
          const num = ['i','ii','iii','iv','v','vi','vii','viii','ix','x'][i] || (i + 1);
          return `<div class="rule"><div class="rule-num">${num}.</div><div class="rule-text">${escapeHtml(r)}</div></div>`;
        }).join('');
      } else {
        rulesListEl.innerHTML = `<div style="color:var(--ink-mute); font-style:italic;">${i18n.t('addiction.rules_empty')}</div>`;
      }
    }
  }

  function renderHome() {
    const list = document.getElementById('journals-list');
    const journals = loadJournalsIndex();

    if (journals.length === 0) {
      list.innerHTML = `<div class="journals-empty">
        <div class="journals-empty-text">${i18n.t('addiction.empty_journals')}</div>
      </div>`;
      return;
    }

    // Trier : journal actif (au sens du dernier ouvert) en premier ? Non — on garde l'ordre de création.
    let html = '';
    journals.forEach((j, idx) => {
      const preview = getJournalPreview(j.id);
      let metaHtml;
      let statusHtml;
      if (!preview.started) {
        metaHtml = `<span class="journal-card-meta-item"><strong>—</strong> ${i18n.t('addiction.journal_not_configured')}</span>`;
        statusHtml = `<span class="journal-card-status">${i18n.t('addiction.journal_to_configure')}</span>`;
      } else if (preview.journalMode === 'abstain') {
        // Mode abstinence : streak en cours / record / nb tentatives
        const cur = preview.currentStreakDays || 0;
        const best = preview.bestStreakDays || 0;
        const curLabel = cur === 0 ? i18n.t('addiction.journal_streak_zero') : (cur === 1 ? i18n.t('addiction.journal_streak_one') : i18n.t('addiction.journal_streak_n', {n: cur}));
        const bestLabel = best === 0 ? i18n.t('addiction.journal_record_none') : i18n.t('addiction.journal_record_n', {n: best});
        const label = (preview.abstainLabel && preview.abstainLabel.trim())
          ? `${i18n.t('addiction.journal_abstinence_prefix')} · ${escapeHtml(preview.abstainLabel.trim())}`
          : i18n.t('addiction.journal_abstinence_prefix');
        metaHtml = `
          <span class="journal-card-meta-item">${label}</span>
          <span class="journal-card-meta-item"><strong>${curLabel}</strong></span>
          <span class="journal-card-meta-item">${bestLabel}</span>
        `;
        statusHtml = `<span class="journal-card-status active-now">${i18n.t('addiction.journal_in_progress')}</span>`;
      } else {
        // Mode taper (existant)
        const weekLabel = preview.finished ? i18n.t('addiction.journal_phase_libre') : i18n.t('addiction.journal_week_of', {week: preview.week, total: preview.totalWeeks});
        const logLabel = preview.logsCount === 1 ? i18n.t('addiction.journal_logs_one') : i18n.t('addiction.journal_logs_n', {n: preview.logsCount});
        metaHtml = `
          <span class="journal-card-meta-item">${preview.unitName}</span>
          <span class="journal-card-meta-item">${weekLabel}</span>
          <span class="journal-card-meta-item">${logLabel}</span>
        `;
        statusHtml = preview.finished
          ? `<span class="journal-card-status finished">${i18n.t('addiction.journal_finished')}</span>`
          : `<span class="journal-card-status active-now">${i18n.t('addiction.journal_in_progress')}</span>`;
      }

      html += `<div class="journal-card" data-journal-id="${j.id}">
        <div class="journal-card-main">
          <div class="journal-card-name">${escapeHtml(j.name)}<button class="btn-rename" data-action="rename" data-journal-id="${j.id}" title="${i18n.t('common.rename')}">✏️</button></div>
          <div class="journal-card-meta">${metaHtml}</div>
        </div>
        ${statusHtml}
        <div class="journal-card-actions">
          ${journals.length > 1 ? `<span class="journal-card-reorder">
            <button class="btn-move" data-action="move-up" data-journal-id="${j.id}" title="${i18n.t('common.move_up')}"${idx === 0 ? ' disabled' : ''}>▲</button>
            <button class="btn-move" data-action="move-down" data-journal-id="${j.id}" title="${i18n.t('common.move_down')}"${idx === journals.length - 1 ? ' disabled' : ''}>▼</button>
          </span>` : ''}
          <button class="btn-export-json" data-action="export" data-journal-id="${j.id}" title="${i18n.t('addiction.btn_export_journal_title')}">${i18n.t('common.export')}</button>
          <button class="btn-del" data-action="delete" data-journal-id="${j.id}" title="${i18n.t('addiction.btn_delete_journal_title')}">${i18n.t('common.delete')}</button>
        </div>
      </div>`;
    });
    list.innerHTML = html;

    // Bind clicks (la carte ouvre, le bouton supprime sans propager)
    list.querySelectorAll('.journal-card').forEach(card => {
      card.addEventListener('click', e => {
        // Si on a cliqué sur un bouton à l'intérieur, ignore
        if (e.target.closest('button')) return;
        const id = card.dataset.journalId;
        if (id) openJournal(id);
      });
    });
    list.querySelectorAll('button[data-action="export"]').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const id = btn.dataset.journalId;
        const j = getJournalById(id);
        const journalName = j ? j.name : 'journal';
        const stateData = VitalStore.get(journalStorageKey(id)) || {};
        const exportData = Object.assign({ _meta: j }, stateData);
        VitalStore.exportJSON(exportData, journalName.replace(/[^a-zA-Z0-9àâäéèêëïîôùûüÿç&Sæ _-]/g, '_') + '.json');
      });
    });
    list.querySelectorAll('button[data-action="delete"]').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const id = btn.dataset.journalId;
        const j = getJournalById(id);
        const name = j ? j.name : i18n.t('addiction.journal_this_fallback');
        if (!confirm(i18n.t('addiction.confirm_delete_journal', {name}))) return;
        deleteJournal(id);
        renderHome();
      });
    });
    list.querySelectorAll('[data-action="move-up"]').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const id = btn.dataset.journalId;
        const journals = loadJournalsIndex();
        const idx = journals.findIndex(j => j.id === id);
        if (VitalStore.moveItem(journals, idx, -1)) {
          saveJournalsIndex(journals);
          renderHome();
        }
      });
    });
    list.querySelectorAll('[data-action="move-down"]').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const id = btn.dataset.journalId;
        const journals = loadJournalsIndex();
        const idx = journals.findIndex(j => j.id === id);
        if (VitalStore.moveItem(journals, idx, 1)) {
          saveJournalsIndex(journals);
          renderHome();
        }
      });
    });
    list.querySelectorAll('[data-action="rename"]').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const id = btn.dataset.journalId;
        const journals = loadJournalsIndex();
        const j = journals.find(x => x.id === id);
        if (!j) return;
        const newName = prompt(i18n.t('common.rename'), j.name);
        if (newName && newName.trim()) {
          j.name = newName.trim();
          saveJournalsIndex(journals);
          renderHome();
        }
      });
    });
  }

  function hasExistingProgram() {
    if (state.journalMode === 'abstain') {
      return state.currentStreakStart !== null
          || (Array.isArray(state.streakHistory) && state.streakHistory.length > 0)
          || Object.keys(state.logs).length > 0;
    }
    return state.palierStartDate !== null || Object.keys(state.logs).length > 0;
  }

  function renderWelcome() {
    const today = effectiveNow();
    const todayStr = today.toLocaleDateString('fr-FR', { weekday:'long', day:'numeric', month:'long', year:'numeric' });
    const todayStrCap = todayStr.charAt(0).toUpperCase() + todayStr.slice(1);
    const todayDateEl = document.getElementById('welcome-today-date');
    if (todayDateEl) todayDateEl.textContent = todayStrCap;
    const todayDateAbsEl = document.getElementById('welcome-today-date-abstain');
    if (todayDateAbsEl) todayDateAbsEl.textContent = todayStrCap;

    // Pré-remplir le nom du journal avec celui de l'index (créé en amont)
    const nameInput = document.getElementById('config-journal-name');
    if (nameInput) {
      const j = activeJournalId ? getJournalById(activeJournalId) : null;
      nameInput.value = j ? j.name : '';
    }

    // Pré-remplir le label abstinence (utile si on revient sur un journal non-démarré
    // qui avait déjà été configuré)
    const abstainLabelInput = document.getElementById('config-abstain-label');
    if (abstainLabelInput) {
      abstainLabelInput.value = state.abstainLabel || '';
    }

    // Pré-remplir les raisons
    const reasonsListEl = document.getElementById('config-reasons-list');
    if (reasonsListEl) {
      const existing = Array.isArray(state.reasons) ? state.reasons : [];
      reasonsListEl.innerHTML = '';
      const items = existing.length ? existing : [''];
      items.forEach(r => {
        const div = document.createElement('div');
        div.className = 'reason-item';
        div.innerHTML = `<input type="text" class="reason-input" maxlength="120" placeholder="${i18n.t('addiction.config_reason_placeholder')}">`
          + `<button type="button" class="reason-remove-btn" title="${i18n.t('addiction.reason_remove_title')}">✕</button>`;
        div.querySelector('input').value = r;
        reasonsListEl.appendChild(div);
      });
    }

    // Pré-remplir les règles
    const rulesListEl2 = document.getElementById('config-rules-list');
    if (rulesListEl2) {
      const existingRules = Array.isArray(state.rules) ? state.rules : [];
      rulesListEl2.innerHTML = '';
      const ruleItems = existingRules.length ? existingRules : [''];
      ruleItems.forEach(r => {
        const div = document.createElement('div');
        div.className = 'reason-item';
        div.innerHTML = `<input type="text" class="rule-input" maxlength="120" placeholder="${i18n.t('addiction.config_rule_placeholder')}">`
          + `<button type="button" class="reason-remove-btn" title="${i18n.t('addiction.rule_remove_title')}">✕</button>`;
        div.querySelector('input').value = r;
        rulesListEl2.appendChild(div);
      });
    }

    // Synchroniser le sélecteur de mode avec state.journalMode
    syncModeUI();

    // Synchroniser les contrôles durée avec state.totalWeeks (qui contient
    // la valeur par défaut OU la valeur restaurée d'un journal existant non démarré)
    const durSlider = document.getElementById('config-duration');
    const durInput = document.getElementById('config-duration-input');
    if (durSlider) durSlider.value = state.totalWeeks;
    if (durInput) durInput.value = state.totalWeeks;
    syncDurationPresets(state.totalWeeks);

    // Render le sélecteur de type d'unité
    renderUnitGrid();

    // Render la grille de courbes
    renderCurveGrid();

    // Sync les libellés et inputs avec l'unité courante
    syncUnitUI();

    // Preview de la descente + dates dynamiques
    renderConfigPreview();
    updateWelcomeEndDate();

  }

  // Synchronise l'UI welcome avec state.journalMode :
  // - active la bonne mode-card
  // - affiche/cache les blocs taper-only et abstain-only
  // - adapte les textes (intro, titre du bloc unité)
  function syncModeUI() {
    const isAbstain = state.journalMode === 'abstain';

    document.querySelectorAll('.mode-card').forEach(card => {
      card.classList.toggle('active', card.dataset.journalMode === state.journalMode);
    });

    const taperOnly = document.getElementById('config-taper-only');
    const abstainOnly = document.getElementById('config-abstain-only');
    const summaryTaper = document.getElementById('welcome-summary-taper');
    const summaryAbstain = document.getElementById('welcome-summary-abstain');

    if (taperOnly) taperOnly.classList.toggle('hidden', isAbstain);
    if (abstainOnly) abstainOnly.classList.toggle('hidden', !isAbstain);
    if (summaryTaper) summaryTaper.classList.toggle('hidden', isAbstain);
    if (summaryAbstain) summaryAbstain.classList.toggle('hidden', !isAbstain);
  }

  // Met à jour la date "fin estimée du plan" en fonction de state.totalWeeks
  function updateWelcomeEndDate() {
    const today = effectiveNow();
    const end = new Date(today);
    end.setDate(end.getDate() + state.totalWeeks * 7);
    const endStr = end.toLocaleDateString('fr-FR', { weekday:'long', day:'numeric', month:'long', year:'numeric' });
    const endEl = document.getElementById('welcome-end-date');
    if (endEl) endEl.textContent = endStr.charAt(0).toUpperCase() + endStr.slice(1);
  }

  // Active le bouton preset correspondant à la valeur courante (ou aucun si pas de match)
  function syncDurationPresets(weeks) {
    document.querySelectorAll('#duration-presets .preset-btn').forEach(btn => {
      const w = parseInt(btn.dataset.weeks, 10);
      btn.classList.toggle('active', w === weeks);
    });
    // Pluriel
    const pluralEl = document.getElementById('duration-plural');
    if (pluralEl) pluralEl.style.display = (weeks === 1) ? 'none' : 'inline';
  }

  // Génère un mini-SVG (courbe descendant de gauche à droite) pour une courbe donnée
  function curvePreviewSVG(curveId, samples) {
    samples = samples || 20;
    const W = 140;
    const H = 40;
    const pad = 3;
    let d = '';
    for (let i = 0; i <= samples; i++) {
      const x = i / samples;
      // On utilise la courbe pour position normalisée x â   [0,1]
      // En passant (x*N, N) la fonction renvoie f(x). On prend N=samples pour cohérence.
      const ratio = CURVES[curveId].fn(i, samples);
      const px = pad + x * (W - 2 * pad);
      const py = pad + (1 - ratio) * (H - 2 * pad);
      d += (i === 0 ? 'M' : 'L') + px.toFixed(1) + ',' + py.toFixed(1) + ' ';
    }
    return `<svg class="curve-card-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none"><path d="${d}"/></svg>`;
  }

  function renderCurveGrid() {
    const grid = document.getElementById('curve-grid');
    if (!grid) return;
    let html = '';
    Object.values(CURVES).forEach(c => {
      const active = state.curveType === c.id ? 'active' : '';
      html += `<div class="curve-card ${active}" data-curve="${c.id}" title="${c.hint}">
        ${curvePreviewSVG(c.id)}
        <div class="curve-card-name">${c.name}</div>
        <div class="curve-card-tagline">${c.tagline}</div>
      </div>`;
    });
    grid.innerHTML = html;

    grid.querySelectorAll('.curve-card').forEach(card => {
      card.addEventListener('click', () => {
        const newCurve = card.dataset.curve;
        if (newCurve === state.curveType) return;
        state.curveType = newCurve;
        renderCurveGrid();
        renderConfigPreview();
      });
    });
  }

  function renderUnitGrid() {
    const grid = document.getElementById('unit-grid');
    if (!grid) return;
    let html = '';
    Object.values(UNIT_TYPES).forEach(u => {
      const active = state.unitType === u.id ? 'active' : '';
      html += `<div class="unit-card ${active}" data-unit="${u.id}">
        <div class="unit-card-name">${u.name}</div>
        <div class="unit-card-hint">${u.hint}</div>
        <div class="unit-card-suffix">${u.perDay}</div>
      </div>`;
    });
    grid.innerHTML = html;

    // Bind clicks
    grid.querySelectorAll('.unit-card').forEach(card => {
      card.addEventListener('click', () => {
        const newUnit = card.dataset.unit;
        if (newUnit === state.unitType) return;
        state.unitType = newUnit;
        // Reset des valeurs config aux defaults de l'unité choisie
        const u = UNIT_TYPES[newUnit];
        const startInput = document.getElementById('config-start-dose');
        const endInput = document.getElementById('config-end-dose');
        if (startInput) startInput.value = u.defaultStart;
        if (endInput) endInput.value = u.defaultEnd;
        // Rebuild paliers et re-render
        PALIERS = buildPaliers(u.defaultStart, u.defaultEnd, state.totalWeeks, state.curveType);
        renderUnitGrid();
        syncUnitUI();
        renderConfigPreview();
      });
    });
  }

  function syncUnitUI() {
    const u = getUnit();
    // Inputs config
    const startInput = document.getElementById('config-start-dose');
    const endInput = document.getElementById('config-end-dose');
    if (startInput) {
      startInput.step = u.configStep;
      startInput.min = u.integerOnly ? 1 : 0.1;
    }
    if (endInput) {
      endInput.step = u.configEndStep;
      endInput.min = 0;
    }
    // Labels & hints config
    const startLabel = document.getElementById('config-start-label');
    const startHint = document.getElementById('config-start-hint');
    const endLabel = document.getElementById('config-end-label');
    const endHint = document.getElementById('config-end-hint');
    const startUnit = document.getElementById('config-start-unit');
    const endUnit = document.getElementById('config-end-unit');
    if (startLabel) startLabel.textContent = u.configStartLabel;
    if (startHint) startHint.textContent = u.configStartHint;
    if (endLabel) endLabel.textContent = u.configEndLabel;
    if (endHint) endHint.textContent = u.configEndHint;
    if (startUnit) startUnit.textContent = u.perDay;
    if (endUnit) endUnit.textContent = u.perDay;
  }

  function renderConfigPreview() {
    const startInput = document.getElementById('config-start-dose');
    const endInput = document.getElementById('config-end-dose');
    if (!startInput || !endInput) return;

    const u = getUnit();
    const startDose = parseFloat(startInput.value);
    const endDose = parseFloat(endInput.value);
    const previewEl = document.getElementById('preview-paliers');
    const firstPalierEl = document.getElementById('welcome-first-palier');

    if (isNaN(startDose) || isNaN(endDose) || startDose <= 0 || endDose < 0 || endDose >= startDose) {
      previewEl.innerHTML = `<div style="font-size:12px; color:var(--ink-mute); font-style:italic; padding:6px 0;">${i18n.t('addiction.preview_hint')}</div>`;
      firstPalierEl.textContent = '—';
      return;
    }

    const totalWeeks = state.totalWeeks || DEFAULT_TOTAL_WEEKS;
    const paliers = buildPaliers(startDose, endDose, totalWeeks, state.curveType);

    // Première ligne (semaine 1)
    const firstP = paliers[0];
    firstPalierEl.textContent = i18n.t('addiction.preview_week_prefix') + u.format(firstP.dose) + '/jour';

    // Barres horizontales pour les N semaines de descente
    // Si N est très grand (> 16), on affiche 1 ligne sur 2 ou sur 4 pour rester lisible
    let step = 1;
    if (totalWeeks > 32) step = 4;
    else if (totalWeeks > 16) step = 2;

    let html = '';
    const descentPaliers = paliers.slice(0, totalWeeks);
    descentPaliers.forEach((p, i) => {
      // On garde le 1er, le dernier, et un sur `step`
      const isFirst = i === 0;
      const isLast = i === descentPaliers.length - 1;
      if (!isFirst && !isLast && (i % step !== 0)) return;
      const widthPct = startDose === 0 ? 0 : (p.dose / startDose) * 100;
      html += `<div class="preview-row">
        <span class="preview-week">S${p.week}</span>
        <div class="preview-bar"><div class="preview-bar-fill" style="width:${widthPct}%"></div></div>
        <span class="preview-dose">${u.format(p.dose)}</span>
      </div>`;
    });
    // Ligne finale (objectif = phase libre, à l'index totalWeeks)
    const finalP = paliers[totalWeeks];
    const finalWidthPct = startDose === 0 ? 0 : (finalP.dose / startDose) * 100;
    html += `<div class="preview-row" style="border-top:1px solid var(--line); margin-top:4px; padding-top:8px;">
      <span class="preview-week" style="color:var(--good);">${i18n.t('addiction.preview_target_label')}</span>
      <div class="preview-bar"><div class="preview-bar-fill" style="width:${finalWidthPct}%; background:var(--good);"></div></div>
      <span class="preview-dose" style="color:var(--good);">${u.format(finalP.dose)}</span>
    </div>`;
    previewEl.innerHTML = html;
  }


  function renderHeader() {
    document.getElementById('today-date').textContent = formatDateLong();
  }

  function renderStatusBar() {
    if (!state.started) return;
    const p = currentPalier();
    const palierEl = document.getElementById('status-palier');
    const streakEl = document.getElementById('status-streak');
    const btn = document.getElementById('advance-btn');

    // Indication du palier en cours
    if (p.phase === 3) {
      palierEl.innerHTML = i18n.t('addiction.status_palier_libre');
    } else {
      palierEl.innerHTML = i18n.t('addiction.status_palier_week', {week: p.week, total: state.totalWeeks});
    }

    // Compteur jours tenus
    const consec = consecutiveDoneDays();
    const ready = consec >= 7;
    const finished = state.currentWeek > state.totalWeeks;
    streakEl.innerHTML = `${Math.min(consec, 7)}<small>/7</small>`;
    streakEl.classList.toggle('complete', ready);

    // Bouton avancer — actif uniquement à 7/7, et tant que le plan n'est pas fini
    btn.disabled = !ready || finished;
    if (finished) {
      btn.textContent = i18n.t('addiction.btn_advance_done');
      btn.title = i18n.t('addiction.btn_advance_title_done');
    } else if (ready) {
      btn.textContent = i18n.t('addiction.btn_advance');
      btn.title = i18n.t('addiction.btn_advance_title_ready');
    } else {
      btn.textContent = i18n.t('addiction.btn_advance');
      btn.title = i18n.t('addiction.btn_advance_title_locked', {n: consec});
    }
  }

  // ============ MODALE DE RATTRAPAGE (jours pending) ============
  // Quand l'utilisateur enregistre aujourd'hui, on vérifie qu'il n'a pas
  // de jours non renseignés dans le palier en cours. Si oui, on ouvre une
  // modale qui force la saisie d'une dose pour chacun avant de pouvoir
  // valider. Tous les jours du palier doivent être complets pour les stats.
  //
  // Etat éphémère : on stocke le log "aujourd'hui" en attente le temps que
  // l'utilisateur remplisse le rattrapage (sinon il devrait re-tout taper si
  // la modale s'ouvre puis se ferme).
  let pendingTodayLog = null;       // { dose, title, note } à sauver une fois le rattrapage validé
  let pendingDaysList = [];         // dates ISO en cours de rattrapage

  // Construit le contenu de la modale à partir de la liste des dates pending.
  function renderCatchupModal(dates) {
    const body = document.getElementById('catchup-body');
    if (!body) return;

    if (state.journalMode === 'abstain') {
      body.innerHTML = dates.map(date => {
        const dateLabel = formatDateFR(date);
        const today = todayISO();
        const diff = daysBetween(date, today);
        const ago = diff === 1 ? i18n.t('addiction.catchup_yesterday') : i18n.t('addiction.catchup_days_ago', {n: diff});
        return `
          <div class="catchup-row catchup-row-abstain" data-catchup-date="${date}">
            <div class="catchup-row-date">
              ${escapeHtml(dateLabel)}
              <small>${ago}</small>
            </div>
            <div class="catchup-row-btns">
              <button type="button" class="btn-catchup-choice" data-kind="held" data-date="${date}">${i18n.t('addiction.btn_hold_main')}</button>
              <button type="button" class="btn-catchup-choice" data-kind="relapse" data-date="${date}">${i18n.t('addiction.btn_relapse_main')}</button>
            </div>
          </div>
        `;
      }).join('');

      // Add click handlers for the choice buttons
      body.querySelectorAll('.btn-catchup-choice').forEach(btn => {
        btn.addEventListener('click', () => {
          const date = btn.dataset.date;
          const kind = btn.dataset.kind;
          // Toggle selection
          const row = btn.closest('.catchup-row');
          row.querySelectorAll('.btn-catchup-choice').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          row.dataset.selectedKind = kind;
          // Efface l'erreur sur cette ligne
          row.classList.remove('err');
        });
      });

    } else {
      const u = getUnit();
      const palier = currentPalier();
      const stepStr = u.integerOnly ? '1' : String(u.step);

      body.innerHTML = dates.map(date => {
        const dateLabel = formatDateFR(date);
        const today = todayISO();
        const diff = daysBetween(date, today);
        const ago = diff === 1 ? i18n.t('addiction.catchup_yesterday') : i18n.t('addiction.catchup_days_ago', {n: diff});
        const dayTarget = palier.dose;
        const targetStr = u.format(dayTarget);
        return `
          <div class="catchup-row" data-catchup-date="${date}">
            <div class="catchup-row-date">
              ${escapeHtml(dateLabel)}
              <small>${ago}</small>
            </div>
            <div class="catchup-row-input">
              <input
                type="number"
                class="catchup-input"
                data-catchup-date="${date}"
                step="${stepStr}"
                min="0"
                placeholder="0"
                inputmode="${u.integerOnly ? 'numeric' : 'decimal'}"
              >
              <span class="catchup-row-unit">${escapeHtml(u.shortSuffix)}</span>
            </div>
            <div class="catchup-row-target">${i18n.t('addiction.catchup_target_prefix')}${escapeHtml(targetStr)}</div>
          </div>
        `;
      }).join('');
    }

    // Mise à jour du sous-titre selon le mode
    const subEl = document.getElementById('catchup-sub');
    if (subEl) {
      subEl.textContent = state.journalMode === 'abstain'
        ? i18n.t('addiction.catchup_subtitle_abstain')
        : i18n.t('addiction.catchup_subtitle');
    }

    // En mode taper : efface l'erreur sur un input dès que l'utilisateur tape
    if (state.journalMode !== 'abstain') {
      body.querySelectorAll('.catchup-input').forEach(input => {
        input.addEventListener('input', () => {
          const wrap = input.closest('.catchup-row-input');
          if (wrap) wrap.classList.remove('err');
        });
      });
    }

    // Reset l'état d'erreur et le statut
    const status = document.getElementById('catchup-status');
    if (status) {
      status.textContent = i18n.t('addiction.catchup_status_count', {n: dates.length, s: dates.length > 1 ? 's' : ''});
      status.classList.remove('err');
    }
  }

  function openCatchupModal(dates) {
    pendingDaysList = dates.slice();
    renderCatchupModal(dates);
    const modal = document.getElementById('catchup-modal');
    if (modal) {
      modal.classList.remove('hidden');
      // Focus sur le premier input pour saisie rapide
      setTimeout(() => {
        const firstInput = modal.querySelector('.catchup-input');
        if (firstInput) firstInput.focus();
      }, 50);
    }
  }

  function closeCatchupModal() {
    const modal = document.getElementById('catchup-modal');
    if (modal) modal.classList.add('hidden');
    pendingTodayLog = null;
    pendingDaysList = [];
  }

  // Valide tous les inputs de la modale et enregistre les logs si OK.
  // Retourne true si la sauvegarde a abouti (validation + saveState), false sinon.
  // En cas d'échec validation : la modale reste ouverte, statut d'erreur affiché.
  // En cas d'échec saveState : la modale reste ouverte, statut d'erreur affiché,
  //   et les logs ne sont PAS écrits dans state (rollback).
  function commitCatchup() {
    const modal = document.getElementById('catchup-modal');
    if (!modal) return false;
    const today = todayISO();

    const values = []; // { date, dose, kind }
    let firstInvalidRow = null;

    if (state.journalMode === 'abstain') {
      const rows = modal.querySelectorAll('.catchup-row');
      rows.forEach(row => {
        const date = row.dataset.catchupDate;
        const kind = row.dataset.selectedKind;
        if (!kind) {
          row.classList.add('err');
          if (!firstInvalidRow) firstInvalidRow = row;
          return;
        }
        row.classList.remove('err');
        values.push({ date, kind });
      });
    } else {
      const u = getUnit();
      const inputs = modal.querySelectorAll('.catchup-input');
      inputs.forEach(input => {
        const date = input.dataset.catchupDate;
        const wrap = input.closest('.catchup-row-input');
        const raw = input.value;
        if (raw === '' || raw === null || isNaN(parseFloat(raw))) {
          if (wrap) wrap.classList.add('err');
          if (!firstInvalidRow) firstInvalidRow = input.closest('.catchup-row');
          return;
        }
        let dose = parseFloat(raw);
        if (u.integerOnly) dose = Math.round(dose);
        if (dose < 0) dose = 0;
        if (wrap) wrap.classList.remove('err');
        values.push({ date, dose });
      });
    }

    if (firstInvalidRow) {
      const status = document.getElementById('catchup-status');
      if (status) {
        status.textContent = i18n.t('addiction.catchup_error_fill_all');
        status.classList.add('err');
      }
      firstInvalidRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return false;
    }

    // 2. Tout est valide : on prépare les logs
    const palier = currentPalier();
    const newLogs = {};

    if (state.journalMode === 'abstain') {
      values.forEach(v => {
        newLogs[v.date] = {
          kind: v.kind,
          savedAt: new Date().toISOString(),
          catchupAt: new Date().toISOString()
        };
      });
    } else {
      for (const { date, dose } of values) {
        const dayTarget = palier.dose;
        newLogs[date] = {
          title: '',
          dose: dose,
          targetDose: dayTarget,
          phase: palier.phase,
          unitType: state.unitType,
          note: '',
          savedAt: new Date().toISOString(),
          catchupAt: new Date().toISOString()
        };
      }
    }

    if (pendingTodayLog) {
      if (state.journalMode === 'abstain') {
        newLogs[today] = {
          kind: pendingTodayLog.kind,
          note: pendingTodayLog.note || '',
          notes: pendingTodayLog.notes || [],
          audios: pendingTodayLog.audios || [],
          savedAt: new Date().toISOString()
        };
      } else {
        const todayTarget = palier.dose;
        newLogs[today] = {
          title: pendingTodayLog.title,
          dose: pendingTodayLog.dose,
          doses: pendingTodayLog.doses || [],
          targetDose: todayTarget,
          phase: palier.phase,
          unitType: state.unitType,
          note: pendingTodayLog.note,
          notes: pendingTodayLog.notes || [],
          audios: pendingTodayLog.audios || [],
          savedAt: new Date().toISOString()
        };
      }
    }

    // 3. Écriture dans state, puis sauvegarde. Si saveState échoue, on rollback.
    const backupLogs = {};
    const backupCurrentStreakStart = state.currentStreakStart;
    const backupStreakHistory = [...state.streakHistory];
    const backupPalierStartDate = state.palierStartDate;

    for (const k of Object.keys(newLogs)) {
      backupLogs[k] = state.logs[k];
    }

    if (state.journalMode === 'abstain') {
      const sortedDates = Object.keys(newLogs).sort();
      sortedDates.forEach(date => {
        const log = newLogs[date];
        if (log.kind === 'held') {
          if (!state.currentStreakStart) state.currentStreakStart = date;
          state.logs[date] = log;
        } else {
          // Relapse
          if (state.currentStreakStart) {
            const heldBefore = daysBetween(state.currentStreakStart, date);
            if (heldBefore > 0) {
              state.streakHistory.push({
                startDate: state.currentStreakStart,
                endDate: dateAddDays(date, -1),
                days: heldBefore,
                relapseNote: log.note || ''
              });
            }
          }
          state.currentStreakStart = null;
          state.logs[date] = log;
        }
      });
      state.palierStartDate = today;
    } else {
      for (const k of Object.keys(newLogs)) {
        state.logs[k] = newLogs[k];
      }
    }

    const ok = saveState();
    if (!ok) {
      // Rollback
      for (const k of Object.keys(backupLogs)) {
        if (backupLogs[k] === undefined) delete state.logs[k];
        else state.logs[k] = backupLogs[k];
      }
      state.currentStreakStart = backupCurrentStreakStart;
      state.streakHistory = backupStreakHistory;
      state.palierStartDate = backupPalierStartDate;

      const status = document.getElementById('catchup-status');
      if (status) {
        status.textContent = i18n.t('addiction.catchup_error_save');
        status.classList.add('err');
      }
      return false;
    }

    // 4. Succès : on ferme et reset
    pendingTodayLog = null;
    closeCatchupModal();
    return true;
  }

  // ============ DEBUG MODE ============
  // Visible uniquement si l'URL contient ?debug=1.
  // Permet de fast-forward un journal pour tester les transitions de paliers
  // (mode taper) ou les milestones de streak (mode abstinence).
  //
  // Les fonctions publiques (debugAddDay, debugAdd7Days, debugSkipPalier,
  // debugResetJournal) dispatchent sur state.journalMode pour appeler la bonne
  // implémentation. Les fonctions internes sont préfixées Taper / Abstain.

  function renderDebugBar() {
    const bar = document.getElementById('debug-bar');
    if (!bar) return;
    if (!DEBUG_MODE || !state.started) {
      bar.classList.add('hidden');
      return;
    }
    bar.classList.remove('hidden');
    const stats = document.getElementById('debug-stats');
    if (!stats) return;
    const total = Object.keys(state.logs || {}).length;
    if (state.journalMode === 'abstain') {
      // Stats abstinence : streak en cours / record / prochain milestone / nb logs
      const cur = currentStreakDays();
      const best = bestStreakDays();
      const next = nextMilestone(cur);
      const nextLabel = next ? `${next.short}@${next.days}j` : '►';
      stats.textContent = `streak=${cur}j · best=${best}j · next=${nextLabel} · logs=${total}`;
    } else {
      // Stats taper : palier en cours / streak / nb logs total
      const consec = consecutiveDoneDays();
      const week = state.currentWeek > state.totalWeeks
        ? 'libre'
        : `S${state.currentWeek}/${state.totalWeeks}`;
      stats.textContent = `${week} · streak=${consec}/7 · logs=${total}`;
    }
  }

  // ----- TAPER (descente progressive) -----------------------------------------

  // Crée un log "réussi" pour une date donnée (dose = consigne du palier en cours)
  function debugMakeLogTaper(dateISO, success) {
    const u = getUnit();
    const p = currentPalier();
    const dayTarget = p.dose;
    let dose;
    if (success) {
      dose = dayTarget;
    } else {
      if (u.integerOnly) dose = Math.round(dayTarget) + 1;
      else if (dayTarget > 0) dose = Math.round((dayTarget + 0.5) * 100) / 100;
      else dose = 0.5;
    }
    state.logs[dateISO] = {
      title: success ? '[debug] jour test' : '[debug] jour raté',
      dose: dose,
      targetDose: dayTarget,
      phase: p.phase,
      unitType: state.unitType,
      note: '',
      savedAt: new Date().toISOString()
    };
  }

  // Récupère la liste ordonnée des "events" debug DU PALIER EN COURS (taper).
  // Filtrage important : on ignore les logs debug ANTÉRIEURS à palierStartDate.
  function debugExtractEventsTaper() {
    const events = [];
    const dates = Object.keys(state.logs).sort();
    const startDate = state.palierStartDate || todayISO();
    for (const date of dates) {
      if (date < startDate) continue; // hors du palier en cours
      const log = state.logs[date];
      if (!log || !log.title || !log.title.startsWith('[debug]')) continue;
      const success = log.dose <= log.targetDose;
      events.push({ success });
    }
    return events;
  }

  // Efface tous les logs debug (préserve les vrais logs). Partagé entre les
  // deux modes : un log debug est identifié par son title qui commence par '[debug]'.
  function debugClearDebugLogs() {
    const dates = Object.keys(state.logs);
    for (const date of dates) {
      const log = state.logs[date];
      if (log && log.title && log.title.startsWith('[debug]')) {
        delete state.logs[date];
      }
    }
  }

  // Réécrit les logs debug taper à partir d'une liste d'events.
  function debugApplyEventsTaper(events) {
    debugClearDebugLogs();
    if (events.length === 0) {
      state.palierStartDate = todayISO();
      return;
    }
    const today = todayISO();
    const n = Math.min(events.length, 7);
    const trimmed = events.slice(events.length - n);
    state.palierStartDate = dateAddDays(today, -(n - 1));
    for (let i = 0; i < n; i++) {
      const date = dateAddDays(state.palierStartDate, i);
      debugMakeLogTaper(date, trimmed[i].success);
    }
  }

  function debugAddDayTaper(success) {
    if (consecutiveDoneDays() >= 7) {
      console.warn('[debug] Le streak est déjà à 7/7 — utilise "Skip palier" pour passer au suivant.');
      return;
    }
    const events = debugExtractEventsTaper();
    events.push({ success });
    debugApplyEventsTaper(events);
  }

  function debugAdd7DaysTaper() {
    const events = [];
    for (let i = 0; i < 7; i++) events.push({ success: true });
    debugApplyEventsTaper(events);
  }

  function debugSkipPalierTaper() {
    if (state.currentWeek > state.totalWeeks) {
      console.warn('[debug] Plan déjà terminé');
      return;
    }
    debugClearDebugLogs();
    state.currentWeek += 1;
    state.palierStartDate = todayISO();
  }

  function debugResetJournalTaper() {
    state.currentWeek = 1;
    state.palierStartDate = todayISO();
    state.logs = {};
  }

  // Action : "+1 jour vide" — recule palierStartDate d'1 jour SANS poser de log.
  // Le résultat : hier (= la nouvelle date à -1 du palier) devient un jour 'pending'
  // dans la fenêtre du palier. Sert à tester la modale de rattrapage : après ce
  // clic, enregistrer aujourd'hui devrait déclencher la modale.
  // No-op au-delà du palier en cours (= si on est déjà en phase libre).
  function debugAddEmptyDayTaper() {
    if (!state.palierStartDate) {
      // Garde-fou : palier pas initialisé — on initialise à hier pour que le pending soit visible
      state.palierStartDate = dateAddDays(todayISO(), -1);
      return;
    }
    state.palierStartDate = dateAddDays(state.palierStartDate, -1);
    // Pas de log écrit : le jour reculé reste 'pending' (= sans log).
  }

  // ----- ABSTINENCE -----------------------------------------------------------
  //
  // Sémantique abstinence :
  //   - "+1 jour"        = streak += 1 (recule currentStreakStart d'1 jour, ajoute un log [debug] held)
  //   - "+7 jours"       = streak += 7
  //   - "+1 jour raté"   = simule une rechute aujourd'hui (archive le streak, reset à 0)
  //   - "Skip palier →"  = fast-forward jusqu'au prochain milestone
  //   - "Reset journal"  = vide currentStreakStart, streakHistory, logs
  //
  // Pour que les logs debug soient visibles dans l'historique, on écrit un log
  // [debug] held sur chaque jour passé du streak. À la rechute / reset, on les
  // nettoie via debugClearDebugLogs().

  // Crée un log "tenu" debug pour une date donnée (mode abstinence)
  function debugMakeHeldLogAbstain(dateISO) {
    state.logs[dateISO] = {
      title: '[debug] jour tenu',
      kind: 'held',
      note: '',
      savedAt: new Date().toISOString()
    };
  }

  // Action : avance le streak de 1 jour. Si le streak n'est pas démarré, le démarre à today.
  function debugAddDayAbstain() {
    const today = todayISO();
    if (!state.currentStreakStart) {
      // Pas de streak en cours : on démarre aujourd'hui (streak = 1 jour)
      state.currentStreakStart = today;
      debugMakeHeldLogAbstain(today);
      return;
    }
    // Déjà un streak : on recule la date de départ d'un jour pour ajouter +1
    state.currentStreakStart = dateAddDays(state.currentStreakStart, -1);
    // Et on pose un log [debug] held sur ce nouveau jour de départ pour la trace dans l'historique
    debugMakeHeldLogAbstain(state.currentStreakStart);
  }

  // Action : avance le streak de N jours d'un coup.
  function debugAddNDaysAbstain(n) {
    const today = todayISO();
    if (!state.currentStreakStart) {
      // Démarrer à today, puis reculer de (n-1) → streak = n jours
      state.currentStreakStart = today;
      debugMakeHeldLogAbstain(today);
      n = n - 1;
    }
    for (let i = 0; i < n; i++) {
      state.currentStreakStart = dateAddDays(state.currentStreakStart, -1);
      debugMakeHeldLogAbstain(state.currentStreakStart);
    }
  }

  // Action : simule une rechute aujourd'hui. Utilise la même logique que markTodayRelapse
  // pour garder la cohérence des invariants (archivage du streak, reset à 0).
  // Différence : on tag la note comme [debug] pour pouvoir la nettoyer ensuite si besoin,
  // et on accepte de remplacer un log "held" existant aujourd'hui.
  function debugAddRelapseAbstain() {
    const today = todayISO();
    // Archiver le streak en cours s'il existe
    if (state.currentStreakStart) {
      const heldBeforeToday = daysBetween(state.currentStreakStart, today);
      if (heldBeforeToday > 0) {
        if (!Array.isArray(state.streakHistory)) state.streakHistory = [];
        state.streakHistory.push({
          startDate: state.currentStreakStart,
          endDate: dateAddDays(today, -1),
          days: heldBeforeToday,
          relapseNote: '[debug] rechute test'
        });
      }
    }
    state.currentStreakStart = null;
    state.logs[today] = {
      title: '[debug] jour raté',
      kind: 'relapse',
      note: '[debug] rechute test',
      savedAt: new Date().toISOString()
    };
  }

  // Action : fast-forward jusqu'au prochain milestone (1j → 3j → 7j → 14j → 30j → ...)
  function debugSkipMilestoneAbstain() {
    const cur = currentStreakDays();
    const next = nextMilestone(cur);
    if (!next) {
      console.warn('[debug] Aucun milestone suivant trouvé');
      return;
    }
    const today = todayISO();
    // On veut currentStreakDays() === next.days, donc daysBetween(start, today)+1 === next.days
    // → start = today - (next.days - 1)
    const newStart = dateAddDays(today, -(next.days - 1));
    // Nettoyer les anciens logs debug avant de réécrire
    debugClearDebugLogs();
    state.currentStreakStart = newStart;
    // Poser des logs [debug] held sur quelques jours autour de today pour que ça apparaisse
    // dans l'historique (on ne pose pas tout pour ne pas exploser localStorage si le milestone
    // est à 2 ans). On pose les 7 derniers jours du streak.
    const markFrom = dateAddDays(today, -6);
    let cursor = markFrom < newStart ? newStart : markFrom;
    while (cursor <= today) {
      debugMakeHeldLogAbstain(cursor);
      cursor = dateAddDays(cursor, 1);
    }
  }

  // Action : reset complet du journal abstinence
  function debugResetJournalAbstain() {
    state.currentStreakStart = null;
    state.streakHistory = [];
    state.logs = {};
  }

  // ----- DISPATCH (façade publique) -------------------------------------------

  function debugAddDay(success) {
    if (state.journalMode === 'abstain') {
      // En abstinence : "réussi" = +1 jour de streak, "raté" = rechute simulée
      if (success) debugAddDayAbstain();
      else         debugAddRelapseAbstain();
    } else {
      debugAddDayTaper(success);
    }
    saveState();
    render();
  }

  function debugAddEmptyDay() {
    if (state.journalMode === 'abstain') {
      // Pas de notion de "jour vide" en abstinence (le streak avance tout seul,
      // les logs ne sont pas requis). On signale et on s'arrête.
      console.warn('[debug] "+1 jour vide" ne s\'applique pas en mode abstinence — utilise "+1 jour" pour faire avancer le streak.');
      return;
    }
    debugAddEmptyDayTaper();
    saveState();
    render();
  }

  function debugAdd7Days() {
    if (state.journalMode === 'abstain') {
      debugAddNDaysAbstain(7);
    } else {
      debugAdd7DaysTaper();
    }
    saveState();
    render();
  }

  function debugSkipPalier() {
    if (state.journalMode === 'abstain') {
      debugSkipMilestoneAbstain();
    } else {
      debugSkipPalierTaper();
    }
    saveState();
    render();
  }

  function debugResetJournal() {
    const msg = state.journalMode === 'abstain'
      ? '[debug] Reset le journal ? Streak en cours, historique des streaks et logs seront effacés. Le label d\'abstinence est conservé.'
      : '[debug] Reset le journal ? Tous les logs et la progression seront effacés. La config (durée, courbe) est conservée.';
    if (!confirm(msg)) return;
    if (state.journalMode === 'abstain') {
      debugResetJournalAbstain();
    } else {
      debugResetJournalTaper();
    }
    saveState();
    render();
  }

  function renderHero() {
    if (!state.started) return;
    const u = getUnit();
    const p = currentPalier();
    const phaseLabel = p.phase === 3
      ? i18n.t('addiction.hero_phase_libre')
      : i18n.t('addiction.hero_phase');
    document.getElementById('hero-phase').textContent = phaseLabel;

    // «  Widgets objectifs du jour « 
    const objContainer = document.getElementById('today-objectives');
    let objHTML = '';

    const todayDose = p.dose;

    // Widget dose cible
    objHTML += `
      <div class="objective-widget objective-widget--dose">
        <div class="objective-widget__icon">❎</div>
        <div class="objective-widget__label">${i18n.t('addiction.hero_dose_label')}</div>
        <div class="objective-widget__value">${u.shortFormat(todayDose)}<span class="objective-widget__unit">${u.perDay}</span></div>
      </div>`;

    // Widget conso restante
    // Si currentDoses n'est pas encore peuplé (premier render), lire depuis le log
    let consoTotal = currentDoses.reduce((s, d) => s + d.value, 0);
    if (currentDoses.length === 0) {
      const log = state.logs[todayISO()];
      if (log) {
        if (Array.isArray(log.doses)) {
          consoTotal = log.doses.reduce((s, d) => s + (typeof d === 'object' ? d.value : d), 0);
        } else if (log.dose != null) {
          consoTotal = parseFloat(log.dose) || 0;
        }
      }
    }
    const consoRestante = todayDose - consoTotal;
    const consoNegative = consoRestante <= 0;
    objHTML += `
      <div class="objective-widget objective-widget--dose">
        <div class="objective-widget__icon">❎</div>
        <div class="objective-widget__label">${i18n.t('addiction.hero_conso_remaining')}</div>
        <div class="objective-widget__value" style="${consoNegative ? 'color:#e53935' : ''}">${u.shortFormat(consoRestante)}</div>
      </div>`;

    // Widget phase libre (uniquement en phase 3)
    if (p.phase === 3) {
      objHTML += `
      <div class="objective-widget objective-widget--free">
        <div class="objective-widget__icon">✦</div>
        <div class="objective-widget__label">${i18n.t('addiction.hero_libre_label')}</div>
        <div class="objective-widget__value">${i18n.t('addiction.hero_libre_value')}</div>
        <div class="objective-widget__sub">${i18n.t('addiction.hero_libre_sub')}</div>
      </div>`;
    }

    objContainer.innerHTML = objHTML;
  }

  function updateNextDayLabel() {
    const el = document.getElementById('log-next-day');
    if (!el) return;
    const now = new Date();
    // Prochain changement de jour = prochaine occurrence de DAY_BOUNDARY_HOUR:00
    const next = new Date(now);
    next.setSeconds(0, 0);
    if (now.getHours() >= DAY_BOUNDARY_HOUR) {
      // Le boundary d'aujourd'hui est passé → prochain = demain à DAY_BOUNDARY_HOUR
      next.setDate(next.getDate() + 1);
    }
    next.setHours(DAY_BOUNDARY_HOUR, 0, 0, 0);
    const diffMs = next - now;
    const diffH = Math.floor(diffMs / 3600000);
    const diffM = Math.floor((diffMs % 3600000) / 60000);
    if (diffH > 0) {
      el.textContent = i18n.t('addiction.update_in_h', {h: diffH, m: String(diffM).padStart(2, '0')});
    } else {
      el.textContent = i18n.t('addiction.update_in_m', {m: diffM});
    }
  }

  function renderTodayLog() {
    if (!state.started) return;
    const u = getUnit();
    const today = todayISO();

    // Afficher la date effective à côté de "Log du jour"
    const effDateEl = document.getElementById('log-effective-date');
    if (effDateEl) effDateEl.textContent = formatDateFR(today);

    // Afficher le temps restant avant le prochain jour
    updateNextDayLabel();
    const log = state.logs[today] || {};
    const p = currentPalier();

    // Label dynamique de la zone de saisie — on garde le label HTML statique avec le bouton ajouter
    // Suffixe input
    const todayUnitEl = document.getElementById('today-unit');
    if (todayUnitEl) todayUnitEl.textContent = u.shortSuffix;

    // Step et min de l'input
    const todayDoseEl = document.getElementById('today-dose');
    if (todayDoseEl) {
      todayDoseEl.step = u.step;
      todayDoseEl.min = 0;
    }

    // Cible affichée à côté de l'input
    const todayTarget = p.dose;
    document.getElementById('today-target').textContent = i18n.t('addiction.today_target_display', {dose: roundDose(todayTarget), unit: u.shortSuffix});

    // Reset des champs (au cas où on revient sur l'onglet après un reset)
    const titleEl = document.getElementById('today-title');
    if (titleEl) {
      if (log.title) {
        titleEl.value = log.title;
        currentTitle = log.title;
      } else {
        titleEl.value = '';
        currentTitle = '';
      }
    }

    // Multi-doses : charger depuis le log (rétrocompat : ancien format dose unique → array)
    if (Array.isArray(log.doses) && log.doses.length > 0) {
      currentDoses = log.doses.map(d => typeof d === 'object' ? {...d} : { value: d, time: null });
    } else if (log.dose !== undefined && log.dose !== '' && log.dose !== null) {
      currentDoses = [{ value: parseFloat(log.dose), time: log.savedAt || null }];
    } else {
      currentDoses = [];
    }
    document.getElementById('today-dose').value = '';
    currentDose = '';
    renderDoseList();

    // Multi-notes : charger depuis le log (rétrocompat : ancien format note string → array)
    if (Array.isArray(log.notes) && log.notes.length > 0) {
      currentNotes = log.notes.map(n => typeof n === 'object' ? {...n} : { text: n, time: null });
    } else if (log.note && log.note.trim()) {
      currentNotes = [{ text: log.note, time: log.savedAt || null }];
    } else {
      currentNotes = [];
    }
    document.getElementById('today-note').value = '';
    currentNote = '';
    renderTextNoteList('taper');

    // Audios vocaux
    currentAudios = Array.isArray(log.audios) ? [...log.audios] : [];
    renderVocalList('taper');

    // save status
    updateSaveStatus();
  }

  function updateSaveStatus() {
    const today = todayISO();
    const log = state.logs[today];
    const status = document.getElementById('save-status');
    if (log && log.savedAt) {
      const t = new Date(log.savedAt).toLocaleTimeString('fr-FR', {hour:'2-digit', minute:'2-digit'});
      status.textContent = i18n.t('addiction.save_status_saved_at', {t});
      status.classList.add('ok');
    } else {
      status.textContent = i18n.t('addiction.save_status_empty');
      status.classList.remove('ok');
    }
  }

  function renderOverview() {
    if (!state.started) return;
    const u = getUnit();
    const tbl = document.getElementById('overview-table');

    let head = `<thead><tr><th>${i18n.t('addiction.overview_th_week')}</th><th>${i18n.t('addiction.overview_th_target')}</th>`;
    head += '</tr></thead><tbody>';

    let html = head;
    PALIERS.forEach((p, idx) => {
      let cls = '';
      if (p.week === state.currentWeek) cls = 'current';
      else if (p.week < state.currentWeek) cls = 'done';
      const isLibre = p.week === state.totalWeeks + 1;

      const doseCell = `<span class="dose-pill">${u.format(p.dose)}</span>`;

      let row = `<tr class="${cls}">
        <td><span class="week-num">${isLibre ? i18n.t('addiction.overview_libre') : i18n.t('addiction.overview_week_prefix') + p.week}</span></td>
        <td>${doseCell}</td>`;

      row += '</tr>';
      html += row;
    });
    html += '</tbody>';
    tbl.innerHTML = html;
  }

  function renderHistory() {
    if (!state.started) return;
    if (state.journalMode === 'abstain') {
      renderHistoryAbstain();
      return;
    }
    const list = document.getElementById('history-list');
    const dates = Object.keys(state.logs).sort().reverse();
    if (dates.length === 0) {
      list.innerHTML = `<p style="color:var(--ink-mute); font-style:italic; padding:20px 0;">${i18n.t('addiction.history_empty')}</p>`;
      return;
    }
    let html = '';
    dates.forEach(date => {
      const log = state.logs[date];

      const logUnit = UNIT_TYPES[log.unitType];
      const targetDose = log.targetDose;

      // Statut du jour (basé sur la dose attendue ce jour-là)
      const dayPalier = { phase: log.phase, dose: targetDose };
      const status = dayStatus(date, log, dayPalier);
      let statusHtml;
      if (status === 'done') {
        statusHtml = `<span class="history-status done">${i18n.t('addiction.history_status_done')}</span>`;
      } else if (status === 'miss') {
        statusHtml = `<span class="history-status miss">${i18n.t('addiction.history_status_miss')}</span>`;
      } else {
        statusHtml = `<span class="history-status pending">${i18n.t('addiction.history_status_pending')}</span>`;
      }

      // Dose : conso / cible (formatée selon l'unité du log)
      const doseLogged = (log.dose === null || log.dose === undefined || log.dose === '')
        ? null
        : parseFloat(log.dose);
      let doseValueHtml;
      if (doseLogged === null) {
        doseValueHtml = `<span class="history-meta-value">— / ${logUnit.format(targetDose)}</span>`;
      } else {
        const tolerance = logUnit.tolerance != null ? logUnit.tolerance : 0.01;
        const cls = doseLogged > targetDose + tolerance ? 'over' : 'under-or-equal';
        doseValueHtml = `<span class="history-meta-value ${cls}">${logUnit.format(doseLogged)} / ${logUnit.format(targetDose)}</span>`;
      }

      // Titre du jour
      const title = log.title && log.title.trim()
        ? `<div class="history-title">${escapeHtml(log.title.trim())}</div>`
        : `<div class="history-title empty">${i18n.t('addiction.history_no_title')}</div>`;

      // Notes (multi-notes ou rétrocompat)
      let noteHtml = '';
      let hasNotes = false;
      if (Array.isArray(log.notes) && log.notes.length > 0) {
        hasNotes = true;
        noteHtml = log.notes.map(n => {
          const entry = typeof n === 'object' ? n : { text: n, time: null };
          const timeStr = entry.time ? `<span style="font-family:var(--mono); font-size:11px; color:var(--ink-mute); margin-left:6px;">${new Date(entry.time).toLocaleTimeString('fr-FR', {hour:'2-digit', minute:'2-digit'})}</span>` : '';
          return `<div class="history-note">${escapeHtml(entry.text)}${timeStr}</div>`;
        }).join('');
      } else if (log.note && log.note.trim()) {
        hasNotes = true;
        noteHtml = `<div class="history-note">${escapeHtml(log.note)}</div>`;
      }

      // Doses détaillées (multi-doses)
      let dosesDetailHtml = '';
      if (Array.isArray(log.doses) && log.doses.length > 1) {
        dosesDetailHtml = '<div style="margin-top:4px; font-size:12px; color:var(--ink-mute); font-family:var(--mono);">';
        log.doses.forEach(d => {
          const entry = typeof d === 'object' ? d : { value: d, time: null };
          const timeStr = entry.time ? new Date(entry.time).toLocaleTimeString('fr-FR', {hour:'2-digit', minute:'2-digit'}) + ' — ' : '';
          dosesDetailHtml += `<div>${timeStr}${logUnit.format(entry.value)}</div>`;
        });
        dosesDetailHtml += '</div>';
      }

      const audiosHtml = renderAudiosHtml(log.audios);

      html += `<div class="history-day">
        <div class="history-date-row">
          <div class="history-date">${formatDateNumeric(date)}</div>
          ${statusHtml}
        </div>
        ${title}
        <div class="history-box">
          <div class="history-box-label">${i18n.t('addiction.history_box_dose')}</div>
          <div class="history-meta">
            <span class="history-meta-item">
              ${doseValueHtml}
            </span>
          </div>
          ${dosesDetailHtml}
        </div>
        ${hasNotes ? `<div class="history-box">
          <div class="history-box-label">${i18n.t('addiction.history_box_notes')}</div>
          ${noteHtml}
        </div>` : ''}
        ${audiosHtml ? `<div class="history-box">
          <div class="history-box-label">${i18n.t('addiction.history_box_audio')}</div>
          ${audiosHtml}
        </div>` : ''}
      </div>`;
    });
    list.innerHTML = html;
  }

  // ============ RENDER — mode abstinence ============

  // Status bar abstinence : streak en cours / record / prochain palier
  function renderStatusBarAbstain() {
    const cur = currentStreakDays();
    const best = bestStreakDays();
    const next = nextMilestone(cur);

    const curEl = document.getElementById('status-abstain-current');
    const recEl = document.getElementById('status-abstain-record');
    const nextEl = document.getElementById('status-abstain-next');

    if (curEl) {
      curEl.innerHTML = cur === 0 ? i18n.t('addiction.abstain_streak_days_none') : i18n.t('addiction.abstain_streak_days', {n: cur});
    }
    if (recEl) {
      recEl.innerHTML = best === 0 ? '—' : i18n.t('addiction.abstain_streak_days', {n: best});
    }
    if (nextEl) {
      if (next) {
        const n = next.days - cur;
        nextEl.innerHTML = i18n.t('addiction.abstain_next_label_detail', {label: next.label, n});
      } else {
        nextEl.textContent = '—';
      }
    }
  }

  // Vue principale d'aujourd'hui en mode abstinence
  function renderTodayAbstain() {
    const cur = currentStreakDays();
    const best = bestStreakDays();
    const today = todayISO();
    const todayLog = state.logs[today] || null;
    const next = nextMilestone(cur);
    const last = lastMilestoneReached(cur);

    // Eyebrow
    const eyebrowEl = document.getElementById('abstain-eyebrow');
    if (eyebrowEl) {
      if (cur === 0 && state.streakHistory.length === 0) {
        eyebrowEl.textContent = i18n.t('addiction.abstain_eyebrow_not_started');
      } else if (cur === 0) {
        eyebrowEl.textContent = i18n.t('addiction.abstain_eyebrow_reset');
      } else if (last) {
        const key = last.gender === 'f' ? 'addiction.abstain_eyebrow_milestone_f' : 'addiction.abstain_eyebrow_milestone_m';
        eyebrowEl.textContent = i18n.t(key, {label: last.label});
      } else {
        eyebrowEl.textContent = i18n.t('addiction.abstain_eyebrow_ongoing');
      }
    }

    // Compteur principal
    const valEl = document.getElementById('abstain-counter-value');
    const unitEl = document.getElementById('abstain-counter-unit');
    if (valEl) valEl.textContent = cur;
    if (unitEl) {
      if (state.abstainLabel && state.abstainLabel.trim()) {
        unitEl.innerHTML = i18n.t('addiction.abstain_counter_unit_custom', {n: cur, label: escapeHtml(state.abstainLabel.trim())});
      } else {
        unitEl.innerHTML = i18n.t('addiction.abstain_counter_unit_default', {n: cur});
      }
    }

    // Date de début du streak
    const sinceEl = document.getElementById('abstain-since');
    if (sinceEl) {
      if (state.currentStreakStart) {
        sinceEl.innerHTML = i18n.t('addiction.abstain_since', {date: formatDateNumeric(state.currentStreakStart)});
      } else {
        sinceEl.innerHTML = i18n.t('addiction.abstain_not_started');
      }
    }

    // Record
    const recordRow = document.getElementById('abstain-record-row');
    const recordVal = document.getElementById('abstain-record-value');
    if (recordRow && recordVal) {
      if (best > 0) {
        recordRow.classList.remove('hidden');
        recordVal.innerHTML = formatStreakDays(best);
      } else {
        // Pas de record encore : on cache la ligne (premier streak en cours)
        recordRow.classList.add('hidden');
      }
    }

    // Prochain palier (barre de progression)
    const milestoneRow = document.getElementById('abstain-milestone-row');
    const milestoneFill = document.getElementById('abstain-milestone-fill');
    const milestoneTarget = document.getElementById('abstain-milestone-target');
    if (next) {
      milestoneRow.classList.remove('hidden');
      // Progression : on prend le seuil précédent comme base
      const baseFromDays = last ? last.days : 0;
      const span = next.days - baseFromDays;
      const progress = Math.max(0, cur - baseFromDays);
      const pct = span > 0 ? Math.min(100, (progress / span) * 100) : 0;
      milestoneFill.style.width = pct + '%';
      milestoneTarget.innerHTML = i18n.t('addiction.abstain_milestone_remaining', {label: next.label, n: next.days - cur});
    } else {
      milestoneRow.classList.add('hidden');
    }

    // Action status (déjà marqué tenu / rechute / rien)
    const actionStatusEl = document.getElementById('abstain-action-status');
    const holdBtn = document.getElementById('abstain-hold-btn');
    const relapseBtn = document.getElementById('abstain-relapse-btn');

    if (actionStatusEl && holdBtn && relapseBtn) {
      // Reset des classes
      holdBtn.classList.remove('marked');
      relapseBtn.classList.remove('marked');

      if (todayLog && todayLog.kind === 'held') {
        const t = todayLog.savedAt ? new Date(todayLog.savedAt).toLocaleTimeString('fr-FR', {hour:'2-digit', minute:'2-digit'}) : '';
        actionStatusEl.innerHTML = t ? i18n.t('addiction.abstain_today_held_at', {t}) : i18n.t('addiction.abstain_today_held');
        actionStatusEl.classList.add('ok');
        actionStatusEl.classList.remove('relapse');
        holdBtn.classList.add('marked');
      } else if (todayLog && todayLog.kind === 'relapse') {
        const t = todayLog.savedAt ? new Date(todayLog.savedAt).toLocaleTimeString('fr-FR', {hour:'2-digit', minute:'2-digit'}) : '';
        actionStatusEl.innerHTML = t ? i18n.t('addiction.abstain_today_relapse_at', {t}) : i18n.t('addiction.abstain_today_relapse');
        actionStatusEl.classList.add('relapse');
        actionStatusEl.classList.remove('ok');
        relapseBtn.classList.add('marked');
      } else {
        actionStatusEl.textContent = i18n.t('addiction.abstain_action_status_empty');
        actionStatusEl.classList.remove('ok');
        actionStatusEl.classList.remove('relapse');
      }
    }

    // Multi-notes : charger depuis le log (rétrocompat : ancien format note string → array)
    if (todayLog && Array.isArray(todayLog.notes) && todayLog.notes.length > 0) {
      currentNotes = todayLog.notes.map(n => typeof n === 'object' ? {...n} : { text: n, time: null });
    } else if (todayLog && todayLog.note && todayLog.note.trim()) {
      currentNotes = [{ text: todayLog.note, time: todayLog.savedAt || null }];
    } else {
      currentNotes = [];
    }
    const noteEl = document.getElementById('abstain-note');
    if (noteEl) noteEl.value = '';
    currentNote = '';
    renderTextNoteList('abstain');

    // Audios vocaux
    currentAudios = todayLog && Array.isArray(todayLog.audios) ? [...todayLog.audios] : [];
    renderVocalList('abstain');

    // Liste des paliers symboliques
    renderMilestonesList(cur);
  }

  function renderMilestonesList(currentDays) {
    const container = document.getElementById('abstain-milestones-list');
    if (!container) return;
    const milestones = getMilestones(currentDays);
    let html = '';
    milestones.forEach(m => {
      const reached = currentDays >= m.days;
      const isNext = !reached && m.days === (nextMilestone(currentDays) || {}).days;
      let cls = 'milestone-item';
      if (reached) cls += ' reached';
      if (isNext) cls += ' next';
      html += `<div class="${cls}">
        <div class="milestone-marker">${reached ? '✓' : (isNext ? '→' : 'â⬹')}</div>
        <div class="milestone-text">
          <div class="milestone-label">${m.label}</div>
          <div class="milestone-note">${m.note}</div>
        </div>
      </div>`;
    });
    container.innerHTML = html;
  }

  // Vue historique en mode abstinence : liste des streaks passés + logs jour par jour
  function renderHistoryAbstain() {
    const list = document.getElementById('history-list');
    const dates = Object.keys(state.logs).sort().reverse();
    const history = Array.isArray(state.streakHistory) ? state.streakHistory : [];

    if (dates.length === 0 && history.length === 0) {
      list.innerHTML = `<p style="color:var(--ink-mute); font-style:italic; padding:20px 0;">${i18n.t('addiction.history_empty')}</p>`;
      return;
    }

    let html = '';

    // Section : streaks précédents
    if (history.length > 0) {
      html += `<div class="history-section-title">${i18n.t('addiction.abstain_hist_section_streaks')}</div>`;
      // Plus récents en premier
      const sorted = [...history].sort((a, b) => (b.endDate || '').localeCompare(a.endDate || ''));
      sorted.forEach(s => {
        const noteHtml = s.relapseNote && s.relapseNote.trim()
          ? `<div class="streak-history-note">${escapeHtml(s.relapseNote)}</div>`
          : '';
        html += `<div class="streak-history-item">
          <div class="streak-history-row">
            <div class="streak-history-days">${i18n.t('addiction.abstain_hist_days', {n: s.days})}</div>
            <div class="streak-history-dates">${i18n.t('addiction.abstain_hist_period', {start: formatDateNumeric(s.startDate), end: formatDateNumeric(s.endDate)})}</div>
          </div>
          ${noteHtml}
        </div>`;
      });
    }

    // Section : logs jour par jour (récents)
    if (dates.length > 0) {
      html += `<div class="history-section-title" style="margin-top:24px;">${i18n.t('addiction.abstain_hist_section_days')}</div>`;
      dates.forEach(date => {
        const log = state.logs[date];
        const statusHtml = log.kind === 'held'
          ? `<span class="history-status done">${i18n.t('addiction.history_status_held')}</span>`
          : `<span class="history-status miss">${i18n.t('addiction.history_status_relapse')}</span>`;
        const hasNote = log.note && log.note.trim();
        const noteHtml = hasNote
          ? `<div class="history-note">${escapeHtml(log.note)}</div>`
          : '';
        const audiosHtml = renderAudiosHtml(log.audios);
        html += `<div class="history-day">
          <div class="history-date-row">
            <div class="history-date">${formatDateNumeric(date)}</div>
            ${statusHtml}
          </div>
          ${hasNote ? `<div class="history-box">
            <div class="history-box-label">${i18n.t('addiction.history_box_notes')}</div>
            ${noteHtml}
          </div>` : ''}
          ${audiosHtml ? `<div class="history-box">
            <div class="history-box-label">${i18n.t('addiction.history_box_audio')}</div>
            ${audiosHtml}
          </div>` : ''}
        </div>`;
      });
    }

    list.innerHTML = html;
  }


  function escapeHtml(s) {
    if (typeof s !== 'string') return s;
    return s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  function updateProgress() {
    if (!state.started) return;
    // Progrès global = paliers complétés + fraction du palier en cours.
    // Chaque palier vaut 1/totalWeeks. Dans le palier courant, on ajoute (jours tenus / 7) ✕ (1/totalWeeks).
    const completedWeeks = Math.max(0, state.currentWeek - 1);
    const finished = state.currentWeek > state.totalWeeks;
    let pct;
    if (finished) {
      pct = 100;
    } else {
      const consec = Math.min(consecutiveDoneDays(), 7);
      const fraction = consec / 7;
      pct = Math.min(100, ((completedWeeks + fraction) / state.totalWeeks) * 100);
    }
    document.getElementById('overall-progress').style.width = pct + '%';
  }

  // ============ EVENTS ============
  function bindEvents() {
    // Bouton "Nouveau journal" depuis la page d'accueil
    const createBtn = document.getElementById('create-journal-btn');
    if (createBtn) {
      createBtn.addEventListener('click', () => {
        // Crée un journal vide avec un nom par défaut, ouvre la welcome dessus pour configuration
        const journals = loadJournalsIndex();
        const defaultName = journals.length === 0 ? i18n.t('addiction.journal_default_name') : `${i18n.t('addiction.journal_default_name')} ${journals.length + 1}`;
        const j = createJournal(defaultName);
        openJournal(j.id);
        // openJournal a re-rendu — l'utilisateur va voir la welcome avec le nom pré-rempli
        // Focus le champ nom pour qu'il puisse le modifier directement
        setTimeout(() => {
          const nameInput = document.getElementById('config-journal-name');
          if (nameInput) {
            nameInput.focus();
            nameInput.select();
          }
        }, 50);
      });
    }

    // Bouton "Import Journal" depuis la page d'accueil
    const importBtn = document.getElementById('import-journal-btn');
    const importFile = document.getElementById('import-journal-file');
    if (importBtn && importFile) {
      importBtn.addEventListener('click', () => importFile.click());
      importFile.addEventListener('change', e => {
        const file = e.target.files[0];
        if (!file) return;
        VitalStore.importJSON(file).then(data => {
          const meta = data._meta || {};
          const name = (meta.name || file.name.replace(/\.json$/i, '')).trim() || 'Import';
          const id = newJournalId();
          const journal = {
            id,
            name,
            createdAt: meta.createdAt || new Date().toISOString()
          };
          const index = loadJournalsIndex();
          index.push(journal);
          saveJournalsIndex(index);
          // Sauvegarder le state (tout sauf _meta)
          const stateData = Object.assign({}, data);
          delete stateData._meta;
          VitalStore.saveItem(journalStorageKey(id), stateData);
          renderHome();
        }).catch(err => {
          alert(i18n.t('addiction.alert_import_invalid'));
          console.error('Import error:', err);
        }).finally(() => {
          importFile.value = '';
        });
      });
    }

    // Raisons : ajouter / supprimer
    const reasonAddBtn = document.getElementById('reason-add-btn');
    const reasonsList = document.getElementById('config-reasons-list');
    if (reasonAddBtn && reasonsList) {
      reasonAddBtn.addEventListener('click', () => {
        const item = document.createElement('div');
        item.className = 'reason-item';
        item.innerHTML = `<input type="text" class="reason-input" maxlength="120" placeholder="${i18n.t('addiction.config_reason_placeholder')}">`
          + `<button type="button" class="reason-remove-btn" title="${i18n.t('addiction.reason_remove_title')}">✕</button>`;
        reasonsList.appendChild(item);
        item.querySelector('input').focus();
      });
      reasonsList.addEventListener('click', (e) => {
        const btn = e.target.closest('.reason-remove-btn');
        if (!btn) return;
        const item = btn.closest('.reason-item');
        // Garder au moins un champ vide
        if (reasonsList.querySelectorAll('.reason-item').length > 1) {
          item.remove();
        } else {
          item.querySelector('input').value = '';
        }
      });
    }

    // Règles : ajouter / supprimer
    const ruleAddBtn = document.getElementById('rule-add-btn');
    const rulesList = document.getElementById('config-rules-list');
    if (ruleAddBtn && rulesList) {
      ruleAddBtn.addEventListener('click', () => {
        const item = document.createElement('div');
        item.className = 'reason-item';
        item.innerHTML = `<input type="text" class="rule-input" maxlength="120" placeholder="${i18n.t('addiction.config_rule_placeholder')}">`
          + `<button type="button" class="reason-remove-btn" title="${i18n.t('addiction.rule_remove_title')}">✕</button>`;
        rulesList.appendChild(item);
        item.querySelector('input').focus();
      });
      rulesList.addEventListener('click', (e) => {
        const btn = e.target.closest('.reason-remove-btn');
        if (!btn) return;
        const item = btn.closest('.reason-item');
        if (rulesList.querySelectorAll('.reason-item').length > 1) {
          item.remove();
        } else {
          item.querySelector('input').value = '';
        }
      });
    }

    // Bouton "Retour à l'accueil" dans le header
    const backBtn = document.getElementById('back-home-btn');
    if (backBtn) {
      backBtn.addEventListener('click', () => {
        goHome();
      });
    }

    // Start button (welcome screen)
    const startBtn = document.getElementById('start-btn');
    if (startBtn) {
      startBtn.addEventListener('click', () => {
        const nameInput = document.getElementById('config-journal-name');
        const errEl = document.getElementById('config-error');
        const journalName = (nameInput ? nameInput.value : '').trim();

        // Validation du nom (commune aux deux modes)
        if (!journalName) {
          if (errEl) errEl.textContent = i18n.t('addiction.config_error_name_required');
          if (nameInput) nameInput.focus();
          return;
        }

        // Si un programme existe déjà sur ce journal, demander confirmation pour écraser
        if (hasExistingProgram()) {
          if (!confirm(i18n.t('addiction.config_confirm_restart'))) return;
        }

        // Mettre à jour le nom dans l'index si modifié
        if (activeJournalId) {
          const index = loadJournalsIndex();
          const j = index.find(x => x.id === activeJournalId);
          if (j && j.name !== journalName) {
            j.name = journalName;
            saveJournalsIndex(index);
          }
        }

        // Récupérer les raisons (commun aux deux modes)
        const reasonInputs = document.querySelectorAll('#config-reasons-list .reason-input');
        const reasons = [];
        reasonInputs.forEach(inp => { const v = inp.value.trim(); if (v) reasons.push(v); });

        // Au moins une raison obligatoire
        const reasonsErrEl = document.getElementById('config-reasons-error');
        if (reasonsErrEl) reasonsErrEl.textContent = '';
        if (reasons.length === 0) {
          if (reasonsErrEl) reasonsErrEl.textContent = i18n.t('addiction.config_error_reasons_required');
          const firstReasonInput = document.querySelector('#config-reasons-list .reason-input');
          if (firstReasonInput) firstReasonInput.focus();
          return;
        }

        state.reasons = reasons;

        // Récupérer les règles (commun aux deux modes, optionnel)
        const ruleInputs = document.querySelectorAll('#config-rules-list .rule-input');
        const rules = [];
        ruleInputs.forEach(inp => { const v = inp.value.trim(); if (v) rules.push(v); });
        state.rules = rules;

        // ============ Mode ABSTINENCE ============
        if (state.journalMode === 'abstain') {
          if (errEl) errEl.textContent = '';
          // Récupérer le label abstinence (texte libre, optionnel)
          const abstainLabelInput = document.getElementById('config-abstain-label');
          const abstainLabel = abstainLabelInput ? abstainLabelInput.value.trim() : '';
          state.started = true;
          state.abstainLabel = abstainLabel;
          state.palierStartDate = todayISO();
          // Reset des champs spécifiques abstinence
          state.currentStreakStart = null;
          state.streakHistory = [];
          state.logs = {};
          saveState();
          render();
          return;
        }

        // ============ Mode DESCENTE (taper) ============
        const startInput = document.getElementById('config-start-dose');
        const endInput = document.getElementById('config-end-dose');
        const u = getUnit();
        let startDose = parseFloat(startInput.value);
        let endDose = parseFloat(endInput.value);

        // Pour les types entiers : forcer l'arrondi
        if (u.integerOnly) {
          startDose = Math.round(startDose);
          endDose = Math.round(endDose);
        }

        // Validation
        if (isNaN(startDose) || startDose <= 0) {
          errEl.textContent = i18n.t('addiction.config_error_start_positive', {label: u.configStartLabel});
          startInput.focus();
          return;
        }
        if (isNaN(endDose) || endDose < 0) {
          errEl.textContent = i18n.t('addiction.config_error_end_positive', {label: u.configEndLabel});
          endInput.focus();
          return;
        }
        if (endDose >= startDose) {
          errEl.textContent = i18n.t('addiction.config_error_end_lower');
          endInput.focus();
          return;
        }
        errEl.textContent = '';

        // Récupère et valide la durée (slider/input)
        const durInput = document.getElementById('config-duration-input');
        let totalWeeks = durInput ? parseInt(durInput.value, 10) : state.totalWeeks;
        if (isNaN(totalWeeks) || totalWeeks < MIN_WEEKS) totalWeeks = MIN_WEEKS;
        if (totalWeeks > MAX_WEEKS) totalWeeks = MAX_WEEKS;

        // Sécurité : on s'assure que la courbe est valide
        const curveType = (state.curveType && CURVES[state.curveType]) ? state.curveType : DEFAULT_CURVE;

        state.started = true;
        // unitType est déjà à jour dans state (mis à jour par les clics sur les cartes)
        state.startDose = startDose;
        state.endDose = endDose;
        state.totalWeeks = totalWeeks;
        state.curveType = curveType;
        state.currentWeek = 1;
        state.palierStartDate = todayISO();
        state.logs = {};
        PALIERS = buildPaliers(startDose, endDose, totalWeeks, curveType);
        saveState();
        render();
      });
    }

    // Live preview des paliers quand on change les inputs (start dose / end dose)
    const startInput = document.getElementById('config-start-dose');
    const endInput = document.getElementById('config-end-dose');
    if (startInput && endInput) {
      const updatePreview = () => renderConfigPreview();
      startInput.addEventListener('input', updatePreview);
      endInput.addEventListener('input', updatePreview);
    }

    // Slider durée + input numérique synchronisés
    const durSlider = document.getElementById('config-duration');
    const durInput = document.getElementById('config-duration-input');
    const setDuration = (val) => {
      let n = parseInt(val, 10);
      if (isNaN(n)) return;
      if (n < MIN_WEEKS) n = MIN_WEEKS;
      if (n > MAX_WEEKS) n = MAX_WEEKS;
      state.totalWeeks = n;
      if (durSlider) durSlider.value = n;
      if (durInput) durInput.value = n;
      syncDurationPresets(n);
      renderConfigPreview();
      updateWelcomeEndDate();
    };
    if (durSlider) {
      durSlider.addEventListener('input', e => setDuration(e.target.value));
    }
    if (durInput) {
      durInput.addEventListener('input', e => setDuration(e.target.value));
      // Sur blur, on re-clamp et corrige si l'utilisateur a tapé hors limites
      durInput.addEventListener('blur', e => setDuration(e.target.value));
    }

    // Boutons preset durée
    document.querySelectorAll('#duration-presets .preset-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const w = parseInt(btn.dataset.weeks, 10);
        if (!isNaN(w)) setDuration(w);
      });
    });


    // ============ MODE CARDS (welcome) : taper / abstain ============
    document.querySelectorAll('.mode-card').forEach(card => {
      card.addEventListener('click', () => {
        const mode = card.dataset.journalMode;
        if (mode !== 'taper' && mode !== 'abstain') return;
        if (state.journalMode === mode) return;
        state.journalMode = mode;
        syncModeUI();
        // Le summary "fin estimée" est un calcul taper-only ; on rafraîchit au cas où on revient en taper
        if (mode === 'taper') {
          renderConfigPreview();
          updateWelcomeEndDate();
        }
      });
    });

    // ============ ABSTINENCE — boutons hold / relapse / save note ============
    const holdBtn = document.getElementById('abstain-hold-btn');
    if (holdBtn) {
      holdBtn.addEventListener('click', () => {
        const today = todayISO();
        const existing = state.logs[today];
        if (existing && existing.kind === 'held') {
          // Déjà marqué tenu : on ne fait rien (idempotent)
          return;
        }
        // Si déjà rechute aujourd'hui, demander confirmation pour basculer
        if (existing && existing.kind === 'relapse') {
          if (!confirm(i18n.t('addiction.confirm_switch_to_held'))) return;
        }

        const pendingDays = findPendingDays();
        if (pendingDays.length > 0) {
          pendingTodayLog = {
            kind: 'held',
            note: currentNotes.map(n => n.text).join('\n'),
            notes: currentNotes.map(n => ({...n})),
            audios: [...currentAudios]
          };
          openCatchupModal(pendingDays);
          return;
        }

        markTodayHeld();
        // Préserver les notes multi si saisies
        if (state.logs[today]) {
          state.logs[today].note = currentNotes.map(n => n.text).join('\n');
          state.logs[today].notes = currentNotes.map(n => ({...n}));
          state.logs[today].audios = [...currentAudios];
        }
        saveState();
        render();
      });
    }

    const relapseBtn = document.getElementById('abstain-relapse-btn');
    if (relapseBtn) {
      relapseBtn.addEventListener('click', () => {
        const today = todayISO();
        const existing = state.logs[today];
        if (existing && existing.kind === 'relapse') {
          // Déjà marqué rechute : ne rien refaire (la note se sauve via le bouton dédié)
          return;
        }
        const cur = currentStreakDays();
        let confirmMsg = i18n.t('addiction.confirm_relapse_base');
        if (cur > 0) {
          confirmMsg += i18n.t('addiction.confirm_relapse_streak', {n: cur});
        }
        confirmMsg += i18n.t('addiction.confirm_relapse_end');
        if (!confirm(confirmMsg)) return;

        const note = currentNotes.map(n => n.text).join('\n');

        const pendingDays = findPendingDays();
        if (pendingDays.length > 0) {
          pendingTodayLog = {
            kind: 'relapse',
            note: note,
            notes: currentNotes.map(n => ({...n})),
            audios: [...currentAudios]
          };
          openCatchupModal(pendingDays);
          return;
        }

        markTodayRelapse(note);
        if (state.logs[today]) {
          state.logs[today].notes = currentNotes.map(n => ({...n}));
          state.logs[today].audios = [...currentAudios];
        }
        saveState();
        render();
      });
    }

    // Bouton ajouter une note texte (abstinence)
    const addNoteBtnAbstain = document.getElementById('add-note-btn-abstain');
    if (addNoteBtnAbstain) {
      addNoteBtnAbstain.addEventListener('click', () => {
        const textarea = document.getElementById('abstain-note');
        const text = textarea.value.trim();
        if (!text) return;
        currentNotes.push({ text: text, time: new Date().toISOString() });
        textarea.value = '';
        currentNote = '';
        renderTextNoteList('abstain');
      });
    }

    const noteSaveBtn = document.getElementById('abstain-note-save-btn');
    if (noteSaveBtn) {
      noteSaveBtn.addEventListener('click', () => {
        const today = todayISO();
        // Si pas de log aujourd'hui, on en crée un en mode "held" (note seule = jour tenu implicite)
        // mais c'est un peu trop implicite : on impose un log existant.
        if (!state.logs[today]) {
          alert(i18n.t('addiction.alert_note_no_log'));
          return;
        }
        state.logs[today].note = currentNotes.map(n => n.text).join('\n');
        state.logs[today].notes = currentNotes.map(n => ({...n}));
        state.logs[today].audios = [...currentAudios];
        state.logs[today].savedAt = new Date().toISOString();
        const ok = saveState();
        if (ok) {
          noteSaveBtn.textContent = i18n.t('addiction.btn_save_day_saved');
          setTimeout(() => { noteSaveBtn.textContent = i18n.t('addiction.btn_save_note'); }, 1400);
          render();
        }
      });
    }

    // Tabs
    document.querySelectorAll('.tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        ['today','overview','history','reasons','rules','quit'].forEach(v => {
          const el = document.getElementById('view-' + v);
          if (el) el.classList.toggle('hidden', v !== tab.dataset.view);
        });
      });
    });

    // Dose input
    document.getElementById('today-dose').addEventListener('input', e => {
      currentDose = e.target.value;
      // Efface l'éventuel état d'erreur dès que l'utilisateur tape
      const doseWrap = document.querySelector('.dose-input');
      if (doseWrap) doseWrap.classList.remove('err');
      const statusEl = document.getElementById('save-status');
      if (statusEl) statusEl.classList.remove('err');
    });

    // Titre du jour
    const titleEl = document.getElementById('today-title');
    if (titleEl) {
      titleEl.addEventListener('input', e => {
        currentTitle = e.target.value;
      });
    }

    // Note
    document.getElementById('today-note').addEventListener('input', e => {
      currentNote = e.target.value;
    });

    // Vocal recording buttons
    const vocalBtnTaper = document.getElementById('vocal-rec-btn-taper');
    if (vocalBtnTaper) {
      vocalBtnTaper.addEventListener('click', () => toggleRecording('taper'));
    }
    const vocalBtnAbstain = document.getElementById('vocal-rec-btn-abstain');
    if (vocalBtnAbstain) {
      vocalBtnAbstain.addEventListener('click', () => toggleRecording('abstain'));
    }

    // Bouton ajouter une dose
    document.getElementById('add-dose-btn').addEventListener('click', () => {
      const u = getUnit();
      const raw = document.getElementById('today-dose').value;
      if (raw === '' || raw === null || isNaN(parseFloat(raw))) return;
      let val = parseFloat(raw);
      if (u.integerOnly) val = Math.round(val);
      if (val < 0) val = 0;
      currentDoses.push({ value: val, time: new Date().toISOString() });
      document.getElementById('today-dose').value = '';
      currentDose = '';
      renderDoseList();
      renderHero();
    });

    // Bouton ajouter une note texte
    document.getElementById('add-note-btn').addEventListener('click', () => {
      const textarea = document.getElementById('today-note');
      const text = textarea.value.trim();
      if (!text) return;
      currentNotes.push({ text: text, time: new Date().toISOString() });
      textarea.value = '';
      currentNote = '';
      renderTextNoteList('taper');
    });

    // Save
    document.getElementById('save-btn').addEventListener('click', () => {
      const today = todayISO();
      const p = currentPalier();
      const todayTarget = p.dose;
      const statusEl = document.getElementById('save-status');
      const doseWrap = document.querySelector('.dose-input');

      // Validation : au moins une dose doit avoir été ajoutée
      if (currentDoses.length === 0) {
        statusEl.textContent = i18n.t('addiction.save_error_min_dose');
        statusEl.classList.remove('ok');
        statusEl.classList.add('err');
        if (doseWrap) doseWrap.classList.add('err');
        const inputEl = document.getElementById('today-dose');
        if (inputEl) inputEl.focus();
        return;
      }

      const doseTotal = getDoseTotal();

      // Vérifier s'il y a des jours pending dans le palier en cours.
      const pendingDays = findPendingDays();
      if (pendingDays.length > 0) {
        pendingTodayLog = {
          dose: doseTotal,
          doses: currentDoses.map(d => ({...d})),
          title: currentTitle,
          note: currentNotes.map(n => n.text).join('\n'),
          notes: currentNotes.map(n => ({...n})),
          audios: [...currentAudios]
        };
        openCatchupModal(pendingDays);
        return;
      }

      // Pas de rattrapage nécessaire → enregistrement direct
      state.logs[today] = {
        title: currentTitle,
        dose: doseTotal,
        doses: currentDoses.map(d => ({...d})),
        targetDose: todayTarget,
        phase: p.phase,
        unitType: state.unitType,
        note: currentNotes.map(n => n.text).join('\n'),
        notes: currentNotes.map(n => ({...n})),
        audios: [...currentAudios],
        savedAt: new Date().toISOString()
      };
      const ok = saveState();
      if (ok) {
        document.getElementById('save-btn').textContent = i18n.t('addiction.btn_save_day_saved');
        setTimeout(() => {
          document.getElementById('save-btn').textContent = i18n.t('addiction.btn_save_day');
        }, 1400);
      } else {
        document.getElementById('save-btn').textContent = i18n.t('addiction.btn_save_day_error');
      }
      render();
    });

    // ============ Handlers de la modale de rattrapage ============
    const catchupSaveBtn = document.getElementById('catchup-save-btn');
    if (catchupSaveBtn) {
      catchupSaveBtn.addEventListener('click', () => {
        const ok = commitCatchup();
        if (ok) {
          // Feedback succès dans le bouton "Enregistrer le jour" comme un save normal
          const saveBtn = document.getElementById('save-btn');
          if (saveBtn) {
            saveBtn.textContent = i18n.t('addiction.btn_save_day_saved');
            setTimeout(() => { saveBtn.textContent = i18n.t('addiction.btn_save_day'); }, 1400);
          }
          render();
        }
        // Si !ok, la modale reste ouverte avec le statut d'erreur affiché
      });
    }

    const catchupCancelBtn = document.getElementById('catchup-cancel-btn');
    if (catchupCancelBtn) {
      catchupCancelBtn.addEventListener('click', () => {
        // Annulation : on jette le log d'aujourd'hui en attente. L'utilisateur
        // devra re-cliquer "Enregistrer le jour" — sa saisie est conservée
        // dans currentDose / currentTitle / currentNote.
        closeCatchupModal();
      });
    }

    // Clic sur le backdrop : équivalent à Annuler
    const catchupBackdrop = document.getElementById('catchup-backdrop');
    if (catchupBackdrop) {
      catchupBackdrop.addEventListener('click', () => closeCatchupModal());
    }

    // Touche Escape : ferme la modale
    document.addEventListener('keydown', e => {
      if (e.key !== 'Escape') return;
      const modal = document.getElementById('catchup-modal');
      if (modal && !modal.classList.contains('hidden')) {
        closeCatchupModal();
      }
    });

    // Touche Enter dans un input de la modale : déclenche la sauvegarde
    // (uniquement si tous les inputs sont remplis — sinon focus sur le suivant vide)
    document.addEventListener('keydown', e => {
      if (e.key !== 'Enter') return;
      const modal = document.getElementById('catchup-modal');
      if (!modal || modal.classList.contains('hidden')) return;
      const target = e.target;
      if (!target || !target.classList || !target.classList.contains('catchup-input')) return;
      e.preventDefault();
      // Cherche le prochain input vide ; s'il n'y en a pas, on tente de sauver
      const inputs = Array.from(modal.querySelectorAll('.catchup-input'));
      const nextEmpty = inputs.find(i => i.value === '' || i.value === null);
      if (nextEmpty && nextEmpty !== target) {
        nextEmpty.focus();
      } else {
        // Tous remplis (ou seul l'actuel l'est) → tente le save
        const saveBtn = document.getElementById('catchup-save-btn');
        if (saveBtn) saveBtn.click();
      }
    });

    // Advance palier — strict : disponible uniquement à 7/7 jours tenus
    document.getElementById('advance-btn').addEventListener('click', () => {
      if (state.currentWeek > state.totalWeeks) return;
      const consec = consecutiveDoneDays();
      if (consec < 7) return; // verrou : pas de bypass possible
      const nextWeek = state.currentWeek + 1;
      const nextLabel = (nextWeek > state.totalWeeks) ? i18n.t('addiction.advance_to_libre') : i18n.t('addiction.advance_to_week', {n: nextWeek});
      if (!confirm(i18n.t('addiction.confirm_advance_palier', {label: nextLabel}))) return;
      // En mode debug : nettoyer les logs debug du palier précédent pour ne pas qu'ils
      // polluent le palier suivant (notamment celui d'aujourd'hui, qui est >= palierStartDate
      // du nouveau palier et donc serait recompté). No-op en utilisation normale.
      if (DEBUG_MODE) debugClearDebugLogs();
      state.currentWeek = nextWeek;
      state.palierStartDate = todayISO();
      saveState();
      render();
    });

    // Boutons debug (visibles uniquement si ?debug=1)
    if (DEBUG_MODE) {
      const debugBar = document.getElementById('debug-bar');
      if (debugBar) {
        debugBar.addEventListener('click', e => {
          const btn = e.target.closest('.debug-btn');
          if (!btn) return;
          const action = btn.dataset.debug;
          if (!state.started) {
            console.warn('[debug] Le journal n\'est pas démarré');
            return;
          }
          switch (action) {
            case 'day-plus-1':    debugAddDay(true);  break;
            case 'day-plus-7':    debugAdd7Days();    break;
            case 'day-miss':      debugAddDay(false); break;
            case 'day-empty':     debugAddEmptyDay(); break;
            case 'skip-palier':   debugSkipPalier();  break;
            case 'reset':         debugResetJournal(); break;
          }
        });
      }
      console.log('[debug] Mode debug actif. Boutons fast-forward disponibles dans la barre rouge.');
    }

    // Reset — efface le journal actif et retourne à l'accueil
    document.getElementById('reset-btn').addEventListener('click', () => {
      if (!activeJournalId) return;
      const j = getJournalById(activeJournalId);
      const name = j ? j.name : 'ce journal';
      if (!confirm(i18n.t('addiction.confirm_delete_journal', {name}))) return;

      // Supprime le journal de l'index et le state localStorage
      deleteJournal(activeJournalId);
      // Retour à l'accueil
      goHome();
    });

    // Timer
    document.getElementById('timer-btn').addEventListener('click', toggleTimer);
  }

  // ============ TIMER ============
  function getTimerMessages() {
    const msgs = i18n.t('addiction.timer_messages');
    return Array.isArray(msgs) ? msgs : [
      "Respire. La sensation est réelle, mais elle passe.",
      "Le manque est physique. L'observer suffit.",
      "Tu n'as rien à faire — juste attendre.",
      "Encore une minute. C'est tout ce qu'on demande.",
      "L'urgence ment. Toujours.",
      "Plus que quelques minutes."
    ];
  }

  function formatTime(s) {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2,'0')}`;
  }

  function toggleTimer() {
    if (timerRunning) {
      stopTimer();
    } else {
      startTimer();
    }
  }

  function startTimer() {
    // Garde-fou : si un interval tournait déjà (double-clic rapide, état incohérent), on le purge
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
    timerSeconds = 600;
    timerRunning = true;
    const banner = document.getElementById('timer-banner');
    banner.classList.remove('done');
    banner.classList.add('active');
    document.getElementById('timer-display').classList.add('active');
    document.getElementById('timer-btn').textContent = i18n.t('addiction.btn_timer_stop');
    updateTimerMessage();
    timerInterval = setInterval(() => {
      timerSeconds -= 1;
      document.getElementById('timer-display').textContent = formatTime(Math.max(0, timerSeconds));
      if (timerSeconds % 60 === 0) updateTimerMessage();
      if (timerSeconds <= 0) {
        clearInterval(timerInterval);
        timerRunning = false;
        document.getElementById('timer-display').textContent = '00:00';
        document.getElementById('timer-message').textContent = i18n.t('addiction.timer_done_message');
        document.getElementById('timer-btn').textContent = i18n.t('addiction.btn_timer_restart');
        document.getElementById('timer-display').classList.remove('active');
        banner.classList.remove('active');
        banner.classList.add('done');
      }
    }, 1000);
  }

  function stopTimer() {
    clearInterval(timerInterval);
    timerRunning = false;
    timerSeconds = 600;
    document.getElementById('timer-display').textContent = '10:00';
    document.getElementById('timer-display').classList.remove('active');
    document.getElementById('timer-message').textContent = i18n.t('addiction.timer_message');
    document.getElementById('timer-btn').textContent = i18n.t('addiction.btn_timer_start');
    const banner = document.getElementById('timer-banner');
    banner.classList.remove('active', 'done');
  }

  function updateTimerMessage() {
    const msgs = getTimerMessages();
    const idx = Math.floor((600 - timerSeconds) / 60) % msgs.length;
    document.getElementById('timer-message').textContent = msgs[idx];
  }

  // ============ URGE SURFING ============
  (function initUrgeSurfing() {
    const modal = document.getElementById('urge-modal');
    const openBtn = document.getElementById('urge-open-btn');
    const closeBtn = document.getElementById('urge-close-btn');
    const nextBtn = document.getElementById('urge-next-btn');
    const backdrop = document.getElementById('urge-backdrop');
    const steps = modal.querySelectorAll('.urge-step');
    const dots = modal.querySelectorAll('.urge-progress-dot');
    let current = 0;

    function showStep(idx) {
      steps.forEach((s, i) => {
        s.classList.toggle('active', i === idx);
      });
      dots.forEach((d, i) => {
        d.classList.toggle('done', i <= idx);
      });
      nextBtn.textContent = idx >= steps.length - 1 ? 'Terminer ✓' : 'Suivant →';
    }

    function openModal() {
      current = 0;
      showStep(0);
      modal.classList.remove('hidden');
    }

    function closeModal() {
      modal.classList.add('hidden');
    }

    openBtn.addEventListener('click', openModal);
    closeBtn.addEventListener('click', closeModal);
    backdrop.addEventListener('click', closeModal);

    nextBtn.addEventListener('click', () => {
      if (current >= steps.length - 1) {
        closeModal();
      } else {
        current++;
        showStep(current);
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !modal.classList.contains('hidden')) {
        closeModal();
      }
    });
  })();

  // ============ INIT ============
  (async function init() {
    // Attendre que les traductions soient chargées avant de générer
    // les blocs dynamiques comme la liste des journaux.
    await i18nReady;

    // Démarrage : pas d'auto-ouverture. On part toujours sur la page d'accueil.
    // L'utilisateur choisit explicitement quel journal ouvrir, ce qui évite les surprises
    // si plusieurs journaux existent.
    activeJournalId = null;

    bindEvents();
    loadState();
    render();
  })();
