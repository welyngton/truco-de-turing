/**
 * @file Estatísticas de uso com o Google Analytics 4 (fluxo "Truco de Turing", ID G-VWSGVWJK6Q).
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
 * Os eventos do jogo (início de partida, fim de mão e de partida, truco, verbete lido, conquista)
 * passam por `registrarEvento`, que não faz nada enquanto a medição estiver desligada.
 */

/** ID da métrica do fluxo da Web no Google Analytics. */
export const ID_GOOGLE_ANALYTICS = 'G-VWSGVWJK6Q';

/** Endereços onde o jogo publicado mede (o do fluxo de dados no Google Analytics). */
export const HOSTS_MEDIDOS = ['welyngton.github.io'];

/** Chave do consentimento no `localStorage`: 'sim', 'nao' ou ausente (ainda não perguntado). */
export const CHAVE_DO_CONSENTIMENTO = 'truco-de-turing:estatisticas';

/** Estado do módulo: a janela onde o Analytics foi ligado (ou null). */
const estado = { janela: null, carregado: false };

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
  }
}

/** Texto da faixa de consentimento (também usado na tela "Sobre"). */
export const TEXTO_DAS_ESTATISTICAS = 'O Truco de Turing usa o Google Analytics para contar partidas, baralhos, verbetes lidos e conquistas e, assim, melhorar o jogo. Ele guarda um cookie neste aparelho e não usa nada para publicidade.';

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
export function reiniciarAnalise() { estado.janela = null; estado.carregado = false; }
