// Rede viva: projetos (azul) e pessoas (vermelho) se aproximam; ao conectar, a linha se funde em roxo.
// O cursor é um nó roxo ("você") que conecta com quem estiver por perto.
//
// Opções:
//   density       multiplica a quantidade de nós
//   theme         'dark' | 'light' | 'auto' (acompanha o tema do site)
//   intensity     opacidade geral (0–1); fundos de página usam valores baixos
//   pointerTarget elemento que escuta o mouse (padrão: pai do canvas; window = página inteira)
const PALETTES = {
  dark: { blue: [222, 95, 64], red: [352, 92, 62], purple: [268, 90, 68], line: 0.85 },
  light: { blue: [222, 88, 50], red: [352, 86, 50], purple: [268, 80, 54], line: 0.7 },
};
const LINK_DISTANCE = 150;
const POINTER_REACH = 190;
const TAU = Math.PI * 2;

const hsl = ([h, s, l], alpha = 1) => `hsl(${h} ${s}% ${l}% / ${alpha})`;

// Brilho pré-renderizado: desenhar um sprite é muito mais barato que shadowBlur a cada quadro.
function glowSprite([h, s, l]) {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const g = canvas.getContext('2d');
  const gradient = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gradient.addColorStop(0, `hsl(${h} ${s}% ${l}% / 1)`);
  gradient.addColorStop(0.2, `hsl(${h} ${s}% ${l}% / 1)`);
  gradient.addColorStop(0.24, `hsl(${h} ${s}% ${l}% / .4)`);
  gradient.addColorStop(1, `hsl(${h} ${s}% ${l}% / 0)`);
  g.fillStyle = gradient;
  g.fillRect(0, 0, size, size);
  return canvas;
}

const spriteSet = (palette) => ({
  project: glowSprite(palette.blue),
  person: glowSprite(palette.red),
  mix: glowSprite(palette.purple),
});

