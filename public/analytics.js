// Система аналитики и мониторинга
class Analytics {
    constructor() {
        this.events = [];
        this.sessionId = this.generateSessionId();
        this.startTime = Date.now();
        this.init();
    }

    init() {
        // Отслеживание времени на странице
        this.trackPageView();
        
        // Отслеживание кликов
        document.addEventListener('click', (e) => {
            this.trackEvent('click', {
                element: e.target.tagName,
                id: e.target.id,
                class: e.target.className,
                text: e.target.textContent?.substring(0, 50)
            });
        });

        // Отслеживание отправки форм
        document.addEventListener('submit', (e) => {
            this.trackEvent('form_submit', {
                formId: e.target.id,
                action: e.target.action
            });
        });

        // Отслеживание ошибок
        window.addEventListener('error', (e) => {
            this.trackEvent('error', {
                message: e.message,
                filename: e.filename,
                lineno: e.lineno,
                colno: e.colno
            });
        });

        // Отправка данных при закрытии страницы
        window.addEventListener('beforeunload', () => {
            this.sendAnalytics();
        });

        // Периодическая отправка данных
        setInterval(() => {
            this.sendAnalytics();
        }, 30000); // каждые 30 секунд
    }

    trackPageView() {
        this.trackEvent('page_view', {
            url: window.location.href,
            title: document.title,
            referrer: document.referrer,
            userAgent: navigator.userAgent,
            screen: `${screen.width}x${screen.height}`,
            viewport: `${window.innerWidth}x${window.innerHeight}`
        });
    }

    trackEvent(eventName, data = {}) {
        const event = {
            name: eventName,
            data: data,
            timestamp: Date.now(),
            sessionId: this.sessionId,
            url: window.location.href
        };
        
        this.events.push(event);
        console.log('Analytics Event:', event);
    }

    trackTestStart(testName) {
        this.trackEvent('test_start', {
            testName: testName,
            timeOnPage: Date.now() - this.startTime
        });
    }

    trackTestComplete(testName, score, duration) {
        this.trackEvent('test_complete', {
            testName: testName,
            score: score,
            duration: duration,
            timeOnPage: Date.now() - this.startTime
        });
    }

    trackUserAction(action, details = {}) {
        this.trackEvent('user_action', {
            action: action,
            details: details,
            timeOnPage: Date.now() - this.startTime
        });
    }

    sendAnalytics() {
        if (this.events.length === 0) return;

        const analyticsData = {
            sessionId: this.sessionId,
            events: this.events,
            sessionDuration: Date.now() - this.startTime,
            timestamp: Date.now()
        };

        // Отправка на сервер
        fetch('/api/analytics', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(analyticsData)
        }).catch(error => {
            console.error('Analytics send error:', error);
        });

        // Очистка отправленных событий
        this.events = [];
    }

    generateSessionId() {
        return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
}

// Инициализация аналитики
const analytics = new Analytics();

// Экспорт для использования в других скриптах
window.analytics = analytics;
