// "All projects" explorer: search, type chips, status, technology, a year
// range slider with a histogram, sorting, and three views (cards / timeline /
// table). Filters are kept in the URL so a filtered view can be shared.

import { loadData, projectCard, projectUrl, showLoadError } from './site.js';
import { el, svgIcon, clear } from './lib/dom.js';
import { createTimeline } from './lib/timeline.js';
import {
  STATUSES, SITE, dateLabel, projectYears, compareNewest, typeKey,
} from './lib/util.js';

const form = document.querySelector('[data-filters]');
const results = document.querySelector('[data-results]');
const countEl = document.querySelector('[data-count]');
const noteEl = document.querySelector('[data-note]');
const typeHost = document.querySelector('[data-type-chips]');
const field = (name) => form?.querySelector(`[name="${name}"]`);
const techSelect = field('tech');
const statusSelect = field('status');
const sortSelect = field('sort');
const searchInput = field('q');
const fromInput = field('from');
const toInput = field('to');
const rangeValue = document.querySelector('[data-range-value]');
const rangeFill = document.querySelector('[data-range-fill]');
const histogram = document.querySelector('[data-histogram]');
const rangeScale = document.querySelector('[data-range-scale]');
const viewButtons = [...document.querySelectorAll('[data-view]')];

const state = { q: '', types: new Set(), status: '', tech: '', from: 0, to: 0, sort: 'newest', view: 'grid' };
let all = [];
let minYear = SITE.codingSince;
let maxYear = new Date().getFullYear();
let timeline = null;

function readUrl() {
  const p = new URLSearchParams(window.location.search);
  state.q = (p.get('q') || '').slice(0, 80);
  state.types = new Set((p.get('type') || '').split(',').map((t) => t.trim()).filter(Boolean));
  state.status = Object.hasOwn(STATUSES, p.get('status') || '') ? p.get('status') : '';
  state.tech = (p.get('tech') || '').slice(0, 40);
  const from = Number(p.get('from')); const to = Number(p.get('to'));
  state.from = Number.isInteger(from) && from >= minYear && from <= maxYear ? from : minYear;
  state.to = Number.isInteger(to) && to >= minYear && to <= maxYear ? to : maxYear;
  if (state.from > state.to) [state.from, state.to] = [state.to, state.from];
  state.sort = ['newest', 'oldest', 'name'].includes(p.get('sort')) ? p.get('sort') : 'newest';
  state.view = ['grid', 'timeline', 'table'].includes(p.get('view')) ? p.get('view') : 'grid';
}

function writeUrl() {
  const p = new URLSearchParams();
  if (state.q) p.set('q', state.q);
  if (state.types.size) p.set('type', [...state.types].join(','));
  if (state.status) p.set('status', state.status);
  if (state.tech) p.set('tech', state.tech);
  if (state.from !== minYear) p.set('from', String(state.from));
  if (state.to !== maxYear) p.set('to', String(state.to));
  if (state.sort !== 'newest') p.set('sort', state.sort);
  if (state.view !== 'grid') p.set('view', state.view);
  const qs = p.toString();
  window.history.replaceState(null, '', qs ? `?${qs}` : window.location.pathname);
}

function matches(p, { ignoreYears = false } = {}) {
  if (state.types.size && !state.types.has(p.type)) return false;
  if (state.status && p.status !== state.status) return false;
  if (state.tech && !(p.tech || []).some((t) => t.toLowerCase() === state.tech.toLowerCase())) return false;
  if (state.q) {
    const hay = [p.title, p.type, p.badge, p.summary, ...(p.tech || []), dateLabel(p)].join(' ').toLowerCase();
    if (!state.q.toLowerCase().split(/\s+/).filter(Boolean).every((w) => hay.includes(w))) return false;
  }
  if (!ignoreYears) {
    const y = projectYears(p);
    if (!y || y.to < state.from || y.from > state.to) return false;
  }
  return true;
}

