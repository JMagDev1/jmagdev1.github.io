// Project page enhancements: gallery with full-screen lightbox (keyboard,
// swipe), plus previous/next and related projects from the live data file.

import { loadData, projectCard, projectUrl, url } from './site.js';
import { el, svgIcon, clear } from './lib/dom.js';
import { safeAssetPath, dateLabel } from './lib/util.js';

function initGallery() {
  const gallery = document.querySelector('[data-gallery]');
  if (!gallery) return;
  let items = [];
  try { items = JSON.parse(gallery.querySelector('[data-gallery-items]')?.textContent || '[]'); } catch { items = []; }
  items = items.filter((m) => safeAssetPath(m.src));
  if (!items.length) return;

  const slot = gallery.querySelector('[data-gallery-slot]');
  const count = gallery.querySelector('[data-gallery-count]');
  const thumbs = [...gallery.querySelectorAll('.thumb')];
  let index = 0;

  const mediaEl = (m, cls) => (m.type === 'video'
    ? el('video', { class: cls, controls: true, preload: 'metadata', playsinline: true, poster: m.poster ? url(m.poster) : null }, [el('source', { src: url(m.src), type: 'video/mp4' })])
    : el('img', { class: cls, src: url(m.src), alt: m.alt || '', decoding: 'async', width: m.w || null, height: m.h || null }));

  // Images sit inside a button that opens the lightbox; videos keep their own controls.
  const stageFor = (m) => (m.type === 'video'
    ? mediaEl(m, 'gallery-media')
    : el('button', { class: 'gallery-zoom', type: 'button', 'aria-label': 'Open full-screen gallery', onclick: () => openLightbox(index) }, [mediaEl(m, 'gallery-media')]));

  function show(i, { focus = false } = {}) {
    index = (i + items.length) % items.length;
    clear(slot).append(stageFor(items[index]));
    thumbs.forEach((t, k) => t.classList.toggle('is-active', k === index));
    if (count) count.textContent = `${index + 1} / ${items.length}`;
    if (focus) slot.firstElementChild?.focus();
  }

  thumbs.forEach((t, k) => t.addEventListener('click', (e) => { e.preventDefault(); show(k); }));
  slot.querySelector('[data-gallery-open]')?.addEventListener('click', () => openLightbox(index));

  // ---- Lightbox ----
  let dialog; let stage; let caption; let pos;
  function build() {
    stage = el('div', { class: 'lightbox-stage' });
    caption = el('p', { class: 'lightbox-caption' });
    pos = el('span');
    const prev = el('button', { class: 'icon-btn lightbox-nav lightbox-prev', type: 'button', 'aria-label': 'Previous image', onclick: () => step(-1) }, [svgIcon('prev')]);
    const next = el('button', { class: 'icon-btn lightbox-nav lightbox-next', type: 'button', 'aria-label': 'Next image', onclick: () => step(1) }, [svgIcon('next')]);
    dialog = el('dialog', { class: 'lightbox', 'aria-label': 'Image viewer' }, [
      el('div', { class: 'lightbox-top' }, [pos, el('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Close', onclick: () => dialog.close() }, [svgIcon('close')])]),
      el('div', { class: 'lightbox-body' }, [stage, items.length > 1 ? prev : null, items.length > 1 ? next : null]),
      caption,
    ]);
    document.body.append(dialog);
    dialog.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') { e.preventDefault(); step(1); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1); }
    });
    dialog.addEventListener('click', (e) => { if (e.target === dialog || e.target === stage) dialog.close(); });
    dialog.addEventListener('close', () => { stage.querySelector('video')?.pause(); show(index, { focus: true }); });
    let startX = null;
    stage.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'mouse') startX = e.clientX; });
    stage.addEventListener('pointerup', (e) => {
      if (startX == null) return;
      const dx = e.clientX - startX; startX = null;
      if (Math.abs(dx) > 50) step(dx < 0 ? 1 : -1);
    });
  }
  function paint() {
    const m = items[index];
    clear(stage).append(mediaEl(m, ''));
    caption.textContent = m.alt || '';
    pos.textContent = `${index + 1} / ${items.length}`;
  }
  function step(d) { index = (index + d + items.length) % items.length; paint(); }
  function openLightbox(i) {
    if (!dialog) build();
    index = i;
    paint();
    dialog.showModal();
  }
}

async function initPager() {
  const slug = document.documentElement.dataset.slug;
  const pager = document.querySelector('[data-pager]');
  const related = document.querySelector('[data-related]');
  if (!slug || !pager) return;
  let projects;
  try { ({ projects } = await loadData()); } catch { return; }
  const i = projects.findIndex((p) => p.slug === slug);
  if (i === -1) return;
  const me = projects[i];
  const newer = projects[i - 1];
  const older = projects[i + 1];
  const link = (p, dir) => el('a', { class: `pager-link pager-link--${dir}`, href: projectUrl(p) }, [
    el('small', {}, dir === 'prev' ? [svgIcon('back'), 'Newer project'] : ['Older project', svgIcon('arrow')]),
    el('strong', { text: p.title }),
    el('small', { text: dateLabel(p) }),
  ]);
  clear(pager);
  pager.append(newer ? link(newer, 'prev') : el('span'), older ? link(older, 'next') : el('span'));
  pager.hidden = !newer && !older;

  const same = projects.filter((p) => p.slug !== slug && p.type === me.type).slice(0, 3);
  if (related && same.length) {
    const grid = related.querySelector('[data-related-grid]');
    clear(grid).append(...same.map((p) => projectCard(p)));
    related.hidden = false;
  }
}

initGallery();
initPager();
