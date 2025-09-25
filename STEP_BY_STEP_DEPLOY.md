# 📋 Пошаговое развертывание на Railway

## 🎯 Цель
Развернуть систему тестирования брокеров на публичном домене для доступа кандидатов.

---

## 📝 Шаг 1: Вход в Railway

Выполните в терминале:
```bash
cd /tmp/disc-bot
railway login
```

**Что произойдет:**
- Откроется браузер
- Войдите в аккаунт Railway (или создайте новый)
- Вернитесь в терминал

---

## 📝 Шаг 2: Создание проекта

```bash
railway init
```

**Выберите:**
- "Create a new project"
- Название проекта: `disc-broker-tests`

---

## 📝 Шаг 3: Настройка переменных окружения

```bash
railway variables --set "TELEGRAM_BOT_TOKEN=8495225769:AAE6w8YbpFuaKjT68RSrfeVaCmjceE2UyJg" --set "TELEGRAM_CHANNEL_ID=-1003135904548" --set "PORT=3000" --set "NODE_ENV=production"
```

---

## 📝 Шаг 4: Развертывание

```bash
railway up
```

**Что произойдет:**
- Railway загрузит файлы проекта
- Установит зависимости
- Запустит приложение
- Покажет URL

---

## 📝 Шаг 5: Получение URL

```bash
railway domain
```

**Результат:** URL вида `https://disc-broker-tests-production.up.railway.app`

---

## 📝 Шаг 6: Тестирование

Откройте в браузере:
- **Главная страница:** `https://your-url.up.railway.app/`
- **Тест 2:** `https://your-url.up.railway.app/test2`
- **Тест 3:** `https://your-url.up.railway.app/test3`

---

## 📝 Шаг 7: Отправка кандидатам

**Отправляйте кандидатам ссылку:**
```
https://your-url.up.railway.app/
```

---

## 🔧 Полезные команды

```bash
# Проверить статус
railway status

# Посмотреть логи
railway logs

# Посмотреть переменные
railway variables

# Перезапустить
railway redeploy

# Открыть дашборд
railway open
```

---

## 🆘 Решение проблем

### Проблема: "Unauthorized"
**Решение:** Выполните `railway login`

### Проблема: "Project not found"
**Решение:** Выполните `railway init`

### Проблема: "Variables not set"
**Решение:** Проверьте переменные командой `railway variables`

### Проблема: "Deploy failed"
**Решение:** Посмотрите логи командой `railway logs`

---

## 💰 Стоимость Railway

- **Бесплатно:** До 500 часов в месяц
- **Pro:** $5/месяц за неограниченное время

---

## 🎉 Готово!

После успешного развертывания у вас будет:
- ✅ Публичный URL для кандидатов
- ✅ Автоматическая отправка результатов в Telegram
- ✅ Три теста: DISC, EQ, SPQ
- ✅ Анализ специально для брокеров по недвижимости
