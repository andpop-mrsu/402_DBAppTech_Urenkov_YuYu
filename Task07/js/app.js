class GameApp {
    constructor() {
        this.storage = new GameStorage();
        this.view = new GameView();
        this.currentGame = null;
        this.currentPlayer = 'Гость';
        this.hintsUsed = 0;
        this.maxHints = 3;
        
        this.initializeApp();
    }

    async initializeApp() {
        try {
            await this.storage.init();
            console.log('БД инициализирована');
            
            this.setupEventHandlers();
            this.view.showNewGameScreen();
            
        } catch (error) {
            console.error('Ошибка инициализации:', error);
            this.view.showMessage('Ошибка загрузки базы данных', 'error');
        }
    }

    setupEventHandlers() {
        this.view.setOnGameStart((playerName) => this.startNewGame(playerName));
        this.view.setOnGuess((guess) => this.makeGuess(guess));
        this.view.setOnHint(() => this.useHint());
        this.view.setOnSaveGame(() => this.saveCurrentGame());
        this.view.setOnNewGame(() => this.startNewGame(this.currentPlayer));
        this.view.setOnShowHistory(() => this.showHistory());
        this.view.setOnFilterGames((filter) => this.filterGames(filter));
        this.view.setOnShowStats(() => this.showStats());
        this.view.setOnReplayGame((gameId) => this.replayGame(gameId));
        this.view.setOnClearHistory(() => this.clearHistory());
    }

    startNewGame(playerName) {
        this.currentPlayer = playerName || 'Гость';
        this.currentGame = new GameModel();
        this.hintsUsed = 0;
        this.view.showGameScreen(this.currentPlayer, this.maxHints);
        this.view.showMessage('Я загадал число от 1 до 100. У вас 10 попыток!', 'info');
    }

    makeGuess(guess) {
        if (!this.currentGame) return;

        const result = this.currentGame.makeGuess(guess);
        
        if (result.attempt) {
            this.currentGame.addAttempt(result.attempt);
        }

        this.view.updateGameState(
            this.currentGame.getAttemptsCount(),
            result,
            result.attempt,
            this.hintsUsed
        );

        if (this.currentGame.isGameOver()) {
            this.saveGame();
            
            if (this.currentGame.isGameWon()) {
                this.view.showMessage(`🎉 Поздравляем! Вы выиграли за ${this.currentGame.getAttemptsCount()} попыток!`, 'success');
            } else {
                this.view.showMessage(`💀 Игра окончена! Загаданное число: ${this.currentGame.getSecretNumber()}`, 'error');
            }
        }
    }

    useHint() {
        if (this.hintsUsed >= this.maxHints) {
            this.view.showMessage('Подсказки закончились!', 'error');
            return;
        }

        if (!this.currentGame) return;

        this.hintsUsed++;
        const hint = this.currentGame.getHint();
        this.view.showMessage(hint, 'hint');
        this.view.updateHints(this.maxHints - this.hintsUsed);
        
        // Добавляем подсказку в историю
        const attempt = {
            attempt: this.currentGame.getAttemptsCount() + 1,
            number: '💡',
            result: 'hint'
        };
        this.view.addAttemptToHistory(attempt, 'hint');
    }

    async saveCurrentGame() {
        if (!this.currentGame) {
            this.view.showMessage('Нет активной игры для сохранения', 'error');
            return;
        }

        try {
            await this.saveGame();
            this.view.showMessage('Игра успешно сохранена!', 'success');
        } catch (error) {
            console.error('Ошибка сохранения:', error);
            this.view.showMessage('Ошибка сохранения игры', 'error');
        }
    }

    async saveGame() {
        if (!this.currentGame) return;

        const gameData = this.currentGame.getGameData();
        gameData.hints_used = this.hintsUsed;
        
        await this.storage.saveGame(gameData, this.currentPlayer);
    }

    async showHistory() {
        try {
            console.log('Загрузка истории игр...');
            const games = await this.storage.getAllGames();
            console.log('Загружено игр:', games.length);
            
            games.sort((a, b) => new Date(b.start_time) - new Date(a.start_time));
            this.view.displayGames(games);
        } catch (error) {
            console.error('Ошибка загрузки истории:', error);
            this.view.showMessage('Ошибка загрузки истории игр', 'error');
        }
    }

    async filterGames(filter) {
        try {
            console.log('Фильтрация по:', filter);
            const games = await this.storage.getGamesByResult(filter);
            games.sort((a, b) => new Date(b.start_time) - new Date(a.start_time));
            this.view.displayGames(games);
        } catch (error) {
            console.error('Ошибка фильтрации:', error);
            this.view.showMessage('Ошибка фильтрации игр', 'error');
        }
    }

    async showStats() {
        try {
            const topPlayers = await this.storage.getTopPlayers();
            this.view.displayStats(topPlayers);
        } catch (error) {
            console.error('Ошибка загрузки статистики:', error);
            this.view.showMessage('Ошибка загрузки статистики', 'error');
        }
    }

    async replayGame(gameId) {
        try {
            const game = await this.storage.getGameById(gameId);
            if (game) {
                this.view.showReplay(game);
            } else {
                this.view.showMessage('Игра не найдена!', 'error');
            }
        } catch (error) {
            console.error('Ошибка загрузки игры:', error);
            this.view.showMessage('Ошибка загрузки игры', 'error');
        }
    }

    async clearHistory() {
        if (confirm('Вы уверены, что хотите очистить всю историю игр?')) {
            try {
                await this.storage.clearAllGames();
                this.view.showMessage('История игр очищена', 'success');
                await this.showHistory();
            } catch (error) {
                console.error('Ошибка очистки истории:', error);
                this.view.showMessage('Ошибка очистки истории', 'error');
            }
        }
    }
}

// Инициализация приложения
document.addEventListener('DOMContentLoaded', () => {
    new GameApp();
});