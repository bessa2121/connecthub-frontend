import { html } from '../lib/html.js';

const doc =
  (title, ...blocks) =>
  () => ({
    title,
    view: html`<section class="wrap section"><div class="wide"><h1 style="font-size:2.2rem">${title}</h1>${blocks.map(([h, t]) => html`<h3 style="margin-top:1.6em">${h}</h3><p class="muted">${t}</p>`)}</div></section>`,
  });

export const aboutPage = doc(
  'Sobre o projeto',
  [
    'O que é',
    'O ConnectHub é uma plataforma de divulgação de projetos e conexão entre alunos da ETEC Camargo Aranha, reunindo estudantes de Nutrição, Gastronomia, Desenvolvimento de Sistemas, Marketing e Eventos.',
  ],
  [
    'Nossa proposta',
    'Dar visibilidade a trabalhos acadêmicos, aproximar pessoas de cursos diferentes e transformar ideias em oportunidades reais de colaboração.',
  ],
);
export const privacyPage = doc(
  'Política de Privacidade',
  [
    'Solicitação de acesso e confirmação de e-mail',
    'Para criar uma conta é preciso pedir acesso informando nome completo, e-mail e instituição. A finalidade é exclusivamente verificar se você é aluno da ETEC e confirmar que o e-mail é seu (enviamos um código de 6 dígitos, guardado apenas em forma de hash e válido por 10 minutos). Esses dados só são vistos pelos administradores da plataforma, indicados pela coordenação do projeto, que é a responsável pelo tratamento. Solicitações rejeitadas ou revogadas são apagadas automaticamente após 90 dias; os dados de quem cria conta passam a seguir as regras de conta abaixo. O código da escola (012) apenas identifica a instituição e não funciona como senha.',
  ],
  [
    'Fotos e contatos',
    'Foto de perfil, foto do projeto, Instagram, LinkedIn e e-mail de contato são opcionais e ficam visíveis para qualquer visitante, no seu perfil e nos seus projetos. O e-mail usado para entrar na conta nunca é exibido. Você pode alterar ou remover essas informações a qualquer momento em “Editar perfil” e “Editar projeto”. Alunos menores de idade devem divulgar contatos apenas com ciência dos responsáveis.',
  ],
  [
    'Dados coletados',
    'Coletamos nome, e-mail, curso, ano e as informações de perfil e projetos que você decidir publicar. O e-mail não é exibido publicamente.',
  ],
  [
    'Uso e proteção',
    'Os dados são usados apenas para o funcionamento da plataforma. Senhas são armazenadas com hash e nunca em texto puro.',
  ],
  [
    'Seus direitos',
    'Você pode editar seu perfil e excluir seus projetos a qualquer momento. Para outras solicitações, procure a coordenação do projeto.',
  ],
);
export const termsPage = doc(
  'Termos de Uso',
  [
    'Uso da plataforma',
    'O ConnectHub destina-se a alunos da ETEC Camargo Aranha. Publique apenas conteúdo de sua autoria ou que você tenha autorização para divulgar.',
  ],
  [
    'Conduta',
    'Seja respeitoso. Conteúdos ofensivos, discriminatórios ou ilegais poderão ser removidos pela coordenação.',
  ],
  [
    'Responsabilidade',
    'Cada autor é responsável pelo conteúdo que publica. A plataforma pode ser atualizada a qualquer momento.',
  ],
);
