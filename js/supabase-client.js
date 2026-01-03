// Инициализация Supabase
const SUPABASE_URL = 'https://potnqqwsaxnrrnuhoysb.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBvdG5xcXdzYXhucnJudWhveXNiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcwNzk1OTcsImV4cCI6MjA4MjY1NTU5N30._rjY-bDj3-eaymenBC1lge0z1YLshCEzV8KDJQRKxBQ';

try {
    window.supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log('✅ Supabase клиент инициализирован');
} catch (error) {
    console.error('❌ Ошибка инициализации Supabase:', error);
    showErrorMessage('Ошибка подключения к базе данных');
}

function showErrorMessage(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'global-error';
    errorDiv.textContent = message;
    errorDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #e74c3c;
        color: white;
        padding: 15px;
        border-radius: 8px;
        z-index: 10000;
    `;
    document.body.appendChild(errorDiv);
    setTimeout(() => errorDiv.remove(), 5000);
}