// Shared behaviour for every public page: header, theme, search palette,
// scroll reveal, project data loading and project cards.

import {
  STATUSES, dateLabel, compareNewest, typeKey, coverOf, safeAssetPath,
} from './lib/util.js';
import { el, svgIcon, clear, prefersReducedMotion } from './lib/dom.js';

export const ROOT = document.documentElement.dataset.root || '';
export const url = (path) => ROOT + path;
export const projectUrl = (p) => url(`projects/${p.slug}.html`);

/* ---------- Data ---------- */
let dataPromise;
export function loadData() {
  dataPromise ||= fetch(url('data/projects.json'), { cache: 'no-cache', credentials: 'same-origin' })
    .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
    .then((data) => {
      const projects = (Array.isArray(data.projects) ? data.projects : [])
        .filter((p) => p && typeof p.slug === 'string' && /^[a-z0-9-]+$/.test(p.slug) && p.title)
        .sort(compareNewest);
      return { ...data, projects };
    });
  return dataPromise;
}

export function showLoadError(container, message = 'Projects could not be loaded. Please refresh the page.') {
  clear(container).append(el('p', { class: 'empty-state', role: 'alert' }, [el('span', { class: 'big', 'aria-hidden': 'true', text: '🔌' }), message]));
}

/* ---------- Header ---------- */
function initHeader() {
  const header = document.querySelector('[data-header]');
  if (!header) return;
  const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 8);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  const toggle = header.querySelector('[data-nav-toggle]');
  const menu = header.querySelector('[data-nav-menu]');
  const setOpen = (open) => {
    toggle.setAttribute('aria-expanded', String(open));
    menu.classList.toggle('is-open', open);
  };
  toggle?.addEventListener('click', () => setOpen(toggle.getAttribute('aria-expanded') !== 'true'));
  menu?.addEventListener('click', (e) => { if (e.target.closest('a')) setOpen(false); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && toggle?.getAttribute('aria-expanded') === 'true') { setOpen(false); toggle.focus(); }
  });
  document.addEventListener('click', (e) => {
    if (toggle?.getAttribute('aria-expanded') === 'true' && !header.contains(e.target)) setOpen(false);
  });

  const brand = header.querySelector('[data-brand]');
  brand?.addEventListener('mouseenter', () => {
    brand.classList.remove('is-waving');
    void brand.offsetWidth;
    brand.classList.add('is-waving');
  });

  // Highlight the section in view (home page only).
  const links = [...menu.querySelectorAll('a[href^="#"]')];
  const sections = links.map((a) => document.getElementById(a.getAttribute('href').slice(1))).filter(Boolean);
  if (sections.length && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        links.forEach((a) => a.classList.toggle('is-active', a.getAttribute('href') === `#${entry.target.id}`));
      }
    }, { rootMargin: '-45% 0px -50% 0px' });
    sections.forEach((s) => io.observe(s));
  }
}

/* ---------- Theme ---------- */
function currentTheme() {
  const set = document.documentElement.getAttribute('data-theme');
  if (set) return set;
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

function initTheme() {
  const btn = document.querySelector('[data-theme-toggle]');
  if (!btn) return;
  const label = () => btn.setAttribute('aria-label', currentTheme() === 'dark' ? 'Switch to light theme' : 'Switch to dark theme');
  label();
  btn.addEventListener('click', () => {
    const next = currentTheme() === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    try { localStorage.setItem('theme', next); } catch { /* ignore */ }
    label();
  });
}

/* ---------- Reveal on scroll ---------- */
let revealObserver;
export function reveal(node) {
  if (!node) return;
  if (prefersReducedMotion() || !('IntersectionObserver' in window)) { node.classList.add('is-visible'); return; }
  revealObserver ||= new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) { entry.target.classList.add('is-visible'); revealObserver.unobserve(entry.target); }
    }
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
  revealObserver.observe(node);
}

