class GameStorage {
    constructor() {
        this.dbName = 'GuessNumberDB';
        this.version = 4;
        this.db = null;
    }

    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);

            request.onerror = () => {
                console.error('Ошибка открытия БД:', request.error);
                reject(request.error);
            };
            
            request.onsuccess = () => {
                this.db = request.result;
                console.log('IndexedDB успешно инициализирована');
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                console.log('Обновление IndexedDB до версии:', this.version);

                // Удаляем старые хранилища если есть
                if (db.objectStoreNames.contains('games')) {
                    db.deleteObjectStore('games');
                }

                // Создаем новое хранилище для игр
                const gamesStore = db.createObjectStore('games', { 
                    keyPath: 'id', 
                    autoIncrement: true 
                });
                
                // Создаем индексы для быстрого поиска
                gamesStore.createIndex('player_name', 'player_name', { unique: false });
                gamesStore.createIndex('is_won', 'is_won', { unique: false });
                gamesStore.createIndex('start_time', 'start_time', { unique: false });

                console.log('IndexedDB хранилище создано');
            };
        });
    }

    async saveGame(gameData, playerName = 'Гость') {
    return new Promise((resolve, reject) => {
        const transaction = this.db.transaction(['games'], 'readwrite');
        
        // Нормализуем данные попыток перед сохранением
        const normalizedAttempts = gameData.attempts.map((attempt, index) => {
            return {
                attempt_number: attempt.attempt || (index + 1),
                guess_number: attempt.number,
                result: attempt.result,
                timestamp: attempt.timestamp || new Date()
            };
        });

        const gameToSave = {
            player_name: playerName,
            max_number: gameData.max_number,
            max_attempts: gameData.max_attempts,
            secret_number: gameData.secret_number,
            is_won: Boolean(gameData.won),
            attempts_count: gameData.attempts.length,
            hints_used: gameData.hints_used || 0,
            start_time: gameData.start_time,
            end_time: gameData.end_time,
            attempts: normalizedAttempts // Сохраняем нормализованные попытки
        };

        console.log('Сохранение игры с попытками:', gameToSave.attempts);

        const gamesStore = transaction.objectStore('games');
        const gameRequest = gamesStore.add(gameToSave);

        gameRequest.onsuccess = (event) => {
            const gameId = event.target.result;
            console.log('Игра сохранена в IndexedDB с ID:', gameId);
            resolve(gameId);
        };

        gameRequest.onerror = () => {
            console.error('Ошибка сохранения игры в IndexedDB:', gameRequest.error);
            reject(gameRequest.error);
        };
    });
}

    async getAllGames() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['games'], 'readonly');
            const store = transaction.objectStore('games');
            const request = store.getAll();

            request.onsuccess = () => {
                console.log('Загружено игр из IndexedDB:', request.result.length);
                resolve(request.result);
            };
            
            request.onerror = () => {
                console.error('Ошибка загрузки игр из IndexedDB:', request.error);
                reject(request.error);
            };
        });
    }

    async getGamesByResult(filter) {
        console.log('Фильтрация игр по:', filter);
        const allGames = await this.getAllGames();
        
        if (filter === 'all') {
            return allGames;
        }
        
        const isWon = filter === 'win';
        const filteredGames = allGames.filter(game => game.is_won === isWon);
        
        console.log(`Фильтр "${filter}": найдено ${filteredGames.length} игр из ${allGames.length}`);
        return filteredGames;
    }

    async getGameById(gameId) {
    return new Promise((resolve, reject) => {
        const transaction = this.db.transaction(['games'], 'readonly');
        const store = transaction.objectStore('games');
        const request = store.get(parseInt(gameId));

        request.onsuccess = () => {
            const game = request.result;
            console.log('Загружена игра по ID:', gameId, game);
            
            if (game && game.attempts) {
                // Убедимся, что attempts имеют правильную структуру
                game.attempts = game.attempts.map((attempt, index) => {
                    return {
                        attempt_number: attempt.attempt_number || attempt.attempt || (index + 1),
                        guess_number: attempt.guess_number || attempt.number || '?',
                        result: attempt.result || 'unknown',
                        timestamp: attempt.timestamp || new Date()
                    };
                });
            }
            
            resolve(game);
        };

        request.onerror = () => {
            console.error('Ошибка загрузки игры по ID:', request.error);
            reject(request.error);
        };
    });
}

    async getTopPlayers() {
        const allGames = await this.getAllGames();
        
        const playerStats = {};
        
        allGames.forEach(game => {
            if (!playerStats[game.player_name]) {
                playerStats[game.player_name] = {
                    player_name: game.player_name,
                    total_games: 0,
                    wins: 0,
                    total_attempts: 0
                };
            }
            
            playerStats[game.player_name].total_games++;
            if (game.is_won) {
                playerStats[game.player_name].wins++;
            }
            playerStats[game.player_name].total_attempts += game.attempts_count;
        });

        return Object.values(playerStats)
            .map(player => ({
                ...player,
                win_rate: player.total_games > 0 ? 
                    Math.round((player.wins / player.total_games) * 100) : 0,
                avg_attempts: player.total_games > 0 ?
                    Math.round((player.total_attempts / player.total_games) * 10) / 10 : 0
            }))
            .sort((a, b) => b.win_rate - a.win_rate || b.wins - a.wins);
    }

    async clearAllGames() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['games'], 'readwrite');
            const store = transaction.objectStore('games');
            const request = store.clear();

            request.onsuccess = () => {
                console.log('IndexedDB очищена');
                resolve();
            };

            request.onerror = () => {
                console.error('Ошибка очистки IndexedDB:', request.error);
                reject(request.error);
            };
        });
    }
}