# Task09 — SPA «Guess Number» на PHP с микрофреймворком Slim

В данной лабораторной работе backend-приложение из Task08 перенесено на микрофреймворк **Slim**.
Клиентская часть (Single Page Application на JavaScript) остаётся прежней, а доступ к базе данных SQLite теперь реализован в виде REST API на базе Slim.

---

## Основная идея

- Интерфейс игры «Угадай число» реализован как SPA на чистом JavaScript (ES6-модули).
- Все данные о партиях и ходах сохраняются в СУБД SQLite на сервере.
- Обмен между браузером и сервером идёт по HTTP в формате JSON.
- Backend реализован с помощью PHP-фреймворка Slim и шаблона **Front Controller** (единственная точка входа: `public/index.php`).

---

## Функциональные требования (на уровне приложения)

Игра реализует классическую задачу «Угадай число»:

- Компьютер загадывает число в диапазоне от 1 до максимального числа (задаётся в настройках).
- Игрок вводит предполагаемое число.
- После каждой попытки приложение сообщает, больше или меньше загаданного введённое число.
- Ограничение по количеству попыток задаётся в настройках (может быть отключено).

Сохраняемая в базе данных информация о каждой партии:

- дата и время начала и окончания;
- имя игрока;
- минимальное и максимальное значения диапазона;
- загаданное компьютером число;
- исход игры (победа / поражение);
- количество попыток;
- включённое ограничение по попыткам (если есть);
- список всех ходов в формате:
  **номер попытки | предложенное число | ответ компьютера**.

Реализованы режимы:

1. **Новая игра**.
2. **Список всех игр**.
3. **Список игр с победами**.
4. **Список игр с поражениями**.
5. **Статистика по игрокам** (количество побед/поражений, сортировка по числу побед — «чемпионы» вверху).
6. **Повтор сохранённой партии** (воспроизведение всех ходов по ID).

---

## Используемые технологии

**Клиент (Frontend)**

- HTML5, CSS3.
- JavaScript (ES6-модули).
- Архитектура, близкая к MVC:
  - `Game.js` — игровая логика.
  - `View.js` — работа с DOM и отрисовка интерфейса.
  - `Controller.js` — связь логики, UI и слоя доступа к данным.
  - `Database.js` — REST-клиент, отправляющий запросы к Slim-приложению.

**Сервер (Backend)**

- PHP 8+.
- Slim Framework (PSR-7 / PSR-15).
- SQLite (файл базы данных в каталоге `db/`).
- Встроенный веб-сервер PHP (`php -S`).
- Шаблон **Front Controller**: все запросы проходят через `public/index.php`.

Зависимости устанавливаются через Composer.

---

## Структура проекта (Task09)

```text
Task09/
  composer.json
  composer.lock
  vendor/                # зависимости Slim и автозагрузка Composer
  public/
    index.php            # Front Controller + маршруты Slim
    index.html           # SPA-интерфейс игры
    styles.css           # оформление
    src/
      Game.js            # игровая логика «Угадай число»
      View.js            # работа с DOM
      Controller.js      # режимы игры, связь логики, UI и REST
      Database.js        # REST-клиент к API Slim/SQLite
  db/
    guess-number.sqlite  # база данных SQLite (создаётся автоматически)
```

Все статические файлы (HTML, CSS, JS) расположены в каталоге `public`.
База данных хранится в каталоге `db`.

---

## REST API (маршруты Slim)

Приложение предоставляет JSON API для работы SPA с базой данных.

### Перенаправление на SPA

```http
GET /
```

Ответ: перенаправление (HTTP 302) на `/index.html`.
Это позволяет открывать приложение по адресу `/` и сразу попадать в интерфейс игры.

---

### Список всех игр

```http
GET /games
```

**Ответ (JSON):** массив объектов, каждый описывает одну игру:

