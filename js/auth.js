document.addEventListener('DOMContentLoaded', function() {
    console.log('🔐 Система авторизации загружена');
    
    // Проверяем авторизацию
    const user = localStorage.getItem('user');
    if (user) {
        const userData = JSON.parse(user);
        redirectToDashboard(userData.role);
    }
    
    initRoleSelector();
    initLoginForm();
});

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
        
        await performLogin(email, password, selectedRole);
    });
}

async function performLogin(email, password, role) {
    const errorEl = document.getElementById('errorMessage');
    const submitBtn = document.querySelector('#loginForm button[type="submit"]');
    
    errorEl.style.display = 'none';
    const originalText = submitBtn.textContent;
    
    try {
        submitBtn.textContent = 'Вход...';
        submitBtn.disabled = true;
        
        // Ищем пользователя с совпадающими email, паролем и ролью
        const { data, error } = await window.supabase
            .from('users')
            .select('id, email, role')
            .eq('email', email)
            .eq('password', password)
            .eq('role', role)
            .single();
        
        if (error) {
            console.error('Supabase error:', error);
            
            if (error.code === 'PGRST116') {
                showError('Неверный email или пароль');
            } else {
                showError('Ошибка сервера. Попробуйте позже');
            }
            return;
        }
        
        if (!data) {
            showError('Пользователь не найден');
            return;
        }
        
        // Сохраняем данные пользователя
        localStorage.setItem('user', JSON.stringify({
            id: data.id,
            email: data.email,
            role: data.role
        }));
        
        // Перенаправляем на соответствующую страницу
        redirectToDashboard(data.role);
        
    } catch (error) {
        console.error('Login error:', error);
        showError('Произошла ошибка при входе');
        
    } finally {
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
}

function redirectToDashboard(role) {
    if (role === 'student') {
        window.location.href = 'dashboard-student.html';
    } else if (role === 'teacher') {
        window.location.href = 'dashboard-teacher.html';
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