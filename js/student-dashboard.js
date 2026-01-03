// STUDENT DASHBOARD LOGIC
let currentStudent = null;

document.addEventListener('DOMContentLoaded', async function() {
    console.log('🎓 Кабинет ученика загружен');
    
    currentStudent = await checkAuth();
    if (!currentStudent) return;
    
    updateUserInfo(currentStudent);
    setupLogoutButton();
    await loadStudentData(currentStudent);
});

async function checkAuth() {
    const userJson = localStorage.getItem('user');
    if (!userJson) {
        window.location.href = 'index.html';
        return null;
    }
    
    try {
        const user = JSON.parse(userJson);
        if (user.role !== 'student') {
            alert('Эта страница только для учеников');
            window.location.href = 'dashboard-teacher.html';
            return null;
        }
        
        console.log('👤 Авторизованный ученик:', user);
        return user;
    } catch (e) {
        console.error('Ошибка парсинга данных пользователя:', e);
        localStorage.removeItem('user');
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
    const countEl = document.getElementById('assignmentsCount');
    const activeCountEl = document.getElementById('activeAssignments');
    
    try {
        // Убираем индикатор загрузки
        container.classList.remove('loading');
        
        // Получаем назначенные задания
        const { data: assignments, error } = await window.supabase
            .from('assignments')
            .select(`
                id,
                is_completed,
                completed_at,
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
            .order('is_completed', { ascending: true })
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
            if (countEl) countEl.textContent = '0';
            if (activeCountEl) activeCountEl.textContent = '0';
            return;
        }
        
        // Подсчитываем статистику
        const totalAssignments = assignments.length;
        const completedAssignments = assignments.filter(a => a.is_completed).length;
        const pendingAssignments = totalAssignments - completedAssignments;
        
        // Обновляем счетчики
        if (countEl) countEl.textContent = totalAssignments;
        if (activeCountEl) activeCountEl.textContent = pendingAssignments;
        
        // Создаем контейнер для заданий
        const assignmentsContainer = document.createElement('div');
        assignmentsContainer.className = 'assignments-container';
        
        // Невыполненные задания
        const pendingAssignmentsList = assignments.filter(a => !a.is_completed);
        if (pendingAssignmentsList.length > 0) {
            const pendingHeader = document.createElement('div');
            pendingHeader.className = 'section-header';
            pendingHeader.innerHTML = `<h3>Ожидают выполнения (${pendingAssignmentsList.length})</h3>`;
            assignmentsContainer.appendChild(pendingHeader);
            
            pendingAssignmentsList.forEach(assignment => {
                assignmentsContainer.appendChild(createAssignmentCard(assignment, false));
            });
        }
        
        // Выполненные задания
        const completedAssignmentsList = assignments.filter(a => a.is_completed);
        if (completedAssignmentsList.length > 0) {
            const completedHeader = document.createElement('div');
            completedHeader.className = 'section-header';
            completedHeader.innerHTML = `<h3>Выполненные (${completedAssignmentsList.length})</h3>`;
            assignmentsContainer.appendChild(completedHeader);
            
            completedAssignmentsList.forEach(assignment => {
                assignmentsContainer.appendChild(createAssignmentCard(assignment, true));
            });
        }
        
        container.appendChild(assignmentsContainer);
        
    } catch (error) {
        console.error('Ошибка отображения заданий:', error);
        container.innerHTML = `
            <div class="error-state">
                <div class="error-icon">⚠️</div>
                <p>Ошибка загрузки заданий</p>
                <button class="btn-retry" onclick="refreshData()">
                    <span class="btn-icon">🔄</span>
                    Попробовать снова
                </button>
            </div>
        `;
    }
}

function createAssignmentCard(assignment, isCompleted) {
    const hw = assignment.homeworks;
    if (!hw) return document.createElement('div');
    
    const card = document.createElement('div');
    card.className = `assignment-card ${isCompleted ? 'completed' : 'pending'}`;
    card.dataset.completed = isCompleted;
    
    const teacherName = hw.users?.full_name || 'Учитель';
    const createdDate = new Date(hw.created_at).toLocaleDateString('ru-RU');
    const completedDate = assignment.completed_at ? 
        new Date(assignment.completed_at).toLocaleDateString('ru-RU') : '';
    
    card.innerHTML = `
        <div class="assignment-header">
            <div class="assignment-title">
                <h4>${hw.title}</h4>
                <span class="assignment-subject">${hw.subject}</span>
            </div>
            <div class="assignment-status ${isCompleted ? 'completed' : 'pending'}">
                ${isCompleted ? '✅ Выполнено' : '⏳ Ожидает'}
            </div>
        </div>
        
        <div class="assignment-meta">
            <div class="meta-item">
                <span class="meta-icon">👩‍🏫</span>
                <span>${teacherName}</span>
            </div>
            <div class="meta-item">
                <span class="meta-icon">📅</span>
                <span>Добавлено: ${createdDate}</span>
            </div>
            ${isCompleted && completedDate ? `
                <div class="meta-item">
                    <span class="meta-icon">✅</span>
                    <span>Выполнено: ${completedDate}</span>
                </div>
            ` : ''}
        </div>
        
        ${hw.description ? `
            <div class="assignment-description">
                ${hw.description}
            </div>
        ` : ''}
        
        <div class="assignment-actions">
            <a href="${hw.task_url}" target="_blank" class="btn btn-primary" rel="noopener noreferrer">
                <span class="btn-icon">🔗</span>
                Открыть задание
            </a>
            
            ${!isCompleted ? `
                <button class="btn btn-success" onclick="completeAssignment(${assignment.id})">
                    <span class="btn-icon">✅</span>
                    Отметить выполненным
                </button>
            ` : `
                <button class="btn btn-outline" onclick="uncompleteAssignment(${assignment.id})">
                    <span class="btn-icon">↩️</span>
                    Вернуть в работу
                </button>
            `}
        </div>
    `;
    
    return card;
}

async function loadResults(user) {
    const container = document.getElementById('resultsList');
    const countEl = document.getElementById('resultsCount');
    
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
            if (countEl) countEl.textContent = '0';
            return;
        }
        
        // Обновляем счетчик
        if (countEl) {
            countEl.textContent = results.length;
        }
        
        // Группируем по предметам
        const resultsBySubject = {};
        results.forEach(result => {
            if (!resultsBySubject[result.subject]) {
                resultsBySubject[result.subject] = [];
            }
            resultsBySubject[result.subject].push(result);
        });
        
        // Создаем контейнер для результатов
        const resultsContainer = document.createElement('div');
        resultsContainer.className = 'results-container';
        
        Object.entries(resultsBySubject).forEach(([subject, subjectResults]) => {
            const subjectCard = createSubjectCard(subject, subjectResults);
            resultsContainer.appendChild(subjectCard);
        });
        
        container.appendChild(resultsContainer);
        
    } catch (error) {
        console.error('Ошибка загрузки оценок:', error);
        container.innerHTML = `
            <div class="error-state">
                <div class="error-icon">⚠️</div>
                <p>Ошибка загрузки оценок</p>
                <button class="btn-retry" onclick="refreshData()">
                    <span class="btn-icon">🔄</span>
                    Попробовать снова
                </button>
            </div>
        `;
    }
}

function createSubjectCard(subject, results) {
    const card = document.createElement('div');
    card.className = 'subject-card';
    
    // Вычисляем средний балл
    const avgScore = results.reduce((sum, r) => sum + r.score, 0) / results.length;
    const avgPercentage = Math.round((avgScore / 100) * 100);
    
    // Определяем цвет по среднему баллу
    let avgColor = '#2563eb';
    let avgLabel = 'Хорошо';
    
    if (avgPercentage >= 90) {
        avgColor = '#27ae60';
        avgLabel = 'Отлично';
    } else if (avgPercentage >= 75) {
        avgColor = '#2ecc71';
        avgLabel = 'Хорошо';
    } else if (avgPercentage >= 60) {
        avgColor = '#f39c12';
        avgLabel = 'Удовлетворительно';
    } else {
        avgColor = '#e74c3c';
        avgLabel = 'Неудовлетворительно';
    }
    
    card.innerHTML = `
        <div class="subject-header">
            <h3>${subject}</h3>
            <div class="subject-average" style="color: ${avgColor}">
                Средний балл: ${avgScore.toFixed(1)}/100
                <span class="average-label">(${avgLabel})</span>
            </div>
        </div>
        
        <div class="results-list">
            ${results.map(result => {
                const percentage = Math.round((result.score / result.max_score) * 100);
                let color = '#2563eb';
                let label = '';
                
                if (percentage >= 90) {
                    color = '#27ae60';
                    label = 'Отлично';
                } else if (percentage >= 75) {
                    color = '#2ecc71';
                    label = 'Хорошо';
                } else if (percentage >= 60) {
                    color = '#f39c12';
                    label = 'Удовл.';
                } else {
                    color = '#e74c3c';
                    label = 'Неуд.';
                }
                
                const date = new Date(result.created_at).toLocaleDateString('ru-RU');
                
                return `
                    <div class="result-item">
                        <div class="result-info">
                            <div class="result-name">${result.test_name}</div>
                            <div class="result-date">${date}</div>
                        </div>
                        <div class="result-score" style="color: ${color}">
                            <strong>${result.score}/${result.max_score}</strong>
                            <span class="result-percentage">(${percentage}%)</span>
                            <span class="result-label">${label}</span>
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
    `;
    
    return card;
}

// ========================
// ГЛОБАЛЬНЫЕ ФУНКЦИИ
// ========================

window.completeAssignment = async function(assignmentId) {
    if (!confirm('Отметить задание как выполненное?')) return;
    
    try {
        const { error } = await window.supabase
            .from('assignments')
            .update({ 
                is_completed: true,
                completed_at: new Date().toISOString()
            })
            .eq('id', assignmentId);
        
        if (error) throw error;
        
        showNotification('✅ Задание отмечено как выполненное!', 'success');
        
        // Обновляем данные
        if (currentStudent) {
            await loadAssignments(currentStudent);
        }
        
    } catch (error) {
        console.error('Ошибка обновления задания:', error);
        showNotification('❌ Ошибка при обновлении задания', 'error');
    }
};

window.uncompleteAssignment = async function(assignmentId) {
    if (!confirm('Вернуть задание в работу?')) return;
    
    try {
        const { error } = await window.supabase
            .from('assignments')
            .update({ 
                is_completed: false,
                completed_at: null
            })
            .eq('id', assignmentId);
        
        if (error) throw error;
        
        showNotification('📝 Задание возвращено в работу', 'success');
        
        // Обновляем данные
        if (currentStudent) {
            await loadAssignments(currentStudent);
        }
        
    } catch (error) {
        console.error('Ошибка обновления задания:', error);
        showNotification('❌ Ошибка при обновлении задания', 'error');
    }
};

window.refreshData = async function() {
    if (currentStudent) {
        await loadAssignments(currentStudent);
        await loadResults(currentStudent);
        showNotification('🔄 Данные обновлены', 'success');
    }
};

window.showAllAssignments = function() {
    const cards = document.querySelectorAll('.assignment-card');
    cards.forEach(card => card.style.display = 'block');
    showNotification('Показаны все задания', 'info');
};

window.openCompleted = function() {
    const allCards = document.querySelectorAll('.assignment-card');
    const completedCards = document.querySelectorAll('.assignment-card[data-completed="true"]');
    
    if (completedCards.length === 0) {
        showNotification('Нет выполненных заданий', 'info');
        return;
    }
    
    allCards.forEach(card => card.style.display = 'none');
    completedCards.forEach(card => card.style.display = 'block');
    
    showNotification('Показаны только выполненные задания', 'info');
    
    // Через 5 секунд показываем все снова
    setTimeout(() => {
        allCards.forEach(card => card.style.display = 'block');
    }, 5000);
};

window.openPending = function() {
    const allCards = document.querySelectorAll('.assignment-card');
    const pendingCards = document.querySelectorAll('.assignment-card[data-completed="false"]');
    
    if (pendingCards.length === 0) {
        showNotification('Нет активных заданий', 'info');
        return;
    }
    
    allCards.forEach(card => card.style.display = 'none');
    pendingCards.forEach(card => card.style.display = 'block');
    
    showNotification('Показаны только активные задания', 'info');
    
    // Через 5 секунд показываем все снова
    setTimeout(() => {
        allCards.forEach(card => card.style.display = 'block');
    }, 5000);
};

function showNotification(message, type = 'info') {
    if (window.showNotification) {
        window.showNotification(message, type === 'error' ? 'error' : 'success');
    } else {
        alert(message);
    }
}