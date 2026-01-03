// ========================
// STUDENT DASHBOARD LOGIC
// ========================

document.addEventListener('DOMContentLoaded', async function() {
    console.log('Загружен личный кабинет ученика');
    
    const user = await checkAuthorization();
    if (!user) return;
    
    setupUserInfo(user);
    setupLogoutButton();
    await loadStudentData(user);
});

async function checkAuthorization() {
    const userJson = localStorage.getItem('user');
    if (!userJson) {
        alert('Доступ запрещен. Пожалуйста, войдите в систему.');
        window.location.href = 'index.html';
        return null;
    }
    
    let user;
    try {
        user = JSON.parse(userJson);
    } catch (e) {
        localStorage.removeItem('user');
        window.location.href = 'index.html';
        return null;
    }
    
    if (user.role !== 'student') {
        alert('Эта страница доступна только для учеников.');
        window.location.href = 'dashboard-teacher.html';
        return null;
    }
    
    return user;
}

function setupUserInfo(user) {
    const userEmailEl = document.getElementById('userEmail');
    if (userEmailEl) {
        userEmailEl.textContent = user.email;
    }
}

function setupLogoutButton() {
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            if (confirm('Вы уверены, что хотите выйти?')) {
                localStorage.removeItem('user');
                window.location.href = 'index.html';
            }
        });
    }
}

async function loadStudentData(user) {
    try {
        await loadMyAssignments(user);
        await loadMyResults(user);
    } catch (error) {
        console.error('Ошибка загрузки данных:', error);
        showError('Не удалось загрузить данные');
    }
}

async function loadMyAssignments(user) {
    const container = document.getElementById('myAssignments');
    
    try {
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
                    file_url,
                    due_date
                )
            `)
            .eq('student_id', user.id)
            .order('is_completed', { ascending: true })
            .order('homeworks(due_date)', { ascending: true });
        
        if (error) throw error;
        
        container.innerHTML = '';
        
        if (!assignments || assignments.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">📭</div>
                    <h3>Нет заданий</h3>
                    <p>У вас пока нет назначенных заданий</p>
                </div>
            `;
            return;
        }
        
        const assignmentsList = document.createElement('div');
        assignmentsList.className = 'assignments-list';
        
        assignments.forEach(assignment => {
            const hw = assignment.homeworks;
            const dueDate = new Date(hw.due_date);
            const today = new Date();
            const daysDiff = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
            
            let statusClass = assignment.is_completed ? 'completed' : 
                            daysDiff < 0 ? 'late' : '';
            
            let statusText = '';
            let statusColor = '';
            
            if (assignment.is_completed) {
                statusText = 'Выполнено';
                statusColor = 'status-completed';
            } else if (daysDiff < 0) {
                statusText = 'Просрочено';
                statusColor = 'status-late';
            } else if (daysDiff === 0) {
                statusText = 'Сдать сегодня';
                statusColor = 'status-pending';
            } else if (daysDiff <= 3) {
                statusText = `Осталось ${daysDiff} дня`;
                statusColor = 'status-pending';
            } else {
                statusText = `Осталось ${daysDiff} дней`;
                statusColor = 'status-pending';
            }
            
            const assignmentItem = document.createElement('div');
            assignmentItem.className = `assignment-item ${statusClass}`;
            assignmentItem.innerHTML = `
                <div class="assignment-title">${hw.title}</div>
                <div class="assignment-meta">
                    <span class="assignment-subject">${hw.subject}</span>
                    <span class="assignment-due">📅 Срок: ${dueDate.toLocaleDateString('ru-RU')}</span>
                    <span class="status-badge ${statusColor}">${statusText}</span>
                </div>
                ${hw.description ? `<p style="margin: 10px 0; color: #555;">${hw.description}</p>` : ''}
                ${hw.file_url ? `
                    <a href="${hw.file_url}" class="file-link" target="_blank" rel="noopener">
                        📎 Скачать задание
                    </a>
                ` : ''}
                
                ${!assignment.is_completed ? `
                    <button onclick="markAsCompleted(${assignment.id})" class="complete-btn">
                        ✅ Отметить как выполненное
                    </button>
                ` : assignment.completed_at ? `
                    <p style="color: #27ae60; margin-top: 10px; font-size: 14px;">
                        ✅ Выполнено: ${new Date(assignment.completed_at).toLocaleDateString('ru-RU')}
                    </p>
                ` : ''}
            `;
            
            assignmentsList.appendChild(assignmentItem);
        });
        
        container.appendChild(assignmentsList);
        
    } catch (error) {
        console.error('Ошибка загрузки заданий:', error);
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">⚠️</div>
                <h3>Ошибка загрузки</h3>
                <p>Не удалось загрузить задания</p>
            </div>
        `;
    }
}

async function loadMyResults(user) {
    const container = document.getElementById('myResults');
    
    try {
        const { data: results, error } = await window.supabase
            .from('test_results')
            .select('*')
            .eq('student_id', user.id)
            .order('test_date', { ascending: false })
            .limit(6);
        
        if (error) throw error;
        
        container.innerHTML = '';
        
        if (!results || results.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">📊</div>
                    <h3>Нет результатов</h3>
                    <p>Результаты тестов пока отсутствуют</p>
                </div>
            `;
            return;
        }
        
        const resultsGrid = document.createElement('div');
        resultsGrid.className = 'results-grid';
        
        results.forEach(result => {
            const percentage = Math.round((result.total_score / result.total_max_score) * 100);
            let scoreClass = 'score-excellent';
            
            if (percentage >= 80) scoreClass = 'score-excellent';
            else if (percentage >= 60) scoreClass = 'score-good';
            else scoreClass = 'score-poor';
            
            const resultCard = document.createElement('div');
            resultCard.className = 'result-card';
            resultCard.innerHTML = `
                <div class="result-score-main">
                    ${result.total_score}
                    <span class="result-score-primary">/ ${result.total_max_score}</span>
                </div>
                <div class="score-progress">
                    <div class="score-progress-bar ${scoreClass}" style="width: ${percentage}%"></div>
                </div>
                <div class="result-subject">${result.subject}</div>
                <div class="result-name">${result.test_name}</div>
                ${result.secondary_score ? `
                    <div class="result-score-secondary">
                        (${result.primary_score}/${result.primary_max_score} + 
                         ${result.secondary_score}/${result.secondary_max_score})
                    </div>
                ` : ''}
                <div class="result-date">📅 ${new Date(result.test_date).toLocaleDateString('ru-RU')}</div>
            `;
            
            resultsGrid.appendChild(resultCard);
        });
        
        container.appendChild(resultsGrid);
        
    } catch (error) {
        console.error('Ошибка загрузки результатов:', error);
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">⚠️</div>
                <h3>Ошибка загрузки</h3>
                <p>Не удалось загрузить результаты</p>
            </div>
        `;
    }
}

function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.style.cssText = `
        background: #ffeaea;
        color: #e74c3c;
        padding: 15px;
        border-radius: 8px;
        margin: 10px 0;
        text-align: center;
    `;
    errorDiv.textContent = message;
    
    const container = document.querySelector('.container');
    if (container) {
        container.insertBefore(errorDiv, container.firstChild);
        setTimeout(() => errorDiv.remove(), 5000);
    }
}

// Глобальные функции
window.markAsCompleted = async function(assignmentId) {
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
        
        const user = JSON.parse(localStorage.getItem('user'));
        if (user) {
            await loadMyAssignments(user);
        }
        
    } catch (error) {
        console.error('Ошибка:', error);
        alert('Ошибка при обновлении задания');
    }
};