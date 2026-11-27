// Нишпорка — логіка сторінки.
// 1) Обираємо вигляд «телефон» або «ноутбук».
// 2) Беремо список подорожей з бази Supabase і малюємо картки (крок K2).
// 3) Створюємо, редагуємо й видаляємо подорожі (крок K3).
// 4) Екран подорожі з 4 блоками: справи, речі, бюджет, місця (крок K5).
// 5) Видалення подорожі через діалог з макета (крок K7).
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
const tripScreen = document.getElementById('trip-screen');
const tripInfoBox = document.getElementById('trip-info');
const blocksBox = document.getElementById('blocks');
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
  // Картки й блоки на телефоні й ноутбуці різні, тож малюємо їх наново.
  render();
  renderTrip();
}

// ---------- 2. Читаємо подорожі з бази ----------

async function loadTrips() {
  // Звертаємося до таблиці trips через інтернет (REST API Supabase).
  // select=… — які поля взяти; order=id.asc — у порядку додавання.
  try {
    trips = await api('GET', 'trips', '?select=id,title,location,start_date,end_date&order=id.asc');
  } catch (err) {
    // Причину пишемо в консоль браузера — для розробника. Користувачу — простий текст.
    console.error('Не вдалося завантажити подорожі:', err);
    trips = 'error';
  }
  render();
}

// Один спільний «листоноша» для всіх запитів до бази.
// method: GET — прочитати, POST — створити, PATCH — змінити, DELETE — видалити.
// table: у яку таблицю звертаємось — trips, todos, packing_items, budget_items чи places.
async function api(method, table, query, body) {
  const response = await fetch(SUPABASE_URL + '/rest/v1/' + table + query, {
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

  // Уся картка — посилання на екран подорожі (#trip/номер).
  // Кнопки «Редагувати» і «Видалити» тепер живуть на екрані подорожі, як у макеті.
  const href = '#trip/' + trip.id;

  if (phone.matches) {
    return '<a class="card trip" href="' + href + '">' +
      '<div class="stamp ' + color + '" style="width:52px;height:52px">' + icon(ICON_PLANE, 26) + '</div>' +
      '<div class="tbody">' + name + place + when + '</div>' +
      ICON_CHEV +
      '</a>';
  }
  return '<a class="card trip" href="' + href + '">' +
    '<div class="trip-top"><div class="stamp ' + color + '" style="width:48px;height:48px">' + icon(ICON_PLANE, 24) + '</div>' + name + '</div>' +
    place + when +
    '<div class="open">Відкрити' + ICON_ARROW + '</div>' +
    '</a>';
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
  show(tripScreen, false);
  show(formScreen, true);
  window.scrollTo(0, 0);
  fields.title.focus();
}

// Закриваємо форму й повертаємось туди, звідки прийшли: до списку або до подорожі.
function closeForm() {
  show(formScreen, false);
  show(listScreen, currentTripId() === null);
  show(tripScreen, currentTripId() !== null);
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
      await api('POST', 'trips', '', data);                       // нова подорож
    } else {
      await api('PATCH', 'trips', '?id=eq.' + editingId, data); // змінюємо лише подорож з цим id
    }
    closeForm();
    // Перечитуємо з бази — бачимо саме те, що там збереглося.
    if (currentTripId() === null) loadTrips();
    else loadTripInfo(currentTripId(), loadToken);
  } catch (err) {
    console.error('Не вдалося зберегти подорож:', err);
    showError('Не вдалося зберегти. Перевірте інтернет і спробуйте ще раз.');
    saveBtn.disabled = false;
  }
}

// ---------- 5. Видалення подорожі з підтвердженням (K3, діалог — K7) ----------

const deleteDialog = document.getElementById('delete-dialog');
// Яку подорож збираємось видалити, поки відкритий діалог.
let deletingTrip = null;
// Кнопка, з якої відкрили діалог: після закриття повертаємо на неї фокус (зручно з клавіатури).
let deleteOpener = null;

