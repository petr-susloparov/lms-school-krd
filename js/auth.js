// AUTHENTICATION LOGIC
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔐 Авторизация загружена');
    
    // Проверяем существующую сессию
    checkSession();
    
    if (!window.supabase) {
        showError('База данных недоступна');
        return;
    }
    
    initRoleTabs();
    initLoginForm();
});

function checkSession() {
    const user = localStorage.getItem('user');
    if (user) {
        try {
            const userData = JSON.parse(user);
            if (userData.role === 'student') {
                window.location.href = 'dashboard-student.html';
            } else if (userData.role === 'teacher') {
                window.location.href = 'dashboard-teacher.html';
            }
        } catch (e) {
            localStorage.removeItem('user');
        }
    }
}

function initRoleTabs() {
    const tabs = document.querySelectorAll('.role-tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', function() {
            tabs.forEach(t => t.classList.remove('active'));
            this.classList.add('active');
        });
    });
}

function initLoginForm() {
    const form = document.getElementById('loginForm');
    
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        const activeTab = document.querySelector('.role-tab.active');
        const role = activeTab ? activeTab.dataset.role : 'student';
        
        if (!email || !password) {
            showError('Заполните все поля');
            return;
        }
        
        if (!isValidEmail(email)) {
            showError('Введите корректный email');
            return;
        }
        
        await loginUser(email, password, role);
    });
}

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function loginUser(email, password, role) {
    const errorEl = document.getElementById('errorMessage');
    const submitBtn = form.querySelector('button[type="submit"]');
    const btnText = submitBtn.querySelector('.btn-text');
    const btnLoading = submitBtn.querySelector('.btn-loading');
    
    // Скрываем ошибку
    if (errorEl) errorEl.style.display = 'none';
    
    // Показываем загрузку
    btnText.style.display = 'none';
    btnLoading.style.display = 'flex';
    submitBtn.disabled = true;
    
    try {
        // Ищем пользователя в базе
        const { data: users, error } = await window.supabase
            .from('users')
            .select('id, email, role, full_name, class_name')
            .eq('email', email)
            .eq('password', password)
            .eq('role', role);
        
        if (error) {
            console.error('Ошибка Supabase:', error);
            throw new Error('Ошибка подключения к базе');
        }
        
        if (!users || users.length === 0) {
            throw new Error('Неверный email, пароль или роль');
        }
        
        const user = users[0];
        
        // Сохраняем данные пользователя
        localStorage.setItem('user', JSON.stringify(user));
        
        // Перенаправляем
        if (user.role === 'student') {
            window.location.href = 'dashboard-student.html';
        } else {
            window.location.href = 'dashboard-teacher.html';
        }
        
    } catch (error) {
        console.error('Ошибка входа:', error);
        showError(error.message || 'Ошибка при входе');
        
    } finally {
        // Восстанавливаем кнопку
        btnText.style.display = 'inline';
        btnLoading.style.display = 'none';
        submitBtn.disabled = false;
    }
}

function showError(message) {
    const errorEl = document.getElementById('errorMessage');
    if (errorEl) {
        errorEl.textContent = message;
        errorEl.style.display = 'block';
        
        setTimeout(() => {
            errorEl.style.display = 'none';
        }, 5000);
    }
}

// Глобальная функция выхода
window.logout = function() {
    localStorage.removeItem('user');
    window.location.href = 'index.html';
};