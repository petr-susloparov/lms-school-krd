// ========================
// STUDENT DASHBOARD LOGIC - ПОЛНАЯ ВЕРСИЯ
// ========================

document.addEventListener('DOMContentLoaded', async function() {
    console.log('👨‍🎓 Загружен личный кабинет ученика');
    
    // 1. Проверяем авторизацию
    const user = await checkAuthorization();
    if (!user) return;
    
    // 2. Заполняем информацию об ученике
    displayStudentInfo(user);
    
    // 3. Настраиваем кнопку выхода
    setupLogoutButton();
    
    // 4. Загружаем данные
    await loadStudentData(user);
    
    // 5. Настраиваем кнопки действий
    setupActionButtons();
});

// ========================
// АВТОРИЗАЦИЯ И БЕЗОПАСНОСТЬ
// ========================

async function checkAuthorization() {
    console.log('🔐 Проверка авторизации ученика...');
    
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
    
    // 4. Проверяем роль (ДОЛЖНА БЫТЬ 'student')
    console.log(`👤 Роль пользователя: ${user.role}, Ожидается: student`);
    
    if (user.role !== 'student') {
        console.error(`❌ Неправильная роль: ${user.role}, ожидается student`);
        
        // Показываем понятное сообщение
        const roleName = user.role === 'teacher' ? 'учитель' : 'неизвестная роль';
        const confirmRedirect = confirm(
            `Эта страница доступна только для учеников.\n\n` +
            `Вы вошли как ${roleName} (${user.full_name || user.email}).\n` +
            `Хотите перейти ${user.role === 'teacher' ? 'в панель учителя' : 'на главную страницу'}?`
        );
        
        if (confirmRedirect) {
            if (user.role === 'teacher') {
                window.location.href = 'dashboard-teacher.html';
            } else {
                window.location.href = 'index.html';
            }
        } else {
            window.location.href = 'index.html';
        }
        
        return null;
    }
    
    // 5. Дополнительная проверка через API
    try {
        const { data, error } = await window.supabase
            .from('users')
            .select('id, email, role, class')
            .eq('id', user.id)
            .eq('role', 'student')
            .single();
        
        if (error || !data) {
            console.warn('⚠️ Ученик не найден в БД или роль изменилась');
            // Обновляем данные из БД если есть
            if (data) {
                Object.assign(user, data);
                localStorage.setItem('user', JSON.stringify(user));
            }
        }
    } catch (apiError) {
        console.warn('⚠️ Ошибка проверки через API:', apiError);
    }
    
    console.log('✅ Ученик авторизован:', user.full_name || user.email);
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
        background: rgba(52, 152, 219, 0.95);
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
            <h2 style="color: #3498db; margin-top: 0;">🚫 Ошибка доступа</h2>
            <p style="font-size: 18px; margin-bottom: 25px;">${message}</p>
            
            <div style="display: flex; gap: 15px; justify-content: center;">
                <button onclick="window.location.href='index.html'" style="
                    background: #3498db;
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
                    background: #2ecc71;
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
                localStorage.user: ${userJson ? 'Есть (' + JSON.parse(userJson).role + ')' : 'Нет'}<br>
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

function displayStudentInfo(user) {
    // Заполняем имя
    const nameElement = document.getElementById('studentName');
    if (nameElement) {
        nameElement.textContent = user.full_name || user.email || 'Ученик';
    }
    
    // Заполняем класс
    const classElement = document.getElementById('studentClass');
    if (classElement) {
        classElement.textContent = user.class || 'Не указан';
    }
    
    console.log('👋 Добро пожаловать,', user.full_name || user.email);
}

function setupLogoutButton() {
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            if (confirm('Вы уверены, что хотите выйти из системы?')) {
                // Очищаем все данные
                localStorage.removeItem('user');
                localStorage.removeItem('last_login');
                
                // Редирект на главную
                window.location.href = 'index.html';
            }
        });
    }
}

