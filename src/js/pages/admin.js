import { html } from '../lib/html.js';
import { api } from '../services/api.js';
import { session } from '../services/session.js';
import { redirect } from '../router.js';
import { toast } from '../components/ui.js';

// A checagem abaixo é só experiência de uso (esconder o painel de quem não pode). Quem protege os dados é o backend:
// todos os endpoints /api/admin/* respondem 401/403 sem perfil ADMIN.
async function guard(path) {
  await session.ready;
  if (!session.user) throw redirect(`/entrar?next=${encodeURIComponent(path)}`);
  if (session.user.role !== 'ADMIN') throw redirect('/');
}

const PAGE_SIZE = 20;
const STATUS_LABEL = { PENDING: 'Pendente', APPROVED: 'Aprovada', REJECTED: 'Rejeitada', USED: 'Utilizada', REVOKED: 'Revogada', ACTIVE: 'Ativa', SUSPENDED: 'Suspensa' };
const badge = (status) => html`<span class="status" data-status="${status}">${STATUS_LABEL[status] ?? status}</span>`;
const stamp = (iso) => (iso ? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(iso)) : '—');
const INSTITUTION = { '012': 'ETEC Professor Camargo Aranha (012)' };
const btn = (act, id, label, cls = 'ghost') => html`<button class="btn ${cls} sm" type="button" data-act="${act}" data-id="${id}">${label}</button>`;

const NAV = [['/admin', 'Solicitações'], ['/admin/autorizacoes', 'Autorizações'], ['/admin/usuarios', 'Usuários']];

const STATS = [['PENDING', 'Aguardando análise', 'warn'], ['APPROVED', 'Aprovadas (sem conta)', ''], ['USED', 'Cadastros concluídos', 'ok'], ['REJECTED', 'Rejeitadas', '']];

/**
 * Fábrica das telas de listagem: filtro por status, busca, paginação e ações, todas ligadas aos endpoints reais.
 * `act` mapeia data-act → { confirm?, run(item), done }.
 */
