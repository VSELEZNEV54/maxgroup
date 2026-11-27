// На сервере тот же адрес возвращает свежую выборку, на статическом хостинге — датированный снимок.
(function () {
  function replaceMissingPhoto(photo) {
    if (!photo.matches('[data-offer-photo]')) return;
    var fallback = photo.dataset.modelPhoto;
    if (!fallback || photo.getAttribute('src') === fallback) return;
    photo.src = fallback;
    photo.alt = 'Фото модели ' + photo.dataset.modelName;
    var caption = photo.parentElement.querySelector('.model-photo-caption');
    if (caption) caption.hidden = false;
    var zoom = photo.closest('[data-gallery-item]');
    if (zoom) { zoom.href = fallback; zoom.dataset.alt = photo.alt; }
  }
  document.addEventListener('error', function (e) {
    if (e.target instanceof HTMLImageElement) replaceMissingPhoto(e.target);
  }, true);
  document.querySelectorAll('[data-offer-photo]').forEach(function (photo) {
    if (photo.complete && !photo.naturalWidth) replaceMissingPhoto(photo);
  });
  var block = document.querySelector('[data-model-offers]');
  if (!block) return;
  var expiryTimer;
  function checkExpiry() {
    clearTimeout(expiryTimer);
    var remaining = Date.parse(block.dataset.expires) - Date.now();
    if (remaining > 0) {
      expiryTimer = setTimeout(checkExpiry, remaining);
    } else {
      var message = document.createElement('p');
      message.className = 'offer-status';
      message.textContent = 'Сведения о наличии обновляются. Оставьте запрос, чтобы получить предложения по этой модели.';
      var grid = block.querySelector('[data-cars]') || document.createElement('div');
      grid.className = 'grid grid--4 model-offers';
      grid.setAttribute('data-cars', '');
      grid.replaceChildren();
      message.setAttribute('data-cars-empty', '');
      block.replaceChildren(grid, message);
      block.dispatchEvent(new Event('catalog:updated', { bubbles: true }));
    }
  }
  checkExpiry();
  if (location.protocol === 'file:' || !block.dataset.modelOffers) return;
  function refresh() {
    fetch(block.dataset.modelOffers, { cache: 'no-cache' })
      .then(function (r) { if (!r.ok) throw new Error(String(r.status)); return r.json(); })
      .then(function (data) {
        if (!data.checkedAt || data.checkedAt === block.dataset.checked || !data.html || !data.expires) return;
        if (Date.parse(data.expires) <= Date.now()) return;
        block.innerHTML = data.html;
        block.dataset.checked = data.checkedAt;
        block.dataset.expires = data.expires;
        checkExpiry();
        block.dispatchEvent(new Event('catalog:updated', { bubbles: true }));
      }).catch(checkExpiry);
  }
  refresh();
  document.addEventListener('visibilitychange', function () {
    if (!document.hidden && Date.now() - Date.parse(block.dataset.checked) > 300000) refresh();
  });
})();