function setupActionButtons() {
    // Кнопка обновления данных
    const refreshBtn = document.querySelector('[onclick*="refreshData"]');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', refreshData);
    }
    
    // Кнопка "Все задания"
    const allHomeworksBtn = document.querySelector('[onclick*="showAllHomeworks"]');
    if (allHomeworksBtn) {
        allHomeworksBtn.addEventListener('click', showAllHomeworks);
    }
    
    // Кнопка "Статистика"
    const statsBtn = document.querySelector('[onclick*="showStatistics"]');
    if (statsBtn) {
        statsBtn.addEventListener('click', showStatistics);
    }
    
    // Кнопка "На главную"
    const homeBtn = document.querySelector('[onclick*="window.location.href=\'index.html\'"]');
    if (homeBtn) {
        homeBtn.addEventListener('click', () => {
            window.location.href = 'index.html';
        });
    }
}

// ========================
// ЗАГРУЗКА ДАННЫХ
// ========================

async function loadStudentData(user) {
    console.log('📥 Загрузка данных для ученика:', user.id);
    
    try {
        // Показываем индикаторы загрузки
        showLoadingStates();
        
        // 1. Загружаем домашние задания
        await loadHomeworks(user);
        
        // 2. Загружаем результаты тестов
        await loadTestResults(user);
        
        // 3. Загружаем дедлайны
        await loadDeadlines(user);
        
        console.log('✅ Все данные загружены');
        
    } catch (error) {
        console.error('❌ Ошибка загрузки данных:', error);
        showError('Не удалось загрузить данные. Пожалуйста, обновите страницу.');
    }
}

