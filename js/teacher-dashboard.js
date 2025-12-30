// ========================
// TEACHER DASHBOARD LOGIC - ПОЛНАЯ ВЕРСИЯ
// ========================

document.addEventListener('DOMContentLoaded', async function() {
    console.log('👩‍🏫 Загружена панель учителя');
    
    // 1. Проверяем авторизацию
    const user = await checkAuthorization();
    if (!user) return;
    
    // 2. Заполняем информацию об учителе
    displayTeacherInfo(user);
    
    // 3. Настраиваем кнопку выхода
    setupLogoutButton();
    
    // 4. Загружаем начальные данные
    await loadInitialData(user);
    
    // 5. Настраиваем формы
    setupForms(user);
    
    // 6. Настраиваем вкладки
    setupTabs();
});

// ========================
// АВТОРИЗАЦИЯ И БЕЗОПАСНОСТЬ
// ========================

async function checkAuthorization() {
    console.log('🔐 Проверка авторизации учителя...');
    
    // 1. Проверяем наличие пользователя в localStorage
    const userJson = localStorage.getItem('user');
    if (!userJson) {
        console.error('❌ Нет данных пользователя в localStorage');
        showAuthError('Вы не авторизованы. Пожалуйста, войдите в систему.');
        redirectToLogin();
        return null;
    }
    
    // 2. Парсим данные пользователя
    let user;
    try {
        user = JSON.parse(userJson);
        console.log('📋 Данные пользователя:', user);
    } catch (e) {
        console.error('❌ Ошибка парсинга данных пользователя:', e);
        localStorage.removeItem('user');
        showAuthError('Ошибка данных сессии. Пожалуйста, войдите заново.');
        redirectToLogin();
        return null;
    }
    
    // 3. Проверяем обязательные поля
    if (!user.id || !user.email || !user.role) {
        console.error('❌ Неполные данные пользователя:', user);
        localStorage.removeItem('user');
        showAuthError('Неполные данные пользователя. Пожалуйста, войдите заново.');
        redirectToLogin();
        return null;
    }
    
    // 4. Проверяем роль (ДОЛЖНА БЫТЬ 'teacher')
    console.log(`👤 Роль пользователя: ${user.role}, Ожидается: teacher`);
    
    if (user.role !== 'teacher') {
        console.error(`❌ Неправильная роль: ${user.role}, ожидается teacher`);
        
        // Показываем понятное сообщение
        const roleName = user.role === 'student' ? 'ученик' : 'неизвестная роль';
        const confirmRedirect = confirm(
            `Эта страница доступна только для учителей.\n\n` +
            `Вы вошли как ${roleName} (${user.full_name || user.email}).\n` +
            `Хотите перейти ${user.role === 'student' ? 'в личный кабинет ученика' : 'на главную страницу'}?`
        );
        
        if (confirmRedirect) {
            if (user.role === 'student') {
                window.location.href = 'dashboard-student.html';
            } else {
                window.location.href = 'index.html';
            }
        } else {
            window.location.href = 'index.html';
        }
        
        return null;
    }
    
    // 5. Дополнительная проверка через API (опционально)
    try {
        const { data, error } = await window.supabase
            .from('users')
            .select('id, email, role')
            .eq('id', user.id)
            .eq('role', 'teacher')
            .single();
        
        if (error || !data) {
            console.warn('⚠️ Пользователь не найден в БД или роль изменилась');
            // Можно сделать logout или показать предупреждение
        }
    } catch (apiError) {
        console.warn('⚠️ Ошибка проверки через API:', apiError);
        // Продолжаем работу, так как есть данные в localStorage
    }
    
    console.log('✅ Учитель авторизован:', user.full_name || user.email);
    return user;
}

