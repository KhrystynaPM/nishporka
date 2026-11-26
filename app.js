// Нишпорка — логіка сторінки.
// Поки що тут одне завдання: обрати вигляд «телефон» або «ноутбук».
// У nishporka.css є два набори розмірів: .sm (телефон) і .lg (ноутбук).
// Слоган у шапці показуємо лише на широкому екрані, як у макеті.

const app = document.getElementById('app');
const slogan = document.querySelector('.bar .slogan');
const phone = window.matchMedia('(max-width: 700px)');

function applyLayout() {
  app.classList.toggle('sm', phone.matches);
  app.classList.toggle('lg', !phone.matches);
  slogan.hidden = phone.matches;
}

applyLayout();
// Якщо користувач поверне телефон або змінить розмір вікна — перемкнемо вигляд.
phone.addEventListener('change', applyLayout);
