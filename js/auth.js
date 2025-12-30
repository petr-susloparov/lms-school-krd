// ========================
// AUTHENTICATION LOGIC
// ========================

document.addEventListener('DOMContentLoaded', function() {
    console.log('🔐 Система авторизации загружена');
    
    // Проверяем, инициализирован ли Supabase
    if (!window.supabase) {
        console.error('❌ Supabase не инициализирован!');
        showError('Системная ошибка: база данных недоступна');
        return;
    }
    
    // Инициализация выбора роли
    initRoleSelector();
    
    // Инициализация формы входа
    initLoginForm();
    
    // Проверяем, если пользователь уже авторизован
    checkExistingSession();
});

// ========================
// ФУНКЦИИ
// ========================

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
            showError('Введите email и пароль');
            return;
        }
        
        if (!validateEmail(email)) {
            showError('Введите корректный email адрес');
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
    errorEl.style.display = 'none';
    
    // Сохраняем оригинальный текст кнопки
    const originalText = submitBtn.textContent;
    const originalState = {
        text: submitBtn.textContent,
        disabled: submitBtn.disabled
    };
    
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
            .single();
        
        // Проверяем результат
        if (error) {
            console.error('❌ Ошибка запроса:', error);
            
            if (error.code === 'PGRST116') {
                showError('Пользователь не найден. Проверьте email, пароль и выбранную роль');
            } else {
                showError('Ошибка сервера: ' + error.message);
            }
            return;
        }
        
        if (!data) {
            showError('Пользователь не найден');
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
        showError('Произошла непредвиденная ошибка: ' + error.message);
        
    } finally {
        // Восстанавливаем кнопку
        submitBtn.textContent = originalState.text;
        submitBtn.disabled = originalState.disabled;
    }
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
            showError('Неизвестная роль пользователя');
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

// Вспомогательные функции
function showError(message) {
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
        showError
    };
}