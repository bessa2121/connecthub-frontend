import { route, startRouter } from './router.js';
import { api } from './services/api.js';
import { session } from './services/session.js';
import './lib/theme.js';
import { mountNetwork } from './components/network.js';
import { mountLayout } from './components/layout.js';
import { homePage } from './pages/home.js';
import { projectsPage, projectDetailPage, publishPage } from './pages/projects.js';
import { communityPage, memberPage, talentsPage } from './pages/community.js';
import { loginPage, registerPage } from './pages/auth.js';
import { aboutPage, privacyPage, termsPage } from './pages/static.js';

route('/', homePage);
route('/projetos', projectsPage);
route('/projetos/publicar', publishPage); // antes de /projetos/:slug
route('/projetos/:slug', projectDetailPage);
route('/comunidade', communityPage);
route('/comunidade/:slug', memberPage);
route('/talentos', talentsPage);
route('/entrar', loginPage);
route('/cadastro', registerPage);
route('/sobre', aboutPage);
route('/privacidade', privacyPage);
route('/termos', termsPage);

// Dispara o que a primeira tela vai precisar já agora: acorda a API e enche o cache.
api.meta().catch(() => {});
if (location.pathname === '/') api.projects({ featured: '1' }).catch(() => {});

mountLayout(document.getElementById('header'), document.getElementById('footer'));
session.restore(); // em paralelo: não bloqueia a primeira renderização

// Fundo interativo de TODAS as páginas (o hero e o painel de login têm o seu, mais intenso).
// A página inicial tem o próprio fundo (hero); o global fica em pausa enquanto o hero cobre a tela.
const root = document.documentElement;
addEventListener('routechange', () => root.classList.remove('hero-on'));
(window.requestIdleCallback ?? setTimeout)(() =>
  mountNetwork(document.querySelector('[data-bg]'), {
    density: 0.6,
    theme: 'auto',
    intensity: 0.6,
    pointerTarget: window,
    fps: 30,
    maxDpr: 1,
    maxPixels: 1_000_000,
    gradientLines: false,
    shouldPause: () => root.classList.contains('hero-on'),
  }),
);
startRouter(document.getElementById('app'));
