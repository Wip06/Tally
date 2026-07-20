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
      name: name && name.trim() ? name.trim() : 'Compteur sans nom',
      mode: 'tap',
      teams: [
        { id: uid('t'), name: 'Équipe 1', color: PALETTE[0], score: 0 },
        { id: uid('t'), name: 'Équipe 2', color: PALETTE[1], score: 0 }
      ]
    };
    state.counters.push(counter);
    saveState();
    return counter;
  }

  function deleteCounter(id) {
    state.counters = state.counters.filter(c => c.id !== id);
    saveState();
  }

  function addTeamToCounter(counter) {
    const idx = counter.teams.length;
    counter.teams.push({
      id: uid('t'),
      name: `Équipe ${idx + 1}`,
      color: PALETTE[idx % PALETTE.length],
      score: 0
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
    currentCounterId = null;
    document.getElementById('view-detail').hidden = true;
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
    badge.textContent = counter.mode === 'manual' ? 'Libre' : 'Clic';

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

  // ---------- Detail view ----------

  function showDetail(id) {
    const counter = getCounter(id);
    if (!counter) { navigate('#/'); return; }
    currentCounterId = id;
    document.getElementById('view-home').hidden = true;
    document.getElementById('view-detail').hidden = false;
    renderDetail(counter);
  }

  function renderDetail(counter) {
    document.getElementById('counter-name-input').value = counter.name;
    document.querySelectorAll('.mode-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.mode === counter.mode);
    });
    renderDetailTeams(counter);
  }

  function renderDetailTeams(counter) {
    const list = document.getElementById('teams-list');
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

    if (counter.mode === 'manual') {
      const input = document.createElement('input');
      input.type = 'number';
      input.inputMode = 'numeric';
      input.className = 'team-score-input';
      input.value = team.score;
      input.setAttribute('aria-label', `Score de ${team.name}`);
      input.addEventListener('change', () => {
        const val = parseInt(input.value, 10);
        team.score = isNaN(val) ? 0 : val;
        input.value = team.score;
        saveState();
      });
      scoreZone.appendChild(input);
    } else {
      const scoreDisplay = document.createElement('button');
      scoreDisplay.type = 'button';
      scoreDisplay.className = 'team-score-tap';
      scoreDisplay.textContent = team.score;
      scoreDisplay.setAttribute('aria-label', `Ajouter un point à ${team.name}`);
      scoreDisplay.addEventListener('click', () => {
        team.score++;
        saveState();
        scoreDisplay.textContent = team.score;
        pulse(scoreDisplay);
      });

      const minusBtn = document.createElement('button');
      minusBtn.type = 'button';
      minusBtn.className = 'team-minus-btn';
      minusBtn.textContent = '−1';
      minusBtn.setAttribute('aria-label', `Retirer un point à ${team.name}`);
      minusBtn.addEventListener('click', () => {
        team.score--;
        saveState();
        scoreDisplay.textContent = team.score;
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
      openModal('modal-new-counter');
      setTimeout(() => input.focus(), 50);
    }
    document.getElementById('btn-new-counter').addEventListener('click', openNewCounterModal);
    document.getElementById('btn-new-counter-empty').addEventListener('click', openNewCounterModal);

    document.getElementById('btn-cancel-new-counter').addEventListener('click', () => {
      closeModal('modal-new-counter');
    });

    document.getElementById('btn-confirm-new-counter').addEventListener('click', () => {
      const name = document.getElementById('new-counter-name').value;
      const counter = createCounter(name);
      closeModal('modal-new-counter');
      navigate('#/counter/' + counter.id);
    });

    document.getElementById('new-counter-name').addEventListener('keydown', e => {
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

    document.querySelectorAll('.mode-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const counter = getCounter(currentCounterId);
        if (!counter) return;
        counter.mode = btn.dataset.mode;
        saveState();
        renderDetail(counter);
      });
    });

    document.getElementById('btn-add-team').addEventListener('click', () => {
      const counter = getCounter(currentCounterId);
      if (!counter) return;
      addTeamToCounter(counter);
      renderDetailTeams(counter);
    });

    document.getElementById('btn-reset-scores').addEventListener('click', () => {
      const counter = getCounter(currentCounterId);
      if (!counter) return;
      if (!confirm('Réinitialiser tous les scores de ce compteur ?')) return;
      counter.teams.forEach(t => t.score = 0);
      saveState();
      renderDetailTeams(counter);
    });

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
