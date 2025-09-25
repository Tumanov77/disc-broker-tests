const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Health check endpoint
app.get('/health', (req, res) => {
    console.log('Health check requested');
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        port: PORT,
        uptime: process.uptime()
    });
});

// Serve the main page
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});

// Обработка ошибок сервера
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

console.log('Starting simple server...');
console.log('PORT:', PORT);

app.listen(PORT, () => {
    console.log(`🚀 Simple server running on port ${PORT}`);
    console.log('Server started successfully!');
}).on('error', (error) => {
    console.error('Server error:', error);
    process.exit(1);
});
