// ========================
// TEACHER DASHBOARD LOGIC
// ========================

document.addEventListener('DOMContentLoaded', async function() {
    console.log('👩‍🏫 Загружена панель учителя');
    
    // Проверяем авторизацию
    const user = checkAuthorization('teacher');
    if (!user) return;
    
    // Заполняем информацию об учителе
    displayTeacherInfo(user);
    
    // Настраиваем кнопку выхода
    setupLogoutButton();
    
    // Загружаем начальные данные
    await loadInitialData(user);
    
    // Настраиваем формы
    setupForms(user);
});

// ========================
// ФУНКЦИИ
// ========================

function checkAuthorization(expectedRole) {
    const user = JSON.parse(localStorage.getItem('user'));
    
    if (!user) {
        alert('Доступ запрещен. Пожалуйста, войдите в систему.');
        window.location.href = 'index.html';
        return null;
    }
    
    if (user.role !== expectedRole) {
        alert(`Эта страница доступна только для ${expectedRole === 'teacher' ? 'учителей' : 'учеников'}.`);
        window.location.href = 'index.html';
        return null;
    }
    
    console.log('✅ Авторизован как учитель:', user.full_name);
    return user;
}

function displayTeacherInfo(user) {
    const nameElement = document.getElementById('teacherName');
    if (nameElement) {
        nameElement.textContent = user.full_name || 'Учитель';
    }
}

function setupLogoutButton() {
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            localStorage.removeItem('user');
            localStorage.removeItem('last_login');
            window.location.href = 'index.html';
        });
    }
}

async function loadInitialData(user) {
    console.log('📥 Загрузка начальных данных для учителя:', user.id);
    
    try {
        // 1. Загружаем статистику
        await loadStatistics(user);
        
        // 2. Загружаем список учеников
        await loadStudentsList();
        
        // 3. Загружаем домашние задания учителя
        await loadTeacherHomeworks(user);
        
        console.log('✅ Начальные данные загружены');
        
    } catch (error) {
        console.error('❌ Ошибка загрузки начальных данных:', error);
        showError('Не удалось загрузить данные. Пожалуйста, обновите страницу.');
    }
}

async function loadStatistics(user) {
    try {
        // 1. Количество учеников
        const { count: studentCount } = await window.supabase
            .from('users')
            .select('*', { count: 'exact', head: true })
            .eq('role', 'student');
        
        document.getElementById('totalStudents').textContent = studentCount || 0;
        
        // 2. Количество домашних заданий
        const { count: homeworkCount } = await window.supabase
            .from('homeworks')
            .select('*', { count: 'exact', head: true })
            .eq('teacher_id', user.id);
        
        document.getElementById('totalHomeworks').textContent = homeworkCount || 0;
        
        // 3. Текущие задания (срок сдачи в будущем)
        const today = new Date().toISOString().split('T')[0];
        const { count: pendingCount } = await window.supabase
            .from('homeworks')
            .select('*', { count: 'exact', head: true })
            .eq('teacher_id', user.id)
            .gte('due_date', today);
        
        document.getElementById('pendingHomeworks').textContent = pendingCount || 0;
        
    } catch (error) {
        console.error('Ошибка загрузки статистики:', error);
    }
}

async function loadStudentsList() {
    const select = document.getElementById('studentSelect');
    const listContainer = document.getElementById('studentsList');
    
    if (!select && !listContainer) return;
    
    try {
        const { data: students, error } = await window.supabase
            .from('users')
            .select('id, full_name, email, class')
            .eq('role', 'student')
            .order('class')
            .order('full_name');
        
        if (error) throw error;
        
        // Обновляем выпадающий список
        if (select) {
            select.innerHTML = '<option value="">Выберите ученика...</option>';
            
            students.forEach(student => {
                const option = document.createElement('option');
                option.value = student.id;
                option.textContent = `${student.full_name} (${student.class || 'без класса'})`;
                select.appendChild(option);
            });
        }
        
        // Обновляем список учеников
        if (listContainer) {
            if (!students || students.length === 0) {
                listContainer.innerHTML = `
                    <div class="empty-state">
                        <div>👥</div>
                        <p>В системе пока нет учеников</p>
                    </div>
                `;
                return;
            }
            
            let html = '<div style="display: grid; gap: 15px;">';
            
            students.forEach(student => {
                html += `
                    <div style="display: flex; justify-content: space-between; align-items: center; 
                                padding: 15px; background: #f8f9fa; border-radius: 8px;">
                        <div>
                            <strong>${student.full_name}</strong><br>
                            <small>${student.email} | Класс: ${student.class || 'Не указан'}</small>
                        </div>
                        <div>
                            <button onclick="viewStudent(${student.id})" class="btn" 
                                    style="padding: 5px 10px; font-size: 12px; background: #3498db; color: white;">
                                👁️ Профиль
                            </button>
                        </div>
                    </div>
                `;
            });
            
            html += '</div>';
            listContainer.innerHTML = html;
        }
        
    } catch (error) {
        console.error('Ошибка загрузки списка учеников:', error);
        
        if (select) {
            select.innerHTML = '<option value="">Ошибка загрузки</option>';
        }
        
        if (listContainer) {
            listContainer.innerHTML = '<div style="color: red;">❌ Ошибка загрузки списка учеников</div>';
        }
    }
}

