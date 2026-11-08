import { html } from '../lib/html.js';
import { icon } from '../lib/icons.js';
import { raw } from '../lib/html.js';
import { api } from '../services/api.js';
import { session } from '../services/session.js';
import { navigate } from '../router.js';
import {
  avatar,
  bindForm,
  bindImageFields,
  contactLinks,
  imageField,
  memberCard,
  options,
  projectCard,
  toast,
} from '../components/ui.js';

export async function communityPage({ query }) {
  const [list, meta] = await Promise.all([api.members(query), api.meta()]);
  return {
    title: 'Comunidade',
    view: html`<section class="wrap section" style="padding-top:40px">
      <span class="eyebrow">Comunidade</span><h1>Conheça quem faz o ConnectHub acontecer <span class="count">${list.length}</span></h1>
      <form class="toolbar" data-filters role="search">
        <input name="q" type="search" placeholder="Buscar por nome, curso ou habilidade…" value="${query.q ?? ''}" aria-label="Buscar">
        <select name="course" aria-label="Curso">${options(meta.courses, query.course, 'Todos os cursos')}</select>
      </form>
      ${list.length ? html`<div class="grid g3">${list.map(memberCard)}</div>` : html`<div class="empty">Ninguém encontrado.</div>`}
    </section>`,
    mount(root) {
      const f = root.querySelector('[data-filters]');
      const go = () => {
        const p = new URLSearchParams({ q: f.elements.q.value.trim(), course: f.elements.course.value });
        [...p].forEach(([k, v]) => !v && p.delete(k));
        navigate(`/comunidade${p.size ? `?${p}` : ''}`);
      };
      f.addEventListener('submit', (e) => {
        e.preventDefault();
        go();
      });
      f.elements.course.addEventListener('change', go);
    },
  };
}

export async function talentsPage({ query }) {
  const [meta, list] = await Promise.all([api.meta(), api.members(query), session.ready]);
  return {
    title: 'Talentos',
    view: html`<section class="wrap section" style="padding-top:40px">
      <span class="eyebrow">Talentos</span><h1 style="font-size:2.4rem">Encontre habilidades para o seu próximo projeto</h1>
      <p class="muted">Filtre por habilidade e convide alguém para colaborar. ${session.user ? '' : html`<a href="/cadastro"><strong>Cadastre-se</strong></a> para aparecer aqui.`}</p>
      <div class="chips" style="margin:20px 0 28px">
        <a class="chip ${!query.skill ? 'on' : ''}" href="/talentos">Todas</a>
        ${meta.skills.map((s) => html`<a class="chip ${query.skill === s ? 'on' : ''}" href="/talentos?skill=${encodeURIComponent(s)}">${s}</a>`)}
      </div>
      <div class="grid g3">${list.map(memberCard)}</div>
    </section>`,
  };
}

export async function memberPage({ params, query }) {
  const [m] = await Promise.all([api.member(params.slug), session.ready]);
  const own = session.user?.id === m.id;
  const meta = own ? await api.meta() : null;
  const contacts = contactLinks(m, { labels: true });

  const editor = () => html`
    <details class="editor" ${raw(query.editar ? 'open' : '')}>
      <summary class="btn ghost sm">${icon('pencil')} Editar perfil</summary>
      <form class="form wide" data-profile novalidate>
        ${imageField({ name: 'avatar', label: 'Foto de perfil', hint: 'Quadrada, com recorte automático. JPG, PNG ou WebP.', value: m.avatar, round: true })}
        <label>Bio<textarea name="bio" rows="3" maxlength="300">${m.bio}</textarea></label>
        <label>Habilidades (separadas por vírgula)<input name="skills" value="${m.skills.join(', ')}"></label>
        <div class="grid g2">
          <label>Curso<select name="course">${options(meta.courses, m.course)}</select></label>
          <label>Ano<select name="year">${options(meta.years, m.year)}</select></label>
        </div>
        <h3 class="form-title">Contatos</h3>
        <p class="meta note">Aparecem para qualquer visitante, no seu perfil e nos seus projetos. Preencha só o que quiser divulgar.</p>
        <label>Instagram<input name="instagram" value="${m.instagram ? `@${m.instagram}` : ''}" placeholder="@seuusuario" autocomplete="off"></label>
        <label>LinkedIn<input name="linkedin" value="${m.linkedin ? `https://www.linkedin.com/in/${m.linkedin}` : ''}" placeholder="https://www.linkedin.com/in/seu-perfil" autocomplete="off"></label>
        <label>E-mail de contato<input name="contactEmail" type="email" value="${m.contactEmail}" placeholder="voce@exemplo.com" autocomplete="off"></label>
        <button class="btn" type="submit">Salvar perfil</button>
      </form>
    </details>`;

  return {
    title: m.name,
    view: html`<section class="wrap section" style="padding-top:40px">
      <div class="profile">
        ${avatar(m, true)}
        <div class="profile-info">
          <span class="eyebrow">${m.course} · ${m.year}</span>
          <h1 style="font-size:2.2rem;margin-bottom:.2em">${m.name}</h1>
          <p class="muted">${m.bio || 'Este membro ainda não escreveu uma bio.'}</p>
          <div class="chips">${m.skills.map((s) => html`<a class="chip" href="/talentos?skill=${encodeURIComponent(s)}">${s}</a>`)}</div>
          ${contacts}
          ${own && !contacts ? html`<p class="meta">Adicione Instagram, LinkedIn ou e-mail em “Editar perfil” para os colegas entrarem em contato.</p>` : ''}
        </div>
      </div>
      ${own ? editor() : ''}
      <h2 style="margin-top:40px">Projetos (${m.projects.length})</h2>
      ${m.projects.length ? html`<div class="grid g3">${m.projects.map(projectCard)}</div>` : html`<div class="empty">Nenhum projeto publicado ainda.</div>`}
    </section>`,
    mount(root) {
      const form = root.querySelector('[data-profile]');
      if (!form) return;
      bindImageFields(root);
      bindForm(form, async (data) => {
        session.setUser(await api.updateProfile(data));
        toast('Perfil atualizado!');
        navigate(`/comunidade/${m.slug}`);
      });
    },
  };
}
