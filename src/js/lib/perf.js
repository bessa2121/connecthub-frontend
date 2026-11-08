// Modo leve: sem o fundo animado e sem animações. Liga sozinho em aparelhos fracos / economia de dados
// (ou quando o fundo percebe que a tela não aguenta) e pode ser alterado pelo usuário no rodapé.
const KEY = 'connecthub.lite';
const root = document.documentElement;

const saved = () => {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
};
const weakDevice = () =>
  navigator.hardwareConcurrency <= 2 ||
  navigator.deviceMemory <= 2 ||
  Boolean(navigator.connection?.saveData);

const choice = saved();
if (choice === '1') root.dataset.lite = 'on';
else if (choice === null && weakDevice()) root.dataset.lite = 'auto';

export const lite = {
  enabled: () => Boolean(root.dataset.lite),
  toggle() {
    try {
      localStorage.setItem(KEY, lite.enabled() ? '0' : '1');
    } catch {
      /* sem armazenamento: vale só até recarregar */
    }
    location.reload();
  },
};
