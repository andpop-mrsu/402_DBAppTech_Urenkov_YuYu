// src/Database.js — слой доступа к данным через REST API (PHP + SQLite)

const BASE_URL = ''; // тот же origin, что и страница

async function handleResponse(response) {
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`HTTP ${response.status} ${response.statusText}: ${text}`);
  }
  if (response.status === 204) return null;

  const ct = response.headers.get('Content-Type') || '';
  if (ct.includes('application/json')) {
    return response.json();
  }
  return null;
}

/**
 * Сохранение партии:
 * 1) POST /games — сводные данные об игре, получаем id
 * 2) POST /step/{id} — все ходы (номер, число, ответ)
 */
export async function saveGame(record) {
  // 1. Игра
  const res = await fetch(`${BASE_URL}/games`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      playerName: record.playerName,
      min: record.min,
      max: record.max,
      target: record.target,
      attemptLimit: record.attemptLimit,
      attempts: record.attempts,
      startedAt: record.startedAt,
      finishedAt: record.finishedAt,
      durationMs: record.durationMs,
      win: record.win,
    }),
  });

  const data = await handleResponse(res);
  const gameId = data.id;

  // 2. Ходы
  const guesses = record.guesses || [];
  for (let i = 0; i < guesses.length; i += 1) {
    const g = guesses[i];
    const stepRes = await fetch(`${BASE_URL}/step/${gameId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        stepNumber: i + 1,
        value: g.value,
        result: g.result, // 'low' | 'high' | 'correct'
        ts: g.ts,
      }),
    });
    await handleResponse(stepRes);
  }

  return gameId;
}

/**
 * Список всех игр (режимы 2–4).
 * GET /games
 */
export async function getAllGames() {
  const res = await fetch(`${BASE_URL}/games`);
  return handleResponse(res);
}

/**
 * Игра + ходы по ID (режим 6 — повтор партии).
 * GET /games/{id}
 */
export async function getGameById(id) {
  const res = await fetch(`${BASE_URL}/games/${id}`);
  return handleResponse(res);
}

/**
 * Очистка базы (кнопка «Очистить базу»).
 * DELETE /games
 */
export async function clearAllGames() {
  const res = await fetch(`${BASE_URL}/games`, { method: 'DELETE' });
  return handleResponse(res);
}
