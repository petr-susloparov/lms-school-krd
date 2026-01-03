document.addEventListener('DOMContentLoaded', async function() {
    console.log('🎓 Загружен личный кабинет ученика');
    
    const user = await checkAuthorization();
    if (!user) return;
    
    await loadStudentData(user);
});

async function checkAuthorization() {
    const userJson = localStorage.getItem('user');
    if (!userJson) {
        alert('Доступ запрещен. Пожалуйста, войдите в систему.');
        window.location.href = 'index.html';
        return null;
    }
    
    try {
        const user = JSON.parse(userJson);
        
        if (user.role !== 'student') {
            alert('Эта страница доступна только для учеников.');
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

async function loadStudentData(user) {
    try {
        // Сначала загружаем результаты, потом задания (как в HTML)
        await Promise.all([
            loadMyResults(user),
            loadMyAssignments(user)
        ]);
    } catch (error) {
        console.error('Ошибка загрузки данных:', error);
        showNotification('Не удалось загрузить данные', 'error');
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
                assigned_at,
                homeworks (
                    id,
                    title,
                    subject,
                    description,
                    file_url,
                    created_at
                )
            `)
            .eq('student_id', user.id)
            .order('is_completed', { ascending: true })
            .order('homeworks(created_at)', { ascending: false });
        
        if (error) throw error;
        
        container.innerHTML = '';
        
        if (!assignments || assignments.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">📭</div>
                    <p>У вас пока нет назначенных заданий</p>
                </div>
            `;
            return;
        }
        
        const assignmentsList = document.createElement('div');
        assignmentsList.className = 'assignments-list';
        
        assignments.forEach(assignment => {
            const hw = assignment.homeworks;
            const createdDate = new Date(hw.created_at);
            
            const assignmentItem = document.createElement('div');
            assignmentItem.className = `assignment-item ${assignment.is_completed ? 'completed' : ''}`;
            assignmentItem.innerHTML = `
                <div class="assignment-title">${hw.title}</div>
                <div class="assignment-meta">
                    <span class="assignment-subject">${hw.subject}</span>
                    <span class="assignment-date">Создано: ${createdDate.toLocaleDateString('ru-RU')}</span>
                    <span class="status-badge ${assignment.is_completed ? 'completed' : 'pending'}">
                        ${assignment.is_completed ? 'Выполнено' : 'В работе'}
                    </span>
                </div>
                ${hw.description ? `<p class="assignment-description">${hw.description}</p>` : ''}
                ${hw.file_url ? `
                    <a href="${hw.file_url}" class="file-link" target="_blank" rel="noopener">
                        📎 Скачать задание
                    </a>
                ` : ''}
                
                ${!assignment.is_completed ? `
                    <button onclick="markAsCompleted('${assignment.id}')" 
                            class="complete-btn">
                        ✅ Отметить как выполненное
                    </button>
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
                    <p>Результаты тестов пока отсутствуют</p>
                </div>
            `;
            return;
        }
        
        const resultsGrid = document.createElement('div');
        resultsGrid.className = 'results-grid';
        
        results.forEach(result => {
            const primaryPercent = Math.round((result.primary_score / result.primary_max_score) * 100);
            
            let color = '#2563eb';
            if (primaryPercent >= 80) color = '#27ae60';
            else if (primaryPercent >= 60) color = '#f39c12';
            else color = '#e74c3c';
            
            const resultCard = document.createElement('div');
            resultCard.className = 'result-card';
            resultCard.innerHTML = `
                <div class="result-score" style="color: ${color};">
                    ${result.primary_score}/${result.primary_max_score}
                </div>
                ${result.secondary_score ? `
                    <div class="secondary-score">
                        (${result.secondary_score}/${result.secondary_max_score})
                    </div>
                ` : ''}
                <div class="result-subject">${result.subject}</div>
                <div class="result-name">${result.test_name}</div>
                <div class="result-date">${new Date(result.test_date).toLocaleDateString('ru-RU')}</div>
            `;
            
            resultsGrid.appendChild(resultCard);
        });
        
        container.appendChild(resultsGrid);
        
    } catch (error) {
        console.error('Ошибка загрузки результатов:', error);
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">⚠️</div>
                <p>Не удалось загрузить результаты</p>
            </div>
        `;
    }
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 12px 20px;
        border-radius: 8px;
        background: ${type === 'error' ? '#e74c3c' : '#27ae60'};
        color: white;
        z-index: 1000;
        animation: slideIn 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

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
        
        showNotification('Задание отмечено как выполненное!', 'success');
        
        const user = JSON.parse(localStorage.getItem('user'));
        if (user) {
            await loadMyAssignments(user);
        }
        
    } catch (error) {
        console.error('Ошибка:', error);
        showNotification('Ошибка при обновлении задания', 'error');
    }
};