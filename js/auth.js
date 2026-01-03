// ========================
// AUTHENTICATION LOGIC
// ========================

document.addEventListener('DOMContentLoaded', function() {
    console.log('🔐 Система авторизации загружена');
    
    if (!window.supabase) {
        showError('Системная ошибка: база данных недоступна');
        return;
    }
    
    initRoleSelector();
    initLoginForm();
    checkAuthStatus();
});

function checkAuthStatus() {
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

function initRoleSelector() {
    const roleButtons = document.querySelectorAll('.role-btn');
    
    roleButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            roleButtons.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
        });
    });
}

function initLoginForm() {
    const loginForm = document.getElementById('loginForm');
    const loginBtn = document.getElementById('loginBtn');
    
    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        const activeRoleBtn = document.querySelector('.role-btn.active');
        const selectedRole = activeRoleBtn ? activeRoleBtn.dataset.role : 'student';
        
        if (!email || !password) {
            showError('Введите email и пароль');
            return;
        }
        
        if (!validateEmail(email)) {
            showError('Введите корректный email адрес');
            return;
        }
        
        await performLogin(email, password, selectedRole);
    });
}

function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

async function performLogin(email, password, role) {
    const errorEl = document.getElementById('errorMessage');
    const submitBtn = document.querySelector('#loginForm button[type="submit"]');
    
    errorEl.style.display = 'none';
    const originalText = submitBtn.textContent;
    
    try {
        submitBtn.textContent = 'Вход...';
        submitBtn.disabled = true;
        
        // Используем правильную структуру запроса
        const { data, error } = await window.supabase
            .from('users')
            .select('id, email, role')
            .eq('email', email.toLowerCase())
            .eq('password', password)
            .eq('role', role)
            .single();
        
        if (error) {
            console.error('Ошибка запроса:', error);
            if (error.code === 'PGRST116') {
                showError('Пользователь не найден');
            } else {
                showError('Ошибка сервера. Попробуйте позже.');
            }
            return;
        }
        
        if (!data) {
            showError('Неверный email или пароль');
            return;
        }
        
        // Сохраняем данные пользователя
        localStorage.setItem('user', JSON.stringify({
            id: data.id,
            email: data.email,
            role: data.role
        }));
        
        // Перенаправляем
        setTimeout(() => {
            if (data.role === 'student') {
                window.location.href = 'dashboard-student.html';
            } else {
                window.location.href = 'dashboard-teacher.html';
            }
        }, 500);
        
    } catch (error) {
        console.error('Ошибка авторизации:', error);
        showError('Произошла ошибка при входе');
        
    } finally {
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
}

function showError(message) {
    const errorEl = document.getElementById('errorMessage');
    if (errorEl) {
        errorEl.textContent = message;
        errorEl.style.display = 'block';
        errorEl.style.animation = 'shake 0.5s';
        
        setTimeout(() => {
            errorEl.style.display = 'none';
            errorEl.style.animation = '';
        }, 5000);
    }
}

// Добавляем анимацию для ошибки
const style = document.createElement('style');
style.textContent = `
    @keyframes shake {
        0%, 100% { transform: translateX(0); }
        10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
        20%, 40%, 60%, 80% { transform: translateX(5px); }
    }
`;
document.head.appendChild(style);

// Глобальные функции
window.logout = function() {
    localStorage.removeItem('user');
    window.location.href = 'index.html';
};