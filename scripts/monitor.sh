#!/bin/bash

# Скрипт мониторинга SOINTERA AI Продажника
# Можно добавить в cron для регулярной проверки

BOT_DIR="/var/www/sointera-bot"
SERVICE_NAME="sointera-bot"
NOTIFY_EMAIL="admin@sointera.ru"  # Измените на ваш email

# Функция отправки уведомления
send_alert() {
    local subject="$1"
    local message="$2"

    echo "$message" | mail -s "$subject" "$NOTIFY_EMAIL" 2>/dev/null || {
        echo "[$(date)] ALERT: $subject - $message" >> /var/log/sointera-bot/monitor.log
    }
}

# Проверка статуса сервиса
check_service() {
    if ! systemctl is-active --quiet "$SERVICE_NAME"; then
        echo "[$(date)] ❌ Сервис не работает. Попытка перезапуска..." >> /var/log/sointera-bot/monitor.log

        # Пытаемся перезапустить
        systemctl restart "$SERVICE_NAME"
        sleep 10

        if systemctl is-active --quiet "$SERVICE_NAME"; then
            send_alert "SOINTERA Bot восстановлен" "Бот был остановлен и успешно перезапущен"
            echo "[$(date)] ✅ Сервис успешно перезапущен" >> /var/log/sointera-bot/monitor.log
        else
            send_alert "SOINTERA Bot НЕ РАБОТАЕТ" "Не удалось перезапустить бота. Требуется ручное вмешательство!"
            echo "[$(date)] ❌ Не удалось перезапустить сервис" >> /var/log/sointera-bot/monitor.log
            exit 1
        fi
    fi
}

# Проверка размера БД
check_database() {
    local db_size=$(du -m "$BOT_DIR/dev.db" | cut -f1)
    local max_size=500  # MB

    if [ "$db_size" -gt "$max_size" ]; then
        send_alert "SOINTERA Bot - БД слишком большая" "Размер БД: ${db_size}MB (максимум: ${max_size}MB)"
        echo "[$(date)] ⚠️ БД слишком большая: ${db_size}MB" >> /var/log/sointera-bot/monitor.log
    fi
}

# Проверка свободного места на диске
check_disk_space() {
    local usage=$(df /var/www | awk 'NR==2 {print $5}' | sed 's/%//')

    if [ "$usage" -gt 85 ]; then
        send_alert "SOINTERA Bot - Мало места на диске" "Использовано ${usage}% дискового пространства"
        echo "[$(date)] ⚠️ Мало места на диске: ${usage}%" >> /var/log/sointera-bot/monitor.log
    fi
}

# Проверка ошибок в логах
check_errors() {
    local error_file="$BOT_DIR/logs/error-$(date +%Y-%m-%d).log"

    if [ -f "$error_file" ]; then
        local error_count=$(wc -l < "$error_file")
        local max_errors=50

        if [ "$error_count" -gt "$max_errors" ]; then
            send_alert "SOINTERA Bot - Много ошибок" "Обнаружено $error_count ошибок за сегодня"
            echo "[$(date)] ⚠️ Много ошибок: $error_count" >> /var/log/sointera-bot/monitor.log
        fi
    fi
}

# Проверка последней активности
check_activity() {
    local log_file="$BOT_DIR/logs/app-$(date +%Y-%m-%d).log"

    if [ -f "$log_file" ]; then
        local last_message=$(grep "Новое сообщение" "$log_file" | tail -1)

        if [ -n "$last_message" ]; then
            # Извлекаем время последнего сообщения
            local last_time=$(echo "$last_message" | grep -oP '\[\K[^\]]+' | head -1)

            if [ -n "$last_time" ]; then
                local last_timestamp=$(date -d "$last_time" +%s 2>/dev/null)
                local current_timestamp=$(date +%s)
                local diff=$((current_timestamp - last_timestamp))

                # Если больше 6 часов без активности
                if [ "$diff" -gt 21600 ]; then
                    echo "[$(date)] ℹ️ Нет активности более 6 часов" >> /var/log/sointera-bot/monitor.log
                fi
            fi
        fi
    fi
}

# Основная функция
main() {
    echo "[$(date)] 🔍 Начало проверки..." >> /var/log/sointera-bot/monitor.log

    check_service
    check_database
    check_disk_space
    check_errors
    check_activity

    echo "[$(date)] ✅ Проверка завершена" >> /var/log/sointera-bot/monitor.log
}

# Запуск
main
