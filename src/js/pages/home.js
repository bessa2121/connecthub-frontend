import { html, ICONS } from '../lib/html.js';
import { api } from '../services/api.js';
import { aurora, projectCard } from '../components/ui.js';
import { mountNetwork } from '../components/network.js';

const PILLARS = [
  ['👥', 'Comunidade', 'Conheça estudantes de diferentes cursos e descubra pessoas com interesses em comum.'],
  [
    '🤝',
    'Networking',
    'Construa conexões, troque experiências e encontre possíveis parceiros para novos projetos.',
  ],
  [
    '🚀',
    'Projetos',
    'Explore trabalhos acadêmicos, ideias inovadoras e soluções desenvolvidas pelos alunos.',
  ],
  [
    '🏆',
    'Reconhecimento',
    'Dê visibilidade às suas ideias, compartilhe suas conquistas e mostre o que você sabe fazer.',
  ],
  [
    '✨',
    'Talentos',
    'Descubra habilidades, encontre colaboradores e apresente suas competências à comunidade.',
  ],
  [
    '🌱',
    'Oportunidades',
    'Encontre pessoas, conhecimentos e possibilidades para desenvolver novas iniciativas.',
  ],
];

const STEPS = [
  ['Publique', 'Mostre seu projeto em minutos, com resumo, tags e link do material.'],
  ['Seja descoberto', 'Colegas de todos os cursos encontram sua ideia e curtem o que viram.'],
  ['Conecte-se', 'Encontre quem tem a habilidade que falta e comece o próximo projeto junto.'],
];

const HEADLINE = 'Grandes ideias começam quando pessoas se conectam.'.split(' ');
const COURSES = Object.entries(ICONS);

export async function homePage() {
  const featured = (await api.projects({ featured: '1' })).slice(0, 3);

  return {
    view: html`
      <section class="hero">
        <div class="hero-bg">${aurora}<canvas aria-hidden="true" data-net></canvas></div>
        <div class="wrap">
          <span class="eyebrow">ETEC Camargo Aranha</span>
          <h1>${HEADLINE.map((word, i) => html`<span class="w" style="--i:${i}">${word}</span> `)}</h1>
          <p class="lead">
            O ConnectHub reúne os projetos dos alunos da ETEC Camargo Aranha em um só lugar. Descubra
            ideias, conheça talentos de outros cursos e encontre pessoas para construir o próximo grande
            projeto.
          </p>
          <div class="cta">
            <a class="btn light" href="/projetos">Explorar projetos</a>
            <a class="btn ghost" href="/comunidade">Conhecer a comunidade</a>
          </div>
          <div class="chips">
            ${featured.map((p) => html`<a class="chip" href="/projetos/${p.slug}"><strong>${p.course}</strong> · ${p.title}</a>`)}
          </div>
          <div class="legend" aria-hidden="true">
            <span><i style="background:#4d78ff"></i>Projetos</span>
            <span><i style="background:#ff4d68"></i>Pessoas</span>
            <span><i style="background:#9a63ff;box-shadow:0 0 8px #9a63ff"></i>Conexões</span>
          </div>
        </div>
      </section>

      <section class="wrap section">
        <div class="split" data-reveal>
          <div>
            <span class="eyebrow">Sobre o ConnectHub</span>
            <h2>Cada curso faz coisas incríveis. Quase ninguém vê.</h2>
          </div>
          <p class="muted">
            Projetos ficam presos na sala de aula e as pessoas certas nunca se encontram. O ConnectHub dá
            visibilidade ao que os alunos criam e aproxima quem pode colaborar.
          </p>
        </div>
        <div class="tiles" data-reveal>
          ${COURSES.map(
            ([course, emoji], i) => html`
            <a class="tile" style="--h:${222 + i * 32}" href="/projetos?course=${encodeURIComponent(course)}">
              <span class="e">${emoji}</span>
              <span>${course}<small>Ver projetos</small></span>
            </a>`,
          )}
        </div>
      </section>

      <section class="wrap section">
        <span class="eyebrow">Como funciona</span>
        <h2>Da ideia à parceria em três passos</h2>
        <div class="steps" data-draw>
          ${STEPS.map(
            ([title, text], i) => html`
            <div class="step"><b>${i + 1}</b><h3>${title}</h3><p class="muted">${text}</p></div>`,
          )}
        </div>
      </section>

      <section class="wrap section">
        <span class="eyebrow">Pilares</span>
        <h2>O que você encontra no ConnectHub</h2>
        <div class="grid g3">
          ${PILLARS.map(
            ([icon, title, text]) => html`
            <div class="card pillar">
              <span class="mark" aria-hidden="true">${icon}</span>
              <span class="ico">${icon}</span>
              <h3>${title}</h3>
              <p class="muted">${text}</p>
            </div>`,
          )}
        </div>
      </section>

      <section class="wrap section">
        <div class="row between">
          <div><span class="eyebrow">Em destaque</span><h2>Projetos que estão chamando atenção</h2></div>
          <a class="btn ghost" href="/projetos">Explorar todos os projetos</a>
        </div>
        <div class="grid g3">${featured.map(projectCard)}</div>
        <p class="meta">Projetos de demonstração para apresentar a plataforma.</p>
      </section>

      <section class="wrap section">
        <div class="cta-band" data-reveal>
          ${aurora}
          <h2>Sua próxima conexão pode transformar uma ideia em realidade.</h2>
          <p>Compartilhe o que você cria, conheça outros talentos e faça parte de uma comunidade que cresce junto.</p>
          <div class="row">
            <a class="btn light" href="/cadastro">Criar minha conta</a>
            <a class="btn ghost" href="/talentos">Ver talentos</a>
          </div>
        </div>
      </section>`,
    mount: (root) => {
      const hero = root.querySelector('.hero');
      new IntersectionObserver(
        ([entry]) => document.documentElement.classList.toggle('hero-on', entry.intersectionRatio > 0.6),
        { threshold: [0, 0.6] },
      ).observe(hero);
      return mountNetwork(root.querySelector('[data-net]'), {
        pointerTarget: hero,
        maxDpr: 1.25,
        maxPixels: 1_600_000,
      });
    },
  };
}