async function loadHomeworks(user) {
    const container = document.getElementById('homeworksList');
    if (!container) return;
    
    try {
        console.log('📚 Загрузка домашних заданий...');
        
        // Получаем домашние задания
        const { data: homeworks, error } = await window.supabase
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
            .order('due_date', { ascending: true })
            .limit(10);
        
        if (error) throw error;
        
        // Очищаем контейнер
        container.innerHTML = '';
        
        if (!homeworks || homeworks.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div style="font-size: 48px; margin-bottom: 20px;">📭</div>
                    <h4>Нет домашних заданий</h4>
                    <p>На данный момент нет активных заданий</p>
                </div>
            `;
            return;
        }
        
        // Отображаем задания
        homeworks.forEach(hw => {
            const dueDate = new Date(hw.due_date);
            const today = new Date();
            const daysDiff = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
            
            let statusClass = 'homework-item';
            let statusText = '';
            let statusColor = '';
            
            if (daysDiff < 0) {
                statusClass += ' late';
                statusText = 'Просрочено';
                statusColor = '#e74c3c';
            } else if (daysDiff <= 3) {
                statusClass += ' upcoming';
                statusText = 'Срочно';
                statusColor = '#f39c12';
            } else {
                statusColor = '#3498db';
            }
            
            const homeworkItem = document.createElement('div');
            homeworkItem.className = statusClass;
            homeworkItem.style.cssText = `
                border-left: 4px solid ${statusColor};
                padding: 18px;
                margin-bottom: 18px;
                background: ${daysDiff < 0 ? '#fff5f5' : (daysDiff <= 3 ? '#fff9e6' : '#f8fafc')};
                border-radius: 0 8px 8px 0;
            `;
            
            homeworkItem.innerHTML = `
                <h4 style="margin: 0 0 8px 0; color: #2c3e50;">${hw.title}</h4>
                <p style="margin: 5px 0; color: #666;">
                    <strong>Предмет:</strong> ${hw.subject}<br>
                    <strong>Срок сдачи:</strong> ${dueDate.toLocaleDateString('ru-RU')}
                    ${statusText ? ` <span style="background: ${statusColor}; color: white; padding: 2px 8px; border-radius: 12px; font-size: 12px; margin-left: 10px;">${statusText}</span>` : ''}<br>
                    <strong>Учитель:</strong> ${hw.users?.full_name || 'Не указан'}
                </p>
                ${hw.description ? `<p style="margin: 10px 0; color: #555; padding: 10px; background: white; border-radius: 6px;">${hw.description}</p>` : ''}
                ${hw.file_url ? `
                    <a href="${hw.file_url}" class="file-link" target="_blank" rel="noopener" style="
                        display: inline-block;
                        background: #3498db;
                        color: white;
                        padding: 8px 18px;
                        border-radius: 6px;
                        text-decoration: none;
                        margin-top: 12px;
                        font-weight: 500;
                    ">
                        📎 Скачать задание
                    </a>
                ` : ''}
            `;
            
            container.appendChild(homeworkItem);
        });
        
    } catch (error) {
        console.error('Ошибка загрузки домашних заданий:', error);
        container.innerHTML = `
            <div style="color: #e74c3c; padding: 20px; text-align: center; background: #ffeaea; border-radius: 8px;">
                <h4>❌ Ошибка загрузки</h4>
                <p>Не удалось загрузить домашние задания</p>
                <button onclick="loadStudentData(JSON.parse(localStorage.getItem('user')))" style="
                    background: #e74c3c;
                    color: white;
                    border: none;
                    padding: 8px 16px;
                    border-radius: 6px;
                    cursor: pointer;
                    margin-top: 10px;
                ">
                    Повторить попытку
                </button>
            </div>
        `;
    }
}

async function loadTestResults(user) {
    const container = document.getElementById('testResults');
    if (!container) return;
    
    try {
        console.log('📊 Загрузка результатов тестов...');
        
        // Получаем результаты тестов
        const { data: results, error } = await window.supabase
            .from('test_results')
            .select('*')
            .eq('student_id', user.id)
            .order('test_date', { ascending: false })
            .limit(6);
        
        if (error) throw error;
        
        // Очищаем контейнер
        container.innerHTML = '';
        
        if (!results || results.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div style="font-size: 48px; margin-bottom: 20px;">📊</div>
                    <h4>Нет результатов</h4>
                    <p>Результаты тестов пока отсутствуют</p>
                </div>
            `;
            return;
        }
        
        // Создаем сетку статистики
        const statsGrid = document.createElement('div');
        statsGrid.style.cssText = `
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 15px;
            margin-top: 20px;
        `;
        
        results.forEach(result => {
            const percentage = Math.round((result.score / result.max_score) * 100);
            let color = '#3498db'; // Синий по умолчанию
            
            if (percentage >= 80) {
                color = '#27ae60'; // Зеленый
            } else if (percentage >= 60) {
                color = '#f39c12'; // Оранжевый
            } else {
                color = '#e74c3c'; // Красный
            }
            
            const statBox = document.createElement('div');
            statBox.style.cssText = `
                text-align: center;
                padding: 20px 15px;
                background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
                border-radius: 8px;
                border: 1px solid #e0e6ed;
            `;
            
            statBox.innerHTML = `
                <div style="font-size: 28px; font-weight: bold; color: ${color}; margin-bottom: 5px;">
                    ${result.score}/${result.max_score}
                </div>
                <div style="font-weight: 600; color: #2c3e50;">${result.subject}</div>
                <div style="font-size: 12px; color: #7f8c8d;">${result.test_name}</div>
                <div style="font-size: 11px; color: #95a5a6; margin-top: 5px;">
                    ${new Date(result.test_date).toLocaleDateString('ru-RU')}
                </div>
                <div style="margin-top: 8px; font-size: 12px; color: ${color}; font-weight: bold;">
                    ${percentage}%
                </div>
            `;
            
            statsGrid.appendChild(statBox);
        });
        
        container.appendChild(statsGrid);
        
    } catch (error) {
        console.error('Ошибка загрузки результатов тестов:', error);
        container.innerHTML = `
            <div style="color: #e74c3c; text-align: center; padding: 20px;">
                ❌ Не удалось загрузить результаты тестов
            </div>
        `;
    }
}

