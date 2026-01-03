document.addEventListener('DOMContentLoaded', async function() {
    console.log('👨‍🏫 Загружена панель учителя');
    
    const user = await checkAuthorization();
    if (!user) return;
    
    setupLogoutButton();
    setupTabs();
    await loadInitialData(user);
    setupForms(user);
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
        
        if (user.role !== 'teacher') {
            alert('Эта страница доступна только для учителей.');
            window.location.href = 'dashboard-student.html';
            return null;
        }
        
        return user;
        
    } catch (e) {
        localStorage.removeItem('user');
        window.location.href = 'index.html';
        return null;
    }
}

function setupLogoutButton() {
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', window.logout);
    }
}

function setupTabs() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    
    tabBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const tabId = this.dataset.tab;
            
            tabBtns.forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            
            this.classList.add('active');
            document.getElementById(tabId).classList.add('active');
        });
    });
}

async function loadInitialData(user) {
    try {
        await Promise.all([
            loadStudentsForHomework(),
            loadStudentsForTest(),
            loadTeacherHomeworks(user)
        ]);
    } catch (error) {
        console.error('Ошибка загрузки данных:', error);
        showMessage('Не удалось загрузить данные', 'error');
    }
}

async function loadStudentsForHomework() {
    const container = document.getElementById('studentsList');
    
    try {
        const { data: students, error } = await window.supabase
            .from('users')
            .select('id, email')
            .eq('role', 'student')
            .order('email');
        
        if (error) throw error;
        
        container.innerHTML = '';
        
        if (!students || students.length === 0) {
            container.innerHTML = '<div class="empty-state">Нет учеников в системе</div>';
            return;
        }
        
        students.forEach(student => {
            const studentOption = document.createElement('div');
            studentOption.className = 'student-option';
            studentOption.innerHTML = `
                <input type="radio" name="student" value="${student.id}" 
                       id="student_${student.id}">
                <label for="student_${student.id}">${student.email}</label>
            `;
            
            studentOption.addEventListener('click', function() {
                document.querySelectorAll('.student-option').forEach(opt => {
                    opt.classList.remove('selected');
                });
                this.classList.add('selected');
                this.querySelector('input').checked = true;
            });
            
            container.appendChild(studentOption);
        });
        
    } catch (error) {
        container.innerHTML = '<div class="error">Не удалось загрузить учеников</div>';
    }
}

async function loadStudentsForTest() {
    const select = document.getElementById('testStudentSelect');
    
    try {
        const { data: students, error } = await window.supabase
            .from('users')
            .select('id, email')
            .eq('role', 'student')
            .order('email');
        
        if (error) throw error;
        
        select.innerHTML = '<option value="">Выберите ученика...</option>';
        
        students.forEach(student => {
            const option = document.createElement('option');
            option.value = student.id;
            option.textContent = student.email;
            select.appendChild(option);
        });
        
    } catch (error) {
        select.innerHTML = '<option value="">Ошибка загрузки</option>';
    }
}

