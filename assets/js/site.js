// Shared behaviour for every public page: header, theme, search palette,
// scroll reveal, project data loading and project cards.

import {
  STATUSES, dateLabel, compareNewest, typeKey, coverOf, safeAssetPath,
} from './lib/util.js';
import {
  el, svgIcon, clear, prefersReducedMotion, deviceReducesMotion, onMotionChange,
} from './lib/dom.js';
import {
  speechSupported, startReading, toggleReading, stopReading, readingStatus,
} from './lib/speech.js';

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
    if (prefersReducedMotion()) return;
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
        links.forEach((a) => {
          const on = a.getAttribute('href') === `#${entry.target.id}`;
          a.classList.toggle('is-active', on);
          if (on) a.setAttribute('aria-current', 'location'); else a.removeAttribute('aria-current');
        });
      }
    }, { rootMargin: '-45% 0px -50% 0px' });
    sections.forEach((s) => io.observe(s));
  }
}

/* ---------- Display preferences ----------
 * Everything defaults to the visitor's device settings (light/dark, reduce
 * motion). A choice made here is remembered in this browser only and can be
 * reset to "match my device" at any time. */
const root = document.documentElement;
const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch { /* storage blocked */ } },
};
const schemeQuery = window.matchMedia('(prefers-color-scheme: light)');
const themeChoice = () => root.getAttribute('data-theme') || 'system';
const effectiveTheme = () => (themeChoice() === 'system' ? (schemeQuery.matches ? 'light' : 'dark') : themeChoice());

export function setTheme(choice) {
  if (choice === 'light' || choice === 'dark') root.setAttribute('data-theme', choice); else root.removeAttribute('data-theme');
  store.set('theme', choice === 'light' || choice === 'dark' ? choice : null);
  document.dispatchEvent(new CustomEvent('themechange'));
}
export function setReduceMotion(on) {
  root.classList.toggle('reduce-motion', on);
  store.set('motion', on ? 'reduce' : null);
  document.dispatchEvent(new CustomEvent('motionchange'));
}
export function setEasyReading(on) {
  root.classList.toggle('easy-read', on);
  store.set('reading', on ? 'easy' : null);
  document.dispatchEvent(new CustomEvent('themechange'));
}

function initTheme() {
  const btn = document.querySelector('[data-theme-toggle]');
  if (!btn) return;
  const label = () => btn.setAttribute('aria-label', effectiveTheme() === 'dark' ? 'Switch to light theme' : 'Switch to dark theme');
  label();
  btn.addEventListener('click', () => setTheme(effectiveTheme() === 'dark' ? 'light' : 'dark'));
  document.addEventListener('themechange', label);
  schemeQuery.addEventListener?.('change', () => { label(); document.dispatchEvent(new CustomEvent('themechange')); });
}

/* ---------- Accessibility & display panel ---------- */
let panelSeq = 0;
function radio(name, value, text, checked, onchange) {
  const id = `a11y-${name}-${value}-${++panelSeq}`;
  return el('div', { class: 'a11y-option' }, [
    el('input', { type: 'radio', name, id, value, checked: checked || null, onchange }),
    el('label', { for: id, text }),
  ]);
}
function checkbox(id, text, hint, checked, onchange, { disabled = false } = {}) {
  const hintId = `${id}-hint`;
  return el('div', { class: 'a11y-option a11y-option--check' }, [
    el('input', { type: 'checkbox', id, checked: checked || null, disabled: disabled || null, 'aria-describedby': hintId, onchange }),
    el('label', { for: id }, [el('span', { class: 'a11y-option-title', text }), el('span', { class: 'a11y-hint', id: hintId, text: hint })]),
  ]);
}

