/**
 * @file Tela do Glossário (antes "Biblioteca de conceitos" e "Grimório"): lista de verbetes à esquerda e o
 * verbete escolhido à direita, com o conceito, a equação, a figura, como aparece no jogo e até
 * onde a comparação vale. Ler um verbete conta para a conquista "Bibliotecário".
 */
import { VERBETES, NOME_DA_BIBLIOTECA } from '../../conteudo/grimorio.js';
import { figuraDaBiblioteca } from '../../conteudo/figurasDaBiblioteca.js';
import { abrirPainel, escaparHtml } from '../paineis.js';

/**
 * Corpo do verbete: a ideia do dia a dia (verbetes de Ação), o conceito, a equação, a figura, como
 * aparece no jogo, até onde a comparação vale, a matemática para se aprofundar, a fonte e a autoria.
 * Equação, "aprofundar" e fórmula (MathML) e figura (SVG) são conteúdo do próprio jogo, não texto do jogador.
 * @param {object} v Verbete de `VERBETES`.
 * @returns {string}
 */
export function htmlDoVerbete(v) {
  return (v.ideia ? '<p class="ideia"><b>A ideia:</b> ' + escaparHtml(v.ideia) + '</p>' : '') +
    '<p>' + escaparHtml(v.conceito) + '</p>' +
    (v.equacao ? '<div class="equacao">' + v.equacao + '</div>' : '') +
    (v.figura ? '<figure class="figura">' + figuraDaBiblioteca(v.figura) + '</figure>' : '') +
    '<p class="no-jogo"><b>No jogo:</b> ' + escaparHtml(v.noJogo) + '</p>' +
    (v.limite ? '<p class="limite"><b>Até onde vale a comparação:</b> ' + escaparHtml(v.limite) + '</p>' : '') +
    (v.aprofundar ? '<div class="aprofundar"><h3>Para se aprofundar</h3><p>' + v.aprofundar + '</p>' +
      (v.formula ? '<div class="formula">' + v.formula + '</div>' : '') + '</div>' : '') +
    (v.fonte ? '<p class="fonte">Fonte: ' + escaparHtml(v.fonte) + '</p>' : '') +
    (v.autoria ? '<p class="autoria">Colaboração de ' + escaparHtml(v.autoria) + '.</p>' : '');
}

/**
 * Abre o Glossário.
 * @param {object} app Aplicação (guarda os verbetes lidos).
 * @param {string} [idInicial] Verbete aberto de início.
 * @param {() => void} [aoFechar]
 */
export function abrirGrimorio(app, idInicial, aoFechar) {
  const html = '<div class="folha"><button class="fechar-x" data-fechar aria-label="Fechar">×</button>' +
    '<h2>' + NOME_DA_BIBLIOTECA + '</h2><p>Cada mecânica do jogo é um conceito de aprendizado de máquina. Os verbetes aparecem destacados quando acontecem na mesa, e a ajuda de cada ação leva ao verbete dela.</p>' +
    '<div class="grimorio"><nav class="grimorio-lista" id="g-lista"></nav><article class="grimorio-verbete" id="g-verbete"></article></div></div>';
  const painel = abrirPainel(html, { fechaAoClicarFora: true, aoFechar });
  const lista = painel.elemento.querySelector('#g-lista');
  const artigo = painel.elemento.querySelector('#g-verbete');

  /** Desenha a lista com o verbete ativo destacado. */
  function desenharLista(ativo) {
    lista.innerHTML = VERBETES.map((v) =>
      '<button data-id="' + v.id + '" aria-current="' + (v.id === ativo) + '">' + escaparHtml(v.titulo) +
      (app.progresso.lidos[v.id] ? '<span class="lido">lido</span>' : '') + '</button>').join('');
    lista.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => mostrar(b.dataset.id)));
  }

  /** Mostra um verbete e o marca como lido. */
  function mostrar(id) {
    const v = VERBETES.find((x) => x.id === id) || VERBETES[0];
    app.marcarVerbeteLido(v.id);
    artigo.innerHTML = '<div class="categoria">' + escaparHtml(v.categoria) + '</div><h2>' + escaparHtml(v.titulo) + '</h2>' +
      htmlDoVerbete(v);
    artigo.scrollTop = 0;
    desenharLista(v.id);
  }

  mostrar(idInicial || VERBETES[0].id);
  return painel;
}
