#!/usr/bin/env node
// Тест ядра калькулятора: node tools/test-calc.mjs
// 1. Прогоняет ВСЕ контрольные примеры из data/source/calc-rules.json → examples.items двумя способами:
//    «как дано» (расходы и возрастная категория — из примера) и «как в форме» (год, месяц, город, кузов — ядро само
//    выводит категорию возраста, профиль расходов, комиссию и доставку) — и сверяет суммы с эталоном, допуск 1 ₽.
// 2. Проверяет границы шкал (160 л.с., 3 и 5 лет, ступени сбора) и сверочные значения из examples.crossCheck.
// 3. Убеждается, что компактная выжимка правил для браузера даёт те же результаты, что и исходный файл.
// 4. Проверяет разбор параметров адреса (MGCalc.view.start): ссылка с карточки авто без мощности не получает 98 л.с.
//    стартового примера, типы двигателя fuel=series|parallel|ev|mild и ehp/e30 принимаются как есть.
//
// Про округление. Ядро округляет каждую строку до рубля, итог — сумма строк, поэтому расшифровка на странице всегда
// сходится с итогом. Строка «расходы за рубежом» считается как «таможенная стоимость − цена автомобиля», чтобы
// автомобиль + расходы давали ровно ту таможенную стоимость, от которой считаются сбор и пошлина. В эталоне
// (examples.items) итог посчитан от округлённой таможенной стоимости, а abroadExpensesRub округлён отдельно, поэтому
// у Prius и Fit его собственные строки расходятся с его же итогом на 1 ₽ (1 008 471 + 464 056 + 441 195 + 125 000 =
// 2 038 722 при итоге 2 038 721). Ядро совпадает с итогами эталона точно, а в строке расходов отличается на 1 ₽ —
// это печатается ниже как расхождение в пределах допуска.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { calcCore as core, exampleInputs } from '../src/components/calc.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const raw = JSON.parse(readFileSync(join(root, 'data/source/calc-rules.json'), 'utf8'));
const compact = JSON.parse(JSON.stringify(core.compactRules(raw)));
const verbose = process.argv.includes('--verbose');

let passed = 0;
const failures = [];
const notes = [];

function check(name, actual, expected, tol = 0) {
  const ok = typeof expected === 'number' ? typeof actual === 'number' && Math.abs(actual - expected) <= tol + 1e-9 : actual === expected;
  if (ok) passed++;
  else failures.push(`${name}: получено ${actual}, ожидалось ${expected}${tol ? ` (допуск ${tol})` : ''}`);
  if (ok && typeof expected === 'number' && tol && actual !== expected) notes.push(`${name}: ${actual} вместо ${expected} (в пределах допуска ${tol})`);
  return ok;
}

// --- 1. контрольные примеры ----------------------------------------------------------------

const date = raw.examples.ratesUsed.date;
const forms = new Map(exampleInputs(raw).map((x) => [x.id, x.input])); // параметры «как в форме» — те же, что на странице калькулятора

function compare(tag, r, ex) {
  const e = ex.result;
  const n = (k) => `${ex.input.id} [${tag}] ${k}`;
  check(n('mode'), r.mode, e.mode);
  check(n('carPriceRub'), r.carRub, e.carPriceRub, 1);
  check(n('customsValueRub'), r.customsValueRub, e.customsValueRub, 1);
  check(n('utilPowerKw'), r.util.powerKw, e.utilPowerKw, 0.011);
  check(n('dutyRub'), r.duty.rub, e.dutyRub, 1);
  if (e.exciseRub !== undefined) {
    check(n('excisePowerHp'), r.excise.hp, e.excisePowerHp, 0.011);
    check(n('exciseRate'), r.excise.rate, e.exciseRate);
    check(n('exciseRub'), r.excise.rub, e.exciseRub, 1);
    check(n('vatRub'), r.vat.rub, e.vatRub, 1);
  }
  check(n('customsFeeRub'), r.fee.rub, e.customsFeeRub);
  check(n('utilCoef'), r.util.coef, e.utilCoef);
  check(n('utilRub'), r.util.rub, e.utilRub);
  check(n('customsTotalRub'), r.customsTotalRub, e.customsTotalRub, 1);
  check(n('abroadExpensesRub'), r.abroad.rub, e.abroadExpensesRub, 1);
  check(n('vladivostokRub'), r.vladivostokRub, e.vladivostokRub);
  check(n('localLogisticsRub'), r.logisticsRub, e.localLogisticsRub);
  check(n('commissionRub'), r.commissionRub, e.commissionRub);
  check(n('deliveryRub'), r.delivery.rub, e.deliveryRub);
  check(n('totalTurnkeyVladivostokRub'), r.totalVladivostok, e.totalTurnkeyVladivostokRub, 1);
  check(n('totalTurnkeyCityRub'), r.totalCity, e.totalTurnkeyCityRub, 1);
  // итог всегда равен сумме показанных строк
  const rows = r.groups.flatMap((g) => g.rows).reduce((s, x) => s + x.rub, 0);
  check(n('сумма строк = итог в городе'), rows, r.totalCity);
}