function initA11yPanel() {
  const btn = document.querySelector('[data-a11y-open]');
  if (!btn) return;
  const isMac = /Mac|iPhone|iPad/.test(navigator.userAgentData?.platform || navigator.platform || '');
  const title = el('h2', { class: 'a11y-title', id: 'a11y-title', tabindex: '-1', text: 'Accessibility & display' });
  const body = el('div', { class: 'a11y-body' });
  const panel = el('section', { class: 'a11y-panel', id: 'a11y-panel', 'aria-labelledby': 'a11y-title', hidden: true }, [title, body]);
  btn.closest('.header-actions').append(panel);

  const render = () => {
    const deviceMotion = deviceReducesMotion();
    const themeSet = el('fieldset', { class: 'a11y-group' }, [
      el('legend', { text: 'Colour theme' }),
      radio('a11y-theme', 'system', 'Match my device', themeChoice() === 'system', () => setTheme('system')),
      radio('a11y-theme', 'light', 'Light', themeChoice() === 'light', () => setTheme('light')),
      radio('a11y-theme', 'dark', 'Dark', themeChoice() === 'dark', () => setTheme('dark')),
    ]);
    const motion = checkbox('a11y-motion', 'Reduce animations',
      deviceMotion ? 'Already on, because your device is set to reduce motion.' : 'Stops the moving circuit board, typing text and other animations.',
      deviceMotion || root.classList.contains('reduce-motion'), (e) => setReduceMotion(e.target.checked), { disabled: deviceMotion });
    const easy = checkbox('a11y-easy', 'Easier reading', 'A clearer font, more spacing between lines and words, and underlined links.',
      root.classList.contains('easy-read'), (e) => setEasyReading(e.target.checked));
    const speech = speechSupported()
      ? el('div', { class: 'a11y-group a11y-speech' }, [
        el('button', {
          class: 'btn btn-ghost btn-sm', type: 'button', 'data-a11y-read': '',
          onclick: () => { closePanel(false); if (!startReading({ opener: btn, focusPlayer: true })) btn.focus(); },
        }, [svgIcon('volume'), 'Read this page aloud']),
        el('p', { class: 'a11y-hint', text: 'Uses your device\'s own voice. Select some text first to hear just that part. Screen reader users won\'t need this.' }),
      ])
      : el('p', { class: 'a11y-hint', text: 'Read-aloud isn\'t available in this browser. The site also works with screen readers such as NVDA, JAWS, VoiceOver and Narrator.' });
    clear(body).append(
      themeSet,
      el('div', { class: 'a11y-group' }, [motion, easy]),
      speech,
      el('p', { class: 'a11y-hint' }, [`Text size: use your browser zoom (${isMac ? '⌘' : 'Ctrl'} and + or −). Pages reflow up to 400%.`]),
      el('div', { class: 'a11y-actions' }, [
        el('button', {
          class: 'btn btn-ghost btn-sm', type: 'button', text: 'Reset to my device settings',
          onclick: () => { setTheme('system'); setReduceMotion(false); setEasyReading(false); render(); body.querySelector('input')?.focus(); },
        }),
        el('a', { class: 'text-link', href: url('accessibility.html'), text: 'About accessibility on this site' }),
      ]),
    );
  };

  function openPanel() {
    render();
    panel.hidden = false;
    btn.setAttribute('aria-expanded', 'true');
    (panel.querySelector('input:checked') || title).focus();
  }
  function closePanel(returnFocus = true) {
    if (panel.hidden) return;
    panel.hidden = true;
    btn.setAttribute('aria-expanded', 'false');
    if (returnFocus) btn.focus();
  }
  btn.addEventListener('click', () => (panel.hidden ? openPanel() : closePanel()));
  panel.addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.stopPropagation(); closePanel(); } });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !panel.hidden) closePanel(); });
  document.addEventListener('click', (e) => { if (!panel.hidden && !panel.contains(e.target) && !btn.contains(e.target)) closePanel(false); });
  // Close when keyboard focus leaves the panel, so it never covers what you're on.
  panel.addEventListener('focusout', (e) => {
    if (e.relatedTarget && !panel.contains(e.relatedTarget) && e.relatedTarget !== btn) closePanel(false);
  });
  document.addEventListener('themechange', () => { if (!panel.hidden && !panel.contains(document.activeElement)) render(); });
  onMotionChange(() => { if (!panel.hidden && !panel.contains(document.activeElement)) render(); });
}

