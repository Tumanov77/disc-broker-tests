const express = require('express');
const TelegramBot = require('node-telegram-bot-api');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

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
    
    // Анализ для брокеров по продажам недвижимости
    if (score >= 30) {
        message += `✅ *Отлично для продаж недвижимости!* Высокий эмоциональный интеллект поможет в работе с клиентами.\n\n`;
    } else if (score >= 20) {
        message += `⚠️ *Хорошо, но есть потенциал.* Средний EQ можно развить дополнительным обучением.\n\n`;
    } else {
        message += `❌ *Требует внимания.* Низкий EQ может мешать в активных продажах недвижимости.\n\n`;
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

    // Анализ для брокеров по продажам недвижимости
    if (score >= 25) {
        message += `✅ *Отлично для продаж недвижимости!* Высокая настойчивость поможет в активных продажах.\n\n`;
    } else if (score >= 18) {
        message += `⚠️ *Хорошо, но есть потенциал.* Средняя настойчивость может быть развита.\n\n`;
    } else {
        message += `❌ *Требует внимания.* Низкая настойчивость может мешать в продажах недвижимости.\n\n`;
    }

    message += `🔗 *Следующие шаги:* Связаться с кандидатом для собеседования`;

    return message;
}

// API endpoint to receive DISC test results
app.post('/api/submit-disc', async (req, res) => {
    try {
        const { name, telegram, scores } = req.body;
        
        // Validate data
        if (!name || !telegram || !scores) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        
        // Analyze the profile
        const analysis = analyzeDISCProfile(scores, 'брокер по продажам недвижимости');
        
        // Prepare candidate data
        const candidateData = {
            name,
            telegram,
            position: 'брокер по продажам недвижимости',
            scores,
            timestamp: new Date().toISOString()
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
        
        res.json({ 
            success: true, 
            message: 'Результаты отправлены в Telegram канал',
            analysis: analysis
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

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Serve the main page with test overview
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});

// Serve the DISC test form
app.get('/disc-test.html', (req, res) => {
    res.sendFile(__dirname + '/public/disc-test.html');
});

// Serve the EQ test form
app.get('/test2', (req, res) => {
    res.sendFile(__dirname + '/public/test2.html');
});

// Serve the SPQ test form
app.get('/test3', (req, res) => {
    res.sendFile(__dirname + '/public/test3.html');
});

app.listen(PORT, () => {
    console.log(`🚀 DISC Bot server running on port ${PORT}`);
    console.log(`📱 Telegram Bot Token: ${process.env.TELEGRAM_BOT_TOKEN ? '✅ Set' : '❌ Missing'}`);
    console.log(`📺 Channel ID: ${process.env.TELEGRAM_CHANNEL_ID ? '✅ Set' : '❌ Missing'}`);
});