for (const ex of raw.examples.items) {
  const i = ex.input;
  const base = { country: i.country, price: i.price, fuel: i.powertrain, cc: i.cc, hp: i.iceHp, e30: i.e30Kw, date };

  // а) «как дано»: расходы и возраст — из примера
  const given = { ...base, age: i.age, abroadFixed: i.abroadExpenses, freightUsd: i.freightUsd || 0, abroadExtra: i.extraAbroad || 0, vladivostok: i.vladivostok, logistics: i.logistics, delivery: i.delivery };
  compare('как дано', core.calc(given, raw), ex);

  // б) «как в форме»: ядро само определяет возраст, профиль расходов, комиссию, доставку
  const form = { ...forms.get(i.id), date };
  const r = core.calc(form, raw);
  check(`${i.id} [форма] возрастная категория`, r.age.cat, i.age);
  check(`${i.id} [форма] расходы за рубежом, валюта`, r.abroad.fixedCur, i.abroadExpenses);
  check(`${i.id} [форма] фрахт, $`, r.abroad.freightUsd, i.freightUsd || 0);
  check(`${i.id} [форма] надбавка, валюта`, r.abroad.extraCur, i.extraAbroad || 0);
  compare('форма', r, ex);

  // в) с наценкой на перевод
  check(`${i.id} [форма] withTransferMarkup`, core.calc({ ...form, markup: true }, raw).totalVladivostok, ex.result.withTransferMarkup, 1);

  // г) компактная выжимка = исходный файл
  check(`${i.id} выжимка = исходные правила`, JSON.stringify(core.calc(form, compact)), JSON.stringify(r));

  if (verbose) {
    console.log(`\n${i.title}`);
    for (const g of r.groups) for (const row of g.rows) console.log(`  ${row.label.padEnd(52)} ${String(row.rub).padStart(10)}   ${row.note}`);
    console.log(`  ${'ИТОГО во Владивостоке'.padEnd(52)} ${String(r.totalVladivostok).padStart(10)}   эталон ${ex.result.totalTurnkeyVladivostokRub}`);
    console.log(`  ${'ИТОГО в городе'.padEnd(52)} ${String(r.totalCity).padStart(10)}   эталон ${ex.result.totalTurnkeyCityRub}`);
    for (const w of r.warnings) console.log(`  ! ${w.text}`);
  }
}

// --- 2. границы и сверочные значения -------------------------------------------------------

const cc = raw.examples.crossCheck;
const calc = (o) => core.calc({ country: 'china', price: 100000, year: 2022, fuel: 'ice', cc: 1500, hp: 100, date, ...o }, raw);
const HP = raw.utilFee.hpToKw;

