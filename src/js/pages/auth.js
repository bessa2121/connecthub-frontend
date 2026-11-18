import { html } from '../lib/html.js';
import { api } from '../services/api.js';
import { session } from '../services/session.js';
import { navigate, redirect } from '../router.js';
import { aurora, bindForm, options, toast } from '../components/ui.js';
import { mountNetwork } from '../components/network.js';

const safeNext = (n) => (n && n.startsWith('/') && !n.startsWith('//') ? n : '/');

export async function loginPage({ query }) {
  await session.ready;
  if (session.user) throw redirect('/');
  return {
    title: 'Entrar',
    view: html`<section class="wrap section"><div class="auth"><aside class="auth-art">${aurora}<canvas aria-hidden="true" data-net></canvas><p>Cada projeto é um convite para conversar.</p></aside><div class="narrow">
      <h1 style="font-size:2rem">Entrar</h1><p class="muted">Acesse sua conta para publicar projetos e curtir ideias.</p>
      <form class="form" data-form novalidate>
        <label>E-mail<input name="email" type="email" autocomplete="email" required></label>
        <label>Senha<input name="password" type="password" autocomplete="current-password" required></label>
        <button class="btn" type="submit">Entrar</button>
        <p class="meta center" style="margin:0">Novo por aqui? <a href="/solicitar-acesso"><strong>Solicite acesso</strong></a> · Já foi aprovado? <a href="/cadastro"><strong>Crie sua conta</strong></a></p>
      </form>
      <p class="meta center" style="margin-top:16px">Demonstração: <code>lucas@exemplo.com</code> / <code>connecthub123</code></p>
    </div></div></section>`,
    mount: (root) => {
      mountNetwork(root.querySelector('[data-net]'), { density: 0.6 });
      bindForm(root.querySelector('[data-form]'), async (data) => {
        session.start(await api.login(data));
        toast('Bem-vindo de volta!');
        navigate(safeNext(query.next));
      });
    },
  };
}

const RESEND_SECONDS = 60;

/** Cadastro em duas etapas: dados → código enviado por e-mail → conta criada. A autorização é decidida só pelo backend. */
export async function registerPage() {
  await session.ready;
  if (session.user) throw redirect('/');
  const meta = await api.meta();
  return {
    title: 'Cadastro',
    view: html`<section class="wrap section"><div class="auth"><aside class="auth-art">${aurora}<canvas aria-hidden="true" data-net></canvas><p>Cada projeto é um convite para conversar.</p></aside><div class="narrow">
      <h1 style="font-size:2rem">Criar conta</h1><p class="muted" data-lead>Use o e-mail aprovado na sua solicitação de acesso.</p>
      <form class="form" data-form="data" novalidate>
        <label>Nome completo<input name="name" autocomplete="name" required></label>
        <label>E-mail aprovado<input name="email" type="email" autocomplete="email" required></label>
        <label>Senha (mín. 8 caracteres)<input name="password" type="password" autocomplete="new-password" required></label>
        <div class="grid g2"><label>Curso<select name="course">${options(meta.courses, '', 'Selecione')}</select></label>
          <label>Ano<select name="year">${options(meta.years, '', 'Selecione')}</select></label></div>
        <label>Habilidades (opcional, separadas por vírgula)<input name="skills" placeholder="Design, React, Redação"></label>
        <button class="btn" type="submit">Continuar</button>
        <p class="meta center" style="margin:0">Ainda não tem acesso? <a href="/solicitar-acesso"><strong>Solicite aqui</strong></a>.</p>
        <p class="meta center" style="margin:0">Ao se cadastrar você concorda com os <a href="/termos"><strong>Termos</strong></a> e a <a href="/privacidade"><strong>Privacidade</strong></a>.</p>
      </form>
      <form class="form" data-form="code" novalidate hidden>
        <p style="margin:0">Se <strong data-email></strong> estiver autorizado, enviamos um código de 6 dígitos para esse endereço. Ele vale por 10 minutos.</p>
        <label>Código de confirmação<input name="code" inputmode="numeric" autocomplete="one-time-code" maxlength="6" pattern="[0-9]{6}" placeholder="000000" required></label>
        <button class="btn" type="submit">Confirmar e criar conta</button>
        <div class="row" style="justify-content:space-between;gap:12px">
          <button class="btn ghost sm" type="button" data-resend disabled></button>
          <button class="btn ghost sm" type="button" data-back>Corrigir dados</button>
        </div>
        <p class="meta" style="margin:0">Não chegou? Veja o spam. O código só é enviado para e-mails com acesso aprovado: se ainda não pediu, <a href="/solicitar-acesso"><strong>solicite acesso</strong></a>.</p>
      </form></div></div></section>`,
    mount: (root) => {
      mountNetwork(root.querySelector('[data-net]'), { density: 0.6 });
      const [dataForm, codeForm] = ['data', 'code'].map((name) => root.querySelector(`[data-form="${name}"]`));
      const resend = codeForm.querySelector('[data-resend]');
      let account, timer;

      const countdown = () => {
        clearInterval(timer);
        let left = RESEND_SECONDS;
        const tick = () => {
          if (!resend.isConnected) return clearInterval(timer); // saiu da página
          resend.disabled = left > 0;
          resend.textContent = left > 0 ? `Reenviar código em ${left}s` : 'Reenviar código';
          left--;
        };
        tick();
        timer = setInterval(tick, 1000);
      };

      bindForm(dataForm, async (data) => {
        const { message } = await api.register(data); // etapa 1: valida e, se autorizado, envia o código (resposta igual para qualquer e-mail)
        account = data;
        codeForm.querySelector('[data-email]').textContent = data.email.trim().toLowerCase();
        dataForm.hidden = true;
        codeForm.hidden = false;
        root.querySelector('[data-lead]').textContent = 'Confirme seu e-mail para finalizar.';
        countdown();
        codeForm.elements.code.focus();
        toast(message);
      });

      bindForm(codeForm, async ({ code }) => {
        const { verificationToken } = await api.verifyEmail({ email: account.email, code: code.trim() });
        session.start(await api.register({ ...account, verificationToken })); // etapa 2: cria a conta e consome a autorização
        toast('Conta criada com sucesso!');
        navigate('/');
      });

      resend.addEventListener('click', async () => {
        resend.disabled = true;
        try {
          toast((await api.resendVerification({ email: account.email })).message);
        } catch (err) {
          toast(err.message, true);
        }
        countdown();
      });
      codeForm.querySelector('[data-back]').addEventListener('click', () => {
        clearInterval(timer);
        codeForm.hidden = true;
        dataForm.hidden = false;
        root.querySelector('[data-lead]').textContent = 'Use o e-mail aprovado na sua solicitação de acesso.';
      });
    },
  };
}
