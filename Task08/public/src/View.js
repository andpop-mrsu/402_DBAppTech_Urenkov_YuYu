// src/View.js — отвечает только за DOM / отображение

export class View {
  constructor() {
    this.el = {
      // настройки и игра
      playerName: document.getElementById('playerName'),
      min: document.getElementById('minValue'),
      max: document.getElementById('maxValue'),
      limitChk: document.getElementById('limitAttempts'),
      limitRow: document.getElementById('attemptLimitRow'),
      limitInput: document.getElementById('attemptLimit'),
      startBtn: document.getElementById('startBtn'),
      resetBtn: document.getElementById('resetBtn'),
      guessInput: document.getElementById('guessInput'),
      guessBtn: document.getElementById('guessBtn'),
      status: document.getElementById('status'),
      log: document.getElementById('logList'),
      statAttempts: document.getElementById('statAttempts'),
      statElapsed: document.getElementById('statElapsed'),
      statResult: document.getElementById('statResult'),
      playAgainBtn: document.getElementById('playAgainBtn'),

      // база данных
      btnShowAll: document.getElementById('btnShowAllGames'),
      btnShowWins: document.getElementById('btnShowWins'),
      btnShowLosses: document.getElementById('btnShowLosses'),
      btnShowStats: document.getElementById('btnShowStats'),
      btnClearDb: document.getElementById('btnClearDb'),
      replayIdInput: document.getElementById('replayId'),
      btnReplay: document.getElementById('btnReplay'),
      dbStatus: document.getElementById('dbStatus'),
      gamesTableBody: document.querySelector('#gamesTable tbody'),
      playersTableBody: document.querySelector('#playersTable tbody'),
      replayLog: document.getElementById('replayLog')
    };

    this.handlers = {
      onStart: null,
      onReset: null,
      onGuess: null,
      onPlayAgain: null,
      onShowAllGames: null,
      onShowWins: null,
      onShowLosses: null,
      onShowStats: null,
      onReplayGame: null,
      onClearDb: null
    };

    this._bind();
    this.initViewState();
  }

