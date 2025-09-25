# 🚀 Руководство по развертыванию на Railway

## Способ 1: Через Railway CLI (Рекомендуется)

### Шаг 1: Вход в Railway
```bash
cd /tmp/disc-bot
railway login
```
- Откроется браузер для авторизации
- Войдите в свой аккаунт Railway (или создайте новый)

### Шаг 2: Создание проекта
```bash
railway init
```
- Выберите "Create a new project"
- Введите название проекта: `disc-broker-tests`

### Шаг 3: Настройка переменных окружения
```bash
railway variables set TELEGRAM_BOT_TOKEN=8495225769:AAE6w8YbpFuaKjT68RSrfeVaCmjceE2UyJg
railway variables set TELEGRAM_CHANNEL_ID=-1003135904548
railway variables set PORT=3000
railway variables set NODE_ENV=production
```

### Шаг 4: Развертывание
```bash
railway up
```

### Шаг 5: Получение URL
```bash
railway domain
```
- Скопируйте полученный URL (например: `https://disc-broker-tests-production.up.railway.app`)

---

## Способ 2: Через веб-интерфейс Railway

### Шаг 1: Регистрация
1. Перейдите на [railway.app](https://railway.app)
2. Войдите через GitHub
3. Нажмите "New Project"

### Шаг 2: Подключение репозитория
1. Выберите "Deploy from GitHub repo"
2. Подключите ваш GitHub аккаунт
3. Создайте новый репозиторий для проекта
4. Загрузите файлы проекта в репозиторий

### Шаг 3: Настройка переменных
В настройках проекта добавьте переменные окружения:
- `TELEGRAM_BOT_TOKEN`: `8495225769:AAE6w8YbpFuaKjT68RSrfeVaCmjceE2UyJg`
- `TELEGRAM_CHANNEL_ID`: `-1003135904548`
- `PORT`: `3000`
- `NODE_ENV`: `production`

### Шаг 4: Развертывание
1. Railway автоматически определит Node.js проект
2. Нажмите "Deploy"
3. Дождитесь завершения развертывания

---

## Способ 3: Через GitHub Actions (Автоматическое развертывание)

### Шаг 1: Создание репозитория
1. Создайте новый репозиторий на GitHub
2. Загрузите все файлы проекта

### Шаг 2: Настройка Railway
1. В Railway создайте новый проект
2. Подключите GitHub репозиторий
3. Настройте переменные окружения

### Шаг 3: Автоматическое развертывание
- При каждом push в main ветку Railway автоматически переразвернет приложение

---

## 📋 Проверка развертывания

После успешного развертывания:

1. **Проверьте URL**: `https://your-app-name.up.railway.app`
2. **Тест 1**: `https://your-app-name.up.railway.app/`
3. **Тест 2**: `https://your-app-name.up.railway.app/test2`
4. **Тест 3**: `https://your-app-name.up.railway.app/test3`

## 🔗 Отправка кандидатам

После развертывания отправляйте кандидатам ссылку:
```
https://your-app-name.up.railway.app/
```

## 📱 Мониторинг

- **Логи**: Доступны в Railway Dashboard
- **Метрики**: CPU, память, сеть
- **Переменные**: Управление через веб-интерфейс

## 💰 Стоимость

- **Бесплатный план**: До 500 часов в месяц
- **Pro план**: $5/месяц за неограниченное время

## 🆘 Поддержка

При возникновении проблем:
1. Проверьте логи в Railway Dashboard
2. Убедитесь, что все переменные окружения установлены
3. Проверьте, что Telegram Bot Token и Channel ID корректны
