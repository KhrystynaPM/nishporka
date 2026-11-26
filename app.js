// Нишпорка — логіка сторінки.
// 1) Обираємо вигляд «телефон» або «ноутбук».
// 2) Беремо список подорожей з бази Supabase і малюємо картки (крок K2).
// Адреса бази й ключ лежать у config.js.

const app = document.getElementById('app');
const headerSlogan = document.querySelector('.bar .slogan');
const phoneSlogan = document.getElementById('slogan-sm');
const titleRow = document.getElementById('titlerow');
const countText = document.getElementById('count');
const createBtn = document.getElementById('create-btn');
const tripsBox = document.getElementById('trips');
const phone = window.matchMedia('(max-width: 700px)');

// Тут зберігаємо подорожі, які вже прийшли з бази.
// null — ще завантажуємо; 'error' — не вдалося; масив — усе добре.
let trips = null;

// ---------- 1. Вигляд «телефон / ноутбук» ----------

function applyLayout() {
  const isPhone = phone.matches;
  app.classList.toggle('sm', isPhone);
  app.classList.toggle('lg', !isPhone);
  // Слоган: на ноутбуці — у шапці, на телефоні — над заголовком (як у макеті).
  show(headerSlogan, !isPhone);
  phoneSlogan.style.display = isPhone ? 'inline-block' : 'none';
  // На телефоні кнопка «Створити подорож» на всю ширину під заголовком.
  createBtn.classList.toggle('full', isPhone);
  titleRow.style.marginBottom = isPhone ? '20px' : '';
  // Картки на телефоні й ноутбуці різні, тож малюємо їх наново.
  render();
}

// ---------- 2. Читаємо подорожі з бази ----------

async function loadTrips() {
  // Звертаємося до таблиці trips через інтернет (REST API Supabase).
  // select=… — які поля взяти; order=id.asc — у порядку додавання.
  try {
    const url = SUPABASE_URL + '/rest/v1/trips?select=id,title,location,start_date,end_date&order=id.asc';
    const response = await fetch(url, { headers: { apikey: SUPABASE_KEY } });
    if (!response.ok) throw new Error('Supabase відповів кодом ' + response.status);
    trips = await response.json();
  } catch (err) {
    // Причину пишемо в консоль браузера — для розробника. Користувачу — простий текст.
    console.error('Не вдалося завантажити подорожі:', err);
    trips = 'error';
  }
  render();
}

// ---------- 3. Малюємо екран ----------

function render() {
  if (trips === null) {
    countText.textContent = 'Завантажуємо подорожі…';
    tripsBox.innerHTML = '';
    return;
  }

  if (trips === 'error') {
    countText.textContent = '';
    tripsBox.innerHTML =
      '<div class="card bigempty">' +
      '<h2>Не вдалося завантажити подорожі</h2>' +
      '<p>Перевірте інтернет і оновіть сторінку.</p>' +
      '</div>';
    return;
  }

  // Порожній список: за макетом Empty-Trips ховаємо лічильник і верхню кнопку,
  // а кнопку показуємо всередині великої картки.
  const isEmpty = trips.length === 0;
  show(countText, !isEmpty);
  show(createBtn, !isEmpty);
  if (isEmpty) {
    tripsBox.innerHTML = emptyCard();
    return;
  }

  countText.textContent = countLabel(trips.length);
  const cards = trips.map((trip, i) => tripCard(trip, i)).join('');
  // Ноутбук — сітка в 3 колонки; телефон — список одна під одною.
  tripsBox.innerHTML = '<div class="' + (phone.matches ? 'stack' : 'grid3') + '">' + cards + '</div>';
}

