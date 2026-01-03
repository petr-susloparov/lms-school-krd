// AUTHENTICATION LOGIC - без localStorage
let currentUser = null;

document.addEventListener('DOMContentLoaded', function() {
    console.log('🔐 Авторизация загружена');
    
    if (!window.supabase) {
        showError('База данных недоступна');
        return;
    }
    
    initRoleTabs();
    initLoginForm();
});

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
            showError('Введите email и пароль');
            return;
        }
        
        if (!email.includes('@')) {
            showError('Введите корректный email');
            return;
        }
        
        await loginUser(email, password, role);
    });
}

async function loginUser(email, password, role) {
    const errorEl = document.getElementById('errorMessage');
    const submitBtn = document.getElementById('loginBtn');
    const btnText = submitBtn.querySelector('.btn-text');
    const btnLoading = submitBtn.querySelector('.btn-loading');
    
    // Скрываем предыдущие ошибки
    if (errorEl) errorEl.style.display = 'none';
    
    // Показываем индикатор загрузки
    btnText.style.display = 'none';
    btnLoading.style.display = 'flex';
    submitBtn.disabled = true;
    
    try {
        // Ищем пользователя по email, паролю и роли
        const { data: users, error } = await window.supabase
            .from('users')
            .select('id, email, role, full_name, class_name')
            .eq('email', email)
            .eq('password', password)
            .eq('role', role);
        
        if (error) {
            console.error('Ошибка Supabase:', error);
            throw new Error('Ошибка подключения к базе данных');
        }
        
        if (!users || users.length === 0) {
            throw new Error('Неверный email или пароль');
        }
        
        // Сохраняем пользователя только в памяти
        currentUser = users[0];
        
        // Перенаправляем в зависимости от роли
        if (currentUser.role === 'student') {
            window.location.href = 'dashboard-student.html';
        } else {
            window.location.href = 'dashboard-teacher.html';
        }
        
    } catch (error) {
        console.error('Ошибка входа:', error);
        showError(error.message || 'Ошибка при входе в систему');
        
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
    if (confirm('Вы уверены, что хотите выйти?')) {
        currentUser = null;
        window.location.href = 'index.html';
    }
};

// Экспортируем текущего пользователя
window.getCurrentUser = function() {
    return currentUser;
};