// Відкриваємо діалог з макета: «Видалити подорож «…»?».
function deleteTrip(trip) {
  deletingTrip = trip;
  deleteOpener = document.activeElement;
  const mode = phone.matches ? 'b' : 'c'; // b — панель знизу (телефон), c — віконце посередині (ноутбук)
  const cancel = '<button type="button" class="btn btn-line' + (mode === 'b' ? ' full' : '') + '" data-action="cancel">Скасувати</button>';
  const remove = '<button type="button" class="btn btn-danger' + (mode === 'b' ? ' full' : '') + '" data-action="confirm"' +
    (mode === 'c' ? ' style="padding:0 28px"' : '') + '>Видалити</button>';
  deleteDialog.className = 'scrim ' + mode;
  deleteDialog.innerHTML =
    '<div class="dialog ' + mode + '" role="dialog" aria-modal="true" aria-labelledby="del-title" aria-describedby="del-text">' +
      (mode === 'b' ? '<div class="grab" aria-hidden="true"></div>' : '') +
      '<div class="stamp t-red" style="width:56px;height:56px">' + icon(PATH_TRASH, 26) + '</div>' +
      '<h2 class="dtitle" id="del-title">Видалити подорож «' + safe(trip.title || 'Без назви') + '»?</h2>' +
      '<p class="dtext" id="del-text"' + (mode === 'b' ? ' style="margin-top:10px"' : '') + '>Подорож буде видалено разом з усіма справами, речами, бюджетом і посиланнями. Цю дію не можна скасувати.</p>' +
      // Сюди пишемо помилку, якщо база не відповіла (у макеті цього стану немає).
      '<p id="del-error" role="alert" style="display:none;margin:12px 0 0;font-weight:700;color:var(--red)"></p>' +
      // На ноутбуці «Скасувати» ліворуч, «Видалити» праворуч; на телефоні «Видалити» зверху — як у макеті.
      '<div class="dact ' + mode + '">' + (mode === 'b' ? remove + cancel : cancel + remove) + '</div>' +
    '</div>';
  deleteDialog.style.display = 'flex';
  document.body.style.overflow = 'hidden'; // поки діалог відкритий, сторінка під ним не прокручується
  // Фокус на «Скасувати»: випадкове натискання Enter нічого не зламає.
  deleteDialog.querySelector('[data-action="cancel"]').focus();
}

function closeDeleteDialog() {
  deleteDialog.style.display = 'none';
  deleteDialog.innerHTML = '';
  document.body.style.overflow = '';
  deletingTrip = null;
  if (deleteOpener && document.body.contains(deleteOpener)) deleteOpener.focus();
  deleteOpener = null;
}

// Натиснули «Видалити» в діалозі — видаляємо в базі.
// Справи, речі, бюджет і місця база стирає сама (on delete cascade, крок K4).
async function confirmDeleteTrip() {
  const trip = deletingTrip;
  if (!trip) return;
  const buttons = deleteDialog.querySelectorAll('button');
  buttons.forEach(b => { b.disabled = true; }); // щоб не натиснути двічі
  try {
    await api('DELETE', 'trips', '?id=eq.' + trip.id);
    closeDeleteDialog();
    // Подорожі більше немає — повертаємось до списку (адреса без #trip/…).
    location.hash = '';
  } catch (err) {
    console.error('Не вдалося видалити подорож:', err);
    const error = document.getElementById('del-error');
    error.textContent = 'Не вдалося видалити. Перевірте інтернет і спробуйте ще раз.';
    error.style.display = '';
    buttons.forEach(b => { b.disabled = false; });
  }
}

function onDeleteDialogClick(event) {
  // Клік по затемненню поза віконцем = «Скасувати».
  if (event.target === deleteDialog) { closeDeleteDialog(); return; }
  const button = event.target.closest('button[data-action]');
  if (!button) return;
  if (button.dataset.action === 'cancel') closeDeleteDialog();
  if (button.dataset.action === 'confirm') confirmDeleteTrip();
}

function onDeleteDialogKey(event) {
  if (event.key === 'Escape') { closeDeleteDialog(); return; }
  // Tab «ходить по колу» лише між двома кнопками діалогу, не тікає на сторінку під ним.
  if (event.key === 'Tab') {
    const buttons = Array.from(deleteDialog.querySelectorAll('button'));
    const i = buttons.indexOf(document.activeElement);
    const next = event.shiftKey ? (i <= 0 ? buttons.length - 1 : i - 1) : (i + 1) % buttons.length;
    buttons[next].focus();
    event.preventDefault();
  }
}

