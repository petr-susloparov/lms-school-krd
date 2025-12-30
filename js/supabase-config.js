// Конфигурация Supabase
const SUPABASE_URL = 'https://potnqqwsaxnrrnuhoysb.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_3MylWTVrctgP1TxRy_ykSw_PlOlO23l';

// Инициализация клиента
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

console.log('Supabase клиент инициализирован');