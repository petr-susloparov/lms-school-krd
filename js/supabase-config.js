// === SUPABASE CONFIGURATION ===
// 🔒 ВАЖНО: Используйте ключ из Dashboard -> Settings -> API -> "anon public"
// Ключ должен начинаться с: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

// Ваш Project URL (без изменений)
const SUPABASE_URL = 'https://potnqqwsaxnrrnuhoysb.supabase.co';

// ⚠️ ЗАМЕНИТЕ ЭТОТ КЛЮЧ НА НОВЫЙ ИЗ DASHBOARD!
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBvdG5xcXdzYXhucnJudWhveXNiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcwNzk1OTcsImV4cCI6MjA4MjY1NTU5N30._rjY-bDj3-eaymenBC1lge0z1YLshCEzV8KDJQRKxBQ';

// Проверка ключа при загрузке
if (!SUPABASE_ANON_KEY || SUPABASE_ANON_KEY.length < 50) {
  console.error('❌ ОШИБКА: Неверный Supabase ключ!');
  console.log('Получите новый ключ: Dashboard → Settings → API → "anon public"');
}

// Инициализация клиента
try {
  const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  window.supabase = supabase;
  
  console.log('✅ Supabase инициализирован');
  console.log('   URL:', SUPABASE_URL);
  console.log('   Key length:', SUPABASE_ANON_KEY.length);
  
  // Автопроверка подключения
  setTimeout(async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('count')
        .limit(1);
      
      if (error) {
        console.warn('⚠️ Предупреждение подключения:', error.message);
      } else {
        console.log('✅ Подключение к БД: УСПЕХ');
      }
    } catch (e) {
      console.warn('⚠️ Ошибка теста подключения:', e.message);
    }
  }, 1000);
  
} catch (error) {
  console.error('❌ Ошибка инициализации Supabase:', error);
}