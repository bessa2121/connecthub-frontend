import { html } from '../lib/html.js';
import { api, ApiError } from '../services/api.js';
import { session } from '../services/session.js';
import { redirect } from '../router.js';
import { aurora, bindForm } from '../components/ui.js';
import { mountNetwork } from '../components/network.js';

// Código institucional: só IDENTIFICA a escola (não é senha). Hoje a plataforma atende apenas a ETEC 012.
const INSTITUTIONS = [['012', 'ETEC Professor Camargo Aranha']];
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export async function accessRequestPage() {
  await session.ready;
  if (session.user) throw redirect('/');
  return {
    title: 'Solicitar acesso',
    view: html`<section class="wrap section"><div class="auth"><aside class="auth-art">${aurora}<canvas aria-hidden="true" data-net></canvas><p>Seu projeto merece ser visto. Peça seu acesso.</p></aside><div class="narrow">
      <h1 style="font-size:2rem">Solicitar acesso</h1>
      <p class="muted">O ConnectHub é aberto aos alunos da ETEC. Informe seus dados: nossa equipe analisa o pedido e, se for aprovado, você poderá criar sua conta com o mesmo e-mail.</p>
      <form class="form" data-form novalidate>
        <label>Nome completo<input name="name" autocomplete="name" maxlength="80" required></label>
        <label>E-mail<input name="email" type="email" autocomplete="email" maxlength="120" required></label>
        <label>Confirme o e-mail<input name="emailConfirm" type="email" autocomplete="off" maxlength="120" required></label>
        <label>Instituição de ensino<select name="institution">${INSTITUTIONS.map(([code, name]) => html`<option value="${code}">${name}</option>`)}</select></label>
        <label class="hp" aria-hidden="true">Site<input name="website" tabindex="-1" autocomplete="off"></label>
        <button class="btn" type="submit">Enviar solicitação</button>
        <p class="meta" style="margin:0"><strong>Como usamos seus dados.</strong> Nome e e-mail são usados apenas para analisar seu pedido de acesso e, se aprovado, para confirmar seu e-mail no cadastro. Só os administradores da plataforma os veem. Pedidos rejeitados são apagados após um período de retenção. Responsável pelo tratamento: coordenação do ConnectHub (ETEC Camargo Aranha). Detalhes na <a href="/privacidade"><strong>Política de Privacidade</strong></a>.</p>
        <p class="meta center" style="margin:0">Já foi aprovado? <a href="/cadastro"><strong>Crie sua conta</strong></a> · Já tem conta? <a href="/entrar"><strong>Entrar</strong></a></p>
      </form></div></div></section>`,
    mount: (root) => {
      mountNetwork(root.querySelector('[data-net]'), { density: 0.6 });
      const form = root.querySelector('[data-form]');
      bindForm(form, async (data) => {
        const details = {};
        if (data.name.trim().length < 2) details.name = 'Informe seu nome completo.';
        if (!EMAIL.test(data.email.trim())) details.email = 'E-mail inválido.';
        else if (data.email.trim().toLowerCase() !== data.emailConfirm.trim().toLowerCase()) details.emailConfirm = 'Os e-mails não coincidem.';
        if (Object.keys(details).length) throw new ApiError('Verifique os campos.', 400, details);
        const { message } = await api.requestAccess(data);
        // Mensagem do servidor: idêntica para qualquer e-mail (não revela se ele já foi autorizado).
        form.outerHTML = html`<div class="form" role="status"><h2 style="font-size:1.4rem;margin:0">Solicitação recebida</h2><p style="margin:0">${message}</p><a class="btn ghost" href="/">Voltar ao início</a></div>`.toString();
      });
    },
  };
}
