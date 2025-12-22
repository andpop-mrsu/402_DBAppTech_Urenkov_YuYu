<?php
declare(strict_types=1);

require __DIR__ . '/../vendor/autoload.php';

use Slim\Factory\AppFactory;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

/**
 * При запуске через встроенный сервер PHP:
 *   php -S localhost:3000 -t public public/index.php
 *
 * Этот блок отдаёт статику напрямую, минуя Slim:
 * index.html, styles.css, js-файлы и т.п.
 */
if (php_sapi_name() === 'cli-server') {
    $url  = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
    $file = __DIR__ . $url;

    if ($url !== '/' && $url !== '' && is_file($file)
        && pathinfo($file, PATHINFO_EXTENSION) !== 'php') {
        return false; // встроенный сервер сам отдаст файл
    }
}

/**
 * Вспомогательная функция: подключение к SQLite.
 * База лежит в Task09/db/guess-number.sqlite.
 */
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
                id             INTEGER PRIMARY KEY AUTOINCREMENT,
                started_at     INTEGER NOT NULL,
                finished_at    INTEGER NOT NULL,
                duration_ms    INTEGER NOT NULL,
                player_name    TEXT    NOT NULL,
                min_number     INTEGER NOT NULL,
                max_number     INTEGER NOT NULL,
                target_number  INTEGER NOT NULL,
                attempt_limit  INTEGER,
                attempts       INTEGER NOT NULL,
                win            INTEGER NOT NULL
            );
        ");

        // Таблица ходов
        $pdo->exec("
            CREATE TABLE IF NOT EXISTS steps (
                id           INTEGER PRIMARY KEY AUTOINCREMENT,
                game_id      INTEGER NOT NULL,
                step_number  INTEGER NOT NULL,
                value        INTEGER NOT NULL,
                result       TEXT    NOT NULL,
                created_at   INTEGER NOT NULL,
                FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
            );
        ");
    }

    return $pdo;
}

/**
 * Вспомогательный ответ JSON.
 */
function jsonResponse(Response $response, $data, int $status = 200): Response
{
    $payload = json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    $response->getBody()->write($payload);

    return $response
        ->withHeader('Content-Type', 'application/json; charset=utf-8')
        ->withStatus($status);
}

/**
 * Разбор JSON-тела запроса.
 */
function parseJsonBody(Request $request): array
{
    $raw = (string) $request->getBody();
    if ($raw === '') {
        return [];
    }
    $data = json_decode($raw, true);
    if (!is_array($data)) {
        throw new RuntimeException('Invalid JSON body');
    }
    return $data;
}

// ------------------ Создаём Slim-приложение ------------------

$app = AppFactory::create();
$app->addErrorMiddleware(true, true, true);

// Базовый путь можно настроить, если приложение не в корне virtual host-а
// $app->setBasePath('');

/**
 * GET /  — редирект на SPA
 * Требование: приложение должно открываться по / и /index.html.
 */
$app->get('/', function (Request $request, Response $response): Response {
    return $response
        ->withHeader('Location', '/index.html')
        ->withStatus(302);
});

// ------------- REST API, который использует frontend -------------

/**
 * GET /games — список всех игр
 */
$app->get('/games', function (Request $request, Response $response): Response {
    $pdo = get_pdo();

    $stmt = $pdo->query("
        SELECT
          id,
          started_at     AS startedAt,
          finished_at    AS finishedAt,
          duration_ms    AS durationMs,
          player_name    AS playerName,
          min_number     AS min,
          max_number     AS max,
          target_number  AS target,
          attempt_limit  AS attemptLimit,
          attempts,
          win
        FROM games
        ORDER BY started_at DESC
    ");
    $games = $stmt->fetchAll(PDO::FETCH_ASSOC);

    foreach ($games as &$g) {
        $g['win'] = (bool) $g['win'];
    }

    return jsonResponse($response, $games);
});

/**
 * GET /games/{id} — одна игра + все её ходы (для повтора партии)
 */
$app->get('/games/{id}', function (Request $request, Response $response, array $args): Response {
    $id  = (int) ($args['id'] ?? 0);
    $pdo = get_pdo();

    $stmt = $pdo->prepare("
        SELECT
          id,
          started_at     AS startedAt,
          finished_at    AS finishedAt,
          duration_ms    AS durationMs,
          player_name    AS playerName,
          min_number     AS min,
          max_number     AS max,
          target_number  AS target,
          attempt_limit  AS attemptLimit,
          attempts,
          win
        FROM games
        WHERE id = :id
        LIMIT 1
    ");
    $stmt->execute([':id' => $id]);
    $game = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$game) {
        return jsonResponse($response, ['error' => 'Game not found'], 404);
    }

    $game['win'] = (bool) $game['win'];

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

    return jsonResponse($response, $game);
});

/**
 * POST /games — сохранение итогов партии
 */
$app->post('/games', function (Request $request, Response $response): Response {
    $pdo = get_pdo();

    try {
        $data = parseJsonBody($request);
    } catch (RuntimeException $e) {
        return jsonResponse($response, ['error' => $e->getMessage()], 400);
    }

    $playerName = trim($data['playerName'] ?? '');
    if ($playerName === '') {
        return jsonResponse($response, ['error' => 'playerName is required'], 400);
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
        return jsonResponse($response, ['error' => 'Invalid range'], 400);
    }

    $stmt = $pdo->prepare("
        INSERT INTO games (
            started_at,
            finished_at,
            duration_ms,
            player_name,
            min_number,
            max_number,
            target_number,
            attempt_limit,
            attempts,
            win
        )
        VALUES (
            :started_at,
            :finished_at,
            :duration_ms,
            :player_name,
            :min_number,
            :max_number,
            :target_number,
            :attempt_limit,
            :attempts,
            :win
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

    $id = (int) $pdo->lastInsertId();

    return jsonResponse($response, ['id' => $id], 201);
});

/**
 * POST /step/{id} — сохранение одного хода партии
 */
$app->post('/step/{id}', function (Request $request, Response $response, array $args): Response {
    $pdo    = get_pdo();
    $gameId = (int)($args['id'] ?? 0);

    // Проверяем, что игра существует
    $stmt = $pdo->prepare('SELECT id FROM games WHERE id = :id');
    $stmt->execute([':id' => $gameId]);
    if (!$stmt->fetchColumn()) {
        return jsonResponse($response, ['error' => 'Game not found'], 404);
    }

    try {
        $data = parseJsonBody($request);
    } catch (RuntimeException $e) {
        return jsonResponse($response, ['error' => $e->getMessage()], 400);
    }

    $stepNumber = (int)($data['stepNumber'] ?? 0);
    $value      = (int)($data['value'] ?? 0);
    $result     = $data['result'] ?? '';
    $ts         = (int)($data['ts'] ?? (int)(microtime(true) * 1000));

    if ($stepNumber <= 0 || $result === '') {
        return jsonResponse($response, ['error' => 'Invalid step data'], 400);
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

    return jsonResponse($response, ['status' => 'ok'], 201);
});

/**
 * DELETE /games — очистка базы (удобно для отладки)
 */
$app->delete('/games', function (Request $request, Response $response): Response {
    $pdo = get_pdo();

    $pdo->exec('DELETE FROM steps');
    $pdo->exec('DELETE FROM games');
    $pdo->exec("DELETE FROM sqlite_sequence WHERE name IN ('games','steps')");

    return jsonResponse($response, ['status' => 'cleared']);
});

// ------------------ Запускаем приложение ------------------

$app->run();
