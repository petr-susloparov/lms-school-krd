// ========================
// SUPABASE CONFIGURATION
// ========================

// ⚠️ ЗАМЕНИТЕ ЭТИ КЛЮЧИ НА СВОИ!
const SUPABASE_URL = 'https://potnqqwsaxnrrnuhoysb.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBvdG5xcXdzYXhucnJudWhveXNiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcwNzk1OTcsImV4cCI6MjA4MjY1NTU5N30._rjY-bDj3-eaymenBC1lge0z1YLshCEzV8KDJQRKxBQ';

// Инициализация клиента
try {
    window.supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log('✅ Supabase клиент инициализирован');
} catch (error) {
    console.error('❌ Ошибка инициализации Supabase:', error);
    alert('Ошибка подключения к базе данных. Пожалуйста, обновите страницу.');
}