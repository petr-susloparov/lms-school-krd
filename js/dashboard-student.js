document.addEventListener('DOMContentLoaded', async function() {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) return;
    
    // Заполняем информацию об ученике
    document.getElementById('studentClass').textContent = user.class || 'Не указан';
    
    // Загружаем домашние задания
    await loadHomeworks();
    
    // Загружаем результаты тестов
    await loadTestResults();
    
    // Загружаем дедлайны
    await loadDeadlines();
    
    async function loadHomeworks() {
        const { data, error } = await supabase
            .from('homeworks')
            .select(`
                id,
                title,
                subject,
                due_date,
                file_url,
                description,
                users!homeworks_teacher_id_fkey(full_name)
            `)
            .order('due_date', { ascending: false })
            .limit(5);
        
        if (error) {
            console.error('Ошибка загрузки ДЗ:', error);
            return;
        }
        
        const container = document.getElementById('homeworksList');
        container.innerHTML = '';
        
        data.forEach(hw => {
            const dueDate = new Date(hw.due_date);
            const isLate = dueDate < new Date();
            
            const homeworkItem = document.createElement('div');
            homeworkItem.className = `homework-item ${isLate ? 'late' : ''}`;
            
            homeworkItem.innerHTML = `
                <h4>${hw.title}</h4>
                <p><strong>Предмет:</strong> ${hw.subject}</p>
                <p><strong>Срок сдачи:</strong> ${dueDate.toLocaleDateString('ru-RU')}</p>
                <p><strong>Учитель:</strong> ${hw.users.full_name}</p>
                ${hw.description ? `<p>${hw.description}</p>` : ''}
                ${hw.file_url ? `<a href="${hw.file_url}" class="file-link" target="_blank">Скачать задание</a>` : ''}
            `;
            
            container.appendChild(homeworkItem);
        });
    }
    
    async function loadTestResults() {
        const { data, error } = await supabase
            .from('test_results')
            .select('*')
            .eq('student_id', user.id)
            .order('test_date', { ascending: false })
            .limit(4);
        
        if (error) {
            console.error('Ошибка загрузки результатов:', error);
            return;
        }
        
        const container = document.getElementById('testResults');
        if (!data.length) return;
        
        let html = '<div class="stats-grid">';
        data.forEach(result => {
            const percentage = Math.round((result.score / result.max_score) * 100);
            const colorClass = percentage >= 80 ? 'stat-value' : 
                              percentage >= 60 ? 'stat-value' : 'stat-value';
            
            html += `
                <div class="stat-box">
                    <div class="${colorClass}">${result.score}/${result.max_score}</div>
                    <div>${result.subject}</div>
                    <small>${result.test_name}</small>
                </div>
            `;
        });
        html += '</div>';
        
        container.innerHTML = html;
    }
    
    async function loadDeadlines() {
        const { data, error } = await supabase
            .from('homeworks')
            .select('title, subject, due_date')
            .order('due_date', { ascending: true })
            .limit(5);
        
        if (error) return;
        
        const tbody = document.getElementById('deadlinesTable');
        tbody.innerHTML = '';
        
        data.forEach(hw => {
            const dueDate = new Date(hw.due_date);
            const daysLeft = Math.ceil((dueDate - new Date()) / (1000 * 60 * 60 * 24));
            
            let status = '';
            let statusClass = '';
            
            if (daysLeft < 0) {
                status = 'Просрочено';
                statusClass = 'style="color: #e74c3c;"';
            } else if (daysLeft === 0) {
                status = 'Сегодня';
                statusClass = 'style="color: #f39c12;"';
            } else if (daysLeft <= 3) {
                status = `Через ${daysLeft} дня`;
                statusClass = 'style="color: #f39c12;"';
            } else {
                status = `Через ${daysLeft} дней`;
            }
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td style="padding: 12px; border-bottom: 1px solid #eee;">${hw.subject}</td>
                <td style="padding: 12px; border-bottom: 1px solid #eee;">${hw.title}</td>
                <td style="padding: 12px; border-bottom: 1px solid #eee;">${dueDate.toLocaleDateString('ru-RU')}</td>
                <td style="padding: 12px; border-bottom: 1px solid #eee;" ${statusClass}>${status}</td>
            `;
            tbody.appendChild(row);
        });
    }
});