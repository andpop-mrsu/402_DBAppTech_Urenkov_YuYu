class GameView {
    constructor() {
        this.screens = {
            newGame: document.getElementById('newGameScreen'),
            game: document.getElementById('gameScreen'),
            history: document.getElementById('historyScreen'),
            stats: document.getElementById('statsScreen'),
            replay: document.getElementById('replayScreen')
        };

        this.initializeElements();
        this.attachEventListeners();
    }

    initializeElements() {
        // Элементы новой игры
        this.playerNameInput = document.getElementById('playerName');
        this.startGameBtn = document.getElementById('startGameBtn');

        // Элементы игры
        this.currentPlayerSpan = document.getElementById('currentPlayer');
        this.currentAttemptSpan = document.getElementById('currentAttempt');
        this.guessInput = document.getElementById('guessInput');
        this.guessBtn = document.getElementById('guessBtn');
        this.gameMessage = document.getElementById('gameMessage');
        this.attemptsHistory = document.getElementById('attemptsHistory');
        this.newGameBtn = document.getElementById('newGameBtn');
        this.showHistoryBtn = document.getElementById('showHistoryBtn');

        // Элементы истории
        this.filterBtns = document.querySelectorAll('.filter-btn');
        this.gamesList = document.getElementById('gamesList');
        this.backToGameBtn = document.getElementById('backToGameBtn');
        this.showStatsBtn = document.getElementById('showStatsBtn');

        // Элементы статистики
        this.topPlayers = document.getElementById('topPlayers');
        this.backFromStatsBtn = document.getElementById('backFromStatsBtn');

        // Элементы повтора
        this.replayInfo = document.getElementById('replayInfo');
        this.replaySteps = document.getElementById('replaySteps');
        this.backFromReplayBtn = document.getElementById('backFromReplayBtn');
    }

    attachEventListeners() {
        // Новая игра
        this.startGameBtn.addEventListener('click', () => this.onStartGame());
        this.playerNameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.onStartGame();
        });

        // Игра
        this.guessBtn.addEventListener('click', () => this.onMakeGuess());
        this.guessInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.onMakeGuess();
        });
        this.newGameBtn.addEventListener('click', () => this.showNewGameScreen());
        this.showHistoryBtn.addEventListener('click', () => this.showHistory());

        // История
        this.filterBtns.forEach(btn => {
            btn.addEventListener('click', (e) => this.onFilterChange(e.target));
        });
        this.backToGameBtn.addEventListener('click', () => this.showScreen('game'));
        this.showStatsBtn.addEventListener('click', () => this.showStats());

        // Статистика
        this.backFromStatsBtn.addEventListener('click', () => this.showScreen('history'));

        // Повтор
        this.backFromReplayBtn.addEventListener('click', () => this.showScreen('history'));
    }

    // Навигация по экранам
    showScreen(screenName) {
        Object.values(this.screens).forEach(screen => {
            screen.classList.remove('active');
        });
        this.screens[screenName].classList.add('active');

        // Особые действия при показе экранов
        if (screenName === 'newGame') {
            this.playerNameInput.focus();
        } else if (screenName === 'game') {
            setTimeout(() => {
                this.guessInput.focus();
            }, 100);
        }
    }

    // События
    onStartGame() {
        const playerName = this.playerNameInput.value.trim() || 'Гость';
        if (this.onGameStart) {
            this.onGameStart(playerName);
        }
    }

    onMakeGuess() {
        const guess = parseInt(this.guessInput.value);
        if (isNaN(guess) || guess < 1 || guess > 100) {
            this.showMessage('Пожалуйста, введите число от 1 до 100!', 'error');
            return;
        }
        
        if (this.onGuess) {
            this.onGuess(guess);
        }
        
        this.guessInput.value = '';
        setTimeout(() => {
            this.guessInput.focus();
        }, 50);
    }

    onFilterChange(selectedBtn) {
        this.filterBtns.forEach(btn => btn.classList.remove('active'));
        selectedBtn.classList.add('active');
        
        if (this.onFilterGames) {
            this.onFilterGames(selectedBtn.dataset.filter);
        }
    }

    // Методы отображения
    showNewGameScreen() {
        this.showScreen('newGame');
        this.playerNameInput.value = '';
        this.playerNameInput.focus();
    }

    showGameScreen(playerName) {
        this.showScreen('game');
        this.currentPlayerSpan.textContent = playerName;
        this.resetGame();
    }

    resetGame() {
        // Разблокируем элементы ввода
        this.guessInput.disabled = false;
        this.guessBtn.disabled = false;
        
        // Очищаем поля
        this.guessInput.value = '';
        this.currentAttemptSpan.textContent = '1';
        this.attemptsHistory.innerHTML = '';
        
        // Сбрасываем сообщения
        this.gameMessage.textContent = 'Я загадал число от 1 до 100. У вас 10 попыток!';
        this.gameMessage.className = 'message';
        
        // Фокусируемся на поле ввода
        setTimeout(() => {
            this.guessInput.focus();
        }, 100);
    }

    updateGameState(attemptCount, result, attempt) {
        this.currentAttemptSpan.textContent = attemptCount + 1;
        
        if (result.success) {
            this.showMessage(result.success, 'success');
            this.addAttemptToHistory(attempt, 'win');
            this.guessInput.disabled = true;
            this.guessBtn.disabled = true;
        } else if (result.hint) {
            this.showMessage(result.hint, 'hint');
            this.addAttemptToHistory(attempt, 'hint');
        } else if (result.error) {
            this.showMessage(result.error, 'error');
        }
    }

    showMessage(message, type = 'info') {
        this.gameMessage.textContent = message;
        this.gameMessage.className = `message ${type}`;
    }

    addAttemptToHistory(attempt, type) {
        const attemptItem = document.createElement('div');
        attemptItem.className = `attempt-item ${type}`;
        
        let resultText = '';
        if (type === 'win') {
            resultText = '🎉 Угадал!';
        } else if (type === 'hint') {
            resultText = attempt.result === 'greater' ? '📈 Больше!' : '📉 Меньше!';
        }
        
        attemptItem.innerHTML = `
            <strong>Попытка ${attempt.attempt}:</strong> 
            ${attempt.number} - ${resultText}
        `;
        
        this.attemptsHistory.appendChild(attemptItem);
        this.attemptsHistory.scrollTop = this.attemptsHistory.scrollHeight;
    }

    showGameOver(secretNumber) {
        this.showMessage(`Игра окончена! Загаданное число было: ${secretNumber}`, 'error');
    }

    // История игр
    async showHistory() {
        this.showScreen('history');
        if (this.onShowHistory) {
            await this.onShowHistory('all');
        }
    }

    displayGames(games) {
        this.gamesList.innerHTML = '';
        
        if (games.length === 0) {
            this.gamesList.innerHTML = '<div class="no-games">Игры не найдены</div>';
            return;
        }

        games.forEach(game => {
            const gameItem = document.createElement('div');
            gameItem.className = `game-item ${game.is_won ? 'win' : 'loose'}`;
            gameItem.innerHTML = `
                <div class="game-header">
                    <strong>Игра #${game.id}</strong> - ${game.player_name}
                </div>
                <div class="game-details">
                    Число: 1-${game.max_number} | 
                    Попытки: ${game.attempts_count}/${game.max_attempts} | 
                    Статус: ${game.is_won ? '🏆 Победа' : '💔 Поражение'}
                </div>
                <div class="game-time">
                    ${new Date(game.start_time).toLocaleString()}
                </div>
            `;
            
            gameItem.addEventListener('click', () => {
                if (this.onReplayGame) {
                    this.onReplayGame(game.id);
                }
            });
            
            this.gamesList.appendChild(gameItem);
        });
    }

    // Статистика
    async showStats() {
        this.showScreen('stats');
        if (this.onShowStats) {
            await this.onShowStats();
        }
    }

    displayStats(players) {
        this.topPlayers.innerHTML = '';
        
        if (players.length === 0) {
            this.topPlayers.innerHTML = '<div class="no-stats">Статистика отсутствует</div>';
            return;
        }

        players.forEach((player, index) => {
            const playerStats = document.createElement('div');
            playerStats.className = 'player-stats';
            playerStats.innerHTML = `
                <div class="player-rank">${index + 1}.</div>
                <div class="player-info">
                    <strong>${player.player_name}</strong>
                </div>
                <div class="player-details">
                    Игры: ${player.total_games} | 
                    Победы: ${player.wins} | 
                    Процент побед: ${player.win_rate}% |
                    Средние попытки: ${player.avg_attempts}
                </div>
            `;
            this.topPlayers.appendChild(playerStats);
        });
    }

    // Повтор игры
    showReplay(game) {
        this.showScreen('replay');
        
        this.replayInfo.innerHTML = `
            <div class="replay-header">
                <h3>Игра #${game.id}</h3>
                <p>Игрок: ${game.player_name} | Число: 1-${game.max_number}</p>
                <p>Результат: ${game.is_won ? '🏆 Победа' : '💔 Поражение'}</p>
            </div>
        `;

        this.replaySteps.innerHTML = '';
        game.attempts.forEach(attempt => {
            const step = document.createElement('div');
            step.className = 'replay-step';
            
            let resultText = '';
            if (attempt.result === 'win') {
                resultText = '🎉 Угадал!';
            } else if (attempt.result === 'greater') {
                resultText = '📈 Больше!';
            } else if (attempt.result === 'less') {
                resultText = '📉 Меньше!';
            }
            
            step.innerHTML = `
                <strong>Попытка ${attempt.attempt_number}:</strong> 
                ${attempt.guess_number} - ${resultText}
            `;
            
            this.replaySteps.appendChild(step);
        });
    }

    // Колбэки
    setOnGameStart(callback) { this.onGameStart = callback; }
    setOnGuess(callback) { this.onGuess = callback; }
    setOnFilterGames(callback) { this.onFilterGames = callback; }
    setOnShowHistory(callback) { this.onShowHistory = callback; }
    setOnShowStats(callback) { this.onShowStats = callback; }
    setOnReplayGame(callback) { this.onReplayGame = callback; }
}