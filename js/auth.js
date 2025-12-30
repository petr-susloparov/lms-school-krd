document.addEventListener('DOMContentLoaded', function() {
    // Выбор роли
    const roleButtons = document.querySelectorAll('.role-btn');
    let selectedRole = 'student';
    
    roleButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            roleButtons.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            selectedRole = this.dataset.role;
        });
    });
    
    // Обработка формы входа
    const loginForm = document.getElementById('loginForm');
    const errorMessage = document.getElementById('errorMessage');
    
    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            
            try {
                // Проверяем пользователя в базе данных
                const { data, error } = await supabase
                    .from('users')
                    .select('*')
                    .eq('email', email)
                    .eq('password', password)
                    .eq('role', selectedRole)
                    .single();
                
                if (error || !data) {
                    errorMessage.style.display = 'block';
                    return;
                }
                
                // Сохраняем данные пользователя
                localStorage.setItem('user', JSON.stringify(data));
                
                // Перенаправляем в нужный кабинет
                if (selectedRole === 'student') {
                    window.location.href = 'dashboard-student.html';
                } else {
                    window.location.href = 'dashboard-teacher.html';
                }
                
            } catch (err) {
                console.error('Ошибка авторизации:', err);
                errorMessage.style.display = 'block';
            }
        });
    }
    
    // Проверка авторизации на других страницах
    const currentPage = window.location.pathname;
    if (currentPage.includes('dashboard')) {
        const user = JSON.parse(localStorage.getItem('user'));
        
        if (!user) {
            window.location.href = 'index.html';
            return;
        }
        
        // Заполняем имя пользователя
        const nameElement = document.getElementById('studentName') || 
                           document.getElementById('teacherName');
        if (nameElement) {
            nameElement.textContent = user.full_name;
        }
        
        // Обработка выхода
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', function() {
                localStorage.removeItem('user');
                window.location.href = 'index.html';
            });
        }
    }
});