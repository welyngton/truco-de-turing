/**
 * @file Base dos painéis HTML sobrepostos ao canvas: abrir e fechar telas, avisos rápidos, a fila
 * de avisos de conquista e caixas de confirmação. As telas específicas (menu, regras, grimório…)
 * usam estas funções.
 *
 * Os painéis vivem em `#paineis` e os avisos em `#avisos` (ver index.html).
 */

/** Atalho para `document.querySelector`. */
const $ = (seletor) => document.querySelector(seletor);

/** Escapa texto para inserir em HTML com segurança. */
export function escaparHtml(texto) {
  return String(texto).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
}

/**
 * @typedef {object} Painel
 * @property {HTMLElement} elemento A camada criada (contém o HTML passado).
 * @property {() => void} fechar
 */

/**
 * Abre uma tela sobre o jogo.
 * @param {string} html Conteúdo da tela.
 * @param {object} [opcoes]
 * @param {boolean} [opcoes.transparente] Sem o escurecimento de fundo (usado pelo menu).
 * @param {boolean} [opcoes.fechaAoClicarFora] Clicar fora do conteúdo fecha a tela.
 * @param {() => void} [opcoes.aoFechar]
 * @returns {Painel}
 */
export function abrirPainel(html, opcoes = {}) {
  const camada = document.createElement('div');
  camada.className = 'camada' + (opcoes.transparente ? ' transparente' : '');
  camada.innerHTML = html;
  $('#paineis').appendChild(camada);
  if (decisaoNaTela()) recolherConquista();
  const painel = {
    elemento: camada,
    fechar() {
      camada.remove();
      retomarConquistas();
      if (opcoes.aoFechar) opcoes.aoFechar();
    },
  };
  camada.querySelectorAll('[data-fechar]').forEach((b) => b.addEventListener('click', painel.fechar));
  if (opcoes.fechaAoClicarFora) camada.addEventListener('click', (e) => { if (e.target === camada) painel.fechar(); });
  const foco = camada.querySelector('[autofocus], .botao');
  if (foco) setTimeout(() => foco.focus({ preventScroll: true }), 30);
  return painel;
}

/** Fecha todas as telas abertas. */
export function fecharTodos() {
  $('#paineis').innerHTML = '';
  retomarConquistas();
}

/** Troca o aviso comum do topo pelo novo. As medalhas de conquista ficam, porque têm fila própria. */
function trocarAviso(aviso) {
  const caixa = $('#avisos');
  caixa.querySelectorAll('.aviso:not(.aviso-conquista)').forEach((a) => a.remove());
  caixa.appendChild(aviso);
}

/**
 * Mostra um aviso rápido no topo da tela (um aviso comum por vez, abaixo da medalha de conquista, se houver).
 * @param {string} titulo
 * @param {string} [texto]
 * @param {'medalha-aviso'} [tipo] Estilo alternativo.
 * @param {number} [duracaoMs=5200]
 */
export function mostrarAviso(titulo, texto, tipo, duracaoMs = 5200) {
  const aviso = document.createElement('div');
  aviso.className = 'aviso' + (tipo ? ' ' + tipo : '');
  aviso.innerHTML = '<b>' + escaparHtml(titulo) + '</b>' + escaparHtml(texto || '');
  trocarAviso(aviso);
  setTimeout(() => { aviso.style.transition = 'opacity .4s'; aviso.style.opacity = '0'; }, duracaoMs - 400);
  setTimeout(() => aviso.remove(), duracaoMs);
  aviso.addEventListener('click', () => aviso.remove());
}

/**
 * Dica de jogo do modo "dicas", no estilo do Glossário: título, conselho e o conceito de redes
 * neurais relacionado. Usa a mesma área dos avisos e fica 9 segundos (um toque fecha).
 */
export function mostrarDicaDeJogo(titulo, texto, tituloDoConceito, conceito) {
  const aviso = document.createElement('div');
  aviso.className = 'aviso dica-de-jogo';
  aviso.innerHTML = '<b>Dica \u00b7 ' + escaparHtml(titulo) + '</b>' + escaparHtml(texto) +
    (conceito ? '<span class="conceito"><i>Redes neurais \u00b7 ' + escaparHtml(tituloDoConceito) + ':</i> ' + escaparHtml(conceito) + '</span>' : '');
  trocarAviso(aviso);
  setTimeout(() => { aviso.style.transition = 'opacity .4s'; aviso.style.opacity = '0'; }, 8600);
  setTimeout(() => aviso.remove(), 9000);
  aviso.addEventListener('click', () => aviso.remove());
}

