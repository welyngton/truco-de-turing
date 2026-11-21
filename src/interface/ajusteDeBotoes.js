/**
 * @file Ajuste da fonte dos botões HTML: o texto que não cabe na largura do botão (como "Livro de
 * conceitos" no menu de um celular) tem a fonte reduzida aos poucos até caber, em vez de passar das
 * margens do botão ou ser cortado com reticências (issue #121).
 *
 * Só mexe em botões cujo texto estoura na horizontal; texto que quebra de linha e botões que já
 * cabem ficam como estão. Fora do navegador (testes no Node, sem layout) não faz nada.
 */

/** Menor fonte, em pixels, a que um botão pode chegar. */
export const FONTE_MINIMA_DO_BOTAO = 8;

/** Texto do botão passa da área útil dele? (a diferença de 1 px é arredondamento) */
function estoura(botao) {
  return botao.scrollWidth > botao.clientWidth + 1;
}

/**
 * Reduz a fonte de um botão, meio pixel de cada vez, até o texto caber ou chegar a `minimo`.
 * @param {HTMLElement} botao
 * @param {number} [minimo]
 * @returns {number} A fonte final em pixels (0 quando não há layout para medir).
 */
export function ajustarFonteDoBotao(botao, minimo = FONTE_MINIMA_DO_BOTAO) {
  if (!botao || !botao.isConnected || !botao.clientWidth || typeof getComputedStyle !== 'function') return 0;
  botao.style.fontSize = '';
  let tamanho = parseFloat(getComputedStyle(botao).fontSize) || 0;
  while (tamanho > minimo && estoura(botao)) {
    tamanho -= 0.5;
    botao.style.fontSize = tamanho + 'px';
  }
  return tamanho;
}

/**
 * Ajusta todos os botões de uma tela e refaz o ajuste quando a janela muda de tamanho ou as fontes
 * terminam de carregar (que muda a largura do texto). Para sozinho quando a tela sai da página.
 * @param {HTMLElement} raiz Elemento com os botões.
 * @param {string} [seletor]
 */
export function ajustarFontesDosBotoes(raiz, seletor = '.botao') {
  if (!raiz || typeof addEventListener !== 'function') return;
  const refazer = () => {
    if (!raiz.isConnected) { removeEventListener('resize', refazer); return; }
    raiz.querySelectorAll(seletor).forEach((botao) => ajustarFonteDoBotao(botao));
  };
  addEventListener('resize', refazer);
  refazer();
  if (globalThis.document && document.fonts && document.fonts.ready) document.fonts.ready.then(refazer).catch(() => {});
  /* o painel recém-aberto ainda pode estar sem layout neste quadro */
  if (typeof requestAnimationFrame === 'function') requestAnimationFrame(refazer);
}
