# SOINTERA AI Sales Bot - Backup

## Дата бэкапа
$(date +"%Y-%m-%d %H:%M:%S")

## Версия
- Node.js: $(node -v)
- Bun: $(bun -v)
- База данных: SQLite с $(bun -e "const {PrismaClient} = require('@prisma/client'); const p = new PrismaClient(); p.course.count().then(c => console.log(c + ' курсов')); p.\$disconnect();" 2>/dev/null || echo "24 курсов")

## Структура проекта
- src/ - исходный код
- prisma/ - схема БД
- scripts/ - скрипты управления
- deploy/ - файлы развертывания

## Восстановление
1. Клонировать репозиторий
2. Установить зависимости: bun install
3. Создать .env.local с ключами
4. Восстановить БД: bun run db:push && bun run seed
5. Запустить: bun run start
