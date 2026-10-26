// Read-aloud: reads the page (or the text you've selected) using the
// browser's built-in speech synthesis. It is strictly opt-in: nothing is
// spoken until a "Listen" button is pressed. It uses the device's own default
// voice and speed, and only changes the speed if the visitor picks one here.
// Screen reader users don't need it; it never moves their focus or announces
// anything on its own.

import { el, svgIcon, prefersReducedMotion } from './dom.js';

export const speechSupported = () => typeof window !== 'undefined'
  && 'speechSynthesis' in window && typeof window.SpeechSynthesisUtterance === 'function';

const BLOCK = 'h1,h2,h3,h4,h5,h6,p,li,dl > dt,dl > dd,dl > div,figcaption,blockquote,caption,tr';
const SKIP = [
  'script', 'style', 'noscript', 'template', 'svg', 'canvas', 'nav', 'form', 'dialog', 'button:not(.gallery-zoom)', 'select', 'input',
  'textarea', 'label', '[role="search"]', '[aria-hidden="true"]', '[hidden]', '.tts-skip', '.tooltip', '.timeline-wrap',
  '.gallery-thumbs', '.gallery-count', '.chip-row', '.view-switch', '.tts-player', '.a11y-panel', '.listen-row',
].join(',');
const MAX_CHUNK = 220;

const isShown = (node) => node.getClientRects().length > 0 && getComputedStyle(node).visibility !== 'hidden';

/** Text of `node`, leaving out hidden parts and nested blocks (they're read separately). */
function ownText(node) {
  let out = '';
  for (const child of node.childNodes) {
    if (child.nodeType === Node.TEXT_NODE) out += child.nodeValue;
    else if (child.nodeType === Node.ELEMENT_NODE) {
      if (child.matches(SKIP) || child.matches(BLOCK) || child.tagName === 'IMG') continue;
      if (child.tagName === 'BR') { out += ' '; continue; }
      if (child.tagName === 'DT') { out += `${ownText(child)}: `; continue; }
      if (child.matches('td, th')) { out += ` ${ownText(child)},`; continue; }
      out += ownText(child);
    }
  }
  return out.replace(/\s+/g, ' ').replace(/\s+([,.;:!?])/g, '$1').replace(/,\s*$/, '').trim();
}

