// Animated "circuit board" behind the hero. Traces light up near the cursor,
// signal pulses travel along them, and clicking fires a burst of pulses.
// Pauses when off-screen or when the tab is hidden; static if the visitor
// prefers reduced motion.

const GRID = 30;
const DIRS = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]];

export function initCircuit(canvas, { interactiveArea = canvas.parentElement, reduced = false } = {}) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  let W = 0; let H = 0; let dpr = 1;
  let traces = [];
  let pulses = [];
  let colors = {};
  let running = false;
  let visible = true;
  let raf = 0;
  let last = 0;
  const mouse = { x: -1e4, y: -1e4 };

  const rand = (n) => Math.floor(Math.random() * n);

  function readColors() {
    const cs = getComputedStyle(document.documentElement);
    colors = {
      trace: cs.getPropertyValue('--primary').trim() || '#8b93ff',
      signal: cs.getPropertyValue('--signal').trim() || '#22d3ee',
      accent: cs.getPropertyValue('--accent').trim() || '#c084fc',
      light: document.documentElement.getAttribute('data-theme') === 'light'
        || (!document.documentElement.hasAttribute('data-theme') && window.matchMedia('(prefers-color-scheme: light)').matches),
    };
  }

  function build() {
    const rect = canvas.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = Math.max(1, Math.round(rect.width));
    H = Math.max(1, Math.round(rect.height));
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const cols = Math.ceil(W / GRID);
    const rows = Math.ceil(H / GRID);
    const used = new Set();
    const key = (x, y) => `${x},${y}`;
    traces = [];
    const target = Math.round((cols * rows) / 7);
    for (let i = 0; i < target * 3 && traces.length < target; i++) {
      let x = rand(cols); let y = rand(rows);
      if (used.has(key(x, y))) continue;
      let d = rand(8);
      const pts = [[x, y]];
      used.add(key(x, y));
      const len = 3 + rand(9);
      for (let s = 0; s < len; s++) {
        if (Math.random() < 0.28) d = (d + (Math.random() < 0.5 ? 1 : 7)) % 8;
        const nx = x + DIRS[d][0]; const ny = y + DIRS[d][1];
        if (nx < 0 || ny < 0 || nx >= cols || ny >= rows || used.has(key(nx, ny))) break;
        x = nx; y = ny;
        used.add(key(x, y));
        pts.push([x, y]);
      }
      if (pts.length < 3) continue;
      const p = pts.map(([a, b]) => [a * GRID + GRID / 2, b * GRID + GRID / 2]);
      const segs = [];
      let total = 0;
      for (let k = 1; k < p.length; k++) {
        const l = Math.hypot(p[k][0] - p[k - 1][0], p[k][1] - p[k - 1][1]);
        segs.push(l); total += l;
      }
      traces.push({ p, segs, total, glow: 0, mid: p[Math.floor(p.length / 2)] });
    }
    pulses = [];
  }

  function pointAt(tr, dist) {
    let d = dist;
    for (let k = 0; k < tr.segs.length; k++) {
      if (d <= tr.segs[k]) {
        const t = d / tr.segs[k];
        return [tr.p[k][0] + (tr.p[k + 1][0] - tr.p[k][0]) * t, tr.p[k][1] + (tr.p[k + 1][1] - tr.p[k][1]) * t];
      }
      d -= tr.segs[k];
    }
    return tr.p[tr.p.length - 1];
  }

  function spawn(tr, color) {
    if (pulses.length > 90) return;
    const forward = Math.random() < 0.5;
    pulses.push({ tr, d: forward ? 0 : tr.total, dir: forward ? 1 : -1, speed: 70 + Math.random() * 90, color: color || colors.signal });
  }

  function near(tr, x, y, r) {
    const [a, b] = tr.p[0]; const [c, d] = tr.p[tr.p.length - 1]; const [m, n] = tr.mid;
    return Math.hypot(a - x, b - y) < r || Math.hypot(c - x, d - y) < r || Math.hypot(m - x, n - y) < r;
  }

  function draw(dt) {
    ctx.clearRect(0, 0, W, H);
    const base = colors.light ? 0.16 : 0.2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (const tr of traces) {
      const hot = near(tr, mouse.x, mouse.y, 130) ? 1 : 0;
      tr.glow += (hot - tr.glow) * Math.min(1, dt * 6);
      ctx.globalAlpha = base + tr.glow * 0.55;
      ctx.strokeStyle = tr.glow > 0.05 ? colors.signal : colors.trace;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(tr.p[0][0], tr.p[0][1]);
      for (let k = 1; k < tr.p.length; k++) ctx.lineTo(tr.p[k][0], tr.p[k][1]);
      ctx.stroke();
      // Solder pads at both ends.
      for (const [px, py] of [tr.p[0], tr.p[tr.p.length - 1]]) {
        ctx.beginPath();
        ctx.arc(px, py, 3.2, 0, Math.PI * 2);
        ctx.lineWidth = 1.4;
        ctx.stroke();
      }
      if (hot && Math.random() < dt * 1.5) spawn(tr);
    }
    ctx.globalAlpha = 1;
    for (let i = pulses.length - 1; i >= 0; i--) {
      const pu = pulses[i];
      pu.d += pu.dir * pu.speed * dt;
      if (pu.d < 0 || pu.d > pu.tr.total) { pulses.splice(i, 1); continue; }
      const [px, py] = pointAt(pu.tr, pu.d);
      const [tx, ty] = pointAt(pu.tr, Math.min(pu.tr.total, Math.max(0, pu.d - pu.dir * 16)));
      const g = ctx.createLinearGradient(tx, ty, px, py);
      g.addColorStop(0, 'rgba(0,0,0,0)');
      g.addColorStop(1, pu.color);
      ctx.strokeStyle = g;
      ctx.lineWidth = 2.4;
      ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(px, py); ctx.stroke();
      ctx.fillStyle = pu.color;
      ctx.beginPath(); ctx.arc(px, py, 2.4, 0, Math.PI * 2); ctx.fill();
    }
    if (Math.random() < dt * 2.2 && traces.length) spawn(traces[rand(traces.length)], Math.random() < 0.3 ? colors.accent : colors.signal);
  }

  function frame(t) {
    const dt = Math.min(0.05, (t - (last || t)) / 1000);
    last = t;
    draw(dt);
    raf = requestAnimationFrame(frame);
  }

  function start() {
    if (running || reduced || !visible || document.hidden) return;
    running = true; last = 0; raf = requestAnimationFrame(frame);
  }
  function stop() { running = false; cancelAnimationFrame(raf); }

  readColors();
  build();
  if (reduced) draw(0); else start();

  interactiveArea.addEventListener('pointermove', (e) => {
    const r = canvas.getBoundingClientRect();
    mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top;
  }, { passive: true });
  interactiveArea.addEventListener('pointerleave', () => { mouse.x = -1e4; mouse.y = -1e4; });
  interactiveArea.addEventListener('pointerdown', (e) => {
    if (reduced || e.target.closest('a, button')) return;
    const r = canvas.getBoundingClientRect();
    const x = e.clientX - r.left; const y = e.clientY - r.top;
    traces.filter((tr) => near(tr, x, y, 200)).slice(0, 14).forEach((tr) => spawn(tr, colors.accent));
  });

  let resizeT;
  new ResizeObserver(() => { clearTimeout(resizeT); resizeT = setTimeout(() => { build(); if (reduced) draw(0); }, 150); }).observe(canvas);
  new MutationObserver(() => { readColors(); if (reduced) draw(0); }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; if (visible) start(); else stop(); }).observe(canvas);
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); else start(); });
}
