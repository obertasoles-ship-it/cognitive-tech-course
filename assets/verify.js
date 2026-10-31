/* Перевірка сертифіката за номером (дані з Google-таблиці викладача) */
(function () {
  'use strict';
  var ENDPOINT = (window.SITE_CONFIG && window.SITE_CONFIG.resultsUrl) || '';
  var form = document.getElementById('verify-form');
  var input = document.getElementById('verify-number');
  var out = document.getElementById('verify-result');
  if (!form) return;

  function show(cls, html) { out.className = 'verify-result ' + cls; out.innerHTML = html; }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

  if (!ENDPOINT) {
    show('fail', 'Перевірку сертифікатів ще не підключено. Звернись до викладача курсу.');
    form.querySelector('button').disabled = true;
    return;
  }

  function check(num) {
    num = num.trim().toUpperCase().replace(/\s+/g, '');
    input.value = num;
    if (!/^CT-\d{4}-[0-9A-Z]{6}$/.test(num)) { show('fail', 'Номер має формат <b>CT-2026-XXXXXX</b> (6 латинських літер або цифр у кінці).'); return; }
    show('wait', 'Перевіряю…');
    fetch(ENDPOINT + '?cert=' + encodeURIComponent(num))
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (d && d.found) {
          show('ok', '<div class="v-title">✓ Сертифікат дійсний</div>' +
            '<div><b>' + esc(d.surname).toLocaleUpperCase('uk') + ' ' + esc(d.name) + ' ' + esc(d.patronymic) + '</b></div>' +
            '<div>Курс «Сучасні когнітивні технології» · результат ' + esc(d.pct) + ' % (' + esc(d.correct) + ' з ' + esc(d.total) + ')</div>' +
            '<div>Дата видачі: ' + esc(d.date) + ' · № ' + esc(num) + '</div>');
        } else if (d && d.ok) {
          show('fail', '<div class="v-title">✗ Сертифікат з номером ' + esc(num) + ' не знайдено</div>Перевір правильність номера. Якщо номер правильний — сертифікат не видавався через цей сайт.');
        } else {
          show('fail', 'Сервіс перевірки повернув помилку. Спробуй пізніше.');
        }
      })
      .catch(function () { show('fail', 'Не вдалося зв’язатися з сервісом перевірки. Перевір інтернет і спробуй ще раз.'); });
  }

  form.onsubmit = function (e) { e.preventDefault(); check(input.value); };
  var m = /[?&]cert=([^&#]+)/.exec(location.search);
  if (m) { input.value = decodeURIComponent(m[1]); check(input.value); }
})();
