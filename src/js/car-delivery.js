// Цена машины и тариф для ее кузова берутся из той же таблицы, что и на странице автомобиля.
(() => {
  const dialog = document.querySelector('#modal-car-delivery');
  if (!dialog) return;
  const city = dialog.querySelector('[data-delivery-city]');
  const link = dialog.querySelector('[data-delivery-details]');
  function update() {
    const { fee, total } = city.selectedOptions[0].dataset;
    dialog.querySelector('[data-delivery-fee]').textContent = fee;
    dialog.querySelector('[data-delivery-total]').textContent = total;
    const url = new URL(link.href);
    url.searchParams.set('city', city.value);
    link.href = url.href;
  }
  city.addEventListener('change', update);
  update();
})();
