import { html, initials, hueOf, brandHue, ICONS, fmtDate } from '../lib/html.js';

export function toast(message, bad = false) {
  const el = document.createElement('div');
  el.className = `toast${bad ? ' bad' : ''}`;
  el.textContent = message;
  document.getElementById('toasts').append(el);

  setTimeout(() => {
    el.classList.add('out');
    setTimeout(() => el.remove(), 300);
  }, 3500);
}

// Fundo "aurora": azul e vermelho se aproximam e se encontram no roxo (só transform, sem repaint).
export const aurora = html`<div class="aurora" aria-hidden="true"><i></i><i></i><i></i></div>`;

export const avatar = (user, size = '') => {
  const sizeClass = size === true ? 'lg' : size;
  return html`<span
    class="avatar ${sizeClass}"
    style="background:hsl(${hueOf(user.name)} 60% 46%)"
    aria-hidden="true"
    >${initials(user.name)}</span
  >`;
};

export const cover = (project, big = false) => {
  const hue = brandHue(project.hue);
  const background = `linear-gradient(135deg,hsl(${hue} 72% 38%),hsl(${(hue + 40) % 360} 78% 52%))`;
  const featured = !big && project.featured ? html`<span class="badge">Destaque</span>` : '';
  const tag = big ? '' : html`<span class="tag">${project.course}</span>`;

  return html`<div
    class="cover${big ? ' big' : ''}"
    style="background:${background}"
    role="img"
    aria-label="Capa do projeto ${project.title}"
  >
    <span class="glyph">${ICONS[project.course] ?? '💡'}</span>${featured}${tag}
  </div>`;
};

export const authorsLine = (authors) => html`por
${authors.map((author, i) => html`${i ? ', ' : ''}<a href="/comunidade/${author.slug}"><strong>${author.name}</strong></a>`)}`;

export const projectCard = (p) => html`
  <article class="card pcard">
    <a href="/projetos/${p.slug}" aria-label="Abrir ${p.title}">${cover(p)}</a>
    <div class="body">
      <span class="meta">${p.year} · ${fmtDate(p.createdAt)}</span>
      <h3><a href="/projetos/${p.slug}">${p.title}</a></h3>
      ${p.subtitle ? html`<strong class="muted">${p.subtitle}</strong>` : ''}
      <p class="muted clamp">${p.summary}</p>
      <div class="chips">${p.tags.slice(0, 4).map((tag) => html`<span class="chip">${tag}</span>`)}</div>
      <div class="pfoot">
        <div class="by">
          <span class="stack">${p.authors.slice(0, 3).map((author) => avatar(author))}</span>
          <span class="meta authors">${authorsLine(p.authors)}</span>
        </div>
        <span class="likes" title="Curtidas">♥ ${p.likes}</span>
      </div>
    </div>
  </article>`;

export const memberCard = (m) => html`
  <a class="card mcard" href="/comunidade/${m.slug}">
    <div class="banner" style="--h:${hueOf(m.name)}"></div>
    ${avatar(m)}
    <div class="body">
      <h3>${m.name}</h3>
      <span class="meta">${m.course} · ${m.year}</span>
      <p class="muted clamp">${m.bio || 'Ainda sem bio.'}</p>
      <div class="chips">${m.skills.slice(0, 4).map((skill) => html`<span class="chip">${skill}</span>`)}</div>
      <span class="more">Ver perfil</span>
    </div>
  </a>`;

export const fieldError = (errors, name) =>
  errors?.[name] ? html`<span class="err">${errors[name]}</span>` : '';

export const options = (list, selected = '', placeholder) => html`
  ${placeholder ? html`<option value="">${placeholder}</option>` : ''}
  ${list.map((item) => html`<option ${item === selected ? 'selected' : ''}>${item}</option>`)}`;

/** Liga um <form> a um handler async, tratando loading e erros de validação do servidor. */
export function bindForm(form, onSubmit) {
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const button = form.querySelector('[type=submit]');
    button.disabled = true;
    button.classList.add('busy');
    form.querySelectorAll('.err,.alert').forEach((node) => node.remove());

    try {
      await onSubmit(Object.fromEntries(new FormData(form)));
    } catch (err) {
      for (const [name, message] of Object.entries(err.details ?? {})) {
        const field = form.elements[name];
        if (!field) continue;
        const span = document.createElement('span');
        span.className = 'err';
        span.textContent = message;
        field.closest('label').append(span);
      }
      const alert = document.createElement('div');
      alert.className = 'alert';
      alert.setAttribute('role', 'alert');
      alert.textContent = err.message;
      form.prepend(alert);
    } finally {
      button.disabled = false;
      button.classList.remove('busy');
    }
  });
}
