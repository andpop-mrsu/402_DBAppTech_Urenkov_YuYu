#!/usr/bin/env php
<?php

require_once __DIR__ . '/../vendor/autoload.php';

use Werrys3021\GuessNumber\Core\CLIHandler;

try {
    $handler = new CLIHandler();
    $handler->handle($argv);
} catch (Exception $e) {
    echo "Ошибка: " . $e->getMessage() . PHP_EOL;
    exit(1);
}