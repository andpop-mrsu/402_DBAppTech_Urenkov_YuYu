<?php

namespace Werrys3021\GuessNumber\Controller;

use Werrys3021\GuessNumber\Model\GameModel;
use Werrys3021\GuessNumber\View\GameView;
use Werrys3021\GuessNumber\Repository\GameRepository;
use Werrys3021\GuessNumber\Config\DatabaseConfig;

class GameController
{
    private GameModel $model;
    private GameView $view;
    private GameRepository $repository;
    private string $playerName;

    public function __construct(string $playerName = 'Guest')
    {
        $this->view = new GameView();
        $this->repository = new GameRepository();
        $this->playerName = $playerName;
        
        $config = new DatabaseConfig();
        $config->initializeDatabase();
    }

    public function startNewGame(int $maxNumber = 100, int $maxAttempts = 10): void
    {
        $this->model = new GameModel($maxNumber, $maxAttempts);
        $this->view->showWelcome();
        
        $this->view->showMessage("Я загадал число от 1 до {$maxNumber}. У вас {$maxAttempts} попыток.");

        while (!$this->model->isGameOver()) {
            $input = $this->view->prompt("Попытка " . ($this->model->getAttemptsCount() + 1) . ": ");
            
            if (!is_numeric($input)) {
                $this->view->showMessage("Пожалуйста, введите число!");
                continue;
            }

            $guess = (int)$input;
            $result = $this->model->makeGuess($guess);
            $this->view->showMessage($result);
        }

        if (!$this->model->isGameWon()) {
            $this->view->showMessage("Игра окончена! Загаданное число было: " . $this->model->getSecretNumber());
        }

        $gameData = $this->model->getGameData();
        $gameId = $this->repository->saveGame($gameData, $this->playerName);
        $this->view->showMessage("Игра сохранена в базе данных с ID: {$gameId}");
    }

    public function showList(string $filter = 'all'): void
    {
        $games = [];
        
        switch ($filter) {
            case 'win':
                $games = $this->repository->getGamesByResult('win');
                $this->view->showMessage("=== Список выигранных игр ===");
                break;
            case 'loose':
                $games = $this->repository->getGamesByResult('loose');
                $this->view->showMessage("=== Список проигранных игр ===");
                break;
            default:
                $games = $this->repository->getAllGames();
                $this->view->showMessage("=== Список всех игр ===");
                break;
        }

        if (empty($games)) {
            $this->view->showMessage("Игры не найдены.");
            return;
        }

        foreach ($games as $game) {
            $status = $game['is_won'] ? 'Победа' : 'Поражение';
            $this->view->showMessage(
                "ID: {$game['id']} | Игрок: {$game['player_name']} | " .
                "Число: 1-{$game['max_number']} | Попытки: {$game['attempts_count']}/{$game['max_attempts']} | " .
                "Статус: {$status} | Дата: {$game['start_time']}"
            );
        }
    }

    public function showTopPlayers(): void
    {
        $topPlayers = $this->repository->getTopPlayers();
        
        $this->view->showMessage("=== Топ игроков ===");
        
        if (empty($topPlayers)) {
            $this->view->showMessage("Статистика игроков отсутствует.");
            return;
        }

        foreach ($topPlayers as $index => $player) {
            $this->view->showMessage(
                ($index + 1) . ". {$player['player_name']} | " .
                "Игры: {$player['total_games']} | Победы: {$player['wins']} | " .
                "Процент побед: {$player['win_rate']}% | " .
                "Среднее кол-во попыток: " . round($player['avg_attempts'], 1)
            );
        }
    }

    public function replayGame(int $gameId): void
    {
        $game = $this->repository->getGameById($gameId);
        
        if (!$game) {
            $this->view->showMessage("Игра с ID {$gameId} не найдена.");
            return;
        }

        $this->view->showMessage("=== Повтор игры #{$gameId} ===");
        $this->view->showMessage("Игрок: {$game['player_name']}");
        $this->view->showMessage("Загаданное число: 1-{$game['max_number']}");
        $this->view->showMessage("Максимум попыток: {$game['max_attempts']}");
        $this->view->showMessage("Результат: " . ($game['is_won'] ? 'Победа' : 'Поражение'));
        $this->view->showMessage("");

        $this->view->showMessage("Ход игры:");
        foreach ($game['attempts'] as $attempt) {
            $resultText = match($attempt['result']) {
                'win' => "Угадал!",
                'greater' => "Больше!",
                'less' => "Меньше!",
                default => $attempt['result']
            };
            
            $this->view->showMessage(
                "Попытка {$attempt['attempt_number']}: {$attempt['guess_number']} - {$resultText}"
            );
        }
    }
}
