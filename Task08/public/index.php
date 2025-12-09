<?php
declare(strict_types=1);

/**
 * Front Controller + router для встроенного сервера php -S.
 *
 * Запуск: находясь в каталоге Task08:
 *   php -S localhost:3000 -t public public/index.php
 *
 * index.php обрабатывает:
 *   - GET  /            -> 302 на /index.html
 *   - GET  /games
 *   - GET  /games/{id}
 *   - POST /games
 *   - POST /step/{id}
 *   - (опционально) DELETE /games   — очистка БД из интерфейса
 *
 * Остальные статические файлы (index.html, css, js) отдаёт сам сервер.
 */

// Отдаём статику, если файл реально существует и не php
if (php_sapi_name() === 'cli-server') {
    $url  = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
    $file = __DIR__ . $url;

    if ($url !== '/' && $url !== '' && is_file($file)
        && pathinfo($file, PATHINFO_EXTENSION) !== 'php') {
        return false; // пусть встроенный сервер отдаст файл сам
    }
}

$uri    = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

// / -> /index.html (SPA по корню /)
if ($method === 'GET' && ($uri === '/' || $uri === '')) {
    header('Location: /index.html', true, 302);
    exit;
}

// Всё ниже — JSON API
header('Content-Type: application/json; charset=utf-8');

