<?php

namespace Werrys3021\GuessNumber\Config;

class DatabaseConfig
{
    private string $dbPath;

    public function __construct(string $dbPath = null)
    {
        $this->dbPath = $dbPath ?? __DIR__ . '/../../data/game_database.sqlite';
        
        $dir = dirname($this->dbPath);
        if (!is_dir($dir)) {
            mkdir($dir, 0755, true);
        }
    }

    public function getConnection(): \PDO
    {
        $dsn = "sqlite:" . $this->dbPath;
        $pdo = new \PDO($dsn);
        $pdo->setAttribute(\PDO::ATTR_ERRMODE, \PDO::ERRMODE_EXCEPTION);
        $pdo->setAttribute(\PDO::ATTR_DEFAULT_FETCH_MODE, \PDO::FETCH_ASSOC);
        
        return $pdo;
    }

    public function initializeDatabase(): void
    {
        $pdo = $this->getConnection();
        
        $pdo->exec("
            CREATE TABLE IF NOT EXISTS games (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                player_name TEXT NOT NULL DEFAULT 'Guest',
                max_number INTEGER NOT NULL,
                max_attempts INTEGER NOT NULL,
                secret_number INTEGER NOT NULL,
                is_won BOOLEAN NOT NULL,
                attempts_count INTEGER NOT NULL,
                start_time DATETIME DEFAULT CURRENT_TIMESTAMP,
                end_time DATETIME
            )
        ");
        
        $pdo->exec("
            CREATE TABLE IF NOT EXISTS attempts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                game_id INTEGER NOT NULL,
                attempt_number INTEGER NOT NULL,
                guess_number INTEGER NOT NULL,
                result TEXT NOT NULL,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (game_id) REFERENCES games (id) ON DELETE CASCADE
            )
        ");
    }
}
