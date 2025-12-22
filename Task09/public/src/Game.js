// src/Game.js — игровая логика «Угадай число»

export class Game {
  constructor() {
    this.reset();
  }

  reset() {
    this.playerName = '';
    this.min = 1;
    this.max = 100;
    this.target = null;
    this.attemptLimit = null; // число | null
    this.guesses = []; // { value, result, ts }
    this.startedAt = null;
    this.finishedAt = null;
    this.durationMs = null;
    this.win = false;
  }

  /**
   * Старт новой партии.
   * @param {{min:number,max:number,attemptLimit:number|null,playerName:string}} opts
   */
  start({ min = 1, max = 100, attemptLimit = null, playerName = '' } = {}) {
    if (typeof min !== 'number' || typeof max !== 'number' || min >= max) {
      throw new Error('Недопустимый диапазон');
    }

    this.reset();
    this.playerName = String(playerName || '').trim();
    this.min = Math.floor(min);
    this.max = Math.floor(max);
    this.attemptLimit =
      attemptLimit && attemptLimit > 0 ? Math.floor(attemptLimit) : null;
    this.target = this._rand(this.min, this.max);
    this.startedAt = Date.now();
  }

  /**
   * Сделать попытку.
   * @param {number} value
   * @returns {'low'|'high'|'correct'}
   */
  guess(value) {
    if (this.startedAt == null) throw new Error('Игра не начата');
    if (this.finishedAt != null) throw new Error('Игра уже завершена');

    if (typeof value !== 'number' || Number.isNaN(value)) {
      throw new Error('Введите число');
    }
    if (value < this.min || value > this.max) {
      throw new Error(`Число вне диапазона (${this.min}..${this.max})`);
    }

    let result = 'correct';
    if (value < this.target) result = 'low';
    else if (value > this.target) result = 'high';

    this.guesses.push({ value, result, ts: Date.now() });

    if (result === 'correct') {
      this._finish(true);
    } else if (this.attemptLimit && this.guesses.length >= this.attemptLimit) {
      this._finish(false);
    }

    return result;
  }

  _finish(win) {
    this.win = win;
    this.finishedAt = Date.now();
    this.durationMs = this.finishedAt - this.startedAt;
  }

  get attempts() {
    return this.guesses.length;
  }

  _rand(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  /**
   * Представление партии для сохранения в IndexedDB.
   * Поля сделаны по спецификации.
   */
  toRecord() {
    return {
      // id — автоинкремент в IndexedDB
      startedAt: this.startedAt,
      finishedAt: this.finishedAt,
      durationMs: this.durationMs,

      playerName: this.playerName || 'Без имени',
      min: this.min,
      max: this.max,
      target: this.target,

      attemptLimit: this.attemptLimit,
      attempts: this.attempts,
      win: this.win,

      // попытки: массив объектов; формат для отображения:
      // номер | предложенное число | ответ компьютера
      guesses: this.guesses
    };
  }
}
