// ========================
// AUTHENTICATION LOGIC - ИСПРАВЛЕННАЯ ВЕРСИЯ
// ========================

document.addEventListener('DOMContentLoaded', function() {
    console.log('🔐 Система авторизации загружена');
    
    // Ждем пока Supabase инициализируется
    setTimeout(() => {
        initAuthSystem();
    }, 500);
});

async function initAuthSystem() {
    // Проверяем, инициализирован ли Supabase
    if (!window.supabase) {
        console.error('❌ Supabase не инициализирован!');
        
        // Пытаемся инициализировать с безопасным ключом
        const safeKey = await getSafeSupabaseKey();
        
        if (safeKey) {
            try {
                window.supabase = window.supabase.createClient(
                    'https://potnqqwsaxnrrnuhoysb.supabase.co',
                    safeKey,
                    {
                        auth: {
                            persistSession: false,
                            autoRefreshToken: false
                        }
                    }
                );
                console.log('✅ Supabase инициализирован с безопасным ключом');
            } catch (e) {
                console.error('💥 Ошибка инициализации:', e);
                showFatalError('Не удалось подключиться к базе данных');
                return;
            }
        } else {
            showFatalError('Не удалось получить ключ Supabase');
            return;
        }
    }
    
    // Инициализация выбора роли
    initRoleSelector();
    
    // Инициализация формы входа
    initLoginForm();
    
    // Проверяем, если пользователь уже авторизован
    checkExistingSession();
}

async function getSafeSupabaseKey() {
    // Пробуем несколько источников ключей
    const keySources = [
        // 1. Из глобальной переменной
        () => window.SUPABASE_ANON_KEY,
        // 2. Из localStorage
        () => localStorage.getItem('supabase_key'),
        // 3. Запрашиваем у пользователя
        () => promptUserForKey()
    ];
    
    for (const getKey of keySources) {
        try {
            const key = await getKey();
            if (key && isValidKey(key)) {
                console.log('✅ Найден рабочий ключ');
                return cleanKey(key);
            }
        } catch (e) {
            console.warn('Ошибка получения ключа:', e);
        }
    }
    
    return null;
}

function cleanKey(key) {
    if (!key) return '';
    
    // Удаляем все не-ASCII символы
    let cleaned = key.replace(/[^\x00-\x7F]/g, '');
    
    // Удаляем пробелы и переносы строк
    cleaned = cleaned.trim();
    
    // Если ключ в старом формате, преобразуем
    if (cleaned.startsWith('sb_publishable_')) {
        console.log('⚠️ Преобразую старый формат ключа');
        // Берем только буквенно-цифровые символы
        cleaned = cleaned.replace(/[^\w]/g, '');
    }
    
    return cleaned;
}

function isValidKey(key) {
    if (!key || key.length < 20) return false;
    
    // Проверяем форматы
    const isJWT = /^eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+$/.test(key);
    const isOldFormat = /^sb_publishable_[a-zA-Z0-9]+$/.test(key);
    
    return isJWT || isOldFormat;
}

function promptUserForKey() {
    return prompt(
        'Введите ключ Supabase:\n\n' +
        'Получите его в Supabase Dashboard:\n' +
        '1. Settings → API\n' +
        '2. Скопируйте "anon public" ключ\n\n' +
        'Ключ должен начинаться с eyJ...\n' +
        'или sb_publishable_...',
        ''
    );
}