/* ======================================================================== avisos de conquista */

/** Tempo de cada aviso de conquista na tela, em milissegundos (um toque fecha antes). */
export const DURACAO_DO_AVISO_DE_CONQUISTA = 4500;
/** Espera depois de fechar uma tela, antes de voltar a mostrar medalhas (a resposta do truco pode abrir outro pedido). */
const ESPERA_DEPOIS_DE_FECHAR = 400;

/** Avisos de conquista esperando a vez, na ordem em que foram ganhos. */
const filaDeConquistas = [];
/** Aviso de conquista na tela agora: `{ aviso, elemento, relogios }`, ou null. */
let conquistaNaTela = null;

/** Quem joga pediu para reduzir o movimento (prefer\u00eancia do sistema)? */
function reduzirMovimento() {
  try { return !!(globalThis.matchMedia && globalThis.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) { return false; }
}

/** H\u00e1 uma caixa de resposta do truco na tela? A medalha n\u00e3o pode ficar por cima dela. */
function decisaoNaTela() {
  return !!document.querySelector('#paineis .grito-truco');
}

/**
 * P\u00f5e um aviso de conquista na fila do alto da tela. Os avisos aparecem um de cada vez, na ordem em
 * que chegaram, sem apagar os outros: cada um fica `duracaoMs` (ou at\u00e9 um toque) e ent\u00e3o entra o
 * pr\u00f3ximo. Enquanto a caixa de resposta do truco est\u00e1 aberta, a fila espera, e a medalha que estava na
 * tela volta para o come\u00e7o da fila. Com "reduzir movimento", o aviso entra e sai sem anima\u00e7\u00e3o.
 * @param {object} aviso
 * @param {string} aviso.titulo Nome da conquista.
 * @param {string} [aviso.texto] Descri\u00e7\u00e3o da conquista.
 * @param {string} [aviso.rotulo] Linha pequena acima do nome (por exemplo, "Conquista \u00b7 Ouro").
 * @param {string} aviso.medalha HTML da medalha, j\u00e1 pronto (ver telas/conquistas.js \u2192 medalhaHtml).
 * @param {() => void} [aviso.aoMostrar] Chamado na primeira vez que o aviso aparece (o som da medalha).
 * @param {number} [aviso.duracaoMs]
 * @param {string} [aviso.classe] Classe extra do aviso (`especial`: o da conquista final).
 */
export function avisarConquista(aviso) {
  filaDeConquistas.push(aviso);
  mostrarProximaConquista();
}

/** Mostra o pr\u00f3ximo aviso da fila, se a vez for dele. */
function mostrarProximaConquista() {
  if (conquistaNaTela && conquistaNaTela.elemento.isConnected) return;
  conquistaNaTela = null;
  if (!filaDeConquistas.length || decisaoNaTela()) return;
  const aviso = filaDeConquistas.shift();
  const elemento = document.createElement('div');
  elemento.className = 'aviso medalha-aviso aviso-conquista' + (aviso.classe ? ' ' + aviso.classe : '');
  elemento.setAttribute('role', 'status');
  elemento.innerHTML = aviso.medalha + '<div class="aviso-conquista-texto">' +
    (aviso.rotulo ? '<small>' + escaparHtml(aviso.rotulo) + '</small>' : '') +
    '<b>' + escaparHtml(aviso.titulo) + '</b>' + escaparHtml(aviso.texto || '') + '</div>';
  $('#avisos').prepend(elemento);
  const atual = { aviso, elemento, relogios: [] };
  conquistaNaTela = atual;
  if (!aviso.mostrado) { aviso.mostrado = true; if (aviso.aoMostrar) aviso.aoMostrar(); }
  const duracao = aviso.duracaoMs || DURACAO_DO_AVISO_DE_CONQUISTA;
  const fechar = () => {
    if (conquistaNaTela !== atual) return;
    atual.relogios.forEach(clearTimeout);
    elemento.remove();
    conquistaNaTela = null;
    mostrarProximaConquista();
  };
  elemento.addEventListener('click', fechar);
  if (!reduzirMovimento()) atual.relogios.push(setTimeout(() => { elemento.style.transition = 'opacity .4s'; elemento.style.opacity = '0'; }, Math.max(0, duracao - 400)));
  atual.relogios.push(setTimeout(fechar, duracao));
}

/** Abriu a caixa de resposta do truco: a medalha da tela volta para o come\u00e7o da fila e espera a resposta. */
function recolherConquista() {
  if (!conquistaNaTela) return;
  const { aviso, elemento, relogios } = conquistaNaTela;
  relogios.forEach(clearTimeout);
  elemento.remove();
  conquistaNaTela = null;
  filaDeConquistas.unshift(aviso);
}

/** Uma tela fechou: se a fila estava esperando, ela volta a andar daqui a pouco. */
function retomarConquistas() {
  if (filaDeConquistas.length) setTimeout(mostrarProximaConquista, ESPERA_DEPOIS_DE_FECHAR);
}

/** Esvazia a fila e tira da tela o aviso de conquista atual. */
export function limparAvisosDeConquista() {
  filaDeConquistas.splice(0);
  if (conquistaNaTela) { conquistaNaTela.relogios.forEach(clearTimeout); conquistaNaTela.elemento.remove(); }
  conquistaNaTela = null;
}

/**
 * Caixa de confirmação com botões.
 * @param {string} titulo
 * @param {string} texto HTML do corpo (já escapado por quem chama).
 * @param {{rotulo: string, classe?: string, acao?: () => void}[]} botoes
 * @param {{grito?: boolean, topo?: string}} [opcoes] `grito` usa o estilo dos pedidos de truco.
 */
export function confirmar(titulo, texto, botoes, opcoes = {}) {
  const html = '<div class="folha estreita' + (opcoes.grito ? ' grito-truco' : '') + '">' + (opcoes.topo || '') +
    '<h2>' + escaparHtml(titulo) + '</h2>' + (texto ? '<p>' + texto + '</p>' : '') +
    '<div class="linha fim" style="margin-top:16px">' +
    botoes.map((b, i) => '<button class="botao ' + (b.classe || '') + '" data-indice="' + i + '">' + escaparHtml(b.rotulo) + '</button>').join('') +
    '</div></div>';
  const painel = abrirPainel(html);
  painel.elemento.querySelectorAll('[data-indice]').forEach((botao) => {
    botao.addEventListener('click', () => {
      painel.fechar();
      const escolhido = botoes[Number(botao.dataset.indice)];
      if (escolhido.acao) escolhido.acao();
    });
  });
  return painel;
}

/* ======================================================================== dica flutuante */

let dicaFlutuante = null;

/**
 * Mostra uma dica no estilo do Glossário ao lado de um elemento da mesa (botão, carta).
 * Fica à esquerda do retângulo quando há espaço; senão, acima ou abaixo.
 * @param {string} titulo
 * @param {string} html Corpo da dica (já escapado por quem chama).
 * @param {{x: number, y: number, l: number, a: number}} alvo Retângulo do elemento, em pixels da página.
 */
export function mostrarDicaFlutuante(titulo, html, alvo) {
  esconderDicaFlutuante();
  const caixa = document.createElement('div');
  caixa.className = 'dica-flutuante';
  caixa.setAttribute('role', 'tooltip');
  caixa.innerHTML = '<b>' + escaparHtml(titulo) + '</b>' + html;
  document.body.appendChild(caixa);
  const l = caixa.offsetWidth, a = caixa.offsetHeight, margem = 10;
  const largura = innerWidth, altura = innerHeight;
  let x, y;
  if (alvo.x - l - margem > 8) { x = alvo.x - l - margem; y = alvo.y + alvo.a / 2 - a / 2; }
  else if (alvo.y - a - margem > 8) { x = alvo.x + alvo.l / 2 - l / 2; y = alvo.y - a - margem; }
  else { x = alvo.x + alvo.l / 2 - l / 2; y = alvo.y + alvo.a + margem; }
  caixa.style.left = Math.max(8, Math.min(largura - l - 8, x)) + 'px';
  caixa.style.top = Math.max(8, Math.min(altura - a - 8, y)) + 'px';
  dicaFlutuante = caixa;
}

/** Esconde a dica flutuante, se houver. */
export function esconderDicaFlutuante() {
  if (dicaFlutuante) dicaFlutuante.remove();
  dicaFlutuante = null;
}