async function loadTeacherHomeworks(user) {
    const container = document.getElementById('homeworksList');
    if (!container) return;
    
    try {
        const { data: homeworks, error } = await window.supabase
            .from('homeworks')
            .select('*')
            .eq('teacher_id', user.id)
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        // Очищаем контейнер
        container.innerHTML = '';
        
        if (!homeworks || homeworks.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div>📭</div>
                    <p>У вас пока нет домашних заданий</p>
                    <p><small>Создайте первое задание во вкладке "Добавить ДЗ"</small></p>
                </div>
            `;
            return;
        }
        
        // Отображаем задания
        homeworks.forEach(hw => {
            const dueDate = new Date(hw.due_date);
            const today = new Date();
            const daysDiff = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
            
            let statusBadge = '';
            if (daysDiff < 0) {
                statusBadge = '<span style="background: #ffeaa7; color: #d35400; padding: 2px 8px; border-radius: 12px; font-size: 12px;">Просрочено</span>';
            } else if (daysDiff <= 3) {
                statusBadge = '<span style="background: #ffcccc; color: #c0392b; padding: 2px 8px; border-radius: 12px; font-size: 12px;">Срочно</span>';
            }
            
            const homeworkCard = document.createElement('div');
            homeworkCard.className = 'homework-card';
            homeworkCard.innerHTML = `
                <div class="homework-info">
                    <h4>${hw.title}</h4>
                    <div class="homework-meta">
                        <span>${hw.subject}</span>
                        <span>Срок: ${dueDate.toLocaleDateString('ru-RU')}</span>
                        ${statusBadge}
                        ${hw.file_url ? '<span>📎 Есть файл</span>' : ''}
                    </div>
                </div>
                <div>
                    <button onclick="deleteHomework(${hw.id})" class="btn-danger">
                        🗑️ Удалить
                    </button>
                </div>
            `;
            
            container.appendChild(homeworkCard);
        });
        
    } catch (error) {
        console.error('Ошибка загрузки домашних заданий:', error);
        container.innerHTML = `
            <div style="color: red; padding: 20px; text-align: center;">
                ❌ Не удалось загрузить домашние задания
            </div>
        `;
    }
}

function setupForms(user) {
    // Форма добавления ДЗ
    const homeworkForm = document.getElementById('addHomeworkForm');
    if (homeworkForm) {
        homeworkForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            await createHomework(user);
        });
        
        // Устанавливаем минимальную дату - сегодня
        const dueDateInput = document.getElementById('dueDate');
        if (dueDateInput) {
            const today = new Date().toISOString().split('T')[0];
            dueDateInput.min = today;
            dueDateInput.value = today;
        }
    }
    
    // Форма добавления результатов теста
    const testForm = document.getElementById('addTestForm');
    if (testForm) {
        testForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            await createTestResult();
        });
        
        // Устанавливаем сегодняшнюю дату по умолчанию
        const testDateInput = document.getElementById('testDate');
        if (testDateInput) {
            testDateInput.value = new Date().toISOString().split('T')[0];
        }
    }
}

async function createHomework(user) {
    const form = document.getElementById('addHomeworkForm');
    const messageEl = document.getElementById('homeworkMessage');
    
    // Собираем данные
    const homeworkData = {
        title: document.getElementById('title').value,
        subject: document.getElementById('subject').value,
        due_date: document.getElementById('dueDate').value,
        description: document.getElementById('description').value,
        file_url: document.getElementById('fileUrl').value || null,
        teacher_id: user.id,
        created_at: new Date().toISOString()
    };
    
    // Валидация
    if (!homeworkData.title || !homeworkData.subject || !homeworkData.due_date) {
        showMessage('Заполните все обязательные поля', 'error', messageEl);
        return;
    }
    
    try {
        // Показываем загрузку
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = '⏳ Создание...';
        submitBtn.disabled = true;
        
        // Отправляем данные
        const { data, error } = await window.supabase
            .from('homeworks')
            .insert([homeworkData])
            .select();
        
        if (error) throw error;
        
        // Успех
        showMessage('✅ Домашнее задание успешно создано!', 'success', messageEl);
        form.reset();
        
        // Обновляем список заданий
        await loadTeacherHomeworks(user);
        await loadStatistics(user);
        
        // Переключаем на вкладку с заданиями
        setTimeout(() => {
            document.querySelector('[data-tab="my-homeworks"]').click();
        }, 1500);
        
    } catch (error) {
        console.error('Ошибка создания ДЗ:', error);
        showMessage(`❌ Ошибка: ${error.message}`, 'error', messageEl);
        
    } finally {
        // Восстанавливаем кнопку
        const submitBtn = form.querySelector('button[type="submit"]');
        submitBtn.textContent = '📤 Опубликовать задание';
        submitBtn.disabled = false;
    }
}

async function createTestResult() {
    const form = document.getElementById('addTestForm');
    const studentId = document.getElementById('studentSelect').value;
    
    // Собираем данные
    const testData = {
        student_id: parseInt(studentId),
        subject: document.getElementById('testSubject').value,
        test_name: document.getElementById('testName').value,
        score: parseInt(document.getElementById('score').value),
        max_score: parseInt(document.getElementById('maxScore').value),
        test_date: document.getElementById('testDate').value || new Date().toISOString().split('T')[0]
    };
    
    // Валидация
    if (!testData.student_id || !testData.test_name || isNaN(testData.score)) {
        alert('Заполните все обязательные поля');
        return;
    }
    
    if (testData.score > testData.max_score) {
        alert('Баллы не могут превышать максимальный балл');
        return;
    }
    
    try {
        // Показываем загрузку
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = '⏳ Сохранение...';
        submitBtn.disabled = true;
        
        // Отправляем данные
        const { data, error } = await window.supabase
            .from('test_results')
            .insert([testData])
            .select();
        
        if (error) throw error;
        
        // Успех
        alert('✅ Результат теста успешно сохранен!');
        form.reset();
        
        // Сбрасываем дату на сегодня
        document.getElementById('testDate').value = new Date().toISOString().split('T')[0];
        
    } catch (error) {
        console.error('Ошибка сохранения результата:', error);
        alert(`❌ Ошибка: ${error.message}`);
        
    } finally {
        // Восстанавливаем кнопку
        const submitBtn = form.querySelector('button[type="submit"]');
        submitBtn.textContent = '💾 Сохранить результат';
        submitBtn.disabled = false;
    }
}

function showMessage(text, type, element) {
    if (!element) return;
    
    element.textContent = text;
    element.style.display = 'block';
    element.style.color = type === 'success' ? '#27ae60' : '#e74c3c';
    element.style.padding = '10px';
    element.style.borderRadius = '5px';
    element.style.backgroundColor = type === 'success' ? '#d1f7c4' : '#ffeaea';
    
    // Автоматически скрыть через 5 секунд
    setTimeout(() => {
        element.style.display = 'none';
    }, 5000);
}

function showError(message) {
    alert(message);
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
        
        alert('✅ Задание успешно удалено');
        
        // Обновляем данные
        const user = JSON.parse(localStorage.getItem('user'));
        if (user) {
            await loadTeacherHomeworks(user);
            await loadStatistics(user);
        }
        
    } catch (error) {
        console.error('Ошибка удаления задания:', error);
        alert(`❌ Ошибка удаления: ${error.message}`);
    }
};

window.viewStudent = function(studentId) {
    alert(`Просмотр профиля ученика ID: ${studentId}\nЭта функция будет реализована позже.`);
};

// Экспорт для тестирования
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        checkAuthorization,
        loadInitialData,
        createHomework,
        createTestResult
    };
}