function sorted(list) {
  const out = [...list];
  if (state.sort === 'oldest') out.sort((a, b) => compareNewest(b, a));
  else if (state.sort === 'name') out.sort((a, b) => a.title.localeCompare(b.title, 'en-GB'));
  else out.sort(compareNewest);
  return out;
}

/* ---------- Filter controls ---------- */
function buildTypeChips() {
  const types = [...new Set(all.map((p) => p.type))].sort();
  clear(typeHost);
  for (const t of types) {
    const n = all.filter((p) => p.type === t).length;
    typeHost.append(el('button', {
      class: 'chip', type: 'button', 'data-type': typeKey(t), 'data-type-name': t, 'aria-pressed': String(state.types.has(t)),
      onclick: () => { if (state.types.has(t)) state.types.delete(t); else state.types.add(t); update(); },
    }, [el('span', { class: 'chip-dot', 'aria-hidden': 'true' }), t, el('span', { class: 'chip-count', text: String(n) })]));
  }
}

function buildTechOptions() {
  const counts = new Map();
  for (const p of all) for (const t of p.tech || []) counts.set(t, (counts.get(t) || 0) + 1);
  const techs = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  clear(techSelect).append(el('option', { value: '', text: 'Any technology' }), ...techs.map(([t, n]) => el('option', { value: t, text: `${t} (${n})` })));
  if (!counts.has(state.tech)) state.tech = '';
  techSelect.value = state.tech;
}

function buildRange() {
  for (const input of [fromInput, toInput]) { input.min = String(minYear); input.max = String(maxYear); input.step = '1'; }
  fromInput.value = String(state.from);
  toInput.value = String(state.to);
  clear(rangeScale).append(el('span', { text: String(minYear) }), el('span', { text: String(maxYear) }));
}

function paintRange(list) {
  rangeValue.textContent = state.from === state.to ? String(state.from) : `${state.from} – ${state.to}`;
  const span = maxYear - minYear || 1;
  rangeFill.style.left = `${((state.from - minYear) / span) * 100}%`;
  rangeFill.style.right = `${((maxYear - state.to) / span) * 100}%`;
  // When both handles meet at the far right, keep "from" on top so it can still be dragged.
  fromInput.style.zIndex = state.from >= maxYear ? '3' : '';
  fromInput.setAttribute('aria-valuetext', `From ${state.from}`);
  toInput.setAttribute('aria-valuetext', `To ${state.to}`);
  // Histogram: projects active in each year (respecting the other filters).
  const counts = [];
  for (let y = minYear; y <= maxYear; y++) counts.push(list.filter((p) => { const r = projectYears(p); return r && r.from <= y && r.to >= y; }).length);
  const peak = Math.max(1, ...counts);
  clear(histogram);
  counts.forEach((n, i) => {
    const y = minYear + i;
    const bar = el('span', { class: `histogram-bar${y < state.from || y > state.to ? ' is-out' : ''}`, title: `${y}: ${n} project${n === 1 ? '' : 's'}` });
    bar.style.height = `${Math.max(6, (n / peak) * 100)}%`;
    histogram.append(bar);
  });
}

/* ---------- Results ---------- */
function renderGrid(list) {
  const grid = el('div', { class: 'card-grid' });
  list.forEach((p, i) => grid.append(projectCard(p, { eager: i < 3, headingLevel: 2 })));
  return grid;
}

function renderTable(list) {
  const tbody = el('tbody');
  for (const p of list) {
    tbody.append(el('tr', {}, [
      el('td', {}, [el('a', { href: projectUrl(p), text: p.title })]),
      el('td', { class: 'muted', text: dateLabel(p) }),
      el('td', {}, [el('span', { class: 'type-pill', 'data-type': typeKey(p.type), text: p.type })]),
      el('td', { class: 'muted', text: (p.tech || []).length ? p.tech.join(', ') : 'N/A' }),
      el('td', {}, [el('span', { class: `status status--${p.status}`, text: STATUSES[p.status] || '' })]),
      el('td', {}, [el('a', { class: 'text-link', href: projectUrl(p), 'aria-label': `View ${p.title}` }, ['View project', svgIcon('arrow')])]),
    ]));
  }
  return el('div', { class: 'table-wrap' }, [el('table', { class: 'projects-table' }, [
    el('caption', { class: 'sr-only', text: 'All projects' }),
    el('thead', {}, [el('tr', {}, ['Project name', 'Date', 'Type', 'Language / technology', 'Status', 'Details'].map((h) => el('th', { scope: 'col', text: h })))]),
    tbody,
  ])]);
}

