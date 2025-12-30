// ========================
// SUPABASE CONFIGURATION
// ========================

// ⚠️ ВАЖНО: Замените эти значения на свои!
const SUPABASE_URL = 'https://potnqqwsaxnrrnuhoysb.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBvdG5xcXdzYXhucnJudWhveXNiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcwNzk1OTcsImV4cCI6MjA4MjY1NTU5N30._rjY-bDj3-eaymenBC1lge0z1YLshCEzV8KDJQRKxBQ'; // Из Dashboard → Settings → API

// Проверяем наличие обязательных значений
if (!SUPABASE_URL || SUPABASE_URL.includes('ваш-project-id')) {
    console.error('❌ ОШИБКА: Не задан SUPABASE_URL');
    alert('Ошибка конфигурации: не задан URL Supabase');
}

if (!SUPABASE_ANON_KEY || SUPABASE_ANON_KEY.includes('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBvdG5xcXdzYXhucnJudWhveXNiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcwNzk1OTcsImV4cCI6MjA4MjY1NTU5N30._rjY-bDj3-eaymenBC1lge0z1YLshCEzV8KDJQRKxBQ')) {
    console.error('❌ ОШИБКА: Не задан SUPABASE_ANON_KEY');
    alert('Ошибка конфигурации: не задан ключ Supabase. Получите его в Dashboard → Settings → API → "anon public"');
}

// Создаем глобальный клиент Supabase
try {
    window.supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log('✅ Supabase клиент инициализирован');
    console.log('📡 URL:', SUPABASE_URL);
    console.log('🔑 Длина ключа:', SUPABASE_ANON_KEY.length);
} catch (error) {
    console.error('💥 Ошибка инициализации Supabase:', error);
    alert('Критическая ошибка: не удалось инициализировать базу данных');
}

// Экспортируем для использования в других модулях
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { supabase: window.supabase };
}