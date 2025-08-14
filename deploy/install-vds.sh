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

# Копируем файлы проекта (включая скрытые файлы)
echo "📋 Копирование файлов проекта..."
cp -r . /var/www/sointera-bot/
cd /var/www/sointera-bot

# Создаём базовый .env файл для установки
echo "📝 Создание временного .env файла..."
echo 'DATABASE_URL="file:./sointera.db"' > .env

# Устанавливаем зависимости
echo "📦 Установка зависимостей проекта..."
sudo -u www-data bun install

# Создаём базу данных
echo "🗄️ Инициализация базы данных..."
sudo -u www-data bun run db:push
sudo -u www-data bun run seed

# Создаём .env.local из примера если его нет
if [ ! -f "/var/www/sointera-bot/.env.local" ]; then
    echo "📝 Создание .env.local..."

    # Если .env.example существует, копируем его
    if [ -f "/var/www/sointera-bot/.env.example" ]; then
        cp /var/www/sointera-bot/.env.example /var/www/sointera-bot/.env.local
    else
        # Иначе создаём базовый файл
        cat > /var/www/sointera-bot/.env.local << 'EOF'
# Database
DATABASE_URL="file:./dev.db"

# OpenAI API
OPENAI_API_KEY=sk-proj-ваш_ключ_openai_здесь

# Telegram API
TELEGRAM_API_ID=23238977
TELEGRAM_API_HASH=48bc98627708f323292cdfed426cb760

# Telegram Session (получите при первом запуске)
TELEGRAM_SESSION_STRING=

# Менеджер для передачи сложных вопросов
MANAGER_USERNAME=natalylini

# Для работы на VDS сервере
HEADLESS=true
EOF
    fi

    echo ""
    echo "⚠️  ВАЖНО: Отредактируйте файл /var/www/sointera-bot/.env.local"
    echo "   и добавьте ваш ключ OpenAI API"
    echo ""
    echo "Команда для редактирования:"
    echo "  nano /var/www/sointera-bot/.env.local"
    echo ""
fi

# Устанавливаем права доступа
chown -R www-data:www-data /var/www/sointera-bot

# Устанавливаем systemd сервис
echo "⚙️ Установка systemd сервиса..."
cp /var/www/sointera-bot/deploy/sointera-bot.service /etc/systemd/system/
systemctl daemon-reload

echo ""
echo "✅ Установка завершена!"
echo ""
echo "📝 Дальнейшие шаги:"
echo ""
echo "1. Добавьте ваш OpenAI API ключ:"
echo "   nano /var/www/sointera-bot/.env.local"
echo ""
echo "2. Получите сессию Telegram:"
echo "   cd /var/www/sointera-bot"
echo "   sudo -u www-data bun run start"
echo "   (следуйте инструкциям для авторизации)"
echo ""
echo "3. Добавьте сессию в .env.local"
echo ""
echo "4. Запустите сервис:"
echo "   systemctl start sointera-bot"
echo "   systemctl enable sointera-bot"
echo ""
echo "5. Проверьте статус:"
echo "   systemctl status sointera-bot"
echo ""
echo "6. Смотрите логи:"
echo "   less /var/www/sointera-bot/logs/app-*.log"
echo "   journalctl -u sointera-bot -f"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
