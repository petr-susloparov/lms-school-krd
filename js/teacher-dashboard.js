// TEACHER DASHBOARD LOGIC
let currentTeacher = null;
let selectedStudents = new Set();

document.addEventListener('DOMContentLoaded', async function() {
    console.log('👩‍🏫 Панель учителя загружена');
    
    // Проверяем авторизацию через сессию
    await checkAuth();
    
    if (!currentTeacher) return;
    
    updateUserInfo(currentTeacher);
    setupLogoutButton();
    setupTabs();
    await loadInitialData();
    setupForms();
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
        
        if (user.role !== 'teacher') {
            alert('Эта страница только для учителей');
            window.location.href = 'dashboard-student.html';
            return null;
        }
        
        console.log('👤 Авторизованный учитель:', user);
        currentTeacher = user;
        return user;
        
    } catch (e) {
        console.error('Ошибка проверки авторизации:', e);
        window.location.href = 'index.html';
        return null;
    }
}

function updateUserInfo(user) {
    const userNameEl = document.getElementById('userName');
    const userClassEl = document.getElementById('userClass');
    
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

function setupTabs() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    
    tabBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const tabId = this.dataset.tab;
            
            // Снимаем активность со всех вкладок
            tabBtns.forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            
            // Активируем текущую вкладку
            this.classList.add('active');
            document.getElementById(tabId).classList.add('active');
            
            // Загружаем данные для вкладки если нужно
            if (tabId === 'my-homeworks') {
                loadHomeworks();
            }
        });
    });
}

async function loadInitialData() {
    try {
        await Promise.all([
            loadStudents(),
            loadStudentsForResult()
        ]);
    } catch (error) {
        console.error('Ошибка загрузки данных:', error);
        showNotification('Не удалось загрузить данные. Попробуйте обновить страницу.', 'error');
    }
}