// утильсбор: порог 160 л.с. и строки в л.с. не «уезжают» из-за округления кВт (bracketNote)
check('утильсбор: 160 л.с. — льготный', calc({ hp: 160 }).util.rub, raw.utilFee.preferential.amountOldRub);
check('утильсбор: 161 л.с. — полный', calc({ hp: 161 }).util.coef, raw.utilFee.personal.ice['1001_2000']['2026'][4][1]);
raw.utilFee.icePowerBracketsMaxHpApprox.forEach((hp, idx) => {
  if (hp === null) return;
  check(`утильсбор: ${hp} л.с. остаётся в своей строке`, calc({ hp, cc: 2500, personal: false }).util.coef, raw.utilFee.full.ice['2001_3000']['2026'][idx][1]);
});
check('утильсбор: до 3 лет — 3 400 ₽', calc({ year: 2025 }).util.rub, raw.utilFee.preferential.amountNewRub);
check('утильсбор: объём свыше 3,0 л — без льготы', calc({ cc: 3001, hp: 150 }).util.coef, raw.utilFee.personal.ice['3001_3500']['2026'][3][1]);
check('утильсбор: объём 3000 см³ — льгота', calc({ cc: 3000, hp: 150 }).util.pref, true);
check('утильсбор: не для личного пользования, 1–2 л до 160 л.с., до 3 лет', calc({ year: 2025, personal: false }).util.rub, cc.baikalvlCommercial['1_2L_le160'][0]);
check('утильсбор: не для личного пользования, 1–2 л до 160 л.с., старше 3 лет', calc({ personal: false }).util.rub, cc.baikalvlCommercial['1_2L_le160'][1]);
check('утильсбор: не для личного пользования, 2–3 л до 160 л.с., до 3 лет', calc({ year: 2025, cc: 2500, personal: false }).util.rub, cc.baikalvlCommercial['2_3L_le160'][0]);
check('утильсбор: не для личного пользования, 2–3 л до 160 л.с., старше 3 лет', calc({ cc: 2500, personal: false }).util.rub, cc.baikalvlCommercial['2_3L_le160'][1]);
// электромобиль: пик 175 л.с. × 0,45 = 78,75 л.с. → льгота; пик 180 л.с. → 81 л.с. → полная ставка (Autonews)
check('электромобиль: пик 175 л.с. — льготный утильсбор', calc({ fuel: 'ev', year: 2025, ehp: 175 }).util.rub, cc.autonewsEv.peak175hp);
check('электромобиль: пик 180 л.с. — полный утильсбор', calc({ fuel: 'ev', year: 2025, ehp: 180 }).util.rub, cc.autonewsEv.peak180hp);
check('электромобиль: режим СТП', calc({ fuel: 'ev', ehp: 100 }).mode, 'STP');
check('последовательный гибрид: режим СТП', calc({ fuel: 'series', ehp: 100 }).mode, 'STP');
check('акциз: до 90 л.с. — 0', calc({ fuel: 'ev', e30: 60 }).excise.rub, 0);
check('акциз: 150 л.с. включительно — 64 ₽/л.с.', calc({ fuel: 'ev', e30: 150 / raw.stp.kwToHp }).excise.rate, 64);
check('параллельный гибрид: мощность = ДВС + 30 минут', calc({ fuel: 'parallel', hp: 98, e30: 23.85 }).util.powerKw, Math.round((98 * HP + 23.85) * 100) / 100);
check('мягкий гибрид: только мощность ДВС', calc({ fuel: 'mild', hp: 150, ehp: 20 }).util.powerKw, Math.round(150 * HP * 100) / 100);

// возраст: год → 1 июля, год + месяц → 15-е число; «не более 3 лет» — включительно
const age = (y, m, d) => core.ageInfo(y, m, d).cat;
check('возраст: 2023 без месяца на 13.10.2026 — 3–5 лет', age(2023, 0, date), '3to5');
check('возраст: 10.2023 на 13.10.2026 — до 3 лет', age(2023, 10, date), 'le3');
check('возраст: 09.2023 на 13.10.2026 — 3–5 лет', age(2023, 9, date), '3to5');
check('возраст: ровно 3 года — ещё «до 3 лет»', age(2023, 10, '2026-10-15'), 'le3');
check('возраст: 3 года и 1 день — уже «3–5 лет»', age(2023, 10, '2026-10-16'), '3to5');
check('возраст: ровно 5 лет — ещё «3–5 лет»', age(2021, 10, '2026-10-15'), '3to5');
check('возраст: 5 лет и 1 день — «старше 5 лет»', age(2021, 10, '2026-10-16'), 'gt5');
check('возраст: 2021 без месяца — пограничный год', core.ageInfo(2021, 0, date).ambiguous, true);
check('возраст: 2023 без месяца — пограничный год', core.ageInfo(2023, 0, date).ambiguous, true);
check('возраст: 2022 без месяца — не пограничный', core.ageInfo(2022, 0, date).ambiguous, false);
check('возраст: предупреждение «нужен месяц»', calc({ year: 2021 }).warnings.some((w) => w.code === 'age-month'), true);

