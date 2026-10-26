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
  const desc = gallery.querySelector('[data-gallery-desc]');
  const live = gallery.querySelector('[data-gallery-live]');
  const thumbs = [...gallery.querySelectorAll('.thumb')];
  let index = 0;
  const kind = (m) => (m.type === 'video' ? 'Video' : 'Image');
  const position = (i) => `${kind(items[i])} ${i + 1} of ${items.length}`;

  const mediaEl = (m, cls, extra = {}) => (m.type === 'video'
    ? el('video', { class: cls, controls: true, preload: 'metadata', playsinline: true, poster: m.poster ? url(m.poster) : null, ...extra }, [el('source', { src: url(m.src), type: 'video/mp4' })])
    : el('img', { class: cls, src: url(m.src), alt: m.alt || '', decoding: 'async', width: m.w || null, height: m.h || null }));

  // Images sit inside a button that opens the lightbox (its name is the image's
  // own description); videos keep their own controls and a written description.
  const stageFor = (m) => (m.type === 'video'
    ? mediaEl(m, 'gallery-media', { 'aria-describedby': 'gallery-desc' })
    : el('button', { class: 'gallery-zoom', type: 'button', onclick: () => openLightbox(index) }, [
      mediaEl(m, 'gallery-media'), el('span', { class: 'sr-only', text: ' (open full screen)' })]));

  function show(i, { focus = false, announce = false } = {}) {
    index = (i + items.length) % items.length;
    const m = items[index];
    clear(slot).append(stageFor(m));
    thumbs.forEach((t, k) => {
      t.classList.toggle('is-active', k === index);
      if (k === index) t.setAttribute('aria-current', 'true'); else t.removeAttribute('aria-current');
    });
    if (count) {
      count.querySelector('[aria-hidden]').textContent = `${index + 1} / ${items.length}`;
      count.querySelector('.sr-only').textContent = position(index);
    }
    if (desc) {
      desc.hidden = m.type !== 'video';
      clear(desc);
      if (m.type === 'video') desc.append(el('strong', { text: 'Video, no sound:' }), ` ${m.alt || ''}`);
    }
    if (announce && live) live.textContent = `Showing ${position(index).toLowerCase()}${m.alt ? `: ${m.alt}` : ''}`;
    if (focus) slot.firstElementChild?.focus();
  }

  thumbs.forEach((t, k) => t.addEventListener('click', (e) => { e.preventDefault(); show(k, { announce: true }); }));
  slot.querySelector('[data-gallery-open]')?.addEventListener('click', () => openLightbox(index));

  // ---- Lightbox ----
  let dialog; let stage; let caption; let pos; let lbLive;
  function build() {
    stage = el('div', { class: 'lightbox-stage' });
    caption = el('p', { class: 'lightbox-caption', id: 'lightbox-caption' });
    pos = el('span', { 'aria-hidden': 'true' });
    lbLive = el('p', { class: 'sr-only', 'aria-live': 'polite', 'aria-atomic': 'true' });
    const prev = el('button', { class: 'icon-btn lightbox-nav lightbox-prev', type: 'button', 'aria-label': 'Previous image', onclick: () => step(-1) }, [svgIcon('prev')]);
    const next = el('button', { class: 'icon-btn lightbox-nav lightbox-next', type: 'button', 'aria-label': 'Next image', onclick: () => step(1) }, [svgIcon('next')]);
    dialog = el('dialog', { class: 'lightbox', 'aria-label': 'Image viewer' }, [
      el('div', { class: 'lightbox-top' }, [pos, el('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Close image viewer', onclick: () => dialog.close() }, [svgIcon('close')])]),
      el('div', { class: 'lightbox-body' }, [stage, items.length > 1 ? prev : null, items.length > 1 ? next : null]),
      caption,
      items.length > 1 ? el('p', { class: 'sr-only', text: 'Use the left and right arrow keys to move between images.' }) : null,
      lbLive,
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
  function paint({ announce = false } = {}) {
    const m = items[index];
    clear(stage).append(mediaEl(m, '', m.type === 'video' ? { 'aria-describedby': 'lightbox-caption' } : {}));
    caption.textContent = m.alt || '';
    pos.textContent = `${index + 1} / ${items.length}`;
    if (announce) announceLb();
  }
  function announceLb() {
    const m = items[index];
    lbLive.textContent = `${position(index)}${m.alt ? `: ${m.alt}` : ''}`;
  }
  function step(d) { index = (index + d + items.length) % items.length; paint({ announce: true }); }
  function openLightbox(i) {
    if (!dialog) build();
    index = i;
    paint();
    dialog.showModal();
    // Say which image is showing (focus starts on the Close button).
    setTimeout(announceLb, 60);
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
