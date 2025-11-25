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
        this.hintBtn = document.getElementById('hintBtn');
        this.hintsCountSpan = document.getElementById('hintsCount');
        this.gameMessage = document.getElementById('gameMessage');
        this.attemptsHistory = document.getElementById('attemptsHistory');
        this.saveGameBtn = document.getElementById('saveGameBtn');
        this.newGameBtn = document.getElementById('newGameBtn');
        this.showHistoryBtn = document.getElementById('showHistoryBtn');

        // Элементы истории
        this.filterBtns = document.querySelectorAll('.filter-btn');
        this.gamesList = document.getElementById('gamesList');
        this.backToGameBtn = document.getElementById('backToGameBtn');
        this.showStatsBtn = document.getElementById('showStatsBtn');
        this.clearHistoryBtn = document.getElementById('clearHistoryBtn');

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
        this.hintBtn.addEventListener('click', () => {
            if (this.onHint) this.onHint();
        });
        this.saveGameBtn.addEventListener('click', () => {
            if (this.onSaveGame) this.onSaveGame();
        });
        this.newGameBtn.addEventListener('click', () => {
            if (this.onNewGame) this.onNewGame();
        });
        this.showHistoryBtn.addEventListener('click', () => {
            console.log('Кнопка "История игр" нажата');
            this.showHistory(); // Используем метод showHistory
        });

        // История
        this.filterBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                console.log('Фильтр изменен:', e.target.dataset.filter);
                if (this.onFilterGames) {
                    this.onFilterGames(e.target.dataset.filter);
                }
            });
        });
        
        this.backToGameBtn.addEventListener('click', () => this.showScreen('game'));
        
        this.showStatsBtn.addEventListener('click', () => {
            if (this.onShowStats) this.onShowStats();
        });
        
        this.clearHistoryBtn.addEventListener('click', () => {
            if (this.onClearHistory) this.onClearHistory();
        });

        // Статистика
        this.backFromStatsBtn.addEventListener('click', () => this.showScreen('history'));

        // Повтор
        this.backFromReplayBtn.addEventListener('click', () => this.showScreen('history'));
    }

    // Навигация по экранам
    showScreen(screenName) {
        console.log('Переключение на экран:', screenName);
        Object.values(this.screens).forEach(screen => {
            screen.classList.remove('active');
        });
        
        if (this.screens[screenName]) {
            this.screens[screenName].classList.add('active');
        } else {
            console.error('Экран не найден:', screenName);
        }

        if (screenName === 'newGame') {
            this.playerNameInput.focus();
        } else if (screenName === 'game') {
            setTimeout(() => this.guessInput.focus(), 100);
        }
    }

    // Новый метод для показа истории
    showHistory() {
        console.log('Показ экрана истории');
        this.showScreen('history');
        // Автоматически загружаем все игры при показе истории
        if (this.onShowHistory) {
            setTimeout(() => {
                console.log('Автоматическая загрузка истории...');
                this.onShowHistory();
            }, 100);
        }
    }

    // События
    onStartGame() {
        const playerName = this.playerNameInput.value.trim() || 'Гость';
        console.log('Начало игры для игрока:', playerName);
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
        
        console.log('Попытка угадать:', guess);
        if (this.onGuess) {
            this.onGuess(guess);
        }
        
        this.guessInput.value = '';
        setTimeout(() => this.guessInput.focus(), 50);
    }

    // Методы отображения
    showNewGameScreen() {
        this.showScreen('newGame');
        this.playerNameInput.value = '';
        this.playerNameInput.focus();
    }

    showGameScreen(playerName, maxHints) {
        this.showScreen('game');
        this.currentPlayerSpan.textContent = playerName;
        this.resetGame(maxHints);
    }

    resetGame(maxHints = 3) {
        this.guessInput.disabled = false;
        this.guessBtn.disabled = false;
        this.hintBtn.disabled = false;
        
        this.guessInput.value = '';
        this.currentAttemptSpan.textContent = '1';
        this.attemptsHistory.innerHTML = '';
        this.hintsCountSpan.textContent = maxHints;
        
        this.gameMessage.textContent = 'Я загадал число от 1 до 100. У вас 10 попыток!';
        this.gameMessage.className = 'message';
        
        setTimeout(() => this.guessInput.focus(), 100);
    }

    updateGameState(attemptCount, result, attempt, hintsUsed = 0) {
        this.currentAttemptSpan.textContent = attemptCount + 1;
        
        if (result.success) {
            this.showMessage(result.success, 'success');
            this.addAttemptToHistory(attempt, 'win');
            this.disableGameInput();
        } else if (result.hint) {
            this.showMessage(result.hint, 'hint');
            this.addAttemptToHistory(attempt, 'hint');
        } else if (result.error) {
            this.showMessage(result.error, 'error');
            if (result.error.includes('Превышено')) {
                this.disableGameInput();
            }
        }
    }

    updateHints(hintsLeft) {
        this.hintsCountSpan.textContent = hintsLeft;
        if (hintsLeft === 0) {
            this.hintBtn.disabled = true;
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
        } else if (type === 'error') {
            resultText = '❌ Ошибка';
        }
        
        attemptItem.innerHTML = `
            <strong>Попытка ${attempt.attempt}:</strong> 
            ${attempt.number} - ${resultText}
            ${attempt.timestamp ? `<br><small>${new Date(attempt.timestamp).toLocaleTimeString()}</small>` : ''}
        `;
        
        this.attemptsHistory.appendChild(attemptItem);
        this.attemptsHistory.scrollTop = this.attemptsHistory.scrollHeight;
    }

    disableGameInput() {
        this.guessInput.disabled = true;
        this.guessBtn.disabled = true;
        this.hintBtn.disabled = true;
    }

    // История игр
    displayGames(games) {
        console.log('Отображение игр:', games);
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
                    Подсказки: ${game.hints_used || 0} |
                    Статус: ${game.is_won ? '🏆 Победа' : '💔 Поражение'}
                </div>
                <div class="game-time">
                    ${new Date(game.start_time).toLocaleString()}
                </div>
            `;
            
            gameItem.addEventListener('click', () => {
                console.log('Клик по игре:', game.id);
                if (this.onReplayGame) {
                    this.onReplayGame(game.id);
                }
            });
            
            this.gamesList.appendChild(gameItem);
        });
    }

    // Статистика
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
            <p>Попытки: ${game.attempts_count}/${game.max_attempts} | Подсказки: ${game.hints_used || 0}</p>
            <p>Результат: ${game.is_won ? '🏆 Победа' : '💔 Поражение'}</p>
            <p>Время: ${new Date(game.start_time).toLocaleString()}</p>
            <p>Загаданное число: ${game.secret_number}</p>
        </div>
    `;

    this.replaySteps.innerHTML = '';
    
    if (game.attempts && game.attempts.length > 0) {
        console.log('Попытки для повтора:', game.attempts);
        
        game.attempts.forEach(attempt => {
            const step = document.createElement('div');
            step.className = 'replay-step';
            
            // Нормализуем данные попытки
            const attemptNumber = attempt.attempt_number || attempt.attempt || '?';
            const guessNumber = attempt.guess_number || attempt.number || '?';
            const result = attempt.result || 'unknown';
            
            let resultText = '';
            let emoji = '';
            
            if (result === 'win') {
                resultText = '🎉 Угадал!';
                emoji = '🎉';
            } else if (result === 'greater') {
                resultText = 'Больше!';
                emoji = '📈';
            } else if (result === 'less') {
                resultText = 'Меньше!';
                emoji = '📉';
            } else if (result === 'hint') {
                resultText = 'Подсказка';
                emoji = '💡';
            } else {
                resultText = 'Неизвестно';
                emoji = '❓';
            }
            
            step.innerHTML = `
                <strong>Попытка ${attemptNumber}:</strong> 
                ${guessNumber} - ${emoji} ${resultText}
                ${attempt.timestamp ? `<br><small>${new Date(attempt.timestamp).toLocaleTimeString()}</small>` : ''}
            `;
            
            this.replaySteps.appendChild(step);
        });
    } else {
        this.replaySteps.innerHTML = `
            <div class="no-steps">
                <p>Нет данных о попытках</p>
                <p>Количество попыток в игре: ${game.attempts_count || 0}</p>
                <p>Загаданное число: ${game.secret_number}</p>
            </div>
        `;
    }
}

    // Колбэки
    setOnGameStart(callback) { this.onGameStart = callback; }
    setOnGuess(callback) { this.onGuess = callback; }
    setOnHint(callback) { this.onHint = callback; }
    setOnSaveGame(callback) { this.onSaveGame = callback; }
    setOnNewGame(callback) { this.onNewGame = callback; }
    setOnShowHistory(callback) { this.onShowHistory = callback; }
    setOnFilterGames(callback) { this.onFilterGames = callback; }
    setOnShowStats(callback) { this.onShowStats = callback; }
    setOnReplayGame(callback) { this.onReplayGame = callback; }
    setOnClearHistory(callback) { this.onClearHistory = callback; }
}