function showAuthError(message) {
    // Создаем красивый overlay с ошибкой
    const overlay = document.createElement('div');
    overlay.id = 'authErrorOverlay';
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(231, 76, 60, 0.95);
        color: white;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        z-index: 99999;
        padding: 30px;
        text-align: center;
        font-family: Arial, sans-serif;
    `;
    
    overlay.innerHTML = `
        <div style="background: white; color: #333; padding: 30px; border-radius: 12px; max-width: 500px; box-shadow: 0 10px 30px rgba(0,0,0,0.3);">
            <h2 style="color: #e74c3c; margin-top: 0;">🚫 Ошибка доступа</h2>
            <p style="font-size: 18px; margin-bottom: 25px;">${message}</p>
            
            <div style="display: flex; gap: 15px; justify-content: center;">
                <button onclick="window.location.href='index.html'" style="
                    background: #e74c3c;
                    color: white;
                    border: none;
                    padding: 12px 25px;
                    border-radius: 8px;
                    font-size: 16px;
                    cursor: pointer;
                    font-weight: bold;
                ">
                    🔐 Перейти к входу
                </button>
                
                <button onclick="tryFixAuth()" style="
                    background: #3498db;
                    color: white;
                    border: none;
                    padding: 12px 25px;
                    border-radius: 8px;
                    font-size: 16px;
                    cursor: pointer;
                ">
                    🔧 Попробовать исправить
                </button>
            </div>
            
            <div style="margin-top: 25px; padding: 15px; background: #f8f9fa; border-radius: 8px; text-align: left; font-size: 14px;">
                <strong>Отладочная информация:</strong>
                <div id="debugInfo" style="margin-top: 10px; font-family: monospace;"></div>
            </div>
        </div>
    `;
    
    document.body.appendChild(overlay);
    
    // Добавляем отладочную информацию
    setTimeout(() => {
        const debugInfo = document.getElementById('debugInfo');
        if (debugInfo) {
            const userJson = localStorage.getItem('user');
            debugInfo.innerHTML = `
                localStorage.user: ${userJson ? 'Есть' : 'Нет'}<br>
                window.supabase: ${window.supabase ? 'Есть' : 'Нет'}<br>
                URL: ${window.location.href}
            `;
        }
    }, 100);
}

// Глобальная функция для исправления
window.tryFixAuth = function() {
    console.log('🛠️ Пытаюсь исправить авторизацию...');
    
    // 1. Очищаем localStorage
    localStorage.removeItem('user');
    localStorage.removeItem('last_login');
    
    // 2. Перезагружаем страницу
    setTimeout(() => {
        window.location.href = 'index.html';
    }, 1000);
};

function redirectToLogin() {
    setTimeout(() => {
        window.location.href = 'index.html';
    }, 2000);
}

// ========================
// ОСНОВНЫЕ ФУНКЦИИ
// ========================

function displayTeacherInfo(user) {
    const nameElement = document.getElementById('teacherName');
    if (nameElement) {
        nameElement.textContent = user.full_name || user.email || 'Учитель';
    }
    
    // Также можно заполнить другие поля
    console.log('👋 Добро пожаловать,', user.full_name);
}

function setupLogoutButton() {
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            if (confirm('Вы уверены, что хотите выйти из системы?')) {
                // Очищаем все данные
                localStorage.removeItem('user');
                localStorage.removeItem('last_login');
                localStorage.removeItem('supabase_key');
                
                // Редирект на главную
                window.location.href = 'index.html';
            }
        });
    }
}

function setupTabs() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    
    if (tabBtns.length === 0) return;
    
    tabBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const tabId = this.dataset.tab;
            
            // Обновляем активные элементы
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            
            this.classList.add('active');
            
            const targetTab = document.getElementById(tabId);
            if (targetTab) {
                targetTab.classList.add('active');
            }
            
            console.log('📌 Переключено на вкладку:', tabId);
            
            // Загружаем данные для активной вкладки
            loadTabData(tabId);
        });
    });
}

async function loadTabData(tabId) {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) return;
    
    switch(tabId) {
        case 'my-homeworks':
            await loadTeacherHomeworks(user);
            break;
        case 'students':
            await loadStudentsList();
            break;
        case 'add-test':
            await loadStudentsForTest();
            break;
    }
}

// ========================
// ЗАГРУЗКА ДАННЫХ
// ========================

async function loadInitialData(user) {
    console.log('📥 Загрузка начальных данных для учителя:', user.id);
    
    try {
        // Показываем индикатор загрузки
        showLoading(true);
        
        // 1. Загружаем статистику
        await loadStatistics(user);
        
        // 2. Загружаем список учеников (для выпадающего списка)
        await loadStudentsForTest();
        
        // 3. Загружаем домашние задания
        await loadTeacherHomeworks(user);
        
        console.log('✅ Начальные данные загружены');
        
    } catch (error) {
        console.error('❌ Ошибка загрузки начальных данных:', error);
        showError('Не удалось загрузить данные. Пожалуйста, обновите страницу.');
        
    } finally {
        showLoading(false);
    }
}

async function loadStatistics(user) {
    try {
        console.log('📊 Загрузка статистики...');
        
        // 1. Количество учеников
        const { count: studentCount, error: studentError } = await window.supabase
            .from('users')
            .select('*', { count: 'exact', head: true })
            .eq('role', 'student');
        
        if (!studentError) {
            document.getElementById('totalStudents').textContent = studentCount || 0;
        }
        
        // 2. Количество домашних заданий
        const { count: homeworkCount, error: homeworkError } = await window.supabase
            .from('homeworks')
            .select('*', { count: 'exact', head: true })
            .eq('teacher_id', user.id);
        
        if (!homeworkError) {
            document.getElementById('totalHomeworks').textContent = homeworkCount || 0;
        }
        
        // 3. Текущие задания (срок сдачи в будущем)
        const today = new Date().toISOString().split('T')[0];
        const { count: pendingCount, error: pendingError } = await window.supabase
            .from('homeworks')
            .select('*', { count: 'exact', head: true })
            .eq('teacher_id', user.id)
            .gte('due_date', today);
        
        if (!pendingError) {
            document.getElementById('pendingHomeworks').textContent = pendingCount || 0;
        }
        
        console.log('📈 Статистика загружена:', {
            students: studentCount,
            homeworks: homeworkCount,
            pending: pendingCount
        });
        
    } catch (error) {
        console.error('Ошибка загрузки статистики:', error);
    }
}

async function loadStudentsForTest() {
    const select = document.getElementById('studentSelect');
    if (!select) return;
    
    try {
        const { data: students, error } = await window.supabase
            .from('users')
            .select('id, full_name, email, class')
            .eq('role', 'student')
            .order('class')
            .order('full_name');
        
        if (error) throw error;
        
        // Сохраняем текущее значение
        const currentValue = select.value;
        
        // Обновляем список
        select.innerHTML = '<option value="">Выберите ученика...</option>';
        
        students.forEach(student => {
            const option = document.createElement('option');
            option.value = student.id;
            const displayName = student.full_name || student.email;
            const className = student.class ? ` (${student.class})` : '';
            option.textContent = `${displayName}${className}`;
            select.appendChild(option);
        });
        
        // Восстанавливаем значение если нужно
        if (currentValue && students.some(s => s.id == currentValue)) {
            select.value = currentValue;
        }
        
    } catch (error) {
        console.error('Ошибка загрузки учеников:', error);
        select.innerHTML = '<option value="">Ошибка загрузки</option>';
    }
}

async function loadTeacherHomeworks(user) {
    const container = document.getElementById('homeworksList');
    if (!container) return;
    
    try {
        container.innerHTML = '<div class="loading">Загрузка заданий...</div>';
        
        const { data: homeworks, error } = await window.supabase
            .from('homeworks')
            .select(`
                id,
                title,
                subject,
                due_date,
                file_url,
                description,
                created_at
            `)
            .eq('teacher_id', user.id)
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        // Очищаем контейнер
        container.innerHTML = '';
        
        if (!homeworks || homeworks.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div style="font-size: 48px; margin-bottom: 20px;">📭</div>
                    <h4>Нет домашних заданий</h4>
                    <p>Создайте первое задание во вкладке "Добавить ДЗ"</p>
                </div>
            `;
            return;
        }
        
        // Создаем список
        homeworks.forEach(hw => {
            const dueDate = new Date(hw.due_date);
            const today = new Date();
            const daysDiff = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
            
            let statusBadge = '';
            if (daysDiff < 0) {
                statusBadge = '<span style="background: #ffeaa7; color: #d35400; padding: 4px 10px; border-radius: 12px; font-size: 12px; margin-left: 10px;">Просрочено</span>';
            } else if (daysDiff <= 3) {
                statusBadge = '<span style="background: #ffcccc; color: #c0392b; padding: 4px 10px; border-radius: 12px; font-size: 12px; margin-left: 10px;">Срочно</span>';
            }
            
            const homeworkCard = document.createElement('div');
            homeworkCard.className = 'homework-card';
            homeworkCard.innerHTML = `
                <div class="homework-info">
                    <h4 style="margin: 0 0 8px 0;">${hw.title}</h4>
                    <div style="display: flex; gap: 15px; color: #666; font-size: 14px; flex-wrap: wrap;">
                        <span><strong>Предмет:</strong> ${hw.subject}</span>
                        <span><strong>Срок:</strong> ${dueDate.toLocaleDateString('ru-RU')}</span>
                        ${statusBadge}
                        ${hw.file_url ? '<span>📎 Есть файл</span>' : ''}
                    </div>
                    ${hw.description ? `<p style="margin-top: 10px; color: #555;">${hw.description.substring(0, 100)}${hw.description.length > 100 ? '...' : ''}</p>` : ''}
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
            <div style="color: #e74c3c; padding: 20px; text-align: center; background: #ffeaea; border-radius: 8px;">
                <h4>❌ Ошибка загрузки</h4>
                <p>Не удалось загрузить домашние задания</p>
                <button onclick="window.location.reload()" style="
                    background: #e74c3c;
                    color: white;
                    border: none;
                    padding: 8px 16px;
                    border-radius: 6px;
                    cursor: pointer;
                    margin-top: 10px;
                ">
                    Обновить страницу
                </button>
            </div>
        `;
    }
}

