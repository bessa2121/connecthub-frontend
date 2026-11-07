// Rede viva: projetos (azul) e pessoas (vermelho) se aproximam; ao conectar, a linha se funde em roxo.
// O cursor é um nó roxo ("você") que conecta com quem estiver por perto.
//
// Opções:
//   density        multiplica a quantidade de nós
//   theme          'dark' | 'light' | 'auto' (acompanha o tema do site)
//   intensity      opacidade geral (0–1); fundos de página usam valores baixos
//   pointerTarget  quem escuta o mouse (padrão: pai do canvas; window = página inteira)
//   fps            limite de quadros por segundo (use 60 ou 30, que dividem o ritmo da tela)
//   maxDpr         teto da densidade de pixels do canvas
//   maxPixels      teto de pixels do canvas (telas 4K não pagam 4x mais)
//   gradientLines  false = linhas roxas sólidas (bem mais barato; usado no fundo da página)
//   shouldPause    função: retorna true quando não vale a pena desenhar (ex.: hero cobrindo a tela)
//
// Qualidade adaptativa: se a tela não aguenta, reduz os nós e, se continuar lenta, congela a animação.
const PALETTES = {
  dark: { blue: [222, 95, 64], red: [352, 92, 62], purple: [268, 90, 68], line: 0.85, gain: 1 },
  light: { blue: [222, 88, 50], red: [352, 86, 50], purple: [268, 80, 54], line: 0.8, gain: 1.35 },
};
const LINK_DISTANCE = 150;
const POINTER_REACH = 190;
const FRAME = 1000 / 60;
const TAU = Math.PI * 2;

const hsl = ([h, s, l], alpha = 1) => `hsl(${h} ${s}% ${l}% / ${Math.min(1, alpha)})`;

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

