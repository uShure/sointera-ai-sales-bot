#!/bin/bash

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Настройка прокси для OpenAI API"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Установка xray-core
echo "📦 Установка Xray-core..."
bash -c "$(curl -L https://github.com/XTLS/Xray-install/raw/main/install-release.sh)" @ install

# Создание конфигурации
echo "📝 Создание конфигурации..."
cat > /usr/local/etc/xray/config.json << 'EOF'
{
  "inbounds": [
    {
      "port": 10808,
      "protocol": "socks",
      "settings": {
        "auth": "noauth",
        "udp": true
      }
    },
    {
      "port": 10809,
      "protocol": "http",
      "settings": {}
    }
  ],
  "outbounds": [
    {
      "protocol": "vless",
      "settings": {
        "vnext": [
          {
            "address": "us2.confluencedoc.top",
            "port": 443,
            "users": [
              {
                "id": "dd069974-3d78-478f-8df4-841f4f8737c6",
                "encryption": "none"
              }
            ]
          }
        ]
      },
      "streamSettings": {
        "network": "tcp",
        "security": "reality",
        "realitySettings": {
          "fingerprint": "ios",
          "serverName": "apple.com",
          "publicKey": "l-5S16rFTdPxLF9K34fzuJ4f5KRQ11VK1hjcefW4j0s",
          "shortId": "cb8a687b706f",
          "spiderX": "/"
        }
      }
    }
  ]
}
EOF

# Запуск Xray
echo "🚀 Запуск Xray..."
systemctl restart xray
systemctl enable xray

# Проверка статуса
echo "✅ Проверка статуса..."
systemctl status xray --no-pager

echo ""
echo "✅ Прокси настроен!"
echo ""
echo "SOCKS5 прокси: 127.0.0.1:10808"
echo "HTTP прокси: 127.0.0.1:10809"
echo ""
echo "Теперь добавьте в /var/www/sointera-bot/.env.local:"
echo "HTTP_PROXY=http://127.0.0.1:10809"
echo "HTTPS_PROXY=http://127.0.0.1:10809"
echo ""