function listPage({ path, title, lead, statuses, columns, fetch, actions, withStats = false, empty }) {
  return async function page() {
    await guard(path);
    return {
      title,
      view: html`<section class="wrap section admin">
        <span class="eyebrow">Administração</span><h1 style="font-size:2.1rem">${title}</h1><p class="muted">${lead}</p>
        <nav class="chips" aria-label="Seções da administração">${NAV.map(([href, label]) => html`<a class="chip ${href === path ? 'on' : ''}" href="${href}">${label}</a>`)}</nav>
        ${withStats ? html`<div class="stats" data-stats></div>` : ''}
        <div class="toolbar"><input type="search" data-q placeholder="Buscar por nome ou e-mail" aria-label="Buscar por nome ou e-mail" maxlength="100">
          <select data-status aria-label="Filtrar por status"><option value="">Todos os status</option>${statuses.map((s) => html`<option value="${s}">${STATUS_LABEL[s]}</option>`)}</select></div>
        <div data-list aria-live="polite"></div>
        <dialog class="admin-dialog" data-dialog></dialog>
      </section>`,
      mount(root) {
        const state = { q: '', status: '', offset: 0 };
        const items = new Map();
        const list = root.querySelector('[data-list]');
        let seq = 0;

        const loadStats = async () => {
          if (!withStats) return;
          try {
            const { requests, users } = await api.admin.summary();
            root.querySelector('[data-stats]').innerHTML = [
              ...STATS.map(([key, label, tone]) => html`<div class="stat ${tone}"><strong>${requests[key]}</strong><span>${label}</span></div>`),
              html`<div class="stat"><strong>${users}</strong><span>Contas na plataforma</span></div>`,
            ].join('');
          } catch { /* os indicadores são secundários: a lista mostra o erro */ }
        };

        const load = async () => {
          const mine = ++seq; // ignora respostas antigas se o filtro mudou no meio
          list.innerHTML = '<div class="loader" role="status" aria-label="Carregando"><i></i><i></i></div>';
          try {
            const { items: rows, total } = await fetch({ q: state.q, status: state.status, limit: PAGE_SIZE, offset: state.offset });
            if (mine !== seq) return;
            items.clear();
            rows.forEach((row) => items.set(row.id, row));
            const to = state.offset + rows.length;
            list.innerHTML = rows.length
              ? html`<div class="table-wrap"><table class="table"><thead><tr>${columns.map(([label]) => html`<th scope="col">${label}</th>`)}<th scope="col"><span class="sr">Ações</span></th></tr></thead>
                  <tbody>${rows.map((row) => html`<tr>${columns.map(([label, cell]) => html`<td data-label="${label}">${cell(row)}</td>`)}<td class="acts">${actions(row)}</td></tr>`)}</tbody></table></div>
                  <div class="pager"><span class="meta">${state.offset + 1}–${to} de ${total}</span>
                    <span><button class="btn ghost sm" type="button" data-page="-1" ${state.offset === 0 ? 'disabled' : ''}>Anterior</button>
                    <button class="btn ghost sm" type="button" data-page="1" ${to >= total ? 'disabled' : ''}>Próxima</button></span></div>`.toString()
              : html`<div class="empty">${empty}</div>`.toString();
          } catch (err) {
            if (mine === seq) list.innerHTML = html`<div class="alert" role="alert">${err.message}</div>`.toString();
          }
        };

        let timer;
        root.querySelector('[data-q]').addEventListener('input', (e) => {
          clearTimeout(timer);
          timer = setTimeout(() => { state.q = e.target.value.trim(); state.offset = 0; load(); }, 300);
        });
        root.querySelector('[data-status]').addEventListener('change', (e) => { state.status = e.target.value; state.offset = 0; load(); });

        const dialog = root.querySelector('[data-dialog]');
        root.addEventListener('click', async (e) => {
          const pager = e.target.closest('[data-page]');
          if (pager) { state.offset = Math.max(0, state.offset + Number(pager.dataset.page) * PAGE_SIZE); return load(); }
          if (e.target.closest('[data-close]')) return dialog.close();
          const button = e.target.closest('[data-act]');
          if (!button) return;
          const item = items.get(button.dataset.id);
          const act = ACTIONS[button.dataset.act];
          if (!item || !act) return;
          if (act.confirm && !confirm(act.confirm(item))) return;
          button.disabled = true;
          try {
            const result = await act.run(item);
            if (act.show) { dialog.innerHTML = act.show(result).toString(); dialog.showModal(); }
            else { toast(act.done(item)); await Promise.all([load(), loadStats()]); }
          } catch (err) {
            toast(err.message, true); // transições inválidas, falta de permissão e falhas de rede chegam daqui
            await load();
          } finally { button.disabled = false; }
        });

        load();
        loadStats();
      },
    };
  };
}

const ACTIONS = {
  approve: {
    confirm: (r) => `Aprovar ${r.name}? O e-mail ${r.email} poderá criar uma conta (uma única vez).`,
    run: (r) => api.admin.approve(r.id), done: (r) => `Aprovada: ${r.email} já pode se cadastrar.`,
  },
  reject: {
    confirm: (r) => `Rejeitar a solicitação de ${r.name}?`,
    run: (r) => api.admin.reject(r.id), done: () => 'Solicitação rejeitada.',
  },
  revoke: {
    confirm: (a) => `Revogar a autorização de ${a.email}? Ele não poderá mais criar a conta.`,
    run: (a) => api.admin.revoke(a.authorizationId ?? a.id), done: (a) => `Autorização revogada: ${a.email}.`,
  },
  suspend: {
    confirm: (u) => `Suspender a conta de ${u.name}? Ela perde o acesso imediatamente e sai do diretório público.`,
    run: (u) => api.admin.suspend(u.id), done: (u) => `Conta suspensa: ${u.name}.`,
  },
  reactivate: { run: (u) => api.admin.reactivate(u.id), done: (u) => `Conta reativada: ${u.name}.` },
  details: {
    run: (r) => api.admin.request(r.id), // consulta o detalhe no backend
    show: (r) => html`<h2 style="font-size:1.3rem">${r.name}</h2>
      <dl class="facts"><dt>E-mail</dt><dd>${r.email}</dd><dt>Instituição</dt><dd>${INSTITUTION[r.institution] ?? r.institution}</dd>
        <dt>Solicitada em</dt><dd>${stamp(r.createdAt)}</dd><dt>Status</dt><dd>${badge(r.status)}</dd>
        <dt>Decisão</dt><dd>${r.decidedAt ? `${stamp(r.decidedAt)}${r.decidedByName ? ` · por ${r.decidedByName}` : ''}` : 'Ainda sem decisão'}</dd></dl>
      <button class="btn ghost sm" type="button" data-close>Fechar</button>`,
  },
};