export function mountNetwork(canvas, options = {}) {
  if (!canvas) return;
  const {
    density = 1,
    theme = 'dark',
    intensity = 1,
    pointerTarget,
    fps = 60,
    maxDpr = 1.5,
    maxPixels = 2_000_000,
    gradientLines = true,
    shouldPause = () => false,
  } = options;

  const ctx = canvas.getContext('2d');
  const host = pointerTarget ?? canvas.parentElement;
  const leaveTarget = host === window ? document.documentElement : host;
  const saveData = navigator.connection?.saveData;
  const frozen = matchMedia('(prefers-reduced-motion: reduce)').matches || saveData;
  const sprites = { dark: spriteSet(PALETTES.dark), light: spriteSet(PALETTES.light) };
  const mode = () =>
    theme === 'auto' ? (document.documentElement.dataset.theme === 'light' ? 'light' : 'dark') : theme;

  let width = 0;
  let height = 0;
  let frame = 0;
  let visible = true;
  let interval = 1000 / fps;
  let nodeScale = 1;
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
    const rect = canvas.getBoundingClientRect();
    width = rect.width;
    height = rect.height;
    const dpr = Math.min(devicePixelRatio || 1, maxDpr, Math.sqrt(maxPixels / Math.max(1, width * height)));
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(canvas.width / width, 0, 0, canvas.height / height, 0, 0);

    const target = Math.round(Math.min(48, Math.max(14, (width * height) / 21000)) * density * nodeScale);
    while (nodes.length < target) nodes.push(spawn(nodes.length));
    nodes.length = target;
    if (frozen || stopped) draw();
  }

  // dt = quantos "quadros de 60 fps" se passaram; assim a velocidade não depende do fps.
  function step(dt) {
    const damping = 0.995 ** dt;
    const cooling = 0.94 ** dt;

    for (const node of nodes) {
      const dx = pointer.x - node.x;
      const dy = pointer.y - node.y;
      const distance = Math.hypot(dx, dy);
      if (distance < POINTER_REACH && distance > 1) {
        node.vx += (dx / distance) * 0.012 * dt;
        node.vy += (dy / distance) * 0.012 * dt;
      }

      node.vx *= damping;
      node.vy *= damping;
      const speed = Math.hypot(node.vx, node.vy);
      if (speed > 0.9) {
        node.vx *= 0.9 / speed;
        node.vy *= 0.9 / speed;
      }

      node.x += node.vx * dt;
      node.y += node.vy * dt;
      node.heat *= cooling;

      if (node.x < -10) node.x = width + 10;
      else if (node.x > width + 10) node.x = -10;
      if (node.y < -10) node.y = height + 10;
      else if (node.y > height + 10) node.y = -10;
    }

    for (const pulse of pulses) pulse.t += 0.03 * dt;
    pulses = pulses.filter((pulse) => pulse.t < 1);
  }

  function line(palette, ax, ay, bx, by, colorA, colorB, strength, lineWidth = 1.4) {
    const alpha = strength * palette.line * palette.gain * intensity;
    if (gradientLines) {
      const gradient = ctx.createLinearGradient(ax, ay, bx, by);
      gradient.addColorStop(0, hsl(colorA, alpha));
      gradient.addColorStop(0.5, hsl(palette.purple, alpha)); // a mistura das duas cores é sempre roxo
      gradient.addColorStop(1, hsl(colorB, alpha));
      ctx.strokeStyle = gradient;
    } else {
      ctx.strokeStyle = hsl(palette.purple, alpha);
    }
    ctx.lineWidth = lineWidth;
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.lineTo(bx, by);
    ctx.stroke();
  }

  function sprite(palette, image, x, y, size, alpha = 1) {
    ctx.globalAlpha = Math.min(1, alpha * intensity * palette.gain);
    ctx.drawImage(image, x - size / 2, y - size / 2, size, size);
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
        if (!links.has(key) && !frozen) pulses.push({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, t: 0 });
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
      ctx.strokeStyle = hsl(palette.purple, (1 - pulse.t) * intensity * palette.gain);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(pulse.x, pulse.y, 4 + pulse.t * 26, 0, TAU);
      ctx.stroke();
    }

    for (const node of nodes) {
      const size = node.r * 10;
      sprite(palette, glow[node.kind], node.x, node.y, size);
      if (node.heat > 0.02) sprite(palette, glow.mix, node.x, node.y, size * 1.15, node.heat);
    }
    if (pointer.x > -100) sprite(palette, glow.mix, pointer.x, pointer.y, 70);
    ctx.globalAlpha = 1;
  }

  const onMove = (event) => {
    const rect = canvas.getBoundingClientRect();
    pointer.x = event.clientX - rect.left;
    pointer.y = event.clientY - rect.top;
  };
  const onLeave = () => {
    pointer.x = pointer.y = -999;
  };
  const onTheme = () => (frozen || stopped) && draw();

  const resizeObserver = new ResizeObserver(resize);
  const visibilityObserver = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
  });

  let stopped = false;
  const stop = () => {
    stopped = true;
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

  if (frozen) {
    for (let i = 0; i < 200; i++) step(1);
    draw();
    return stop;
  }

  host.addEventListener('pointermove', onMove);
  leaveTarget.addEventListener('pointerleave', onLeave);

  // Qualidade adaptativa: mede o ritmo real dos quadros do navegador.
  let level = 0;
  let average = FRAME;
  let slowStreak = 0;
  let lastRaf = 0;
  let lastDraw = 0;

  function degrade() {
    level++;
    if (level === 1) {
      nodeScale = 0.6; // menos nós e menos quadros
      interval = Math.max(interval, 1000 / 30);
      resize();
    } else {
      // continua lento: congela num quadro estático (o site segue fluido)
      stop();
      stopped = true;
      for (let i = 0; i < 60; i++) step(1);
      draw();
    }
  }

  function tick(now) {
    if (!canvas.isConnected) return stop(); // a página mudou
    frame = requestAnimationFrame(tick);

    const delta = now - lastRaf;
    lastRaf = now;
    if (!visible || document.hidden || shouldPause()) {
      lastDraw = now;
      return;
    }

    average = average * 0.95 + Math.min(delta, 200) * 0.05;
    slowStreak = average > 28 ? slowStreak + 1 : 0;
    if (slowStreak > 150) {
      slowStreak = 0;
      degrade();
      if (stopped) return;
    }

    const elapsed = now - lastDraw;
    if (elapsed < interval - 2) return;
    lastDraw = now;
    step(Math.min(elapsed, 64) / FRAME);
    draw();
  }
  frame = requestAnimationFrame(tick);

  return stop;
}