// Кнопка «Створити подорож» усередині порожньої картки (картки подорожей — це посилання).
function onListClick(event) {
  const button = event.target.closest('[data-action="create"]');
  if (button) openForm(null);
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

// ---------- 6. Переходи між екранами (K5) ----------

// Який екран показати, підказує адреса сторінки:
//   …/nishporka/          — список подорожей;
//   …/nishporka/#trip/5   — подорож з номером 5.
// Так після перезавантаження сторінки ви лишаєтесь на тій самій подорожі,
// а кнопка «Назад» у браузері повертає до списку.
function currentTripId() {
  const match = location.hash.match(/^#trip\/(\d+)$/);
  return match ? Number(match[1]) : null;
}

function route() {
  // Пішли на інший екран (наприклад, кнопкою «Назад») — діалог видалення закриваємо.
  if (deletingTrip) closeDeleteDialog();
  const id = currentTripId();
  show(formScreen, false);
  show(listScreen, id === null);
  show(tripScreen, id !== null);
  window.scrollTo(0, 0);
  if (id === null) loadTrips();
  else openTrip(id);
}

// ---------- 7. Екран подорожі (K5) ----------

// Подорож, яку зараз відкрито: null — завантажуємо, 'error' — не вдалося,
// 'missing' — такої подорожі немає (наприклад, її видалили), обʼєкт — усе добре.
let trip = null;

// Номер «спроби завантаження». Якщо швидко перейти з однієї подорожі в іншу,
// стара відповідь бази може прийти пізніше за нову — її просто ігноруємо.
let loadToken = 0;

function openTrip(id) {
  loadToken += 1;
  trip = null;
  rowForm = null;
  for (const key in BLOCKS) rows[key] = null;
  renderTrip();
  loadTripInfo(id, loadToken);
  // Чотири блоки завантажуємо одночасно, кожен — зі своєї таблиці.
  for (const key in BLOCKS) loadRows(key, id, loadToken);
}

async function loadTripInfo(id, token) {
  try {
    const found = await api('GET', 'trips', '?select=id,title,location,start_date,end_date&id=eq.' + id);
    if (token !== loadToken) return;
    trip = found[0] || 'missing';
  } catch (err) {
    if (token !== loadToken) return;
    console.error('Не вдалося завантажити подорож:', err);
    trip = 'error';
  }
  renderTrip();
}

function renderTrip() {
  if (trip === null) {
    tripInfoBox.innerHTML = '<p class="muted" style="font-size:16px">Завантажуємо подорож…</p>';
    blocksBox.innerHTML = '';
    return;
  }
  if (trip === 'missing' || trip === 'error') {
    tripInfoBox.innerHTML = '<div class="card bigempty" style="margin-top:8px">' +
      (trip === 'missing'
        ? '<h2>Такої подорожі немає</h2><p>Можливо, її видалили. Поверніться до списку подорожей.</p>'
        : '<h2>Не вдалося завантажити подорож</h2><p>Перевірте інтернет і оновіть сторінку.</p>') +
      '<a class="btn btn-violet' + (phone.matches ? ' full' : '') + '" href="#">Усі подорожі</a></div>';
    blocksBox.innerHTML = '';
    return;
  }

  // Картка подорожі (макет Trip-Desktop / Trip-Mobile).
  const place = trip.location ? '<div class="meta">' + ICON_PIN + safe(trip.location) + '</div>' : '';
  const dates = dateRange(trip.start_date, trip.end_date);
  const when = dates ? '<div class="meta">' + ICON_CAL + dates + '</div>' : '';
  tripInfoBox.innerHTML = '<div class="card tripcard"><div class="pm"></div><div class="pm2"></div>' +
    '<div class="tinfo z"><h1 class="h1">' + safe(trip.title || 'Без назви') + '</h1>' +
    (place || when ? '<div class="tmeta">' + place + when + '</div>' : '') + '</div>' +
    '<div class="btns z"' + (phone.matches ? ' style="margin-top:4px"' : '') + '>' +
    '<button type="button" class="btn btn-line" data-action="edit-trip">' + icon(PATH_EDIT, 18) + 'Редагувати</button>' +
    '<button type="button" class="btn btn-dline" data-action="delete-trip">' + icon(PATH_TRASH, 18) + 'Видалити</button>' +
    '</div></div>';

  // Розкладка блоків як у макеті: на ноутбуці дві колонки
  // (ліворуч справи й бюджет, праворуч речі й місця), на телефоні — один під одним.
  // Кожен блок має своє «місце» (data-slot), щоб перемальовувати блоки окремо.
  const slot = key => '<div data-slot="' + key + '"></div>';
  blocksBox.innerHTML = phone.matches
    ? '<div class="stack16">' + slot('todos') + slot('packing') + slot('budget') + slot('places') + '</div>'
    : '<div class="cols2"><div class="col">' + slot('todos') + slot('budget') + '</div>' +
      '<div class="col">' + slot('packing') + slot('places') + '</div></div>';
  for (const key in BLOCKS) renderBlock(key);
}

function onTripInfoClick(event) {
  const button = event.target.closest('[data-action]');
  if (!button || !trip || typeof trip !== 'object') return;
  if (button.dataset.action === 'edit-trip') openForm(trip);
  if (button.dataset.action === 'delete-trip') deleteTrip(trip);
}

// ---------- 8. Блоки-списки: спільний патерн «список рядків» (K5) ----------

// Чотири блоки побудовані однаково (аналіз §4): рядок з текстом + 1 додаткове поле,
// що належить подорожі. Тому вся логіка «показати / додати / редагувати / видалити»
// написана ОДИН раз нижче, а блоки відрізняються лише цим описом.
//   table  — таблиця в Supabase;
//   text   — поле з основним текстом рядка;
//   check  — поле-галочка (виконано / складено), якщо є;
//   amount — поле суми в євро (лише бюджет);
//   url    — поле посилання (лише місця);
//   fields — поля у формі рядка.
const BLOCKS = {
  todos: {
    table: 'todos', text: 'text', check: 'done',
    title: 'Справи', color: 't-violet', icon: '<path d="M5 12l4 4 10-10"/>',
    add: 'Додати справу', empty: 'Ще немає справ — додайте першу',
    newTitle: 'Нова справа', editTitle: 'Редагувати справу', textError: 'Напишіть, що треба зробити.',
    fields: [{ key: 'text', label: 'Справа', placeholder: 'Наприклад, Купити квитки' }],
  },
  packing: {
    table: 'packing_items', text: 'text', check: 'packed',
    title: 'Речі в дорогу', color: 't-pink', icon: '<path d="M6 8h12l1 12H5L6 8z"/><path d="M9 8V6a3 3 0 016 0v2"/>',
    add: 'Додати річ', empty: 'Ще немає речей — додайте першу',
    newTitle: 'Нова річ', editTitle: 'Редагувати річ', textError: 'Напишіть назву речі.',
    fields: [{ key: 'text', label: 'Річ', placeholder: 'Наприклад, Паспорт' }],
  },
  budget: {
    table: 'budget_items', text: 'title', amount: 'amount_eur',
    title: 'Бюджет', color: 't-orange', icon: '<path d="M17 7.5a6 6 0 100 9M5 10.5h9M5 13.5h9"/>',
    chip: '<span class="chip chip-o">EUR</span>',
    add: 'Додати витрату', empty: 'Ще немає витрат — додайте першу',
    newTitle: 'Нова витрата', editTitle: 'Редагувати витрату', textError: 'Напишіть назву витрати.',
    fields: [
      { key: 'title', label: 'Назва витрати', placeholder: 'Наприклад, Страховка' },
      { key: 'amount_eur', label: 'Сума, €', type: 'number' },
    ],
  },
  places: {
    table: 'places', text: 'title', url: 'url',
    title: 'Місця, які хочу відвідати', color: 't-violet', icon: '<path d="M12 21s7-6.2 7-11a7 7 0 10-14 0c0 4.8 7 11 7 11z"/><circle cx="12" cy="10" r="2.5"/>',
    add: 'Додати місце', empty: 'Ще немає місць — додайте перше',
    newTitle: 'Нове місце', editTitle: 'Редагувати місце', textError: 'Напишіть назву місця.',
    fields: [
      { key: 'title', label: 'Назва місця', placeholder: 'Наприклад, Колізей' },
      { key: 'url', label: 'Посилання (необовʼязково)', type: 'url', placeholder: 'https://…' },
    ],
  },
};

// Рядки кожного блоку: null — завантажуємо, 'error' — не вдалося, масив — усе добре.
const rows = {};

// Відкрита форма рядка (одна на весь екран):
// { block: 'todos', id: null — новий рядок / номер — редагуємо, values: що введено, error, saving }.
let rowForm = null;

// Які блоки згорнуто. Памʼятаємо, щоб після збереження рядка блок не розгортався сам.
const collapsed = new Set();

async function loadRows(key, tripId, token) {
  try {
    // Лише рядки цієї подорожі (trip_id=eq.…), у порядку додавання.
    const list = await api('GET', BLOCKS[key].table, '?trip_id=eq.' + tripId + '&order=id.asc');
    if (token !== loadToken) return;
    rows[key] = list;
  } catch (err) {
    if (token !== loadToken) return;
    console.error('Не вдалося завантажити блок ' + key + ':', err);
    rows[key] = 'error';
  }
  renderBlock(key);
}

// Малюємо один блок наново (інші блоки не чіпаємо).
function renderBlock(key) {
  const place = blocksBox.querySelector('[data-slot="' + key + '"]');
  if (!place) return;
  const b = BLOCKS[key];
  const list = rows[key];
  let body;
  if (list === null) {
    body = '<p class="muted" style="margin:8px 0">Завантажуємо…</p>';
  } else if (list === 'error') {
    body = '<p style="margin:8px 0;font-weight:700;color:var(--red)">Не вдалося завантажити. Перевірте інтернет і оновіть сторінку.</p>';
  } else {
    const formHere = rowForm && rowForm.block === key;
    const adding = formHere && rowForm.id === null;
    // Рядок, який редагуємо, на час редагування замінюємо формою.
    body = list.map(row => (formHere && rowForm.id === row.id) ? rowFormHtml(key) : rowHtml(b, row)).join('');
    if (list.length === 0 && !adding) {
      body += '<div class="empty"><div class="stamp ebub ' + b.color + '">' + icon(b.icon, 24) + '</div><p>' + b.empty + '</p></div>';
    }
    body += adding ? rowFormHtml(key)
      : '<button type="button" class="btn btn-add" data-action="add-row">' + icon(PATH_PLUS, 18) + b.add + '</button>';
    // K6: під бюджетом — «Разом … €», сума всіх витрат (як у макеті, під кнопкою).
    if (b.amount) body += '<div class="total"><i>Разом</i><b>' + money(budgetTotal(list)) + '</b></div>';
  }

  // <details> — стандартний «розкривний» блок браузера: клік по заголовку (<summary>) згортає й розгортає.
  place.innerHTML = '<details class="card block" data-block="' + key + '"' + (collapsed.has(key) ? '' : ' open') + '>' +
    '<summary class="bh"><div class="bt"><div class="stamp bi ' + b.color + '">' + icon(b.icon, 18) + '</div><h2>' + b.title + '</h2></div>' +
    '<span class="bend">' + (b.chip || counterHtml(key)) + ICON_TOGGLE + '</span></summary>' +
    body + '</details>';
}

// ---------- 9. Автосума і лічильники (K6) ----------

// Лічильник у заголовку блоку (як у макеті):
//   Справи, Речі в дорогу — «скільки відмічено з усіх», напр. «2 з 5»; порожній блок — «0»;
//   Місця — просто кількість, напр. «3».
// Рахуємо щоразу з рядків, що вже є на екрані, тож окремо в базі нічого не зберігаємо.
function counterText(key) {
  const b = BLOCKS[key];
  const list = rows[key];
  if (!Array.isArray(list)) return ''; // ще завантажуємо або помилка — лічильник не показуємо
  if (!b.check || list.length === 0) return String(list.length);
  const done = list.filter(r => r[b.check]).length;
  return done + ' з ' + list.length;
}

function counterHtml(key) {
  const text = counterText(key);
  return text ? '<span class="chip" data-counter>' + text + '</span>' : '';
}

// Галочку поставили чи зняли — оновлюємо лише цифру в заголовку,
// а не весь блок (щоб не «стрибав» екран і не губився фокус).
function updateCounter(key) {
  const chip = blocksBox.querySelector('[data-block="' + key + '"] [data-counter]');
  if (chip) chip.textContent = counterText(key);
}

// Сума бюджету. Рахуємо в центах (цілими числами): так 0,1 + 0,2 дає рівно 0,3,
// а не 0,30000000000000004, як буває з дробами в JavaScript.
function budgetTotal(list) {
  const cents = list.reduce((sum, r) => sum + Math.round(Number(r.amount_eur || 0) * 100), 0);
  return cents / 100;
}

// Один рядок блоку: галочка / текст / сума / посилання + кнопки «Редагувати» і «Видалити».
function rowHtml(b, row) {
  let main;
  let style = '';
  if (b.check) {
    const done = Boolean(row[b.check]);
    main = '<label class="chk' + (done ? ' done' : '') + '"><input type="checkbox" data-action="check"' + (done ? ' checked' : '') + '>' +
      '<span>' + safe(row[b.text] || '') + '</span></label>';
  } else if (b.amount) {
    main = '<div class="txt">' + safe(row[b.text] || '') + '</div><div class="amt">' + money(row[b.amount]) + '</div>';
  } else if (b.url) {
    style = ' style="min-height:64px"';
    main = '<div class="lnk"><b>' + safe(row[b.text] || '') + '</b>' + linkHtml(row[b.url]) + '</div>';
  } else {
    main = '<div class="txt">' + safe(row[b.text] || '') + '</div>';
  }
  const name = safeAttr(row[b.text] || '');
  return '<div class="row" data-id="' + row.id + '"' + style + '>' + main +
    '<button type="button" class="ib" data-action="edit-row" aria-label="Редагувати «' + name + '»">' + icon(PATH_EDIT, 20) + '</button>' +
    '<button type="button" class="ib" data-action="delete-row" aria-label="Видалити «' + name + '»">' + icon(PATH_TRASH, 20) + '</button>' +
    '</div>';
}

// Форма рядка (макет Form-Row): одна для «Нова …» і «Редагувати …».
function rowFormHtml(key) {
  const b = BLOCKS[key];
  const isPhone = phone.matches;
  // На ноутбуці назва витрати й сума стоять поруч (як у макеті), решта полів — одне під одним.
  const sideBySide = !isPhone && Boolean(b.amount);
  const fieldsHtml = b.fields.map(f => {
    const id = 'f-' + key + '-' + f.key;
    const value = safeAttr(rowForm.values[f.key] || '');
    let input;
    if (f.type === 'number') {
      input = '<div class="amtwrap"><input class="inp" id="' + id + '" data-field="' + f.key + '" type="number" inputmode="decimal" min="0" step="0.01" placeholder="0" value="' + value + '"><span aria-hidden="true">€</span></div>';
    } else {
      input = '<input class="inp" id="' + id + '" data-field="' + f.key + '" type="' + (f.type || 'text') + '" maxlength="' + (f.type === 'url' ? 2000 : 200) + '" placeholder="' + f.placeholder + '" value="' + value + '">';
    }
    const wrap = sideBySide ? (f.type === 'number' ? ' style="flex:none;width:150px"' : ' style="flex:1;min-width:0"') : '';
    return '<div' + wrap + '><label class="lbl" for="' + id + '">' + f.label + '</label>' + input + '</div>';
  }).join('');

  const cancel = '<button type="button" class="btn btn-line' + (isPhone ? ' full' : '') + '" data-action="cancel-row"' + (isPhone ? '' : ' style="padding:0 20px;font-size:15px"') + '>Скасувати</button>';
  const save = '<button type="submit" class="btn btn-violet' + (isPhone ? ' full' : '') + '"' + (rowForm.saving ? ' disabled' : '') + (isPhone ? '' : ' style="padding:0 26px;font-size:15px"') + '>' + (rowForm.saving ? 'Зберігаємо…' : 'Зберегти') + '</button>';
  const error = rowForm.error ? '<p role="alert" style="margin:' + (sideBySide ? '12px 0 0' : '0') + ';font-weight:700;color:var(--red)">' + rowForm.error + '</p>' : '';

  return '<form class="panel' + (sideBySide ? '' : ' fld') + '" data-row-form novalidate>' +
    '<div class="ptitle"' + (sideBySide ? '' : ' style="margin-bottom:0"') + '>' + (rowForm.id === null ? b.newTitle : b.editTitle) + '</div>' +
    (sideBySide ? '<div class="prow">' + fieldsHtml + '</div>' : fieldsHtml) +
    error +
    // На телефоні «Зберегти» зверху, на ноутбуці — праворуч (як у макеті).
    '<div class="actions" style="margin-top:' + (sideBySide ? '16px' : '0') + '">' + (isPhone ? save + cancel : cancel + save) + '</div>' +
    '</form>';
}

// Відкрити форму: row — рядок для редагування; без нього — новий рядок.
function openRowForm(key, row) {
  const previous = rowForm && rowForm.block;
  const values = {};
  if (row) for (const f of BLOCKS[key].fields) values[f.key] = row[f.key] == null ? '' : String(row[f.key]);
  rowForm = { block: key, id: row ? row.id : null, values: values, error: '', saving: false };
  if (previous && previous !== key) renderBlock(previous); // закриваємо форму в іншому блоці
  renderBlock(key);
  const input = blocksBox.querySelector('[data-block="' + key + '"] [data-row-form] input');
  if (input) input.focus();
}

function closeRowForm() {
  const key = rowForm && rowForm.block;
  rowForm = null;
  if (key) renderBlock(key);
}

async function saveRow() {
  const form = rowForm;
  const key = form.block;
  const b = BLOCKS[key];
  const v = form.values;
  const data = {};

  // Перевірки до відправки в базу.
  const text = (v[b.text] || '').trim();
  if (!text) return showRowError(b.textError);
  data[b.text] = text;

  if (b.amount) {
    const raw = (v[b.amount] || '').trim().replace(',', '.');
    const sum = Number(raw);
    if (!raw) return showRowError('Вкажіть суму.');
    // У базі сума має формат numeric(10,2): до 99 999 999,99 і два знаки після коми.
    if (!Number.isFinite(sum) || sum < 0 || sum >= 1e8) return showRowError('Сума має бути числом від 0, наприклад 45 або 12.50.');
    data[b.amount] = Math.round(sum * 100) / 100;
  }

  if (b.url) {
    const url = cleanUrl(v[b.url]);
    if (url === false) return showRowError('Посилання має виглядати як адреса сайту, наприклад https://parcocolosseo.it');
    data[b.url] = url;
  }

  // Блокуємо кнопку, щоб подвійне натискання не додало два однакові рядки.
  form.saving = true;
  form.error = '';
  renderBlock(key);
  const token = loadToken;
  try {
    if (form.id === null) {
      data.trip_id = trip.id; // «належить подорожі» (аналіз §2.6)
      const saved = await api('POST', b.table, '', data);
      if (token !== loadToken) return; // поки зберігали, відкрили іншу подорож
      rows[key].push(saved[0]);
    } else {
      const saved = await api('PATCH', b.table, '?id=eq.' + form.id, data);
      if (token !== loadToken) return;
      rows[key] = rows[key].map(r => r.id === form.id ? saved[0] : r);
    }
    if (rowForm === form) rowForm = null;
  } catch (err) {
    if (token !== loadToken) return; // поки зберігали, відкрили іншу подорож
    console.error('Не вдалося зберегти рядок:', err);
    form.saving = false;
    form.error = 'Не вдалося зберегти. Перевірте інтернет і спробуйте ще раз.';
  }
  renderBlock(key);
}

function showRowError(text) {
  rowForm.error = text;
  renderBlock(rowForm.block);
}

// Галочка «виконано» / «складено»: одразу закреслюємо рядок і зберігаємо в базу.
async function toggleRow(key, row, checkbox) {
  const field = BLOCKS[key].check;
  const value = checkbox.checked;
  checkbox.closest('.chk').classList.toggle('done', value);
  row[field] = value;
  updateCounter(key); // «2 з 5» → «3 з 5» одразу
  try {
    await api('PATCH', BLOCKS[key].table, '?id=eq.' + row.id, { [field]: value });
  } catch (err) {
    row[field] = !value;
    updateCounter(key);
    console.error('Не вдалося зберегти галочку:', err);
    // Повертаємо, як було, щоб на екрані не було того, чого немає в базі.
    checkbox.checked = !value;
    checkbox.closest('.chk').classList.toggle('done', !value);
    window.alert('Не вдалося зберегти. Перевірте інтернет і спробуйте ще раз.');
  }
}

async function deleteRow(key, row) {
  const b = BLOCKS[key];
  if (!window.confirm('Видалити «' + (row[b.text] || '') + '»?')) return;
  try {
    await api('DELETE', b.table, '?id=eq.' + row.id);
    rows[key] = rows[key].filter(r => r.id !== row.id);
    if (rowForm && rowForm.block === key && rowForm.id === row.id) rowForm = null;
    renderBlock(key);
  } catch (err) {
    console.error('Не вдалося видалити рядок:', err);
    window.alert('Не вдалося видалити. Перевірте інтернет і спробуйте ще раз.');
  }
}

// Знаходимо, у якому блоці й якому рядку натиснули.
function findTarget(el) {
  const blockEl = el.closest('[data-block]');
  if (!blockEl) return {};
  const key = blockEl.dataset.block;
  const rowEl = el.closest('[data-id]');
  const row = rowEl && Array.isArray(rows[key]) ? rows[key].find(r => String(r.id) === rowEl.dataset.id) : null;
  return { key: key, row: row };
}

function onBlocksClick(event) {
  const button = event.target.closest('button[data-action]');
  if (!button) return;
  const { key, row } = findTarget(button);
  const action = button.dataset.action;
  if (action === 'add-row') openRowForm(key, null);
  if (action === 'edit-row' && row) openRowForm(key, row);
  if (action === 'delete-row' && row) deleteRow(key, row);
  if (action === 'cancel-row') closeRowForm();
}

function onBlocksChange(event) {
  if (event.target.dataset.action !== 'check') return;
  const { key, row } = findTarget(event.target);
  if (row) toggleRow(key, row, event.target);
}

// Запамʼятовуємо введене у форму, щоб не загубити, якщо блок перемалюється.
function onBlocksInput(event) {
  const field = event.target.dataset.field;
  if (field && rowForm) rowForm.values[field] = event.target.value;
}

function onBlocksSubmit(event) {
  if (!event.target.matches('[data-row-form]')) return;
  event.preventDefault(); // інакше браузер перезавантажив би сторінку
  if (rowForm && !rowForm.saving) saveRow();
}

// Блок згорнули або розгорнули — запамʼятовуємо.
function onBlockToggle(event) {
  const key = event.target.dataset && event.target.dataset.block;
  if (!key) return;
  if (event.target.open) collapsed.delete(key);
  else collapsed.add(key);
}

// Посилання на місце: показуємо коротко (parcocolosseo.it), відкриваємо в новій вкладці.
function linkHtml(url) {
  const parsed = parseUrl(url);
  if (!parsed) return url ? '<span class="muted" style="font-size:14px">' + safe(url) + '</span>' : '';
  const label = parsed.hostname.replace(/^www\./, '') + (parsed.pathname.length > 1 ? parsed.pathname : '');
  return '<a href="' + safeAttr(parsed.href) + '" target="_blank" rel="noopener noreferrer">' + safe(label) + ICON_EXT + '</a>';
}

// Дозволяємо лише звичайні адреси сайтів (http / https).
// Це захист: посилання на кшталт «javascript:…» могло б виконати чужий код на сайті.
function parseUrl(text) {
  if (!text) return null;
  try {
    const parsed = new URL(text);
    return (parsed.protocol === 'https:' || parsed.protocol === 'http:') ? parsed : null;
  } catch (e) {
    return null;
  }
}

// Те, що ввели в поле «Посилання»: порожньо → null; «parcocolosseo.it» → «https://parcocolosseo.it»;
// щось не схоже на адресу → false (покажемо помилку).
function cleanUrl(text) {
  text = (text || '').trim();
  if (!text) return null;
  if (!/^https?:\/\//i.test(text)) text = 'https://' + text;
  const parsed = parseUrl(text);
  return parsed && parsed.hostname.includes('.') ? text : false;
}

// 1285 → «1 285 €», 12.5 → «12,5 €» (українське написання чисел).
function money(value) {
  if (value == null || value === '') return '';
  return Number(value).toLocaleString('uk-UA', { maximumFractionDigits: 2 }) + ' €';
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

// Те саме для тексту всередині лапок атрибута (value="…", href="…"): ще й лапки.
function safeAttr(text) {
  return safe(text).replace(/"/g, '&quot;');
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
// Для екрана подорожі (K5): олівець, смітник, плюс, «відкрити в новій вкладці», стрілка згортання.
const PATH_EDIT = '<path d="M4 20h4L19 9l-4-4L4 16v4z"/><path d="M13.5 6.5l4 4"/>';
const PATH_TRASH = '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a1 1 0 001 1h8a1 1 0 001-1l1-12M9 7V4h6v3"/>';
const PATH_PLUS = '<path d="M12 5v14M5 12h14"/>';
const ICON_EXT = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="flex:none"><path d="M14 4h6v6M20 4l-9 9"/><path d="M18 14v5a1 1 0 01-1 1H5a1 1 0 01-1-1V7a1 1 0 011-1h5"/></svg>';
const ICON_TOGGLE = '<svg class="tog" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>';

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
// Екран подорожі: кнопки на картці подорожі й усе всередині 4 блоків.
tripInfoBox.addEventListener('click', onTripInfoClick);
// Діалог видалення подорожі (K7).
deleteDialog.addEventListener('click', onDeleteDialogClick);
deleteDialog.addEventListener('keydown', onDeleteDialogKey);
blocksBox.addEventListener('click', onBlocksClick);
blocksBox.addEventListener('change', onBlocksChange);
blocksBox.addEventListener('input', onBlocksInput);
blocksBox.addEventListener('submit', onBlocksSubmit);
// Подія toggle (згорнули / розгорнули) не «спливає» вгору, тому ловимо її на шляху вниз (true).
blocksBox.addEventListener('toggle', onBlockToggle, true);
// Змінилась адреса (#trip/5 або порожньо) — показуємо потрібний екран.
window.addEventListener('hashchange', route);
route();