function json_response($data, int $status = 200): void
{
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function read_json_body(): array
{
    $raw = file_get_contents('php://input');
    if ($raw === false || $raw === '') {
        return [];
    }
    $data = json_decode($raw, true);
    if (!is_array($data)) {
        json_response(['error' => 'Invalid JSON body'], 400);
    }
    return $data;
}

function get_pdo(): PDO
{
    static $pdo = null;
    if ($pdo instanceof PDO) {
        return $pdo;
    }

    $dbDir = __DIR__ . '/../db';
    if (!is_dir($dbDir)) {
        mkdir($dbDir, 0777, true);
    }
    $dbPath   = $dbDir . '/guess-number.sqlite';
    $needInit = !file_exists($dbPath);

    $pdo = new PDO('sqlite:' . $dbPath);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->exec('PRAGMA foreign_keys = ON');

    if ($needInit) {
        // Таблица партий
        $pdo->exec("
            CREATE TABLE IF NOT EXISTS games (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                started_at    INTEGER NOT NULL,
                finished_at   INTEGER NOT NULL,
                duration_ms   INTEGER NOT NULL,
                player_name   TEXT    NOT NULL,
                min_number    INTEGER NOT NULL,
                max_number    INTEGER NOT NULL,
                target_number INTEGER NOT NULL,
                attempt_limit INTEGER,
                attempts      INTEGER NOT NULL,
                win           INTEGER NOT NULL
            );
        ");

        // Таблица ходов
        $pdo->exec("
            CREATE TABLE IF NOT EXISTS steps (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                game_id     INTEGER NOT NULL,
                step_number INTEGER NOT NULL,
                value       INTEGER NOT NULL,
                result      TEXT    NOT NULL,
                created_at  INTEGER NOT NULL,
                FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
            );
        ");
    }

    return $pdo;
}

$pdo = get_pdo();
$uri = rtrim($uri, '/');

// ---------- GET /games ----------
if ($method === 'GET' && $uri === '/games') {
    $stmt = $pdo->query("
        SELECT
          id,
          started_at    AS startedAt,
          finished_at   AS finishedAt,
          duration_ms   AS durationMs,
          player_name   AS playerName,
          min_number    AS min,
          max_number    AS max,
          target_number AS target,
          attempt_limit AS attemptLimit,
          attempts,
          win
        FROM games
        ORDER BY started_at DESC
    ");
    $games = $stmt->fetchAll(PDO::FETCH_ASSOC);
    foreach ($games as &$g) {
        $g['win'] = (bool)$g['win'];
    }
    json_response($games);
}

// ---------- GET /games/{id} ----------
if ($method === 'GET' && preg_match('#^/games/(\d+)$#', $uri, $m)) {
    $id = (int)$m[1];

    $stmt = $pdo->prepare("
        SELECT
          id,
          started_at    AS startedAt,
          finished_at   AS finishedAt,
          duration_ms   AS durationMs,
          player_name   AS playerName,
          min_number    AS min,
          max_number    AS max,
          target_number AS target,
          attempt_limit AS attemptLimit,
          attempts,
          win
        FROM games
        WHERE id = :id
        LIMIT 1
    ");
    $stmt->execute([':id' => $id]);
    $game = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$game) {
        json_response(['error' => 'Game not found'], 404);
    }

    $game['win'] = (bool)$game['win'];

    $stmt = $pdo->prepare("
        SELECT
          step_number AS stepNumber,
          value,
          result,
          created_at  AS ts
        FROM steps
        WHERE game_id = :id
        ORDER BY step_number ASC
    ");
    $stmt->execute([':id' => $id]);
    $game['guesses'] = $stmt->fetchAll(PDO::FETCH_ASSOC);

    json_response($game);
}

// ---------- POST /games ----------
if ($method === 'POST' && $uri === '/games') {
    $data = read_json_body();

    $playerName = trim($data['playerName'] ?? '');
    if ($playerName === '') {
        json_response(['error' => 'playerName is required'], 400);
    }

    $min          = (int)($data['min'] ?? 1);
    $max          = (int)($data['max'] ?? 0);
    $target       = (int)($data['target'] ?? 0);
    $attemptLimit = isset($data['attemptLimit']) && $data['attemptLimit'] !== ''
        ? (int)$data['attemptLimit']
        : null;
    $attempts   = (int)($data['attempts'] ?? 0);
    $startedAt  = (int)($data['startedAt'] ?? (int)(microtime(true) * 1000));
    $finishedAt = (int)($data['finishedAt'] ?? $startedAt);
    $durationMs = (int)($data['durationMs'] ?? 0);
    $win        = !empty($data['win']) ? 1 : 0;

    if ($max <= $min) {
        json_response(['error' => 'Invalid range'], 400);
    }

    $stmt = $pdo->prepare("
        INSERT INTO games (
            started_at, finished_at, duration_ms,
            player_name, min_number, max_number,
            target_number, attempt_limit, attempts, win
        )
        VALUES (
            :started_at, :finished_at, :duration_ms,
            :player_name, :min_number, :max_number,
            :target_number, :attempt_limit, :attempts, :win
        )
    ");

    $stmt->execute([
        ':started_at'    => $startedAt,
        ':finished_at'   => $finishedAt,
        ':duration_ms'   => $durationMs,
        ':player_name'   => $playerName,
        ':min_number'    => $min,
        ':max_number'    => $max,
        ':target_number' => $target,
        ':attempt_limit' => $attemptLimit,
        ':attempts'      => $attempts,
        ':win'           => $win,
    ]);

    $id = (int)$pdo->lastInsertId();
    json_response(['id' => $id], 201);
}

// ---------- POST /step/{id} ----------
if ($method === 'POST' && preg_match('#^/step/(\d+)$#', $uri, $m)) {
    $gameId = (int)$m[1];

    // Проверяем, что игра существует
    $stmt = $pdo->prepare('SELECT id FROM games WHERE id = :id');
    $stmt->execute([':id' => $gameId]);
    if (!$stmt->fetchColumn()) {
        json_response(['error' => 'Game not found'], 404);
    }

    $data       = read_json_body();
    $stepNumber = (int)($data['stepNumber'] ?? 0);
    $value      = (int)($data['value'] ?? 0);
    $result     = $data['result'] ?? '';
    $ts         = (int)($data['ts'] ?? (int)(microtime(true) * 1000));

    if ($stepNumber <= 0 || $result === '') {
        json_response(['error' => 'Invalid step data'], 400);
    }

    $stmt = $pdo->prepare("
        INSERT INTO steps (game_id, step_number, value, result, created_at)
        VALUES (:game_id, :step_number, :value, :result, :created_at)
    ");
    $stmt->execute([
        ':game_id'     => $gameId,
        ':step_number' => $stepNumber,
        ':value'       => $value,
        ':result'      => $result,
        ':created_at'  => $ts,
    ]);

    json_response(['status' => 'ok'], 201);
}

// (необязательный, но удобный) DELETE /games — очистка БД
if ($method === 'DELETE' && $uri === '/games') {
    $pdo->exec('DELETE FROM steps');
    $pdo->exec('DELETE FROM games');
    $pdo->exec("DELETE FROM sqlite_sequence WHERE name IN ('games','steps')");
    json_response(['status' => 'cleared']);
}

// Если ни один маршрут не совпал
json_response(['error' => 'Not found'], 404);
