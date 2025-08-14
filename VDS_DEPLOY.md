# 🚀 Развёртывание на VDS сервере

Полная инструкция по установке SOINTERA AI Продажника на VDS сервер.

## 📋 Требования к серверу

- **ОС**: Ubuntu 20.04+ / Debian 11+
- **RAM**: минимум 1 GB (рекомендуется 2 GB)
- **CPU**: 1 vCPU
- **Диск**: 10 GB свободного места
- **Доступ**: root или sudo

## 🛠 Установка

### Шаг 1: Подключитесь к серверу

```bash
ssh root@ваш_сервер
```

### Шаг 2: Клонируйте проект

```bash
cd /tmp
git clone https://github.com/ваш_репозиторий/sointera-ai-sales-bot.git
cd sointera-ai-sales-bot
```

Или загрузите архив:
```bash
cd /tmp
wget https://ваш_сервер/sointera-bot.zip
unzip sointera-bot.zip
cd sointera-ai-sales-bot
```

### Шаг 3: Запустите установщик

```bash
chmod +x deploy/install-vds.sh
sudo bash deploy/install-vds.sh
```

Скрипт автоматически:
- ✅ Установит все зависимости
- ✅ Установит Bun
- ✅ Создаст директории и права
- ✅ Скопирует файлы проекта
- ✅ Создаст базу данных
- ✅ Настроит systemd сервис

### Шаг 4: Настройте переменные окружения

Создайте файл с настройками:
```bash
nano /var/www/sointera-bot/.env.local
```

Добавьте:
```env
# OpenAI API
OPENAI_API_KEY=sk-proj-ваш_ключ_openai

# Telegram API
TELEGRAM_API_ID=23238977
TELEGRAM_API_HASH=48bc98627708f323292cdfed426cb760

# Сессия Telegram (получите на следующем шаге)
TELEGRAM_SESSION_STRING=

# Менеджер
MANAGER_USERNAME=natalylini

# Режим сервера (обязательно!)
HEADLESS=true
```

### Шаг 5: Получите сессию Telegram

Запустите бота в интерактивном режиме:
```bash
cd /var/www/sointera-bot
sudo -u www-data bun run start
```

1. Введите номер телефона
2. Введите код из Telegram
3. Скопируйте строку сессии
4. Добавьте её в `.env.local`
5. Нажмите Ctrl+C для выхода

### Шаг 6: Запустите сервис

```bash
# Запуск
systemctl start sointera-bot

# Автозапуск при старте системы
systemctl enable sointera-bot

# Проверка статуса
systemctl status sointera-bot
```

## 📊 Управление ботом

### Использование скрипта управления

```bash
cd /var/www/sointera-bot
chmod +x scripts/manage.sh

# Команды:
./scripts/manage.sh start    # Запустить
./scripts/manage.sh stop     # Остановить
./scripts/manage.sh restart  # Перезапустить
./scripts/manage.sh status   # Статус
./scripts/manage.sh logs     # Показать логи
./scripts/manage.sh tail     # Следить за логами
./scripts/manage.sh stats    # Статистика
./scripts/manage.sh errors   # Ошибки
./scripts/manage.sh backup   # Резервная копия БД
```

### Прямые команды systemctl

```bash
# Управление сервисом
systemctl start sointera-bot    # Запуск
systemctl stop sointera-bot     # Остановка
systemctl restart sointera-bot  # Перезапуск
systemctl status sointera-bot   # Статус

# Логи
journalctl -u sointera-bot -f   # Следить за логами
journalctl -u sointera-bot -n 100  # Последние 100 строк
```

## 📁 Структура файлов на сервере

```
/var/www/sointera-bot/
├── src/                 # Исходный код
├── logs/               # Логи приложения
│   ├── app-YYYY-MM-DD.log
│   └── error-YYYY-MM-DD.log
├── backups/            # Резервные копии БД
├── sointera.db         # База данных SQLite
├── .env.local          # Настройки
└── session.txt         # Сессия Telegram (backup)

/var/log/sointera-bot/
├── service.log         # Системные логи
└── error.log           # Системные ошибки

/etc/systemd/system/
└── sointera-bot.service  # Systemd сервис
```

