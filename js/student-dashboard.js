// STUDENT DASHBOARD LOGIC
document.addEventListener('DOMContentLoaded', async function() {
    console.log('🎓 Кабинет ученика загружен');
    
    const user = await checkAuth();
    if (!user) return;
    
    updateUserInfo(user);
    setupLogoutButton();
    await loadStudentData(user);
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
            window.location.href = 'dashboard-teacher.html';
            return null;
        }
        return user;
    } catch (e) {
        localStorage.removeItem('user');
        window.location.href = 'index.html';
        return null;
    }
}

function updateUserInfo(user) {
    const userNameEl = document.getElementById('userName');
    const userClassEl = document.getElementById('userClass');
    
    if (userNameEl && user.full_name) {
        userNameEl.textContent = user.full_name;
    }
    
    if (userClassEl && user.class_name) {
        userClassEl.textContent = user.class_name;
    }
}

function setupLogoutButton() {
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', window.logout);
    }
}

async function loadStudentData(user) {
    try {
        await loadAssignments(user);
        await loadResults(user);
    } catch (error) {
        console.error('Ошибка загрузки данных:', error);
        showNotification('Ошибка загрузки данных', 'error');
    }
}

async function loadAssignments(user) {
    const container = document.getElementById('assignmentsList');
    const countEl = document.getElementById('assignmentsCount');
    
    try {
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
        
        if (error) throw error;
        
        container.innerHTML = '';
        
        if (!assignments || assignments.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">📭</div>
                    <p>Нет заданий</p>
                    <small>Задания появятся здесь, когда учитель их назначит</small>
                </div>
            `;
            if (countEl) countEl.textContent = '0';
            return;
        }
        
        // Обновляем счетчик
        if (countEl) {
            countEl.textContent = assignments.length;
        }
        
        // Создаем список заданий
        assignments.forEach(assignment => {
            const hw = assignment.homeworks;
            if (!hw) return;
            
            const assignmentCard = document.createElement('div');
            assignmentCard.className = `assignment-card ${assignment.is_completed ? 'completed' : ''}`;
            
            const teacherName = hw.users?.full_name || 'Учитель';
            const createdDate = new Date(hw.created_at).toLocaleDateString('ru-RU');
            
            assignmentCard.innerHTML = `
                <div class="assignment-header">
                    <div class="assignment-title">${hw.title}</div>
                    <div class="assignment-subject">${hw.subject}</div>
                </div>
                
                <div class="assignment-meta">
                    <div class="meta-item">
                        <span class="meta-label">Преподаватель:</span>
                        <span class="meta-value">${teacherName}</span>
                    </div>
                    <div class="meta-item">
                        <span class="meta-label">Добавлено:</span>
                        <span class="meta-value">${createdDate}</span>
                    </div>
                    <div class="assignment-status ${assignment.is_completed ? 'status-completed' : 'status-pending'}">
                        ${assignment.is_completed ? '✅ Выполнено' : '⏳ Ожидает выполнения'}
                    </div>
                </div>
                
                ${hw.description ? `
                    <div class="assignment-description">
                        ${hw.description}
                    </div>
                ` : ''}
                
                <div class="assignment-actions">
                    <a href="${hw.task_url}" target="_blank" class="btn btn-primary" rel="noopener noreferrer">
                        <span class="btn-icon">📎</span>
                        Открыть задание
                    </a>
                    
                    ${!assignment.is_completed ? `
                        <button class="btn btn-success" onclick="completeAssignment(${assignment.id})">
                            <span class="btn-icon">✅</span>
                            Выполнил
                        </button>
                    ` : ''}
                </div>
            `;
            
            container.appendChild(assignmentCard);
        });
        
    } catch (error) {
        console.error('Ошибка загрузки заданий:', error);
        container.innerHTML = `
            <div class="error-state">
                <div class="error-icon">⚠️</div>
                <p>Ошибка загрузки заданий</p>
                <button class="btn-retry" onclick="refreshData()">Повторить</button>
            </div>
        `;
    }
}

async function loadResults(user) {
    const container = document.getElementById('resultsList');
    const countEl = document.getElementById('resultsCount');
    
    try {
        const { data: results, error } = await window.supabase
            .from('test_results')
            .select('*')
            .eq('student_id', user.id)
            .order('created_at', { ascending: false })
            .limit(8);
        
        if (error) throw error;
        
        container.innerHTML = '';
        
        if (!results || results.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">📊</div>
                    <p>Нет оценок</p>
                    <small>Здесь появятся ваши оценки</small>
                </div>
            `;
            if (countEl) countEl.textContent = '0';
            return;
        }
        
        // Обновляем счетчик
        if (countEl) {
            countEl.textContent = results.length;
        }
        
        // Группируем результаты по предметам
        const resultsBySubject = {};
        results.forEach(result => {
            if (!resultsBySubject[result.subject]) {
                resultsBySubject[result.subject] = [];
            }
            resultsBySubject[result.subject].push(result);
        });
        
        // Создаем карточки по предметам
        Object.entries(resultsBySubject).forEach(([subject, subjectResults]) => {
            const subjectCard = document.createElement('div');
            subjectCard.className = 'subject-card';
            
            // Вычисляем средний балл
            const avgScore = subjectResults.reduce((sum, r) => sum + r.score, 0) / subjectResults.length;
            const avgPercentage = Math.round((avgScore / 100) * 100);
            
            let avgColor = '#2563eb';
            if (avgPercentage >= 80) avgColor = '#27ae60';
            else if (avgPercentage >= 60) avgColor = '#f39c12';
            else avgColor = '#e74c3c';
            
            subjectCard.innerHTML = `
                <div class="subject-header">
                    <h3>${subject}</h3>
                    <div class="subject-avg" style="color: ${avgColor}">
                        Средний: ${avgScore.toFixed(1)}/100
                    </div>
                </div>
                
                <div class="results-list">
                    ${subjectResults.map(result => {
                        const percentage = Math.round((result.score / result.max_score) * 100);
                        let color = '#2563eb';
                        if (percentage >= 80) color = '#27ae60';
                        else if (percentage >= 60) color = '#f39c12';
                        else color = '#e74c3c';
                        
                        const date = new Date(result.created_at).toLocaleDateString('ru-RU');
                        
                        return `
                            <div class="result-item">
                                <div class="result-name">${result.test_name}</div>
                                <div class="result-score" style="color: ${color}">
                                    ${result.score}/${result.max_score}
                                </div>
                                <div class="result-date">${date}</div>
                            </div>
                        `;
                    }).join('')}
                </div>
            `;
            
            container.appendChild(subjectCard);
        });
        
    } catch (error) {
        console.error('Ошибка загрузки результатов:', error);
        container.innerHTML = `
            <div class="error-state">
                <div class="error-icon">⚠️</div>
                <p>Ошибка загрузки оценок</p>
                <button class="btn-retry" onclick="refreshData()">Повторить</button>
            </div>
        `;
    }
}

// Глобальные функции
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
        
        showNotification('Задание отмечено как выполненное!', 'success');
        
        // Обновляем данные
        const user = JSON.parse(localStorage.getItem('user'));
        if (user) {
            await loadAssignments(user);
        }
        
    } catch (error) {
        console.error('Ошибка:', error);
        showNotification('Ошибка при обновлении задания', 'error');
    }
};

window.refreshData = async function() {
    const user = JSON.parse(localStorage.getItem('user'));
    if (user) {
        await loadAssignments(user);
        await loadResults(user);
        showNotification('Данные обновлены', 'success');
    }
};

window.showAllAssignments = function() {
    // В будущем можно добавить страницу со всеми заданиями
    alert('Функция в разработке');
};

window.showAllResults = function() {
    // В будущем можно добавить страницу со всеми оценками
    alert('Функция в разработке');
};

function showNotification(message, type = 'info') {
    if (window.showAlert) {
        window.showAlert(message, type === 'error' ? 'error' : 'success');
    } else {
        alert(message);
    }
}