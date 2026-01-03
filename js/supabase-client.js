// SUPABASE CONFIGURATION
const SUPABASE_URL = 'https://potnqqwsaxnrrnuhoysb.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBvdG5xcXdzYXhucnJudWhveXNiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcwNzk1OTcsImV4cCI6MjA4MjY1NTU5N30._rjY-bDj3-eaymenBC1lge0z1YLshCEzV8KDJQRKxBQ';

try {
    window.supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false
        }
    });
    console.log('✅ Supabase клиент инициализирован');
} catch (error) {
    console.error('❌ Ошибка инициализации Supabase:', error);
    showAlert('Ошибка подключения к базе данных');
}

function showAlert(message, type = 'error') {
    const alert = document.createElement('div');
    alert.className = `global-alert alert-${type}`;
    alert.textContent = message;
    alert.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        background: ${type === 'error' ? '#f44336' : '#4caf50'};
        color: white;
        border-radius: 8px;
        z-index: 9999;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        animation: slideIn 0.3s ease;
    `;
    
    document.body.appendChild(alert);
    
    setTimeout(() => {
        alert.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => document.body.removeChild(alert), 300);
    }, 3000);
}

// Добавляем стили для анимации
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(style);

window.showAlert = showAlert;