function resetFilters() {
  state.q = ''; state.types.clear(); state.status = ''; state.tech = '';
  state.from = minYear; state.to = maxYear;
  searchInput.value = ''; statusSelect.value = ''; techSelect.value = '';
  fromInput.value = String(minYear); toInput.value = String(maxYear);
  update();
}

function update() {
  writeUrl();
  typeHost.querySelectorAll('[data-type-name]').forEach((c) => c.setAttribute('aria-pressed', String(state.types.has(c.dataset.typeName))));
  viewButtons.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.view === state.view)));
  paintRange(all.filter((p) => matches(p, { ignoreYears: true })));

  const list = sorted(all.filter((p) => matches(p)));
  clear(countEl).append('Showing ', el('strong', { text: String(list.length) }), ` of ${all.length} projects`);

  if (!list.length) {
    timeline = null;
    clear(results).append(el('div', { class: 'empty-state' }, [
      el('span', { class: 'big', 'aria-hidden': 'true', text: '🔍' }),
      el('p', { text: 'No projects match those filters.' }),
      el('button', { class: 'btn btn-ghost btn-sm', type: 'button', onclick: resetFilters, text: 'Reset filters' }),
    ]));
    return;
  }
  if (state.view === 'timeline') {
    if (!timeline || !results.contains(timeline.host)) {
      const host = el('div');
      clear(results).append(host);
      timeline = createTimeline(host, list, { hrefFor: projectUrl });
      timeline.host = host;
    } else timeline.update(list);
    return;
  }
  timeline = null;
  clear(results).append(state.view === 'table' ? renderTable(list) : renderGrid(list));
}

function bind() {
  searchInput.addEventListener('input', () => { state.q = searchInput.value.trim().slice(0, 80); update(); });
  statusSelect.addEventListener('change', () => { state.status = statusSelect.value; update(); });
  techSelect.addEventListener('change', () => { state.tech = techSelect.value; update(); });
  sortSelect.addEventListener('change', () => { state.sort = sortSelect.value; update(); });
  const onRange = (which) => () => {
    let from = Number(fromInput.value); let to = Number(toInput.value);
    if (from > to) { if (which === 'from') to = from; else from = to; }
    fromInput.value = String(from); toInput.value = String(to);
    state.from = from; state.to = to;
    update();
  };
  fromInput.addEventListener('input', onRange('from'));
  toInput.addEventListener('input', onRange('to'));
  viewButtons.forEach((b) => b.addEventListener('click', () => { state.view = b.dataset.view; update(); }));
  document.querySelector('[data-reset]')?.addEventListener('click', resetFilters);
}

if (form && results) {
  loadData().then(({ projects }) => {
    all = projects;
    const years = all.map((p) => projectYears(p)).filter(Boolean);
    minYear = Math.min(SITE.codingSince, ...years.map((y) => y.from));
    maxYear = Math.max(new Date().getFullYear(), ...years.map((y) => y.to));
    readUrl();
    searchInput.value = state.q;
    statusSelect.value = state.status;
    sortSelect.value = state.sort;
    buildTypeChips();
    buildTechOptions();
    buildRange();
    const tech = new Set(all.flatMap((p) => p.tech || []).map((t) => t.toLowerCase()));
    if (noteEl) noteEl.textContent = `✨ Started coding in Summer ${SITE.codingSince} • ${all.length} projects • ${tech.size} technologies`;
    bind();
    update();
  }).catch(() => showLoadError(results));
}