// единая ставка: границы объёма включительно, авто до 3 лет — процент либо минимум за см³
const eur = raw.rates.cbr[date].EUR;
check('ЕТС 3–5 лет: 1500 см³ — 1,7 €', calc({ cc: 1500 }).duty.eurPerCc, 1.7);
check('ЕТС 3–5 лет: 1501 см³ — 2,5 €', calc({ cc: 1501 }).duty.eurPerCc, 2.5);
check('ЕТС старше 5 лет: 2300 см³ — 4,8 €', calc({ year: 2019, cc: 2300 }).duty.eurPerCc, 4.8);
const young = calc({ year: 2025, price: 100000, cc: 1500 }); // ТС ≈ 14 941 € → 48 %, минимум 3,5 €/см³
check('ЕТС до 3 лет: 48 % от стоимости', young.duty.rub, Math.round(Math.max(0.48 * young.customsValueRub, 3.5 * 1500 * eur)));
const cheap = calc({ year: 2025, price: 30000, cc: 2000 }); // ТС ≈ 5 600 € → 54 %, но минимум 2,5 €/см³ выше
check('ЕТС до 3 лет: срабатывает минимум за см³', cheap.duty.by, 'min');
check('ЕТС до 3 лет: сумма минимума', cheap.duty.rub, Math.round(2.5 * 2000 * eur));

// таможенный сбор: ступени включительно
for (const row of raw.customsFee.scale) {
  if (row.maxValueRub === null) continue;
  const price = row.maxValueRub / raw.rates.cbr[date].CNY; // расходы за рубежом обнуляем, чтобы попасть точно в границу
  check(`таможенный сбор: до ${row.maxValueRub} ₽`, core.calc({ country: 'china', price, abroadFixed: 0, year: 2022, cc: 1500, hp: 100, date }, raw).fee.rub, row.feeRub);
}

// ограничения экспорта → профиль расходов и предупреждения
const def = raw.defaults.abroadExpenses;
const jp = (o) => core.calc({ country: 'japan', price: 1500000, year: 2022, cc: 1500, hp: 100, date, ...o }, raw);
check('Япония: до 1,9 л — обычный профиль', jp({ cc: 1900 }).abroad.fixedCur, def.japan.amount);
check('Япония: свыше 1,9 л — профиль под ограничениями', jp({ cc: 1901 }).abroad.fixedCur, def.japanSanctioned.amount);
check('Япония: гибрид — фрахт в долларах', jp({ fuel: 'parallel', ehp: 70 }).abroad.freightUsd, def.japanSanctioned.freightUsd);
check('Япония: электромобиль, справка о расходах', jp({ fuel: 'ev', ehp: 100 }).warnings.some((w) => w.code === 'jp-route'), true);
check('Япония: мягкий гибрид — обычный профиль', jp({ fuel: 'mild' }).abroad.fixedCur, def.japan.amount);
const kr = (o) => core.calc({ country: 'korea', price: 20000000, year: 2022, cc: 1999, hp: 150, date, ...o }, raw);
check('Корея: до 2,0 л — без надбавки', kr({}).abroad.extraCur, 0);
check('Корея: свыше 2,0 л — надбавка', kr({ cc: 2001 }).abroad.extraCur, def.koreaSanctionedSurcharge.amount);
check('Корея: дороже 50 000 $ — надбавка', kr({ price: 70000000 }).abroad.extraCur, def.koreaSanctionedSurcharge.amount);
check('Китай: ограничений нет', core.calc({ country: 'china', price: 200000, year: 2024, cc: 2500, hp: 250, date }, raw).warnings.filter((w) => /^(jp|kr)-/.test(w.code)).length, 0);

