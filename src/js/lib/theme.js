// Tema claro/escuro: usa a escolha salva e, sem ela, acompanha o sistema operacional.
const KEY = 'connecthub.theme';
const root = document.documentElement;
const COLORS = { dark: '#0b0d1f', light: '#f6f7ff' };

const saved = () => {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
};

function apply(mode) {
  root.dataset.theme = mode;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', COLORS[mode]);
  window.dispatchEvent(new Event('themechange'));
}

export const theme = {
  get: () => root.dataset.theme ?? 'dark',

  toggle() {
    const next = theme.get() === 'dark' ? 'light' : 'dark';
    try {
      localStorage.setItem(KEY, next);
    } catch {
      /* navegação privada: vale só nesta sessão */
    }
    apply(next);
  },
};

matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (event) => {
  if (!saved()) apply(event.matches ? 'dark' : 'light');
});
apply(theme.get());