## 📋 Просмотр логов

### Логи приложения
```bash
# Текущий день
less /var/www/sointera-bot/logs/app-$(date +%Y-%m-%d).log

# Следить в реальном времени
tail -f /var/www/sointera-bot/logs/app-$(date +%Y-%m-%d).log

# Поиск по логам
grep "Новый клиент" /var/www/sointera-bot/logs/*.log

# Ошибки
less /var/www/sointera-bot/logs/error-$(date +%Y-%m-%d).log
```

### Системные логи
```bash
# Все логи сервиса
journalctl -u sointera-bot

# Последние 100 строк
journalctl -u sointera-bot -n 100

# Следить в реальном времени
journalctl -u sointera-bot -f

# За последний час
journalctl -u sointera-bot --since "1 hour ago"
```

## 🔧 Обслуживание

### Резервное копирование

Автоматическое резервное копирование БД каждый день:
```bash
# Добавьте в crontab
crontab -e

# Добавьте строку:
0 3 * * * /var/www/sointera-bot/scripts/manage.sh backup
```

### Ротация логов

Создайте файл `/etc/logrotate.d/sointera-bot`:
```
/var/www/sointera-bot/logs/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 www-data www-data
    sharedscripts
    postrotate
        systemctl reload sointera-bot > /dev/null 2>&1 || true
    endscript
}
```

### Мониторинг

Проверка использования ресурсов:
```bash
# CPU и память
htop

# Размер БД
du -h /var/www/sointera-bot/sointera.db

# Размер логов
du -sh /var/www/sointera-bot/logs/

# Статус процесса
ps aux | grep telegram-userbot
```

## 🚨 Решение проблем

### Бот не запускается

1. Проверьте логи:
```bash
journalctl -u sointera-bot -n 50
tail -100 /var/www/sointera-bot/logs/error-*.log
```

2. Проверьте права доступа:
```bash
ls -la /var/www/sointera-bot/
chown -R www-data:www-data /var/www/sointera-bot/
```

3. Проверьте .env.local:
```bash
cat /var/www/sointera-bot/.env.local
# Убедитесь что HEADLESS=true
```

### Ошибка подключения к Telegram

1. Проверьте сессию:
```bash
grep TELEGRAM_SESSION_STRING /var/www/sointera-bot/.env.local
```

2. Если сессия устарела, получите новую:
```bash
systemctl stop sointera-bot
cd /var/www/sointera-bot
sudo -u www-data bun run start
# Пройдите авторизацию заново
```

### База данных заблокирована

```bash
systemctl stop sointera-bot
rm /var/www/sointera-bot/sointera.db-journal
systemctl start sointera-bot
```

### Высокое использование CPU

1. Проверьте количество сообщений:
```bash
grep "Обработано сообщений" /var/www/sointera-bot/logs/app-*.log | tail -1
```

2. Перезапустите бота:
```bash
systemctl restart sointera-bot
```

## 🔐 Безопасность

### Firewall

Откройте только нужные порты:
```bash
ufw allow ssh
ufw enable
```

### Обновления

Регулярно обновляйте систему:
```bash
apt update && apt upgrade -y
```

### Бэкапы

Настройте автоматическое резервное копирование:
```bash
# Ежедневный бэкап БД и логов
0 3 * * * tar -czf /backup/sointera-$(date +\%Y\%m\%d).tar.gz /var/www/sointera-bot/dev.db /var/www/sointera-bot/logs/
```

## 📞 Поддержка

При возникновении проблем:
1. Проверьте логи
2. Убедитесь что все зависимости установлены
3. Проверьте права доступа к файлам
4. Убедитесь что API ключи актуальны

---

💛 SOINTERA - Школа парикмахерского искусства
