#!/bin/bash

# Скрипт установки SOINTERA AI Продажника на VDS сервер
# Для Ubuntu/Debian

set -e

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Установка SOINTERA AI Продажника"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Проверяем что запущено от root
if [ "$EUID" -ne 0 ]; then
   echo "❌ Запустите скрипт от root: sudo bash install-vds.sh"
   exit 1
fi

# Обновляем систему
echo "📦 Обновление системы..."
apt update && apt upgrade -y

# Устанавливаем необходимые пакеты
echo "📦 Установка зависимостей..."
apt install -y curl git unzip build-essential

# Устанавливаем Bun если его нет
if ! command -v bun &> /dev/null; then
    echo "📦 Установка Bun..."
    curl -fsSL https://bun.sh/install | bash
    source /root/.bashrc
    ln -s /root/.bun/bin/bun /usr/local/bin/bun
fi

# Создаём директории
echo "📁 Создание директорий..."
mkdir -p /var/www/sointera-bot
mkdir -p /var/log/sointera-bot
chown -R www-data:www-data /var/www/sointera-bot
chown -R www-data:www-data /var/log/sointera-bot

# Копируем файлы проекта
echo "📋 Копирование файлов проекта..."
cp -r ./* /var/www/sointera-bot/
cd /var/www/sointera-bot

# Устанавливаем зависимости
echo "📦 Установка зависимостей проекта..."
sudo -u www-data bun install

# Создаём базу данных
echo "🗄️ Инициализация базы данных..."
sudo -u www-data bun run db:push
sudo -u www-data bun run seed

# Проверяем наличие .env.local
if [ ! -f "/var/www/sointera-bot/.env.local" ]; then
    echo ""
    echo "⚠️  ВАЖНО: Создайте файл /var/www/sointera-bot/.env.local"
    echo "   с вашими ключами API и сессией Telegram"
    echo ""
    echo "Пример содержимого:"
    echo "----------------------------------------"
    echo "OPENAI_API_KEY=ваш_ключ"
    echo "TELEGRAM_API_ID=23238977"
    echo "TELEGRAM_API_HASH=48bc98627708f323292cdfed426cb760"
    echo "TELEGRAM_SESSION_STRING=строка_сессии"
    echo "MANAGER_USERNAME=natalylini"
    echo "HEADLESS=true"
    echo "----------------------------------------"
fi

# Устанавливаем systemd сервис
echo "⚙️ Установка systemd сервиса..."
cp /var/www/sointera-bot/deploy/sointera-bot.service /etc/systemd/system/
systemctl daemon-reload

echo ""
echo "✅ Установка завершена!"
echo ""
echo "📝 Дальнейшие шаги:"
echo ""
echo "1. Если нужно - получите сессию Telegram:"
echo "   cd /var/www/sointera-bot"
echo "   sudo -u www-data bun run start"
echo "   (следуйте инструкциям для авторизации)"
echo ""
echo "2. Добавьте сессию в /var/www/sointera-bot/.env.local"
echo ""
echo "3. Запустите сервис:"
echo "   systemctl start sointera-bot"
echo "   systemctl enable sointera-bot"
echo ""
echo "4. Проверьте статус:"
echo "   systemctl status sointera-bot"
echo ""
echo "5. Смотрите логи:"
echo "   less /var/www/sointera-bot/logs/app-*.log"
echo "   journalctl -u sointera-bot -f"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
