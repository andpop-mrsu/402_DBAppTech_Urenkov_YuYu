<?php
namespace Werrys3021\GuessNumber\View;

class View {
    public static function renderStartScreen() {
        if (function_exists('\cli\line')) {
            \cli\line("=== Угадай число (GuessNumber) ===");
            \cli\line("Режимы:");
            \cli\line("1) Новая игра");
            \cli\line("2) Список всех игр");
            \cli\line("3) Победные игры");
            \cli\line("4) Проигранные игры");
            \cli\line("5) Статистика по игрокам");
            \cli\line("6) Повтор партии");
            \cli\line("");
        } else {
            echo "=== Угадай число (GuessNumber) ===\n";
            echo "1) Новая игра\n";
            echo "2) Список всех игр\n";
            echo "3) Победные игры\n";
            echo "4) Проигранные игры\n";
            echo "5) Статистика по игрокам\n";
            echo "6) Повтор партии\n\n";
        }
    }
}
