/**
 * @file Estatísticas de uso com o Google Analytics 4 (propriedade "truco-e26e8-703bc", fluxo do app da Web "truco-de-turing", ID G-C39CQS6CGH).
 *
 * Regras:
 * - Só mede no site publicado (`https://welyngton.github.io`). Em localhost, no arquivo único aberto
 *   por `file://`, em forks publicados em outro endereço e nos testes automatizados (navegador
 *   controlado por WebDriver/Playwright) nada é carregado nem enviado.
 * - Só mede com consentimento. Na primeira visita aparece uma faixa com "Aceitar" e "Recusar"; a
 *   escolha fica neste aparelho (`localStorage`) e pode ser mudada na tela "Sobre". O script do
 *   Google só é baixado depois do "Aceitar".
 * - Sem sinais de publicidade (Google Signals e personalização de anúncios desligados).
 *
 * Os eventos do jogo (ver `EVENTOS`) passam por `registrarEvento`, que não faz nada enquanto a
 * medição estiver desligada.
 *
 * Jogadores diferentes: cada aparelho recebe um código anônimo e aleatório (`a-…`, guardado no
 * `localStorage`); quem entra numa conta passa a ser `c-<uid da conta>` e o uid vai também como
 * `user_id`, para o Google juntar os aparelhos da mesma pessoa. O código vai na propriedade do
 * usuário `id_jogador`, junto com o tipo de conta, a experiência, as conquistas e o avatar (ver
 * `PROPRIEDADES_DO_JOGADOR`). Nome, e-mail e nome na mesa nunca são enviados.
 */

/** ID da métrica do fluxo da Web no Google Analytics. */
export const ID_GOOGLE_ANALYTICS = 'G-C39CQS6CGH';

/** Endereços onde o jogo publicado mede (o do fluxo de dados no Google Analytics). */
export const HOSTS_MEDIDOS = ['welyngton.github.io'];

/** Chave do consentimento no `localStorage`: 'sim', 'nao' ou ausente (ainda não perguntado). */
export const CHAVE_DO_CONSENTIMENTO = 'truco-de-turing:estatisticas';

/**
 * Nomes dos eventos enviados. `jogoIniciado`, `jogoFinalizado`, `vitoria` e `derrota` têm os nomes
 * cadastrados em "Criar eventos" no Google Analytics (jogo_iniciado, jogo_finalizado,
 * vitoria_do_jogador, derrota_jogador). O jogo envia esses nomes direto, então lá não é preciso
 * regra nenhuma: uma regra que recria um evento com o próprio nome o conta em dobro.
 */
export const EVENTOS = {
  jogoIniciado: 'jogo_iniciado', // botão Jogar ou partida online
  jogoFinalizado: 'jogo_finalizado', // partida encerrada (alguém chegou aos tentos)
  vitoria: 'vitoria_do_jogador', // partida vencida por quem joga neste aparelho
  derrota: 'derrota_jogador', // partida perdida por quem joga neste aparelho
  fimDaMao: 'fim_mao',
  truco: 'truco',
  verbeteLido: 'verbete_lido',
  conquista: 'conquista', // conquista desbloqueada (id, nome, graduação, quantas a pessoa já tem)
  menuClique: 'menu_clique', // botões do menu inicial (botao: jogar, jogar_online, como_jogar…)
  menuOpcao: 'menu_opcao', // mudança numa escolha do menu (campo, valor)
  mesaClique: 'mesa_clique', // botões REGRAS e MENU da mesa e as opções das janelas deles
  acaoJogada: 'acao_jogada', // jogada de quem está neste aparelho (acao: ativar, tunagem, overfit…)
  jogoAbandonado: 'jogo_abandonado', // saiu da partida antes do fim
  dicas: 'dicas', // ligou ou desligou as dicas (ligadas: 1 ou 0)
  revisao: 'revisao_aberta', // abriu a revisão da mão ou da partida
  avatar: 'avatar_escolhido',
  audio: 'audio_alterado', // som ou música ligados/desligados
  login: 'login', // evento recomendado do GA4 (method: google, email, email_novo)
  logout: 'logout',
  salaOnline: 'sala_online', // criar, entrar ou começar uma sala
};

/**
 * Propriedades do usuário (no Google Analytics: dimensões personalizadas com escopo "Usuário").
 * `id_jogador` separa os jogadores; as outras ajudam a comparar grupos.
 */
export const PROPRIEDADES_DO_JOGADOR = ['id_jogador', 'tipo_conta', 'experiencia', 'conquistas', 'avatar', 'verbetes_lidos'];

