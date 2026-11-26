// Нишпорка — логіка сторінки.
// 1) Обираємо вигляд «телефон» або «ноутбук».
// 2) Беремо список подорожей з бази Supabase і малюємо картки (крок K2).
// 3) Створюємо, редагуємо й видаляємо подорожі (крок K3).
// Адреса бази й ключ лежать у config.js.

const app = document.getElementById('app');
const headerSlogan = document.querySelector('.bar .slogan');
const phoneSlogan = document.getElementById('slogan-sm');
const titleRow = document.getElementById('titlerow');
const countText = document.getElementById('count');
const createBtn = document.getElementById('create-btn');
const tripsBox = document.getElementById('trips');
const listScreen = document.getElementById('list-screen');
const formScreen = document.getElementById('form-screen');
const form = document.getElementById('trip-form');
const formTitle = document.getElementById('form-title');
const formError = document.getElementById('form-error');
const saveBtn = document.getElementById('form-save');
const cancelBtn = document.getElementById('form-cancel');
const dateGrid = document.getElementById('date-grid');
const fields = {
  title: document.getElementById('trip-name'),
  location: document.getElementById('trip-place'),
  start_date: document.getElementById('trip-start'),
  end_date: document.getElementById('trip-end'),
};
const phone = window.matchMedia('(max-width: 700px)');

// Тут зберігаємо подорожі, які вже прийшли з бази.
// null — ще завантажуємо; 'error' — не вдалося; масив — усе добре.
let trips = null;

// Яку подорож зараз редагуємо: null — створюємо нову.
let editingId = null;

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
  // Форма за макетом: на телефоні дати одна під одною, кнопки на всю ширину,
  // і «Зберегти» стоїть першою (зверху), а на ноутбуці — праворуч.
  dateGrid.style.gridTemplateColumns = isPhone ? '1fr' : '';
  saveBtn.classList.toggle('full', isPhone);
  cancelBtn.classList.toggle('full', isPhone);
  saveBtn.style.order = isPhone ? '-1' : '';
  // Картки на телефоні й ноутбуці різні, тож малюємо їх наново.
  render();
}

// ---------- 2. Читаємо подорожі з бази ----------

async function loadTrips() {
  // Звертаємося до таблиці trips через інтернет (REST API Supabase).
  // select=… — які поля взяти; order=id.asc — у порядку додавання.
  try {
    trips = await api('GET', '?select=id,title,location,start_date,end_date&order=id.asc');
  } catch (err) {
    // Причину пишемо в консоль браузера — для розробника. Користувачу — простий текст.
    console.error('Не вдалося завантажити подорожі:', err);
    trips = 'error';
  }
  render();
}

