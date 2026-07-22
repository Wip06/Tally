(() => {
  'use strict';

  const STORAGE_KEY = 'score-counter-data-v1';
  const PALETTE = [
    '#e78284', '#ef9f76', '#e5c890', '#a6d189',
    '#81c8be', '#99d1db', '#85c1dc', '#8caaee',
    '#babbf1', '#ca9ee6', '#f4b8e4', '#eebebe'
  ];

  let state = loadState();
  let currentCounterId = null;
  let colorPickerContext = null; // { counterId, teamId }
  let undoSnapshot = null; // { counterId, teams }
  let undoTimer = null;
  let winBannerTimer = null;
  let timerCounterId = null;
  let timerRemaining = 0;
  let timerTotal = 0;
  let timerRunning = false;
  let timerIntervalId = null;

  // ---------- Persistence ----------

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : null;
      if (parsed && Array.isArray(parsed.counters)) return parsed;
    } catch (e) {
      console.warn('Impossible de lire les données locales, réinitialisation.', e);
    }
    return { counters: [] };
  }

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function uid(prefix) {
    if (window.crypto && crypto.randomUUID) return prefix + '_' + crypto.randomUUID();
    return prefix + '_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
  }

  // ---------- Data operations ----------

  function createCounter(name) {
    const counter = {
      id: uid('c'),
      type: 'score',
      name: name && name.trim() ? name.trim() : 'Compteur sans nom',
      mode: 'tap',
      targetScore: null,
      servingTeamId: null,
      teams: [
        { id: uid('t'), name: 'Nous', color: PALETTE[9], score: 0, points: 0, games: 0 },
        { id: uid('t'), name: 'Eux', color: PALETTE[8], score: 0, points: 0, games: 0 }
      ]
    };
    state.counters.push(counter);
    saveState();
    return counter;
  }

  function createTimer(name, minutes) {
    const timer = {
      id: uid('c'),
      type: 'timer',
      name: name && name.trim() ? name.trim() : 'Minuteur',
      durationMinutes: (minutes && minutes > 0) ? minutes : 5,
      mode: 'tap',
      teams: []
    };
    state.counters.push(timer);
    saveState();
    return timer;
  }

  function deleteCounter(id) {
    if (timerCounterId === id) stopTimer();
    state.counters = state.counters.filter(c => c.id !== id);
    saveState();
  }

  function addTeamToCounter(counter) {
    const idx = counter.teams.length;
    counter.teams.push({
      id: uid('t'),
      name: `Équipe ${idx + 1}`,
      color: PALETTE[idx % PALETTE.length],
      score: 0,
      points: 0,
      games: 0
    });
    saveState();
  }

  function removeTeamFromCounter(counter, teamId) {
    counter.teams = counter.teams.filter(t => t.id !== teamId);
    saveState();
  }

  function getCounter(id) {
    return state.counters.find(c => c.id === id) || null;
  }

  // ---------- Routing ----------

  function parseHash() {
    const h = location.hash.replace(/^#\/?/, '');
    if (h.startsWith('counter/')) return { view: 'detail', id: h.slice('counter/'.length) };
    return { view: 'home' };
  }

  function navigate(hash) {
    location.hash = hash;
  }

  function route() {
    const r = parseHash();
    if (r.view === 'detail' && getCounter(r.id)) {
      showDetail(r.id);
    } else {
      showHome();
    }
  }

  // ---------- Home view ----------

  function showHome() {
    dismissUndo();
    currentCounterId = null;
    document.getElementById('view-detail').hidden = true;
    document.getElementById('view-timer').hidden = true;
    document.getElementById('view-home').hidden = false;
    renderHome();
  }

  function renderHome() {
    const grid = document.getElementById('counters-grid');
    const empty = document.getElementById('empty-state');
    const toolbar = document.querySelector('.home-toolbar');
    const hasCounters = state.counters.length > 0;

    grid.innerHTML = '';
    empty.hidden = hasCounters;
    toolbar.hidden = !hasCounters;

    if (hasCounters) {
      const count = state.counters.length;
      document.getElementById('counters-count').textContent = `${count} compteur${count > 1 ? 's' : ''}`;
    }

    state.counters.forEach(counter => grid.appendChild(buildCounterCard(counter)));
  }

  function buildCounterCard(counter) {
    if (counter.type === 'timer') return buildTimerCard(counter);

    const card = document.createElement('div');
    card.className = 'counter-card';
    card.tabIndex = 0;
    card.setAttribute('role', 'button');
    card.setAttribute('aria-label', `Ouvrir le compteur ${counter.name}`);

    const header = document.createElement('div');
    header.className = 'counter-card__header';

    const title = document.createElement('h3');
    title.className = 'counter-card__title';
    title.textContent = counter.name;

    const badge = document.createElement('span');
    badge.className = 'mode-badge';
    badge.textContent = counter.mode === 'manual' ? 'Libre' : counter.mode === 'tennis' ? 'Raquette' : 'Clic';

    header.append(title, badge);

    const teamsPreview = document.createElement('div');
    teamsPreview.className = 'counter-card__teams';

    const sorted = [...counter.teams].sort((a, b) => b.score - a.score);
    const maxScore = sorted.length ? sorted[0].score : 0;

    if (sorted.length) {
      card.style.setProperty('--accent', sorted[0].color);
    }

    if (!sorted.length) {
      const p = document.createElement('p');
      p.className = 'muted-text';
      p.textContent = 'Aucune équipe';
      teamsPreview.appendChild(p);
    } else {
      sorted.forEach(team => {
        const row = document.createElement('div');
        row.className = 'team-mini-row';

        const dot = document.createElement('span');
        dot.className = 'team-dot';
        dot.style.background = team.color;

        const name = document.createElement('span');
        name.className = 'team-mini-name';
        name.textContent = team.name;
        if (sorted.length > 1 && team.score === maxScore && maxScore > 0) {
          name.classList.add('is-leading');
        }

        const score = document.createElement('span');
        score.className = 'team-mini-score';
        score.textContent = team.score;

        row.append(dot, name, score);
        teamsPreview.appendChild(row);
      });
    }

    card.append(header, teamsPreview);

    const open = () => navigate('#/counter/' + counter.id);
    card.addEventListener('click', open);
    card.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); }
    });

    return card;
  }

  function buildTimerCard(counter) {
    const card = document.createElement('div');
    card.className = 'counter-card counter-card--timer';
    card.tabIndex = 0;
    card.setAttribute('role', 'button');
    card.setAttribute('aria-label', `Ouvrir le minuteur ${counter.name}`);

    const header = document.createElement('div');
    header.className = 'counter-card__header';

    const title = document.createElement('h3');
    title.className = 'counter-card__title';
    title.textContent = counter.name;

    const badge = document.createElement('span');
    badge.className = 'mode-badge';
    badge.textContent = 'Minuteur';

    header.append(title, badge);

    const duration = document.createElement('p');
    duration.className = 'timer-card-duration';
    const mins = counter.durationMinutes || 5;
    duration.textContent = `${mins.toString().padStart(2, '0')}:00`;

    card.append(header, duration);

    const open = () => navigate('#/counter/' + counter.id);
    card.addEventListener('click', open);
    card.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); }
    });

    return card;
  }

  // ---------- Detail view ----------

  function showDetail(id) {
    dismissUndo();
    const counter = getCounter(id);
    if (!counter) { navigate('#/'); return; }
    currentCounterId = id;
    document.getElementById('view-home').hidden = true;
    if (counter.type === 'timer') {
      document.getElementById('view-detail').hidden = true;
      document.getElementById('view-timer').hidden = false;
      renderTimerView(counter);
    } else {
      document.getElementById('view-timer').hidden = true;
      document.getElementById('view-detail').hidden = false;
      renderDetail(counter);
    }
  }

  function renderDetail(counter) {
    document.getElementById('counter-name-input').value = counter.name;
    document.querySelectorAll('.mode-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.mode === counter.mode);
    });
    document.getElementById('target-score-input').value = counter.targetScore || '';
    renderDetailTeams(counter);
  }

  function renderDetailTeams(counter) {
    const list = document.getElementById(counter.type === 'timer' ? 'timer-teams-list' : 'teams-list');
    list.innerHTML = '';
    if (!counter.teams.length) {
      const p = document.createElement('p');
      p.className = 'muted-text';
      p.textContent = "Aucune équipe. Ajoute-en une pour commencer !";
      list.appendChild(p);
      return;
    }
    counter.teams.forEach(team => list.appendChild(buildTeamCard(counter, team)));
  }

  function buildTeamCard(counter, team) {
    const card = document.createElement('div');
    card.className = 'team-card';
    card.style.setProperty('--team-color', team.color);
    if (counter.targetScore && team.score >= counter.targetScore) {
      card.classList.add('team-card--winner');
    }

    const header = document.createElement('div');
    header.className = 'team-card__header';

    const colorBtn = document.createElement('button');
    colorBtn.type = 'button';
    colorBtn.className = 'team-color-dot';
    colorBtn.style.background = team.color;
    colorBtn.setAttribute('aria-label', "Changer la couleur de l'équipe");
    colorBtn.addEventListener('click', () => openColorPicker(counter.id, team.id));

    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.className = 'team-name-input';
    nameInput.value = team.name;
    nameInput.maxLength = 40;
    nameInput.setAttribute('aria-label', "Nom de l'équipe");
    nameInput.addEventListener('input', () => {
      team.name = nameInput.value;
      saveState();
    });

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'team-remove-btn';
    removeBtn.textContent = '✕';
    removeBtn.setAttribute('aria-label', "Supprimer l'équipe");
    removeBtn.addEventListener('click', async () => {
      const ok = await confirmDialog(`Supprimer l'équipe "${team.name}" ?`, {
        title: "Supprimer l'équipe",
        confirmLabel: 'Supprimer'
      });
      if (ok) {
        removeTeamFromCounter(counter, team.id);
        renderDetailTeams(counter);
      }
    });

    header.append(colorBtn, nameInput, removeBtn);

    const scoreZone = document.createElement('div');
    scoreZone.className = 'team-score-zone';

    if (counter.mode === 'tennis') {
      scoreZone.classList.add('team-score-zone--tennis');

      const gamesBadge = document.createElement('div');
      gamesBadge.className = 'team-games-badge';
      const sets = team.score || 0;
      const games = team.games || 0;
      gamesBadge.textContent = `${sets} set${sets > 1 ? 's' : ''} · ${games} jeu${games > 1 ? 'x' : ''}`;

      const serveBtn = document.createElement('button');
      serveBtn.type = 'button';
      serveBtn.className = 'team-serve-toggle';
      serveBtn.textContent = counter.servingTeamId === team.id ? 'Service' : 'Marquer au service';
      serveBtn.classList.toggle('active', counter.servingTeamId === team.id);
      serveBtn.setAttribute('aria-label', `${team.name} Service`);
      serveBtn.addEventListener('click', () => {
        counter.servingTeamId = counter.servingTeamId === team.id ? null : team.id;
        saveState();
        renderDetailTeams(counter);
      });

      const tapRow = document.createElement('div');
      tapRow.className = 'team-score-zone';

      const otherPoints = otherTeamsMax(counter, team, 'points');
      const pointDisplay = document.createElement('button');
      pointDisplay.type = 'button';
      pointDisplay.className = 'team-score-tap';
      pointDisplay.textContent = pointLabel(team.points || 0, otherPoints);
      pointDisplay.setAttribute('aria-label', `Point pour ${team.name}`);
      pointDisplay.addEventListener('click', () => {
        pushUndo(counter, `Point pour ${team.name}`);
        const otherP = otherTeamsMax(counter, team, 'points');
        team.points = (team.points || 0) + 1;
        if (!isWon(team.points, otherP, 4)) {
          saveState();
          renderDetailTeams(counter);
          return;
        }

        // Game won
        team.games = (team.games || 0) + 1;
        counter.teams.forEach(t => { t.points = 0; });
        if (counter.teams.length === 2) {
          const nextServer = counter.teams.find(t => t.id !== counter.servingTeamId);
          if (nextServer) counter.servingTeamId = nextServer.id;
        }

        const otherGames = otherTeamsMax(counter, team, 'games');
        if (!isWon(team.games, otherGames, 6)) {
          saveState();
          renderDetailTeams(counter);
          return;
        }

        // Set won
        const prevSets = team.score;
        team.score++;
        counter.teams.forEach(t => { t.games = 0; });
        saveState();
        renderDetailTeams(counter);
        checkWinCondition(counter, team, prevSets);
      });

      const pointMinusBtn = document.createElement('button');
      pointMinusBtn.type = 'button';
      pointMinusBtn.className = 'team-minus-btn';
      pointMinusBtn.textContent = '-1';
      pointMinusBtn.setAttribute('aria-label', `Retirer un point à ${team.name}`);
      pointMinusBtn.addEventListener('click', () => {
        pushUndo(counter, `-1 point pour ${team.name}`);
        team.points = Math.max(0, (team.points || 0) - 1);
        saveState();
        renderDetailTeams(counter);
      });

      tapRow.append(pointDisplay, pointMinusBtn);
      scoreZone.append(gamesBadge, serveBtn, tapRow);
      card.append(header, scoreZone);
      return card;
    }

    if (counter.mode === 'manual') {
      scoreZone.classList.add('team-score-zone--manual');

      const input = document.createElement('input');
      input.type = 'text';
      input.inputMode = 'numeric';
      input.className = 'team-score-input';
      input.value = team.score;
      input.setAttribute('aria-label', `Score de ${team.name}`);
      input.title = 'Tape un nombre pour fixer le score, ou utilise +/-/x pour calculer';
      input.addEventListener('change', () => {
        const raw = input.value.trim();
        const exprMatch = raw.match(/^(-?\d+)\s*([+\-*])\s*(-?\d+)$/);
        const deltaMatch = raw.match(/^([+\-*])\s*(-?\d+)$/);
        let newScore;
        if (exprMatch) {
          const [, a, op, b] = exprMatch;
          newScore = applyOp(parseInt(a, 10), op, parseInt(b, 10));
        } else if (deltaMatch) {
          const [, op, b] = deltaMatch;
          newScore = applyOp(team.score, op, parseInt(b, 10));
        } else {
          const val = parseInt(raw, 10);
          newScore = isNaN(val) ? 0 : val;
        }
        if (newScore !== team.score) pushUndo(counter, `Score de ${team.name} modifié`);
        const prevScore = team.score;
        team.score = newScore;
        input.value = team.score;
        saveState();
        if (counter.targetScore) card.classList.toggle('team-card--winner', team.score >= counter.targetScore);
        checkWinCondition(counter, team, prevScore);
      });

      const ops = document.createElement('div');
      ops.className = 'team-score-ops';
      [['+', '+'], ['-', '-'], ['*', 'x']].forEach(([op, label]) => {
        const opBtn = document.createElement('button');
        opBtn.type = 'button';
        opBtn.className = 'team-score-op-btn';
        opBtn.textContent = label;
        opBtn.setAttribute('aria-label', `Insérer l'opérateur ${label}`);
        opBtn.addEventListener('click', () => {
          input.value = input.value.trim().replace(/[+\-*]\s*$/, '') + op;
          input.focus();
        });
        ops.appendChild(opBtn);
      });

      scoreZone.append(input, ops);
    } else {
      const scoreDisplay = document.createElement('button');
      scoreDisplay.type = 'button';
      scoreDisplay.className = 'team-score-tap';
      scoreDisplay.textContent = team.score;
      scoreDisplay.setAttribute('aria-label', `Ajouter un point à ${team.name}`);
      scoreDisplay.addEventListener('click', () => {
        pushUndo(counter, `+1 pour ${team.name}`);
        const prevScore = team.score;
        team.score++;
        saveState();
        scoreDisplay.textContent = team.score;
        pulse(scoreDisplay);
        if (counter.targetScore) card.classList.toggle('team-card--winner', team.score >= counter.targetScore);
        checkWinCondition(counter, team, prevScore);
      });

      const minusBtn = document.createElement('button');
      minusBtn.type = 'button';
      minusBtn.className = 'team-minus-btn';
      minusBtn.textContent = '-1';
      minusBtn.setAttribute('aria-label', `Retirer un point à ${team.name}`);
      minusBtn.addEventListener('click', () => {
        pushUndo(counter, `-1 pour ${team.name}`);
        team.score--;
        saveState();
        scoreDisplay.textContent = team.score;
        if (counter.targetScore) card.classList.toggle('team-card--winner', team.score >= counter.targetScore);
      });

      scoreZone.append(scoreDisplay, minusBtn);
    }

    card.append(header, scoreZone);
    return card;
  }

  function pulse(el) {
    el.classList.remove('pulse');
    void el.offsetWidth;
    el.classList.add('pulse');
  }

  function applyOp(a, op, b) {
    if (op === '+') return a + b;
    if (op === '-') return a - b;
    return a * b;
  }

  // ---------- Tennis scoring ----------

  const TENNIS_LADDER = ['0', '15', '30', '40'];

  function otherTeamsMax(counter, team, field) {
    return counter.teams
      .filter(t => t.id !== team.id)
      .reduce((max, t) => Math.max(max, t[field] || 0), 0);
  }

  function pointLabel(points, otherPoints) {
    if (points >= 3 && otherPoints >= 3) {
      const diff = points - otherPoints;
      if (diff === 0) return '40';
      return diff > 0 ? 'AD' : '40';
    }
    return TENNIS_LADDER[Math.min(points, 3)];
  }

  function isWon(value, otherValue, threshold) {
    return value >= threshold && value - otherValue >= 2;
  }

  // ---------- Undo ----------

  function pushUndo(counter, message) {
    undoSnapshot = {
      counterId: counter.id,
      teams: JSON.parse(JSON.stringify(counter.teams)),
      history: JSON.parse(JSON.stringify(counter.history || []))
    };
    clearTimeout(undoTimer);
    document.getElementById('undo-toast-message').textContent = message;
    document.getElementById('undo-toast').hidden = false;
    undoTimer = setTimeout(dismissUndo, 5000);
  }

  function dismissUndo() {
    clearTimeout(undoTimer);
    document.getElementById('undo-toast').hidden = true;
    undoSnapshot = null;
  }

  function undoLastAction() {
    if (!undoSnapshot) return;
    const counter = getCounter(undoSnapshot.counterId);
    if (counter) {
      counter.teams = undoSnapshot.teams;
      counter.history = undoSnapshot.history;
      saveState();
      if (currentCounterId === counter.id) renderDetailTeams(counter);
    }
    dismissUndo();
  }

  // ---------- Win celebration ----------

  function checkWinCondition(counter, team, prevScore) {
    const target = counter.targetScore;
    if (!target) return;
    if (team.score >= target && prevScore < target) celebrateWin(team);
  }

  function celebrateWin(team) {
    const banner = document.getElementById('win-banner');
    banner.textContent = `${team.name} atteint l'objectif !`;
    banner.hidden = false;
    clearTimeout(winBannerTimer);
    winBannerTimer = setTimeout(() => { banner.hidden = true; }, 3500);
    spawnConfetti();
  }

  function spawnConfetti() {
    const layer = document.getElementById('confetti-layer');
    for (let i = 0; i < 60; i++) {
      const piece = document.createElement('span');
      piece.className = 'confetti-piece';
      piece.style.left = Math.random() * 100 + 'vw';
      piece.style.background = PALETTE[Math.floor(Math.random() * PALETTE.length)];
      const duration = 2 + Math.random() * 1.5;
      piece.style.animationDuration = duration + 's';
      piece.style.animationDelay = (Math.random() * 0.3) + 's';
      layer.appendChild(piece);
      setTimeout(() => piece.remove(), (duration + 0.3) * 1000);
    }
  }

  // ---------- Timer ----------

  const TIMER_RING_RADIUS = 90;
  const TIMER_RING_CIRCUMFERENCE = 2 * Math.PI * TIMER_RING_RADIUS;

  function renderTimerView(counter) {
    document.getElementById('timer-name-input').value = counter.name;
    document.getElementById('timer-duration-input').value = counter.durationMinutes;
    document.querySelectorAll('.mode-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.mode === counter.mode);
    });

    const progress = document.getElementById('timer-ring-progress');
    progress.style.strokeDasharray = `${TIMER_RING_CIRCUMFERENCE}`;

    if (timerCounterId !== counter.id) {
      resetTimer(counter);
    } else {
      updateTimerDisplay();
    }

    renderDetailTeams(counter);
  }

  function updateTimerDisplay() {
    const displayEl = document.getElementById('timer-big-display');
    const progress = document.getElementById('timer-ring-progress');
    if (!displayEl || !progress) return;
    const clamped = Math.max(0, timerRemaining);
    const m = Math.floor(clamped / 60).toString().padStart(2, '0');
    const s = Math.floor(clamped % 60).toString().padStart(2, '0');
    displayEl.textContent = `${m}:${s}`;
    const ratio = timerTotal > 0 ? clamped / timerTotal : 0;
    progress.style.strokeDashoffset = `${TIMER_RING_CIRCUMFERENCE * (1 - ratio)}`;
    progress.classList.toggle('timer-ring__progress--done', clamped <= 0);
  }

  function updateTimerToggleLabel() {
    const btn = document.getElementById('btn-timer-toggle');
    if (btn) btn.textContent = timerRunning ? 'Pause' : 'Démarrer';
  }

  function startTimer() {
    if (timerRunning || timerRemaining <= 0) return;
    timerRunning = true;
    updateTimerToggleLabel();
    timerIntervalId = setInterval(() => {
      timerRemaining--;
      if (currentCounterId === timerCounterId) updateTimerDisplay();
      if (timerRemaining <= 0) {
        stopTimer();
        if (currentCounterId === timerCounterId) celebrateTimeUp();
      }
    }, 1000);
  }

  function stopTimer() {
    timerRunning = false;
    clearInterval(timerIntervalId);
    timerIntervalId = null;
    updateTimerToggleLabel();
  }

  function resetTimer(counter) {
    stopTimer();
    timerCounterId = counter.id;
    timerTotal = (counter.durationMinutes || 5) * 60;
    timerRemaining = timerTotal;
    updateTimerDisplay();
  }

  function celebrateTimeUp() {
    const banner = document.getElementById('win-banner');
    banner.textContent = "Temps écoulé !";
    banner.hidden = false;
    clearTimeout(winBannerTimer);
    winBannerTimer = setTimeout(() => { banner.hidden = true; }, 3500);
    spawnConfetti();
  }

  // ---------- Match history ----------

  function logMatchToHistory(counter) {
    if (!counter.teams.length) return;
    const maxScore = Math.max(...counter.teams.map(t => t.score));
    if (maxScore <= 0) return;
    const winners = counter.teams.filter(t => t.score === maxScore);
    const entry = {
      date: new Date().toISOString(),
      winners: winners.map(t => ({ name: t.name, color: t.color })),
      scores: counter.teams.map(t => ({ name: t.name, color: t.color, score: t.score }))
    };
    counter.history = [entry, ...(counter.history || [])].slice(0, 20);
  }

  function formatHistoryDate(iso) {
    const d = new Date(iso);
    const date = d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
    const time = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    return `${date} · ${time}`;
  }

  function renderHistory(counter) {
    const list = document.getElementById('history-list');
    list.innerHTML = '';
    const history = counter.history || [];
    if (!history.length) {
      const p = document.createElement('p');
      p.className = 'muted-text';
      p.textContent = "Aucune partie terminée pour l'instant. Termine une partie et réinitialise les scores pour l'enregistrer ici.";
      list.appendChild(p);
      return;
    }
    history.forEach(entry => {
      const row = document.createElement('div');
      row.className = 'history-row';

      const date = document.createElement('span');
      date.className = 'history-date';
      date.textContent = formatHistoryDate(entry.date);

      const result = document.createElement('span');
      result.className = 'history-result';
      const winnerNames = entry.winners.map(w => w.name).join(' & ');
      const scoreLine = entry.scores.map(s => s.score).join(' - ');
      result.textContent = `${winnerNames} (${scoreLine})`;

      row.append(date, result);
      list.appendChild(row);
    });
  }

  // ---------- Color picker modal ----------

  function openColorPicker(counterId, teamId) {
    const counter = getCounter(counterId);
    const team = counter && counter.teams.find(t => t.id === teamId);
    if (!team) return;
    colorPickerContext = { counterId, teamId };
    renderColorSwatches(team.color);
    document.getElementById('custom-color-input').value = toHexColor(team.color);
    openModal('modal-color-picker');
  }

  function renderColorSwatches(activeColor) {
    const container = document.getElementById('color-swatches');
    container.innerHTML = '';
    PALETTE.forEach(color => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'swatch' + (color.toLowerCase() === activeColor.toLowerCase() ? ' active' : '');
      btn.style.background = color;
      btn.setAttribute('aria-label', `Choisir la couleur ${color}`);
      btn.addEventListener('click', () => selectColor(color));
      container.appendChild(btn);
    });
  }

  function selectColor(color) {
    if (!colorPickerContext) return;
    const counter = getCounter(colorPickerContext.counterId);
    const team = counter && counter.teams.find(t => t.id === colorPickerContext.teamId);
    if (!team) return;
    team.color = color;
    saveState();
    closeModal('modal-color-picker');
    renderDetailTeams(counter);
  }

  function toHexColor(color) {
    if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(color)) return color;
    return '#babbf1';
  }

  // ---------- Modal helpers ----------

  function openModal(id) {
    document.getElementById(id).hidden = false;
    document.body.classList.add('modal-open');
  }

  function closeModal(id) {
    document.getElementById(id).hidden = true;
    document.body.classList.remove('modal-open');
  }

  function confirmDialog(message, { title = 'Confirmer', confirmLabel = 'Confirmer' } = {}) {
    return new Promise(resolve => {
      document.getElementById('confirm-title').textContent = title;
      document.getElementById('confirm-message').textContent = message;
      const okBtn = document.getElementById('btn-confirm-ok');
      const cancelBtn = document.getElementById('btn-confirm-cancel');
      okBtn.textContent = confirmLabel;

      function cleanup(result) {
        okBtn.removeEventListener('click', onOk);
        cancelBtn.removeEventListener('click', onCancel);
        closeModal('modal-confirm');
        resolve(result);
      }
      function onOk() { cleanup(true); }
      function onCancel() { cleanup(false); }

      okBtn.addEventListener('click', onOk);
      cancelBtn.addEventListener('click', onCancel);
      openModal('modal-confirm');
    });
  }

  // ---------- Event wiring ----------

  function init() {
    function openNewCounterModal() {
      const input = document.getElementById('new-counter-name');
      input.value = '';
      document.getElementById('new-timer-duration-input').value = '';
      document.getElementById('new-timer-duration-row').hidden = true;
      document.querySelectorAll('.new-type-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.type === 'score');
      });
      openModal('modal-new-counter');
      setTimeout(() => input.focus(), 50);
    }
    document.getElementById('btn-new-counter').addEventListener('click', openNewCounterModal);
    document.getElementById('btn-new-counter-empty').addEventListener('click', openNewCounterModal);

    document.querySelectorAll('.new-type-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.new-type-btn').forEach(b => b.classList.toggle('active', b === btn));
        document.getElementById('new-timer-duration-row').hidden = btn.dataset.type !== 'timer';
      });
    });

    document.getElementById('btn-cancel-new-counter').addEventListener('click', () => {
      closeModal('modal-new-counter');
    });

    document.getElementById('btn-confirm-new-counter').addEventListener('click', () => {
      const name = document.getElementById('new-counter-name').value;
      const selectedType = document.querySelector('.new-type-btn.active').dataset.type;
      let item;
      if (selectedType === 'timer') {
        const minutes = parseInt(document.getElementById('new-timer-duration-input').value.trim(), 10);
        item = createTimer(name, minutes);
      } else {
        item = createCounter(name);
      }
      closeModal('modal-new-counter');
      navigate('#/counter/' + item.id);
    });

    document.getElementById('new-counter-name').addEventListener('keydown', e => {
      if (e.key === 'Enter') document.getElementById('btn-confirm-new-counter').click();
    });

    document.getElementById('new-timer-duration-input').addEventListener('keydown', e => {
      if (e.key === 'Enter') document.getElementById('btn-confirm-new-counter').click();
    });

    document.getElementById('btn-back').addEventListener('click', () => navigate('#/'));

    document.getElementById('btn-delete-counter').addEventListener('click', async () => {
      const counter = getCounter(currentCounterId);
      if (!counter) return;
      const ok = await confirmDialog(`Supprimer le compteur "${counter.name}" et toutes ses équipes ?`, {
        title: 'Supprimer le compteur',
        confirmLabel: 'Supprimer'
      });
      if (ok) {
        deleteCounter(counter.id);
        navigate('#/');
      }
    });

    document.getElementById('counter-name-input').addEventListener('input', e => {
      const counter = getCounter(currentCounterId);
      if (!counter) return;
      counter.name = e.target.value;
      saveState();
    });

    document.getElementById('btn-timer-back').addEventListener('click', () => navigate('#/'));

    document.getElementById('btn-timer-delete').addEventListener('click', async () => {
      const counter = getCounter(currentCounterId);
      if (!counter) return;
      const ok = await confirmDialog(`Supprimer le minuteur "${counter.name}" ?`, {
        title: 'Supprimer le minuteur',
        confirmLabel: 'Supprimer'
      });
      if (ok) {
        deleteCounter(counter.id);
        navigate('#/');
      }
    });

    document.getElementById('timer-name-input').addEventListener('input', e => {
      const counter = getCounter(currentCounterId);
      if (!counter) return;
      counter.name = e.target.value;
      saveState();
    });

    document.getElementById('btn-timer-toggle').addEventListener('click', () => {
      if (timerRunning) stopTimer(); else startTimer();
    });

    document.getElementById('btn-timer-reset').addEventListener('click', () => {
      const counter = getCounter(currentCounterId);
      if (!counter) return;
      resetTimer(counter);
    });

    document.getElementById('btn-timer-settings').addEventListener('click', () => {
      openModal('modal-timer-settings');
    });

    document.getElementById('btn-close-timer-settings').addEventListener('click', () => {
      closeModal('modal-timer-settings');
    });

    document.getElementById('timer-duration-input').addEventListener('change', () => {
      const counter = getCounter(currentCounterId);
      if (!counter) return;
      const input = document.getElementById('timer-duration-input');
      const val = parseInt(input.value.trim(), 10);
      counter.durationMinutes = (isNaN(val) || val <= 0) ? 5 : val;
      input.value = counter.durationMinutes;
      saveState();
      resetTimer(counter);
    });

    document.getElementById('btn-timer-add-team').addEventListener('click', () => {
      const counter = getCounter(currentCounterId);
      if (!counter) return;
      addTeamToCounter(counter);
      renderDetailTeams(counter);
    });

    document.getElementById('btn-timer-reset-scores').addEventListener('click', () => {
      const counter = getCounter(currentCounterId);
      if (!counter) return;
      if (!confirm('Réinitialiser tous les scores ?')) return;
      pushUndo(counter, 'Scores réinitialisés');
      counter.teams.forEach(t => { t.score = 0; t.points = 0; t.games = 0; });
      saveState();
      renderDetailTeams(counter);
    });

    document.querySelectorAll('.mode-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const counter = getCounter(currentCounterId);
        if (!counter) return;
        counter.mode = btn.dataset.mode;
        saveState();
        if (counter.type === 'timer') renderTimerView(counter); else renderDetail(counter);
      });
    });

    document.getElementById('btn-add-team').addEventListener('click', () => {
      const counter = getCounter(currentCounterId);
      if (!counter) return;
      addTeamToCounter(counter);
      renderDetailTeams(counter);
    });

    document.getElementById('target-score-input').addEventListener('change', () => {
      const counter = getCounter(currentCounterId);
      if (!counter) return;
      const targetInput = document.getElementById('target-score-input');
      const val = parseInt(targetInput.value.trim(), 10);
      counter.targetScore = (isNaN(val) || val <= 0) ? null : val;
      targetInput.value = counter.targetScore || '';
      saveState();
      renderDetailTeams(counter);
    });

    document.getElementById('btn-reset-scores').addEventListener('click', () => {
      const counter = getCounter(currentCounterId);
      if (!counter) return;
      if (!confirm('Réinitialiser tous les scores de ce compteur ?')) return;
      logMatchToHistory(counter);
      pushUndo(counter, 'Scores réinitialisés');
      counter.teams.forEach(t => { t.score = 0; t.points = 0; t.games = 0; });
      counter.servingTeamId = null;
      saveState();
      renderDetailTeams(counter);
    });

    document.getElementById('btn-open-settings').addEventListener('click', () => {
      openModal('modal-counter-settings');
    });

    document.getElementById('btn-close-settings').addEventListener('click', () => {
      closeModal('modal-counter-settings');
    });

    document.getElementById('btn-open-history').addEventListener('click', () => {
      const counter = getCounter(currentCounterId);
      if (!counter) return;
      renderHistory(counter);
      openModal('modal-history');
    });

    document.getElementById('btn-close-history').addEventListener('click', () => {
      closeModal('modal-history');
    });

    document.getElementById('btn-undo').addEventListener('click', undoLastAction);

    document.getElementById('btn-close-color-picker').addEventListener('click', () => {
      closeModal('modal-color-picker');
    });

    document.getElementById('custom-color-input').addEventListener('input', e => {
      selectColor(e.target.value);
    });

    document.querySelectorAll('.modal-overlay').forEach(overlay => {
      overlay.addEventListener('click', e => {
        if (e.target === overlay) closeModal(overlay.id);
      });
    });

    window.addEventListener('hashchange', route);
    route();

    setupInstallPrompt();
    registerServiceWorker();
  }

  // ---------- PWA install prompt ----------

  function setupInstallPrompt() {
    let deferredPrompt = null;
    const banner = document.getElementById('install-banner');

    window.addEventListener('beforeinstallprompt', e => {
      e.preventDefault();
      deferredPrompt = e;
      banner.hidden = false;
    });

    document.getElementById('btn-install').addEventListener('click', async () => {
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      deferredPrompt = null;
      banner.hidden = true;
    });

    document.getElementById('btn-dismiss-install').addEventListener('click', () => {
      banner.hidden = true;
    });

    window.addEventListener('appinstalled', () => {
      banner.hidden = true;
    });
  }

  function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js').catch(err => {
          console.warn('Échec de l\'enregistrement du service worker', err);
        });
      });
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();