/* ---------- Read aloud buttons on content pages ---------- */
function initListen() {
  const buttons = [...document.querySelectorAll('[data-listen]')];
  if (!buttons.length || !speechSupported()) return;
  buttons.forEach((b) => {
    b.closest('[data-listen-row]')?.removeAttribute('hidden');
    b.addEventListener('click', () => {
      if (readingStatus() === 'idle') startReading({ opener: b }); else toggleReading();
    });
  });
  const sync = () => {
    const s = readingStatus();
    buttons.forEach((b) => {
      const label = b.querySelector('[data-listen-label]');
      if (label) label.textContent = s === 'playing' ? 'Pause reading' : s === 'paused' ? 'Resume reading' : 'Listen to this page';
    });
  };
  document.addEventListener('ttsstate', sync);
  document.addEventListener('ttserror', () => {
    buttons.forEach((b) => {
      const label = b.querySelector('[data-listen-label]');
      if (label) label.textContent = 'Read-aloud isn\'t working on this device';
    });
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
    ? el('ul', { class: 'card-highlights', 'aria-label': 'Highlights' }, p.highlights.map((h) => el('li', {}, [h.icon ? el('span', { 'aria-hidden': 'true', text: `${h.icon} ` }) : null, h.text])))
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
  let frame = 0;
  card.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse' || prefersReducedMotion()) { card.style.transform = ''; return; }
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
  const list = el('div', { class: 'palette-list', id: 'palette-list', role: 'listbox', 'aria-label': 'Results' });
  const empty = el('p', { class: 'palette-empty', hidden: true, text: 'No matches. Try another word.' });
  const live = el('p', { class: 'sr-only', 'aria-live': 'polite', 'aria-atomic': 'true' });
  const dialog = el('dialog', { class: 'palette', 'aria-label': 'Search projects and pages' }, [
    el('div', { class: 'palette-head' }, [svgIcon('search'), input, el('kbd', { class: 'kbd', 'aria-hidden': 'true', text: 'Esc' })]),
    list,
    empty,
    live,
    el('div', { class: 'palette-foot', 'aria-hidden': 'true' }, [el('span', { text: '↑ ↓ to move' }), el('span', { text: 'Enter to open' }), el('span', { text: 'Esc to close' })]),
  ]);
  document.body.append(dialog);

  let items = [];
  let active = 0;
  let projects = [];
  let announceTimer = 0;
  const announce = (text) => { clearTimeout(announceTimer); announceTimer = setTimeout(() => { live.textContent = text; }, 450); };
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
    empty.hidden = items.length > 0;
    list.hidden = !items.length;
    if (q) announce(items.length ? `${items.length} result${items.length === 1 ? '' : 's'}` : 'No matches');
    if (!items.length) {
      input.removeAttribute('aria-activedescendant');
      input.setAttribute('aria-expanded', 'false');
      return;
    }
    input.setAttribute('aria-expanded', 'true');
    const groups = [['Projects', projItems], ['Pages', pageItems]];
    let i = 0;
    for (const [name, group] of groups) {
      if (!group.length) continue;
      // The visible group heading is decorative; the group itself carries the name.
      const options = el('div', { role: 'group', 'aria-label': name });
      list.append(el('div', { class: 'palette-group', 'aria-hidden': 'true', text: name }), options);
      for (const item of group) {
        const idx = i++;
        options.append(el('div', {
          class: 'palette-option', role: 'option', id: `palette-opt-${idx}`, 'aria-selected': String(idx === active),
          onmousemove: () => { if (active !== idx) { active = idx; highlight(); } },
          onclick: () => go(idx),
        }, [
          item.type ? el('span', { class: 'chip-dot', 'data-type': typeKey(item.type), 'aria-hidden': 'true' }) : svgIcon('arrow'),
          el('span', { class: 'palette-option-title', text: item.title }),
          el('span', { class: 'sr-only', text: ', ' }),
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
    else if (e.key === 'Home' && e.ctrlKey) { e.preventDefault(); active = 0; highlight(); }
    else if (e.key === 'End' && e.ctrlKey) { e.preventDefault(); active = Math.max(items.length - 1, 0); highlight(); }
    else if (e.key === 'Enter') { e.preventDefault(); go(active); }
    // One press of Esc always closes (a search box would otherwise just clear itself first).
    else if (e.key === 'Escape') { e.preventDefault(); dialog.close(); }
  });
  dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); });
  render();
  return { dialog, input, render };
}

let paletteOpener = null;
export function openPalette() {
  palette ||= buildPalette();
  paletteOpener = document.activeElement;
  palette.input.value = '';
  palette.render();
  palette.dialog.showModal();
  palette.input.focus();
  palette.dialog.addEventListener('close', () => { if (paletteOpener?.isConnected) paletteOpener.focus(); }, { once: true });
}

function initPalette() {
  const isMac = /Mac|iPhone|iPad/.test(navigator.userAgentData?.platform || navigator.platform || '');
  document.querySelectorAll('[data-kbd]').forEach((k) => { k.textContent = isMac ? '⌘K' : 'Ctrl K'; });
  document.querySelectorAll('[data-palette-open]').forEach((b) => b.addEventListener('click', openPalette));
  // Ctrl/Cmd + K is the only keyboard shortcut. It always uses a modifier key, so
  // it can't be set off by speech input or a stray key press. There are no
  // single-key shortcuts that would clash with browser or screen reader keys.
  document.addEventListener('keydown', (e) => {
    if ((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey) && !e.altKey && !e.shiftKey) {
      e.preventDefault();
      if (palette?.dialog.open) palette.dialog.close(); else openPalette();
    }
  });
}

function initYear() {
  const y = String(new Date().getFullYear());
  document.querySelectorAll('[data-year]').forEach((n) => { n.textContent = y; });
}

initHeader();
initTheme();
initA11yPanel();
initListen();
initPalette();
initYear();
document.querySelectorAll('[data-reveal]').forEach(reveal);
