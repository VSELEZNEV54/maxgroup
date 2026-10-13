// Единый набор иконок: линия 1.5px, 24×24, скруглённые концы. Соцсети — заливкой.
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const social = JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'icons-social.json'), 'utf8'));

const LINE = {
  arrow: '<path d="M4 12h15m-6-6 6 6-6 6"/>',
  'arrow-up-right': '<path d="M7 17 17 7M8 7h9v9"/>',
  'arrow-down': '<path d="M12 4v15m-6-6 6 6 6-6"/>',
  chevron: '<path d="m6 9 6 6 6-6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  close: '<path d="m6 6 12 12M18 6 6 18"/>',
  menu: '<path d="M4 8h16M4 16h16"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  phone: '<path d="M6.6 3.5h2.9l1.6 4-2.1 1.4a11.5 11.5 0 0 0 6.1 6.1l1.4-2.1 4 1.6v2.9a2.1 2.1 0 0 1-2.3 2.1A17.5 17.5 0 0 1 4.5 5.8a2.1 2.1 0 0 1 2.1-2.3Z"/>',
  mail: '<rect x="3.5" y="5.5" width="17" height="13" rx="2"/><path d="m4 7 8 6 8-6"/>',
  pin: '<path d="M12 21s7-6.1 7-11.5a7 7 0 1 0-14 0C5 14.9 12 21 12 21Z"/><circle cx="12" cy="9.5" r="2.5"/>',
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  calendar: '<rect x="3.5" y="5" width="17" height="15.5" rx="2"/><path d="M3.5 10h17M8 3v4m8-4v4"/>',
  shield: '<path d="M12 3 4.5 6v5.5c0 4.6 3.1 8 7.5 9.5 4.4-1.5 7.5-4.9 7.5-9.5V6L12 3Z"/><path d="m8.8 12 2.3 2.3 4.2-4.6"/>',
  doc: '<path d="M6.5 3.5h7l4 4v13h-11v-17Z"/><path d="M13.5 3.5v4h4M9 12h6m-6 3.5h6"/>',
  'doc-check': '<path d="M6.5 3.5h7l4 4v13h-11v-17Z"/><path d="M13.5 3.5v4h4m-8.3 6 2 2 3.6-4"/>',
  calc: '<rect x="5" y="3.5" width="14" height="17" rx="2"/><path d="M8 7.5h8M8.5 12h.01M12 12h.01M15.5 12h.01M8.5 16h.01M12 16h.01M15.5 16h.01"/>',
  ship: '<path d="M3.5 17.5 5 12h14l1.5 5.5M7 12V7.5h10V12M12 7.5V4m-9 16c1.5 0 1.5-1 3-1s1.5 1 3 1 1.5-1 3-1 1.5 1 3 1 1.5-1 3-1 1.5 1 3 1"/>',
  truck: '<path d="M2.5 6.5h11v10h-11zM13.5 10h4l3 3.5v3h-7"/><circle cx="6.5" cy="17.5" r="2"/><circle cx="16.5" cy="17.5" r="2"/>',
  gavel: '<path d="m13.5 4 6 6M11 6.5l6 6M9.5 8l-6 6 2.5 2.5 6-6M14 20.5h7M12 9.5l3 3"/>',
  key: '<circle cx="8" cy="15.5" r="4"/><path d="m11 12.5 8.5-8.5M16 7.5l2.5 2.5M13.5 10l2 2"/>',
  wallet: '<path d="M4 7.5v10a2 2 0 0 0 2 2h14v-10H6a2 2 0 0 1-2-2Zm0 0a2 2 0 0 1 2-2h11.5v4"/><path d="M16.5 14.5h.01"/>',
  bank: '<path d="M3.5 9.5 12 4l8.5 5.5M5 9.5h14M6.5 9.5V17m4-7.5V17m3-7.5V17m4-7.5V17M4 20h16M5 17h14"/>',
  percent: '<path d="M18 6 6 18"/><circle cx="7.5" cy="7.5" r="2.5"/><circle cx="16.5" cy="16.5" r="2.5"/>',
  star: '<path d="m12 3.5 2.6 5.4 5.9.8-4.3 4.1 1.1 5.9-5.3-2.9-5.3 2.9 1.1-5.9-4.3-4.1 5.9-.8L12 3.5Z"/>',
  play: '<path d="M8 5.5v13l10.5-6.500L8 5.5Z"/>',
  camera: '<path d="M4 8h3l1.5-2.500h7L17 8h3v11H4V8Z"/><circle cx="12" cy="13" r="3.2"/>',
  filter: '<path d="M4 6.500h16M7 12h10M10 17.500h4"/>',
  sort: '<path d="M7 5v14m0 0-3-3m3 3 3-3M17 19V5m0 0-3 3m3-3 3 3"/>',
  info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.500M12 7.800v.010"/>',
  alert: '<path d="M12 4 2.500 20h19L12 4Z"/><path d="M12 10v4.500M12 17v.010"/>',
  globe: '<circle cx="12" cy="12" r="8.500"/><path d="M3.500 12h17M12 3.500c2.500 2.600 3.500 5.400 3.500 8.500s-1 5.900-3.500 8.500c-2.500-2.600-3.500-5.400-3.500-8.500s1-5.900 3.500-8.500Z"/>',
  wheel: '<circle cx="12" cy="12" r="8.500"/><circle cx="12" cy="12" r="2.200"/><path d="M12 14.200v6.300M9.900 11.300 4 9.500m10.100 1.800L20 9.500"/>',
  engine: '<path d="M7 9V6.500h5V9M4 12H2.500v4H4m0-5.500V17h2.500l2 2.500H16V17h2.500v-2H21v-3h-2.500V9.500H4Z"/>',
  gauge: '<path d="M4.500 17a8.500 8.500 0 1 1 15 0"/><path d="m12 13 4-4.500"/><circle cx="12" cy="13.500" r="1.200"/>',
  fuel: '<path d="M5 20V5.500A1.500 1.500 0 0 1 6.500 4h6A1.500 1.500 0 0 1 14 5.500V20M4 20h11M7.500 8h4M14 11h1.500a1.500 1.500 0 0 1 1.500 1.500V16a1.500 1.500 0 0 0 3 0V9l-2.500-3"/>',
  bolt: '<path d="M13 3 5 13.500h6L10 21l8.500-11H12.500L13 3Z"/>',
  gearbox: '<circle cx="5.500" cy="6" r="1.800"/><circle cx="12" cy="6" r="1.800"/><circle cx="18.500" cy="6" r="1.800"/><circle cx="5.500" cy="18" r="1.800"/><circle cx="12" cy="18" r="1.800"/><path d="M5.500 7.800v8.400M12 7.800v8.400M18.500 7.800V12h-13"/>',
  drive: '<circle cx="5.500" cy="6.500" r="2.200"/><circle cx="18.500" cy="6.500" r="2.200"/><circle cx="5.500" cy="17.500" r="2.200"/><circle cx="18.500" cy="17.500" r="2.200"/><path d="M7.700 6.500h8.600M7.700 17.500h8.600M12 6.500v11"/>',
  palette: '<path d="M12 3.500a8.500 8.500 0 1 0 0 17c1.400 0 2-1 2-2 0-1.500-1.500-1.500-1.500-3 0-1 .9-2 2-2h2a4 4 0 0 0 4-4c0-3.300-3.800-6-8.500-6Z"/><path d="M7.500 12h.01M9.500 8h.01M14 7h.01"/>',
  user: '<circle cx="12" cy="8.500" r="3.800"/><path d="M4.500 20c.7-3.700 3.600-6 7.500-6s6.800 2.300 7.500 6"/>',
  users: '<circle cx="9" cy="8.500" r="3.300"/><path d="M2.500 19.500c.6-3.300 3-5.500 6.500-5.500s5.900 2.200 6.500 5.500M15.500 5.500a3.300 3.300 0 0 1 0 6.200M18 14.500c1.900.7 3.100 2.400 3.500 5"/>',
  handshake: '<path d="m3 8.500 4-2 5 1.500 5-1.500 4 2v6.500l-3 .5-5.500 4.500-6-4.500L3 15V8.500Z"/><path d="m12 8-3.500 3.500a1.700 1.700 0 0 0 2.400 2.400L12.500 12.500l4.500 3.500"/>',
  route: '<circle cx="6" cy="18" r="2.500"/><circle cx="18" cy="6" r="2.500"/><path d="M8.500 18H15a3.500 3.500 0 0 0 0-7H9a3.500 3.500 0 0 1 0-7h6.500"/>',
  anchor: '<circle cx="12" cy="5.500" r="2"/><path d="M12 7.500V20.500M8 11h8M4.500 13.500c0 4 3.300 7 7.500 7s7.500-3 7.500-7"/>',
  container: '<rect x="3" y="6.500" width="18" height="11" rx="1"/><path d="M7 9.500v5m3.300-5v5m3.400-5v5m3.300-5v5"/>',
  eye: '<path d="M2.500 12S6 5.500 12 5.500 21.500 12 21.500 12 18 18.500 12 18.500 2.500 12 2.500 12Z"/><circle cx="12" cy="12" r="3"/>',
  search: '<circle cx="11" cy="11" r="6.500"/><path d="m16 16 4.500 4.500"/>',
  list: '<path d="M8.500 6.500h11M8.500 12h11M8.500 17.500h11M4.500 6.500h.01M4.500 12h.01M4.500 17.500h.01"/>',
  grid: '<rect x="4" y="4" width="6.500" height="6.500" rx="1"/><rect x="13.500" y="4" width="6.500" height="6.500" rx="1"/><rect x="4" y="13.500" width="6.500" height="6.500" rx="1"/><rect x="13.500" y="13.500" width="6.500" height="6.500" rx="1"/>',
  box: '<path d="M12 3.500 20 8v8l-8 4.500L4 16V8l8-4.500Z"/><path d="M4 8l8 4.500L20 8M12 12.500v8"/>',
  sound: '<path d="M4.500 9.500v5H8l4.500 3.500v-12L8 9.500H4.500Z"/><path d="M16 9a4 4 0 0 1 0 6m2.500-8.500a7.500 7.500 0 0 1 0 11"/>',
  mute: '<path d="M4.500 9.500v5H8l4.500 3.500v-12L8 9.500H4.500ZM16.500 9.500l4 5m0-5-4 5"/>',
  pause: '<path d="M8.500 5.500v13M15.500 5.500v13"/>',
  download: '<path d="M12 4v11m0 0-4-4m4 4 4-4M5 19.500h14"/>',
  external: '<path d="M10 5H5.500v13.500H19V14M13.500 4.500h6v6M19 5l-8 8"/>',
  share: '<circle cx="6.500" cy="12" r="2.500"/><circle cx="17.500" cy="6" r="2.500"/><circle cx="17.500" cy="18" r="2.500"/><path d="m8.700 10.800 6.600-3.600m-6.600 6 6.600 3.600"/>',
  heart: '<path d="M12 20s-7.500-4.600-7.500-10.200A4.300 4.300 0 0 1 12 7.200a4.300 4.300 0 0 1 7.500 2.600C19.500 15.400 12 20 12 20Z"/>',
  message: '<path d="M4 5.500h16v11H10l-4.500 3.500v-3.500H4v-11Z"/><path d="M8 10h8m-8 3h5"/>',
  seat: '<path d="M7 4.500h3.500L12 13h5.500l1 6.500M7 4.500 5.500 13l2 6.500h11M5.500 13H12"/>',
  snow: '<path d="M12 3v18M4.200 7.500l15.600 9M19.800 7.500l-15.600 9M9.500 4.500 12 7l2.500-2.500M9.500 19.500 12 17l2.500 2.500"/>',
  flag: '<path d="M5.500 21V4m0 1.500h12l-2.500 4 2.500 4h-12"/>',
  scale: '<path d="M12 4v16M6 20h12M5 7.500h14M5 7.500l-2.500 6a3 3 0 0 0 5 0L5 7.500Zm14 0-2.500 6a3 3 0 0 0 5 0l-2.500-6Z"/>',
  lab: '<path d="M9.500 3.500h5M10.500 3.500v6L5 19a1.200 1.200 0 0 0 1 1.800h12a1.200 1.200 0 0 0 1-1.800l-5.500-9.500v-6M7.500 15h9"/>',
  plate: '<rect x="3" y="7.500" width="18" height="9" rx="1.500"/><path d="M7 11v2m3.500-2v2m3.500-2v2m3-2v2"/>',
};

