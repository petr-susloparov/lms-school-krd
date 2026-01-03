// STUDENT DASHBOARD LOGIC
let currentStudent = null;

document.addEventListener('DOMContentLoaded', async function() {
    console.log('🎓 Кабинет ученика загружен');
    
    // Проверяем авторизацию через сессию
    await checkAuth();
    
    if (!currentStudent) return;
    
    updateUserInfo(currentStudent);
    setupLogoutButton();
    await loadStudentData(currentStudent);
});

async function checkAuth() {
    try {
        // Получаем пользователя из глобальной переменной
        const user = window.getCurrentUser ? window.getCurrentUser() : null;
        
        if (!user) {
            // Если пользователь не в памяти, перенаправляем на страницу входа
            window.location.href = 'index.html';
            return null;
        }
        
        if (user.role !== 'student') {
            alert('Эта страница только для учеников');
            window.location.href = 'dashboard-teacher.html';
            return null;
        }
        
        console.log('👤 Авторизованный ученик:', user);
        currentStudent = user;
        return user;
        
    } catch (e) {
        console.error('Ошибка проверки авторизации:', e);
        window.location.href = 'index.html';
        return null;
    }
}

function updateUserInfo(user) {
    // Обновляем приветствие
    const welcomeTitle = document.getElementById('welcomeTitle');
    const userNameEl = document.getElementById('userName');
    const userClassEl = document.getElementById('userClass');
    
    if (welcomeTitle && user.full_name) {
        welcomeTitle.textContent = `Добро пожаловать, ${user.full_name}!`;
    }
    
    if (userNameEl) {
        userNameEl.textContent = user.full_name || user.email;
    }
    
    if (userClassEl && user.class_name) {
        userClassEl.textContent = `Класс: ${user.class_name}`;
    }
}

function setupLogoutButton() {
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            window.logout();
        });
    }
}

async function loadStudentData(user) {
    try {
        await Promise.all([
            loadAssignments(user),
            loadResults(user)
        ]);
    } catch (error) {
        console.error('Ошибка загрузки данных:', error);
        showNotification('Не удалось загрузить данные. Попробуйте обновить страницу.', 'error');
    }
}