export function mountNetwork(canvas, { density = 1, theme = 'dark', intensity = 1, pointerTarget } = {}) {
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const host = pointerTarget ?? canvas.parentElement;
  const leaveTarget = host === window ? document.documentElement : host;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const sprites = { dark: spriteSet(PALETTES.dark), light: spriteSet(PALETTES.light) };
  const mode = () =>
    theme === 'auto' ? (document.documentElement.dataset.theme === 'light' ? 'light' : 'dark') : theme;

  let width = 0;
  let height = 0;
  let frame = 0;
  let visible = true;
  let nodes = [];
  let pulses = [];
  let links = new Set();
  const pointer = { x: -999, y: -999 };

  const spawn = (index) => ({
    x: Math.random() * width,
    y: Math.random() * height,
    vx: (Math.random() - 0.5) * 0.45,
    vy: (Math.random() - 0.5) * 0.45,
    r: 3 + Math.random() * 3,
    kind: index % 2 ? 'person' : 'project',
    heat: 0,
  });

  function resize() {
    const dpr = Math.min(devicePixelRatio || 1, 1.5);
    const rect = canvas.getBoundingClientRect();
    width = rect.width;
    height = rect.height;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const target = Math.round(Math.min(48, Math.max(14, (width * height) / 21000)) * density);
    while (nodes.length < target) nodes.push(spawn(nodes.length));
    nodes.length = target;
    if (reducedMotion) draw();
  }

  function step() {
    for (const node of nodes) {
      const dx = pointer.x - node.x;
      const dy = pointer.y - node.y;
      const distance = Math.hypot(dx, dy);
      if (distance < POINTER_REACH && distance > 1) {
        node.vx += (dx / distance) * 0.012;
        node.vy += (dy / distance) * 0.012;
      }

      node.vx *= 0.995;
      node.vy *= 0.995;
      const speed = Math.hypot(node.vx, node.vy);
      if (speed > 0.9) {
        node.vx *= 0.9 / speed;
        node.vy *= 0.9 / speed;
      }

      node.x += node.vx;
      node.y += node.vy;
      node.heat *= 0.94;

      if (node.x < -10) node.x = width + 10;
      else if (node.x > width + 10) node.x = -10;
      if (node.y < -10) node.y = height + 10;
      else if (node.y > height + 10) node.y = -10;
    }
  }

  function line(palette, ax, ay, bx, by, colorA, colorB, strength, lineWidth = 1.4) {
    const alpha = strength * palette.line * intensity;
    const gradient = ctx.createLinearGradient(ax, ay, bx, by);
    gradient.addColorStop(0, hsl(colorA, alpha));
    gradient.addColorStop(0.5, hsl(palette.purple, alpha)); // a mistura das duas cores é sempre roxo
    gradient.addColorStop(1, hsl(colorB, alpha));
    ctx.strokeStyle = gradient;
    ctx.lineWidth = lineWidth;
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.lineTo(bx, by);
    ctx.stroke();
  }

  function sprite(image, x, y, size, alpha = 1) {
    ctx.globalAlpha = alpha * intensity;
    ctx.drawImage(image, x - size / 2, y - size / 2, size, size);
    ctx.globalAlpha = 1;
  }

  function draw() {
    const palette = PALETTES[mode()];
    const glow = sprites[mode()];
    const colors = { project: palette.blue, person: palette.red };
    const current = new Set();
    ctx.clearRect(0, 0, width, height);

    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i];
        const b = nodes[j];
        if (a.kind === b.kind) continue; // só conecta mundos diferentes

        const distance = Math.hypot(a.x - b.x, a.y - b.y);
        if (distance > LINK_DISTANCE) continue;

        const key = `${i}-${j}`;
        current.add(key);
        if (!links.has(key) && !reducedMotion) pulses.push({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, t: 0 });
        line(palette, a.x, a.y, b.x, b.y, colors[a.kind], colors[b.kind], 1 - distance / LINK_DISTANCE);
        a.heat = b.heat = 1;
      }
    }
    links = current;

    for (const node of nodes) {
      const distance = Math.hypot(pointer.x - node.x, pointer.y - node.y);
      if (distance >= POINTER_REACH) continue;
      line(
        palette,
        pointer.x,
        pointer.y,
        node.x,
        node.y,
        palette.purple,
        colors[node.kind],
        (1 - distance / POINTER_REACH) * 0.8,
        1.2,
      );
      node.heat = Math.max(node.heat, 1 - distance / POINTER_REACH);
    }

    for (const pulse of pulses) {
      ctx.strokeStyle = hsl(palette.purple, (1 - pulse.t) * intensity);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(pulse.x, pulse.y, 4 + pulse.t * 26, 0, TAU);
      ctx.stroke();
      pulse.t += 0.03;
    }
    pulses = pulses.filter((pulse) => pulse.t < 1);

    for (const node of nodes) {
      const size = node.r * 10;
      sprite(glow[node.kind], node.x, node.y, size);
      if (node.heat > 0.02) sprite(glow.mix, node.x, node.y, size * 1.15, node.heat);
    }
    if (pointer.x > -100) sprite(glow.mix, pointer.x, pointer.y, 70);
  }

  const onMove = (event) => {
    const rect = canvas.getBoundingClientRect();
    pointer.x = event.clientX - rect.left;
    pointer.y = event.clientY - rect.top;
  };
  const onLeave = () => {
    pointer.x = pointer.y = -999;
  };
  const onTheme = () => reducedMotion && draw();

  const resizeObserver = new ResizeObserver(resize);
  const visibilityObserver = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
  });

  const stop = () => {
    cancelAnimationFrame(frame);
    resizeObserver.disconnect();
    visibilityObserver.disconnect();
    host.removeEventListener('pointermove', onMove);
    leaveTarget.removeEventListener('pointerleave', onLeave);
    window.removeEventListener('themechange', onTheme);
  };

  resizeObserver.observe(canvas);
  visibilityObserver.observe(canvas);
  window.addEventListener('themechange', onTheme);

  if (reducedMotion) {
    for (let i = 0; i < 200; i++) step();
    draw();
    return stop;
  }

  host.addEventListener('pointermove', onMove);
  leaveTarget.addEventListener('pointerleave', onLeave);

  function tick() {
    if (!canvas.isConnected) return stop(); // a página mudou
    if (visible && !document.hidden) {
      step();
      draw();
    }
    frame = requestAnimationFrame(tick);
  }
  tick();

  return stop;
}
