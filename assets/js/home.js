import {
  loadData, projectCard, projectUrl, reveal, showLoadError, url,
} from './site.js';
import { el, svgIcon, clear, prefersReducedMotion } from './lib/dom.js';
import { initCircuit } from './lib/circuit.js';
import { createTimeline } from './lib/timeline.js';
import {
  typeKey, coverOf, milestoneProgress, safeAssetPath, SITE,
} from './lib/util.js';

const reduced = prefersReducedMotion();

/* ---------- Hero ---------- */
const canvas = document.querySelector('[data-circuit]');
if (canvas) initCircuit(canvas, { interactiveArea: canvas.closest('section'), reduced });

function initRoles() {
  const host = document.querySelector('[data-roles]');
  if (!host || reduced) return;
  const roles = (host.dataset.roles || '').split('|').map((r) => r.trim()).filter(Boolean);
  if (!roles.length) return;
  const visible = host.querySelector('[data-roles-visible]');
  const typed = el('span', { class: 'role-type' });
  clear(visible).append(typed, el('span', { class: 'role-caret' }));
  let i = 0; let n = 0; let deleting = false;
  const step = () => {
    const word = roles[i];
    n += deleting ? -1 : 1;
    typed.textContent = word.slice(0, n);
    let delay = deleting ? 32 : 62;
    if (!deleting && n === word.length) { deleting = true; delay = 1700; }
    else if (deleting && n === 0) { deleting = false; i = (i + 1) % roles.length; delay = 350; }
    setTimeout(step, delay);
  };
  step();
}

function initOrbit(onPick) {
  const orbit = document.querySelector('[data-orbit]');
  if (!orbit) return;
  const chips = [...orbit.querySelectorAll('.orbit-chip')];
  chips.forEach((c) => c.addEventListener('click', () => onPick(c.dataset.filter, c)));
  const small = window.matchMedia('(max-width: 520px)');
  // Only spin for mouse users (hovering pauses it); touch screens get a still ring of chips.
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  let angle = -Math.PI / 2;
  let paused = false;
  let running = false;
  let raf = 0;
  let lastT = 0;
  const place = () => {
    const r = orbit.clientWidth * 0.42;
    chips.forEach((c, i) => {
      const a = angle + (i * Math.PI * 2) / chips.length;
      c.style.transform = `translate(-50%, -50%) translate(${(Math.cos(a) * r).toFixed(1)}px, ${(Math.sin(a) * r).toFixed(1)}px)`;
    });
  };
  const tick = (t) => {
    const dt = Math.min(0.05, (t - (lastT || t)) / 1000);
    lastT = t;
    if (!paused) angle += dt * 0.09;
    place();
    raf = requestAnimationFrame(tick);
  };
  const mode = () => {
    const isStatic = reduced || small.matches;
    orbit.classList.toggle('orbit-static', isStatic);
    cancelAnimationFrame(raf); running = false;
    if (isStatic) { chips.forEach((c) => { c.style.transform = ''; }); return; }
    place();
    if (!reduced && finePointer.matches) { running = true; lastT = 0; raf = requestAnimationFrame(tick); }
  };
  orbit.addEventListener('pointerenter', () => { paused = true; });
  orbit.addEventListener('pointerleave', () => { paused = false; });
  orbit.addEventListener('focusin', () => { paused = true; });
  orbit.addEventListener('focusout', () => { paused = false; });
  small.addEventListener('change', mode);
  finePointer.addEventListener('change', mode);
  new IntersectionObserver(([e]) => {
    if (!e.isIntersecting) { cancelAnimationFrame(raf); running = false; } else if (!running) mode();
  }).observe(orbit);
  mode();
}

