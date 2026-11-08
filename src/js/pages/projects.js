import { html, fmtDate } from '../lib/html.js';
import { icon } from '../lib/icons.js';
import { api } from '../services/api.js';
import { session } from '../services/session.js';
import { navigate, redirect } from '../router.js';
import {
  avatar,
  bindForm,
  bindImageFields,
  contactLinks,
  cover,
  imageField,
  options,
  projectCard,
  toast,
} from '../components/ui.js';

export async function projectsPage({ query }) {
  const [list, meta] = await Promise.all([api.projects(query), api.meta()]);
  const url = (patch) => {
    const p = new URLSearchParams({ ...query, ...patch });
    [...p].forEach(([k, v]) => !v && p.delete(k));
    return `/projetos${p.size ? `?${p}` : ''}`;
  };
  return {
    title: 'Projetos',
    view: html`<section class="wrap section" style="padding-top:40px">
      <span class="eyebrow">Projetos</span><h1>Explore o que os alunos estão criando <span class="count">${list.length}</span></h1>
      <form class="toolbar" data-filters role="search">
        <input name="q" type="search" placeholder="Buscar por título, tecnologia ou autor…" value="${query.q ?? ''}" aria-label="Buscar projetos">
        <select name="course" aria-label="Curso">${options(meta.courses, query.course, 'Todos os cursos')}</select>
      </form>
      <div class="chips" style="margin-bottom:24px">${meta.tags.map((t) => html`<a class="chip ${query.tag === t ? 'on' : ''}" href="${url({ tag: query.tag === t ? '' : t })}">${t}</a>`)}</div>
      ${list.length ? html`<div class="grid g3">${list.map(projectCard)}</div>` : html`<div class="empty"><p>Nenhum projeto encontrado com esses filtros.</p><a class="btn ghost" href="/projetos">Limpar filtros</a></div>`}
    </section>`,
    mount(root) {
      const form = root.querySelector('[data-filters]');
      const go = () => navigate(url({ q: form.elements.q.value.trim(), course: form.elements.course.value }));
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        go();
      });
      form.elements.course.addEventListener('change', go);
      if (query.q) {
        form.elements.q.focus();
        form.elements.q.setSelectionRange(99, 99);
      }
    },
  };
}

