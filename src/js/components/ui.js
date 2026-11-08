import { html, raw, initials, hueOf, brandHue, fmtDate } from '../lib/html.js';
import { icon, courseIcon } from '../lib/icons.js';
import { toDataUrl } from '../lib/image.js';
import { api, assetUrl } from '../services/api.js';

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

/** Foto de perfil, ou as iniciais sobre uma cor da paleta quando a pessoa ainda não enviou foto. */
export const avatar = (user, size = '') => {
  const classes = `avatar ${size === true ? 'lg' : size}`.trim();
  if (user.avatar) {
    return html`<img class="${classes}" src="${assetUrl(user.avatar)}" alt="" loading="lazy" decoding="async">`;
  }
  return html`<span class="${classes}" style="background:hsl(${hueOf(user.name)} 60% 46%)" aria-hidden="true">${initials(user.name)}</span>`;
};

/** Capa do projeto: a foto enviada ou, sem foto, um gradiente da paleta com o ícone do curso. */
export const cover = (project, big = false) => {
  const hue = brandHue(project.hue);
  const background = `linear-gradient(135deg,hsl(${hue} 72% 38%),hsl(${(hue + 40) % 360} 78% 52%))`;
  const featured = !big && project.featured ? html`<span class="badge">Destaque</span>` : '';
  const tag = big ? '' : html`<span class="tag">${project.course}</span>`;
  const content = project.image
    ? html`<img src="${assetUrl(project.image)}" alt="" decoding="async" ${raw(big ? 'fetchpriority="high"' : 'loading="lazy"')}>`
    : html`<span class="glyph">${icon(courseIcon(project.course))}</span>`;

  return html`<div
    class="cover${big ? ' big' : ''}${project.image ? ' has-img' : ''}"
    style="background:${background}"
    role="img"
    aria-label="Capa do projeto ${project.title}"
  >${content}${featured}${tag}</div>`;
};

/** Botões de contato (Instagram, LinkedIn, e-mail). Só aparece o que a pessoa escolheu divulgar. */
export const contactLinks = (user, { labels = false } = {}) => {
  const links = [
    user.instagram && ['instagram', 'Instagram', `https://instagram.com/${user.instagram}`],
    user.linkedin && ['linkedin', 'LinkedIn', `https://www.linkedin.com/in/${user.linkedin}`],
    user.contactEmail && ['mail', 'E-mail', `mailto:${user.contactEmail}`],
  ].filter(Boolean);
  if (!links.length) return '';

  return html`<div class="socials">${links.map(
    ([name, label, href]) => html`<a
      class="soc${labels ? ' wide' : ''}"
      href="${href}"
      aria-label="${label} de ${user.name}"
      title="${label}"
      ${raw(name === 'mail' ? '' : 'target="_blank" rel="noopener noreferrer"')}
      >${icon(name)}${labels ? html`<span>${label}</span>` : ''}</a>`,
  )}</div>`;
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
        <span class="likes" title="Curtidas">${icon('heart')} ${p.likes}</span>
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
      <span class="more">Ver perfil ${icon('arrow-right')}</span>
    </div>
  </a>`;

export const fieldError = (errors, name) =>
  errors?.[name] ? html`<span class="err">${errors[name]}</span>` : '';

export const options = (list, selected = '', placeholder) => html`
  ${placeholder ? html`<option value="">${placeholder}</option>` : ''}
  ${list.map((item) => html`<option ${item === selected ? 'selected' : ''}>${item}</option>`)}`;

/**
 * Campo de foto: a imagem é reduzida no navegador e enviada assim que escolhida; o formulário só guarda
 * a referência devolvida pela API (campo oculto "name"). `round` = foto de perfil (quadrada, exibida redonda).
 */
export const imageField = ({ name, label, hint, value = '', round = false }) => html`
  <div class="imgfield${round ? ' round' : ''}" data-imgfield data-round="${round}">
    <div class="imgfield-preview" data-preview>
      ${value ? html`<img src="${assetUrl(value)}" alt="">` : icon('image', 30)}
    </div>
    <div class="imgfield-body">
      <strong>${label}</strong>
      <p class="meta">${hint}</p>
      <div class="row">
        <label class="btn ghost sm">
          ${icon('camera')} <span data-pick>${value ? 'Trocar imagem' : 'Escolher imagem'}</span>
          <input type="file" accept="image/png,image/jpeg,image/webp" hidden data-file>
        </label>
        <button class="btn ghost sm" type="button" data-clear ${value ? '' : 'hidden'}>Remover</button>
      </div>
      <input type="hidden" name="${name}" value="${value}" data-value>
      <span class="err" data-error hidden></span>
    </div>
  </div>`;

export function bindImageFields(root) {
  for (const field of root.querySelectorAll('[data-imgfield]')) {
    const size = field.dataset.round === 'true' ? { width: 320, height: 320 } : { width: 1280, height: 720 };
    const [file, value, preview, clear, error, pick] = [
      'file',
      'value',
      'preview',
      'clear',
      'error',
      'pick',
    ].map((key) => field.querySelector(`[data-${key}]`));
    const submit = field.closest('form')?.querySelector('[type=submit]');
    const placeholder = icon('image', 30).toString();

    const show = (src, hasImage) => {
      preview.innerHTML = src ? `<img src="${src}" alt="">` : placeholder;
      clear.hidden = !hasImage;
      pick.textContent = hasImage ? 'Trocar imagem' : 'Escolher imagem';
    };

    file.addEventListener('change', async () => {
      const chosen = file.files[0];
      file.value = '';
      if (!chosen) return;
      error.hidden = true;
      field.classList.add('busy');
      if (submit) submit.disabled = true; // evita publicar antes do envio terminar
      try {
        const dataUrl = await toDataUrl(chosen, size);
        value.value = (await api.uploadImage(dataUrl)).url;
        show(dataUrl, true);
      } catch (err) {
        error.textContent = err.message || 'Não foi possível enviar a imagem.';
        error.hidden = false;
      } finally {
        field.classList.remove('busy');
        if (submit) submit.disabled = false;
      }
    });

    clear.addEventListener('click', () => {
      value.value = '';
      show('', false);
    });
  }
}

/** Liga um <form> a um handler async, tratando loading e erros de validação do servidor. */
export function bindForm(form, onSubmit) {
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const button = form.querySelector('[type=submit]');
    button.disabled = true;
    button.classList.add('busy');
    form.querySelectorAll('.err:not([data-error]),.alert').forEach((node) => node.remove());

    try {
      await onSubmit(Object.fromEntries(new FormData(form)));
    } catch (err) {
      for (const [name, message] of Object.entries(err.details ?? {})) {
        const field = form.elements[name];
        if (!field) continue;
        const span = document.createElement('span');
        span.className = 'err';
        span.textContent = message;
        (field.closest('label') ?? field.parentElement).append(span);
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
