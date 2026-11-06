// Rede viva: projetos (azul) e pessoas (vermelho) se aproximam; ao conectar, a linha se funde em roxo.
// O cursor é um nó roxo — "você" — que conecta com quem estiver por perto.
export function mountNetwork(canvas, { density = 1 } = {}) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d'), host = canvas.parentElement;
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const COL = { project: [222, 95, 64], person: [352, 92, 62], mix: [268, 90, 68] };
  const hsl = ([h, s, l], a = 1) => `hsl(${h} ${s}% ${l}% / ${a})`;
  const LINK = 150, REACH = 190;
  let w = 0, h = 0, raf = 0, visible = true, nodes = [], pulses = [], links = new Set();
  const ptr = { x: -999, y: -999 };
  const spawn = (i) => ({ x: Math.random() * w, y: Math.random() * h, vx: (Math.random() - .5) * .45, vy: (Math.random() - .5) * .45, r: 3 + Math.random() * 3, kind: i % 2 ? 'person' : 'project', heat: 0 });

  const resize = () => {
    const dpr = Math.min(devicePixelRatio || 1, 2), r = canvas.getBoundingClientRect();
    w = r.width; h = r.height; canvas.width = w * dpr; canvas.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const n = Math.round(Math.min(48, Math.max(14, (w * h) / 21000)) * density);
    while (nodes.length < n) nodes.push(spawn(nodes.length));
    nodes.length = n;
    if (still) draw();
  };

  const step = () => {
    for (const n of nodes) {
      const dx = ptr.x - n.x, dy = ptr.y - n.y, d = Math.hypot(dx, dy);
      if (d < REACH && d > 1) { n.vx += (dx / d) * .012; n.vy += (dy / d) * .012; }
      n.vx *= .995; n.vy *= .995;
      const sp = Math.hypot(n.vx, n.vy); if (sp > .9) { n.vx *= .9 / sp; n.vy *= .9 / sp; }
      n.x += n.vx; n.y += n.vy; n.heat *= .94;
      if (n.x < -10) n.x = w + 10; else if (n.x > w + 10) n.x = -10;
      if (n.y < -10) n.y = h + 10; else if (n.y > h + 10) n.y = -10;
    }
  };

  const line = (ax, ay, bx, by, ca, cb, alpha, width = 1.4) => {
    const g = ctx.createLinearGradient(ax, ay, bx, by);
    g.addColorStop(0, hsl(ca, alpha)); g.addColorStop(.5, hsl(COL.mix, alpha)); g.addColorStop(1, hsl(cb, alpha));
    ctx.strokeStyle = g; ctx.lineWidth = width; ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
  };

  function draw() {
    ctx.clearRect(0, 0, w, h);
    const now = new Set();
    for (let i = 0; i < nodes.length; i++) for (let j = i + 1; j < nodes.length; j++) {
      const a = nodes[i], b = nodes[j]; if (a.kind === b.kind) continue;
      const d = Math.hypot(a.x - b.x, a.y - b.y); if (d > LINK) continue;
      const k = i + '-' + j; now.add(k);
      if (!links.has(k) && !still) pulses.push({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, t: 0 });
      line(a.x, a.y, b.x, b.y, COL[a.kind], COL[b.kind], (1 - d / LINK) * .85);
      a.heat = b.heat = 1;
    }
    links = now;
    for (const n of nodes) {
      const d = Math.hypot(ptr.x - n.x, ptr.y - n.y);
      if (d < REACH) { line(ptr.x, ptr.y, n.x, n.y, COL.mix, COL[n.kind], (1 - d / REACH) * .7, 1.2); n.heat = Math.max(n.heat, 1 - d / REACH); }
    }
    for (const p of pulses) { ctx.strokeStyle = hsl(COL.mix, 1 - p.t); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(p.x, p.y, 4 + p.t * 26, 0, 6.283); ctx.stroke(); p.t += .03; }
    pulses = pulses.filter((p) => p.t < 1);
    for (const n of nodes) {
      ctx.shadowColor = hsl(n.heat > .15 ? COL.mix : COL[n.kind], .9); ctx.shadowBlur = 10 + n.heat * 14;
      ctx.fillStyle = hsl(COL[n.kind]); ctx.beginPath(); ctx.arc(n.x, n.y, n.r, 0, 6.283); ctx.fill();
      ctx.fillStyle = hsl(COL.mix, n.heat); ctx.beginPath(); ctx.arc(n.x, n.y, n.r, 0, 6.283); ctx.fill();
    }
    if (ptr.x > -100) { ctx.shadowBlur = 22; ctx.shadowColor = hsl(COL.mix); ctx.fillStyle = hsl(COL.mix); ctx.beginPath(); ctx.arc(ptr.x, ptr.y, 6, 0, 6.283); ctx.fill(); }
    ctx.shadowBlur = 0;
  }

  const ro = new ResizeObserver(resize), io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; });
  const move = (e) => { const r = canvas.getBoundingClientRect(); ptr.x = e.clientX - r.left; ptr.y = e.clientY - r.top; };
  const leave = () => { ptr.x = ptr.y = -999; };
  const stop = () => { cancelAnimationFrame(raf); ro.disconnect(); io.disconnect(); };
  ro.observe(canvas); io.observe(canvas);
  if (still) { for (let i = 0; i < 200; i++) step(); draw(); return stop; }
  host.addEventListener('pointermove', move); host.addEventListener('pointerleave', leave);
  const tick = () => {
    if (!canvas.isConnected) return stop(); // a página mudou
    if (visible && !document.hidden) { step(); draw(); }
    raf = requestAnimationFrame(tick);
  };
  tick();
  return stop;
}