async function loadStudentsList() {
    const container = document.getElementById('studentsList');
    if (!container) return;
    
    try {
        container.innerHTML = '<div class="loading">Загрузка списка учеников...</div>';
        
        const { data: students, error } = await window.supabase
            .from('users')
            .select('id, full_name, email, class, created_at')
            .eq('role', 'student')
            .order('class')
            .order('full_name');
        
        if (error) throw error;
        
        container.innerHTML = '';
        
        if (!students || students.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div style="font-size: 48px; margin-bottom: 20px;">👥</div>
                    <h4>Нет учеников</h4>
                    <p>В системе пока не зарегистрировано учеников</p>
                </div>
            `;
            return;
        }
        
        // Группируем по классам
        const grouped = {};
        students.forEach(student => {
            const className = student.class || 'Без класса';
            if (!grouped[className]) {
                grouped[className] = [];
            }
            grouped[className].push(student);
        });
        
        // Отображаем по группам
        Object.keys(grouped).sort().forEach(className => {
            const groupHeader = document.createElement('div');
            groupHeader.innerHTML = `<h4 style="margin: 20px 0 10px 0; color: #2c3e50;">Класс: ${className}</h4>`;
            container.appendChild(groupHeader);
            
            grouped[className].forEach(student => {
                const studentCard = document.createElement('div');
                studentCard.style.cssText = `
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 15px;
                    background: #f8f9fa;
                    border-radius: 8px;
                    margin-bottom: 10px;
                    border-left: 4px solid #2ecc71;
                `;
                
                studentCard.innerHTML = `
                    <div>
                        <strong>${student.full_name || student.email}</strong><br>
                        <small>${student.email}</small><br>
                        <small style="color: #666;">Зарегистрирован: ${new Date(student.created_at).toLocaleDateString('ru-RU')}</small>
                    </div>
                    <div>
                        <button onclick="viewStudent(${student.id})" style="
                            padding: 6px 12px;
                            background: #3498db;
                            color: white;
                            border: none;
                            border-radius: 6px;
                            cursor: pointer;
                            font-size: 13px;
                        ">
                            👁️ Профиль
                        </button>
                    </div>
                `;
                
                container.appendChild(studentCard);
            });
        });
        
    } catch (error) {
        console.error('Ошибка загрузки списка учеников:', error);
        container.innerHTML = `
            <div style="color: #e74c3c; text-align: center; padding: 20px;">
                ❌ Не удалось загрузить список учеников
            </div>
        `;
    }
}

// ========================
// ФОРМЫ
// ========================

function setupForms(user) {
    // Форма добавления ДЗ
    const homeworkForm = document.getElementById('addHomeworkForm');
    if (homeworkForm) {
        // Устанавливаем минимальную дату - сегодня
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
    
    // Форма добавления результатов теста
    const testForm = document.getElementById('addTestForm');
    if (testForm) {
        // Устанавливаем сегодняшнюю дату по умолчанию
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
    
    // Собираем данные
    const homeworkData = {
        title: document.getElementById('title').value.trim(),
        subject: document.getElementById('subject').value,
        due_date: document.getElementById('dueDate').value,
        description: document.getElementById('description').value.trim(),
        file_url: document.getElementById('fileUrl').value.trim() || null,
        teacher_id: user.id,
        created_at: new Date().toISOString()
    };
    
    // Валидация
    if (!homeworkData.title || !homeworkData.subject || !homeworkData.due_date) {
        showFormMessage('Заполните все обязательные поля', 'error', messageEl);
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
        showFormMessage('✅ Домашнее задание успешно создано!', 'success', messageEl);
        
        // Очищаем форму
        form.reset();
        
        // Устанавливаем дату по умолчанию
        const dueDateInput = document.getElementById('dueDate');
        if (dueDateInput) {
            const today = new Date().toISOString().split('T')[0];
            dueDateInput.value = today;
        }
        
        // Обновляем данные
        await loadTeacherHomeworks(user);
        await loadStatistics(user);
        
        // Автопереключение на вкладку с заданиями через 2 секунды
        setTimeout(() => {
            const myHomeworksTab = document.querySelector('[data-tab="my-homeworks"]');
            if (myHomeworksTab) {
                myHomeworksTab.click();
            }
        }, 2000);
        
    } catch (error) {
        console.error('Ошибка создания ДЗ:', error);
        showFormMessage(`❌ Ошибка: ${error.message}`, 'error', messageEl);
        
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
    const score = parseInt(document.getElementById('score').value);
    const maxScore = parseInt(document.getElementById('maxScore').value);
    
    // Валидация
    if (!studentId) {
        alert('Выберите ученика');
        return;
    }
    
    if (isNaN(score) || score < 0) {
        alert('Введите корректные баллы');
        return;
    }
    
    if (isNaN(maxScore) || maxScore <= 0) {
        alert('Введите корректный максимальный балл');
        return;
    }
    
    if (score > maxScore) {
        alert('Баллы не могут превышать максимальный балл');
        return;
    }
    
    // Собираем данные
    const testData = {
        student_id: parseInt(studentId),
        subject: document.getElementById('testSubject').value,
        test_name: document.getElementById('testName').value.trim(),
        score: score,
        max_score: maxScore,
        test_date: document.getElementById('testDate').value || new Date().toISOString().split('T')[0]
    };
    
    try {
        // Показываем загрузку
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = '⏳ Сохранение...';
        submitBtn.disabled = true;
        
        // Отправляем данные
        const { data, error } = await window.supabase
            .from('test_results')
            .insert([testData]);
        
        if (error) throw error;
        
        // Успех
        alert('✅ Результат теста успешно сохранен!');
        
        // Очищаем форму (кроме ученика и даты)
        document.getElementById('testName').value = '';
        document.getElementById('score').value = '';
        document.getElementById('maxScore').value = '100';
        
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

// ========================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ========================

function showLoading(show) {
    const loader = document.getElementById('globalLoader');
    if (loader) {
        loader.style.display = show ? 'block' : 'none';
    }
}

function showError(message) {
    // Можно реализовать toast-уведомления
    console.error('❌ Ошибка:', message);
    
    // Временное решение - alert
    if (!window.errorShown) {
        alert(`Ошибка: ${message}`);
        window.errorShown = true;
        setTimeout(() => { window.errorShown = false; }, 3000);
    }
}

function showFormMessage(text, type, element) {
    if (!element) return;
    
    element.textContent = text;
    element.style.display = 'block';
    element.style.color = type === 'success' ? '#27ae60' : '#e74c3c';
    element.style.padding = '12px';
    element.style.borderRadius = '8px';
    element.style.backgroundColor = type === 'success' ? '#d1f7c4' : '#ffeaea';
    element.style.marginTop = '15px';
    element.style.border = `2px solid ${type === 'success' ? '#27ae60' : '#e74c3c'}`;
    
    // Автоматически скрыть через 5 секунд
    setTimeout(() => {
        element.style.display = 'none';
    }, 5000);
}

// ========================
// ГЛОБАЛЬНЫЕ ФУНКЦИИ
// ========================

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
    alert(`Просмотр профиля ученика ID: ${studentId}\n\nЭта функция будет реализована в следующем обновлении.`);
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