<?php

namespace Werrys3021\GuessNumber\Config;

class DatabaseConfig
{
    private string $dbPath;
    private static bool $initialized = false;

    public function __construct(string $dbPath = null)
    {
        $this->dbPath = $dbPath ?? __DIR__ . '/../../data/game_database.sqlite';
        
        $dir = dirname($this->dbPath);
        if (!is_dir($dir)) {
            mkdir($dir, 0755, true);
        }
    }

    public function initializeDatabase(): void
    {
        if (self::$initialized) {
            return;
        }

        // Подключаем RedBeanPHP
        require_once __DIR__ . '/../../vendor/autoload.php';
        
        // Настройка RedBean (только если еще не настроен)
        if (!class_exists('R') || !\RedBeanPHP\R::testConnection()) {
            \RedBeanPHP\R::setup('sqlite:' . $this->dbPath);
            \RedBeanPHP\R::useFeatureSet('novice/latest');
            \RedBeanPHP\R::freeze(false); // Разрешаем изменение структуры
        }

        self::$initialized = true;
    }

    public function getRedBean(): void
    {
        $this->initializeDatabase();
    }
}