/* ---------- Stats ---------- */
function countUp(node, value) {
  if (reduced) { node.textContent = String(value); return; }
  const start = performance.now();
  const dur = 1100;
  const tick = (t) => {
    const k = Math.min(1, (t - start) / dur);
    node.textContent = String(Math.round(value * (1 - (1 - k) ** 3)));
    if (k < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

function renderStats(projects) {
  const host = document.querySelector('[data-stats]');
  if (!host) return;
  const tech = new Set(projects.flatMap((p) => p.tech || []).map((t) => t.toLowerCase()));
  const values = {
    projects: projects.length,
    years: new Date().getFullYear() - SITE.codingSince,
    tech: tech.size,
    active: projects.filter((p) => p.status !== 'completed').length,
  };
  const nodes = host.querySelectorAll('[data-stat]');
  const io = new IntersectionObserver((entries) => {
    if (!entries.some((e) => e.isIntersecting)) return;
    io.disconnect();
    nodes.forEach((n) => countUp(n, values[n.dataset.stat] ?? 0));
  });
  nodes.forEach((n) => { n.textContent = String(values[n.dataset.stat] ?? 0); });
  if (!reduced) { nodes.forEach((n) => { n.textContent = '0'; }); io.observe(host); }
}

/* ---------- "Currently building" spotlight ---------- */
function renderSpotlight(projects) {
  const host = document.querySelector('[data-spotlight]');
  if (!host) return;
  const p = projects.find((x) => x.status === 'in-progress' && (x.milestones || []).length)
    || projects.find((x) => x.status === 'in-progress');
  const section = host.closest('section');
  if (!p) { section.hidden = true; return; }
  const cover = coverOf(p);
  const prog = milestoneProgress(p);
  const src = cover && safeAssetPath(cover.src);
  const bar = el('span');
  clear(host).append(
    el('div', { class: 'spotlight-media', 'data-type': typeKey(p.type) }, [
      src ? el('img', { src: url(src), alt: cover.alt || '', loading: 'lazy', decoding: 'async' })
        : el('div', { class: 'cover-art', 'data-type': typeKey(p.type), 'aria-hidden': 'true' }, [el('span', { text: p.title[0] })]),
    ]),
    el('div', { class: 'spotlight-body' }, [
      el('span', { class: 'live-dot', text: 'Currently building' }),
      el('h3', { text: p.title }),
      el('p', { text: p.summary }),
      prog ? el('div', { class: 'progress' }, [
        el('div', { class: 'progress-top' }, [el('span', { text: 'Build progress' }), el('span', { text: `${prog.done} of ${prog.total} milestones` })]),
        el('div', { class: 'progress-bar', role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-valuenow': String(prog.pct), 'aria-label': 'Build progress' }, [bar]),
      ]) : null,
      prog ? el('ul', { class: 'mini-milestones' }, p.milestones.map((m) => el('li', { class: m.done ? 'is-done' : '' }, [
        el('span', { class: 'tick', 'aria-hidden': 'true' }, m.done ? [svgIcon('check')] : []),
        el('span', { text: m.label }),
        el('span', { class: 'sr-only', text: m.done ? ' (done)' : ' (to do)' }),
      ]))) : null,
      el('p', {}, [el('a', { class: 'btn btn-primary', href: projectUrl(p) }, ['Follow the build', svgIcon('arrow')])]),
    ]),
  );
  if (prog) {
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) { io.disconnect(); requestAnimationFrame(() => { bar.style.width = `${prog.pct}%`; }); }
    });
    io.observe(host);
  }
}

/* ---------- Featured projects with animated filtering ---------- */
let applyFeaturedFilter = () => {};

function renderFeatured(projects) {
  const grid = document.querySelector('[data-featured-grid]');
  const chipsHost = document.querySelector('[data-featured-filters]');
  const live = document.querySelector('[data-featured-live]');
  if (!grid) return;
  const featured = projects.filter((p) => p.featured).sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
  const list = featured.length ? featured : projects.slice(0, 9);
  clear(grid);
  const cards = list.map((p) => {
    const card = projectCard(p);
    card.dataset.typeName = p.type;
    card.setAttribute('data-reveal', '');
    grid.append(card);
    reveal(card);
    return card;
  });

  const types = [...new Set(list.map((p) => p.type))];
  let current = '';
  const chip = (label, type, count) => el('button', {
    class: 'chip', type: 'button', 'aria-pressed': String(type === current), 'data-type': type ? typeKey(type) : null,
    onclick: () => applyFeaturedFilter(type),
  }, [type ? el('span', { class: 'chip-dot', 'aria-hidden': 'true' }) : null, label, el('span', { class: 'chip-count', text: String(count) })]);
  const renderChips = () => {
    clear(chipsHost).append(chip('All', '', list.length), ...types.map((t) => chip(t, t, list.filter((p) => p.type === t).length)));
  };

  applyFeaturedFilter = (type) => {
    current = types.includes(type) ? type : '';
    const first = new Map(cards.map((c) => [c, c.getBoundingClientRect()]));
    cards.forEach((c) => { c.hidden = Boolean(current) && c.dataset.typeName !== current; });
    renderChips();
    const shown = cards.filter((c) => !c.hidden).length;
    if (live) live.textContent = current ? `Showing ${shown} ${current.toLowerCase()} project${shown === 1 ? '' : 's'}` : `Showing all ${shown} featured projects`;
    if (reduced) return;
    for (const c of cards) {
      if (c.hidden) continue;
      c.classList.add('is-visible');
      const a = first.get(c);
      const b = c.getBoundingClientRect();
      if (!a.width) {
        c.animate([{ opacity: 0, transform: 'scale(0.94)' }, { opacity: 1, transform: 'none' }], { duration: 380, easing: 'cubic-bezier(.2,.8,.2,1)' });
      } else if (a.left !== b.left || a.top !== b.top) {
        c.animate([{ transform: `translate(${a.left - b.left}px, ${a.top - b.top}px)` }, { transform: 'none' }], { duration: 480, easing: 'cubic-bezier(.2,.8,.2,1)' });
      }
    }
  };
  renderChips();
}

function pickSkill(type, chipEl) {
  document.querySelectorAll('.orbit-chip').forEach((c) => c.classList.toggle('is-active', c === chipEl));
  const target = document.getElementById('projects');
  target?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
  setTimeout(() => applyFeaturedFilter(type), reduced ? 0 : 450);
}

/* ---------- Boot ---------- */
initRoles();
initOrbit(pickSkill);

loadData().then(({ projects }) => {
  renderStats(projects);
  renderSpotlight(projects);
  renderFeatured(projects);
  const tl = document.querySelector('[data-timeline]');
  if (tl) createTimeline(tl, projects, { hrefFor: projectUrl });
}).catch(() => {
  const grid = document.querySelector('[data-featured-grid]');
  if (grid) showLoadError(grid);
  const sp = document.querySelector('[data-spotlight]');
  if (sp) sp.closest('section').hidden = true;
});
