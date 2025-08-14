@echo off
echo =====================================
echo    ZAPUSK SOINTERA AI PRODAZHNIKA
echo =====================================
echo.

echo Proverka zavisimostey...

where bun >nul 2>nul
if %errorlevel% neq 0 (
    echo Bun ne ustanovlen. Ustanovite s https://bun.sh
    pause
    exit /b 1
)

if not exist "node_modules" (
    echo Ustanovka zavisimostey...
    call bun install
)

if not exist "sointera.db" (
    echo Sozdanie bazy dannyh...
    call bun run db:push
    echo Zapolnenie kursami...
    call bun run seed
)

echo.
echo Vsyo gotovo! Zapuskayu AI prodazhnika...
echo.
timeout /t 1 >nul

call bun run start
pause
