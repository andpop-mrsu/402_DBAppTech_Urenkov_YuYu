@echo off
chcp 65001 > nul
setlocal enabledelayedexpansion

set DB=selflogger.db
set TABLE=logs
set PROGRAM=self-logger.bat

echo CREATE TABLE IF NOT EXISTS %TABLE% (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT, datetime TEXT); | sqlite3 %DB%

set USER=%USERNAME%

for /f "tokens=*" %%a in ('powershell -command "Get-Date -Format 'yyyy-MM-dd HH:mm:ss'"') do (
    set DATETIME=%%a
)

echo INSERT INTO %TABLE% (username, datetime) VALUES ('%USER%', '!DATETIME!'); | sqlite3 %DB%

for /f "delims=" %%a in ('sqlite3 %DB% "SELECT COUNT(*) FROM %TABLE%;"') do (
    set COUNT=%%a
)

for /f "delims=" %%a in ('sqlite3 %DB% "SELECT datetime FROM %TABLE% ORDER BY id ASC LIMIT 1;"') do (
    set FIRST_RUN=%%a
)

echo Имя программы: %PROGRAM%
echo Количество запусков: !COUNT!
echo Первый запуск: !FIRST_RUN!
echo ---------------------------------------------
echo User       ^| Date
echo ---------------------------------------------

sqlite3 %DB% "SELECT username, datetime FROM %TABLE% ORDER BY id DESC LIMIT 10;" > temp.txt
for /f "tokens=1,2 delims=|" %%a in (temp.txt) do (
    echo %%a       ^| %%b
    echo ---------------------------------------------
)
del temp.txt

pause
endlocal