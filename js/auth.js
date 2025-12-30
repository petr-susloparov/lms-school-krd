// В файле auth.js ЗАМЕНИТЕ функцию login на:

async function login(email, password) {
    const errorMessage = document.getElementById('errorMessage');
    errorMessage.style.display = 'none';
    
    try {
        console.log('🔐 Попытка входа:', { email, password });
        
        // 1. Проверяем пользователя в БД
        const { data, error } = await supabase
            .from('users')
            .select('id, email, full_name, role, class')
            .eq('email', email)
            .eq('password', password)
            .single(); // .single() ожидает ровно одну запись
        
        console.log('📊 Результат запроса:', { data, error });
        
        if (error) {
            console.error('❌ Ошибка запроса:', error);
            if (error.code === 'PGRST116') { // PGRST116 = нет данных
                errorMessage.textContent = 'Пользователь не найден или неверный пароль';
            } else {
                errorMessage.textContent = 'Ошибка сервера: ' + error.message;
            }
            errorMessage.style.display = 'block';
            return;
        }
        
        if (!data) {
            errorMessage.textContent = 'Пользователь не найден';
            errorMessage.style.display = 'block';
            return;
        }
        
        // 2. Сохраняем данные пользователя
        localStorage.setItem('user', JSON.stringify(data));
        console.log('✅ Пользователь сохранен:', data);
        
        // 3. Перенаправляем
        if (data.role === 'student') {
            window.location.href = 'dashboard-student.html';
        } else if (data.role === 'teacher') {
            window.location.href = 'dashboard-teacher.html';
        } else {
            errorMessage.textContent = 'Неизвестная роль пользователя';
            errorMessage.style.display = 'block';
        }
        
    } catch (err) {
        console.error('💥 Критическая ошибка:', err);
        errorMessage.textContent = 'Ошибка подключения: ' + err.message;
        errorMessage.style.display = 'block';
    }
}

// И ОБНОВИТЕ обработчик формы:
if (loginForm) {
    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        const selectedRole = document.querySelector('.role-btn.active').dataset.role;
        
        console.log('📝 Данные формы:', { email, password, selectedRole });
        
        await login(email, password);
    });
}