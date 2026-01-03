// TEACHER DASHBOARD LOGIC
let currentTeacher = null;
let selectedStudents = new Set();

document.addEventListener('DOMContentLoaded', async function() {
    console.log('👩‍🏫 Кабинет учителя загружен');
    
    currentTeacher = await checkAuth();
    if (!currentTeacher) return;
    
    updateUserInfo(currentTeacher);
    setupLogoutButton();
    setupTabs();
    await loadInitialData();
    setupForms();
});

async function checkAuth() {
    const userJson = localStorage.getItem('user');
    if (!userJson) {
        window.location.href = 'index.html';
        return null;
    }
    
    try {
        const user = JSON.parse(userJson);
        if (user.role !== 'teacher') {
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

function setupTabs() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    
    tabBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const tabId = this.dataset.tab;
            
            // Обновляем активные табы
            tabBtns.forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            
            this.classList.add('active');
            document.getElementById(tabId).classList.add('active');
            
            // Загружаем данные для активной вкладки
            if (tabId === 'my-homeworks') {
                loadHomeworks();
            }
        });
    });
}

async function loadInitialData() {
    try {
        await loadStatistics();
        await loadStudents();
        await loadStudentsForResult();
    } catch (error) {
        console.error('Ошибка загрузки данных:', error);
        showNotification('Ошибка загрузки данных', 'error');
    }
}

async function loadStatistics() {
    try {
        // Статистика по заданиям
        const { data: homeworks, error: hwError } = await window.supabase
            .from('homeworks')
            .select('id, assignments(is_completed)')
            .eq('teacher_id', currentTeacher.id)
            .eq('is_active', true);
        
        if (hwError) throw hwError;
        
        // Статистика по ученикам
        const { data: students, error: stError } = await window.supabase
            .from('users')
            .select('id')
            .eq('role', 'student');
        
        if (stError) throw stError;
        
        // Подсчет статистики
        let totalAssignments = 0;
        let completedAssignments = 0;
        
        homeworks.forEach(hw => {
            if (hw.assignments) {
                totalAssignments += hw.assignments.length;
                completedAssignments += hw.assignments.filter(a => a.is_completed).length;
            }
        });
        
        // Обновляем статистику на странице
        document.getElementById('totalHomeworks').textContent = homeworks.length || 0;
        document.getElementById('totalStudents').textContent = students.length || 0;
        document.getElementById('completedAssignments').textContent = completedAssignments;
        document.getElementById('pendingAssignments').textContent = totalAssignments - completedAssignments;
        
    } catch (error) {
        console.error('Ошибка загрузки статистики:', error);
    }
}

async function loadStudents() {
    const container = document.getElementById('studentsContainer');
    
    try {
        const { data: students, error } = await window.supabase
            .from('users')
            .select('id, full_name, email, class_name')
            .eq('role', 'student')
            .order('class_name')
            .order('full_name');
        
        if (error) throw error;
        
        container.innerHTML = '';
        container.classList.remove('loading');
        
        if (!students || students.length === 0) {
            container.innerHTML = '<div class="empty">Нет учеников</div>';
            return;
        }
        
        // Группируем по классам
        const studentsByClass = {};
        students.forEach(student => {
            const className = student.class_name || 'Без класса';
            if (!studentsByClass[className]) {
                studentsByClass[className] = [];
            }
            studentsByClass[className].push(student);
        });
        
        // Создаем список с группами
        Object.entries(studentsByClass).forEach(([className, classStudents]) => {
            const classGroup = document.createElement('div');
            classGroup.className = 'class-group';
            classGroup.innerHTML = `<div class="class-header">${className}</div>`;
            
            const studentsList = document.createElement('div');
            studentsList.className = 'students-group';
            
            classStudents.forEach(student => {
                const studentItem = document.createElement('div');
                studentItem.className = 'student-item';
                studentItem.innerHTML = `
                    <input type="checkbox" id="student_${student.id}" value="${student.id}">
                    <label for="student_${student.id}">
                        <span class="student-name">${student.full_name || student.email}</span>
                        <span class="student-email">${student.email}</span>
                    </label>
                `;
                
                const checkbox = studentItem.querySelector('input');
                checkbox.addEventListener('change', function() {
                    if (this.checked) {
                        selectedStudents.add(student.id);
                    } else {
                        selectedStudents.delete(student.id);
                    }
                    updateSelectedCount();
                });
                
                studentsList.appendChild(studentItem);
            });
            
            classGroup.appendChild(studentsList);
            container.appendChild(classGroup);
        });
        
        // Кнопка выбрать всех
        const selectAllBtn = document.createElement('button');
        selectAllBtn.type = 'button';
        selectAllBtn.className = 'btn-select-all';
        selectAllBtn.textContent = 'Выбрать всех';
        selectAllBtn.onclick = selectAllStudents;
        container.appendChild(selectAllBtn);
        
    } catch (error) {
        container.innerHTML = '<div class="error">Ошибка загрузки учеников</div>';
    }
}

