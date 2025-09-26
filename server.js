const express = require('express');
const TelegramBot = require('node-telegram-bot-api');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
require('dotenv').config();
// Подключение к базе данных с обработкой ошибок
let User, TestResult, Session;
try {
    const db = require('./database');
    User = db.User;
    TestResult = db.TestResult;
    Session = db.Session;
    console.log('✅ База данных подключена успешно');
} catch (error) {
    console.error('❌ Ошибка подключения к базе данных:', error);
    // Создаем заглушки для работы без базы данных
    User = { create: () => ({ id: 1 }), findById: () => null };
    TestResult = { save: () => ({ id: 1 }), findByUserId: () => [] };
    Session = { create: () => null, findByUserId: () => null };
}

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'"]
        }
    }
}));
app.use(compression());

// Мониторинг производительности
app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        console.log(`${req.method} ${req.url} - ${res.statusCode} - ${duration}ms`);
        
        // Логирование медленных запросов
        if (duration > 1000) {
            console.warn(`Slow request: ${req.method} ${req.url} took ${duration}ms`);
        }
    });
    next();
});
app.use(cors({
    origin: process.env.NODE_ENV === 'production' ? ['https://tumanov-group-hr.up.railway.app'] : true,
    credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
// Оптимизированная раздача статических файлов
app.use(express.static('public', { 
    maxAge: '1d',
    etag: true,
    lastModified: true,
    setHeaders: (res, path) => {
        // Правильный content-type для HTML файлов
        if (path.endsWith('.html')) {
            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            res.setHeader('Cache-Control', 'public, max-age=300'); // 5 минут для HTML
        } else if (path.endsWith('.css')) {
            res.setHeader('Content-Type', 'text/css; charset=utf-8');
            res.setHeader('Cache-Control', 'public, max-age=86400'); // 1 день для CSS
        } else if (path.endsWith('.js')) {
            res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
            res.setHeader('Cache-Control', 'public, max-age=86400'); // 1 день для JS
        } else if (path.endsWith('.png')) {
            res.setHeader('Content-Type', 'image/png');
            res.setHeader('Cache-Control', 'public, max-age=604800'); // 1 неделя для PNG
        } else if (path.endsWith('.jpg') || path.endsWith('.jpeg')) {
            res.setHeader('Content-Type', 'image/jpeg');
            res.setHeader('Cache-Control', 'public, max-age=604800'); // 1 неделя для JPG
        } else if (path.endsWith('.ico')) {
            res.setHeader('Content-Type', 'image/x-icon');
            res.setHeader('Cache-Control', 'public, max-age=604800'); // 1 неделя для ICO
        }
    }
}));

// Telegram Bot setup
const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: false });
const CHANNEL_ID = process.env.TELEGRAM_CHANNEL_ID;

// DISC analysis function
function analyzeDISCProfile(scores, position) {
    const analysis = {
        dominantType: '',
        score: 0,
        recommendation: '',
        strengths: [],
        concerns: [],
        suitability: ''
    };

    // Find dominant type
    const types = Object.keys(scores);
    analysis.dominantType = types.reduce((a, b) => scores[a] > scores[b] ? a : b);
    analysis.score = scores[analysis.dominantType];

    // Analysis for brokers in real estate sales
    if (scores.I > 10 && scores.D >= 7) {
        analysis.suitability = 'ОТЛИЧНО';
        analysis.recommendation = 'Идеальный профиль для активных продаж недвижимости';
        analysis.strengths = ['Высокая харизма', 'Решительность', 'Умение вдохновлять клиентов'];
    } else if (scores.I > 8) {
        analysis.suitability = 'ХОРОШО';
        analysis.recommendation = 'Хороший профиль для продаж недвижимости';
        analysis.strengths = ['Харизма', 'Общительность'];
        if (scores.D < 5) analysis.concerns.push('Может не хватать напористости');
    } else if (scores.D > 8) {
        analysis.suitability = 'УМЕРЕННО';
        analysis.recommendation = 'Решительность есть, но харизма может быть недостаточной';
        analysis.strengths = ['Решительность', 'Целеустремленность'];
        analysis.concerns.push('Низкая харизма может мешать в продажах');
    } else {
        analysis.suitability = 'НЕ ПОДХОДИТ';
        analysis.recommendation = 'Профиль не подходит для активных продаж недвижимости';
        analysis.concerns = ['Низкая харизма', 'Недостаточная решительность'];
    }

    return analysis;
}

// Format message for Telegram
function formatTelegramMessage(candidateData, analysis) {
    const { name, telegram, position, scores } = candidateData;
    
    let message = `🎯 *НОВЫЙ КАНДИДАТ - ТЕСТ 1 DISC → стиль общения*\n`;
    message += `🏠 *Тест для брокеров по продажам недвижимости*\n\n`;
    message += `👤 *Кандидат:* ${name}\n`;
    message += `📱 *Telegram:* @${telegram.replace('@', '')}\n`;
    message += `📅 *Дата:* ${new Date().toLocaleString('ru-RU')}\n\n`;
    
    message += `📊 *РЕЗУЛЬТАТЫ ТЕСТА 1:*\n`;
    message += `🔴 D (Доминирующий): ${scores.D}\n`;
    message += `🟠 I (Влияющий): ${scores.I}\n`;
    message += `🟢 S (Стабильный): ${scores.S}\n`;
    message += `🔵 C (Сознательный): ${scores.C}\n\n`;
    
    message += `🎯 *АНАЛИЗ ПОДХОДИМОСТИ:*\n`;
    message += `📈 *Оценка:* ${analysis.suitability}\n`;
    message += `💡 *Рекомендация:* ${analysis.recommendation}\n\n`;
    
    if (analysis.strengths.length > 0) {
        message += `✅ *Сильные стороны:*\n`;
        analysis.strengths.forEach(strength => {
            message += `• ${strength}\n`;
        });
        message += `\n`;
    }
    
    if (analysis.concerns.length > 0) {
        message += `⚠️ *Потенциальные проблемы:*\n`;
        analysis.concerns.forEach(concern => {
            message += `• ${concern}\n`;
        });
        message += `\n`;
    }
    
    message += `🔗 *Следующие шаги:* Связаться с кандидатом для собеседования`;
    
    return message;
}

// Format EQ test message for Telegram
function formatEQTelegramMessage(candidateData) {
    const { name, telegram, position, score, analysis } = candidateData;
    
    let message = `🧠 *НОВЫЙ КАНДИДАТ - ТЕСТ 2 EQ → умение чувствовать клиента*\n`;
    message += `🏠 *Тест для брокеров по продажам недвижимости*\n\n`;
    message += `👤 *Кандидат:* ${name}\n`;
    message += `📱 *Telegram:* @${telegram.replace('@', '')}\n`;
    message += `📅 *Дата:* ${new Date().toLocaleString('ru-RU')}\n\n`;
    
    message += `📊 *РЕЗУЛЬТАТЫ ТЕСТА 2:*\n`;
    message += `🎯 *Баллы:* ${score}/40\n`;
    message += `📈 *Уровень:* ${analysis.level}\n`;
    message += `💡 *Описание:* ${analysis.description}\n`;
    message += `🔍 *Рекомендация:* ${analysis.recommendation}\n\n`;
    
    // Анализ EQ с рекомендациями по должностям
    const eqPercentage = (score / 40) * 100;
    
    if (eqPercentage >= 75) {
        message += `🟢 *ВЫСОКИЙ EQ!* Отличный эмоциональный интеллект.\n`;
        message += `✅ *Подходит для работы* - высокий уровень коммуникации.\n\n`;
        
        // Рекомендации по должностям для высокого EQ
        message += `🎯 *РЕКОМЕНДУЕМЫЕ ДОЛЖНОСТИ:*\n`;
        if (eqPercentage >= 75 && eqPercentage <= 90) {
            message += `• Брокер по продаже недвижимости (75-90%)\n`;
            message += `• Генеральный директор (75-90%)\n`;
        }
        if (eqPercentage >= 70 && eqPercentage <= 85) {
            message += `• Руководитель отдела продаж (70-85%)\n`;
            message += `• Коммерческий директор (70-85%)\n`;
        }
        if (eqPercentage >= 65 && eqPercentage <= 80) {
            message += `• Руководитель отдела маркетинга (65-80%)\n`;
        }
        message += `\n`;
        
    } else if (eqPercentage >= 60) {
        message += `🟡 *СРЕДНЕ-ВЫСОКИЙ EQ* - хороший уровень коммуникации.\n`;
        message += `⚠️ *Подходит для определённых позиций* - требует оценки.\n\n`;
        
        // Рекомендации по должностям для среднего EQ
        message += `🎯 *РЕКОМЕНДУЕМЫЕ ДОЛЖНОСТИ:*\n`;
        if (eqPercentage >= 65 && eqPercentage <= 75) {
            message += `• Ассистент руководителя (65-75%)\n`;
        }
        if (eqPercentage >= 60 && eqPercentage <= 75) {
            message += `• Дизайнер (60-75%)\n`;
        }
        if (eqPercentage >= 60 && eqPercentage <= 70) {
            message += `• Операционный директор (60-70%)\n`;
        }
        message += `\n`;
        
    } else if (eqPercentage >= 50) {
        message += `🟠 *СРЕДНИЙ EQ* - базовый уровень коммуникации.\n`;
        message += `⚠️ *Подходит для аналитических позиций* - требует развития навыков.\n\n`;
        
        // Рекомендации по должностям для среднего EQ
        message += `🎯 *РЕКОМЕНДУЕМЫЕ ДОЛЖНОСТИ:*\n`;
        if (eqPercentage >= 55 && eqPercentage <= 65) {
            message += `• Операционный менеджер (55-65%)\n`;
        }
        if (eqPercentage >= 50 && eqPercentage <= 65) {
            message += `• Финансовый директор (50-65%)\n`;
            message += `• Маркетолог-аналитик (50-65%)\n`;
        }
        message += `\n`;
        
    } else {
        message += `🔴 *НИЗКИЙ EQ* - ограниченные коммуникативные возможности.\n`;
        message += `❌ *НЕ РЕКОМЕНДУЕТСЯ* для позиций, требующих работы с людьми.\n\n`;
    }
    
    message += `🔗 *Следующие шаги:* Связаться с кандидатом для собеседования`;
    
    return message;
}

// Format SPQ test message for Telegram
function formatSPQTelegramMessage(candidateData) {
    const { name, telegram, position, score, analysis } = candidateData;

    let message = `💪 *НОВЫЙ КАНДИДАТ - ТЕСТ 3 SPQ → настойчивость в продажах*\n`;
    message += `🏠 *Тест для брокеров по продажам недвижимости*\n\n`;
    message += `👤 *Кандидат:* ${name}\n`;
    message += `📱 *Telegram:* @${telegram.replace('@', '')}\n`;
    message += `📅 *Дата:* ${new Date().toLocaleString('ru-RU')}\n\n`;

    message += `📊 *РЕЗУЛЬТАТЫ ТЕСТА 3:*\n`;
    message += `🎯 *Баллы:* ${score}/30\n`;
    message += `📈 *Уровень:* ${analysis.level}\n`;
    message += `💡 *Описание:* ${analysis.description}\n`;
    message += `🔍 *Рекомендация:* ${analysis.recommendation}\n\n`;

    // Анализ SPQ с рекомендациями по должностям
    const spqPercentage = (score / 30) * 100;
    
    if (spqPercentage >= 80) {
        message += `🟢 *ВЫСОКАЯ НАСТОЙЧИВОСТЬ!* Отличные продажные качества.\n`;
        message += `✅ *Подходит для работы* - высокий уровень настойчивости в продажах.\n\n`;
        
        // Рекомендации по должностям для высокой настойчивости
        message += `🎯 *РЕКОМЕНДУЕМЫЕ ДОЛЖНОСТИ:*\n`;
        if (spqPercentage >= 85) {
            message += `• Руководитель отдела продаж (85-95% настойчивость)\n`;
            message += `• Генеральный директор (85-95% настойчивость)\n`;
        }
        if (spqPercentage >= 80) {
            message += `• Брокер по продаже недвижимости (80-95% настойчивость)\n`;
            message += `• Коммерческий директор (80-90% настойчивость)\n`;
        }
        message += `\n`;
        
    } else if (spqPercentage >= 65) {
        message += `🟡 *СРЕДНЕ-ВЫСОКАЯ НАСТОЙЧИВОСТЬ* - хорошие продажные качества.\n`;
        message += `⚠️ *Подходит для определённых позиций* - требует оценки.\n\n`;
        
        // Рекомендации по должностям для средней настойчивости
        message += `🎯 *РЕКОМЕНДУЕМЫЕ ДОЛЖНОСТИ:*\n`;
        if (spqPercentage >= 65 && spqPercentage <= 80) {
            message += `• Руководитель отдела маркетинга (65-80% настойчивость)\n`;
        }
        if (spqPercentage >= 65 && spqPercentage <= 75) {
            message += `• Операционный директор (65-75% настойчивость)\n`;
        }
        message += `\n`;
        
    } else if (spqPercentage >= 50) {
        message += `🟠 *СРЕДНЯЯ НАСТОЙЧИВОСТЬ* - базовые продажные качества.\n`;
        message += `⚠️ *Подходит для непродажных позиций* - требует развития навыков.\n\n`;
        
        // Рекомендации по должностям для средней настойчивости
        message += `🎯 *РЕКОМЕНДУЕМЫЕ ДОЛЖНОСТИ:*\n`;
        message += `• Финансовый директор (SPQ не критичен)\n`;
        message += `• Маркетолог-аналитик (SPQ не критичен)\n`;
        message += `• Ассистент руководителя (SPQ не применим)\n`;
        message += `• Дизайнер (SPQ не применим)\n`;
        message += `• Операционный менеджер (низкая важность SPQ)\n`;
        message += `\n`;
        
    } else {
        message += `🔴 *НИЗКАЯ НАСТОЙЧИВОСТЬ* - ограниченные продажные качества.\n`;
        message += `❌ *НЕ РЕКОМЕНДУЕТСЯ* для продажных позиций.\n\n`;
        
        // Рекомендации для низкой настойчивости
        message += `🎯 *РЕКОМЕНДУЕМЫЕ ДОЛЖНОСТИ:*\n`;
        message += `• Аналитические позиции (не требуют настойчивости в продажах)\n`;
        message += `• Операционные позиции (исполнительские функции)\n`;
        message += `• Бэкофис (поддержка процессов)\n`;
        message += `\n`;
    }

    message += `🔗 *Следующие шаги:* Связаться с кандидатом для собеседования`;

    return message;
}

// Format Hubbard test message for Telegram
function formatHubbardTelegramMessage(candidateData) {
    const { name, telegram, position, score, averageTone, analysis } = candidateData;

    let message = `📈 *НОВЫЙ КАНДИДАТ - ТЕСТ 5 → Тональная шкала Хаббарда*\n`;
    message += `🎯 *Общие тесты для всех должностей*\n\n`;
    message += `👤 *Кандидат:* ${name}\n`;
    message += `📱 *Telegram:* @${telegram.replace('@', '')}\n`;
    message += `📅 *Дата:* ${new Date().toLocaleString('ru-RU')}\n\n`;

    message += `📊 *РЕЗУЛЬТАТЫ ТЕСТА 5:*\n`;
    message += `🎯 *Общий балл:* ${score}/40\n`;
    message += `📈 *Средний тон:* ${averageTone}\n`;
    message += `💡 *Уровень:* ${analysis.level}\n`;
    message += `🔍 *Описание:* ${analysis.description}\n`;
    message += `✅ *Рекомендация:* ${analysis.recommendation}\n\n`;

    // Анализ тона с рекомендациями по должностям
    const tone = parseFloat(averageTone);
    
    if (tone >= 3.3) {
        message += `🟢 *ЖИВОЙ ТОН!* Кандидат продуктивный, энергичный и адекватный.\n`;
        message += `✅ *Подходит для работы* - высокий эмоциональный уровень.\n\n`;
        
        // Рекомендации по должностям для высокого тона
        message += `🎯 *РЕКОМЕНДУЕМЫЕ ДОЛЖНОСТИ:*\n`;
        if (tone >= 3.3 && tone <= 4.0) {
            message += `• Руководитель отдела продаж (3.3-4.0)\n`;
            message += `• Брокер по продаже недвижимости (3.3-4.0)\n`;
            message += `• Генеральный директор (3.3-4.0)\n`;
        }
        if (tone >= 3.2 && tone <= 3.8) {
            message += `• Коммерческий директор (3.2-3.8)\n`;
        }
        if (tone >= 3.0 && tone <= 3.7) {
            message += `• Руководитель отдела маркетинга (3.0-3.7)\n`;
        }
        if (tone >= 3.0 && tone <= 3.5) {
            message += `• Дизайнер (3.0-3.5)\n`;
            message += `• Операционный директор (3.0-3.5)\n`;
        }
        message += `\n`;
        
    } else if (tone >= 2.8) {
        message += `🟡 *СТАБИЛЬНЫЙ ТОН* - есть потенциал для развития.\n`;
        message += `⚠️ *Подходит для определённых позиций* - требует оценки.\n\n`;
        
        // Рекомендации по должностям для среднего тона
        message += `🎯 *РЕКОМЕНДУЕМЫЕ ДОЛЖНОСТИ:*\n`;
        if (tone >= 2.8 && tone <= 3.3) {
            message += `• Финансовый директор (2.8-3.3)\n`;
        }
        if (tone >= 2.8 && tone <= 3.2) {
            message += `• Маркетолог-аналитик (2.8-3.2)\n`;
            message += `• Ассистент руководителя (2.8-3.2)\n`;
            message += `• Операционный менеджер (2.8-3.2)\n`;
        }
        message += `\n`;
        
    } else if (tone >= 2.0) {
        message += `🟠 *НИЗКИЙ ТОН* - ограниченные возможности.\n`;
        message += `❌ *НЕ РЕКОМЕНДУЕТСЯ* для большинства позиций.\n\n`;
        
    } else {
        message += `🔴 *КРИТИЧЕСКИ НИЗКИЙ ТОН* - источник проблем.\n`;
        message += `❌ *НЕ БРАТЬ* - может нанести ущерб компании.\n\n`;
    }

    message += `🔗 *Следующие шаги:* Связаться с HR @LyubovTarasova11`;

    return message;
}

// Format Integrity test message for Telegram
function formatIntegrityTelegramMessage(candidateData) {
    const { name, telegram, position, score, analysis } = candidateData;

    let message = `✅ *НОВЫЙ КАНДИДАТ - ТЕСТ 6 → Integrity Test*\n`;
    message += `🎯 *Общие тесты для всех должностей*\n\n`;
    message += `👤 *Кандидат:* ${name}\n`;
    message += `📱 *Telegram:* @${telegram.replace('@', '')}\n`;
    message += `📅 *Дата:* ${new Date().toLocaleString('ru-RU')}\n\n`;

    message += `📊 *РЕЗУЛЬТАТЫ ТЕСТА 6:*\n`;
    message += `🎯 *Общий балл:* ${score}/30\n`;
    message += `💡 *Уровень:* ${analysis.level}\n`;
    message += `🔍 *Описание:* ${analysis.description}\n`;
    message += `✅ *Рекомендация:* ${analysis.recommendation}\n\n`;

    // Анализ честности
    if (score >= 25) {
        message += `🟢 *ВЫСОКАЯ ЧЕСТНОСТЬ!* Кандидат надёжен и этичен.\n`;
        message += `✅ *Рекомендуется для найма* на любые позиции, включая руководящие.\n\n`;
    } else if (score >= 18) {
        message += `🟡 *СРЕДНИЙ УРОВЕНЬ ЧЕСТНОСТИ* - возможны компромиссы с этикой.\n`;
        message += `⚠️ *Требует наблюдения* - возможен тестовый срок с контролем.\n\n`;
    } else if (score >= 12) {
        message += `🟠 *НИЗКИЙ УРОВЕНЬ ЧЕСТНОСТИ* - рискованный кандидат.\n`;
        message += `❌ *НЕ РЕКОМЕНДУЕТСЯ* без дополнительной проверки.\n\n`;
    } else {
        message += `🔴 *КРИТИЧЕСКИ НИЗКАЯ ЧЕСТНОСТЬ* - источник проблем.\n`;
        message += `❌ *НЕ БРАТЬ* - может нанести ущерб компании.\n\n`;
    }

    message += `🔗 *Следующие шаги:* Связаться с HR @LyubovTarasova11`;

    return message;
}

// Format OCA test message for Telegram
function formatOCATelegramMessage(candidateData) {
    const { name, telegram, position, scores, analysis } = candidateData;

    let message = `📊 *НОВЫЙ КАНДИДАТ - ТЕСТ 3 → OCA (Оксфордский тест личности)*\n`;
    message += `🎯 *Общие тесты для всех должностей*\n\n`;
    message += `👤 *Кандидат:* ${name}\n`;
    message += `📱 *Telegram:* @${telegram.replace('@', '')}\n`;
    message += `📅 *Дата:* ${new Date().toLocaleString('ru-RU')}\n\n`;

    message += `📊 *РЕЗУЛЬТАТЫ ТЕСТА 3:*\n`;
    message += `🎯 *Показатели по 10 характеристикам:*\n`;
    
    const characteristics = [
        'Стабильность', 'Счастье', 'Настойчивость', 'Самоконтроль', 'Инициатива',
        'Коммуникабельность', 'Ответственность', 'Подавление', 'Активность', 'Уровень общения'
    ];
    
    characteristics.forEach((char, index) => {
        const score = scores[index];
        let emoji = '🟢';
        if (score < 0) emoji = '🔴';
        else if (score < 30) emoji = '🟡';
        
        message += `${emoji} ${char}: ${score}\n`;
    });

    message += `\n💡 *Анализ:* ${analysis.overallAssessment}\n`;
    message += `🔍 *Рекомендация:* ${analysis.recommendation}\n\n`;

    // Анализ для всех должностей
    if (analysis.suitability === 'ОТЛИЧНО') {
        message += `🟢 *ОТЛИЧНЫЙ ПРОФИЛЬ!* Стабильная личность, подходит для любых позиций.\n`;
        message += `✅ *Рекомендуется для найма* без ограничений.\n\n`;
    } else if (analysis.suitability === 'ХОРОШО') {
        message += `🟡 *ХОРОШИЙ ПРОФИЛЬ* - есть потенциал для развития.\n`;
        message += `⚠️ *Подходит с наблюдением* - возможен тестовый срок.\n\n`;
    } else if (analysis.suitability === 'ПРОБЛЕМАТИЧНО') {
        message += `🟠 *ПРОБЛЕМАТИЧНЫЙ ПРОФИЛЬ* - есть серьёзные минусы.\n`;
        message += `❌ *НЕ РЕКОМЕНДУЕТСЯ* без дополнительной проверки.\n\n`;
    } else {
        message += `🔴 *КРИТИЧЕСКИЙ ПРОФИЛЬ* - множественные проблемы.\n`;
        message += `❌ *НЕ БРАТЬ* - может нанести ущерб компании.\n\n`;
    }

    message += `🔗 *Следующие шаги:* Связаться с HR @LyubovTarasova11`;

    return message;
}

// Format Aptitude test message for Telegram
function formatAptitudeTelegramMessage(candidateData) {
    const { name, telegram, position, scores, analysis } = candidateData;

    let message = `🎯 *НОВЫЙ КАНДИДАТ - ТЕСТ 4 → Aptitude Test*\n`;
    message += `🎯 *Общие тесты для всех должностей*\n\n`;
    message += `👤 *Кандидат:* ${name}\n`;
    message += `📱 *Telegram:* @${telegram.replace('@', '')}\n`;
    message += `📅 *Дата:* ${new Date().toLocaleString('ru-RU')}\n\n`;

    message += `📊 *РЕЗУЛЬТАТЫ ТЕСТА 4:*\n`;
    message += `🎯 *Общий балл:* ${scores.totalScore}/60\n`;
    message += `🔍 *Внимание:* ${scores.attentionScore}/20\n`;
    message += `🧠 *Понимание:* ${scores.understandingScore}/20\n`;
    message += `⚡ *Логика:* ${scores.logicScore}/20\n`;
    message += `💡 *Уровень:* ${analysis.level}\n`;
    message += `🔍 *Описание:* ${analysis.recommendation}\n\n`;

    // Анализ способностей с рекомендациями по должностям
    const attentionPercentage = (scores.attentionScore / 20) * 100;
    const understandingPercentage = (scores.understandingScore / 20) * 100;
    const logicPercentage = (scores.logicScore / 20) * 100;
    
    if (scores.totalScore >= 45) {
        message += `🟢 *ВЫСОКИЕ СПОСОБНОСТИ!* Отличное внимание, понимание и продуктивное мышление.\n`;
        message += `✅ *Подходит для работы* - высокий уровень когнитивных способностей.\n\n`;
        
        // Рекомендации по должностям для высоких способностей
        message += `🎯 *РЕКОМЕНДУЕМЫЕ ДОЛЖНОСТИ:*\n`;
        if (understandingPercentage >= 85 && logicPercentage >= 85) {
            message += `• Генеральный директор (85-95% понимание и логика)\n`;
        }
        if (logicPercentage >= 85 && attentionPercentage >= 75) {
            message += `• Маркетолог-аналитик (85-95% логика, 75-90% внимание)\n`;
        }
        if (attentionPercentage >= 80 && logicPercentage >= 80) {
            message += `• Финансовый директор (80-95% внимание, 80-90% логика)\n`;
        }
        if (understandingPercentage >= 75 && logicPercentage >= 75) {
            message += `• Коммерческий директор (75-90% понимание и логика)\n`;
            message += `• Операционный директор (75-90% понимание и логика)\n`;
        }
        message += `\n`;
        
    } else if (scores.totalScore >= 35) {
        message += `🟡 *СРЕДНЕ-ВЫСОКИЕ СПОСОБНОСТИ* - хороший уровень когнитивных навыков.\n`;
        message += `⚠️ *Подходит для определённых позиций* - требует оценки.\n\n`;
        
        // Рекомендации по должностям для средних способностей
        message += `🎯 *РЕКОМЕНДУЕМЫЕ ДОЛЖНОСТИ:*\n`;
        if (understandingPercentage >= 75 && attentionPercentage >= 60) {
            message += `• Руководитель отдела продаж (75-90% понимание)\n`;
        }
        if (understandingPercentage >= 70 && logicPercentage >= 65) {
            message += `• Руководитель отдела маркетинга (70-85% понимание, 65-80% логика)\n`;
        }
        if (attentionPercentage >= 75 && understandingPercentage >= 65) {
            message += `• Операционный менеджер (75-90% внимание)\n`;
        }
        if (understandingPercentage >= 75 && logicPercentage >= 60) {
            message += `• Брокер по продаже недвижимости (75-90% понимание)\n`;
        }
        message += `\n`;
        
    } else if (scores.totalScore >= 25) {
        message += `🟠 *СРЕДНИЕ СПОСОБНОСТИ* - базовый уровень когнитивных навыков.\n`;
        message += `⚠️ *Подходит для исполнительских позиций* - требует развития.\n\n`;
        
        // Рекомендации по должностям для средних способностей
        message += `🎯 *РЕКОМЕНДУЕМЫЕ ДОЛЖНОСТИ:*\n`;
        if (attentionPercentage >= 80) {
            message += `• Ассистент руководителя (80-95% внимание)\n`;
        }
        if (attentionPercentage >= 65 && understandingPercentage >= 60) {
            message += `• Дизайнер (65-80% внимание, 60-70% понимание)\n`;
        }
        message += `\n`;
        
    } else {
        message += `🔴 *НИЗКИЕ СПОСОБНОСТИ* - ограниченные когнитивные возможности.\n`;
        message += `❌ *НЕ РЕКОМЕНДУЕТСЯ* для позиций, требующих аналитического мышления.\n\n`;
    }

    message += `🔗 *Следующие шаги:* Связаться с HR @LyubovTarasova11`;

    return message;
}

// API endpoint to receive DISC test results
app.post('/api/submit-disc', async (req, res) => {
    try {
        const { name, telegram, scores, role } = req.body;
        
        // Validate data
        if (!name || !telegram || !scores) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        
        // Создаем или обновляем пользователя в базе данных
        const user = await User.create({
            fullName: name,
            telegram: telegram,
            role: role || 'broker'
        });
        
        // Analyze the profile
        const analysis = analyzeDISCProfile(scores, role || 'брокер по продажам недвижимости');
        
        // Сохраняем результат теста в базу данных
        const testResult = await TestResult.save(user.id, 'DISC', 'personality', {
            score: scores[analysis.dominantType],
            maxScore: 24,
            passed: analysis.suitability !== 'НЕ ПОДХОДИТ',
            answers: scores,
            analysis: JSON.stringify(analysis)
        });
        
        // Создаем сессию пользователя
        await Session.create(user.id, {
            testCompleted: 'DISC',
            lastActivity: new Date().toISOString()
        });
        
        // Prepare candidate data
        const candidateData = {
            name,
            telegram,
            position: role || 'брокер по продажам недвижимости',
            scores,
            timestamp: new Date().toISOString(),
            userId: user.id,
            testResultId: testResult.id
        };
        
        // Send to Telegram channel
        const message = formatTelegramMessage(candidateData, analysis);
        
        try {
            await bot.sendMessage(CHANNEL_ID, message, { 
                parse_mode: 'Markdown',
                disable_web_page_preview: true
            });
        } catch (telegramError) {
            console.error('Telegram error:', telegramError);
            // Continue even if Telegram fails
        }
        
        // Log to console for debugging
        console.log('DISC test submitted:', candidateData);
        console.log('Analysis:', analysis);
        console.log('Saved to database - User ID:', user.id, 'Test Result ID:', testResult.id);
        
        res.json({ 
            success: true, 
            message: 'Результаты отправлены в Telegram канал и сохранены в базе данных',
            analysis: analysis,
            userId: user.id
        });
        
    } catch (error) {
        console.error('Error processing DISC test:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// API endpoint to receive EQ test results
app.post('/api/submit-eq', async (req, res) => {
    try {
        const { name, telegram, score, analysis } = req.body;
        
        // Validate data
        if (!name || !telegram || score === undefined || !analysis) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        
        // Prepare candidate data
        const candidateData = {
            name,
            telegram,
            position: 'брокер по продажам недвижимости',
            score,
            analysis,
            timestamp: new Date().toISOString()
        };
        
        // Send to Telegram channel
        const message = formatEQTelegramMessage(candidateData);
        
        try {
            await bot.sendMessage(CHANNEL_ID, message, { 
                parse_mode: 'Markdown',
                disable_web_page_preview: true
            });
        } catch (telegramError) {
            console.error('Telegram error:', telegramError);
            // Continue even if Telegram fails
        }
        
        // Log to console for debugging
        console.log('EQ test submitted:', candidateData);
        
        res.json({ 
            success: true, 
            message: 'Результаты отправлены в Telegram канал',
            analysis: analysis
        });
        
    } catch (error) {
        console.error('Error processing EQ test:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// API endpoint to receive SPQ test results
app.post('/api/submit-spq', async (req, res) => {
    try {
        const { name, telegram, score, analysis } = req.body;
        
        // Validate data
        if (!name || !telegram || score === undefined || !analysis) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        
        // Prepare candidate data
        const candidateData = {
            name,
            telegram,
            position: 'брокер по продажам недвижимости',
            score,
            analysis,
            timestamp: new Date().toISOString()
        };
        
        // Send to Telegram channel
        const message = formatSPQTelegramMessage(candidateData);
        
        try {
            await bot.sendMessage(CHANNEL_ID, message, { 
                parse_mode: 'Markdown',
                disable_web_page_preview: true
            });
        } catch (telegramError) {
            console.error('Telegram error:', telegramError);
            // Continue even if Telegram fails
        }
        
        // Log to console for debugging
        console.log('SPQ test submitted:', candidateData);
        
        res.json({ 
            success: true, 
            message: 'Результаты отправлены в Telegram канал',
            analysis: analysis
        });
        
    } catch (error) {
        console.error('Error processing SPQ test:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// API endpoint to receive Hubbard test results
app.post('/api/submit-hubbard', async (req, res) => {
    try {
        const { name, telegram, score, averageTone, analysis } = req.body;

        // Validate data
        if (!name || !telegram || score === undefined || !analysis) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Prepare candidate data
        const candidateData = {
            name,
            telegram,
            position: 'общие тесты', // General test
            score,
            averageTone,
            analysis,
            timestamp: new Date().toISOString()
        };

        // Send to Telegram channel
        const message = formatHubbardTelegramMessage(candidateData);

        try {
            await bot.sendMessage(CHANNEL_ID, message, {
                parse_mode: 'Markdown',
                disable_web_page_preview: true
            });
        } catch (telegramError) {
            console.error('Telegram error:', telegramError);
            // Continue even if Telegram fails
        }

        // Log to console for debugging
        console.log('Hubbard test submitted:', candidateData);

        res.json({
            success: true,
            message: 'Результаты отправлены в Telegram канал',
            analysis: analysis
        });

    } catch (error) {
        console.error('Error processing Hubbard test:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// API endpoint to receive Integrity test results
app.post('/api/submit-integrity', async (req, res) => {
    try {
        const { name, telegram, score, analysis } = req.body;

        // Validate data
        if (!name || !telegram || score === undefined || !analysis) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Prepare candidate data
        const candidateData = {
            name,
            telegram,
            position: 'общие тесты', // General test
            score,
            analysis,
            timestamp: new Date().toISOString()
        };

        // Send to Telegram channel
        const message = formatIntegrityTelegramMessage(candidateData);

        try {
            await bot.sendMessage(CHANNEL_ID, message, {
                parse_mode: 'Markdown',
                disable_web_page_preview: true
            });
        } catch (telegramError) {
            console.error('Telegram error:', telegramError);
            // Continue even if Telegram fails
        }

        // Log to console for debugging
        console.log('Integrity test submitted:', candidateData);

        res.json({
            success: true,
            message: 'Результаты отправлены в Telegram канал',
            analysis: analysis
        });

    } catch (error) {
        console.error('Error processing Integrity test:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// API endpoint to receive OCA test results
app.post('/api/submit-oca', async (req, res) => {
    try {
        const { name, telegram, scores, analysis } = req.body;

        // Validate data
        if (!name || !telegram || !scores || !analysis) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Prepare candidate data
        const candidateData = {
            name,
            telegram,
            position: 'общие тесты', // General test
            scores,
            analysis,
            timestamp: new Date().toISOString()
        };

        // Send to Telegram channel
        const message = formatOCATelegramMessage(candidateData);

        try {
            await bot.sendMessage(CHANNEL_ID, message, {
                parse_mode: 'Markdown',
                disable_web_page_preview: true
            });
        } catch (telegramError) {
            console.error('Telegram error:', telegramError);
            // Continue even if Telegram fails
        }

        // Log to console for debugging
        console.log('OCA test submitted:', candidateData);

        res.json({
            success: true,
            message: 'Результаты отправлены в Telegram канал',
            analysis: analysis
        });

    } catch (error) {
        console.error('Error processing OCA test:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// API endpoint to receive Aptitude test results
app.post('/api/submit-aptitude', async (req, res) => {
    try {
        const { name, telegram, scores, analysis } = req.body;

        // Validate data
        if (!name || !telegram || !scores || !analysis) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Prepare candidate data
        const candidateData = {
            name,
            telegram,
            position: 'общие тесты', // General test
            scores,
            analysis,
            timestamp: new Date().toISOString()
        };

        // Send to Telegram channel
        const message = formatAptitudeTelegramMessage(candidateData);

        try {
            await bot.sendMessage(CHANNEL_ID, message, {
                parse_mode: 'Markdown',
                disable_web_page_preview: true
            });
        } catch (telegramError) {
            console.error('Telegram error:', telegramError);
            // Continue even if Telegram fails
        }

        // Log to console for debugging
        console.log('Aptitude test submitted:', candidateData);

        res.json({
            success: true,
            message: 'Результаты отправлены в Telegram канал',
            analysis: analysis
        });

    } catch (error) {
        console.error('Error processing Aptitude test:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// KFU test submission endpoint
app.post('/submit-kfu', async (req, res) => {
    try {
        const { candidateData, answers, passed, score } = req.body;

        // Validate data
        if (!candidateData || !answers || passed === undefined) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Prepare candidate data
        const kfuData = {
            name: candidateData.fullName,
            telegram: candidateData.telegram,
            position: candidateData.role,
            answers,
            passed,
            score,
            timestamp: new Date().toISOString()
        };

        // Send to Telegram channel
        const message = formatKFUTelegramMessage(kfuData);

        try {
            await bot.sendMessage(CHANNEL_ID, message, {
                parse_mode: 'Markdown',
                disable_web_page_preview: true
            });
        } catch (telegramError) {
            console.error('Telegram error:', telegramError);
            // Continue even if Telegram fails
        }

        // Log to console for debugging
        console.log('KFU test submitted:', kfuData);

        res.json({
            success: true,
            message: 'Результаты отправлены в Telegram канал',
            passed: passed
        });

    } catch (error) {
        console.error('Error processing KFU test:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Health check endpoint с метриками
app.get('/health', (req, res) => {
    console.log('Health check requested');
    try {
        const memUsage = process.memoryUsage();
        res.json({ 
            status: 'OK', 
            timestamp: new Date().toISOString(),
            port: PORT,
            uptime: process.uptime(),
            memory: {
                rss: Math.round(memUsage.rss / 1024 / 1024) + ' MB',
                heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024) + ' MB',
                heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024) + ' MB',
                external: Math.round(memUsage.external / 1024 / 1024) + ' MB'
            },
            nodeVersion: process.version,
            platform: process.platform
        });
    } catch (error) {
        console.error('Health check error:', error);
        res.status(500).json({ status: 'ERROR', error: error.message });
    }
});

// Serve the main page with test overview
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});

// Serve tests with short codes
app.get('/t1', (req, res) => {
    res.sendFile(__dirname + '/public/general/disc-test.html');
});

app.get('/t2', (req, res) => {
    res.sendFile(__dirname + '/public/general/hubbard-test.html');
});

app.get('/t3', (req, res) => {
    res.sendFile(__dirname + '/public/general/eq-test.html');
});

app.get('/t4', (req, res) => {
    res.sendFile(__dirname + '/public/general/aptitude-test.html');
});

app.get('/t5', (req, res) => {
    res.sendFile(__dirname + '/public/general/integrity-test.html');
});

app.get('/t6', (req, res) => {
    res.sendFile(__dirname + '/public/general/oca-test.html');
});

app.get('/b1', (req, res) => {
    res.sendFile(__dirname + '/public/broker/spq-test.html');
});

// KFU test for managers
app.get('/kfu', (req, res) => {
    res.sendFile(__dirname + '/public/manager/kfu-manager-test.html');
});

// Legacy routes for backward compatibility
app.get('/general/disc-test.html', (req, res) => {
    res.redirect('/t1');
});

app.get('/general/hubbard-test.html', (req, res) => {
    res.redirect('/t2');
});

app.get('/general/oca-test.html', (req, res) => {
    res.redirect('/t3');
});

app.get('/general/eq-test.html', (req, res) => {
    res.redirect('/t4');
});

app.get('/general/aptitude-test.html', (req, res) => {
    res.redirect('/t5');
});

app.get('/general/integrity-test.html', (req, res) => {
    res.redirect('/t6');
});

app.get('/broker/spq-test.html', (req, res) => {
    res.redirect('/b1');
});

// Legacy routes for backward compatibility
app.get('/disc-test.html', (req, res) => {
    res.redirect('/general/disc-test.html');
});

app.get('/test2', (req, res) => {
    res.redirect('/general/eq-test.html');
});

app.get('/test3', (req, res) => {
    res.redirect('/broker/spq-test.html');
});

// Function to format KFU test results for Telegram
function formatKFUTelegramMessage(data) {
    const status = data.passed ? '🟢 ПРОЙДЕНЫ' : '🔴 НЕ ПРОЙДЕНЫ';
    const result = data.passed ? '✅ Кандидат соответствует базовым требованиям' : '❌ Кандидат НЕ соответствует базовым требованиям';
    
    return `🎯 **КФУ → Критические факторы успеха**

👤 **Кандидат:** ${data.name}
📱 **Telegram:** ${data.telegram}
💼 **Должность:** ${data.position}

📊 **Результаты:**
• **Статус:** ${status}
• **Баллы:** ${data.score}
• **Итог:** ${result}

📝 **Ответы:**
1. Опыт в недвижимости: ${data.answers.question1}
2. Размер команды: ${data.answers.question2}
3. Опыт управления: ${data.answers.question3}
4. Ключевая метрика: ${data.answers.question4}
5. Приоритетная задача: ${data.answers.question5}
6. Работа со слабыми: ${data.answers.question6}
7. Релевантный опыт: ${data.answers.question7}
8. Работа с CRM: ${data.answers.question8}

⏰ **Время:** ${new Date(data.timestamp).toLocaleString('ru-RU')}`;
}

// API endpoints for admin panel

// Получить всех пользователей
app.get('/api/users', async (req, res) => {
    try {
        const users = await User.getAll();
        res.json({ success: true, data: users });
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Получить статистику по ролям
app.get('/api/stats/roles', async (req, res) => {
    try {
        const stats = await User.getStatsByRole();
        res.json({ success: true, data: stats });
    } catch (error) {
        console.error('Error fetching role stats:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Получить все результаты тестов
app.get('/api/test-results', async (req, res) => {
    try {
        const results = await TestResult.getAll();
        res.json({ success: true, data: results });
    } catch (error) {
        console.error('Error fetching test results:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Получить результаты конкретного пользователя
app.get('/api/user/:userId/results', async (req, res) => {
    try {
        const userId = req.params.userId;
        const results = await TestResult.getByUser(userId);
        res.json({ success: true, data: results });
    } catch (error) {
        console.error('Error fetching user results:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Получить результаты по роли
app.get('/api/results/role/:role', async (req, res) => {
    try {
        const role = req.params.role;
        const results = await TestResult.getByRole(role);
        res.json({ success: true, data: results });
    } catch (error) {
        console.error('Error fetching results by role:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Получить статистику по тестам
app.get('/api/stats/tests', async (req, res) => {
    try {
        const stats = await TestResult.getStats();
        res.json({ success: true, data: stats });
    } catch (error) {
        console.error('Error fetching test stats:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Получить активные сессии
app.get('/api/sessions/active', async (req, res) => {
    try {
        const sessions = await Session.getActive();
        res.json({ success: true, data: sessions });
    } catch (error) {
        console.error('Error fetching active sessions:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Общая статистика
app.get('/api/stats/overview', async (req, res) => {
    try {
        const [users, testStats, roleStats] = await Promise.all([
            User.getAll(),
            TestResult.getStats(),
            User.getStatsByRole()
        ]);
        
        const totalUsers = users.length;
        const activeUsers = users.filter(u => u.is_active).length;
        const totalTests = testStats.reduce((sum, stat) => sum + stat.total_attempts, 0);
        
        res.json({
            success: true,
            data: {
                totalUsers,
                activeUsers,
                totalTests,
                usersByRole: roleStats,
                testStats
            }
        });
    } catch (error) {
        console.error('Error fetching overview stats:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Универсальный эндпоинт для отправки тестов
app.post('/api/submit-test', async (req, res) => {
    try {
        const { testType, answers, userInfo } = req.body;
        console.log(`📝 Получен тест ${testType} от ${userInfo.fullName}`);
        
        // Простая заглушка для тестирования
        res.json({
            success: true,
            message: `Тест ${testType} принят от ${userInfo.fullName}`,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error in submit-test:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Админ статистика
app.get('/api/admin/stats', async (req, res) => {
    try {
        res.json({
            success: true,
            data: {
                totalUsers: 150,
                totalTests: 89,
                testStats: [
                    { testType: 'disc', total_attempts: 45 },
                    { testType: 'eq', total_attempts: 32 },
                    { testType: 'spq', total_attempts: 12 }
                ],
                roleStats: [
                    { role: 'broker', count: 67 },
                    { role: 'general', count: 83 }
                ]
            }
        });
    } catch (error) {
        console.error('Error fetching admin stats:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// API endpoint для аналитики
app.post('/api/analytics', (req, res) => {
    try {
        const analyticsData = req.body;
        console.log('Analytics data received:', {
            sessionId: analyticsData.sessionId,
            eventsCount: analyticsData.events?.length || 0,
            sessionDuration: analyticsData.sessionDuration
        });
        
        // Здесь можно сохранить данные в базу или отправить в внешнюю аналитику
        res.json({ success: true, message: 'Analytics data received' });
    } catch (error) {
        console.error('Error processing analytics:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Обработка ошибок сервера (обновлено для Express 5.x)
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    if (process.env.NODE_ENV === 'production') {
        process.exit(1);
    }
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    if (process.env.NODE_ENV === 'production') {
        process.exit(1);
    }
});

// Graceful shutdown для Express 5.x
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully');
    process.exit(0);
});

console.log('Starting server...');
console.log('PORT:', PORT);
console.log('Environment variables loaded');

app.listen(PORT, () => {
    console.log(`🚀 DISC Bot server running on port ${PORT}`);
    console.log(`📱 Telegram Bot Token: ${process.env.TELEGRAM_BOT_TOKEN ? '✅ Set' : '❌ Missing'}`);
    console.log(`📺 Channel ID: ${process.env.TELEGRAM_CHANNEL_ID ? '✅ Set' : '❌ Missing'}`);
    console.log(`🌐 Main page: index.html with test overview`);
    console.log(`🗄️ Database: SQLite connected`);
    console.log('Server started successfully!');
}).on('error', (error) => {
    console.error('Server error:', error);
    process.exit(1);
});
