// Регрессии каталога: варианты одного семейства, статус объявления и частичная стоимость.
import assert from 'node:assert/strict';
import test from 'node:test';
import { fetchModelOffers, offerVehicle } from '../src/data/model-offers.mjs';
import { offerList } from '../src/components/model-offers.mjs';
import { loadContext } from '../src/data/index.mjs';
import { popularModelPages } from '../src/pages/popular-models.mjs';
import { modelOfferPage } from '../src/pages/model-offers.mjs';

const entry = { country: 'japan', name: 'Toyota Yaris Hybrid', engine: '1,5 л гибрид', years: 'от 2022' };
function car(id, overrides = {}) {
  return {
    id, identity: { manufacturer: 'Toyota', model: 'Yaris', title: 'Toyota Yaris', trim: 'HYBRID X' },
    listing: { sell_status: 'active', year: 2023, mileage_km: 0 },
    specs: { powertrain_type: 'other_hybrid', fuel_type: 'Гибрид' }, source: { country: 'JP' },
    media: { main_photo: 'https://carhubauto.ru/api/v2/cars/' + id + '/photo' },
    pricing: { presentation: { amount_rub: 900000, kind: 'known_part', label: 'Рассчитанная часть стоимости', notice: 'Нужна мощность' } },
    ...overrides,
  };
}
const reply = (cars) => Response.json({ data: cars, generated_at: new Date().toISOString(), pagination: {} });

test('На обеих страницах модели работает ее квиз, в том числе при пустой выдаче', () => {
  const ctx = loadContext({ year: 2026 });
  const profile = ctx.popularModels.find((p) => p.name === 'Honda N-Box');
  profile.offers = { checkedAt: new Date().toISOString(), cars: [] };
  const pages = popularModelPages(ctx).filter((p) => [profile.url, profile.pricesUrl].includes(p.url));
  assert.equal(pages.length, 2);
  for (const page of pages) {
    const body = page.render();
    assert.ok(page.scripts.includes('quiz'));
    assert.match(body, /data-quiz-profile="Honda N-Box"/);
    assert.match(body, /name="q-model" value="N-Box" readonly/);
    assert.deepEqual([...body.matchAll(/data-quiz-step="([^"]+)"/g)].map((m) => m[1]), ['model', 'budget', 'year', 'mileage', 'contact']);
    assert.doesNotMatch(body, /class="stock-request"/);
  }
  const offer = { id: 1234, title: 'Honda N-BOX', trim: 'G', year: 2021, km: 0, price: null, priceNotice: 'Нужна мощность' };
  const detail = modelOfferPage(ctx, profile, offer, profile.offers.checkedAt, () => '/model-media/1234.webp');
  assert.equal(detail.url, profile.url + 'lot-1234/');
  assert.match(detail.render(), /data-modal-car="Honda N-BOX G, 2021 · № 1234"/);
  assert.match(detail.render(), /по запросу/i);
  assert.match(detail.render(), /Нужна мощность/);
});

test('В выдаче Yaris Hybrid остаются только активные гибридные Yaris из Японии', async (t) => {
  t.mock.method(globalThis, 'fetch', async (url) => {
    const q = new URL(url).searchParams;
    for (const [k, v] of Object.entries({ source_country: 'JP', manufacturer: 'Toyota', model: 'Yaris', available_only: 'true', engine_type: 'hybrid', year_min: '2022' })) {
      assert.equal(q.get(k), v);
    }
    return reply([car(1), car(1),
      car(2, { listing: { sell_status: 'sold' } }), car(3, { source: { country: 'CN' } }),
      car(4, { specs: { powertrain_type: 'ice', fuel_type: 'Бензин' } }),
      car(5, { identity: { manufacturer: 'Toyota', model: 'Yaris Cross', title: 'Toyota Yaris Cross' } }),
      car(6, { listing: { sell_status: 'possibly_sold' } })]);
  });
  const result = await fetchModelOffers(entry);
  assert.deepEqual(result.cars.map((c) => c.id), [1]);
  const html = offerList(entry, result, (c) => '/model-media/' + c.id + '.webp');
  const url = '/avto-iz-yaponii/toyota/yaris-hybrid/lot-1/';
  assert.equal(offerVehicle(entry, result.cars[0]).url, url);
  assert.match(html, /<article class="car"/);
  assert.deepEqual([...html.matchAll(/<a\b[^>]* href="([^"]+)"/g)].map((m) => m[1]), [url, url, url]);
  assert.match(html, /<a class="car__go"[^>]+aria-label="Открыть объявление [^"]+"><svg/);
  assert.doesNotMatch(html, /carhubauto|target="_blank"/);
  assert.match(html, /data-mileage="0"/);
  assert.match(html, /Рассчитанная часть стоимости/);
  assert.match(html, /от 900\u00a0000\u00a0₽/);
  assert.doesNotMatch(html, /Нужна мощность|топ-30/i);
  assert.doesNotMatch(offerList(entry, { ...result, checkedAt: '2000-01-01T00:00:00Z' }), /data-offer-id/);
});

test('Удлиненный Tiguan L не смешивается с Tiguan X, а год типовой комплектации допускает более ранний автомобиль', async (t) => {
  const country = { country: 'CN' };
  const vw = (id, model) => car(id, { source: country, identity: { manufacturer: 'Volkswagen', model, title: 'Volkswagen ' + model, trim: '280TSI' } });
  const queries = [];
  t.mock.method(globalThis, 'fetch', async (url) => {
    const q = new URL(url).searchParams;
    queries.push(q);
    return reply(q.has('year_min') ? [vw(11, 'Tiguan X')] : [vw(12, 'Tiguan L')]);
  });
  const result = await fetchModelOffers({ country: 'china', name: 'Volkswagen Tiguan L', years: '2021', engine: '1,4 л турбо' });
  assert.deepEqual(result.cars.map((c) => c.id), [12]);
  assert.equal(queries.length, 2);
  assert.equal(queries[1].get('year_max'), '2020');
  assert.equal(queries[1].get('model'), 'Tiguan');
});
