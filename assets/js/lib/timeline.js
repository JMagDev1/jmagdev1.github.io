// Interactive horizontal timeline of projects. Bars show the real date span;
// dashed bars mean only the year is known. Drag or scroll sideways to explore.

import { projectSpan, dateLabel, typeKey, STATUSES } from './util.js';
import { el, clear, debounce } from './dom.js';

const PAD = 24;
const LANE_H = 38;
const GAP = 10;

let measureCtx;
function textWidth(text) {
  measureCtx ||= document.createElement('canvas').getContext('2d');
  measureCtx.font = '600 12.5px Poppins, system-ui, sans-serif';
  return measureCtx.measureText(text).width;
}

/**
 * @param {HTMLElement} host - empty container
 * @param {object[]} projects
 * @param {{ hrefFor: (p) => string, now?: Date }} opts
 * @returns {{ update(projects), highlight(typeKey|null) }}
 */
export function createTimeline(host, projects, { hrefFor, now = new Date() } = {}) {
  host.classList.add('timeline-wrap');
  const scroller = el('div', { class: 'timeline-scroll', tabindex: '0', role: 'region', 'aria-label': 'Project timeline. Scroll sideways to see every year.' });
  const inner = el('div', { class: 'timeline' });
  const legend = el('div', { class: 'timeline-legend' });
  const tooltip = el('div', { class: 'tooltip', role: 'presentation', 'aria-hidden': 'true' });
  scroller.append(inner);
  host.append(scroller, legend);
  document.body.append(tooltip);

  let current = projects;
  let highlighted = null;

  function bounds(list) {
    const spans = list.map((p) => projectSpan(p, now)).filter(Boolean);
    const startYear = Math.min(...spans.map((s) => Math.floor(s.start / 12)), now.getFullYear());
    const endYear = Math.max(...spans.map((s) => Math.floor(s.end / 12)), now.getFullYear());
    return { min: startYear * 12, max: endYear * 12 + 11, startYear, endYear };
  }

  function render() {
    clear(inner);
    tooltip.classList.remove('is-visible');
    const list = current.filter((p) => projectSpan(p, now));
    if (!list.length) {
      inner.append(el('p', { class: 'empty-state', text: 'No projects in this range.' }));
      return;
    }
    const b = bounds(list);
    const months = b.max - b.min + 1;
    const width = Math.max(scroller.clientWidth || 0, 1100);
    inner.style.width = `${width}px`;
    const ppm = (width - PAD * 2) / months;
    const x = (m) => PAD + (m - b.min) * ppm;

    const years = el('div', { class: 'timeline-years', 'aria-hidden': 'true' });
    const grid = el('div', { class: 'timeline-grid', 'aria-hidden': 'true' });
    for (let y = b.startYear; y <= b.endYear; y++) {
      const left = x(y * 12);
      years.append(el('span', { class: 'timeline-year', text: String(y) }));
      years.lastChild.style.left = `${left + (12 * ppm) / 2}px`;
      const line = el('span', { class: 'timeline-gridline' });
      line.style.left = `${left - PAD}px`;
      grid.append(line);
    }
    const nowM = now.getFullYear() * 12 + now.getMonth();
    const nowLine = el('span', { class: 'timeline-now' });
    nowLine.style.left = `${x(nowM) - PAD + ppm / 2}px`;
    grid.append(nowLine);

    // Oldest first, packed into lanes so labels never overlap.
    const items = list.map((p) => {
      const s = projectSpan(p, now);
      const barLeft = x(s.start);
      const barW = Math.max(ppm * (s.end - s.start + 1), 14);
      const labelW = Math.ceil(textWidth(p.title)) + 6;
      const inside = barW >= labelW + 24;
      // Put the label on the left of the bar if it would run off the right edge.
      const flip = !inside && barLeft + barW + 8 + labelW > width - 4;
      const w = inside ? barW : barW + 8 + labelW;
      const left = flip ? barLeft - 8 - labelW : barLeft;
      return { p, s, left, w, barW, inside, flip };
    }).sort((a, b2) => a.left - b2.left || b2.w - a.w);
    const laneEnds = [];
    for (const it of items) {
      let lane = laneEnds.findIndex((end) => end + GAP <= it.left);
      if (lane === -1) { lane = laneEnds.length; laneEnds.push(0); }
      laneEnds[lane] = it.left + it.w;
      it.lane = lane;
    }
    const lanes = el('div', { class: 'timeline-lanes' });
    lanes.style.height = `${laneEnds.length * LANE_H}px`;
    for (const it of items) {
      const { p, s } = it;
      const bar = el('span', { class: 'tl-bar', 'aria-hidden': 'true' }, it.inside ? [el('span', { class: 'tl-label', text: p.title })] : []);
      bar.style.width = `${it.barW}px`;
      const a = el('a', {
        class: `timeline-item${s.approx ? ' is-approx' : ''}${p.ongoing ? ' is-ongoing' : ''}${it.flip ? ' is-flipped' : ''}`,
        href: hrefFor(p), 'data-type': typeKey(p.type), 'data-slug': p.slug,
        'aria-label': `${p.title}, ${p.type}, ${dateLabel(p)}`,
      }, [bar, it.inside ? null : el('span', { class: 'tl-label', 'aria-hidden': 'true', text: p.title })]);
      a.style.left = `${it.left}px`;
      a.style.top = `${it.lane * LANE_H}px`;
      a.style.width = `${Math.ceil(it.w)}px`;
      const show = () => {
        clear(tooltip).append(el('strong', { text: p.title }), el('span', { text: `${p.type} · ${dateLabel(p)}${p.status !== 'completed' ? ` · ${STATUSES[p.status]}` : ''}` }));
        const r = a.getBoundingClientRect();
        tooltip.classList.add('is-visible');
        const tw = tooltip.offsetWidth;
        tooltip.style.left = `${Math.min(Math.max(8, r.left), window.innerWidth - tw - 8)}px`;
        tooltip.style.top = `${Math.max(8, r.top - tooltip.offsetHeight - 10)}px`;
      };
      const hide = () => tooltip.classList.remove('is-visible');
      a.addEventListener('mouseenter', show);
      a.addEventListener('focus', show);
      a.addEventListener('mouseleave', hide);
      a.addEventListener('blur', hide);
      lanes.append(a);
    }
    inner.append(years, grid, lanes);
    applyHighlight();
  }

  function renderLegend() {
    clear(legend);
    const types = [...new Set(projects.map((p) => p.type))];
    for (const t of types) {
      const btn = el('button', {
        class: 'legend-item chip', type: 'button', 'data-type': typeKey(t), 'aria-pressed': 'false',
        onclick: () => { highlighted = highlighted === typeKey(t) ? null : typeKey(t); applyHighlight(); },
      }, [el('span', { class: 'legend-swatch', 'aria-hidden': 'true' }), t]);
      legend.append(btn);
    }
    legend.append(el('span', { class: 'legend-item' }, [el('span', { class: 'legend-swatch legend-swatch--approx', 'aria-hidden': 'true' }), 'Dashed: year only']));
  }

  function applyHighlight() {
    inner.querySelectorAll('.timeline-item').forEach((a) => a.classList.toggle('is-dim', Boolean(highlighted) && a.dataset.type !== highlighted));
    legend.querySelectorAll('button[data-type]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.type === highlighted)));
  }

  // Drag to scroll with the mouse.
  let drag = null;
  scroller.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'mouse' || e.button !== 0) return;
    drag = { x: e.clientX, left: scroller.scrollLeft, moved: false };
  });
  window.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const dx = e.clientX - drag.x;
    if (Math.abs(dx) > 4) { drag.moved = true; scroller.classList.add('is-dragging'); }
    scroller.scrollLeft = drag.left - dx;
  });
  window.addEventListener('pointerup', () => { setTimeout(() => { drag = null; }, 0); scroller.classList.remove('is-dragging'); });
  scroller.addEventListener('click', (e) => { if (drag?.moved) { e.preventDefault(); e.stopPropagation(); } }, true);

  const rerender = debounce(render, 120);
  if ('ResizeObserver' in window) new ResizeObserver(rerender).observe(host);
  // Measure labels with the real font once it has loaded.
  document.fonts?.load('600 12.5px Poppins').then(render).catch(() => {});
  renderLegend();
  render();
  // Start scrolled to the most recent work.
  requestAnimationFrame(() => { scroller.scrollLeft = scroller.scrollWidth; });

  return {
    update(list) { current = list; render(); },
    highlight(key) { highlighted = key; applyHighlight(); },
  };
}
