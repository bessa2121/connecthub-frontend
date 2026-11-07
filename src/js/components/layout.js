import { html } from '../lib/html.js';
import { session } from '../services/session.js';
import { navigate } from '../router.js';
import { toast, avatar } from './ui.js';
import { initMotion } from '../lib/motion.js';
import { theme } from '../lib/theme.js';

const themeButton = html`<button class="theme-toggle" type="button" data-theme-toggle aria-label="Alternar entre modo claro e escuro" title="Alternar tema">
  <svg class="sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>
  <svg class="moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>
</button>`;

const LINKS = [
  ['/', 'Início'],
  ['/projetos', 'Projetos'],
  ['/comunidade', 'Comunidade'],
];
let open = false;

export function mountLayout(headerEl, footerEl) {
  const renderHeader = () => {
    const u = session.user,
      path = location.pathname;
    const active = (href) => ((href === '/' ? path === '/' : path.startsWith(href)) ? 'active' : '');
    headerEl.innerHTML = html`
      <header class="site-header ${open ? 'open' : ''}"><div class="wrap">
        <a class="logo" href="/"><img src="/favicon.svg" alt=""><span class="wordmark">ConnectHub</span></a>
        <button class="btn ghost sm burger" aria-label="Menu" aria-expanded="${String(open)}" data-burger>☰</button>
        <nav class="main" aria-label="Principal">${LINKS.map(([h, t]) => html`<a href="${h}" class="${active(h)}">${t}</a>`)}</nav>
        <div class="actions">
          ${
            u
              ? html`<a href="/comunidade/${u.slug}" class="row" title="Meu perfil">${avatar(u)}</a><button class="btn ghost sm" data-logout>Sair</button>`
              : html`<a class="btn ghost sm" href="/entrar">Entrar</a>`
          }
          <a class="btn sm" href="/projetos/publicar">Publicar projeto</a>
        </div>
        ${themeButton}
      </div></header>`;
    headerEl.querySelector('[data-theme-toggle]').onclick = theme.toggle;
    headerEl.querySelector('[data-burger]').onclick = () => {
      open = !open;
      renderHeader();
    };
    headerEl.querySelector('[data-logout]')?.addEventListener('click', () => {
      session.end();
      toast('Você saiu da conta.');
      navigate('/');
    });
  };
  session.subscribe(renderHeader);
  window.addEventListener('routechange', () => {
    open = false;
    renderHeader();
  });
  renderHeader();
  initMotion(headerEl);

  footerEl.innerHTML = html`
    <footer class="site-footer"><div class="wrap">
      <div class="foot">
        <div><a class="logo" href="/"><img src="/favicon.svg" alt=""><span class="wordmark">ConnectHub</span></a>
          <p class="muted" style="margin-top:12px;max-width:340px">Plataforma de divulgação de projetos e conexão entre alunos da ETEC Camargo Aranha. Ideias, pessoas e oportunidades no mesmo lugar.</p>
          <p class="meta"><strong>Contato</strong><br>A definir pela coordenação do projeto.</p></div>
        <div><h4>Navegação</h4><ul><li><a href="/">Início</a></li><li><a href="/projetos">Projetos</a></li><li><a href="/comunidade">Comunidade</a></li></ul></div>
        <div><h4>Participe</h4><ul><li><a href="/entrar">Entrar</a></li><li><a href="/cadastro">Cadastrar-se</a></li><li><a href="/projetos/publicar">Publicar projeto</a></li><li><a href="/talentos">Talentos</a></li></ul></div>
        <div><h4>Institucional</h4><ul><li><a href="/sobre">Sobre o projeto</a></li><li><a href="/privacidade">Política de Privacidade</a></li><li><a href="/termos">Termos de Uso</a></li></ul></div>
      </div>
      <div class="copy">© ${new Date().getFullYear()} ConnectHub · ETEC Camargo Aranha<br>Redes sociais serão adicionadas em breve.</div>
    </div></footer>`.toString();
}