async function loadDeadlines(user) {
    const tbody = document.getElementById('deadlinesTable');
    if (!tbody) return;
    
    try {
        console.log('📅 Загрузка дедлайнов...');
        
        // Получаем ближайшие дедлайны
        const { data: homeworks, error } = await window.supabase
            .from('homeworks')
            .select('id, title, subject, due_date')
            .order('due_date', { ascending: true })
            .limit(8);
        
        if (error) throw error;
        
        // Очищаем таблицу
        tbody.innerHTML = '';
        
        if (!homeworks || homeworks.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" style="text-align: center; padding: 40px; color: #7f8c8d;">
                        <div style="font-size: 48px; margin-bottom: 20px;">📅</div>
                        <h4>Нет предстоящих дедлайнов</h4>
                    </td>
                </tr>
            `;
            return;
        }
        
        // Заполняем таблицу
        homeworks.forEach(hw => {
            const dueDate = new Date(hw.due_date);
            const today = new Date();
            const daysDiff = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
            
            let status = '';
            let statusClass = '';
            let statusColor = '';
            
            if (daysDiff < 0) {
                status = 'Просрочено';
                statusClass = 'status-late';
                statusColor = '#e74c3c';
            } else if (daysDiff === 0) {
                status = 'Сегодня';
                statusClass = 'status-urgent';
                statusColor = '#f39c12';
            } else if (daysDiff <= 3) {
                status = `Через ${daysDiff} дня`;
                statusClass = 'status-urgent';
                statusColor = '#f39c12';
            } else {
                status = `Через ${daysDiff} дней`;
                statusClass = 'status-normal';
                statusColor = '#27ae60';
            }
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td style="padding: 15px; border-bottom: 1px solid #e0e6ed;">${hw.subject}</td>
                <td style="padding: 15px; border-bottom: 1px solid #e0e6ed;">${hw.title}</td>
                <td style="padding: 15px; border-bottom: 1px solid #e0e6ed;">${dueDate.toLocaleDateString('ru-RU')}</td>
                <td style="padding: 15px; border-bottom: 1px solid #e0e6ed;">
                    <span style="
                        padding: 5px 12px;
                        border-radius: 20px;
                        font-size: 12px;
                        font-weight: 600;
                        background: ${statusColor}20;
                        color: ${statusColor};
                        border: 1px solid ${statusColor}40;
                    ">
                        ${status}
                    </span>
                </td>
                <td style="padding: 15px; border-bottom: 1px solid #e0e6ed;">
                    <button onclick="viewHomeworkDetails(${hw.id})" style="
                        padding: 5px 10px;
                        background: #3498db;
                        color: white;
                        border: none;
                        border-radius: 6px;
                        cursor: pointer;
                        font-size: 12px;
                    ">
                        👁️ Посмотреть
                    </button>
                </td>
            `;
            
            tbody.appendChild(row);
        });
        
    } catch (error) {
        console.error('Ошибка загрузки дедлайнов:', error);
        tbody.innerHTML = `
            <tr>
                <td colspan="5" style="color: #e74c3c; text-align: center; padding: 20px;">
                    ❌ Не удалось загрузить дедлайны
                </td>
            </tr>
        `;
    }
}

// ========================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ========================

function showLoadingStates() {
    // Устанавливаем состояние загрузки для всех контейнеров
    const containers = {
        'homeworksList': 'Загрузка заданий...',
        'testResults': 'Загрузка результатов...',
        'deadlinesTable': 'Загрузка дедлайнов...'
    };
    
    Object.entries(containers).forEach(([id, text]) => {
        const container = document.getElementById(id);
        if (container) {
            if (id === 'deadlinesTable') {
                const row = document.createElement('tr');
                row.innerHTML = `<td colspan="5" style="text-align: center; padding: 30px; color: #7f8c8d;">
                    <div style="display: inline-block; width: 20px; height: 20px; border: 3px solid #f3f3f3; border-top: 3px solid #3498db; border-radius: 50%; animation: spin 1s linear infinite; margin-right: 10px;"></div>
                    ${text}
                </td>`;
                container.innerHTML = '';
                container.appendChild(row);
            } else {
                container.innerHTML = `
                    <div style="text-align: center; padding: 40px; color: #7f8c8d;">
                        <div style="display: inline-block; width: 20px; height: 20px; border: 3px solid #f3f3f3; border-top: 3px solid #3498db; border-radius: 50%; animation: spin 1s linear infinite; margin-right: 10px;"></div>
                        ${text}
                    </div>
                `;
            }
        }
    });
    
    // Добавляем CSS для анимации
    if (!document.querySelector('#loadingStyles')) {
        const style = document.createElement('style');
        style.id = 'loadingStyles';
        style.textContent = `
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        `;
        document.head.appendChild(style);
    }
}

