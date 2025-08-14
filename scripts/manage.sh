#!/bin/bash

# Скрипт управления SOINTERA AI Продажником на сервере

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
BOT_DIR="/var/www/sointera-bot"
SERVICE_NAME="sointera-bot"

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

function show_help {
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "  SOINTERA AI Продажник - Управление"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "Использование: $0 [команда]"
    echo ""
    echo "Команды:"
    echo "  start    - Запустить бота"
    echo "  stop     - Остановить бота"
    echo "  restart  - Перезапустить бота"
    echo "  status   - Показать статус"
    echo "  logs     - Показать логи (последние 50 строк)"
    echo "  tail     - Следить за логами в реальном времени"
    echo "  stats    - Показать статистику из логов"
    echo "  errors   - Показать ошибки"
    echo "  backup   - Создать резервную копию БД"
    echo "  update   - Обновить код из git"
    echo ""
}

function check_root {
    if [ "$EUID" -ne 0 ]; then
        echo -e "${RED}❌ Требуются права root. Используйте sudo${NC}"
        exit 1
    fi
}

function start_bot {
    check_root
    echo -e "${GREEN}▶️ Запуск бота...${NC}"
    systemctl start $SERVICE_NAME
    sleep 2
    systemctl status $SERVICE_NAME --no-pager
}

function stop_bot {
    check_root
    echo -e "${YELLOW}⏹ Остановка бота...${NC}"
    systemctl stop $SERVICE_NAME
    echo -e "${GREEN}✅ Бот остановлен${NC}"
}

function restart_bot {
    check_root
    echo -e "${YELLOW}🔄 Перезапуск бота...${NC}"
    systemctl restart $SERVICE_NAME
    sleep 2
    systemctl status $SERVICE_NAME --no-pager
}

function show_status {
    echo -e "${GREEN}📊 Статус сервиса:${NC}"
    systemctl status $SERVICE_NAME --no-pager
    echo ""
    echo -e "${GREEN}📊 Процессы:${NC}"
    ps aux | grep -E "telegram-userbot|bun" | grep -v grep
    echo ""
    echo -e "${GREEN}📊 Использование ресурсов:${NC}"
    top -b -n 1 | head -20
}

function show_logs {
    echo -e "${GREEN}📋 Последние логи:${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

    # Показываем логи из файла приложения
    if [ -f "$BOT_DIR/logs/app-$(date +%Y-%m-%d).log" ]; then
        tail -n 50 "$BOT_DIR/logs/app-$(date +%Y-%m-%d).log"
    fi

    echo ""
    echo -e "${GREEN}📋 Системные логи:${NC}"
    journalctl -u $SERVICE_NAME -n 30 --no-pager
}

function tail_logs {
    echo -e "${GREEN}📋 Следим за логами (Ctrl+C для выхода):${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

    # Следим за логами в реальном времени
    if [ -f "$BOT_DIR/logs/app-$(date +%Y-%m-%d).log" ]; then
        tail -f "$BOT_DIR/logs/app-$(date +%Y-%m-%d).log"
    else
        journalctl -u $SERVICE_NAME -f
    fi
}

function show_stats {
    echo -e "${GREEN}📊 Статистика работы:${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

    LOG_FILE="$BOT_DIR/logs/app-$(date +%Y-%m-%d).log"

    if [ -f "$LOG_FILE" ]; then
        echo "Обработано сообщений: $(grep -c "Обработано сообщений:" "$LOG_FILE" 2>/dev/null || echo 0)"
        echo "Новых клиентов: $(grep -c "Новый клиент" "$LOG_FILE" 2>/dev/null || echo 0)"
        echo "Запросов менеджеру: $(grep -c "Требуется помощь менеджера" "$LOG_FILE" 2>/dev/null || echo 0)"
        echo ""
        echo "Последняя статистика:"
        grep "СТАТИСТИКА:" "$LOG_FILE" -A 5 | tail -6
    else
        echo "Лог-файл не найден"
    fi
}

function show_errors {
    echo -e "${RED}❌ Последние ошибки:${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

    ERROR_FILE="$BOT_DIR/logs/error-$(date +%Y-%m-%d).log"

    if [ -f "$ERROR_FILE" ]; then
        tail -n 30 "$ERROR_FILE"
    else
        echo "Файл ошибок не найден или пуст"
    fi

    echo ""
    echo -e "${RED}Системные ошибки:${NC}"
    journalctl -u $SERVICE_NAME -p err -n 20 --no-pager
}

function backup_db {
    echo -e "${GREEN}💾 Создание резервной копии БД...${NC}"

    BACKUP_DIR="$BOT_DIR/backups"
    mkdir -p "$BACKUP_DIR"

    BACKUP_FILE="$BACKUP_DIR/backup-$(date +%Y%m%d-%H%M%S).db"
    cp "$BOT_DIR/sointera.db" "$BACKUP_FILE"

    echo -e "${GREEN}✅ Резервная копия создана: $BACKUP_FILE${NC}"

    # Удаляем старые бэкапы (оставляем последние 10)
    ls -t "$BACKUP_DIR"/backup-*.db | tail -n +11 | xargs -r rm
    echo "Сохранены последние 10 резервных копий"
}

function update_code {
    check_root
    echo -e "${GREEN}🔄 Обновление кода...${NC}"

    cd "$BOT_DIR"

    # Сохраняем текущие настройки
    cp .env.local .env.local.backup 2>/dev/null || true

    # Обновляем код (предполагается что есть git репозиторий)
    if [ -d ".git" ]; then
        git pull
    else
        echo -e "${YELLOW}⚠️ Git репозиторий не найден${NC}"
    fi

    # Обновляем зависимости
    sudo -u www-data bun install

    # Обновляем БД если нужно
    sudo -u www-data bun run db:push

    # Перезапускаем сервис
    restart_bot

    echo -e "${GREEN}✅ Обновление завершено${NC}"
}

# Обработка команд
case "$1" in
    start)
        start_bot
        ;;
    stop)
        stop_bot
        ;;
    restart)
        restart_bot
        ;;
    status)
        show_status
        ;;
    logs)
        show_logs
        ;;
    tail)
        tail_logs
        ;;
    stats)
        show_stats
        ;;
    errors)
        show_errors
        ;;
    backup)
        backup_db
        ;;
    update)
        update_code
        ;;
    *)
        show_help
        ;;
esac