const FILL = {
  telegram: social.telegram,
  whatsapp: social.whatsapp,
  instagram: social.instagram,
  youtube: social.youtube,
  vk: social.vk,
  // мессенджер MAX — упрощённый знак: скруглённый квадрат с буквой M
  max: 'M6.5 2h11A4.500 4.500 0 0 1 22 6.500v11a4.500 4.500 0 0 1-4.500 4.500h-11A4.500 4.500 0 0 1 2 17.500v-11A4.500 4.500 0 0 1 6.500 2Zm.300 15.500h2.300v-6.300l2.100 4.100h1.600l2.100-4.100v6.300h2.300v-11h-2.400L12 11.600 9.200 6.500H6.800v11Z',
  'star-fill': 'm12 2.800 2.800 5.900 6.400.9-4.700 4.500 1.200 6.400-5.700-3.100-5.700 3.100 1.200-6.400-4.700-4.500 6.400-.9L12 2.800Z',
  'play-fill': 'M8 5v14l11-7L8 5Z',
};

const fix = (d) => d.replace(/(\d)\.(\d)00\b/g, '$1.$2').replace(/\.010\b/g, '.01');

/** icon('arrow', 'i-arrow') → inline SVG */
export function icon(name, cls = '', extra = '') {
  const c = cls ? ` class="${cls}"` : '';
  if (FILL[name]) {
    return `<svg${c} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"${extra}><path d="${FILL[name]}"/></svg>`;
  }
  const body = LINE[name];
  if (!body) throw new Error(`Нет иконки: ${name}`);
  return `<svg${c} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"${extra}>${fix(body)}</svg>`;
}

export const hasIcon = (name) => Boolean(LINE[name] || FILL[name]);
export const iconNames = () => [...Object.keys(LINE), ...Object.keys(FILL)];

export const stars = (n = 5) =>
  `<span class="stars" role="img" aria-label="Оценка ${n} из 5">${icon('star-fill').repeat(Math.round(n))}</span>`;
