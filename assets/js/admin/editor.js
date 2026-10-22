// Project editor form with a live, sandboxed preview of the real page.

import {
  STATUSES, LIMITS, slugify, isValidSlug, dateLabel, safeUrl, escapeHtml,
} from '../lib/util.js';
import { normalizeProject } from '../lib/schema.js';
import { renderProjectPage } from '../lib/template.js';
import { el, svgIcon, clear, debounce } from '../lib/dom.js';
import { processImage } from './images.js';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const NEW_TYPE = '__new__';
let seq = 0;

function blank() {
  const y = String(new Date().getFullYear());
  return {
    slug: '', title: '', type: 'Coding', badge: '', tech: [], start: y, end: y, ongoing: false, dateLabel: '',
    status: 'in-progress', featured: false, order: 0, summary: '', highlights: [], about: '', features: [],
    challenges: '', learned: '', sections: [], milestones: [], media: [], links: [],
  };
}

export function buildEditor(opts) {
  const {
    form, errorsBox, titleEl, preview, project, published, types, otherSlugs, assetVersion,
    registerFile, fileUrl, onSave, onDelete, onCancel,
  } = opts;
  const isNew = !project;
  const d = project ? { ...blank(), ...project } : blank();
  d.highlights = [...(d.highlights || [])];
  while (d.highlights.length < 4) d.highlights.push({ icon: '', text: '' });
  d.media = (d.media || []).map((m) => ({ ...m }));
  let slugTouched = !isNew;
  const snapshot = () => JSON.stringify({ ...d, media: d.media.map((m) => ({ ...m, enc: undefined })) });
  const initial = snapshot();

  clear(form);
  clear(errorsBox);
  errorsBox.hidden = true;
  titleEl.textContent = isNew ? 'New project' : `Edit: ${d.title}`;

  /* ---------- Small field builders ---------- */
  const uid = (name) => `f-${name}-${++seq}`;
  const field = (label, control, hint) => {
    const id = control.id || uid('x');
    control.id = id;
    const hintEl = hint ? el('small', { class: 'hint', id: `${id}-hint`, text: hint }) : null;
    if (hintEl) control.setAttribute('aria-describedby', hintEl.id);
    return el('div', { class: 'field' }, [el('label', { for: id, text: label }), control, hintEl]);
  };
  const input = (props) => el('input', { class: 'input', type: 'text', autocomplete: 'off', ...props });
  const textarea = (props) => el('textarea', { class: 'input textarea', rows: 4, ...props });
  const select = (options, value, props = {}) => {
    const s = el('select', { class: 'select', ...props }, options.map(([v, t]) => el('option', { value: v, text: t })));
    s.value = value;
    return s;
  };
  const fieldset = (legend, children, hint) => el('fieldset', { class: 'fieldset' }, [el('legend', { text: legend }), hint ? el('p', { class: 'hint', text: hint }) : null, ...children]);
  const onInput = (node, fn) => { node.addEventListener('input', () => { fn(node); changed(); }); node.addEventListener('change', () => { fn(node); changed(); }); return node; };

  /* ---------- Basics ---------- */
  const title = onInput(input({ maxlength: LIMITS.title, required: true, value: d.title }), (n) => {
    d.title = n.value;
    if (!slugTouched) { d.slug = slugify(n.value); slug.value = d.slug; checkSlug(); }
  });
  const slug = onInput(input({ maxlength: 60, value: d.slug, spellcheck: 'false', pattern: '[a-z0-9]+(-[a-z0-9]+)*', readonly: published || null }), (n) => {
    slugTouched = true;
    d.slug = n.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
    if (n.value !== d.slug) n.value = d.slug;
    checkSlug();
  });
  const slugMsg = el('small', { class: 'field-msg', 'aria-live': 'polite' });
  function checkSlug() {
    let msg = '';
    if (d.slug && !isValidSlug(d.slug)) msg = 'Use lowercase letters, numbers and single hyphens.';
    else if (otherSlugs.includes(d.slug)) msg = 'Another project already uses this address.';
    slugMsg.textContent = msg;
    slug.setAttribute('aria-invalid', String(Boolean(msg)));
  }
  const slugRow = el('div', { class: 'field' }, [
    el('label', { for: (slug.id = uid('slug')), text: 'Page address' }),
    el('div', { class: 'affix' }, [el('span', { class: 'affix-text', text: 'projects/' }), slug, el('span', { class: 'affix-text', text: '.html' })]),
    el('small', { class: 'hint', text: published ? 'Fixed once published, so existing links keep working.' : 'Filled in from the title. Lowercase letters, numbers and hyphens.' }),
    slugMsg,
  ]);

  const typeOptions = [...types.map((t) => [t, t]), [NEW_TYPE, 'Add a new type…']];
  const type = select(typeOptions, types.includes(d.type) ? d.type : NEW_TYPE);
  const newType = input({ maxlength: 30, placeholder: 'e.g. 3D Printing', value: types.includes(d.type) ? '' : d.type });
  const newTypeRow = field('New type name', newType);
  newTypeRow.hidden = type.value !== NEW_TYPE;
  onInput(type, (n) => { newTypeRow.hidden = n.value !== NEW_TYPE; d.type = n.value === NEW_TYPE ? newType.value.trim() : n.value; });
  onInput(newType, (n) => { d.type = n.value.trim(); });

  const status = onInput(select(Object.entries(STATUSES), d.status), (n) => { d.status = n.value; });
  const tech = onInput(input({ value: (d.tech || []).join(', '), placeholder: 'ESP32, C++, OpenSCAD' }), (n) => { d.tech = n.value.split(',').map((t) => t.trim()).filter(Boolean); });
  const badge = onInput(input({ maxlength: 30, value: d.badge || '', placeholder: 'Defaults to the first technology' }), (n) => { d.badge = n.value; });
  const featured = el('input', { type: 'checkbox', id: uid('featured') });
  featured.checked = Boolean(d.featured);
  const order = onInput(input({ type: 'number', min: '0', max: '999', value: String(d.order ?? 0), inputmode: 'numeric' }), (n) => { d.order = Number(n.value) || 0; });
  const orderRow = field('Position on the home page', order, '0 shows first.');
  orderRow.hidden = !featured.checked;
  onInput(featured, (n) => { d.featured = n.checked; orderRow.hidden = !n.checked; });

  form.append(fieldset('Basics', [
    field('Title', title),
    slugRow,
    el('div', { class: 'grid-2' }, [field('Type', type), field('Status', status)]),
    newTypeRow,
    field('Languages / technologies', tech, 'Separate with commas. Used by the technology filter.'),
    field('Card label', badge),
    el('div', { class: 'check-row' }, [featured, el('label', { for: featured.id, text: 'Feature this project on the home page' })]),
    orderRow,
  ]));

  /* ---------- Dates ---------- */
  const thisYear = new Date().getFullYear();
  const years = [];
  for (let y = thisYear + 1; y >= 2010; y--) years.push([String(y), String(y)]);
  const monthOpts = [['', 'Month (optional)'], ...MONTHS.map((m, i) => [String(i + 1).padStart(2, '0'), m])];
  const split = (v) => { const m = /^(\d{4})(?:-(\d{2}))?$/.exec(v || ''); return m ? [m[1], m[2] || ''] : [String(thisYear), '']; };
  const [sy, sm] = split(d.start);
  const [ey, em] = split(d.end || d.start);
  const startY = select(years, sy); const startM = select(monthOpts, sm);
  const endY = select(years, ey); const endM = select(monthOpts, em);
  const ongoing = el('input', { type: 'checkbox', id: uid('ongoing') });
  ongoing.checked = Boolean(d.ongoing);
  const label = input({ maxlength: 60, value: d.dateLabel || '' });
  const syncDates = () => {
    d.start = startM.value ? `${startY.value}-${startM.value}` : startY.value;
    d.ongoing = ongoing.checked;
    d.end = d.ongoing ? '' : (endM.value ? `${endY.value}-${endM.value}` : endY.value);
    endY.disabled = d.ongoing; endM.disabled = d.ongoing;
    d.dateLabel = label.value.trim();
    label.placeholder = `Automatic: ${dateLabel({ ...d, dateLabel: '' })}`;
  };
  [startY, startM, endY, endM, ongoing, label].forEach((n) => onInput(n, syncDates));
  syncDates();
  form.append(fieldset('Dates', [
    el('div', { class: 'grid-2' }, [field('Start year', startY), field('Start month', startM)]),
    el('div', { class: 'check-row' }, [ongoing, el('label', { for: ongoing.id, text: 'Still going (no end date yet)' })]),
    el('div', { class: 'grid-2' }, [field('End year', endY), field('End month', endM)]),
    field('Date shown on the site', label, 'Leave blank to use the automatic text.'),
  ], 'Used for sorting, the timeline and the date filter.'));

  /* ---------- Card ---------- */
  const counter = el('small', { class: 'hint counter' });
  const summary = onInput(textarea({ maxlength: LIMITS.summary, rows: 4, value: d.summary }), (n) => { d.summary = n.value; counter.textContent = `${n.value.length} / ${LIMITS.summary}`; });
  summary.value = d.summary;
  counter.textContent = `${d.summary.length} / ${LIMITS.summary}`;
  const hlRows = d.highlights.slice(0, 4).map((h, i) => {
    const ic = onInput(input({ maxlength: 8, value: h.icon || '', placeholder: '🎯', 'aria-label': `Highlight ${i + 1} emoji`, class: 'input input-icon' }), (n) => { d.highlights[i].icon = n.value; });
    const tx = onInput(input({ maxlength: 40, value: h.text || '', placeholder: 'e.g. Voice Control', 'aria-label': `Highlight ${i + 1} text` }), (n) => { d.highlights[i].text = n.value; });
    return el('div', { class: 'hl-row' }, [ic, tx]);
  });
  form.append(fieldset('Card', [
    el('div', { class: 'field' }, [el('label', { for: (summary.id = uid('summary')), text: 'Summary' }), summary, counter]),
    el('div', { class: 'field' }, [el('span', { class: 'field-label', text: 'Highlights (up to 4 short tags)' }), ...hlRows]),
  ], 'Shown on project cards and at the top of the project page.'));

  /* ---------- Page content ---------- */
  const textHint = 'Leave a blank line between paragraphs. Start a line with "- " for a bullet point.';
  const about = onInput(textarea({ rows: 6 }), (n) => { d.about = n.value; }); about.value = d.about || '';
  const features = onInput(textarea({ rows: 5 }), (n) => { d.features = n.value.split('\n').map((s) => s.trim()).filter(Boolean); }); features.value = (d.features || []).join('\n');
  const challenges = onInput(textarea({ rows: 5 }), (n) => { d.challenges = n.value; }); challenges.value = d.challenges || '';
  const learned = onInput(textarea({ rows: 5 }), (n) => { d.learned = n.value; }); learned.value = d.learned || '';
  const sectionsHost = el('div', { class: 'repeater' });
  form.append(fieldset('Page content', [
    field('About This Project', about, textHint),
    field('Key Features', features, 'One feature per line.'),
    field('Challenges & Solutions', challenges),
    field('What I Learned', learned),
    el('div', { class: 'field' }, [el('span', { class: 'field-label', text: 'Extra sections' }), sectionsHost]),
  ], 'Every section is optional. Empty ones are hidden on the page.'));

  /* ---------- Repeaters ---------- */
  function repeater(host, list, { max, make, renderRow, addLabel }) {
    const draw = () => {
      clear(host);
      list.forEach((item, i) => {
        const controls = el('div', { class: 'row-tools' }, [
          el('button', { class: 'icon-btn sm', type: 'button', 'aria-label': 'Move up', disabled: i === 0 || null, onclick: () => { [list[i - 1], list[i]] = [list[i], list[i - 1]]; draw(); changed(); } }, [svgIcon('prev', 'icon rot90')]),
          el('button', { class: 'icon-btn sm', type: 'button', 'aria-label': 'Move down', disabled: i === list.length - 1 || null, onclick: () => { [list[i + 1], list[i]] = [list[i], list[i + 1]]; draw(); changed(); } }, [svgIcon('next', 'icon rot90')]),
          el('button', { class: 'icon-btn sm danger', type: 'button', 'aria-label': 'Remove', onclick: () => { list.splice(i, 1); draw(); changed(); } }, [svgIcon('close')]),
        ]);
        host.append(el('div', { class: 'rep-row' }, [el('div', { class: 'rep-main' }, renderRow(item, i)), controls]));
      });
      if (list.length < max) host.append(el('button', { class: 'btn btn-ghost btn-sm', type: 'button', text: addLabel, onclick: () => { list.push(make()); draw(); changed(); host.querySelector('.rep-row:last-of-type input, .rep-row:last-of-type textarea')?.focus(); } }));
    };
    draw();
  }

  d.sections = (d.sections || []).map((s) => ({ ...s }));
  repeater(sectionsHost, d.sections, {
    max: LIMITS.sections, addLabel: '+ Add a section', make: () => ({ heading: '', body: '' }),
    renderRow: (s) => [
      onInput(input({ maxlength: 80, value: s.heading, placeholder: 'Heading', 'aria-label': 'Section heading' }), (n) => { s.heading = n.value; }),
      (() => { const t = onInput(textarea({ rows: 3, placeholder: 'Text', 'aria-label': 'Section text' }), (n) => { s.body = n.value; }); t.value = s.body; return t; })(),
    ],
  });

  d.milestones = (d.milestones || []).map((m) => ({ ...m }));
  const msHost = el('div', { class: 'repeater' });
  repeater(msHost, d.milestones, {
    max: LIMITS.milestones, addLabel: '+ Add a milestone', make: () => ({ label: '', done: false }),
    renderRow: (m, i) => {
      const cb = el('input', { type: 'checkbox', 'aria-label': `Milestone ${i + 1} done` });
      cb.checked = Boolean(m.done);
      onInput(cb, (n) => { m.done = n.checked; });
      return [el('div', { class: 'ms-row' }, [cb, onInput(input({ maxlength: 120, value: m.label, placeholder: 'e.g. PCB designed and ordered', 'aria-label': `Milestone ${i + 1}` }), (n) => { m.label = n.value; })])];
    },
  });
  form.append(fieldset('Build progress', [msHost], 'Optional checklist with a progress ring, great for projects that are still in progress. Tick the ones that are done.'));

  /* ---------- Images ---------- */
  const mediaHost = el('div', { class: 'media-list' });
  const fileInput = el('input', { type: 'file', accept: 'image/png,image/jpeg,image/webp,image/gif', multiple: true, class: 'sr-only', id: uid('files') });
  const drop = el('label', { class: 'dropzone', for: fileInput.id }, [
    el('strong', { text: 'Add images' }),
    el('span', { text: 'Click to choose, or drop PNG, JPEG, WebP or GIF files here (max 20 MB each).' }),
  ]);
  const mediaMsg = el('p', { class: 'field-msg', 'aria-live': 'polite' });

  const previewSrc = (m) => (m.enc ? m.url : (fileUrl(m.thumb || m.src) || fileUrl(m.src) || (m.type === 'video' ? (m.poster || '') : (m.thumb || m.src))));
  function drawMedia() {
    clear(mediaHost);
    d.media.forEach((m, i) => {
      const alt = onInput(input({ maxlength: 200, value: m.alt || '', placeholder: 'Describe the image for screen readers', 'aria-label': `Image ${i + 1} description` }), (n) => { m.alt = n.value; });
      const src = previewSrc(m);
      const img = el('img', { alt: '', width: 120, height: 75, loading: 'lazy' });
      if (src) img.src = src;
      mediaHost.append(el('div', { class: 'media-row' }, [
        el('div', { class: 'media-thumb' }, [img, m.type === 'video' ? el('span', { class: 'media-tag', text: 'Video' }) : null, i === 0 ? el('span', { class: 'media-tag', text: 'Cover' }) : null]),
        el('div', { class: 'media-main' }, [alt, m.enc ? el('small', { class: 'hint', text: `New · ${m.enc.large.w}×${m.enc.large.h} · ${(m.enc.large.size / 1024).toFixed(0)} KB after optimising` }) : null]),
        el('div', { class: 'row-tools' }, [
          el('button', { class: 'icon-btn sm', type: 'button', 'aria-label': 'Move up', disabled: i === 0 || null, onclick: () => { [d.media[i - 1], d.media[i]] = [d.media[i], d.media[i - 1]]; drawMedia(); changed(); } }, [svgIcon('prev', 'icon rot90')]),
          el('button', { class: 'icon-btn sm', type: 'button', 'aria-label': 'Move down', disabled: i === d.media.length - 1 || null, onclick: () => { [d.media[i + 1], d.media[i]] = [d.media[i], d.media[i + 1]]; drawMedia(); changed(); } }, [svgIcon('next', 'icon rot90')]),
          el('button', { class: 'icon-btn sm danger', type: 'button', 'aria-label': 'Remove image', onclick: () => { const [gone] = d.media.splice(i, 1); if (gone.enc) { URL.revokeObjectURL(gone.url); URL.revokeObjectURL(gone.largeUrl); } drawMedia(); changed(); } }, [svgIcon('close')]),
        ]),
      ]));
    });
  }
  async function addFiles(files) {
    const list = [...files].slice(0, LIMITS.media - d.media.length);
    if (!list.length) { mediaMsg.textContent = `You can add up to ${LIMITS.media} images.`; return; }
    for (const [k, f] of list.entries()) {
      mediaMsg.textContent = `Optimising image ${k + 1} of ${list.length}…`;
      try {
        const enc = await processImage(f);
        const base = (f.name || 'image').replace(/\.[a-z0-9]+$/i, '').replace(/[-_]+/g, ' ').trim().slice(0, 80);
        d.media.push({ type: 'image', enc, url: URL.createObjectURL(enc.thumb.blob), largeUrl: URL.createObjectURL(enc.large.blob), alt: base, w: enc.large.w, h: enc.large.h, id: `${Date.now().toString(36)}${(++seq).toString(36)}` });
      } catch (err) {
        mediaMsg.textContent = err.message;
        await new Promise((r) => setTimeout(r, 1800));
      }
    }
    mediaMsg.textContent = 'Done. Check each image description; the first image is the cover.';
    drawMedia();
    changed();
  }
  fileInput.addEventListener('change', () => { addFiles(fileInput.files); fileInput.value = ''; });
  drop.addEventListener('dragover', (e) => { e.preventDefault(); drop.classList.add('is-over'); });
  drop.addEventListener('dragleave', () => drop.classList.remove('is-over'));
  drop.addEventListener('drop', (e) => { e.preventDefault(); drop.classList.remove('is-over'); addFiles(e.dataTransfer.files); });
  drawMedia();
  form.append(fieldset('Images', [fileInput, drop, mediaMsg, mediaHost], 'Images are resized and re-saved in your browser before upload. This also removes hidden data such as the GPS location from phone photos. Animated GIFs become still images.'));

  /* ---------- Links ---------- */
  d.links = (d.links || []).map((l) => ({ ...l }));
  const linksHost = el('div', { class: 'repeater' });
  repeater(linksHost, d.links, {
    max: LIMITS.links, addLabel: '+ Add a link', make: () => ({ label: '', url: '' }),
    renderRow: (l, i) => {
      const msg = el('small', { class: 'field-msg' });
      const check = () => { msg.textContent = l.url && !safeUrl(l.url) ? 'Links must start with https:// (or be a page on this site).' : ''; };
      check();
      return [el('div', { class: 'grid-2' }, [
        onInput(input({ maxlength: 60, value: l.label, placeholder: 'Label, e.g. Live demo', 'aria-label': `Link ${i + 1} label` }), (n) => { l.label = n.value; }),
        onInput(input({ type: 'url', maxlength: 2048, value: l.url, placeholder: 'https://…', 'aria-label': `Link ${i + 1} address`, spellcheck: 'false' }), (n) => { l.url = n.value.trim(); check(); }),
      ]), msg];
    },
  });
  form.append(fieldset('Links', [linksHost], 'Live demos, source code, documents. A "Back to all projects" link is always added.'));

  /* ---------- Actions ---------- */
  const saveBtn = el('button', { class: 'btn btn-primary', type: 'submit', text: isNew ? 'Add project' : 'Save changes' });
  form.append(el('div', { class: 'editor-actions' }, [
    !isNew ? el('button', { class: 'btn btn-danger', type: 'button', text: 'Delete project', onclick: () => onDelete() }) : el('span'),
    el('div', { class: 'row-actions' }, [el('button', { class: 'btn btn-ghost', type: 'button', text: 'Cancel', onclick: () => onCancel(snapshot() !== initial) }), saveBtn]),
  ]));
  document.querySelector('[data-editor-back]').onclick = () => onCancel(snapshot() !== initial);

  /* ---------- Save ---------- */
  function raw({ forPreview = false } = {}) {
    const out = { ...d, highlights: d.highlights.filter((h) => h.text.trim()), media: [] };
    const swaps = [];
    for (const m of d.media) {
      if (m.enc) {
        if (forPreview) {
          const p = `assets/__pending__/${m.id}`;
          swaps.push([`../${p}.l`, m.largeUrl], [`../${p}.t`, m.url]);
          out.media.push({ type: 'image', src: `${p}.l`, thumb: `${p}.t`, alt: m.alt || ' ', w: m.w, h: m.h });
        } else out.media.push(m);
      } else {
        out.media.push({ ...m });
        if (forPreview) for (const k of ['src', 'thumb', 'poster']) { const u = m[k] && fileUrl(m[k]); if (u) swaps.push([`../${m[k]}`, u]); }
      }
    }
    return { out, swaps };
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const { out } = raw();
    const finalSlug = out.slug;
    const stamp = Date.now().toString(36);
    let n = 0;
    // Give new images their permanent paths now that the address is known.
    const planned = out.media.map((m) => {
      if (!m.enc) return m;
      n++;
      return { type: 'image', alt: m.alt, w: m.w, h: m.h, src: `assets/projects/${finalSlug}/${stamp}-${n}.${m.enc.large.ext}`, thumb: `assets/projects/${finalSlug}/${stamp}-${n}-thumb.${m.enc.thumb.ext}`, enc: m.enc };
    });
    // otherSlugs never contains this project's own address, so duplicates are always caught.
    const { project, errors } = normalizeProject({ ...out, media: planned.map(({ enc, ...m }) => m) }, { existingSlugs: otherSlugs, isNew: true });
    if (isValidSlug(finalSlug) && !isNew && published && project.slug !== (opts.project?.slug)) errors.push('The page address cannot change after publishing.');
    if (errors.length) {
      clear(errorsBox).append(el('strong', { text: 'Please fix the following:' }), el('ul', {}, [...new Set(errors)].map((x) => el('li', { text: x }))));
      errorsBox.hidden = false;
      errorsBox.focus();
      return;
    }
    for (const m of planned) if (m.enc) { registerFile(m.src, m.enc.large); registerFile(m.thumb, m.enc.thumb); }
    onSave(project);
  });

  /* ---------- Live preview ---------- */
  const renderPreview = debounce(() => {
    const { out, swaps } = raw({ forPreview: true });
    const { project } = normalizeProject({ ...out, slug: isValidSlug(out.slug) ? out.slug : 'preview', title: out.title || 'Untitled project', summary: out.summary || 'Your summary will appear here.', status: out.status || 'completed', type: out.type || 'Coding' });
    let html = renderProjectPage(project, { v: assetVersion });
    html = html.replace(/<meta http-equiv="Content-Security-Policy"[^>]*>\n?/, '');
    html = html.replace(/<script\b[^>]*\bsrc=[^>]*><\/script>\n?/g, '');
    const base = new URL('projects/', window.location.href).href;
    html = html.replace('<head>', `<head>\n<base href="${escapeHtml(base)}" target="_blank">`);
    const theme = document.documentElement.getAttribute('data-theme') || (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
    html = html.replace('<html lang="en-GB"', `<html lang="en-GB" data-theme="${theme}"`);
    for (const [from, to] of swaps) html = html.split(escapeHtml(from)).join(to);
    let y = 0;
    try { y = preview.contentWindow?.scrollY || 0; } catch { /* ignore */ }
    preview.onload = () => { try { preview.contentWindow.scrollTo(0, y); } catch { /* ignore */ } };
    preview.srcdoc = html;
  }, 300);

  function changed() { renderPreview(); }
  checkSlug();
  renderPreview();
  return { isDirty: () => snapshot() !== initial };
}
