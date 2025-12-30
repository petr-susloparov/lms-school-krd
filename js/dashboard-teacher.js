document.addEventListener('DOMContentLoaded', async function() {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user || user.role !== 'teacher') {
        window.location.href = 'index.html';
        return;
    }
    
    // Инициализация вкладок
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const tabId = this.dataset.tab;
            
            // Обновляем активные элементы
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            
            this.classList.add('active');
            document.getElementById(tabId).classList.add('active');
            
            // Загружаем данные для активной вкладки
            if (tabId === 'my-homeworks') {
                loadTeacherHomeworks();
            } else if (tabId === 'add-test') {
                loadStudentsList();
            }
        });
    });
    
    // Форма добавления ДЗ
    const homeworkForm = document.getElementById('addHomeworkForm');
    if (homeworkForm) {
        homeworkForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const homeworkData = {
                title: document.getElementById('title').value,
                subject: document.getElementById('subject').value,
                due_date: document.getElementById('dueDate').value,
                description: document.getElementById('description').value,
                file_url: document.getElementById('fileUrl').value || null,
                teacher_id: user.id,
                created_at: new Date().toISOString()
            };
            
            try {
                const { error } = await supabase
                    .from('homeworks')
                    .insert([homeworkData]);
                
                if (error) throw error;
                
                alert('Домашнее задание успешно добавлено!');
                homeworkForm.reset();
                
            } catch (err) {
                console.error('Ошибка добавления ДЗ:', err);
                alert('Ошибка при добавлении задания');
            }
        });
    }
    
    // Форма добавления результатов теста
    const testForm = document.getElementById('addTestForm');
    if (testForm) {
        testForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const testData = {
                student_id: parseInt(document.getElementById('studentSelect').value),
                subject: document.getElementById('testSubject').value,
                test_name: document.getElementById('testName').value,
                score: parseInt(document.getElementById('score').value),
                max_score: parseInt(document.getElementById('maxScore').value),
                test_date: new Date().toISOString()
            };
            
            try {
                const { error } = await supabase
                    .from('test_results')
                    .insert([testData]);
                
                if (error) throw error;
                
                alert('Результат теста успешно сохранен!');
                testForm.reset();
                
            } catch (err) {
                console.error('Ошибка сохранения результата:', err);
                alert('Ошибка при сохранении результата');
            }
        });
    }
    
    // Загрузка списка учеников для выбора
    async function loadStudentsList() {
        const { data, error } = await supabase
            .from('users')
            .select('id, full_name, class')
            .eq('role', 'student')
            .order('class');
        
        if (error) return;
        
        const select = document.getElementById('studentSelect');
        select.innerHTML = '<option value="">Выберите ученика...</option>';
        
        data.forEach(student => {
            const option = document.createElement('option');
            option.value = student.id;
            option.textContent = `${student.full_name} (${student.class})`;
            select.appendChild(option);
        });
    }
    
    // Загрузка ДЗ учителя
    async function loadTeacherHomeworks() {
        const { data, error } = await supabase
            .from('homeworks')
            .select('*')
            .eq('teacher_id', user.id)
            .order('created_at', { ascending: false });
        
        if (error) {
            console.error('Ошибка загрузки ДЗ:', error);
            return;
        }
        
        const container = document.getElementById('homeworksList');
        container.innerHTML = '';
        
        if (!data.length) {
            container.innerHTML = '<p>У вас пока нет домашних заданий</p>';
            return;
        }
        
        data.forEach(hw => {
            const homeworkCard = document.createElement('div');
            homeworkCard.className = 'homework-card';
            
            const dueDate = new Date(hw.due_date).toLocaleDateString('ru-RU');
            
            homeworkCard.innerHTML = `
                <div>
                    <h4 style="margin: 0 0 5px 0;">${hw.title}</h4>
                    <p style="margin: 0; color: #666;">
                        ${hw.subject} | Срок: ${dueDate} | 
                        ${hw.file_url ? '📎 С файлом' : '📝 Текст'}
                    </p>
                </div>
                <div>
                    <button class="btn btn-danger" onclick="deleteHomework(${hw.id})">Удалить</button>
                </div>
            `;
            
            container.appendChild(homeworkCard);
        });
    }
    
    // Глобальная функция удаления ДЗ
    window.deleteHomework = async function(homeworkId) {
        if (!confirm('Удалить это задание?')) return;
        
        try {
            const { error } = await supabase
                .from('homeworks')
                .delete()
                .eq('id', homeworkId);
            
            if (error) throw error;
            
            alert('Задание удалено');
            loadTeacherHomeworks();
            
        } catch (err) {
            console.error('Ошибка удаления:', err);
            alert('Ошибка при удалении задания');
        }
    };
    
    // Загружаем начальные данные
    loadStudentsList();
});