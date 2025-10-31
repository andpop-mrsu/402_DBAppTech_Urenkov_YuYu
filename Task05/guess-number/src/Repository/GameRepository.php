<?php

namespace Werrys3021\GuessNumber\Repository;

use Werrys3021\GuessNumber\Config\DatabaseConfig;

class GameRepository
{
    private \RedBeanPHP\ToolBox $redbean;

    public function __construct(DatabaseConfig $config = null)    
    {
    $config = $config ?? new DatabaseConfig();
    $config->getRedBean(); 
    }

    public function saveGame(array $gameData, string $playerName = 'Guest'): int
    {
        $game = \RedBeanPHP\R::dispense('games');
        $game->player_name = $playerName;
        $game->max_number = $gameData['max_number'];
        $game->max_attempts = $gameData['max_attempts'];
        $game->secret_number = $gameData['secret_number'];
        $game->is_won = $gameData['won'] ? 1 : 0;
        $game->attempts_count = count($gameData['attempts']);
        $game->start_time = date('Y-m-d H:i:s');
        $game->end_time = date('Y-m-d H:i:s');
        
        $gameId = \RedBeanPHP\R::store($game);
        foreach ($gameData['attempts'] as $attempt) {
            $this->saveAttempt($gameId, $attempt);
        }

        return (int)$gameId;
    }

    private function saveAttempt(int $gameId, array $attempt): void
    {
        $attemptBean = \RedBeanPHP\R::dispense('attempts');
        $attemptBean->game_id = $gameId;
        $attemptBean->attempt_number = $attempt['attempt'];
        $attemptBean->guess_number = $attempt['number'];
        $attemptBean->result = $attempt['result'];
        $attemptBean->timestamp = date('Y-m-d H:i:s');
        
        \RedBeanPHP\R::store($attemptBean);
    }

    public function getAllGames(): array
    {
        $games = \RedBeanPHP\R::findAll('games', ' ORDER BY start_time DESC');
        
        $result = [];
        foreach ($games as $game) {
            $result[] = $this->gameToArray($game);
        }
        
        return $result;
    }

    public function getGamesByResult(string $result): array
    {
        $isWon = $result === 'win' ? 1 : 0;
        $games = \RedBeanPHP\R::find('games', ' is_won = ? ORDER BY start_time DESC', [$isWon]);
        
        $resultArray = [];
        foreach ($games as $game) {
            $resultArray[] = $this->gameToArray($game);
        }
        
        return $resultArray;
    }

    public function getGameById(int $gameId): ?array
    {
        $game = \RedBeanPHP\R::load('games', $gameId);
        
        if ($game->id === 0) {
            return null;
        }

        $gameArray = $this->gameToArray($game);
        
        // Загружаем попытки
        $attempts = \RedBeanPHP\R::find('attempts', ' game_id = ? ORDER BY attempt_number', [$gameId]);
        $gameArray['attempts'] = [];
        
        foreach ($attempts as $attempt) {
            $gameArray['attempts'][] = [
                'attempt_number' => (int)$attempt->attempt_number,
                'guess_number' => (int)$attempt->guess_number,
                'result' => $attempt->result
            ];
        }
        
        return $gameArray;
    }

    public function getTopPlayers(): array
    {
        $sql = "
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
        ";
        
        return \RedBeanPHP\R::getAll($sql);
    }

    private function gameToArray(\RedBeanPHP\OODBBean $game): array
    {
        return [
            'id' => (int)$game->id,
            'player_name' => $game->player_name,
            'max_number' => (int)$game->max_number,
            'max_attempts' => (int)$game->max_attempts,
            'secret_number' => (int)$game->secret_number,
            'is_won' => (bool)$game->is_won,
            'attempts_count' => (int)$game->attempts_count,
            'start_time' => $game->start_time,
            'end_time' => $game->end_time,
            'actual_attempts' => (int)$game->attempts_count
        ];
    }
}