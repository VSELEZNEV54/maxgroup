(() => {
  'use strict';
  const dialog = document.getElementById('modal-chat');
  if (!dialog) return;
  const find = (selector) => dialog.querySelector(selector);
  const compose = find('[data-chat-question]');
  const question = compose.elements.question;
  const lead = find('[data-chat-lead]');
  const log = find('[data-chat-log]');
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
    const field = contact.hidden ? question : lead.elements.name;
    if (!lead.classList.contains('is-sent')) field.focus({ preventScroll: true });
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

  compose.addEventListener('submit', (event) => {
    event.preventDefault();
    const text = question.value.trim();
    if (!text || !contact.hidden) return;
    const acknowledgment = 'Мы приняли ваш вопрос. Оставьте свои контакты.';
    const customer = document.createElement('p');
    customer.className = 'chat__message chat__message--user';
    customer.textContent = text;
    const reply = document.createElement('p');
    reply.className = 'chat__message';
    reply.textContent = acknowledgment;
    log.append(customer, reply);
    lead.elements.conversation.value = 'Клиент: ' + text + '\nМакс Групп: ' + acknowledgment;
    compose.hidden = true;
    contact.hidden = false;
    lead.elements.name.focus({ preventScroll: true });
    // На коротком экране сначала показываем подтверждение и начало формы.
    reply.scrollIntoView({ block: 'nearest', behavior: 'instant' });
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
