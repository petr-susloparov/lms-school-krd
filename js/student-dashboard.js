document.addEventListener('DOMContentLoaded', async function() {
    const user = await checkAuthorization();
    if (!user) return;
    
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
        window.location.href = 'dashboard-teacher.html';
        return null;
    }
    
    return user;
}

function setupLogoutButton() {
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            localStorage.removeItem('user');
            window.location.href = 'index.html';
        });
    }
}

async function loadStudentData(user) {
    try {
        await loadMyAssignments(user);
        await loadMyResults(user);
    } catch (error) {
        console.error('Ошибка загрузки данных:', error);
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
            .order('is_completed', { ascending: true });
        
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
            } else {
                statusText = `До ${dueDate.toLocaleDateString('ru-RU')}`;
                statusColor = 'status-pending';
            }
            
            const assignmentItem = document.createElement('div');
            assignmentItem.className = `assignment-item ${statusClass}`;
            assignmentItem.innerHTML = `
                <div class="assignment-title">${hw.title}</div>
                <div class="assignment-meta">
                    <span class="assignment-subject">${hw.subject}</span>
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
                ` : ''}
            `;
            
            assignmentsList.appendChild(assignmentItem);
        });
        
        container.appendChild(assignmentsList);
        
    } catch (error) {
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
            .order('test_date', { ascending: false });
        
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
            const primaryPercentage = Math.round((result.primary_score / result.primary_max_score) * 100);
            let color = '#2563eb';
            
            if (primaryPercentage >= 80) color = '#27ae60';
            else if (primaryPercentage >= 60) color = '#f39c12';
            else color = '#e74c3c';
            
            const resultCard = document.createElement('div');
            resultCard.className = 'result-card';
            resultCard.innerHTML = `
                <div class="result-score" style="color: ${color};">
                    ${result.primary_score}/${result.primary_max_score}
                    ${result.secondary_score ? ` + ${result.secondary_score}/${result.secondary_max_score}` : ''}
                </div>
                <div class="result-subject">${result.subject}</div>
                <div class="result-name">${result.test_name}</div>
                <div class="result-date">${new Date(result.test_date).toLocaleDateString('ru-RU')}</div>
            `;
            
            resultsGrid.appendChild(resultCard);
        });
        
        container.appendChild(resultsGrid);
        
    } catch (error) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">⚠️</div>
                <p>Не удалось загрузить результаты</p>
            </div>
        `;
    }
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
        
        alert('Задание отмечено как выполненное!');
        
        const user = JSON.parse(localStorage.getItem('user'));
        if (user) {
            await loadMyAssignments(user);
        }
        
    } catch (error) {
        console.error('Ошибка:', error);
        alert('Ошибка при обновлении задания');
    }
};