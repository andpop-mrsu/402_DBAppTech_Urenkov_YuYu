class GameModel {
    constructor(maxNumber = 100, maxAttempts = 10) {
        this.maxNumber = maxNumber;
        this.maxAttempts = maxAttempts;
        this.secretNumber = this.generateSecretNumber();
        this.attempts = [];
        this.gameWon = false;
        this.startTime = new Date();
        this.endTime = null;
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
            this.endTime = new Date();
            return { error: "Превышено максимальное количество попыток!" };
        }

        const attempt = {
            attempt: attemptCount,
            number: number,
            result: '',
            timestamp: new Date()
        };

        if (number === this.secretNumber) {
            this.gameWon = true;
            this.endTime = new Date();
            attempt.result = 'win';
            return { 
                success: `🎉 Поздравляем! Вы угадали число ${this.secretNumber} за ${attemptCount} попыток!`,
                attempt: attempt
            };
        } else if (number < this.secretNumber) {
            attempt.result = 'greater';
            return { 
                hint: "📈 Больше!",
                attempt: attempt
            };
        } else {
            attempt.result = 'less';
            return { 
                hint: "📉 Меньше!",
                attempt: attempt
            };
        }
    }

    addAttempt(attempt) {
        this.attempts.push(attempt);
    }

    getHint() {
        const range = 15;
        let min = Math.max(1, this.secretNumber - range);
        let max = Math.min(this.maxNumber, this.secretNumber + range);
        return `💡 Подсказка: число между ${min} и ${max}`;
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
            end_time: this.endTime || new Date()
        };
    }

    getRemainingAttempts() {
        return this.maxAttempts - this.attempts.length;
    }
}