function showFatalError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: #e74c3c;
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        z-index: 10000;
        max-width: 500px;
        text-align: center;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    `;
    
    errorDiv.innerHTML = `
        <strong>🚨 Ошибка:</strong> ${message}
        <div style="margin-top: 10px;">
            <button onclick="location.reload()" style="
                background: white;
                color: #e74c3c;
                border: none;
                padding: 5px 15px;
                border-radius: 4px;
                cursor: pointer;
                margin-right: 10px;
            ">
                Обновить
            </button>
            <button onclick="this.parentElement.parentElement.remove()" style="
                background: transparent;
                color: white;
                border: 1px solid white;
                padding: 5px 15px;
                border-radius: 4px;
                cursor: pointer;
            ">
                Закрыть
            </button>
        </div>
    `;
    
    document.body.appendChild(errorDiv);
}

// Остальные функции остаются без изменений...
function initRoleSelector() {
    const roleButtons = document.querySelectorAll('.role-btn');
    
    if (roleButtons.length > 0) {
        roleButtons.forEach(btn => {
            btn.addEventListener('click', function() {
                roleButtons.forEach(b => b.classList.remove('active'));
                this.classList.add('active');
                console.log('🎭 Выбрана роль:', this.dataset.role);
            });
        });
        console.log('✅ Селектор ролей инициализирован');
    }
}

function initLoginForm() {
    const loginForm = document.getElementById('loginForm');
    
    if (!loginForm) {
        console.warn('⚠️ Форма входа не найдена');
        return;
    }
    
    console.log('✅ Форма входа найдена');
    
    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        const activeRoleBtn = document.querySelector('.role-btn.active');
        const selectedRole = activeRoleBtn ? activeRoleBtn.dataset.role : 'student';
        
        console.log('📝 Попытка входа:', { email, role: selectedRole });
        
        // Валидация
        if (!email || !password) {
            showLoginError('Введите email и пароль');
            return;
        }
        
        if (!validateEmail(email)) {
            showLoginError('Введите корректный email адрес');
            return;
        }
        
        // Выполняем вход
        await performLogin(email, password, selectedRole);
    });
}

async function performLogin(email, password, role) {
    const errorEl = document.getElementById('errorMessage');
    const submitBtn = document.querySelector('#loginForm button[type="submit"]');
    
    // Сбрасываем предыдущие ошибки
    if (errorEl) errorEl.style.display = 'none';
    
    // Сохраняем оригинальный текст кнопки
    const originalText = submitBtn.textContent;
    
    try {
        // Показываем загрузку
        submitBtn.textContent = '⏳ Проверяем данные...';
        submitBtn.disabled = true;
        
        console.log('🔍 Проверяем пользователя в БД...');
        
        // Выполняем запрос к базе данных
        const { data, error } = await window.supabase
            .from('users')
            .select('id, email, full_name, role, class, created_at')
            .eq('email', email)
            .eq('password', password)
            .eq('role', role)
            .maybeSingle(); // Используем maybeSingle вместо single
        
        // Проверяем результат
        if (error) {
            console.error('❌ Ошибка запроса:', error);
            showLoginError('Ошибка сервера. Попробуйте позже.');
            return;
        }
        
        if (!data) {
            showLoginError('Пользователь не найден. Проверьте email, пароль и выбранную роль');
            return;
        }
        
        console.log('✅ Успешный вход:', data);
        
        // Сохраняем данные пользователя
        localStorage.setItem('user', JSON.stringify(data));
        localStorage.setItem('last_login', new Date().toISOString());
        
        // Перенаправляем на нужную страницу
        redirectToDashboard(data.role, data.full_name);
        
    } catch (error) {
        console.error('💥 Неожиданная ошибка:', error);
        showLoginError('Произошла непредвиденная ошибка');
        
    } finally {
        // Восстанавливаем кнопку
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
}

function showLoginError(message) {
    const errorEl = document.getElementById('errorMessage');
    if (errorEl) {
        errorEl.textContent = message;
        errorEl.style.display = 'block';
        
        // Автоматически скрыть через 5 секунд
        setTimeout(() => {
            errorEl.style.display = 'none';
        }, 5000);
    } else {
        alert(message);
    }
}

function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

function redirectToDashboard(role, userName) {
    console.log(`🚀 Перенаправление ${userName} (${role})...`);
    
    // Небольшая задержка для UX
    setTimeout(() => {
        if (role === 'student') {
            window.location.href = 'dashboard-student.html';
        } else if (role === 'teacher') {
            window.location.href = 'dashboard-teacher.html';
        } else {
            showLoginError('Неизвестная роль пользователя');
        }
    }, 500);
}

function checkExistingSession() {
    const user = JSON.parse(localStorage.getItem('user'));
    
    if (user) {
        console.log('👤 Обнаружена существующая сессия:', user.email);
        
        // Показываем сообщение о возможном автоматическом входе
        const message = `Обнаружен вход как ${user.full_name}. 
                        <a href="#" onclick="continueAsUser()">Продолжить</a> 
                        или <a href="#" onclick="logout()">войти как другой пользователь</a>`;
        
        if (document.getElementById('sessionMessage')) {
            document.getElementById('sessionMessage').innerHTML = message;
        }
    }
}

// Глобальные функции для быстрого доступа
window.continueAsUser = function() {
    const user = JSON.parse(localStorage.getItem('user'));
    if (user) {
        redirectToDashboard(user.role, user.full_name);
    }
};

window.logout = function() {
    localStorage.removeItem('user');
    localStorage.removeItem('last_login');
    window.location.reload();
};

// Экспорт для тестирования
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        performLogin,
        validateEmail,
        showLoginError
    };
}