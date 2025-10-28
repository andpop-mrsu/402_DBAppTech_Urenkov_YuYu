<?php

namespace Werrys3021\GuessNumber\Core;

use Werrys3021\GuessNumber\Controller\GameController;
use Werrys3021\GuessNumber\View\GameView;

class CLIHandler
{
    private GameController $controller;
    private GameView $view;

    public function __construct()
    {
        $this->view = new GameView();
    }

    public function handle(array $argv): void
    {
        $argc = count($argv);
        $playerName = 'Guest';
        $nameIndex = array_search('--player', $argv);
        if ($nameIndex !== false && isset($argv[$nameIndex + 1])) {
            $playerName = $argv[$nameIndex + 1];
        }

        $this->controller = new GameController($playerName);

        if ($argc === 1 || in_array('--new', $argv) || in_array('-n', $argv)) {
            $this->controller->startNewGame();
            return;
        }

        if (in_array('--help', $argv) || in_array('-h', $argv)) {
            $this->view->showHelp();
            return;
        }

        if (in_array('--list', $argv) || in_array('-l', $argv)) {
            $filter = 'all';
            if (in_array('win', $argv)) {
                $filter = 'win';
            } elseif (in_array('loose', $argv)) {
                $filter = 'loose';
            }
            $this->controller->showList($filter);
            return;
        }

        if (in_array('--top', $argv)) {
            $this->controller->showTopPlayers();
            return;
        }

        $replayIndex = array_search('--replay', $argv);
        if ($replayIndex === false) {
            $replayIndex = array_search('-r', $argv);
        }

        if ($replayIndex !== false && isset($argv[$replayIndex + 1])) {
            $gameId = (int)$argv[$replayIndex + 1];
            $this->controller->replayGame($gameId);
            return;
        }

        $this->view->showMessage("Неизвестная команда. Используйте --help для справки.");
    }
}
