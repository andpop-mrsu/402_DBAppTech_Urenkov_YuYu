class GameApp {
    constructor() {
        this.storage = new GameStorage();
        this.view = new GameView();
        this.currentGame = null;
        this.currentPlayer = 'Гость';
        
        this.initializeApp();
    }

    async initializeApp() {
        await this.storage.init();
        
        this.view.setOnGameStart((playerName) => this.startNewGame(playerName));
        this.view.setOnGuess((guess) => this.makeGuess(guess));
        this.view.setOnFilterGames((filter) => this.filterGames(filter));
        this.view.setOnShowHistory((filter) => this.showHistory(filter));
        this.view.setOnShowStats(() => this.showStats());
        this.view.setOnReplayGame((gameId) => this.replayGame(gameId));

        this.view.showNewGameScreen();
    }

    startNewGame(playerName) {
        this.currentPlayer = playerName;
        this.currentGame = new GameModel();
        this.view.showGameScreen(playerName);
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
            result.attempt
        );

        if (this.currentGame.isGameOver() && !this.currentGame.isGameWon()) {
            this.view.showGameOver(this.currentGame.getSecretNumber());
        }

        if (this.currentGame.isGameOver()) {
            this.saveGame();
        }
    }

    async saveGame() {
        try {
            const gameData = this.currentGame.getGameData();
            await this.storage.saveGame(gameData, this.currentPlayer);
        } catch (error) {
            console.error('Ошибка сохранения игры:', error);
        }
    }

    async showHistory(filter = 'all') {
        let games = await this.storage.getGamesByResult(filter);

        games.sort((a, b) => new Date(b.start_time) - new Date(a.start_time));
        
        this.view.displayGames(games);
    }

    async filterGames(filter) {
        await this.showHistory(filter);
    }

    async showStats() {
        const topPlayers = await this.storage.getTopPlayers();
        this.view.displayStats(topPlayers);
    }

    async replayGame(gameId) {
        const game = await this.storage.getGameById(gameId);
        if (game) {
            this.view.showReplay(game);
        } else {
            alert('Игра не найдена!');
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new GameApp();
});