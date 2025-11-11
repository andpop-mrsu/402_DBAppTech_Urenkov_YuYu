class GameStorage {
    constructor() {
        this.dbName = 'GuessNumberDB';
        this.version = 3; // Увеличиваем версию
        this.db = null;
        this.init();
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
                console.log('БД успешно инициализирована');
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                console.log('Обновление БД до версии:', this.version);

                // Удаляем старые хранилища если есть
                if (db.objectStoreNames.contains('games')) {
                    db.deleteObjectStore('games');
                }
                if (db.objectStoreNames.contains('attempts')) {
                    db.deleteObjectStore('attempts');
                }

                // Создаем хранилище для игр
                const gamesStore = db.createObjectStore('games', { 
                    keyPath: 'id', 
                    autoIncrement: true 
                });
                gamesStore.createIndex('player_name', 'player_name', { unique: false });
                gamesStore.createIndex('is_won', 'is_won', { unique: false });
                gamesStore.createIndex('start_time', 'start_time', { unique: false });

                // Создаем хранилище для попыток
                const attemptsStore = db.createObjectStore('attempts', { 
                    keyPath: 'id', 
                    autoIncrement: true 
                });
                attemptsStore.createIndex('game_id', 'game_id', { unique: false });
                attemptsStore.createIndex('attempt_number', 'attempt_number', { unique: false });

                console.log('Хранилища пересозданы');
            };
        });
    }

    async saveGame(gameData, playerName = 'Гость') {
        console.log('Сохранение игры для игрока:', playerName, 'Данные:', gameData);
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['games', 'attempts'], 'readwrite');
            
            const gameToSave = {
                player_name: playerName,
                max_number: gameData.max_number,
                max_attempts: gameData.max_attempts,
                secret_number: gameData.secret_number,
                is_won: Boolean(gameData.won), // Убедимся что это boolean
                attempts_count: gameData.attempts.length,
                start_time: gameData.start_time,
                end_time: gameData.end_time
            };

            console.log('Сохраняемая игра:', gameToSave);

            const gamesStore = transaction.objectStore('games');
            const gameRequest = gamesStore.add(gameToSave);

            gameRequest.onsuccess = (event) => {
                const gameId = event.target.result;
                console.log('Игра сохранена с ID:', gameId);
                
                // Сохраняем попытки
                const attemptsStore = transaction.objectStore('attempts');
                gameData.attempts.forEach(attempt => {
                    const attemptToSave = {
                        game_id: gameId,
                        attempt_number: attempt.attempt,
                        guess_number: attempt.number,
                        result: attempt.result,
                        timestamp: new Date()
                    };
                    console.log('Сохранение попытки:', attemptToSave);
                    attemptsStore.add(attemptToSave);
                });

                resolve(gameId);
            };

            gameRequest.onerror = () => {
                console.error('Ошибка сохранения игры:', gameRequest.error);
                reject(gameRequest.error);
            };
        });
    }

    async getAllGames() {
        console.log('Загрузка ВСЕХ игр');
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['games'], 'readonly');
            const store = transaction.objectStore('games');
            const request = store.getAll();

            request.onsuccess = () => {
                console.log('Загружено всех игр:', request.result.length);
                console.log('Содержимое игр:', request.result);
                resolve(request.result);
            };
            request.onerror = () => {
                console.error('Ошибка загрузки игр:', request.error);
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
    filteredGames.forEach(game => {
        console.log(`Игра ${game.id}: игрок=${game.player_name}, победа=${game.is_won}`);
    });
    
    return filteredGames;
}
        

    async getGameById(gameId) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['games', 'attempts'], 'readonly');
            
            const gamesStore = transaction.objectStore('games');
            const gameRequest = gamesStore.get(parseInt(gameId));

            gameRequest.onsuccess = async () => {
                const game = gameRequest.result;
                if (!game) {
                    resolve(null);
                    return;
                }

                const attemptsStore = transaction.objectStore('attempts');
                const attemptsIndex = attemptsStore.index('game_id');
                const attemptsRequest = attemptsIndex.getAll(parseInt(gameId));

                attemptsRequest.onsuccess = () => {
                    game.attempts = attemptsRequest.result.sort((a, b) => 
                        a.attempt_number - b.attempt_number
                    );
                    resolve(game);
                };

                attemptsRequest.onerror = () => reject(attemptsRequest.error);
            };

            gameRequest.onerror = () => reject(gameRequest.error);
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
}