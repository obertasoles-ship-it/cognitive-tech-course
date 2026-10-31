/* Підсумкове тестування і сертифікат курсу «Сучасні когнітивні технології» */
(function () {
  'use strict';

  var BANK = window.EXAM_BANK || [];
  var TOPICS = window.EXAM_TOPICS || {};
  var AUTHOR = window.EXAM_AUTHOR || '';
  var PER_TOPIC = 2;          // запитань з кожної теми
  var PASS_SHARE = 0.75;      // поріг для сертифіката
  var STORE_KEY = 'ct-exam-certificate-v1';
  var LETTERS = ['а', 'б', 'в', 'г'];
  var W = 1123, H = 794;      // A4 альбомна, 96 dpi

  var app = document.getElementById('exam-app');
  if (!app) return;

  var exam = null;            // { person, questions, answers, current }

  // ---------- Допоміжні ----------
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined && text !== null) e.textContent = text;
    return e;
  }
  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function rnd(n) {
    if (window.crypto && window.crypto.getRandomValues) {
      var a = new Uint32Array(1); window.crypto.getRandomValues(a); return a[0] % n;
    }
    return Math.floor(Math.random() * n);
  }
  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) { var j = rnd(i + 1); var t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function today() { var d = new Date(); return pad(d.getDate()) + '.' + pad(d.getMonth() + 1) + '.' + d.getFullYear(); }
  function topicLink(t) { return 'tema-' + pad(+t) + '.html'; }
  function scrollTop() { window.scrollTo(0, Math.max(0, app.getBoundingClientRect().top + window.pageYOffset - 80)); }

  function normPart(s) {
    s = s.trim().replace(/\s+/g, ' ').replace(/['`ʼ‘]/g, '’');
    return s.split('-').map(function (p) {
      return p ? p.charAt(0).toLocaleUpperCase('uk') + p.slice(1).toLocaleLowerCase('uk') : p;
    }).join('-');
  }
  var NAME_RE = /^[Ѐ-ӿA-Za-z’\- ]{2,40}$/;

  function gender(patronymic) {
    var p = patronymic.toLocaleLowerCase('uk');
    if (/(вна|ична)$/.test(p)) return 'f';
    if (/ич$/.test(p)) return 'm';
    return '';
  }
  function certNumber(r) {
    var s = r.surname + '|' + r.name + '|' + r.patronymic + '|' + r.date + '|' + r.correct + '/' + r.total;
    var h = 2166136261;
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
    return 'CT-' + r.date.slice(-4) + '-' + ('000000' + h.toString(36).toUpperCase()).slice(-6);
  }

  function loadCert() { try { return JSON.parse(localStorage.getItem(STORE_KEY)); } catch (e) { return null; } }
  function saveCert(r) { try { localStorage.setItem(STORE_KEY, JSON.stringify(r)); } catch (e) { /* немає сховища */ } }

  function guard(on) {
    window.onbeforeunload = on ? function (e) { e.preventDefault(); e.returnValue = ''; return ''; } : null;
  }

  // ---------- Формування тесту ----------
  function buildQuestions() {
    var byTopic = {};
    BANK.forEach(function (q) { (byTopic[q.t] = byTopic[q.t] || []).push(q); });
    var picked = [];
    Object.keys(byTopic).sort(function (a, b) { return a - b; }).forEach(function (t) {
      shuffle(byTopic[t]).slice(0, PER_TOPIC).forEach(function (q) { picked.push(q); });
    });
    return shuffle(picked).map(function (q) {
      var order = shuffle(q.o.map(function (_, i) { return i; }));
      return { t: q.t, q: q.q, o: order.map(function (i) { return q.o[i]; }), a: order.indexOf(q.a) };
    });
  }

  // ---------- Екран 1: реєстрація ----------
  function renderStart(prefill) {
    guard(false);
    app.innerHTML = '';
    var saved = loadCert();
    if (saved) {
      var note = el('div', 'exam-note');
      note.appendChild(el('span', null, '🎓 У цьому браузері збережено сертифікат: ' + saved.surname.toLocaleUpperCase('uk') + ' ' + saved.name + ' ' + saved.patronymic + ' — ' + saved.pct + ' %, ' + saved.date + '. '));
      var show = el('button', 'btn secondary', 'Показати сертифікат');
      show.type = 'button';
      show.onclick = function () { renderCertificateOnly(saved); };
      note.appendChild(show);
      app.appendChild(note);
    }

    var topicCount = Object.keys(BANK.reduce(function (acc, q) { acc[q.t] = 1; return acc; }, {})).length;
    var total = topicCount * PER_TOPIC;
    var need = Math.ceil(total * PASS_SHARE);
    var card = el('div', 'exam-card');
    card.appendChild(el('h2', null, 'Правила тестування'));
    var ul = el('ul');
    [
      total + ' запитань — по ' + PER_TOPIC + ' з кожної з ' + topicCount + ' тем курсу; у кожному одна правильна відповідь.',
      'Запитання та порядок відповідей щоразу формуються випадково.',
      'Сертифікат видається за результату від 75 % — щонайменше ' + need + ' правильних відповідей з ' + total + '.',
      'Обмеження часу немає. Між запитаннями можна переходити й змінювати відповіді до завершення тесту.',
      'Якщо не вдалося — повтори теми з помилками й пройди тест знову.'
    ].forEach(function (t) { ul.appendChild(el('li', null, t)); });
    card.appendChild(ul);
    app.appendChild(card);

    var form = el('form', 'exam-card exam-form');
    form.noValidate = true;
    form.appendChild(el('h2', null, 'Дані курсанта'));
    form.appendChild(el('p', 'muted', 'Вкажи прізвище, ім’я та по батькові так, як вони мають бути написані в сертифікаті.'));
    var fields = [['surname', 'Прізвище', 'Шевченко'], ['name', 'Ім’я', 'Тарас'], ['patronymic', 'По батькові', 'Григорович']];
    var inputs = {};
    fields.forEach(function (f) {
      var lab = el('label', 'field');
      lab.appendChild(el('span', null, f[1]));
      var inp = el('input');
      inp.type = 'text'; inp.name = f[0]; inp.placeholder = 'Наприклад: ' + f[2]; inp.autocomplete = 'off'; inp.maxLength = 40;
      if (prefill) inp.value = prefill[f[0]];
      lab.appendChild(inp);
      var err = el('small', 'field-error');
      lab.appendChild(err);
      inputs[f[0]] = { input: inp, err: err };
      form.appendChild(lab);
    });
    var honest = el('label', 'check');
    var hb = el('input'); hb.type = 'checkbox'; if (prefill) hb.checked = true;
    honest.appendChild(hb);
    honest.appendChild(el('span', null, 'Підтверджую, що проходжу тестування самостійно, без сторонньої допомоги.'));
    form.appendChild(honest);
    var honestErr = el('small', 'field-error');
    form.appendChild(honestErr);
    var go = el('button', 'btn', 'Почати тестування →'); go.type = 'submit';
    form.appendChild(go);

    form.onsubmit = function (e) {
      e.preventDefault();
      var ok = true, person = {};
      fields.forEach(function (f) {
        var v = normPart(inputs[f[0]].input.value);
        inputs[f[0]].input.value = v;
        var msg = '';
        if (!v) msg = 'Заповни це поле.';
        else if (!NAME_RE.test(v)) msg = 'Лише літери, апостроф і дефіс (2–40 символів).';
        inputs[f[0]].err.textContent = msg;
        inputs[f[0]].input.classList.toggle('invalid', !!msg);
        if (msg) ok = false;
        person[f[0]] = v;
      });
      honestErr.textContent = hb.checked ? '' : 'Потрібно підтвердити самостійне проходження.';
      if (!hb.checked) ok = false;
      if (!ok) return;
      startExam(person);
    };
    app.appendChild(form);
  }

  // ---------- Екран 2: запитання ----------
  function startExam(person) {
    var qs = buildQuestions();
    exam = { person: person, questions: qs, answers: qs.map(function () { return -1; }), current: 0 };
    guard(true);
    renderQuestion();
  }

  function renderQuestion() {
    var i = exam.current, q = exam.questions[i], n = exam.questions.length;
    app.innerHTML = '';
    var answered = exam.answers.filter(function (a) { return a >= 0; }).length;

    var head = el('div', 'exam-head');
    head.appendChild(el('span', null, 'Запитання ' + (i + 1) + ' з ' + n));
    head.appendChild(el('span', 'muted', 'Відповідей: ' + answered + ' / ' + n));
    app.appendChild(head);
    var bar = el('div', 'progress'); var fill = el('div'); fill.style.width = Math.round(answered / n * 100) + '%'; fill.className = 'exam-fill';
    bar.appendChild(fill); app.appendChild(bar);

    var card = el('div', 'exam-card');
    card.appendChild(el('div', 'exam-topic', 'Тема ' + q.t + '. ' + (TOPICS[q.t] || '')));
    card.appendChild(el('h2', 'exam-q', q.q));
    q.o.forEach(function (opt, oi) {
      var lab = el('label', 'opt' + (exam.answers[i] === oi ? ' selected' : ''));
      var r = el('input'); r.type = 'radio'; r.name = 'opt'; r.checked = exam.answers[i] === oi;
      r.onchange = function () { exam.answers[i] = oi; renderQuestion(); };
      lab.appendChild(r);
      lab.appendChild(el('span', null, LETTERS[oi] + ') ' + opt));
      card.appendChild(lab);
    });
    app.appendChild(card);

    var nav = el('div', 'exam-nav');
    var back = el('button', 'btn secondary', '← Назад'); back.type = 'button'; back.disabled = i === 0;
    back.onclick = function () { exam.current--; renderQuestion(); scrollTop(); };
    nav.appendChild(back);
    if (i < n - 1) {
      var next = el('button', 'btn', 'Далі →'); next.type = 'button';
      next.onclick = function () { exam.current++; renderQuestion(); scrollTop(); };
      nav.appendChild(next);
    }
    var fin = el('button', 'btn ' + (i === n - 1 ? 'success' : 'secondary'), 'Завершити тест'); fin.type = 'button';
    fin.onclick = finishExam;
    nav.appendChild(fin);
    app.appendChild(nav);

    var dots = el('div', 'exam-dots');
    exam.questions.forEach(function (_, k) {
      var d = el('button', 'dot' + (exam.answers[k] >= 0 ? ' answered' : '') + (k === i ? ' current' : ''), String(k + 1));
      d.type = 'button'; d.title = 'Запитання ' + (k + 1);
      d.onclick = function () { exam.current = k; renderQuestion(); };
      dots.appendChild(d);
    });
    app.appendChild(dots);
  }

  function finishExam() {
    var left = exam.answers.filter(function (a) { return a < 0; }).length;
    if (left && !window.confirm('Без відповіді залишилось запитань: ' + left + '. Вони будуть зараховані як неправильні. Завершити тест?')) return;
    guard(false);
    var correct = 0;
    exam.questions.forEach(function (q, k) { if (exam.answers[k] === q.a) correct++; });
    var total = exam.questions.length;
    var r = {
      surname: exam.person.surname, name: exam.person.name, patronymic: exam.person.patronymic,
      correct: correct, total: total, pct: Math.round(correct / total * 100), date: today()
    };
    r.passed = correct >= Math.ceil(total * PASS_SHARE);
    if (r.passed) { r.number = certNumber(r); saveCert(r); }
    renderResult(r);
    scrollTop();
  }

  // ---------- Екран 3: результат ----------
  function renderResult(r) {
    app.innerHTML = '';
    var need = Math.ceil(r.total * PASS_SHARE);
    var box = el('div', 'exam-result ' + (r.passed ? 'pass' : 'fail'));
    box.appendChild(el('div', 'exam-pct', r.pct + ' %'));
    var txt = el('div');
    txt.appendChild(el('div', 'exam-verdict', r.passed ? 'Вітаємо! Тестування складено.' : 'Тестування поки не складено.'));
    txt.appendChild(el('div', null, 'Правильних відповідей: ' + r.correct + ' з ' + r.total + ' (потрібно щонайменше ' + need + ').'));
    if (!r.passed) txt.appendChild(el('div', null, 'Бракує правильних відповідей: ' + (need - r.correct) + '. Повтори теми нижче й спробуй ще раз.'));
    box.appendChild(txt);
    app.appendChild(box);

    if (r.passed) renderCertificateBlock(r);

    // Помилки
    var wrong = [];
    exam.questions.forEach(function (q, k) { if (exam.answers[k] !== q.a) wrong.push({ q: q, a: exam.answers[k] }); });
    if (wrong.length) {
      var topicsToReview = {};
      wrong.forEach(function (w) { topicsToReview[w.q.t] = true; });
      var rev = el('div', 'exam-card');
      rev.appendChild(el('h2', null, 'Теми для повторення'));
      var ul = el('ul');
      Object.keys(topicsToReview).sort(function (a, b) { return a - b; }).forEach(function (t) {
        var li = el('li'); var a = el('a', null, 'Тема ' + t + '. ' + (TOPICS[t] || '')); a.href = topicLink(t);
        li.appendChild(a); ul.appendChild(li);
      });
      rev.appendChild(ul);
      var det = el('details', 'exam-review');
      det.appendChild(el('summary', null, 'Показати помилки (' + wrong.length + ')'));
      wrong.forEach(function (w) {
        var item = el('div', 'review-item');
        item.appendChild(el('div', 'review-q', w.q.q));
        item.appendChild(el('div', 'review-bad', 'Твоя відповідь: ' + (w.a >= 0 ? w.q.o[w.a] : 'без відповіді')));
        item.appendChild(el('div', 'review-good', 'Правильна відповідь: ' + w.q.o[w.q.a]));
        det.appendChild(item);
      });
      rev.appendChild(det);
      app.appendChild(rev);
    }

    var again = el('div', 'exam-nav');
    var b = el('button', 'btn ' + (r.passed ? 'secondary' : ''), 'Пройти тест ще раз'); b.type = 'button';
    var person = exam.person;
    b.onclick = function () { renderStart(person); scrollTop(); };
    again.appendChild(b);
    app.appendChild(again);
  }

  function renderCertificateOnly(r) {
    app.innerHTML = '';
    renderCertificateBlock(r);
    var nav = el('div', 'exam-nav');
    var b = el('button', 'btn secondary', '← До тестування'); b.type = 'button';
    b.onclick = function () { renderStart(); };
    nav.appendChild(b);
    app.appendChild(nav);
    scrollTop();
  }

  // ---------- Сертифікат ----------
  function renderCertificateBlock(r) {
    var wrap = el('div', 'cert-wrap');
    var frame = el('div', 'cert-frame');
    var svg = certificateSvg(r);
    frame.innerHTML = svg;
    wrap.appendChild(frame);
    var actions = el('div', 'cert-actions');
    var png = el('button', 'btn', '⬇ Завантажити сертифікат (PNG)'); png.type = 'button';
    png.onclick = function () { downloadPng(svg, 'Сертифікат_' + r.surname + '_' + r.name + '.png'); };
    var pr = el('button', 'btn secondary', '🖨 Друк / зберегти як PDF'); pr.type = 'button';
    pr.onclick = function () {
      document.body.classList.add('print-cert');
      window.print();
      setTimeout(function () { document.body.classList.remove('print-cert'); }, 500);
    };
    actions.appendChild(png); actions.appendChild(pr);
    wrap.appendChild(actions);
    app.appendChild(wrap);
  }

  function certificateSvg(r) {
    var g = gender(r.patronymic);
    var finished = g === 'm' ? 'успішно завершив' : g === 'f' ? 'успішно завершила' : 'успішно завершив(-ла)';
    var passedV = g === 'm' ? 'склав' : g === 'f' ? 'склала' : 'склав(-ла)';
    var fullName = r.surname.toLocaleUpperCase('uk') + ' ' + r.name + ' ' + r.patronymic;
    var nameSize = Math.min(46, Math.floor(1500 / Math.max(fullName.length, 1)));
    var m = /^(.*?)\s+([A-ZА-ЯҐЄІЇ’'\- ]{3,})$/.exec(AUTHOR);
    var authorRole = m ? m[1] : '';
    var authorName = m ? m[2] : AUTHOR;
    var serif = "Georgia, 'Times New Roman', serif";
    var sans = "'Segoe UI', Arial, sans-serif";

    var guilloche = '';
    for (var k = 0; k < 18; k++) {
      guilloche += '<ellipse cx="561" cy="400" rx="300" ry="105" transform="rotate(' + (k * 10) + ' 561 400)"/>';
    }
    function corner(x, y, sx, sy) {
      return '<path d="M' + x + ',' + (y + sy * 70) + ' L' + x + ',' + y + ' L' + (x + sx * 70) + ',' + y + '" fill="none" stroke="#C9A227" stroke-width="4"/>' +
             '<rect x="' + (x + sx * 10 - 6) + '" y="' + (y + sy * 10 - 6) + '" width="12" height="12" fill="#C9A227" transform="rotate(45 ' + (x + sx * 10) + ' ' + (y + sy * 10) + ')"/>';
    }

    return '' +
      '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + ' ' + H + '">' +
      '<defs>' +
        '<linearGradient id="gold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#F3D77A"/><stop offset=".5" stop-color="#C9A227"/><stop offset="1" stop-color="#9A7A12"/></linearGradient>' +
        '<path id="sealPath" d="M 561,690 m -50,0 a 50,50 0 1,1 100,0 a 50,50 0 1,1 -100,0"/>' +
      '</defs>' +
      '<rect width="' + W + '" height="' + H + '" fill="#FFFDF7"/>' +
      '<g fill="none" stroke="#E9DFC0" stroke-width="1.2" opacity=".7">' + guilloche + '</g>' +
      '<rect x="18" y="18" width="1087" height="758" fill="none" stroke="#1F3864" stroke-width="8"/>' +
      '<rect x="34" y="34" width="1055" height="726" fill="none" stroke="#C9A227" stroke-width="2"/>' +
      '<rect x="42" y="42" width="1039" height="710" fill="none" stroke="#C9A227" stroke-width="1"/>' +
      corner(56, 56, 1, 1) + corner(1067, 56, -1, 1) + corner(56, 738, 1, -1) + corner(1067, 738, -1, -1) +
      // емблема
      '<g transform="translate(561 100)">' +
        '<circle r="38" fill="#1F3864" stroke="url(#gold)" stroke-width="4"/>' +
        '<g stroke="#D9E2F3" stroke-width="4" stroke-linecap="round"><line x1="-15" y1="-15" x2="15" y2="15"/><line x1="15" y1="-15" x2="-15" y2="15"/></g>' +
        '<g fill="#D9E2F3"><circle cx="-17" cy="-17" r="7"/><circle cx="17" cy="-17" r="7"/><circle cx="-17" cy="17" r="7"/><circle cx="17" cy="17" r="7"/></g>' +
        '<rect x="-8" y="-8" width="16" height="16" rx="3" fill="#FFC000"/>' +
      '</g>' +
      '<text x="561" y="200" text-anchor="middle" font-family="' + serif + '" font-size="62" font-weight="bold" letter-spacing="12" fill="#1F3864">СЕРТИФІКАТ</text>' +
      '<text x="561" y="238" text-anchor="middle" font-family="' + sans + '" font-size="17" letter-spacing="5" fill="#9A7A12">ПРО ЗАВЕРШЕННЯ НАВЧАЛЬНОГО КУРСУ</text>' +
      '<text x="561" y="284" text-anchor="middle" font-family="' + serif + '" font-size="29" font-weight="bold" fill="#1F3864">«СУЧАСНІ КОГНІТИВНІ ТЕХНОЛОГІЇ»</text>' +
      '<text x="561" y="338" text-anchor="middle" font-family="' + serif + '" font-size="19" font-style="italic" fill="#5A6472">Цей сертифікат засвідчує, що</text>' +
      '<text x="561" y="400" text-anchor="middle" font-family="' + serif + '" font-size="' + nameSize + '" font-weight="bold" fill="#1F3864">' + esc(fullName) + '</text>' +
      '<line x1="230" y1="420" x2="893" y2="420" stroke="url(#gold)" stroke-width="2"/>' +
      '<text x="561" y="462" text-anchor="middle" font-family="' + serif + '" font-size="19" fill="#1E2733">' + finished + ' навчальний курс обсягом 38 годин (5 модулів, 19 тем)</text>' +
      '<text x="561" y="492" text-anchor="middle" font-family="' + serif + '" font-size="19" fill="#1E2733">і ' + passedV + ' підсумкове тестування з результатом ' +
        '<tspan font-weight="bold" fill="#1F3864">' + r.pct + ' %</tspan> (' + r.correct + ' з ' + r.total + ' правильних відповідей)</text>' +
      // дата і номер
      '<g font-family="' + sans + '">' +
        '<text x="110" y="640" font-size="13" fill="#5A6472" letter-spacing="1">ДАТА ВИДАЧІ</text>' +
        '<text x="110" y="664" font-size="20" fill="#1F3864" font-weight="bold">' + esc(r.date) + '</text>' +
        '<text x="110" y="698" font-size="13" fill="#5A6472" letter-spacing="1">НОМЕР СЕРТИФІКАТА</text>' +
        '<text x="110" y="720" font-size="17" fill="#1F3864" font-weight="bold">' + esc(r.number || '') + '</text>' +
      '</g>' +
      // печатка
      '<g>' +
        '<circle cx="561" cy="690" r="64" fill="url(#gold)"/>' +
        '<circle cx="561" cy="690" r="58" fill="none" stroke="#FFF6D5" stroke-width="1.5"/>' +
        '<circle cx="561" cy="690" r="38" fill="#FFFDF7" opacity=".25"/>' +
        '<text font-family="' + sans + '" font-size="10" font-weight="bold" fill="#5C4708" letter-spacing="0.6"><textPath xlink:href="#sealPath" href="#sealPath">КОГНІТИВНІ ТЕХНОЛОГІЇ • КУРС ЗАВЕРШЕНО •</textPath></text>' +
        '<path d="M545,690 l11,11 l22,-24" fill="none" stroke="#1F3864" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>' +
      '</g>' +
      // автор
      '<g font-family="' + sans + '" text-anchor="middle">' +
        '<text x="880" y="640" font-size="13" fill="#5A6472" letter-spacing="1">АВТОР КУРСУ</text>' +
        '<line x1="740" y1="672" x2="1020" y2="672" stroke="#1F3864" stroke-width="1"/>' +
        '<text x="880" y="694" font-size="14" fill="#1E2733">' + esc(authorRole) + '</text>' +
        '<text x="880" y="716" font-size="18" font-weight="bold" fill="#1F3864" font-family="' + serif + '">' + esc(authorName) + '</text>' +
      '</g>' +
      '</svg>';
  }

  function downloadPng(svg, filename) {
    var img = new Image();
    img.onload = function () {
      var c = document.createElement('canvas');
      c.width = W * 2; c.height = H * 2;
      var ctx = c.getContext('2d');
      ctx.scale(2, 2);
      ctx.drawImage(img, 0, 0, W, H);
      try {
        c.toBlob(function (blob) {
          var a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = filename;
          document.body.appendChild(a); a.click();
          setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
        }, 'image/png');
      } catch (e) {
        window.alert('Не вдалося зберегти PNG у цьому браузері. Скористайся кнопкою «Друк / зберегти як PDF».');
      }
    };
    img.onerror = function () { window.alert('Не вдалося підготувати зображення. Скористайся кнопкою «Друк / зберегти як PDF».'); };
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }

  if (!BANK.length) { app.appendChild(el('p', null, 'Помилка: не знайдено банк запитань.')); return; }
  renderStart();
})();
