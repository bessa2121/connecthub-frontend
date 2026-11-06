// Movimento global: revelação ao rolar, brilho que segue o cursor nos cards e sombra do header.
const io = new IntersectionObserver((entries) => entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: .12 });

export function animatePage(root) {
  root.classList.remove('page-in'); void root.offsetWidth; root.classList.add('page-in');
  root.querySelectorAll('[data-reveal], [data-draw], .grid > *').forEach((el) => {
    if (!el.hasAttribute('data-draw')) { el.classList.add('rv'); el.style.setProperty('--i', Math.min([...el.parentElement.children].indexOf(el), 8)); }
    io.observe(el);
  });
  root.querySelectorAll('[data-draw] .step').forEach((s, i) => s.style.setProperty('--i', i));
}

export function initMotion(headerEl) {
  document.addEventListener('pointermove', (e) => {
    const c = e.target.closest?.('.card, .tile'); if (!c) return;
    const r = c.getBoundingClientRect(); c.style.setProperty('--mx', `${e.clientX - r.left}px`); c.style.setProperty('--my', `${e.clientY - r.top}px`);
  }, { passive: true });
  const onScroll = () => headerEl.classList.toggle('scrolled', scrollY > 8);
  addEventListener('scroll', onScroll, { passive: true }); onScroll();
}
