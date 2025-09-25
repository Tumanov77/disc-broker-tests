#!/bin/bash

echo "🚀 Развертывание DISC Bot на Railway"
echo "=================================="

# Проверяем, что Railway CLI установлен
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI не найден. Устанавливаем..."
    brew install railway
fi

# Переходим в директорию проекта
cd "$(dirname "$0")"

echo "📁 Текущая директория: $(pwd)"

# Проверяем наличие необходимых файлов
if [ ! -f "package.json" ]; then
    echo "❌ Файл package.json не найден!"
    exit 1
fi

if [ ! -f "server.js" ]; then
    echo "❌ Файл server.js не найден!"
    exit 1
fi

echo "✅ Все необходимые файлы найдены"

# Проверяем, авторизован ли пользователь в Railway
if ! railway whoami &> /dev/null; then
    echo "🔐 Требуется авторизация в Railway..."
    echo "Откроется браузер для входа в аккаунт Railway"
    railway login
fi

echo "✅ Авторизация в Railway успешна"

# Создаем проект (если еще не создан)
if [ ! -f ".railway/project.json" ]; then
    echo "📦 Создаем новый проект Railway..."
    railway init
fi

# Устанавливаем переменные окружения
echo "🔧 Настраиваем переменные окружения..."
railway variables --set "TELEGRAM_BOT_TOKEN=8495225769:AAE6w8YbpFuaKjT68RSrfeVaCmjceE2UyJg" --set "TELEGRAM_CHANNEL_ID=-1003135904548" --set "PORT=3000" --set "NODE_ENV=production"

echo "✅ Переменные окружения настроены"

# Развертываем приложение
echo "🚀 Развертываем приложение..."
railway up

# Получаем URL приложения
echo "🌐 Получаем URL приложения..."
APP_URL=$(railway domain)

echo ""
echo "🎉 Развертывание завершено!"
echo "=========================="
echo "📱 URL приложения: $APP_URL"
echo "🧪 Тест 1: $APP_URL/"
echo "🧪 Тест 2: $APP_URL/test2"
echo "🧪 Тест 3: $APP_URL/test3"
echo ""
echo "📋 Отправляйте кандидатам ссылку: $APP_URL/"
echo ""
echo "📊 Мониторинг: https://railway.app/dashboard"
echo "🔧 Настройки: https://railway.app/dashboard"
