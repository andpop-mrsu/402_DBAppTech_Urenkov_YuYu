<?php

namespace Werrys3021\GuessNumber\View;

class GameView
{
    public static function showWelcome(): void
    {
        self::output("=== Игра 'Угадай число' ===");
        self::output("Добро пожаловать в игру!");
    }

    public static function showHelp(): void
    {
        self::output("Доступные параметры:");
        self::output("  -n, --new           Новая игра");
        self::output("  -l, --list          Список всех игр");
        self::output("  -l win              Список победных игр");
        self::output("  -l loose            Список проигранных игр");
        self::output("  --top               Статистика по игрокам");
        self::output("  -r ID, --replay ID  Повтор игры с ID");
        self::output("  -h, --help          Эта справка");
    }

    public static function showMessage(string $message): void
    {
        self::output($message);
    }

    public static function showDatabaseMessage(): void
    {
        self::output("⚠️  Внимание: игра пока не сохраняется в базе данных");
    }

    public static function prompt(string $message): string
    {
        if (function_exists('cli\prompt')) {
            return \cli\prompt($message);
        }
        echo $message;
        return trim(fgets(STDIN));
    }

    private static function output(string $message): void
    {
        if (function_exists('cli\line')) {
            \cli\line($message);
        } else {
            echo $message . PHP_EOL;
        }
    }
}