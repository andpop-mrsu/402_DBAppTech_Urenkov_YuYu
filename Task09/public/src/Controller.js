// src/Controller.js — связывает Game, View и Database, реализует режимы

import { Game } from './Game.js';
import { View } from './View.js';
import {
  saveGame,
  getAllGames,
  getGameById,
  clearAllGames,
} from './Database.js';


class Controller {
  constructor() {
    this.game = new Game();
    this.view = new View();
    this.timerId = null;

    this.view.bindHandlers({
      onStart: (opts) => this.start(opts),
      onReset: () => this.reset(),
      onGuess: (value) => this.handleGuess(value),
      onPlayAgain: (opts) => this.start(opts),

      onShowAllGames: () => this.showAllGames(),
      onShowWins: () => this.showFilteredGames('win'),
      onShowLosses: () => this.showFilteredGames('lose'),
      onShowStats: () => this.showStats(),
      onReplayGame: (id) => this.replayGame(id),
      onClearDb: () => this.clearDb()
    });
  }

  // ---------- режим 1: новая игра ----------

  start(opts) {
    const name = (opts.playerName || '').trim();
    if (!name) {
      this.view.setStatus('Введите имя игрока.');
      return;
    }

    try {
      this.game.start({
        min: opts.min,
        max: opts.max,
        attemptLimit: opts.attemptLimit,
        playerName: name
      });

      this.view.clearLog();
      this.view.setStatus(
        `Игра началась! Игрок: ${name}, диапазон: ${this.game.min}…${this.game.max}.`
      );
      this.view.enablePlay(true);
      this.view.focusInput();
      this.view.togglePlayAgain(true);
      this._startTimer();
      this._updateStats();
    } catch (err) {
      this.view.setStatus(err.message || String(err));
    }
  }

  reset() {
    this.game.reset();
    this.view.clearLog();
    this.view.enablePlay(false);
    this._stopTimer();
    this.view.setStats({ attempts: 0, elapsedMs: 0, resultText: '—' });
    this.view.togglePlayAgain(true);
    this.view.setStatus('Сброшено. Нажмите «Начать новую игру».');
  }

  handleGuess(value) {
    try {
      const res = this.game.guess(value);
      const n = this.game.attempts;
      let msg = `#${n}: ${value} — `;
      if (res === 'low') msg += 'мало ↑';
      else if (res === 'high') msg += 'много ↓';
      else msg += 'угадано ✅';
      this.view.logLine(msg);

      if (res === 'correct') {
        this._finish(true);
      } else if (
        this.game.attemptLimit &&
        this.game.attempts >= this.game.attemptLimit
      ) {
        this._finish(false);
      } else {
        this.view.setStatus(
          res === 'low'
            ? 'Загаданное число больше.'
            : 'Загаданное число меньше.'
        );
      }

      this._updateStats();
    } catch (err) {
      this.view.setStatus(err.message || String(err));
    }
  }

  async _finish(win) {
    this.view.enablePlay(false);
    this._stopTimer();

    const resultText = win ? 'Победа' : 'Поражение';
    this.view.setStatus(
      win
        ? `Победа! За ${this.game.attempts} попыток и ${this._fmtDuration(
            this.game.durationMs
          )}.`
        : `Поражение. Лимит попыток исчерпан. Число было: ${this.game.target}.`
    );
    this.view.togglePlayAgain(false);

    // сохраняем в IndexedDB
    try {
      const id = await saveGame(this.game.toRecord());
      this.view.setDbStatus(`Партия сохранена в базе с ID ${id}.`);
      await this.showAllGames(); // обновляем таблицу
    } catch (e) {
      this.view.setDbStatus(
        'Ошибка при сохранении партии в базу данных. Подробности в консоли.'
      );
      console.error(e);
    }
  }

  // ---------- режимы 2–4: списки партий ----------

  async showAllGames() {
    try {
      const games = await getAllGames();
      this.view.renderGamesTable(games);
      this.view.setDbStatus(`Показаны все партии (всего: ${games.length}).`);
    } catch (e) {
      this.view.setDbStatus('Ошибка при чтении базы данных.');
      console.error(e);
    }
  }

  async showFilteredGames(mode) {
    try {
      let games = await getAllGames();
      if (mode === 'win') {
        games = games.filter((g) => g.win);
        this.view.setDbStatus(
          `Показаны партии, где победил человек (всего: ${games.length}).`
        );
      } else if (mode === 'lose') {
        games = games.filter((g) => !g.win);
        this.view.setDbStatus(
          `Показаны партии, где человек проиграл (всего: ${games.length}).`
        );
      }
      this.view.renderGamesTable(games);
    } catch (e) {
      this.view.setDbStatus('Ошибка при чтении базы данных.');
      console.error(e);
    }
  }

  // ---------- режим 5: статистика по игрокам ----------

  async showStats() {
    try {
      const games = await getAllGames();

      const map = new Map();
      for (const g of games) {
        const name = (g.playerName || 'Без имени').trim() || 'Без имени';
        if (!map.has(name)) {
          map.set(name, { playerName: name, wins: 0, losses: 0, total: 0 });
        }
        const row = map.get(name);
        row.total += 1;
        if (g.win) row.wins += 1;
        else row.losses += 1;
      }

      const stats = Array.from(map.values()).sort((a, b) => {
        if (b.wins !== a.wins) return b.wins - a.wins; // чемпионы сверху
        if (a.losses !== b.losses) return a.losses - b.losses;
        return a.playerName.localeCompare(b.playerName);
      });

      this.view.renderPlayerStats(stats);
      this.view.setDbStatus(
        `Показана статистика по игрокам (игроков: ${stats.length}).`
      );
    } catch (e) {
      this.view.setDbStatus('Ошибка при формировании статистики.');
      console.error(e);
    }
  }

  // ---------- режим 6: повтор партии ----------

  async replayGame(id) {
    try {
      const game = await getGameById(id);
      this.view.renderReplay(game);
      if (game) {
        this.view.setDbStatus(`Воспроизведена партия ID ${game.id}.`);
      } else {
        this.view.setDbStatus('Партия с таким ID не найдена.');
      }
    } catch (e) {
      this.view.setDbStatus('Ошибка при чтении партии из базы.');
      console.error(e);
    }
  }

  // ---------- очистка базы ----------

  async clearDb() {
    if (!confirm('Точно удалить все партии из базы данных?')) return;

    try {
      await clearAllGames();            // теперь это DELETE /games
      this.view.renderGamesTable([]);
      this.view.renderPlayerStats([]);
      this.view.clearReplay();
      this.view.setDbStatus('База данных очищена.');
    } catch (e) {
      this.view.setDbStatus('Ошибка при очистке базы.');
      console.error(e);
    }
  }



  // ---------- вспомогательное ----------

  _updateStats() {
    const now = this.game.finishedAt ?? Date.now();
    const elapsed = now - (this.game.startedAt ?? now);
    const resultText = this.game.finishedAt
      ? this.game.win
        ? 'Победа'
        : 'Поражение'
      : '—';

    this.view.setStats({
      attempts: this.game.attempts,
      elapsedMs: elapsed,
      resultText
    });
  }

  _startTimer() {
    this._stopTimer();
    this.timerId = setInterval(() => this._updateStats(), 250);
  }

  _stopTimer() {
    if (this.timerId) clearInterval(this.timerId);
    this.timerId = null;
  }

  _fmtDuration(ms) {
    const sec = Math.round(ms / 1000);
    if (sec < 60) return `${sec} сек.`;
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m} мин. ${s} сек.`;
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new Controller();
});
