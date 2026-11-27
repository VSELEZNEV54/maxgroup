(() => {
  'use strict';
  const dialog = document.getElementById('modal-chat');
  if (!dialog) return;
  const find = (selector) => dialog.querySelector(selector);
  const compose = find('[data-chat-question]');
  const question = compose.elements.question;
  const lead = find('[data-chat-lead]');
  const log = find('[data-chat-log]');
  const scrollArea = find('.chat__scroll');
  log.tabIndex = -1;
  const toggle = document.querySelector('[data-chat-toggle]');
  const contact = find('[data-chat-contact]');
  const viewport = window.visualViewport;
  const cookie = document.querySelector('.cookie');
  if (cookie && window.ResizeObserver) {
    new ResizeObserver(() => {
      document.body.style.setProperty('--chat-cookie-height', cookie.offsetHeight + 'px');
    }).observe(cookie);
  }

  function fitKeyboard() {
    if (!dialog.open || !viewport) return;
    const inset = viewport.scale === 1 ? Math.max(0, innerHeight - viewport.height - viewport.offsetTop) : 0;
    dialog.style.setProperty('--chat-keyboard', inset + 'px');
  }
  viewport?.addEventListener('resize', fitKeyboard);
  viewport?.addEventListener('scroll', fitKeyboard);

  toggle.addEventListener('click', () => {
    if (dialog.open) { dialog.close(); return; }
    document.querySelectorAll('video:not([aria-hidden="true"])').forEach((v) => v.pause());
    dialog.show();
    fitKeyboard();
    toggle.setAttribute('aria-expanded', 'true');
    toggle.setAttribute('aria-label', 'Закрыть чат');
    if (!lead.classList.contains('is-sent')) {
      let target = log;
      if (!compose.hidden) target = question;
      else if (!contact.hidden) target = lead.elements.name;
      target.focus({ preventScroll: true });
    }
  });
  dialog.addEventListener('close', () => {
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Открыть чат');
  });
  find('[data-modal-close]').addEventListener('click', () => toggle.focus({ preventScroll: true }));
  document.addEventListener('keydown', (event) => {
    if (dialog.open && event.key === 'Escape') {
      dialog.close();
      toggle.focus({ preventScroll: true });
    }
  });

  function revealInChat(element) {
    if (!dialog.open) return;
    const overflow = element.getBoundingClientRect().bottom - scrollArea.getBoundingClientRect().bottom;
    if (overflow > 0) scrollArea.scrollTop += overflow;
  }
  const wait = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms));

  compose.addEventListener('submit', async (event) => {
    event.preventDefault();
    const text = question.value.trim();
    if (!text || compose.hidden) return;
    compose.hidden = true;
    const customer = document.createElement('p');
    customer.className = 'chat__message chat__message--user';
    customer.textContent = text;
    const typing = document.createElement('p');
    typing.className = 'chat__message chat__typing';
    typing.innerHTML = '<span class="sr-only">Валерий печатает…</span><i aria-hidden="true"></i><i aria-hidden="true"></i><i aria-hidden="true"></i>';
    log.append(customer, typing);
    log.focus({ preventScroll: true });
    revealInChat(typing);

    await wait(1500);
    const acknowledgment = 'Мы приняли ваш вопрос. Оставьте имя и телефон — мы свяжемся с вами и подберём подходящее решение.';
    const reply = document.createElement('p');
    reply.className = 'chat__message chat__message--reply';
    reply.textContent = acknowledgment;
    typing.replaceWith(reply);
    lead.elements.conversation.value = 'Клиент: ' + text + '\nМакс Групп: ' + acknowledgment;
    revealInChat(reply);

    await wait(750);
    contact.hidden = false;
    if (dialog.open) {
      // Оставляем ответ над формой, прокручивая только переписку.
      scrollArea.scrollTop = reply.getBoundingClientRect().top - log.getBoundingClientRect().top;
    }
  });
  lead.addEventListener('lead:sent', () => {
    lead.querySelector('[data-success-title]').textContent = lead.hasAttribute('data-server-lead')
      ? 'Спасибо! Валерий свяжется с вами по указанному телефону.'
      : 'Вопрос готов. Отправьте его Валерию в WhatsApp.';
  });
  document.addEventListener('play', (event) => {
    if (dialog.open && event.target.matches('video:not([aria-hidden="true"])')) dialog.close();
  }, true);
})();