async function loadStudents() {
    const container = document.getElementById('studentsContainer');
    
    try {
        const { data: students, error } = await window.supabase
            .from('users')
            .select('id, email, full_name, class_name')
            .eq('role', 'student')
            .order('class_name')
            .order('full_name');
        
        if (error) {
            console.error('Ошибка загрузки учеников:', error);
            throw error;
        }
        
        console.log('👨‍🎓 Загружено учеников:', students?.length || 0);
        
        container.innerHTML = '';
        
        if (!students || students.length === 0) {
            container.innerHTML = '<div class="empty">Нет учеников в системе</div>';
            return;
        }
        
        // Группируем учеников по классам
        const studentsByClass = {};
        students.forEach(student => {
            const className = student.class_name || 'Без класса';
            if (!studentsByClass[className]) {
                studentsByClass[className] = [];
            }
            studentsByClass[className].push(student);
        });
        
        // Создаем список с группами по классам
        Object.entries(studentsByClass).forEach(([className, classStudents]) => {
            const classGroup = document.createElement('div');
            classGroup.className = 'class-group';
            
            const classHeader = document.createElement('div');
            classHeader.className = 'class-header';
            classHeader.innerHTML = `
                <input type="checkbox" class="class-selector" data-class="${className}">
                <label><strong>${className}</strong> (${classStudents.length} чел.)</label>
            `;
            
            // Обработчик выбора всего класса
            classHeader.querySelector('.class-selector').addEventListener('change', function(e) {
                e.stopPropagation();
                const studentItems = classGroup.querySelectorAll('.student-item');
                studentItems.forEach(item => {
                    const checkbox = item.querySelector('input[type="checkbox"]');
                    if (checkbox) {
                        checkbox.checked = this.checked;
                        checkbox.dispatchEvent(new Event('change'));
                    }
                });
            });
            
            classGroup.appendChild(classHeader);
            
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
                        ${student.class_name ? `<span class="student-class">${student.class_name}</span>` : ''}
                    </label>
                `;
                
                const checkbox = studentItem.querySelector('input[type="checkbox"]');
                checkbox.addEventListener('change', function() {
                    if (this.checked) {
                        selectedStudents.add(student.id);
                    } else {
                        selectedStudents.delete(student.id);
                        
                        // Снимаем выбор с заголовка класса если нужно
                        const classSelector = classGroup.querySelector('.class-selector');
                        if (classSelector) {
                            classSelector.checked = false;
                        }
                    }
                    updateSelectedCount();
                });
                
                studentsList.appendChild(studentItem);
            });
            
            classGroup.appendChild(studentsList);
            container.appendChild(classGroup);
        });
        
        updateSelectedCount();
        
    } catch (error) {
        console.error('Ошибка загрузки учеников:', error);
        container.innerHTML = '<div class="error">Ошибка загрузки списка учеников</div>';
    }
}

async function loadStudentsForResult() {
    const select = document.getElementById('resultStudent');
    
    try {
        const { data: students, error } = await window.supabase
            .from('users')
            .select('id, email, full_name, class_name')
            .eq('role', 'student')
            .order('full_name');
        
        if (error) throw error;
        
        select.innerHTML = '<option value="">Выберите ученика...</option>';
        
        students.forEach(student => {
            const option = document.createElement('option');
            option.value = student.id;
            const displayName = student.full_name ? 
                `${student.full_name} (${student.class_name || 'Без класса'})` : 
                student.email;
            option.textContent = displayName;
            select.appendChild(option);
        });
        
    } catch (error) {
        console.error('Ошибка загрузки учеников для оценок:', error);
        select.innerHTML = '<option value="">Ошибка загрузки</option>';
    }
}

async function loadHomeworks() {
    const container = document.getElementById('homeworksList');
    
    try {
        // Убираем индикатор загрузки
        container.classList.remove('loading');
        
        const { data: homeworks, error } = await window.supabase
            .from('homeworks')
            .select(`
                id,
                title,
                subject,
                description,
                task_url,
                created_at
            `)
            .eq('teacher_id', currentTeacher.id)
            .eq('is_active', true)
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        console.log('📚 Загружено заданий:', homeworks?.length || 0);
        
        container.innerHTML = '';
        
        if (!homeworks || homeworks.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">📭</div>
                    <p>Нет созданных заданий</p>
                    <small>Создайте первое задание во вкладке "Новое задание"</small>
                </div>
            `;
            return;
        }
        
        // Создаем задания стопкой
        homeworks.forEach(homework => {
            const homeworkCard = createHomeworkCard(homework);
            container.appendChild(homeworkCard);
        });
        
    } catch (error) {
        console.error('Ошибка загрузки заданий:', error);
        container.innerHTML = `
            <div class="error-state">
                <div class="error-icon">⚠️</div>
                <p>Ошибка загрузки заданий</p>
                <button class="btn-retry" onclick="loadHomeworks()">
                    <span class="btn-icon">🔄</span>
                    Попробовать снова
                </button>
            </div>
        `;
    }
}

function createHomeworkCard(homework) {
    const card = document.createElement('div');
    card.className = 'homework-card';
    
    const createdDate = new Date(homework.created_at).toLocaleDateString('ru-RU');
    
    card.innerHTML = `
        <div class="homework-header">
            <div class="homework-title">
                <h3>${homework.title}</h3>
                <span class="homework-subject">${homework.subject}</span>
            </div>
            <div class="homework-date">${createdDate}</div>
        </div>
        
        ${homework.description ? `
            <div class="homework-description">
                <strong>Описание:</strong>
                <p>${homework.description}</p>
            </div>
        ` : ''}
        
        <div class="homework-url">
            <a href="${homework.task_url}" target="_blank" rel="noopener noreferrer" class="btn btn-outline">
                <span class="btn-icon">🔗</span>
                Ссылка на задание
            </a>
        </div>
        
        <div class="homework-actions">
            <button class="btn btn-danger" onclick="deleteHomework(${homework.id})">
                <span class="btn-icon">🗑️</span>
                Удалить задание
            </button>
        </div>
    `;
    
    return card;
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

// Функции для работы с выбором учеников
window.selectAllStudents = function() {
    const checkboxes = document.querySelectorAll('#studentsContainer input[type="checkbox"]');
    selectedStudents.clear();
    
    checkboxes.forEach(checkbox => {
        checkbox.checked = true;
        selectedStudents.add(checkbox.value);
    });
    
    updateSelectedCount();
    showNotification(`Выбраны все ученики (${selectedStudents.size})`, 'success');
};

window.deselectAllStudents = function() {
    const checkboxes = document.querySelectorAll('#studentsContainer input[type="checkbox"]');
    
    checkboxes.forEach(checkbox => {
        checkbox.checked = false;
    });
    
    selectedStudents.clear();
    updateSelectedCount();
    showNotification('Выбор снят со всех учеников', 'info');
};

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
    
    // Получаем данные формы
    const title = document.getElementById('homeworkTitle').value.trim();
    const subject = document.getElementById('homeworkSubject').value;
    const taskUrl = document.getElementById('homeworkUrl').value.trim();
    const description = document.getElementById('homeworkDescription').value.trim();
    
    // Валидация
    if (!title || !subject || !taskUrl) {
        showFormMessage('Заполните все обязательные поля', 'error', messageEl);
        return;
    }
    
    if (selectedStudents.size === 0) {
        showFormMessage('Выберите хотя бы одного ученика', 'error', messageEl);
        return;
    }
    
    const homeworkData = {
        title: title,
        subject: subject,
        description: description || null,
        task_url: taskUrl,
        teacher_id: currentTeacher.id,
        is_active: true
    };
    
    try {
        // Показываем индикатор загрузки
        btnText.style.display = 'none';
        btnLoading.style.display = 'inline-block';
        submitBtn.disabled = true;
        
        // Создаем домашнее задание
        const { data: homework, error: hwError } = await window.supabase
            .from('homeworks')
            .insert([homeworkData])
            .select()
            .single();
        
        if (hwError) {
            console.error('Ошибка создания задания:', hwError);
            throw hwError;
        }
        
        // Создаем назначения для выбранных учеников
        const assignmentsData = Array.from(selectedStudents).map(studentId => ({
            homework_id: homework.id,
            student_id: studentId
        }));
        
        const { error: assignError } = await window.supabase
            .from('assignments')
            .insert(assignmentsData);
        
        if (assignError) {
            console.error('Ошибка создания назначений:', assignError);
            throw assignError;
        }
        
        // Показываем успешное сообщение
        showFormMessage(`✅ Задание успешно создано и назначено ${selectedStudents.size} ученикам!`, 'success', messageEl);
        
        // Очищаем форму
        form.reset();
        selectedStudents.clear();
        updateSelectedCount();
        
        // Сбрасываем выбор учеников
        document.querySelectorAll('#studentsContainer input[type="checkbox"]').forEach(cb => {
            cb.checked = false;
        });
        
        // Переключаемся на вкладку с заданиями через 2 секунды
        setTimeout(() => {
            document.querySelector('[data-tab="my-homeworks"]').click();
        }, 2000);
        
    } catch (error) {
        console.error('Ошибка создания задания:', error);
        showFormMessage(`❌ Ошибка: ${error.message || 'Не удалось создать задание'}`, 'error', messageEl);
        
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
        showFormMessage('Первичный балл не может превышать максимальный балл', 'error', messageEl);
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
        // Показываем индикатор загрузки
        btnText.style.display = 'none';
        btnLoading.style.display = 'inline-block';
        submitBtn.disabled = true;
        
        const { error } = await window.supabase
            .from('test_results')
            .insert([resultData]);
        
        if (error) throw error;
        
        // Показываем успешное сообщение
        showFormMessage(`✅ Оценка сохранена! ${score} из ${maxScore} баллов`, 'success', messageEl);
        
        // Очищаем форму
        form.reset();
        document.getElementById('resultDate').value = new Date().toISOString().split('T')[0];
        
    } catch (error) {
        console.error('Ошибка сохранения оценки:', error);
        showFormMessage(`❌ Ошибка: ${error.message || 'Не удалось сохранить оценку'}`, 'error', messageEl);
        
    } finally {
        // Восстанавливаем кнопку
        btnText.style.display = 'inline-block';
        btnLoading.style.display = 'none';
        submitBtn.disabled = false;
    }
}

// Вспомогательные функции
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
    if (window.showNotification) {
        window.showNotification(message, type === 'error' ? 'error' : 'success');
    } else {
        alert(message);
    }
}

// Глобальные функции
window.deleteHomework = async function(homeworkId) {
    if (!confirm('Вы уверены, что хотите удалить это задание?\nЭто действие нельзя отменить.')) {
        return;
    }
    
    try {
        const { error } = await window.supabase
            .from('homeworks')
            .update({ is_active: false })
            .eq('id', homeworkId);
        
        if (error) throw error;
        
        showNotification('✅ Задание удалено', 'success');
        await loadHomeworks();
        
    } catch (error) {
        console.error('Ошибка удаления задания:', error);
        showNotification('❌ Ошибка удаления задания', 'error');
    }
};

window.refreshHomeworks = async function() {
    await loadHomeworks();
    showNotification('🔄 Список заданий обновлен', 'success');
};