/** Chave do código anônimo do aparelho no `localStorage`. */
export const CHAVE_DO_JOGADOR = 'truco-de-turing:id-jogador';

/** Estado do módulo: a janela onde o Analytics foi ligado (ou null). */
const estado = { janela: null, carregado: false, conta: null, perfil: {} };

/** Código anônimo deste aparelho (criado na primeira vez que a medição liga). */
export function idDoAparelho(janela = globalThis) {
  try {
    const salvo = janela.localStorage.getItem(CHAVE_DO_JOGADOR);
    if (salvo) return salvo;
  } catch (e) { /* sem armazenamento: código só desta visita */ }
  const cripto = janela.crypto;
  const novo = cripto && cripto.randomUUID ? cripto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36);
  try { janela.localStorage.setItem(CHAVE_DO_JOGADOR, novo); } catch (e) { /* idem */ }
  return novo;
}

/** Código do jogador enviado ao Google: `c-<uid>` com conta, `a-<código do aparelho>` sem. */
export function idDoJogador(janela = globalThis) {
  return estado.conta ? 'c-' + estado.conta : 'a-' + idDoAparelho(janela);
}

/** Envia ao gtag o `user_id` e as propriedades do jogador. */
function enviarJogador(janela) {
  janela.gtag('set', { user_id: estado.conta || null });
  janela.gtag('set', 'user_properties', { ...estado.perfil, id_jogador: idDoJogador(janela), tipo_conta: estado.perfil.tipo_conta || (estado.conta ? 'conta' : 'local') });
}

/**
 * Atualiza as propriedades do jogador (experiência, conquistas, avatar…). Guarda mesmo com a
 * medição desligada, para valer assim que ela ligar.
 * @param {object} dados Só os nomes de `PROPRIEDADES_DO_JOGADOR` são usados.
 */
export function atualizarJogador(dados) {
  for (const [k, v] of Object.entries(dados || {})) if (PROPRIEDADES_DO_JOGADOR.includes(k) && k !== 'id_jogador') estado.perfil[k] = v;
  if (medindo()) enviarJogador(estado.janela);
}

/**
 * Entrou numa conta (`uid` e o método) ou saiu dela (`uid` null). O uid do Firebase é aleatório e
 * não identifica a pessoa fora do jogo; nome e e-mail não são enviados.
 * @param {string|null} uid
 * @param {string} [metodo] 'google', 'email' ou 'email_novo'
 */
export function definirConta(uid, metodo) {
  const antes = estado.conta;
  estado.conta = uid || null;
  estado.perfil.tipo_conta = uid ? (metodo && metodo.startsWith('email') ? 'email' : metodo || 'conta') : 'local';
  if (!medindo()) return;
  if (uid) { enviarJogador(estado.janela); registrarEvento(EVENTOS.login, { method: metodo || 'conta' }); }
  else if (antes) { registrarEvento(EVENTOS.logout); enviarJogador(estado.janela); }
}

/**
 * O jogo está no site publicado, num navegador comum (não automatizado)?
 * @param {Window} [janela]
 * @returns {boolean}
 */
export function podeMedir(janela = globalThis) {
  const local = janela.location;
  if (!local || local.protocol !== 'https:' || !HOSTS_MEDIDOS.includes(local.hostname)) return false;
  return !(janela.navigator && janela.navigator.webdriver);
}

/** Lê a escolha guardada: 'sim', 'nao' ou null. */
export function consentimento(janela = globalThis) {
  try {
    const valor = janela.localStorage.getItem(CHAVE_DO_CONSENTIMENTO);
    return valor === 'sim' || valor === 'nao' ? valor : null;
  } catch (e) { return null; }
}

/** A medição está ligada agora (site publicado, consentimento dado e script carregado)? */
export function medindo() { return !!estado.janela && estado.carregado; }