// комиссия по ступеням и доставка по типу кузова
for (const t of raw.defaults.commissionTiers) {
  if (t.maxCarPriceRub === null) continue;
  check(`комиссия: авто до ${t.maxCarPriceRub} ₽`, core.calc({ country: 'china', price: (t.maxCarPriceRub - 1000) / raw.rates.cbr[date].CNY, year: 2022, cc: 1500, hp: 100, date }, raw).commissionRub, t.commissionRub);
}
for (const c of raw.delivery.cities) for (const b of ['sedan', 'crossover', 'suv']) check(`доставка: ${c.city}, ${b}`, calc({ city: c.slug, body: b }).delivery.rub, c.truckRub[b]);

// неполные данные не роняют расчёт
check('пустой ввод: ok = false', core.calc({}, raw).ok, false);
check('пустой ввод: нет NaN', JSON.stringify(core.calc({}, raw)).includes('NaN'), false);

// размер выжимки для браузера
const size = Buffer.byteLength(JSON.stringify(compact));
check('выжимка правил компактнее 12 КБ', size < 12000, true);

// --- 3. параметры из адреса (ссылки с карточек авто) и подсказки интерфейса -------------------
// Чужому автомобилю не приписываем мощность стартового примера: чего нет в адресе, то пусто, и расчёт просит это заполнить.

const { view } = core;
const DEF = { japan: { price: 1100000, year: 2022, cc: 1317, hp: 98, body: 'sedan' }, korea: { price: 21000000, year: 2022, cc: 1999, hp: 160, body: 'sedan' }, china: { price: 135000, year: 2025, cc: 1998, hp: 155, body: 'crossover' } };
const start = (q) => view.start(q, 'japan', DEF);
const run = (q) => core.calc({ ...start(q).state, date }, raw);

check('адрес: без параметров калькулятора — стартовый пример не трогаем', start({ utm_source: 'yandex' }), null);
const lexus = start({ country: 'japan', price: '4431000', year: '2023', cc: '2500', body: 'crossover', ref: 'car' }); // карточка без мощности
check('адрес: мощности нет — поле пустое, а не 98 л.с. примера', lexus.state.hp, 0);
check('адрес: пометка «с карточки авто»', lexus.ref, 'car');
const lexusR = run({ country: 'japan', price: '4431000', year: '2023', cc: '2500', body: 'crossover' });
check('адрес: без мощности расчёта нет', lexusR.ok, false);
check('адрес: без мощности — просьба указать её', view.need(lexusR), 'Укажите мощность двигателя: от нее зависит утильсбор');
check('адрес: без мощности — никакого «льготного утильсбора»', view.status(lexusR), '');
check('адрес: hp=0 — то же, что нет мощности', run({ country: 'korea', price: '21000000', year: '2022', cc: '1999', hp: '0' }).missing.includes('hp'), true);
const leaf = run({ country: 'japan', price: '1238000', year: '2022', fuel: 'ev' });
check('адрес: электромобиль без мощности — просьба указать её', view.need(leaf), 'Укажите мощность электромоторов: от нее зависят акциз и утильсбор');
const li = start({ country: 'china', price: '239899', year: '2025', fuel: 'series', cc: '1496', hp: '449' });
check('адрес: последовательный гибрид — мощность из hp уходит в электромоторы', li.state.ehp, '449');
check('адрес: последовательный гибрид — ДВС в расчёте не участвует', li.state.hp + li.state.cc, 0);
check('адрес: последовательный гибрид — режим СТП', run({ country: 'china', price: '239899', year: '2025', fuel: 'series', ehp: '449' }).mode, 'STP');
check('адрес: fuel=mild — мощность электромотора игнорируется', start({ country: 'korea', price: '30000000', year: '2022', fuel: 'mild', cc: '1598', hp: '180', ehp: '20' }).state.ehp, 0);
check('адрес: e30 для электромобиля сохраняется', start({ country: 'china', price: '230000', year: '2024', fuel: 'ev', ehp: '422', e30: '139.5' }).state.e30, '139.5');
check('адрес: неизвестный тип двигателя → ДВС', start({ price: '1000000', fuel: '"><img>' }).state.fuel, 'ice');
check('адрес: неизвестная страна отбрасывается', start({ country: 'mars', city: 'moskva' }).state.country, undefined);
check('адрес: только город — пример остаётся', start({ city: 'novosibirsk' }).state.hp, undefined);
check('адрес: только город — итог с доставкой', start({ city: 'novosibirsk' }).city, true);
check('адрес: только страна — типовой автомобиль страны целиком', start({ country: 'korea' }).state.hp, 160);
check('адрес: только страна — цена для примера', start({ country: 'korea' }).priceHint, true);
// гибрид без мощности электромотора: считаем, но льготу не обещаем
const prius = run({ country: 'japan', price: '2761000', year: '2024', fuel: 'parallel', cc: '2000', hp: '152' });
check('гибрид без электромотора: расчёт есть', prius.ok, true);
check('гибрид без электромотора: вместо «льготного» — просьба указать мощность', /Нужна мощность электромотора/.test(view.status(prius)) && !/Льготный/.test(view.status(prius)), true);
check('гибрид с электромотором: статус по сумме мощностей', /Утильсбор по полной шкале/.test(view.status(core.calc({ ...start({ country: 'japan', price: '2761000', year: '2024', fuel: 'parallel', cc: '2000', hp: '152', ehp: '113' }).state, date }, raw))), true);
check('адрес: дробная мощность не превращается в целое в 10 раз больше', view.query({ country: 'japan', price: 1100000, year: 2022, cc: 1317, hp: 98.6 }).includes('hp=98.6'), true);

