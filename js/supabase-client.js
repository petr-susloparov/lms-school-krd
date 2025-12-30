// ========================
// SUPABASE CONFIGURATION - ИСПРАВЛЕННАЯ ВЕРСИЯ
// ========================

// 🔥 ВАЖНО: Получите правильный ключ из Dashboard → Settings → API → "anon public"
const SUPABASE_URL = 'https://potnqqwsaxnrrnuhoysb.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBvdG5xcXdzYXhucnJudWhveXNiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcwNzk1OTcsImV4cCI6MjA4MjY1NTU5N30._rjY-bDj3-eaymenBC1lge0z1YLshCEzV8KDJQRKxBQ';

// Проверка ключа
function validateKey(key) {
    if (!key) {
        console.error('❌ Ключ не задан');
        return false;
    }
    
    // Проверяем формат JWT токена
    const isValidJWT = /^eyJ[a-zA-Z0-9_-]+\.eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+$/.test(key);
    
    if (!isValidJWT) {
        console.error('❌ Неверный формат ключа. Должен быть JWT токен (начинается с eyJ...)');
        console.error('Получите правильный ключ: Dashboard → Settings → API → "anon public"');
        return false;
    }
    
    console.log('✅ Ключ валидный, длина:', key.length);
    return true;
}

// Инициализация Supabase с защитой от ошибок
function initializeSupabase() {
    console.log('🔧 Инициализация Supabase...');
    
    // Проверяем URL
    if (!SUPABASE_URL || SUPABASE_URL.includes('ваш-project-id')) {
        console.error('❌ Не задан SUPABASE_URL');
        showFatalError('Ошибка конфигурации: не задан URL Supabase');
        return null;
    }
    
    // Проверяем ключ
    if (!validateKey(SUPABASE_ANON_KEY)) {
        showFatalError('Ошибка конфигурации: неверный ключ Supabase. Получите правильный ключ в Dashboard → Settings → API → "anon public"');
        return null;
    }
    
    try {
        // Создаем клиент
        const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
            auth: {
                persistSession: false,
                autoRefreshToken: false,
                detectSessionInUrl: false
            }
        });
        
        console.log('✅ Supabase клиент создан');
        console.log('📡 URL:', SUPABASE_URL);
        
        return client;
        
    } catch (error) {
        console.error('💥 Ошибка создания клиента:', error);
        showFatalError('Не удалось подключиться к базе данных: ' + error.message);
        return null;
    }
}

// Функция для отображения критической ошибки
function showFatalError(message) {
    // Создаем сообщение об ошибке поверх всего
    const errorOverlay = document.createElement('div');
    errorOverlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(231, 76, 60, 0.95);
        color: white;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        z-index: 99999;
        padding: 20px;
        text-align: center;
        font-family: Arial, sans-serif;
    `;
    
    errorOverlay.innerHTML = `
        <h1 style="font-size: 24px; margin-bottom: 20px;">🚨 Критическая ошибка</h1>
        <p style="font-size: 18px; margin-bottom: 20px; max-width: 600px;">${message}</p>
        <div style="background: white; color: #333; padding: 15px; border-radius: 8px; max-width: 800px; text-align: left; margin: 20px;">
            <h3>📋 Как исправить:</h3>
            <ol style="margin-left: 20px; margin-top: 10px;">
                <li>Зайдите в <a href="https://app.supabase.com" target="_blank">Supabase Dashboard</a></li>
                <li>Выберите ваш проект</li>
                <li>Нажмите ⚙️ <strong>Settings</strong> → <strong>API</strong></li>
                <li>Скопируйте <strong>"anon public"</strong> ключ</li>
                <li>Вставьте его в файл <code>js/supabase-client.js</code></li>
                <li>Обновите страницу</li>
            </ol>
            <p style="margin-top: 15px; color: #666;">
                <strong>Ключ должен выглядеть так:</strong><br>
                <code style="background: #f5f5f5; padding: 5px; border-radius: 3px; font-size: 12px; word-break: break-all;">
                eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIs...
                </code>
            </p>
        </div>
        <button onclick="location.reload()" style="
            background: white;
            color: #e74c3c;
            border: none;
            padding: 12px 24px;
            border-radius: 8px;
            font-size: 16px;
            font-weight: bold;
            cursor: pointer;
            margin-top: 20px;
        ">
            🔄 Обновить страницу
        </button>
    `;
    
    document.body.appendChild(errorOverlay);
}

// Инициализируем и делаем глобальным
const supabaseClient = initializeSupabase();
if (supabaseClient) {
    window.supabase = supabaseClient;
    
    // Тестируем подключение
    setTimeout(async () => {
        try {
            const { data, error } = await supabaseClient
                .from('users')
                .select('count')
                .limit(1);
            
            if (error) {
                console.warn('⚠️ Предупреждение подключения:', error.message);
            } else {
                console.log('✅ Подключение к БД: УСПЕХ');
            }
        } catch (e) {
            console.warn('⚠️ Ошибка теста подключения:', e.message);
        }
    }, 1000);
} else {
    console.error('❌ Supabase не инициализирован');
}

// Экспортируем для использования в других модулях
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { supabase: window.supabase };
}