/** Carrega o gtag.js e configura o fluxo, sem sinais de publicidade. */
function carregar(janela) {
  if (estado.carregado) return;
  janela.dataLayer = janela.dataLayer || [];
  janela.gtag = janela.gtag || function gtag() { janela.dataLayer.push(arguments); };
  janela.gtag('consent', 'default', { analytics_storage: 'granted', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' });
  janela.gtag('js', new Date());
  enviarJogador(janela);
  janela.gtag('config', ID_GOOGLE_ANALYTICS, { allow_google_signals: false, allow_ad_personalization_signals: false });
  const script = janela.document.createElement('script');
  script.async = true;
  script.src = 'https://www.googletagmanager.com/gtag/js?id=' + ID_GOOGLE_ANALYTICS;
  janela.document.head.appendChild(script);
  estado.janela = janela;
  estado.carregado = true;
}

/** Apaga os cookies do Google Analytics (`_ga`, `_ga_…`) deste site. */
function apagarCookies(janela) {
  const doc = janela.document;
  for (const parte of String(doc.cookie || '').split(';')) {
    const nome = parte.split('=')[0].trim();
    if (!/^_ga(_|$)/.test(nome)) continue;
    for (const dominio of ['', '; domain=' + janela.location.hostname, '; domain=.' + janela.location.hostname]) {
      doc.cookie = nome + '=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/' + dominio;
    }
  }
}

/**
 * Guarda a escolha da pessoa e liga ou desliga a medição na hora.
 * @param {'sim'|'nao'} escolha
 * @param {Window} [janela]
 */
export function definirConsentimento(escolha, janela = globalThis) {
  try { janela.localStorage.setItem(CHAVE_DO_CONSENTIMENTO, escolha); } catch (e) { /* sem armazenamento: vale só nesta visita */ }
  removerFaixa(janela);
  if (!podeMedir(janela)) return;
  if (escolha === 'sim') {
    if (estado.carregado) janela.gtag('consent', 'update', { analytics_storage: 'granted' });
    else carregar(janela);
    estado.janela = janela;
  } else {
    if (estado.carregado) janela.gtag('consent', 'update', { analytics_storage: 'denied' });
    estado.janela = null;
    apagarCookies(janela);
    try { janela.localStorage.removeItem(CHAVE_DO_JOGADOR); } catch (e) { /* sem armazenamento */ }
  }
}

/** Texto da faixa de consentimento (também usado na tela "Sobre"). */
export const TEXTO_DAS_ESTATISTICAS = 'O Truco de Turing usa o Google Analytics para entender como o jogo é jogado (partidas, jogadas, botões, verbetes lidos e conquistas) e, assim, melhorá-lo. Cada jogador é contado por um código anônimo, deste aparelho ou da conta; nome e e-mail não são enviados. Ele guarda um cookie neste aparelho e não usa nada para publicidade.';

/** Mostra a faixa de consentimento no rodapé da página. */
function mostrarFaixa(janela) {
  const doc = janela.document;
  if (doc.getElementById('faixa-estatisticas')) return;
  const faixa = doc.createElement('div');
  faixa.id = 'faixa-estatisticas';
  faixa.className = 'faixa-estatisticas';
  faixa.setAttribute('role', 'dialog');
  faixa.setAttribute('aria-label', 'Estatísticas de uso');
  faixa.innerHTML = '<p>' + TEXTO_DAS_ESTATISTICAS + ' Você pode mudar a escolha na tela "Sobre".</p>' +
    '<div class="faixa-estatisticas-botoes"><button class="botao pequeno" data-escolha="sim">Aceitar</button>' +
    '<button class="botao pequeno discreto" data-escolha="nao">Recusar</button></div>';
  faixa.querySelectorAll('[data-escolha]').forEach((b) => b.addEventListener('click', () => definirConsentimento(b.dataset.escolha, janela)));
  doc.body.appendChild(faixa);
}

function removerFaixa(janela) {
  const faixa = janela.document && janela.document.getElementById('faixa-estatisticas');
  if (faixa) faixa.remove();
}

/**
 * Liga a medição se a pessoa já aceitou; na primeira visita, pergunta. Fora do site publicado,
 * não faz nada.
 * @param {Window} [janela]
 */
export function iniciarAnalise(janela = globalThis) {
  if (!podeMedir(janela)) return;
  const escolha = consentimento(janela);
  if (escolha === 'sim') carregar(janela);
  else if (escolha === null) mostrarFaixa(janela);
}

/**
 * Envia um evento do jogo ao Google Analytics (se a medição estiver ligada).
 * @param {string} nome Nome do evento (minúsculas e _, até 40 caracteres).
 * @param {object} [dados] Parâmetros (texto curto ou número).
 */
export function registrarEvento(nome, dados = {}) {
  if (!medindo()) return;
  try { estado.janela.gtag('event', nome, dados); } catch (e) { /* estatística nunca atrapalha o jogo */ }
}

/** Volta ao estado inicial (para os testes). */
export function reiniciarAnalise() { estado.janela = null; estado.carregado = false; estado.conta = null; estado.perfil = {}; }
