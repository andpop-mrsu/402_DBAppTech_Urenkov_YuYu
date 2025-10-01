<?php

namespace Werrys3021\GuessNumber\Controller;

use Werrys3021\GuessNumber\Model\GameModel;
use Werrys3021\GuessNumber\View\GameView;

class GameController
{
    private GameModel $model;
    private GameView $view;

    public function __construct()
    {
        $this->view = new GameView();
    }

    public function startNewGame(int $maxNumber = 100, int $maxAttempts = 10): void
    {
        $this->model = new GameModel($maxNumber, $maxAttempts);
        $this->view->showWelcome();
        $this->view->showDatabaseMessage();
        
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
    }

    public function showList(string $filter = 'all'): void
    {
        $this->view->showDatabaseMessage();
        $this->view->showMessage("Режим просмотра списка игр ({$filter})");
    }

    public function showTopPlayers(): void
    {
        $this->view->showDatabaseMessage();
        $this->view->showMessage("Режим статистики по игрокам");
    }

    public function replayGame(int $gameId): void
    {
        $this->view->showDatabaseMessage();
        $this->view->showMessage("Режим повтора игры #{$gameId}");
    }
}