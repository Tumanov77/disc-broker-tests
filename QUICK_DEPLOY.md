# ⚡ Быстрое развертывание на Railway

## 🚀 Автоматическое развертывание (1 команда)

```bash
cd /tmp/disc-bot
./deploy.sh
```

Скрипт автоматически:
- ✅ Проверит Railway CLI
- ✅ Авторизует вас в Railway
- ✅ Создаст проект
- ✅ Настроит переменные окружения
- ✅ Развернет приложение
- ✅ Покажет URL для кандидатов

---

## 🔧 Ручное развертывание

### 1. Вход в Railway
```bash
cd /tmp/disc-bot
railway login
```

### 2. Создание проекта
```bash
railway init
```

### 3. Настройка переменных
```bash
railway variables set TELEGRAM_BOT_TOKEN=8495225769:AAE6w8YbpFuaKjT68RSrfeVaCmjceE2UyJg
railway variables set TELEGRAM_CHANNEL_ID=-1003135904548
railway variables set PORT=3000
railway variables set NODE_ENV=production
```

### 4. Развертывание
```bash
railway up
```

### 5. Получение URL
```bash
railway domain
```

---

## 📱 После развертывания

Получите URL вида: `https://your-app-name.up.railway.app`

**Отправляйте кандидатам:**
```
https://your-app-name.up.railway.app/
```

**Тесты доступны по адресам:**
- Тест 1: `https://your-app-name.up.railway.app/`
- Тест 2: `https://your-app-name.up.railway.app/test2`
- Тест 3: `https://your-app-name.up.railway.app/test3`

---

## 🆘 Если что-то пошло не так

1. **Проверьте логи**: `railway logs`
2. **Проверьте переменные**: `railway variables`
3. **Перезапустите**: `railway redeploy`

---

## 💡 Полезные команды

```bash
# Просмотр статуса
railway status

# Просмотр логов
railway logs

# Просмотр переменных
railway variables

# Перезапуск
railway redeploy

# Удаление проекта
railway delete
```