// Одна цена в двух валютах должна давать тот же расчет, включая расходы на покупку и доставку.
for (const country of Object.keys(DEF)) {
  const local = { ...DEF[country], country, price: 1000000, city: 'moskva', date };
  const original = core.calc(local, compact);
  const inRubles = { ...local, price: original.carRub, currency: 'RUB' };
  const result = core.calc(inRubles, compact);
  check(country + ': сохранена цена в рублях', result.input.price, original.carRub);
  check(country + ': пошлина совпадает при смене валюты', result.duty.rub, original.duty.rub);
  check(country + ': совпадает итог во Владивостоке', result.totalVladivostok, original.totalVladivostok);
  check(country + ': совпадает итог с доставкой', result.totalCity, original.totalCity);
  const withBank = core.calc({ ...inRubles, markup: true }, compact);
  check(country + ': наценка добавляется к итогу один раз', withBank.totalCity, result.totalCity + result.markup.rubIfOn);
  check(country + ': наценка не меняет таможенные платежи', withBank.customsTotalRub, result.customsTotalRub);
  const params = Object.fromEntries(new URLSearchParams(view.query({ ...inRubles, unit: 'local', markup: true })));
  check(country + ': ссылка хранит валюту ввода отдельно от валюты показа', params.currency + '/' + params.unit, 'RUB/local');
  check(country + ': сумма восстанавливается по ссылке', run(params).totalCity, withBank.totalCity);
}
check('ссылка с пустым полем цены сохраняет неполный расчет', run({ ...DEF.japan, price: '0', currency: 'RUB' }).ok, false);
check('нулевая цена не заменяется примером при копировании', view.query({ price: 0, currency: 'RUB' }), 'price=0&currency=RUB');
check('у старой ссылки с местной ценой прежний формат', view.query({ country: 'japan', price: 1100000, currency: 'local', unit: 'local' }), 'country=japan&price=1100000');
check('кузов сохраняется и до выбора города', view.query({ body: 'suv' }), 'body=suv');
check('цена по умолчанию задана в валюте страны', run({ country: 'china', currency: 'RUB' }).input.currency, 'CNY');

// --- отчёт -----------------------------------------------------------------------------------

console.log(`Контрольных примеров: ${raw.examples.items.length}, проверок пройдено: ${passed}, ошибок: ${failures.length}`);
console.log(`Выжимка правил для браузера: ${size} байт (исходный файл — ${Buffer.byteLength(JSON.stringify(raw))} байт)`);
if (notes.length) {
  console.log('\nРасхождения в пределах допуска (округление до рубля):');
  for (const n of notes) console.log('  ~ ' + n);
}
if (failures.length) {
  console.log('\nОшибки:');
  for (const f of failures) console.log('  ✗ ' + f);
  process.exit(1);
}
console.log('\n✓ Ядро калькулятора совпадает с эталоном');