/** Break long text into sentence-sized pieces (some browsers cut off long utterances). */
export function splitText(text) {
  const parts = [];
  const sentences = text.match(/[^.!?]+(?:[.!?]+["')\]]*|$)\s*/g) || [text];
  let buf = '';
  for (const s of sentences) {
    if ((buf + s).length > MAX_CHUNK && buf) { parts.push(buf.trim()); buf = ''; }
    if (s.length > MAX_CHUNK) {
      for (const piece of s.split(/(?<=[,;:])\s+/)) {
        if ((buf + piece).length > MAX_CHUNK && buf) { parts.push(buf.trim()); buf = ''; }
        buf += `${piece} `;
      }
    } else buf += s;
  }
  if (buf.trim()) parts.push(buf.trim());
  return parts.filter((p) => /[\p{L}\p{N}]/u.test(p));
}

/** Everything worth reading in `root`, in reading order, as [{ node, text }]. */
export function collectChunks(root) {
  const chunks = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT, {
    acceptNode: (n) => (n.matches(SKIP) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT),
  });
  for (let n = walker.currentNode; n; n = walker.nextNode()) {
    if (n === root) continue;
    if (n.tagName === 'IMG') {
      const alt = (n.getAttribute('alt') || '').trim();
      if (alt && isShown(n)) chunks.push({ node: n.closest('figure, .gallery-zoom, .spotlight-media') || n, text: `Image: ${alt}` });
      continue;
    }
    if (!n.matches(BLOCK) || !isShown(n)) continue;
    const text = ownText(n);
    if (text) for (const t of splitText(text)) chunks.push({ node: n, text: t });
  }
  return chunks;
}

/* ---------- Player ---------- */
let player;
const state = { queue: [], index: 0, status: 'idle', utter: null, current: null, token: 0 };

function savedRate() {
  try { const r = Number(localStorage.getItem('ttsRate')); return r >= 0.5 && r <= 2 ? r : 0; } catch { return 0; }
}

function buildPlayer() {
  const status = el('span', { class: 'tts-status' });
  const btn = (label, iconName, onclick, cls = '') => el('button', { class: `icon-btn ${cls}`, type: 'button', 'aria-label': label, onclick }, [svgIcon(iconName)]);
  const toggle = btn('Pause reading', 'pause', () => toggleReading(), 'tts-toggle');
  const rate = el('select', { class: 'select tts-rate', 'aria-label': 'Reading speed' }, [
    el('option', { value: '', text: 'Normal speed' }),
    ...[0.75, 1.25, 1.5].map((r) => el('option', { value: String(r), text: `${r}×` })),
  ]);
  rate.value = savedRate() ? String(savedRate()) : '';
  rate.addEventListener('change', () => {
    try { if (rate.value) localStorage.setItem('ttsRate', rate.value); else localStorage.removeItem('ttsRate'); } catch { /* ignore */ }
    if (state.status === 'playing') speakCurrent();
  });
  const node = el('div', { class: 'tts-player', role: 'region', 'aria-label': 'Read aloud controls', hidden: true }, [
    el('span', { class: 'tts-icon', 'aria-hidden': 'true' }, [svgIcon('volume')]),
    status,
    el('div', { class: 'tts-buttons' }, [
      btn('Previous paragraph', 'skipback', () => jump(-1)),
      toggle,
      btn('Next paragraph', 'skipfwd', () => jump(1)),
      rate,
      btn('Stop reading', 'close', () => stopReading({ returnFocus: true })),
    ]),
  ]);
  document.body.append(node);
  window.addEventListener('pagehide', () => window.speechSynthesis.cancel());
  return { node, status, toggle };
}

function emit() {
  document.dispatchEvent(new CustomEvent('ttsstate', { detail: { status: state.status } }));
  if (!player) return;
  const { toggle, status } = player;
  const playing = state.status === 'playing';
  toggle.setAttribute('aria-label', playing ? 'Pause reading' : 'Resume reading');
  toggle.replaceChildren(svgIcon(playing ? 'pause' : 'play'));
  status.textContent = state.status === 'idle' ? '' : `${playing ? 'Reading' : 'Paused'} · ${state.index + 1} of ${state.queue.length}`;
  player.node.hidden = state.status === 'idle';
  document.documentElement.classList.toggle('tts-open', state.status !== 'idle');
}

function mark(node) {
  state.current?.classList.remove('tts-current');
  state.current = node || null;
  if (!node || !node.isConnected) return;
  node.classList.add('tts-current');
  const r = node.getBoundingClientRect();
  const bottom = window.innerHeight - (player?.node.offsetHeight || 0) - 16;
  if (r.top < 80 || r.bottom > bottom) node.scrollIntoView({ block: 'center', behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
}

function speakCurrent() {
  const synth = window.speechSynthesis;
  const token = ++state.token;
  synth.cancel();
  const item = state.queue[state.index];
  if (!item) { stopReading(); return; }
  mark(item.node);
  const u = new SpeechSynthesisUtterance(item.text);
  u.lang = document.documentElement.lang || 'en-GB';
  const rate = savedRate();
  if (rate) u.rate = rate; // otherwise the device's default speed is used
  u.onend = () => {
    if (token !== state.token || state.status !== 'playing') return;
    if (state.index < state.queue.length - 1) { state.index += 1; speakCurrent(); emit(); } else stopReading();
  };
  u.onerror = (e) => {
    if (token !== state.token || e.error === 'interrupted' || e.error === 'canceled') return;
    stopReading();
    document.dispatchEvent(new CustomEvent('ttserror', { detail: { error: e.error } }));
  };
  state.utter = u;
  // Some browsers drop an utterance queued in the same tick as cancel().
  setTimeout(() => { if (token === state.token) synth.speak(u); }, 30);
}

function jump(d) {
  if (state.status === 'idle') return;
  state.index = Math.min(Math.max(0, state.index + d), state.queue.length - 1);
  state.status = 'playing';
  speakCurrent();
  emit();
}

export function toggleReading() {
  const synth = window.speechSynthesis;
  if (state.status === 'playing') {
    state.status = 'paused';
    state.token += 1; // ignore the cancelled utterance's events
    synth.cancel(); // pause() is unreliable in some browsers; resume restarts the sentence
  } else if (state.status === 'paused') {
    state.status = 'playing';
    speakCurrent();
  }
  emit();
}

export function stopReading({ returnFocus = false } = {}) {
  state.token += 1;
  window.speechSynthesis?.cancel();
  const wasOpen = state.status !== 'idle';
  state.status = 'idle';
  mark(null);
  emit();
  if (returnFocus && wasOpen) (state.opener?.isConnected ? state.opener : document.getElementById('main'))?.focus();
}

/**
 * Start reading. Reads the visitor's text selection if there is one,
 * otherwise everything in <main>.
 * @param {{ opener?: HTMLElement, focusPlayer?: boolean }} opts
 */
export function startReading({ opener = null, focusPlayer = false } = {}) {
  if (!speechSupported()) return false;
  const main = document.getElementById('main') || document.body;
  const sel = window.getSelection?.();
  const selected = sel && !sel.isCollapsed ? sel.toString().trim() : '';
  const queue = selected.length > 1
    ? splitText(selected.replace(/\s+/g, ' ')).map((text) => ({ node: null, text }))
    : collectChunks(main);
  if (!queue.length) return false;
  player ||= buildPlayer();
  Object.assign(state, { queue, index: 0, status: 'playing', opener });
  speakCurrent();
  emit();
  if (focusPlayer) player.toggle.focus();
  return true;
}

export const readingStatus = () => state.status;
