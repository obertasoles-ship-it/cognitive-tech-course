(function () {
  'use strict';
  var TOTAL = 18;
  var KEY = 'ct-course-progress-v1';

  function load() {
    try { return JSON.parse(localStorage.getItem(KEY)) || { done: {}, scores: {} }; }
    catch (e) { return { done: {}, scores: {} }; }
  }
  function save(state) {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* локальне сховище недоступне */ }
  }
  var state = load();

  // ---------- Мобільне меню ----------
  var menuBtn = document.getElementById('menu-btn');
  if (menuBtn) {
    menuBtn.addEventListener('click', function () { document.body.classList.toggle('nav-open'); });
    document.querySelector('.content').addEventListener('click', function () { document.body.classList.remove('nav-open'); });
  }

  // ---------- Відмітки про вивчення ----------
  function refreshMarks() {
    var doneCount = 0;
    for (var k in state.done) { if (state.done[k] && +k <= TOTAL) doneCount++; }
    document.querySelectorAll('[data-topic]').forEach(function (el) {
      el.classList.toggle('done', !!state.done[el.getAttribute('data-topic')]);
    });
    var fill = document.getElementById('progress-fill');
    if (fill) fill.style.width = Math.round(doneCount / TOTAL * 100) + '%';
    var txt = document.getElementById('progress-text');
    if (txt) txt.textContent = doneCount + ' з ' + TOTAL + ' тем';
    var btn = document.getElementById('mark-done');
    if (btn) {
      var t = btn.getAttribute('data-for');
      btn.textContent = state.done[t] ? '✓ Тему вивчено' : 'Позначити тему як вивчену';
      btn.classList.toggle('success', !!state.done[t]);
    }
  }
  var markBtn = document.getElementById('mark-done');
  if (markBtn) {
    markBtn.addEventListener('click', function () {
      var t = markBtn.getAttribute('data-for');
      state.done[t] = !state.done[t];
      save(state); refreshMarks();
    });
  }
  refreshMarks();

  // ---------- Тести ----------
  var quizData = document.getElementById('quiz-data');
  var quizBox = document.getElementById('quiz');
  if (quizData && quizBox) {
    var questions = JSON.parse(quizData.textContent);
    var topic = quizBox.getAttribute('data-topic');
    var letters = ['а', 'б', 'в', 'г', 'д'];

    questions.forEach(function (q, qi) {
      var fs = document.createElement('fieldset');
      fs.className = 'quiz-q';
      var lg = document.createElement('legend');
      lg.textContent = (qi + 1) + '. ' + q.q;
      fs.appendChild(lg);
      q.o.forEach(function (opt, oi) {
        var lab = document.createElement('label');
        var inp = document.createElement('input');
        inp.type = 'radio'; inp.name = 'q' + qi; inp.value = oi;
        var span = document.createElement('span');
        span.textContent = letters[oi] + ') ' + opt;
        lab.appendChild(inp); lab.appendChild(span);
        fs.appendChild(lab);
      });
      quizBox.appendChild(fs);
    });

    var actions = document.createElement('div');
    actions.className = 'quiz-actions';
    var check = document.createElement('button');
    check.className = 'btn'; check.type = 'button'; check.textContent = 'Перевірити відповіді';
    var reset = document.createElement('button');
    reset.className = 'btn secondary'; reset.type = 'button'; reset.textContent = 'Пройти ще раз';
    var result = document.createElement('span');
    result.className = 'quiz-result';
    actions.appendChild(check); actions.appendChild(reset); actions.appendChild(result);
    quizBox.appendChild(actions);

    var prev = state.scores[topic];
    if (prev) result.textContent = 'Попередній результат: ' + prev;

    check.addEventListener('click', function () {
      var correct = 0, answered = 0;
      questions.forEach(function (q, qi) {
        var labels = quizBox.querySelectorAll('input[name="q' + qi + '"]');
        labels.forEach(function (inp) {
          var lab = inp.parentNode;
          lab.classList.remove('correct', 'wrong');
          var idx = +inp.value;
          if (idx === q.a) lab.classList.add('correct');
          if (inp.checked) {
            answered++;
            if (idx === q.a) correct++; else lab.classList.add('wrong');
          }
        });
      });
      var score = correct + ' з ' + questions.length;
      result.textContent = (answered < questions.length ? 'Є запитання без відповіді. ' : '') + 'Правильно: ' + score;
      result.className = 'quiz-result ' + (correct >= Math.ceil(questions.length * 0.8) ? 'good' : 'bad');
      state.scores[topic] = score;
      save(state);
    });

    reset.addEventListener('click', function () {
      quizBox.querySelectorAll('input').forEach(function (inp) { inp.checked = false; });
      quizBox.querySelectorAll('label').forEach(function (l) { l.classList.remove('correct', 'wrong'); });
      result.textContent = ''; result.className = 'quiz-result';
    });
  }

  // ---------- Пошук у глосарії ----------
  var search = document.getElementById('gloss-search');
  if (search) {
    search.addEventListener('input', function () {
      var q = search.value.trim().toLowerCase();
      document.querySelectorAll('.glossary p').forEach(function (p) {
        p.classList.toggle('hidden', q !== '' && p.textContent.toLowerCase().indexOf(q) === -1);
      });
    });
  }
})();
