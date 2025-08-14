#!/bin/bash

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "     ЗАПУСК SOINTERA AI ПРОДАЖНИКА"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Проверка зависимостей..."

# Проверяем установлен ли bun
if ! command -v bun &> /dev/null
then
    echo "❌ Bun не установлен. Установите с https://bun.sh"
    exit 1
fi

# Проверяем есть ли node_modules
if [ ! -d "node_modules" ]; then
    echo "📦 Установка зависимостей..."
    bun install
fi

# Проверяем есть ли база данных
if [ ! -f "sointera.db" ]; then
    echo "🗄️ Создание базы данных..."
    bun run db:push
    echo "📚 Заполнение курсами..."
    bun run seed
fi

echo ""
echo "✅ Всё готово! Запускаю AI продажника..."
echo ""
sleep 1

# Запускаем программу
bun run start