// Один спільний «листоноша» для всіх запитів до таблиці trips.
// method: GET — прочитати, POST — створити, PATCH — змінити, DELETE — видалити.
async function api(method, query, body) {
  const response = await fetch(SUPABASE_URL + '/rest/v1/trips' + query, {
    method: method,
    headers: {
      apikey: SUPABASE_KEY,
      'Content-Type': 'application/json',
      // Просимо базу повернути збережений запис — так одразу бачимо, що вийшло.
      Prefer: 'return=representation',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!response.ok) throw new Error('Supabase відповів кодом ' + response.status + ': ' + await response.text());
  return response.json();
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

  // Кнопки «Редагувати» і «Видалити». ТИМЧАСОВО стоять на картці:
  // у макеті вони на екрані подорожі (Екран 2), а його ми робимо на кроці K5 —
  // тоді перенесемо кнопки туди, а картка знову стане посиланням «Відкрити».
  // data-action і data-id підказують app.js, що натиснули і для якої подорожі.
  const buttons = '<div class="btns" style="margin-top:auto;padding-top:4px' + (phone.matches ? ';flex-basis:100%' : '') + '">' +
    '<button type="button" class="btn btn-line" data-action="edit" data-id="' + trip.id + '">Редагувати</button>' +
    '<button type="button" class="btn btn-dline" data-action="delete" data-id="' + trip.id + '">Видалити</button>' +
    '</div>';

  if (phone.matches) {
    return '<div class="card trip" style="flex-wrap:wrap">' +
      '<div class="stamp ' + color + '" style="width:52px;height:52px">' + icon(ICON_PLANE, 26) + '</div>' +
      '<div class="tbody">' + name + place + when + '</div>' +
      buttons +
      '</div>';
  }
  return '<div class="card trip">' +
    '<div class="trip-top"><div class="stamp ' + color + '" style="width:48px;height:48px">' + icon(ICON_PLANE, 24) + '</div>' + name + '</div>' +
    place + when +
    buttons +
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
    '<button type="button" class="btn btn-orange' + (phone.matches ? ' full' : '') + '" data-action="create">' + ICON_PLUS + 'Створити подорож</button>' +
    '</div>';
}

// ---------- 4. Форма: створити / редагувати (K3) ----------

// trip — подорож для редагування; без неї — порожня форма «Нова подорож».
function openForm(trip) {
  editingId = trip ? trip.id : null;
  formTitle.textContent = trip ? 'Редагувати подорож' : 'Нова подорож';
  for (const key in fields) fields[key].value = (trip && trip[key]) || '';
  updateDateHints();
  showError('');
  saveBtn.disabled = false;
  show(listScreen, false);
  show(formScreen, true);
  window.scrollTo(0, 0);
  fields.title.focus();
}

function closeForm() {
  show(formScreen, false);
  show(listScreen, true);
}

async function saveTrip(event) {
  // Без цього браузер сам перезавантажив би сторінку після натискання «Зберегти».
  event.preventDefault();

  const data = {
    title: fields.title.value.trim(),
    location: fields.location.value.trim() || null,
    // Порожня дата — це «не вказано» (null), а не порожній текст, якого база не прийме.
    start_date: fields.start_date.value || null,
    end_date: fields.end_date.value || null,
  };

  // Перевірки до відправки в базу.
  if (!data.title) {
    showError('Вкажіть назву подорожі.');
    fields.title.focus();
    return;
  }
  // Дати у форматі 2027-04-14 можна порівнювати як текст: раніша дата «менша».
  if (data.start_date && data.end_date && data.end_date < data.start_date) {
    showError('Дата кінця не може бути раніше за дату початку.');
    fields.end_date.focus();
    return;
  }

  // Блокуємо кнопку, щоб подвійне натискання не створило дві однакові подорожі.
  saveBtn.disabled = true;
  showError('');
  try {
    if (editingId === null) {
      await api('POST', '', data);                       // нова подорож
    } else {
      await api('PATCH', '?id=eq.' + editingId, data);   // змінюємо лише подорож з цим id
    }
    closeForm();
    loadTrips(); // перечитуємо список з бази — бачимо саме те, що там збереглося
  } catch (err) {
    console.error('Не вдалося зберегти подорож:', err);
    showError('Не вдалося зберегти. Перевірте інтернет і спробуйте ще раз.');
    saveBtn.disabled = false;
  }
}

// ---------- 5. Видалення (K3) ----------

async function deleteTrip(trip) {
  // Поки — стандартне віконце браузера. На кроці K7 замінимо його
  // на гарний діалог з макета («Видалити подорож разом з усім наповненням?»).
  const ok = window.confirm('Видалити подорож «' + (trip.title || 'Без назви') + '»? Цю дію не можна скасувати.');
  if (!ok) return;
  try {
    await api('DELETE', '?id=eq.' + trip.id);
    loadTrips();
  } catch (err) {
    console.error('Не вдалося видалити подорож:', err);
    window.alert('Не вдалося видалити подорож. Перевірте інтернет і спробуйте ще раз.');
  }
}

// Один обробник на всі кнопки в списку: дивимось на data-action натиснутої кнопки.
function onListClick(event) {
  const button = event.target.closest('[data-action]');
  if (!button) return;
  const action = button.dataset.action;
  if (action === 'create') return openForm(null);
  const trip = trips.find(t => String(t.id) === button.dataset.id);
  if (!trip) return;
  if (action === 'edit') openForm(trip);
  if (action === 'delete') deleteTrip(trip);
}

// Поле date показує дату у форматі браузера: в англомовному це мм/дд/рррр,
// і легко ввести 04/10 маючи на увазі 4 жовтня, а отримати 10 квітня.
// Тому під полем пишемо вибрану дату словами — помилку видно одразу.
const MONTHS = ['січня', 'лютого', 'березня', 'квітня', 'травня', 'червня',
  'липня', 'серпня', 'вересня', 'жовтня', 'листопада', 'грудня'];

function dateInWords(value) {
  if (!value) return '';
  const [y, m, d] = value.split('-');
  return Number(d) + ' ' + MONTHS[Number(m) - 1] + ' ' + y;
}

function updateDateHints() {
  document.getElementById('trip-start-hint').textContent = dateInWords(fields.start_date.value);
  document.getElementById('trip-end-hint').textContent = dateInWords(fields.end_date.value);
}

function showError(text) {
  formError.textContent = text;
  show(formError, Boolean(text));
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
// Кнопки: «Створити подорож» угорі, кнопки на картках, форма.
createBtn.addEventListener('click', () => openForm(null));
tripsBox.addEventListener('click', onListClick);
form.addEventListener('submit', saveTrip);
cancelBtn.addEventListener('click', closeForm);
fields.start_date.addEventListener('input', updateDateHints);
fields.end_date.addEventListener('input', updateDateHints);
document.getElementById('form-back').addEventListener('click', event => {
  event.preventDefault();
  closeForm();
});
loadTrips();
