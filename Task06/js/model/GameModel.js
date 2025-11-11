class GameModel {
    constructor(maxNumber = 100, maxAttempts = 10) {
        this.maxNumber = maxNumber;
        this.maxAttempts = maxAttempts;
        this.secretNumber = this.generateSecretNumber();
        this.attempts = [];
        this.gameWon = false;
        this.startTime = new Date();
    }

    generateSecretNumber() {
        return Math.floor(Math.random() * this.maxNumber) + 1;
    }

    makeGuess(number) {
        if (this.isGameOver()) {
            return { error: "Игра уже завершена!" };
        }

        const attemptCount = this.attempts.length + 1;
        
        if (attemptCount > this.maxAttempts) {
            return { error: "Превышено максимальное количество попыток!" };
        }

        const attempt = {
            attempt: attemptCount,
            number: number,
            result: ''
        };

        if (number === this.secretNumber) {
            this.gameWon = true;
            attempt.result = 'win';
            return { 
                success: `Поздравляем! Вы угадали число ${this.secretNumber} за ${attemptCount} попыток!`,
                attempt: attempt
            };
        } else if (number < this.secretNumber) {
            attempt.result = 'greater';
            return { 
                hint: "Больше!",
                attempt: attempt
            };
        } else {
            attempt.result = 'less';
            return { 
                hint: "Меньше!",
                attempt: attempt
            };
        }
    }

    addAttempt(attempt) {
        this.attempts.push(attempt);
    }

    isGameOver() {
        return this.gameWon || this.attempts.length >= this.maxAttempts;
    }

    isGameWon() {
        return this.gameWon;
    }

    getAttemptsCount() {
        return this.attempts.length;
    }

    getMaxAttempts() {
        return this.maxAttempts;
    }

    getSecretNumber() {
        return this.secretNumber;
    }

    getGameData() {
        return {
            max_number: this.maxNumber,
            max_attempts: this.maxAttempts,
            secret_number: this.secretNumber,
            attempts: this.attempts,
            won: this.gameWon,
            start_time: this.startTime,
            end_time: new Date()
        };
    }
}