async function loadStudentsForResult() {
    const select = document.getElementById('resultStudent');
    
    try {
        const { data: students, error } = await window.supabase
            .from('users')
            .select('id, full_name, email, class_name')
            .eq('role', 'student')
            .order('full_name');
        
        if (error) throw error;
        
        select.innerHTML = '<option value="">Выберите ученика...</option>';
        
        students.forEach(student => {
            const option = document.createElement('option');
            option.value = student.id;
            const displayName = student.full_name ? 
                `${student.full_name} (${student.email})` : student.email;
            option.textContent = displayName;
            select.appendChild(option);
        });
        
    } catch (error) {
        console.error('Ошибка загрузки учеников:', error);
        select.innerHTML = '<option value="">Ошибка загрузки</option>';
    }
}

async function loadHomeworks() {
    const container = document.getElementById('homeworksList');
    
    try {
        const { data: homeworks, error } = await window.supabase
            .from('homeworks')
            .select(`
                id,
                title,
                subject,
                description,
                task_url,
                created_at,
                assignments (
                    id,
                    is_completed,
                    users!assignments_student_id_fkey(full_name, email)
                )
            `)
            .eq('teacher_id', currentTeacher.id)
            .eq('is_active', true)
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        container.innerHTML = '';
        
        if (!homeworks || homeworks.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">📭</div>
                    <p>Нет созданных заданий</p>
                </div>
            `;
            return;
        }
        
        homeworks.forEach(homework => {
            const homeworkCard = document.createElement('div');
            homeworkCard.className = 'homework-item';
            
            const createdDate = new Date(homework.created_at).toLocaleDateString('ru-RU');
            const completedCount = homework.assignments?.filter(a => a.is_completed).length || 0;
            const totalCount = homework.assignments?.length || 0;
            const completionRate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
            
            homeworkCard.innerHTML = `
                <div class="homework-header">
                    <div class="homework-title">
                        <h3>${homework.title}</h3>
                        <span class="homework-subject">${homework.subject}</span>
                    </div>
                    <div class="homework-date">${createdDate}</div>
                </div>
                
                ${homework.description ? `
                    <div class="homework-description">
                        ${homework.description}
                    </div>
                ` : ''}
                
                <div class="homework-url">
                    <a href="${homework.task_url}" target="_blank" rel="noopener noreferrer">
                        🔗 Ссылка на задание
                    </a>
                </div>
                
                <div class="homework-stats">
                    <div class="stat">
                        <div class="stat-label">Назначено:</div>
                        <div class="stat-value">${totalCount} учеников</div>
                    </div>
                    <div class="stat">
                        <div class="stat-label">Выполнено:</div>
                        <div class="stat-value">${completedCount}/${totalCount} (${completionRate}%)</div>
                    </div>
                </div>
                
                ${homework.assignments && homework.assignments.length > 0 ? `
                    <div class="assignments-list">
                        <div class="assignments-header">Назначения:</div>
                        ${homework.assignments.map(assignment => `
                            <div class="assignment ${assignment.is_completed ? 'completed' : 'pending'}">
                                <span class="student-name">${assignment.users?.full_name || assignment.users?.email}</span>
                                <span class="assignment-status">
                                    ${assignment.is_completed ? '✅ Выполнено' : '⏳ Ожидает'}
                                </span>
                            </div>
                        `).join('')}
                    </div>
                ` : ''}
                
                <div class="homework-actions">
                    <button class="btn btn-sm btn-danger" onclick="deleteHomework(${homework.id})">
                        Удалить
                    </button>
                </div>
            `;
            
            container.appendChild(homeworkCard);
        });
        
    } catch (error) {
        console.error('Ошибка загрузки заданий:', error);
        container.innerHTML = `
            <div class="error-state">
                <div class="error-icon">⚠️</div>
                <p>Ошибка загрузки заданий</p>
                <button class="btn-retry" onclick="loadHomeworks()">Повторить</button>
            </div>
        `;
    }
}

function setupForms() {
    // Форма создания задания
    const homeworkForm = document.getElementById('createHomeworkForm');
    if (homeworkForm) {
        homeworkForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            await createHomework();
        });
    }
    
    // Форма добавления оценки
    const resultForm = document.getElementById('addResultForm');
    if (resultForm) {
        // Устанавливаем сегодняшнюю дату по умолчанию
        const today = new Date().toISOString().split('T')[0];
        const dateInput = document.getElementById('resultDate');
        if (dateInput) dateInput.value = today;
        
        resultForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            await addTestResult();
        });
    }
}

function selectAllStudents() {
    const checkboxes = document.querySelectorAll('.students-list input[type="checkbox"]');
    selectedStudents.clear();
    
    checkboxes.forEach(checkbox => {
        checkbox.checked = true;
        selectedStudents.add(checkbox.value);
    });
    
    updateSelectedCount();
}

function updateSelectedCount() {
    const countEl = document.getElementById('selectedCount');
    if (countEl) {
        countEl.textContent = selectedStudents.size;
    }
}

async function createHomework() {
    const form = document.getElementById('createHomeworkForm');
    const messageEl = document.getElementById('homeworkMessage');
    const submitBtn = form.querySelector('button[type="submit"]');
    const btnText = submitBtn.querySelector('.btn-text');
    const btnLoading = submitBtn.querySelector('.btn-loading');
    
    // Валидация
    const title = document.getElementById('homeworkTitle').value.trim();
    const subject = document.getElementById('homeworkSubject').value;
    const taskUrl = document.getElementById('homeworkUrl').value.trim();
    
    if (!title || !subject || !taskUrl) {
        showFormMessage('Заполните все обязательные поля', 'error', messageEl);
        return;
    }
    
    if (selectedStudents.size === 0) {
        showFormMessage('Выберите хотя бы одного ученика', 'error', messageEl);
        return;
    }
    
    if (!isValidUrl(taskUrl)) {
        showFormMessage('Введите корректную ссылку', 'error', messageEl);
        return;
    }
    
    const homeworkData = {
        title: title,
        subject: subject,
        description: document.getElementById('homeworkDescription').value.trim() || null,
        task_url: taskUrl,
        teacher_id: currentTeacher.id,
        is_active: true
    };
    
    try {
        // Показываем загрузку
        btnText.style.display = 'none';
        btnLoading.style.display = 'inline-block';
        submitBtn.disabled = true;
        
        // Создаем задание
        const { data: homework, error: hwError } = await window.supabase
            .from('homeworks')
            .insert([homeworkData])
            .select()
            .single();
        
        if (hwError) throw hwError;
        
        // Создаем назначения для выбранных учеников
        const assignmentsData = Array.from(selectedStudents).map(studentId => ({
            homework_id: homework.id,
            student_id: studentId
        }));
        
        const { error: assignError } = await window.supabase
            .from('assignments')
            .insert(assignmentsData);
        
        if (assignError) throw assignError;
        
        // Успех
        showFormMessage(`✅ Задание создано! Назначено ${selectedStudents.size} ученикам`, 'success', messageEl);
        
        // Очищаем форму
        form.reset();
        selectedStudents.clear();
        updateSelectedCount();
        
        // Сбрасываем выбор учеников
        document.querySelectorAll('.students-list input[type="checkbox"]').forEach(cb => {
            cb.checked = false;
        });
        
        // Обновляем статистику и список заданий
        await loadStatistics();
        
        // Переключаем на вкладку с заданиями через 2 секунды
        setTimeout(() => {
            document.querySelector('[data-tab="my-homeworks"]').click();
        }, 2000);
        
    } catch (error) {
        console.error('Ошибка создания задания:', error);
        showFormMessage(`❌ Ошибка: ${error.message}`, 'error', messageEl);
        
    } finally {
        // Восстанавливаем кнопку
        btnText.style.display = 'inline-block';
        btnLoading.style.display = 'none';
        submitBtn.disabled = false;
    }
}

async function addTestResult() {
    const form = document.getElementById('addResultForm');
    const messageEl = document.getElementById('resultMessage');
    const submitBtn = form.querySelector('button[type="submit"]');
    const btnText = submitBtn.querySelector('.btn-text');
    const btnLoading = submitBtn.querySelector('.btn-loading');
    
    // Получаем данные формы
    const studentId = document.getElementById('resultStudent').value;
    const subject = document.getElementById('resultSubject').value;
    const testName = document.getElementById('resultTestName').value.trim();
    const score = parseInt(document.getElementById('resultScore').value);
    const maxScore = parseInt(document.getElementById('resultMaxScore').value);
    const testDate = document.getElementById('resultDate').value || new Date().toISOString().split('T')[0];
    
    // Валидация
    if (!studentId || !subject || !testName || isNaN(score) || isNaN(maxScore)) {
        showFormMessage('Заполните все поля корректно', 'error', messageEl);
        return;
    }
    
    if (score < 0 || maxScore <= 0) {
        showFormMessage('Некорректные баллы', 'error', messageEl);
        return;
    }
    
    if (score > maxScore) {
        showFormMessage('Баллы не могут превышать максимальный балл', 'error', messageEl);
        return;
    }
    
    const resultData = {
        student_id: parseInt(studentId),
        subject: subject,
        test_name: testName,
        score: score,
        max_score: maxScore,
        created_at: testDate
    };
    
    try {
        // Показываем загрузку
        btnText.style.display = 'none';
        btnLoading.style.display = 'inline-block';
        submitBtn.disabled = true;
        
        // Сохраняем результат
        const { error } = await window.supabase
            .from('test_results')
            .insert([resultData]);
        
        if (error) throw error;
        
        // Успех
        showFormMessage('✅ Оценка успешно сохранена!', 'success', messageEl);
        
        // Очищаем форму
        form.reset();
        document.getElementById('resultMaxScore').value = '100';
        document.getElementById('resultDate').value = new Date().toISOString().split('T')[0];
        
    } catch (error) {
        console.error('Ошибка сохранения оценки:', error);
        showFormMessage(`❌ Ошибка: ${error.message}`, 'error', messageEl);
        
    } finally {
        // Восстанавливаем кнопку
        btnText.style.display = 'inline-block';
        btnLoading.style.display = 'none';
        submitBtn.disabled = false;
    }
}

// Вспомогательные функции
function isValidUrl(string) {
    try {
        new URL(string);
        return true;
    } catch (_) {
        return false;
    }
}

function showFormMessage(message, type, element) {
    if (!element) return;
    
    element.textContent = message;
    element.className = `message ${type}`;
    element.style.display = 'block';
    
    setTimeout(() => {
        element.style.display = 'none';
    }, 5000);
}

function showNotification(message, type = 'info') {
    if (window.showAlert) {
        window.showAlert(message, type === 'error' ? 'error' : 'success');
    } else {
        alert(message);
    }
}

// Глобальные функции
window.deleteHomework = async function(homeworkId) {
    if (!confirm('Удалить это задание? Это действие нельзя отменить.')) {
        return;
    }
    
    try {
        const { error } = await window.supabase
            .from('homeworks')
            .update({ is_active: false })
            .eq('id', homeworkId);
        
        if (error) throw error;
        
        showNotification('✅ Задание удалено', 'success');
        await loadStatistics();
        await loadHomeworks();
        
    } catch (error) {
        console.error('Ошибка удаления задания:', error);
        showNotification('❌ Ошибка удаления задания', 'error');
    }
};

window.refreshHomeworks = async function() {
    await loadHomeworks();
    showNotification('Список заданий обновлен', 'success');
};