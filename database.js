const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Путь к базе данных
const dbPath = path.join(__dirname, 'hr_tests.db');

// Создание/подключение к базе данных
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Ошибка подключения к базе данных:', err.message);
    } else {
        console.log('Подключение к SQLite базе данных установлено');
        initializeTables();
    }
});

// Инициализация таблиц
function initializeTables() {
    // Таблица пользователей
    db.run(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            full_name TEXT NOT NULL,
            telegram TEXT NOT NULL,
            role TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            last_login DATETIME DEFAULT CURRENT_TIMESTAMP,
            is_active BOOLEAN DEFAULT 1
        )
    `, (err) => {
        if (err) {
            console.error('Ошибка создания таблицы users:', err.message);
        } else {
            console.log('Таблица users создана/проверена');
        }
    });

    // Таблица результатов тестов
    db.run(`
        CREATE TABLE IF NOT EXISTS test_results (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            test_name TEXT NOT NULL,
            test_type TEXT NOT NULL,
            score INTEGER,
            max_score INTEGER,
            passed BOOLEAN,
            answers TEXT,
            analysis TEXT,
            completed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )
    `, (err) => {
        if (err) {
            console.error('Ошибка создания таблицы test_results:', err.message);
        } else {
            console.log('Таблица test_results создана/проверена');
        }
    });

    // Таблица сессий (для отслеживания активности)
    db.run(`
        CREATE TABLE IF NOT EXISTS user_sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            session_data TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            expires_at DATETIME,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )
    `, (err) => {
        if (err) {
            console.error('Ошибка создания таблицы user_sessions:', err.message);
        } else {
            console.log('Таблица user_sessions создана/проверена');
        }
    });
}

// Функции для работы с пользователями
const User = {
    // Создание нового пользователя
    create: (userData) => {
        return new Promise((resolve, reject) => {
            const { fullName, telegram, role } = userData;
            
            // Сначала проверяем, существует ли пользователь
            db.get('SELECT id FROM users WHERE telegram = ?', [telegram], (err, row) => {
                if (err) {
                    reject(err);
                    return;
                }
                
                if (row) {
                    // Пользователь существует, обновляем last_login
                    db.run('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?', [row.id], (err) => {
                        if (err) {
                            reject(err);
                        } else {
                            resolve({ id: row.id, isNew: false });
                        }
                    });
                } else {
                    // Создаем нового пользователя
                    db.run(
                        'INSERT INTO users (full_name, telegram, role) VALUES (?, ?, ?)',
                        [fullName, telegram, role],
                        function(err) {
                            if (err) {
                                reject(err);
                            } else {
                                resolve({ id: this.lastID, isNew: true });
                            }
                        }
                    );
                }
            });
        });
    },

    // Получение пользователя по telegram
    getByTelegram: (telegram) => {
        return new Promise((resolve, reject) => {
            db.get('SELECT * FROM users WHERE telegram = ?', [telegram], (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row);
                }
            });
        });
    },

    // Получение всех пользователей
    getAll: () => {
        return new Promise((resolve, reject) => {
            db.all('SELECT * FROM users ORDER BY created_at DESC', (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    },

    // Получение статистики по ролям
    getStatsByRole: () => {
        return new Promise((resolve, reject) => {
            db.all(`
                SELECT 
                    role,
                    COUNT(*) as count,
                    COUNT(CASE WHEN is_active = 1 THEN 1 END) as active_count
                FROM users 
                GROUP BY role 
                ORDER BY count DESC
            `, (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }
};

// Функции для работы с результатами тестов
const TestResult = {
    // Сохранение результата теста
    save: (userId, testName, testType, result) => {
        return new Promise((resolve, reject) => {
            const { score, maxScore, passed, answers, analysis } = result;
            
            db.run(`
                INSERT INTO test_results (user_id, test_name, test_type, score, max_score, passed, answers, analysis)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `, [userId, testName, testType, score, maxScore, passed, JSON.stringify(answers), analysis], 
            function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ id: this.lastID });
                }
            });
        });
    },

    // Получение результатов пользователя
    getByUser: (userId) => {
        return new Promise((resolve, reject) => {
            db.all(`
                SELECT tr.*, u.full_name, u.telegram, u.role
                FROM test_results tr
                JOIN users u ON tr.user_id = u.id
                WHERE tr.user_id = ?
                ORDER BY tr.completed_at DESC
            `, [userId], (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    // Парсим JSON поля
                    const results = rows.map(row => ({
                        ...row,
                        answers: row.answers ? JSON.parse(row.answers) : null
                    }));
                    resolve(results);
                }
            });
        });
    },

    // Получение всех результатов
    getAll: () => {
        return new Promise((resolve, reject) => {
            db.all(`
                SELECT tr.*, u.full_name, u.telegram, u.role
                FROM test_results tr
                JOIN users u ON tr.user_id = u.id
                ORDER BY tr.completed_at DESC
            `, (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    // Парсим JSON поля
                    const results = rows.map(row => ({
                        ...row,
                        answers: row.answers ? JSON.parse(row.answers) : null
                    }));
                    resolve(results);
                }
            });
        });
    },

    // Получение статистики по тестам
    getStats: () => {
        return new Promise((resolve, reject) => {
            db.all(`
                SELECT 
                    test_name,
                    test_type,
                    COUNT(*) as total_attempts,
                    COUNT(CASE WHEN passed = 1 THEN 1 END) as passed_count,
                    AVG(score) as avg_score,
                    MAX(score) as max_score,
                    MIN(score) as min_score
                FROM test_results 
                GROUP BY test_name, test_type
                ORDER BY total_attempts DESC
            `, (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    },

    // Получение результатов по роли
    getByRole: (role) => {
        return new Promise((resolve, reject) => {
            db.all(`
                SELECT tr.*, u.full_name, u.telegram, u.role
                FROM test_results tr
                JOIN users u ON tr.user_id = u.id
                WHERE u.role = ?
                ORDER BY tr.completed_at DESC
            `, [role], (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    const results = rows.map(row => ({
                        ...row,
                        answers: row.answers ? JSON.parse(row.answers) : null
                    }));
                    resolve(results);
                }
            });
        });
    }
};

// Функции для работы с сессиями
const Session = {
    // Создание сессии
    create: (userId, sessionData) => {
        return new Promise((resolve, reject) => {
            const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 часа
            
            db.run(`
                INSERT INTO user_sessions (user_id, session_data, expires_at)
                VALUES (?, ?, ?)
            `, [userId, JSON.stringify(sessionData), expiresAt.toISOString()], 
            function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ id: this.lastID });
                }
            });
        });
    },

    // Получение активных сессий
    getActive: () => {
        return new Promise((resolve, reject) => {
            db.all(`
                SELECT us.*, u.full_name, u.telegram
                FROM user_sessions us
                JOIN users u ON us.user_id = u.id
                WHERE us.expires_at > datetime('now')
                ORDER BY us.created_at DESC
            `, (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    const sessions = rows.map(row => ({
                        ...row,
                        session_data: row.session_data ? JSON.parse(row.session_data) : null
                    }));
                    resolve(sessions);
                }
            });
        });
    }
};

module.exports = {
    db,
    User,
    TestResult,
    Session
};
