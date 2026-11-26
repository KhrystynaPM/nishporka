// Нишпорка — налаштування підключення до бази Supabase.
//
// Обидва значення ПУБЛІЧНІ: їх і так бачить кожен, хто відкриє сайт.
// Publishable key дає лише ті права, які дозволяє політика в базі (RLS).
//
// ⚠️ Сюди НІКОЛИ не можна класти secret key (sb_secret_…) чи пароль бази:
// вони дають повний доступ до бази в обхід усіх правил.

const SUPABASE_URL = 'https://bjfnkgwnbpddlxkwgyzg.supabase.co';
const SUPABASE_KEY = 'ВСТАВТЕ_PUBLISHABLE_KEY';
