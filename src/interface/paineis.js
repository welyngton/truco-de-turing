/**
 * @file Base dos painéis HTML sobrepostos ao canvas: abrir e fechar telas, avisos rápidos e
 * caixas de confirmação. As telas específicas (menu, regras, grimório…) usam estas funções.
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
  const painel = {
    elemento: camada,
    fechar() {
      camada.remove();
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
}

/**
 * Mostra um aviso rápido no topo da tela (só um por vez).
 * @param {string} titulo
 * @param {string} [texto]
 * @param {'medalha-aviso'} [tipo] Estilo alternativo.
 * @param {number} [duracaoMs=5200]
 */
export function mostrarAviso(titulo, texto, tipo, duracaoMs = 5200) {
  const aviso = document.createElement('div');
  aviso.className = 'aviso' + (tipo ? ' ' + tipo : '');
  aviso.innerHTML = '<b>' + escaparHtml(titulo) + '</b>' + escaparHtml(texto || '');
  const caixa = $('#avisos');
  caixa.innerHTML = '';
  caixa.appendChild(aviso);
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
  const caixa = $('#avisos');
  caixa.innerHTML = '';
  caixa.appendChild(aviso);
  setTimeout(() => { aviso.style.transition = 'opacity .4s'; aviso.style.opacity = '0'; }, 8600);
  setTimeout(() => aviso.remove(), 9000);
  aviso.addEventListener('click', () => aviso.remove());
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