  _bind() {
    this.el.limitChk.addEventListener('change', () => {
      this.el.limitRow.hidden = !this.el.limitChk.checked;
    });

    this.el.startBtn.addEventListener('click', () => {
      const opts = this.readStartOptions();
      this.handlers.onStart && this.handlers.onStart(opts);
    });

    this.el.resetBtn.addEventListener('click', () => {
      this.handlers.onReset && this.handlers.onReset();
    });

    this.el.guessBtn.addEventListener('click', () => {
      const value = Number(this.el.guessInput.value);
      this.handlers.onGuess && this.handlers.onGuess(value);
    });

    this.el.guessInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const value = Number(this.el.guessInput.value);
        this.handlers.onGuess && this.handlers.onGuess(value);
      }
    });

    this.el.playAgainBtn.addEventListener('click', () => {
      const opts = this.readStartOptions();
      this.handlers.onPlayAgain && this.handlers.onPlayAgain(opts);
    });

    // кнопки IndexedDB
    this.el.btnShowAll.addEventListener('click', () => {
      this.handlers.onShowAllGames && this.handlers.onShowAllGames();
    });
    this.el.btnShowWins.addEventListener('click', () => {
      this.handlers.onShowWins && this.handlers.onShowWins();
    });
    this.el.btnShowLosses.addEventListener('click', () => {
      this.handlers.onShowLosses && this.handlers.onShowLosses();
    });
    this.el.btnShowStats.addEventListener('click', () => {
      this.handlers.onShowStats && this.handlers.onShowStats();
    });
    this.el.btnClearDb.addEventListener('click', () => {
      this.handlers.onClearDb && this.handlers.onClearDb();
    });
    this.el.btnReplay.addEventListener('click', () => {
      const id = Number(this.el.replayIdInput.value);
      this.handlers.onReplayGame && this.handlers.onReplayGame(id);
    });
  }

  bindHandlers(h) {
    this.handlers = { ...this.handlers, ...h };
  }

  initViewState() {
    this.setStatus('Нажмите «Начать новую игру»');
    this.el.limitRow.hidden = true;
    this.enablePlay(false);
    this.setStats({ attempts: 0, elapsedMs: 0, resultText: '—' });
    this.setDbStatus('База ещё не использовалась.');
  }

  // ---------- игра ----------

  readStartOptions() {
    const min = Number(this.el.min.value);
    const max = Number(this.el.max.value);
    const attemptLimit = this.el.limitChk.checked
      ? Number(this.el.limitInput.value)
      : null;
    const playerName = this.el.playerName.value;
    return { min, max, attemptLimit, playerName };
  }

  setStatus(text) {
    this.el.status.textContent = text;
  }

  focusInput() {
    this.el.guessInput.focus();
  }

  enablePlay(active) {
    this.el.guessInput.disabled = !active;
    this.el.guessBtn.disabled = !active;
  }

  clearLog() {
    this.el.log.innerHTML = '';
  }

  logLine(text) {
    const li = document.createElement('li');
    li.innerHTML = `<span>${text}</span><span class="time">${new Date().toLocaleTimeString()}</span>`;
    this.el.log.prepend(li);
  }

  setStats({ attempts, elapsedMs, resultText }) {
    this.el.statAttempts.textContent = String(attempts);
    this.el.statElapsed.textContent = this._fmtDuration(elapsedMs);
    this.el.statResult.textContent = resultText;
  }

  togglePlayAgain(disabled) {
    this.el.playAgainBtn.disabled = disabled;
  }

  _fmtDuration(ms) {
    const sec = Math.round(ms / 1000);
    if (sec < 60) return `${sec} сек.`;
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m} мин. ${s} сек.`;
  }

  // ---------- IndexedDB / таблицы ----------

  setDbStatus(text) {
    this.el.dbStatus.textContent = text;
  }

  renderGamesTable(games) {
    const tbody = this.el.gamesTableBody;
    tbody.innerHTML = '';

    if (!games.length) {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td colspan="8">Партии в базе не найдены.</td>`;
      tbody.appendChild(tr);
      return;
    }

    games.forEach((g) => {
      const tr = document.createElement('tr');
      const dt = g.startedAt ? new Date(g.startedAt).toLocaleString() : '—';
      const res = g.win ? 'Победа' : 'Поражение';
      const dur =
        g.durationMs != null ? this._fmtDuration(g.durationMs) : '—';

      tr.innerHTML = `
        <td>${g.id}</td>
        <td>${dt}</td>
        <td>${g.playerName || 'Без имени'}</td>
        <td>${g.min}…${g.max}</td>
        <td>${g.target}</td>
        <td>${res}</td>
        <td>${g.attempts}</td>
        <td>${dur}</td>
      `;
      tbody.appendChild(tr);
    });
  }

  renderPlayerStats(stats) {
    const tbody = this.el.playersTableBody;
    tbody.innerHTML = '';

    if (!stats.length) {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td colspan="4">Статистика по игрокам пока отсутствует.</td>`;
      tbody.appendChild(tr);
      return;
    }

    stats.forEach((row) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${row.playerName}</td>
        <td>${row.wins}</td>
        <td>${row.losses}</td>
        <td>${row.total}</td>
      `;
      tbody.appendChild(tr);
    });
  }

  renderReplay(game) {
    const log = this.el.replayLog;
    log.innerHTML = '';

    if (!game) {
      const li = document.createElement('li');
      li.textContent = 'Партия с таким ID не найдена.';
      log.appendChild(li);
      return;
    }

    const header = document.createElement('li');
    const res = game.win ? 'Победа' : 'Поражение';
    header.textContent = `ID ${game.id} — игрок: ${
      game.playerName || 'Без имени'
    }, диапазон ${game.min}…${game.max}, результат: ${res}, попыток: ${
      game.attempts
    }`;
    log.appendChild(header);

    game.guesses.forEach((g, index) => {
      const li = document.createElement('li');
      let answer = 'угадано ✅';
      if (g.result === 'low') answer = 'мало (загаданное больше)';
      else if (g.result === 'high') answer = 'много (загаданное меньше)';

      li.textContent = `${index + 1} | ${g.value} | ${answer}`;
      log.appendChild(li);
    });
  }

  clearReplay() {
    this.el.replayLog.innerHTML = '';
  }
}