const safeUrl = (url) => (/^https?:\/\//i.test(url ?? '') ? url : '');

const authorCard = (author) => html`
  <div class="author">
    <a class="author-main" href="/comunidade/${author.slug}">
      ${avatar(author)}
      <span><strong>${author.name}</strong><small class="meta">${author.course} · ${author.year}</small></span>
    </a>
    ${contactLinks(author)}
  </div>`;

export async function projectDetailPage({ params }) {
  const [p] = await Promise.all([api.project(params.slug), session.ready]);
  const me = session.user;
  const mine = me && p.authors.some((a) => a.id === me.id);
  const link = safeUrl(p.link);

  return {
    title: p.title,
    view: html`<article class="wrap section" style="padding-top:32px">
      <a class="back muted" href="/projetos">${icon('arrow-left')} Todos os projetos</a>
      <div style="margin:16px 0 28px">${cover(p, true)}</div>
      <div class="detail">
        <div>
          <span class="eyebrow">${p.course} · ${p.year}</span>
          <h1>${p.title}</h1>
          ${p.subtitle ? html`<p class="lead muted" style="font-size:1.2rem">${p.subtitle}</p>` : ''}
          <p class="meta">Publicado em ${fmtDate(p.createdAt)}</p>
          <div class="chips" style="margin:16px 0">
            ${p.tags.map((t) => html`<a class="chip" href="/projetos?tag=${encodeURIComponent(t)}">${t}</a>`)}
          </div>
          <p><strong>${p.summary}</strong></p>
          ${p.description ? html`<p class="prose muted">${p.description}</p>` : ''}
          <div class="row" style="margin-top:24px">
            <button class="btn ghost" data-like aria-pressed="${String(p.liked)}">${icon('heart')} <span>${p.likes}</span></button>
            ${link ? html`<a class="btn" href="${link}" target="_blank" rel="noopener noreferrer">${icon('external')} Abrir projeto</a>` : ''}
            ${mine ? html`<a class="btn ghost" href="/projetos/${p.slug}/editar">${icon('pencil')} Editar</a>` : ''}
            ${mine ? html`<button class="btn danger sm" data-delete>${icon('trash')} Excluir</button>` : ''}
          </div>
        </div>
        <aside>
          <h2 class="aside-title">${p.authors.length > 1 ? 'Autores' : 'Autor(a)'}</h2>
          ${p.authors.map(authorCard)}
        </aside>
      </div>
    </article>`,
    mount(root) {
      const likeBtn = root.querySelector('[data-like]');
      likeBtn.onclick = async () => {
        if (!session.user) {
          toast('Entre para curtir projetos.', true);
          return navigate(`/entrar?next=${location.pathname}`);
        }
        const r = await api.like(p.slug);
        likeBtn.querySelector('span').textContent = r.likes;
        likeBtn.setAttribute('aria-pressed', String(r.liked));
        likeBtn.classList.remove('pop');
        void likeBtn.offsetWidth;
        if (r.liked) likeBtn.classList.add('pop');
      };
      root.querySelector('[data-delete]')?.addEventListener('click', async () => {
        if (!confirm('Excluir este projeto definitivamente?')) return;
        await api.removeProject(p.slug);
        toast('Projeto excluído.');
        navigate('/projetos');
      });
    },
  };
}

/** Formulário usado para publicar e para editar (mesmos campos; "values" preenche o que já existe). */
const projectForm = (meta, values, submitLabel) => html`
  <form class="form" data-form novalidate>
    ${imageField({
      name: 'image',
      label: 'Foto do projeto',
      hint: 'Aparece no card e na página do projeto (recorte 16:9 automático). JPG, PNG ou WebP.',
      value: values.image,
    })}
    <label>Título<input name="title" required maxlength="80" value="${values.title}" placeholder="Ex.: Agenda ETEC"></label>
    <label>Subtítulo (opcional)<input name="subtitle" maxlength="120" value="${values.subtitle}"></label>
    <div class="grid g2">
      <label>Curso<select name="course">${options(meta.courses, values.course)}</select></label>
      <label>Ano<select name="year">${options(meta.years, values.year)}</select></label>
    </div>
    <label>Resumo<textarea name="summary" rows="3" maxlength="300" required placeholder="Em poucas linhas, o que é o projeto?">${values.summary}</textarea></label>
    <label>Descrição completa (opcional)<textarea name="description" rows="7" maxlength="4000">${values.description}</textarea></label>
    <label>Tags (separadas por vírgula)<input name="tags" value="${values.tags}" placeholder="Inovação, React, Design"></label>
    <label>Link do projeto (opcional)
      <input name="link" type="url" maxlength="500" value="${values.link}" placeholder="https://">
      <span class="meta">Site, repositório (GitHub), vídeo ou apresentação.</span>
    </label>
    <button class="btn" type="submit">${submitLabel}</button>
  </form>`;

const emptyValues = (user) => ({
  image: '',
  title: '',
  subtitle: '',
  summary: '',
  description: '',
  tags: '',
  link: '',
  course: user.course,
  year: user.year,
});

export async function publishPage() {
  await session.ready;
  if (!session.user) throw redirect('/entrar?next=/projetos/publicar');
  const meta = await api.meta();

  return {
    title: 'Publicar projeto',
    view: html`<section class="wrap section"><div class="wide">
      <span class="eyebrow">Publicar projeto</span><h1 style="font-size:2.2rem">Mostre o que você criou</h1>
      ${projectForm(meta, emptyValues(session.user), 'Publicar projeto')}
    </div></section>`,
    mount(root) {
      bindImageFields(root);
      bindForm(root.querySelector('[data-form]'), async (data) => {
        const created = await api.publish(data);
        toast('Projeto publicado!');
        navigate(`/projetos/${created.slug}`);
      });
    },
  };
}

export async function editProjectPage({ params }) {
  const [p, meta] = await Promise.all([api.project(params.slug), api.meta(), session.ready]);
  if (!session.user) throw redirect(`/entrar?next=/projetos/${params.slug}/editar`);
  if (!p.authors.some((a) => a.id === session.user.id)) {
    throw Object.assign(new Error('Apenas os autores podem editar este projeto.'), { status: 403 });
  }

  return {
    title: `Editar ${p.title}`,
    view: html`<section class="wrap section"><div class="wide">
      <a class="back muted" href="/projetos/${p.slug}">${icon('arrow-left')} Voltar ao projeto</a>
      <span class="eyebrow" style="display:block;margin-top:16px">Editar projeto</span>
      <h1 style="font-size:2.2rem">${p.title}</h1>
      ${projectForm(meta, { ...p, subtitle: p.subtitle ?? '', description: p.description ?? '', tags: p.tags.join(', ') }, 'Salvar alterações')}
    </div></section>`,
    mount(root) {
      bindImageFields(root);
      bindForm(root.querySelector('[data-form]'), async (data) => {
        await api.updateProject(p.slug, data);
        toast('Projeto atualizado!');
        navigate(`/projetos/${p.slug}`);
      });
    },
  };
}