export const adminRequestsPage = listPage({
  path: '/admin', title: 'Solicitações de acesso', lead: 'Analise os pedidos e libere (ou não) o cadastro de cada aluno.',
  statuses: ['PENDING', 'APPROVED', 'REJECTED', 'USED', 'REVOKED'], withStats: true, empty: 'Nenhuma solicitação encontrada.',
  fetch: (f) => api.admin.requests(f),
  columns: [['Nome', (r) => r.name], ['E-mail', (r) => r.email], ['Instituição', (r) => INSTITUTION[r.institution] ?? r.institution], ['Solicitada em', (r) => stamp(r.createdAt)], ['Status', (r) => badge(r.status)]],
  actions: (r) => html`${btn('details', r.id, 'Detalhes')}${r.status === 'PENDING' ? html`${btn('approve', r.id, 'Aprovar', '')}${btn('reject', r.id, 'Rejeitar', 'ghost danger')}` : ''}${r.status === 'APPROVED' ? btn('revoke', r.id, 'Revogar', 'ghost danger') : ''}`,
});

export const adminAuthorizationsPage = listPage({
  path: '/admin/autorizacoes', title: 'Autorizações de cadastro', lead: 'E-mails liberados para criar conta, os já utilizados e os revogados.',
  statuses: ['APPROVED', 'USED', 'REVOKED'], empty: 'Nenhuma autorização encontrada.',
  fetch: (f) => api.admin.authorizations(f),
  columns: [['Nome', (a) => a.name], ['E-mail', (a) => a.email], ['Aprovada em', (a) => `${stamp(a.approvedAt)}${a.approvedByName ? ` · ${a.approvedByName}` : ''}`], ['Utilizada em', (a) => stamp(a.usedAt)], ['Status', (a) => badge(a.status)]],
  actions: (a) => (a.status === 'APPROVED' ? btn('revoke', a.id, 'Revogar', 'ghost danger') : ''),
});

export const adminUsersPage = listPage({
  path: '/admin/usuarios', title: 'Usuários cadastrados', lead: 'Contas existentes. Contas suspensas perdem o acesso na hora.',
  statuses: ['ACTIVE', 'SUSPENDED'], empty: 'Nenhum usuário encontrado.',
  fetch: (f) => api.admin.users(f),
  columns: [['Nome', (u) => u.name], ['E-mail', (u) => u.email], ['Curso', (u) => `${u.course} · ${u.year}`], ['Perfil', (u) => (u.role === 'ADMIN' ? 'Administrador' : 'Aluno')], ['Situação', (u) => badge(u.status)], ['Cadastro', (u) => stamp(u.createdAt)]],
  actions: (u) => (u.role === 'ADMIN' || u.id === session.user?.id ? '' : u.status === 'SUSPENDED' ? btn('reactivate', u.id, 'Reativar', '') : btn('suspend', u.id, 'Suspender', 'ghost danger')),
});
