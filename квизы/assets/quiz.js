// Логика квиза подбора Макс Групп: шаги, сводка, подсказки, выбор мессенджера, маска телефона, отправка заявки.
// Настройки страницы лежат в <script id="q-config"> (собирает build.mjs из models.mjs).
(() => {
  const cfg = JSON.parse(document.getElementById('q-config').textContent);
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  const body = document.body;
  const start = $('[data-screen="start"]');
  const run = $('[data-screen="quiz"]');
  const form = $('[data-form]');
  const steps = $$('.q-step', form);
  const nav = $('[data-nav]');
  const btnBack = $('[data-back]');
  const btnNext = $('[data-next]');
  const nextLabel = $('[data-next-label]');
  const btnSubmit = $('[data-submit]');
  const done = $('[data-done]');
  const tip = $('[data-tip-text]');
  const bar = $('[data-progress-bar]');
  const barText = $('[data-progress-text]');
  const fields = $('[data-contact-fields]');
  const tgField = $('[data-tg-field]');
  const last = steps.length - 1;
  const questions = last; // шаг контактов не считаем вопросом
  let cur = -1;
  let finished = false;
  let autoTimer = 0;

  const goal = (name) => {
    try { if (cfg.metrika && typeof window.ym === 'function') window.ym(cfg.metrika, 'reachGoal', name); } catch (e) { /* без метрики */ }
  };

  // --- UTM и метки рекламы: сохраняем на сессию, чтобы не потерять при переходах ---------------------
  const utm = (() => {
    const keys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'yclid', 'gclid'];
    const p = new URLSearchParams(location.search);
    const got = Object.fromEntries(keys.filter((k) => p.get(k)).map((k) => [k, p.get(k)]));
    try {
      if (Object.keys(got).length) sessionStorage.setItem('mg-utm', JSON.stringify(got));
      else return JSON.parse(sessionStorage.getItem('mg-utm') || '{}');
    } catch (e) { /* приватный режим */ }
    return got;
  })();

  // --- Переходы ----------------------------------------------------------------------------------------
  function openQuiz() {
    body.dataset.state = 'quiz';
    start.hidden = true;
    run.hidden = false;
    history.pushState({ q: 0 }, '');
    go(0, { push: false });
    goal('quiz_start');
  }

  function closeQuiz() {
    body.dataset.state = 'start';
    delete body.dataset.step;
    run.hidden = true;
    start.hidden = false;
    cur = -1;
    window.scrollTo(0, 0);
    $('[data-go]').focus({ preventScroll: true });
  }

  function go(i, { back = false, push = true } = {}) {
    clearTimeout(autoTimer);
    if (i === cur) return;
    steps.forEach((s, j) => {
      s.hidden = j !== i;
      s.classList.toggle('is-back', back);
    });
    cur = i;
    body.dataset.step = steps[i].dataset.step;
    if (push) history.pushState({ q: i }, '');

    const isLast = i === last;
    barText.textContent = isLast ? 'Последний шаг' : `Вопрос ${i + 1} из ${questions}`;
    bar.style.width = `${Math.round(((i + 1) / (last + 1)) * 100)}%`;
    btnNext.hidden = isLast;
    tip.textContent = steps[i].dataset.tip || '';
    updateNext();

    window.scrollTo({ top: 0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    const title = $('.q-q', steps[i]);
    if (title) title.focus({ preventScroll: true });
    if (i > 0) goal(`quiz_step_${i + 1}`);
  }

  function updateNext() {
    const step = steps[cur];
    if (!step) return;
    // на последнем шаге кнопка отправки появляется, когда выбран мессенджер
    btnSubmit.hidden = cur !== last || fields.hidden;
    if (cur === last) return;
    const has = Boolean($('input:checked', step));
    if ('optional' in step.dataset) {
      btnNext.disabled = false;
      btnNext.classList.toggle('is-skip', !has);
      nextLabel.textContent = has ? 'Далее' : 'Пропустить';
    } else {
      btnNext.disabled = !has;
      btnNext.classList.remove('is-skip');
      nextLabel.textContent = 'Далее';
    }
  }

  function next() {
    if (cur >= last) return;
    if (!btnNext.disabled) go(cur + 1);
  }

  // кнопка «Назад» и системный жест «назад» идут через историю
  btnBack.addEventListener('click', () => history.back());
  window.addEventListener('popstate', (e) => {
    if (finished) return;
    const q = e.state && typeof e.state.q === 'number' ? e.state.q : null;
    if (q === null) closeQuiz();
    else {
      if (run.hidden) { body.dataset.state = 'quiz'; start.hidden = true; run.hidden = false; }
      go(q, { back: q < cur, push: false });
    }
  });

  $$('[data-go]').forEach((b) => b.addEventListener('click', openQuiz));
  // логотип ведет на первый экран квиза; ответы сохраняются, «Назад» вернет к шагу, где был человек
  $$('[data-home]').forEach((el) => el.addEventListener('click', (e) => {
    e.preventDefault();
    if (finished) { location.href = location.pathname; return; }
    if (!run.hidden) { closeQuiz(); history.pushState(null, ''); }
    else window.scrollTo({ top: 0, behavior: 'smooth' });
  }));
  btnNext.addEventListener('click', next);

  // --- Выбор ответов -----------------------------------------------------------------------------------
  form.addEventListener('change', (e) => {
    const input = e.target;
    const group = input.closest('[data-group]');

    // «Не важно» в множественном выборе снимает остальные цвета и наоборот
    if (group && 'multi' in group.dataset && input.checked) {
      const isAny = 'any' in input.dataset;
      $$('input', group).forEach((x) => { if (x !== input && ('any' in x.dataset) !== isAny) x.checked = false; });
    }

    if (input.name === 'contact') chooseContact(input.value);
    if (input.name === 'agree' && input.checked) setInvalid($('.q-check'), false);

    refreshSummary(input.name);
    updateNext();

    // один вариант на шаге: сразу дальше
    if (group && input.type === 'radio' && input.name !== 'contact' && cur < last) {
      autoTimer = setTimeout(next, 360);
    }
  });

  // --- Мессенджер: после выбора показываем поля, ник только для Telegram -------------------------------
  function chooseContact(value) {
    const wasHidden = fields.hidden;
    fields.hidden = false;
    tgField.hidden = value !== 'Telegram';
    $('[data-wa-note]').hidden = value !== 'WhatsApp';
    $('.q-field__err--contact').classList.remove('is-shown');
    updateNext();
    if (wasHidden) {
      if (matchMedia('(pointer: fine)').matches) phone.focus({ preventScroll: true });
      fields.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'nearest' });
    }
  }

  // --- Сводка справа -----------------------------------------------------------------------------------
  function refreshSummary(changed) {
    $$('[data-sum-val]').forEach((dd) => {
      const name = dd.dataset.sumVal;
      const val = $$(`input[name="${CSS.escape(name)}"]:checked`, form).map((x) => x.dataset.sum).join(', ');
      const row = dd.parentElement;
      const was = row.classList.contains('is-set') ? dd.textContent : '';
      dd.textContent = val || 'не выбрано';
      row.classList.toggle('is-set', Boolean(val));
      if (name === changed && val && val !== was) {
        row.classList.remove('is-flash');
        void row.offsetWidth;
        row.classList.add('is-flash');
      }
    });
  }

  // --- Телефон -----------------------------------------------------------------------------------------
  const phone = form.elements.phone;
  // возвращает «7» и до 10 цифр номера; первую 8 или 7 считаем кодом страны
  const digits = (v) => {
    const plus7 = /^\s*\+\s*7/.test(v);
    let d = (plus7 ? v.replace(/^\s*\+\s*7/, '') : v).replace(/\D/g, '');
    if (d.length >= 11 && (d[0] === '8' || d[0] === '7')) d = d.slice(1);
    else if (d.length === 1 && (d === '8' || d === '7')) d = '';
    return `7${d.slice(0, 10)}`;
  };
  const fmt = (d) => {
    const p = d.slice(1);
    let s = '+7 (';
    if (p.length) s += p.slice(0, 3);
    if (p.length >= 3) s += ')';
    if (p.length > 3) s += ` ${p.slice(3, 6)}`;
    if (p.length > 6) s += `-${p.slice(6, 8)}`;
    if (p.length > 8) s += `-${p.slice(8, 10)}`;
    return s;
  };
  phone.addEventListener('focus', () => { if (!phone.value) phone.value = '+7 ('; });
  phone.addEventListener('blur', () => { if (digits(phone.value).length <= 1) phone.value = ''; });
  phone.addEventListener('input', (e) => {
    if (e.inputType && e.inputType.startsWith('delete')) return; // стирание не форматируем, чтобы не мешать
    phone.value = fmt(digits(phone.value));
    if (digits(phone.value).length === 11) setInvalid(phone.closest('.q-field'), false);
  });

  // ник Telegram: принимаем @nick, nick и ссылку t.me/nick
  const tgNick = (v) => {
    const m = String(v || '').trim().replace(/^https?:\/\//i, '').replace(/^(t\.me|telegram\.me)\//i, '').replace(/^@/, '').match(/^[A-Za-z0-9_]{4,32}$/);
    return m ? `@${m[0]}` : '';
  };

  function setInvalid(el, bad) {
    el.classList.toggle('is-invalid', bad);
    const input = $('input', el);
    if (input) input.setAttribute('aria-invalid', bad ? 'true' : 'false');
    if (el.classList.contains('q-check')) $('.q-field__err--agree').classList.toggle('is-shown', bad);
  }

  // --- Enter -------------------------------------------------------------------------------------------
  form.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' || e.isComposing || e.target.tagName === 'BUTTON' || e.target.tagName === 'A') return;
    e.preventDefault();
    if (cur < last) next();
    else form.requestSubmit();
  });

  // --- Отправка ----------------------------------------------------------------------------------------
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (finished) return;
    const contact = $('input[name="contact"]:checked', form)?.value || '';
    if (!contact) { $('.q-field__err--contact').classList.add('is-shown'); return; }
    const okPhone = digits(phone.value).length === 11;
    const agree = form.elements.agree.checked;
    setInvalid(phone.closest('.q-field'), !okPhone);
    setInvalid($('.q-check'), !agree);
    if (!okPhone) { phone.focus(); return; }
    if (!agree) { form.elements.agree.focus(); return; }

    const answers = {};
    $$('[data-sum-val]').forEach((dd) => { if (dd.parentElement.classList.contains('is-set')) answers[dd.previousElementSibling.textContent] = dd.textContent; });
    const telegram = contact === 'Telegram' ? tgNick(form.elements.tg.value) || form.elements.tg.value.trim() : '';
    const lead = {
      source: 'quiz',
      quiz: cfg.slug,
      model: cfg.model,
      subject: `Квиз ${cfg.model}`,
      contact,
      phone: `+${digits(phone.value)}`,
      telegram,
      name: form.elements.name.value.trim(),
      answers,
      comment: [...Object.entries(answers).map(([k, v]) => `${k} ${v}`), `Связь ${contact}${telegram ? ` ${telegram}` : ''}`].join('; '),
      utm,
      page: location.href.split('#')[0],
      referrer: document.referrer,
      createdAt: new Date().toISOString(),
    };

    btnSubmit.classList.add('is-loading');
    let failed = false;
    try {
      if (cfg.endpoint) {
        const headers = { 'Content-Type': 'application/json', Accept: 'application/json' };
        if (form.hasAttribute('data-server-lead')) {
          headers['X-CSRFToken'] = form.elements.csrfmiddlewaretoken.value;
          lead.submission_id = form.elements.submission_id.value;
          lead.agree = agree;
          lead.page = location.pathname;
        }
        const res = await fetch(cfg.endpoint, { method: 'POST', headers, body: JSON.stringify(lead) });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
      } else {
        console.info('[квиз] заявка (endpoint не задан, никуда не отправлена)', lead);
      }
      try {
        if (!form.hasAttribute('data-server-lead')) {
          const saved = JSON.parse(localStorage.getItem('mg-quiz-leads') || '[]');
          saved.push(lead);
          localStorage.setItem('mg-quiz-leads', JSON.stringify(saved.slice(-20)));
        }
      } catch (err) { /* хранилище недоступно */ }
    } catch (err) {
      failed = true;
      console.warn('[квиз] заявка не отправлена', err);
    }
    btnSubmit.classList.remove('is-loading');
    if (failed && form.hasAttribute('data-server-lead')) {
      const error = form.querySelector('[data-submit-error]');
      error.hidden = false;
      return;
    }
    finish(contact, failed);
  });

  function finish(contact, failed) {
    finished = true;
    if (!failed) goal('quiz_lead');
    steps.forEach((s) => { s.hidden = true; });
    nav.hidden = true;
    done.hidden = false;
    body.dataset.step = 'done';
    barText.textContent = failed ? 'Заявка не отправлена' : 'Заявка принята';
    bar.style.width = '100%';
    const how = contact === 'Звонок' ? 'позвонит вам' : `напишет вам в ${contact}`;
    $('[data-done-text]').textContent = `Менеджер ${how} в рабочее время, ${cfg.hours}.`;
    $('[data-done-text]').hidden = failed;
    $('[data-done-err]').hidden = !failed;
    history.replaceState({ done: true }, '');
    window.scrollTo(0, 0);
    done.focus({ preventScroll: true });
  }

  refreshSummary();
  // если открыли страницу заново из истории в середине квиза, начинаем с первого экрана
  history.replaceState(null, '');
})();