function showError(message) {
    // Создаем toast-уведомление
    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #e74c3c;
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        z-index: 10000;
        max-width: 400px;
        box-shadow: 0 5px 15px rgba(0,0,0,0.2);
        animation: slideIn 0.3s ease;
    `;
    
    toast.innerHTML = `
        <strong>❌ Ошибка:</strong> ${message}
        <button onclick="this.parentElement.remove()" style="
            background: transparent;
            color: white;
            border: none;
            float: right;
            cursor: pointer;
            font-size: 18px;
            margin-left: 10px;
        ">
            ×
        </button>
    `;
    
    document.body.appendChild(toast);
    
    // Автоматически удаляем через 5 секунд
    setTimeout(() => {
        if (toast.parentElement) {
            toast.remove();
        }
    }, 5000);
    
    // Добавляем CSS для анимации
    if (!document.querySelector('#toastStyles')) {
        const style = document.createElement('style');
        style.id = 'toastStyles';
        style.textContent = `
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
        `;
        document.head.appendChild(style);
    }
}

// ========================
// ГЛОБАЛЬНЫЕ ФУНКЦИИ
// ========================

window.refreshData = async function() {
    console.log('🔄 Обновление данных...');
    
    const user = JSON.parse(localStorage.getItem('user'));
    if (user) {
        await loadStudentData(user);
        showToast('✅ Данные обновлены', 'success');
    } else {
        showToast('❌ Не удалось обновить данные', 'error');
    }
};

window.showAllHomeworks = function() {
    showToast('📋 Функция "Все задания" в разработке', 'info');
};

window.showStatistics = function() {
    showToast('📈 Функция "Статистика" в разработке', 'info');
};

window.viewHomeworkDetails = function(homeworkId) {
    showToast(`👁️ Просмотр задания ID: ${homeworkId}`, 'info');
};

// Вспомогательная функция для toast
function showToast(message, type = 'info') {
    const colors = {
        'success': '#27ae60',
        'error': '#e74c3c',
        'info': '#3498db',
        'warning': '#f39c12'
    };
    
    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: ${colors[type]};
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        z-index: 10000;
        max-width: 400px;
        box-shadow: 0 5px 15px rgba(0,0,0,0.2);
        animation: slideInUp 0.3s ease;
    `;
    
    toast.innerHTML = `
        ${message}
        <button onclick="this.parentElement.remove()" style="
            background: transparent;
            color: white;
            border: none;
            float: right;
            cursor: pointer;
            font-size: 18px;
            margin-left: 10px;
        ">
            ×
        </button>
    `;
    
    document.body.appendChild(toast);
    
    // Автоматически удаляем через 3 секунды
    setTimeout(() => {
        if (toast.parentElement) {
            toast.remove();
        }
    }, 3000);
    
    // Добавляем CSS для анимации
    if (!document.querySelector('#toastUpStyles')) {
        const style = document.createElement('style');
        style.id = 'toastUpStyles';
        style.textContent = `
            @keyframes slideInUp {
                from { transform: translateY(100%); opacity: 0; }
                to { transform: translateY(0); opacity: 1; }
            }
        `;
        document.head.appendChild(style);
    }
}

// Экспорт для тестирования
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        checkAuthorization,
        loadStudentData,
        loadHomeworks,
        loadTestResults,
        loadDeadlines
    };
}