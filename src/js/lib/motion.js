// Movimento global: revelação ao rolar, brilho que segue o cursor nos cards e sombra do header.
const reveal = new IntersectionObserver(
  (entries) =>
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('in');
      reveal.unobserve(entry.target);
    }),
  { threshold: 0.12 },
);

// Animações infinitas (aurora) só rodam enquanto o bloco está visível.
const offscreen = new IntersectionObserver((entries) =>
  entries.forEach((entry) => entry.target.classList.toggle('offscreen', !entry.isIntersecting)),
);

export function animatePage(root) {
  root.classList.remove('page-in');
  void root.offsetWidth;
  root.classList.add('page-in');

  root.querySelectorAll('[data-reveal], [data-draw], .grid > *').forEach((el) => {
    if (!el.hasAttribute('data-draw')) {
      el.classList.add('rv');
      el.style.setProperty('--i', Math.min([...el.parentElement.children].indexOf(el), 8));
    }
    reveal.observe(el);
  });
  root.querySelectorAll('[data-draw] .step').forEach((step, i) => step.style.setProperty('--i', i));
  root.querySelectorAll('.hero, .cta-band, .auth-art').forEach((el) => offscreen.observe(el));
}

export function initMotion(headerEl) {
  // Brilho do cursor nos cards: no máximo uma atualização por quadro.
  let pending = null;
  document.addEventListener(
    'pointermove',
    (event) => {
      const wasIdle = !pending;
      pending = event;
      if (!wasIdle) return;
      requestAnimationFrame(() => {
        const card = pending.target.closest?.('.card, .tile');
        if (card) {
          const rect = card.getBoundingClientRect();
          card.style.setProperty('--mx', `${pending.clientX - rect.left}px`);
          card.style.setProperty('--my', `${pending.clientY - rect.top}px`);
        }
        pending = null;
      });
    },
    { passive: true },
  );

  const onScroll = () => headerEl.classList.toggle('scrolled', scrollY > 8);
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}