```json
[
  {
    "id": 1,
    "startedAt": 1700000000000,
    "finishedAt": 1700000012345,
    "durationMs": 12345,
    "playerName": "Иван",
    "min": 1,
    "max": 100,
    "target": 42,
    "attemptLimit": 10,
    "attempts": 5,
    "win": true
  }
]
```

Клиент использует этот маршрут для:

* вывода всех игр;
* фильтрации побед;
* фильтрации поражений.

---

### Информация об одной игре + все её ходы

```http
GET /games/{id}
```

**Ответ (JSON):**

```json
{
  "id": 1,
  "startedAt": 1700000000000,
  "finishedAt": 1700000012345,
  "durationMs": 12345,
  "playerName": "Иван",
  "min": 1,
  "max": 100,
  "target": 42,
  "attemptLimit": 10,
  "attempts": 5,
  "win": true,
  "guesses": [
    { "stepNumber": 1, "value": 10, "result": "low", "ts": 1700000001000 },
    { "stepNumber": 2, "value": 80, "result": "high", "ts": 1700000002000 },
    { "stepNumber": 3, "value": 42, "result": "correct", "ts": 1700000003000 }
  ]
}
```

Используется режимом **повтора партии**.

---

### Сохранение итогов новой партии

```http
POST /games
Content-Type: application/json
```

**Тело запроса (JSON):**

```json
{
  "playerName": "Иван",
  "min": 1,
  "max": 100,
  "target": 42,
  "attemptLimit": 10,
  "attempts": 5,
  "startedAt": 1700000000000,
  "finishedAt": 1700000012345,
  "durationMs": 12345,
  "win": true
}
```

**Ответ (JSON):**

```json
{ "id": 1 }
```

Полученный `id` используется для записи ходов и дальнейшего воспроизведения партии.

---

### Сохранение одного хода партии

```http
POST /step/{id}
Content-Type: application/json
```

Где `{id}` — идентификатор игры, полученный при `POST /games`.

**Тело запроса (JSON):**

```json
{
  "stepNumber": 1,
  "value": 10,
  "result": "low",
  "ts": 1700000001000
}
```

* `result` — одно из значений: `"low"`, `"high"`, `"correct"`.

---

### Очистка базы данных (для отладки)

```http
DELETE /games
```

Удаляет все партии и все ходы, а также сбрасывает счётчики автоинкремента в SQLite.

---

## База данных

Используется СУБД **SQLite**. Структура таблиц:

```sql
CREATE TABLE games (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    started_at     INTEGER NOT NULL,
    finished_at    INTEGER NOT NULL,
    duration_ms    INTEGER NOT NULL,
    player_name    TEXT    NOT NULL,
    min_number     INTEGER NOT NULL,
    max_number     INTEGER NOT NULL,
    target_number  INTEGER NOT NULL,
    attempt_limit  INTEGER,
    attempts       INTEGER NOT NULL,
    win            INTEGER NOT NULL -- 0/1
);

CREATE TABLE steps (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    game_id      INTEGER NOT NULL,
    step_number  INTEGER NOT NULL,
    value        INTEGER NOT NULL,
    result       TEXT    NOT NULL,
    created_at   INTEGER NOT NULL,
    FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
);
```

---

## Установка зависимостей

В каталоге `Task09`:

```bash
composer install
# либо, если проект создаётся "с нуля":
composer require slim/slim slim/psr7 slim/http
```

Команда `composer` создаст каталог `vendor/` и файл `vendor/autoload.php`, который подключается в `public/index.php`.

---

## Запуск приложения

1. Перейти в каталог задания:

```bash
cd Task09
```

2. Запустить встроенный веб-сервер PHP:

```bash
php -S localhost:3000 -t public public/index.php
```

3. Открыть браузер и перейти по адресу:

* [http://localhost:3000/](http://localhost:3000/)
  или
* [http://localhost:3000/index.html](http://localhost:3000/index.html)

При первом обращении к API автоматически создаётся файл базы данных:

```text
Task09/db/guess-number.sqlite
```

---