// Картка однієї подорожі: назва, локація, дати (вимоги §4.1).
function tripCard(trip, i) {
  // Кольори кружечків по черзі: фіолетовий, рожевий, оранжевий — як у макеті.
  const color = ['t-violet', 't-pink', 't-orange'][i % 3];
  const name = '<div class="trip-name">' + safe(trip.title || 'Без назви') + '</div>';
  // Поля в базі необовʼязкові, тож рядок показуємо, лише якщо є що показати.
  const place = trip.location ? '<div class="meta">' + ICON_PIN + safe(trip.location) + '</div>' : '';
  const dates = dateRange(trip.start_date, trip.end_date);
  const when = dates ? '<div class="meta">' + ICON_CAL + dates + '</div>' : '';

  // Відкриття подорожі (Екран 2) зʼявиться на кроці K5, тому поки це не посилання.
  if (phone.matches) {
    return '<div class="card trip">' +
      '<div class="stamp ' + color + '" style="width:52px;height:52px">' + icon(ICON_PLANE, 26) + '</div>' +
      '<div class="tbody">' + name + place + when + '</div>' +
      ICON_CHEV +
      '</div>';
  }
  return '<div class="card trip">' +
    '<div class="trip-top"><div class="stamp ' + color + '" style="width:48px;height:48px">' + icon(ICON_PLANE, 24) + '</div>' + name + '</div>' +
    place + when +
    '<div class="open">Відкрити' + ICON_ARROW + '</div>' +
    '</div>';
}

function emptyCard() {
  const big = phone.matches ? 80 : 96;
  return '<div class="card bigempty">' +
    '<div class="spark"><div class="stamp t-violet" style="width:' + big + 'px;height:' + big + 'px">' + icon(ICON_BAG, phone.matches ? 38 : 44) + '</div>' +
    '<i style="width:14px;height:14px;right:-10px;top:6px;background:#FF9440"></i>' +
    '<i style="width:10px;height:10px;left:-12px;bottom:10px;background:#F06292"></i>' +
    '<i style="width:8px;height:8px;right:2px;bottom:-8px;background:#6D3FC9;opacity:.5"></i></div>' +
    '<h2>Створіть першу подорож</h2>' +
    '<p>Тут зʼявлятимуться всі ваші подорожі — зі справами, речами, бюджетом і місцями, які хочеться відвідати.</p>' +
    '<button type="button" class="btn btn-orange' + (phone.matches ? ' full' : '') + '">' + ICON_PLUS + 'Створити подорож</button>' +
    '</div>';
}

// ---------- Допоміжні функції ----------

// Показати або сховати елемент. (Атрибут hidden тут не підходить:
// стиль кнопок у nishporka.css його перебиває, і кнопка лишається видимою.)
function show(el, visible) {
  el.style.display = visible ? '' : 'none';
}

// «1 подорож», «3 подорожі», «5 подорожей» — українські відмінки для чисел.
function countLabel(n) {
  const last = n % 10, lastTwo = n % 100;
  let word = 'подорожей';
  if (last === 1 && lastTwo !== 11) word = 'подорож';
  else if (last >= 2 && last <= 4 && (lastTwo < 12 || lastTwo > 14)) word = 'подорожі';
  return n + ' ' + word;
}

// База зберігає дату як «2027-04-14», а в макеті вона «14.04.2027».
function formatDate(value) {
  if (!value) return '';
  const [y, m, d] = value.split('-');
  return d + '.' + m + '.' + y;
}

function dateRange(start, end) {
  const a = formatDate(start), b = formatDate(end);
  if (a && b) return a + ' – ' + b;
  return a || b;
}

// Захист: текст з бази показуємо як текст, а не як HTML-код.
// Інакше хтось міг би записати в назву подорожі шкідливий код, і він би виконався на сайті.
function safe(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Значки з макета (SVG — малюнки, описані кодом).
function icon(paths, size) {
  return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + paths + '</svg>';
}
const ICON_PLANE = '<path d="M21 3L3 10.5l7 2.5 2.5 7L21 3z"/><path d="M10 13l11-10"/>';
const ICON_BAG = '<rect x="4" y="8" width="16" height="12" rx="2"/><path d="M9 8V6a1 1 0 011-1h4a1 1 0 011 1v2M4 13h16"/>';
const ICON_PIN = '<svg class="ic-pin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 21s7-6.2 7-11a7 7 0 10-14 0c0 4.8 7 11 7 11z"/><circle cx="12" cy="10" r="2.5"/></svg>';
const ICON_CAL = '<svg class="ic-cal" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/></svg>';
const ICON_ARROW = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
const ICON_CHEV = '<svg class="chev" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>';
const ICON_PLUS = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>';

// ---------- Старт ----------

applyLayout();
// Якщо користувач поверне телефон або змінить розмір вікна — перемкнемо вигляд.
phone.addEventListener('change', applyLayout);
loadTrips();