/* ---------- Project card ---------- */
export function projectCard(p, { headingLevel = 3, eager = false } = {}) {
  const cover = coverOf(p);
  const src = cover && safeAssetPath(cover.thumb || cover.src);
  const coverEl = el('div', { class: 'card-cover' }, [
    src
      ? el('img', { src: url(src), alt: '', loading: eager ? 'eager' : 'lazy', decoding: 'async', width: 720, height: 450 })
      : el('div', { class: 'cover-art', 'data-type': typeKey(p.type), 'aria-hidden': 'true' }, [el('span', { text: p.title.slice(0, 1) })]),
    el('span', { class: 'type-pill', 'data-type': typeKey(p.type), text: p.type }),
    p.status !== 'completed' ? el('span', { class: `status status--${p.status}`, text: STATUSES[p.status] || '' }) : null,
  ]);
  const title = el(`h${headingLevel}`, { class: 'card-title' }, [el('a', { class: 'card-link', href: projectUrl(p), text: p.title })]);
  const highlights = (p.highlights || []).length
    ? el('ul', { class: 'card-highlights', 'aria-label': 'Highlights' }, p.highlights.map((h) => el('li', { text: `${h.icon ? `${h.icon} ` : ''}${h.text}` })))
    : null;
  const card = el('article', { class: 'project-card', 'data-type': typeKey(p.type), 'data-slug': p.slug }, [
    coverEl,
    el('div', { class: 'card-body' }, [
      el('div', { class: 'card-meta' }, [el('span', { text: p.badge || (p.tech || [])[0] || p.type }), el('span', { text: dateLabel(p) })]),
      title,
      el('p', { class: 'card-summary', text: p.summary }),
      highlights,
      el('span', { class: 'card-cta', 'aria-hidden': 'true' }, ['Learn more', svgIcon('arrow')]),
    ]),
  ]);
  // The whole card is clickable, but only the title is a real link (good for screen readers).
  card.addEventListener('click', (e) => {
    if (e.target.closest('a') || window.getSelection()?.toString()) return;
    const link = card.querySelector('.card-link');
    if (e.ctrlKey || e.metaKey) window.open(link.href, '_blank', 'noopener'); else link.click();
  });
  attachTilt(card);
  return card;
}

export function attachTilt(card) {
  if (prefersReducedMotion()) return;
  let frame = 0;
  card.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      const r = card.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width;
      const y = (e.clientY - r.top) / r.height;
      card.style.setProperty('--mx', `${(x * 100).toFixed(1)}%`);
      card.style.setProperty('--my', `${(y * 100).toFixed(1)}%`);
      card.style.transform = `perspective(900px) rotateX(${((0.5 - y) * 6).toFixed(2)}deg) rotateY(${((x - 0.5) * 7).toFixed(2)}deg) translateY(-4px)`;
    });
  });
  card.addEventListener('pointerleave', () => { cancelAnimationFrame(frame); card.style.transform = ''; });
}

/* ---------- Command palette (Ctrl/Cmd + K) ---------- */
const PAGES = [
  { title: 'Home', href: 'index.html#home', meta: 'Page' },
  { title: 'About me', href: 'index.html#about', meta: 'Section' },
  { title: 'Featured projects', href: 'index.html#projects', meta: 'Section' },
  { title: 'Project timeline', href: 'index.html#timeline', meta: 'Section' },
  { title: 'Education & certifications', href: 'index.html#education', meta: 'Section' },
  { title: 'All projects', href: 'projects.html', meta: 'Page' },
];

