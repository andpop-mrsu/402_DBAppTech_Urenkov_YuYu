<?php

namespace Werrys3021\GuessNumber\Repository;

use Werrys3021\GuessNumber\Config\DatabaseConfig;

class GameRepository
{
    private \PDO $pdo;

    public function __construct(DatabaseConfig $config = null)
    {
        $config = $config ?? new DatabaseConfig();
        $this->pdo = $config->getConnection();
    }

    public function saveGame(array $gameData, string $playerName = 'Guest'): int
    {
        $stmt = $this->pdo->prepare("
            INSERT INTO games (player_name, max_number, max_attempts, secret_number, is_won, attempts_count, end_time)
            VALUES (:player_name, :max_number, :max_attempts, :secret_number, :is_won, :attempts_count, CURRENT_TIMESTAMP)
        ");

        $stmt->execute([
            ':player_name' => $playerName,
            ':max_number' => $gameData['max_number'],
            ':max_attempts' => $gameData['max_attempts'],
            ':secret_number' => $gameData['secret_number'],
            ':is_won' => $gameData['won'] ? 1 : 0,
            ':attempts_count' => count($gameData['attempts'])
        ]);

        $gameId = (int)$this->pdo->lastInsertId();

        foreach ($gameData['attempts'] as $attempt) {
            $this->saveAttempt($gameId, $attempt);
        }

        return $gameId;
    }

    private function saveAttempt(int $gameId, array $attempt): void
    {
        $stmt = $this->pdo->prepare("
            INSERT INTO attempts (game_id, attempt_number, guess_number, result)
            VALUES (:game_id, :attempt_number, :guess_number, :result)
        ");

        $stmt->execute([
            ':game_id' => $gameId,
            ':attempt_number' => $attempt['attempt'],
            ':guess_number' => $attempt['number'],
            ':result' => $attempt['result']
        ]);
    }

    public function getAllGames(): array
    {
        $stmt = $this->pdo->query("
            SELECT g.*, COUNT(a.id) as actual_attempts
            FROM games g
            LEFT JOIN attempts a ON g.id = a.game_id
            GROUP BY g.id
            ORDER BY g.start_time DESC
        ");

        return $stmt->fetchAll();
    }

    public function getGamesByResult(string $result): array
    {
        $isWon = $result === 'win' ? 1 : 0;

        $stmt = $this->pdo->prepare("
            SELECT g.*, COUNT(a.id) as actual_attempts
            FROM games g
            LEFT JOIN attempts a ON g.id = a.game_id
            WHERE g.is_won = :is_won
            GROUP BY g.id
            ORDER BY g.start_time DESC
        ");

        $stmt->execute([':is_won' => $isWon]);
        return $stmt->fetchAll();
    }

    public function getGameById(int $gameId): ?array
    {
        $stmt = $this->pdo->prepare("
            SELECT * FROM games WHERE id = :id
        ");

        $stmt->execute([':id' => $gameId]);
        $game = $stmt->fetch();

        if (!$game) {
            return null;
        }

        $stmt = $this->pdo->prepare("
            SELECT * FROM attempts
            WHERE game_id = :game_id
            ORDER BY attempt_number
        ");

        $stmt->execute([':game_id' => $gameId]);
        $game['attempts'] = $stmt->fetchAll();

        return $game;
    }

    public function getTopPlayers(): array
    {
        $stmt = $this->pdo->query("
            SELECT
                player_name,
                COUNT(*) as total_games,
                SUM(is_won) as wins,
                ROUND(SUM(is_won) * 100.0 / COUNT(*), 2) as win_rate,
                AVG(attempts_count) as avg_attempts
            FROM games
            GROUP BY player_name
            HAVING total_games >= 1
            ORDER BY win_rate DESC, wins DESC
        ");

        return $stmt->fetchAll();
    }
}
