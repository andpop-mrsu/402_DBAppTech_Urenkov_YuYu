<?php

namespace Werrys3021\GuessNumber\Model;

class GameModel
{
    private int $maxNumber;
    private int $maxAttempts;
    private int $secretNumber;
    private array $attempts = [];
    private bool $gameWon = false;

    public function __construct(int $maxNumber = 100, int $maxAttempts = 10)
    {
        $this->maxNumber = $maxNumber;
        $this->maxAttempts = $maxAttempts;
        $this->generateSecretNumber();
    }

    private function generateSecretNumber(): void
    {
        $this->secretNumber = rand(1, $this->maxNumber);
    }

    public function makeGuess(int $number): string
    {
        $attemptCount = count($this->attempts) + 1;
        
        if ($attemptCount > $this->maxAttempts) {
            return "Превышено максимальное количество попыток!";
        }

        $this->attempts[] = [
            'attempt' => $attemptCount,
            'number' => $number,
            'result' => ''
        ];

        if ($number === $this->secretNumber) {
            $this->gameWon = true;
            $this->attempts[count($this->attempts) - 1]['result'] = 'win';
            return "Поздравляем! Вы угадали число {$this->secretNumber} за {$attemptCount} попыток!";
        } elseif ($number < $this->secretNumber) {
            $this->attempts[count($this->attempts) - 1]['result'] = 'greater';
            return "Больше!";
        } else {
            $this->attempts[count($this->attempts) - 1]['result'] = 'less';
            return "Меньше!";
        }
    }

    public function isGameOver(): bool
    {
        return $this->gameWon || count($this->attempts) >= $this->maxAttempts;
    }

    public function isGameWon(): bool
    {
        return $this->gameWon;
    }

    public function getAttemptsCount(): int
    {
        return count($this->attempts);
    }

    public function getMaxAttempts(): int
    {
        return $this->maxAttempts;
    }

    public function getSecretNumber(): int
    {
        return $this->secretNumber;
    }

    public function getGameData(): array
    {
        return [
            'max_number' => $this->maxNumber,
            'max_attempts' => $this->maxAttempts,
            'secret_number' => $this->secretNumber,
            'attempts' => $this->attempts,
            'won' => $this->gameWon
        ];
    }
}