async function loadTeacherHomeworks(user) {
    const container = document.getElementById('homeworksList');
    
    try {
        const { data: homeworks, error } = await window.supabase
            .from('homeworks')
            .select(`
                id,
                title,
                subject,
                due_date,
                description,
                file_url,
                assignments (
                    users (
                        email
                    )
                )
            `)
            .eq('teacher_id', user.id)
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        container.innerHTML = '';
        
        if (!homeworks || homeworks.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">📭</div>
                    <p>Вы еще не создали заданий</p>
                    <p class="empty-state-hint">Создайте первое задание во вкладке "Создать задание"</p>
                </div>
            `;
            return;
        }
        
        const homeworksList = document.createElement('div');
        homeworksList.className = 'homeworks-list';
        
        homeworks.forEach(hw => {
            const dueDate = new Date(hw.due_date);
            const assignedStudent = hw.assignments[0]?.users?.email || 'Не назначено';
            
            const homeworkCard = document.createElement('div');
            homeworkCard.className = 'homework-card';
            homeworkCard.innerHTML = `
                <div class="homework-info">
                    <h3>${hw.title}</h3>
                    <div class="homework-meta">
                        <span class="homework-subject">${hw.subject}</span>
                        <span class="homework-due">Срок: ${dueDate.toLocaleDateString('ru-RU')}</span>
                    </div>
                    ${hw.description ? `<p class="homework-description">${hw.description}</p>` : ''}
                    <div class="assigned-to">
                        <strong>Назначено:</strong> ${assignedStudent}
                    </div>
                    ${hw.file_url ? `
                        <a href="${hw.file_url}" target="_blank" class="file-link">
                            📎 Ссылка на файл
                        </a>
                    ` : ''}
                </div>
                <div class="homework-actions">
                    <button onclick="deleteHomework('${hw.id}')" class="btn-danger">
                        🗑️ Удалить
                    </button>
                </div>
            `;
            
            homeworksList.appendChild(homeworkCard);
        });
        
        container.appendChild(homeworksList);
        
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

function setupForms(user) {
    // Форма создания ДЗ
    const homeworkForm = document.getElementById('addHomeworkForm');
    if (homeworkForm) {
        const dueDateInput = document.getElementById('dueDate');
        if (dueDateInput) {
            const today = new Date().toISOString().split('T')[0];
            dueDateInput.min = today;
            dueDateInput.value = today;
        }
        
        homeworkForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            await createHomework(user);
        });
    }
    
    // Форма добавления результатов
    const testForm = document.getElementById('addTestForm');
    if (testForm) {
        const testDateInput = document.getElementById('testDate');
        if (testDateInput) {
            testDateInput.value = new Date().toISOString().split('T')[0];
        }
        
        testForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            await createTestResult();
        });
    }
}

async function createHomework(user) {
    const form = document.getElementById('addHomeworkForm');
    const messageEl = document.getElementById('homeworkMessage');
    
    const selectedStudent = document.querySelector('input[name="student"]:checked');
    if (!selectedStudent) {
        showMessage('Выберите ученика для задания', 'error', messageEl);
        return;
    }
    
    const homeworkData = {
        title: document.getElementById('title').value.trim(),
        subject: document.getElementById('subject').value,
        due_date: document.getElementById('dueDate').value,
        description: document.getElementById('description').value.trim(),
        file_url: document.getElementById('fileUrl').value.trim() || null,
        teacher_id: user.id
    };
    
    if (!homeworkData.title || !homeworkData.subject || !homeworkData.due_date) {
        showMessage('Заполните все обязательные поля', 'error', messageEl);
        return;
    }
    
    try {
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Создание...';
        submitBtn.disabled = true;
        
        // Создаем домашнее задание
        const { data: homework, error: homeworkError } = await window.supabase
            .from('homeworks')
            .insert([homeworkData])
            .select()
            .single();
        
        if (homeworkError) throw homeworkError;
        
        // Назначаем задание ученику
        const assignmentData = {
            homework_id: homework.id,
            student_id: selectedStudent.value
        };
        
        const { error: assignmentError } = await window.supabase
            .from('assignments')
            .insert([assignmentData]);
        
        if (assignmentError) throw assignmentError;
        
        // Успех
        showMessage('✅ Задание успешно создано и назначено ученику!', 'success', messageEl);
        form.reset();
        
        // Сбрасываем дату на сегодня
        const dueDateInput = document.getElementById('dueDate');
        if (dueDateInput) {
            const today = new Date().toISOString().split('T')[0];
            dueDateInput.value = today;
        }
        
        // Обновляем список заданий
        await loadTeacherHomeworks(user);
        
        // Переключаем на вкладку с заданиями через 2 секунды
        setTimeout(() => {
            document.querySelector('[data-tab="my-homeworks"]').click();
        }, 2000);
        
    } catch (error) {
        console.error('Ошибка создания ДЗ:', error);
        showMessage(`❌ Ошибка: ${error.message}`, 'error', messageEl);
        
    } finally {
        const submitBtn = form.querySelector('button[type="submit"]');
        submitBtn.textContent = 'Создать задание';
        submitBtn.disabled = false;
    }
}

async function createTestResult() {
    const form = document.getElementById('addTestForm');
    const messageEl = document.getElementById('testMessage');
    
    const studentId = document.getElementById('testStudentSelect').value;
    const primaryScore = parseInt(document.getElementById('primaryScore').value);
    const primaryMaxScore = parseInt(document.getElementById('primaryMaxScore').value);
    const secondaryScore = document.getElementById('secondaryScore').value;
    const secondaryMaxScore = document.getElementById('secondaryMaxScore').value;
    
    if (!studentId) {
        showMessage('Выберите ученика', 'error', messageEl);
        return;
    }
    
    if (isNaN(primaryScore) || primaryScore < 0) {
        showMessage('Введите корректный первичный балл', 'error', messageEl);
        return;
    }
    
    if (primaryScore > primaryMaxScore) {
        showMessage('Первичный балл не может превышать максимальный', 'error', messageEl);
        return;
    }
    
    // Проверяем вторичные баллы
    if (secondaryScore && !secondaryMaxScore) {
        showMessage('Введите максимальный вторичный балл', 'error', messageEl);
        return;
    }
    
    if (secondaryScore && secondaryMaxScore && parseInt(secondaryScore) > parseInt(secondaryMaxScore)) {
        showMessage('Вторичный балл не может превышать максимальный', 'error', messageEl);
        return;
    }
    
    const testData = {
        student_id: studentId,
        subject: document.getElementById('testSubject').value,
        test_name: document.getElementById('testName').value.trim(),
        primary_score: primaryScore,
        primary_max_score: primaryMaxScore,
        test_date: document.getElementById('testDate').value || new Date().toISOString().split('T')[0]
    };
    
    // Добавляем вторичные баллы, если они указаны
    if (secondaryScore && secondaryMaxScore) {
        testData.secondary_score = parseInt(secondaryScore);
        testData.secondary_max_score = parseInt(secondaryMaxScore);
    }
    
    try {
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Сохранение...';
        submitBtn.disabled = true;
        
        const { error } = await window.supabase
            .from('test_results')
            .insert([testData]);
        
        if (error) throw error;
        
        showMessage('✅ Результат теста успешно сохранен!', 'success', messageEl);
        
        // Очищаем форму
        form.reset();
        
        // Сбрасываем значения по умолчанию
        document.getElementById('primaryMaxScore').value = '100';
        document.getElementById('testDate').value = new Date().toISOString().split('T')[0];
        
    } catch (error) {
        console.error('Ошибка сохранения результата:', error);
        showMessage(`❌ Ошибка: ${error.message}`, 'error', messageEl);
        
    } finally {
        const submitBtn = form.querySelector('button[type="submit"]');
        submitBtn.textContent = 'Сохранить результат';
        submitBtn.disabled = false;
    }
}

function showMessage(text, type, element) {
    if (!element) return;
    
    element.textContent = text;
    element.className = `message ${type}`;
    element.style.display = 'block';
    
    setTimeout(() => {
        element.style.display = 'none';
    }, 5000);
}

// Глобальные функции
window.deleteHomework = async function(homeworkId) {
    if (!confirm('Вы уверены, что хотите удалить это задание?')) {
        return;
    }
    
    try {
        const { error } = await window.supabase
            .from('homeworks')
            .delete()
            .eq('id', homeworkId);
        
        if (error) throw error;
        
        alert('Задание успешно удалено');
        
        const user = JSON.parse(localStorage.getItem('user'));
        if (user) {
            await loadTeacherHomeworks(user);
        }
        
    } catch (error) {
        console.error('Ошибка удаления задания:', error);
        alert('Ошибка при удалении задания');
    }
};