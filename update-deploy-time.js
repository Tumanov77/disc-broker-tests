#!/usr/bin/env node

// Автоматическое обновление времени деплоя
const fs = require('fs');
const path = require('path');

function updateDeployTime() {
    const now = new Date();
    const dateStr = now.toLocaleDateString('ru-RU', {
        day: '2-digit',
        month: '2-digit', 
        year: 'numeric'
    });
    const timeStr = now.toLocaleTimeString('ru-RU', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
    
    const timestamp = `Последнее обновление: ${dateStr}, ${timeStr}`;
    
    // Обновляем index.html
    const indexPath = path.join(__dirname, 'public', 'index.html');
    let content = fs.readFileSync(indexPath, 'utf8');
    
    // Заменяем timestamp в HTML
    content = content.replace(
        /<div class="timestamp"[^>]*>.*?<\/div>/s,
        `<div class="timestamp" id="update-timestamp">${timestamp}</div>`
    );
    
    // Заменяем timestamp в JavaScript
    content = content.replace(
        /timestampElement\.textContent = `[^`]*`;/,
        `timestampElement.textContent = \`${timestamp}\`;`
    );
    
    fs.writeFileSync(indexPath, content);
    console.log(`✅ Время деплоя обновлено: ${timestamp}`);
}

// Обновляем entry.html
function updateEntryTime() {
    const now = new Date();
    const dateStr = now.toLocaleDateString('ru-RU', {
        day: '2-digit',
        month: '2-digit', 
        year: 'numeric'
    });
    const timeStr = now.toLocaleTimeString('ru-RU', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
    
    const timestamp = `Последнее обновление: ${dateStr}, ${timeStr}`;
    
    const entryPath = path.join(__dirname, 'public', 'entry.html');
    let content = fs.readFileSync(entryPath, 'utf8');
    
    content = content.replace(
        /<div class="timestamp"[^>]*>.*?<\/div>/s,
        `<div class="timestamp" id="update-timestamp">${timestamp}</div>`
    );
    
    content = content.replace(
        /timestampElement\.textContent = `[^`]*`;/,
        `timestampElement.textContent = \`${timestamp}\`;`
    );
    
    fs.writeFileSync(entryPath, content);
    console.log(`✅ Время entry.html обновлено: ${timestamp}`);
}

if (require.main === module) {
    updateDeployTime();
    updateEntryTime();
}

module.exports = { updateDeployTime, updateEntryTime };
