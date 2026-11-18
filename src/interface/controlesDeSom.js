/**
 * @file Ícones de ligar e desligar os efeitos sonoros e a música, sempre à vista no menu e na mesa.
 *
 * São botões HTML (alto-falante e nota musical, com um corte quando desligados) com nome acessível
 * e estado em `aria-pressed` (apertado = ligado). Todos os conjuntos abertos (menu, mesa) mostram
 * o mesmo estado: `atualizarControlesDeSom` repinta todos de uma vez. A escolha é lembrada pela
 * aplicação (`alternarSom` e `alternarMusica`).
 */
import { Som } from './som.js';

const TRACO = 'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"';

/** Alto-falante, com ondas quando ligado e cortado por uma barra quando desligado. */
export function iconeDeSom(ligado) {
  return '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 9.5v5h3.6L12 18.5v-13L7.6 9.5z" fill="currentColor" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/>' +
    (ligado ? '<path d="M15.5 9a4.2 4.2 0 0 1 0 6M18 6.5a7.6 7.6 0 0 1 0 11" ' + TRACO + '/>' : '<path d="M16 9.5l5 5M21 9.5l-5 5" ' + TRACO + '/>') +
    (ligado ? '' : '<path d="M4 20L20 4" ' + TRACO + ' stroke-width="2.4"/>') + '</svg>';
}

/** Nota musical, cortada por uma barra quando desligada. */
export function iconeDeMusica(ligado) {
  return '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M9.5 17.5V6l9-2v11.5" ' + TRACO + '/>' +
    '<ellipse cx="7" cy="17.5" rx="2.6" ry="2.1" fill="currentColor"/><ellipse cx="16.5" cy="15.5" rx="2.6" ry="2.1" fill="currentColor"/>' +
    (ligado ? '' : '<path d="M4 20L20 4" ' + TRACO + ' stroke-width="2.4"/>') + '</svg>';
}

const NOMES = { som: 'Efeitos sonoros', musica: 'Música' };

/** HTML de um dos botões. `ligado` é o estado inicial. */
function htmlDoBotao(chave, ligado) {
  return '<button type="button" class="icone-som" data-controle-som="' + chave + '" aria-label="' + NOMES[chave] + '" aria-pressed="' + (ligado ? 'true' : 'false') + '"' +
    ' title="' + NOMES[chave] + ': ' + (ligado ? 'ligado' : 'desligado') + '">' + (chave === 'som' ? iconeDeSom(ligado) : iconeDeMusica(ligado)) + '</button>';
}

/**
 * HTML do par de ícones, já no estado atual.
 * @param {object} app A aplicação (ver aplicacao.js).
 */
export function htmlDosControlesDeSom(app) {
  return '<div class="controles-som" role="group" aria-label="Som e música">' +
    htmlDoBotao('som', !Som.estaMudo()) + htmlDoBotao('musica', Boolean(app.progresso.musica)) + '</div>';
}

/**
 * Repinta todos os ícones de som e música abertos (menu e mesa) conforme o estado da aplicação.
 * @param {object} app
 */
export function atualizarControlesDeSom(app) {
  const estado = { som: !Som.estaMudo(), musica: Boolean(app.progresso.musica) };
  document.querySelectorAll('[data-controle-som]').forEach((botao) => {
    const chave = botao.dataset.controleSom, ligado = estado[chave];
    botao.setAttribute('aria-pressed', ligado ? 'true' : 'false');
    botao.title = NOMES[chave] + ': ' + (ligado ? 'ligado' : 'desligado');
    botao.innerHTML = chave === 'som' ? iconeDeSom(ligado) : iconeDeMusica(ligado);
  });
}

/**
 * Liga os cliques dos ícones dentro de `raiz`.
 * @param {HTMLElement} raiz Elemento que contém um conjunto de ícones.
 * @param {object} app
 * @param {() => string} terreno Terreno cuja música deve tocar ao ligar ('menu' no menu inicial).
 * @param {() => void} [aoMudar] Chamado depois de cada mudança (a mesa repinta os rótulos do MENU).
 */
export function ligarControlesDeSom(raiz, app, terreno, aoMudar) {
  raiz.querySelectorAll('[data-controle-som]').forEach((botao) => botao.addEventListener('click', () => {
    if (botao.dataset.controleSom === 'som') app.alternarSom(); else app.alternarMusica(terreno());
    atualizarControlesDeSom(app);
    if (aoMudar) aoMudar();
  }));
}