let palette;
function buildPalette() {
  const input = el('input', {
    class: 'palette-input', type: 'search', placeholder: 'Search projects, tech, pages…', 'aria-label': 'Search',
    autocomplete: 'off', spellcheck: 'false', role: 'combobox', 'aria-expanded': 'true', 'aria-controls': 'palette-list', 'aria-autocomplete': 'list',
  });
  const list = el('ul', { class: 'palette-list', id: 'palette-list', role: 'listbox', 'aria-label': 'Results' });
  const dialog = el('dialog', { class: 'palette', 'aria-label': 'Search' }, [
    el('div', { class: 'palette-head' }, [svgIcon('search'), input, el('kbd', { class: 'kbd', text: 'Esc' })]),
    list,
    el('div', { class: 'palette-foot', 'aria-hidden': 'true' }, [el('span', { text: '↑ ↓ to move' }), el('span', { text: 'Enter to open' }), el('span', { text: 'Esc to close' })]),
  ]);
  document.body.append(dialog);

  let items = [];
  let active = 0;
  let projects = [];
  loadData().then((d) => { projects = d.projects; render(); }).catch(() => {});

  function score(text, q) {
    const t = text.toLowerCase();
    return q.split(/\s+/).filter(Boolean).every((w) => t.includes(w));
  }
  function render() {
    const q = input.value.trim().toLowerCase();
    clear(list);
    const pageItems = PAGES.filter((p) => !q || score(p.title, q)).map((p) => ({ ...p, href: url(p.href) }));
    const projItems = projects
      .filter((p) => !q || score([p.title, p.type, p.badge, ...(p.tech || []), dateLabel(p)].join(' '), q))
      .sort((a, b) => (q ? (b.title.toLowerCase().startsWith(q) - a.title.toLowerCase().startsWith(q)) : 0))
      .map((p) => ({ title: p.title, href: projectUrl(p), meta: dateLabel(p), type: p.type }));
    items = [...projItems, ...pageItems];
    active = Math.min(active, Math.max(items.length - 1, 0));
    if (!items.length) {
      list.append(el('li', { class: 'palette-empty', role: 'presentation', text: 'No matches. Try another word.' }));
      input.removeAttribute('aria-activedescendant');
      return;
    }
    const groups = [['Projects', projItems], ['Pages', pageItems]];
    let i = 0;
    for (const [name, group] of groups) {
      if (!group.length) continue;
      list.append(el('li', { class: 'palette-group', role: 'presentation', text: name }));
      for (const item of group) {
        const idx = i++;
        list.append(el('li', {
          class: 'palette-option', role: 'option', id: `palette-opt-${idx}`, 'aria-selected': String(idx === active),
          onmousemove: () => { if (active !== idx) { active = idx; highlight(); } },
          onclick: () => go(idx),
        }, [
          item.type ? el('span', { class: 'chip-dot', 'data-type': typeKey(item.type), 'aria-hidden': 'true' }) : svgIcon('arrow'),
          el('span', { class: 'palette-option-title', text: item.title }),
          el('span', { class: 'palette-option-meta', text: item.meta }),
        ]));
      }
    }
    highlight();
  }
  function highlight() {
    list.querySelectorAll('[role="option"]').forEach((o, i) => o.setAttribute('aria-selected', String(i === active)));
    const opt = list.querySelector(`#palette-opt-${active}`);
    if (opt) { input.setAttribute('aria-activedescendant', opt.id); opt.scrollIntoView({ block: 'nearest' }); }
  }
  function go(idx) {
    const item = items[idx];
    if (!item) return;
    dialog.close();
    window.location.href = item.href;
  }
  input.addEventListener('input', () => { active = 0; render(); });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); active = (active + 1) % Math.max(items.length, 1); highlight(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); active = (active - 1 + items.length) % Math.max(items.length, 1); highlight(); }
    else if (e.key === 'Enter') { e.preventDefault(); go(active); }
  });
  dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); });
  render();
  return { dialog, input, render };
}

export function openPalette() {
  palette ||= buildPalette();
  palette.input.value = '';
  palette.render();
  palette.dialog.showModal();
  palette.input.focus();
}

function initPalette() {
  const isMac = /Mac|iPhone|iPad/.test(navigator.userAgentData?.platform || navigator.platform || '');
  document.querySelectorAll('[data-kbd]').forEach((k) => { k.textContent = isMac ? '⌘K' : 'Ctrl K'; });
  document.querySelectorAll('[data-palette-open]').forEach((b) => b.addEventListener('click', openPalette));
  document.addEventListener('keydown', (e) => {
    const typing = e.target.closest?.('input, textarea, select, [contenteditable="true"]');
    if ((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      if (palette?.dialog.open) palette.dialog.close(); else openPalette();
    } else if (e.key === '/' && !typing && !e.defaultPrevented) {
      const local = document.querySelector('[data-search-input]');
      e.preventDefault();
      if (local) local.focus(); else openPalette();
    }
  });
}

function initYear() {
  const y = String(new Date().getFullYear());
  document.querySelectorAll('[data-year]').forEach((n) => { n.textContent = y; });
}

initHeader();
initTheme();
initPalette();
initYear();
document.querySelectorAll('[data-reveal]').forEach(reveal);