async function loadAssignments(user) {
    const container = document.getElementById('assignmentsList');
    
    try {
        // Убираем индикатор загрузки
        container.classList.remove('loading');
        
        // Получаем назначенные задания
        const { data: assignments, error } = await window.supabase
            .from('assignments')
            .select(`
                id,
                assigned_at,
                homeworks (
                    id,
                    title,
                    subject,
                    description,
                    task_url,
                    created_at,
                    teacher_id,
                    users!homeworks_teacher_id_fkey(full_name)
                )
            `)
            .eq('student_id', user.id)
            .eq('homeworks.is_active', true)
            .order('homeworks(created_at)', { ascending: false });
        
        if (error) {
            console.error('Ошибка загрузки заданий:', error);
            throw error;
        }
        
        console.log('📚 Загружено заданий:', assignments?.length || 0);
        
        // Очищаем контейнер
        container.innerHTML = '';
        
        if (!assignments || assignments.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">📭</div>
                    <p>Нет заданий</p>
                    <small>Учитель еще не назначил вам заданий</small>
                </div>
            `;
            return;
        }
        
        // Создаем контейнер для заданий (стопкой)
        assignments.forEach(assignment => {
            const assignmentCard = createAssignmentCard(assignment);
            container.appendChild(assignmentCard);
        });
        
    } catch (error) {
        console.error('Ошибка отображения заданий:', error);
        container.innerHTML = `
            <div class="error-state">
                <div class="error-icon">⚠️</div>
                <p>Ошибка загрузки заданий</p>
                <button class="btn-retry" onclick="location.reload()">
                    <span class="btn-icon">🔄</span>
                    Попробовать снова
                </button>
            </div>
        `;
    }
}

function createAssignmentCard(assignment) {
    const hw = assignment.homeworks;
    if (!hw) return document.createElement('div');
    
    const card = document.createElement('div');
    card.className = 'assignment-card';
    
    const teacherName = hw.users?.full_name || 'Учитель';
    const createdDate = new Date(hw.created_at).toLocaleDateString('ru-RU');
    const assignedDate = new Date(assignment.assigned_at).toLocaleDateString('ru-RU');
    
    card.innerHTML = `
        <div class="assignment-header">
            <div class="assignment-title">
                <h3>${hw.title}</h3>
                <span class="assignment-subject">${hw.subject}</span>
            </div>
        </div>
        
        <div class="assignment-meta">
            <div class="meta-item">
                <span class="meta-icon">👩‍🏫</span>
                <span>Преподаватель: ${teacherName}</span>
            </div>
            <div class="meta-item">
                <span class="meta-icon">📅</span>
                <span>Добавлено: ${createdDate}</span>
            </div>
            <div class="meta-item">
                <span class="meta-icon">📅</span>
                <span>Назначено: ${assignedDate}</span>
            </div>
        </div>
        
        ${hw.description ? `
            <div class="assignment-description">
                <strong>Описание:</strong>
                <p>${hw.description}</p>
            </div>
        ` : ''}
        
        <div class="assignment-actions">
            <a href="${hw.task_url}" target="_blank" class="btn btn-primary" rel="noopener noreferrer">
                <span class="btn-icon">🔗</span>
                Открыть задание
            </a>
        </div>
    `;
    
    return card;
}

async function loadResults(user) {
    const container = document.getElementById('resultsList');
    
    try {
        // Убираем индикатор загрузки
        container.classList.remove('loading');
        
        const { data: results, error } = await window.supabase
            .from('test_results')
            .select('*')
            .eq('student_id', user.id)
            .order('created_at', { ascending: false })
            .limit(10);
        
        if (error) throw error;
        
        console.log('📊 Загружено оценок:', results?.length || 0);
        
        container.innerHTML = '';
        
        if (!results || results.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">📊</div>
                    <p>Нет оценок</p>
                    <small>Здесь появятся ваши оценки после тестов</small>
                </div>
            `;
            return;
        }
        
        // Создаем контейнер для результатов (стопкой)
        results.forEach(result => {
            const resultCard = createResultCard(result);
            container.appendChild(resultCard);
        });
        
    } catch (error) {
        console.error('Ошибка загрузки оценок:', error);
        container.innerHTML = `
            <div class="error-state">
                <div class="error-icon">⚠️</div>
                <p>Ошибка загрузки оценок</p>
                <button class="btn-retry" onclick="location.reload()">
                    <span class="btn-icon">🔄</span>
                    Попробовать снова
                </button>
            </div>
        `;
    }
}

function createResultCard(result) {
    const card = document.createElement('div');
    card.className = 'result-card';
    
    const percentage = Math.round((result.score / result.max_score) * 100);
    const date = new Date(result.created_at).toLocaleDateString('ru-RU');
    
    // Определяем цвет по проценту
    let color = '#2563eb';
    let grade = '';
    
    if (percentage >= 90) {
        color = '#27ae60';
        grade = 'Отлично';
    } else if (percentage >= 75) {
        color = '#2ecc71';
        grade = 'Хорошо';
    } else if (percentage >= 60) {
        color = '#f39c12';
        grade = 'Удовлетворительно';
    } else {
        color = '#e74c3c';
        grade = 'Неудовлетворительно';
    }
    
    card.innerHTML = `
        <div class="result-header">
            <div class="result-title">
                <h3>${result.test_name}</h3>
                <span class="result-subject">${result.subject}</span>
            </div>
            <div class="result-date">${date}</div>
        </div>
        
        <div class="result-content">
            <div class="result-score" style="color: ${color}">
                <div class="score-value">
                    <span class="primary-score">${result.score}</span>
                    <span class="score-separator">из</span>
                    <span class="max-score">${result.max_score}</span>
                </div>
                <div class="score-percentage">(${percentage}%)</div>
                <div class="score-grade">${grade}</div>
            </div>
        </div>
    `;
    
    return card;
}

function showNotification(message, type = 'info') {
    if (window.showNotification) {
        window.showNotification(message, type === 'error' ? 'error' : 'success');
    } else {
        alert(message);
    }
}