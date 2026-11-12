/**
 * @file Painéis de leitura da mesa, como no NeuroDeck: placar por camada (clique num bloco do
 * placar), registro completo da mão (clique no registro) e lista do cemitério e do limbo (clique
 * na pilha). São só leitura: abrem por cima da mesa e fecham com Esc, no X ou clicando fora.
 */
import { abrirPainel, escaparHtml } from '../../interface/paineis.js';
import { rotuloCarta } from '../../nucleo/cartas.js';
import { nomeCamada } from '../../nucleo/rede.js';
import { pontuarRede } from '../../nucleo/pontuacao.js';
import { COR_JOGADOR_CSS } from './layout.js';

const cabecalho = (titulo) => '<div class="folha estreita painel-mesa"><button class="fechar-x" data-fechar aria-label="Fechar">×</button><h2>' + titulo + '</h2>';
const rodape = '<div class="linha fim" style="margin-top:14px"><button class="botao" data-fechar>Fechar</button></div></div>';

/** Lista de cartas como selos "7♥", ou um aviso quando a pilha está vazia. */
function listaDeCartas(cartas, vazio) {
  if (!cartas.length) return '<p class="nota">' + vazio + '</p>';
  return '<p class="cartas-do-painel">' + cartas.map((c) => '<span class="carta-mini">' + escaparHtml(rotuloCarta(c)) + '</span>').join(' ') + '</p>';
}

export const metodosDosPaineis = {
  /**
   * Placar por camada: uma coluna por jogador, uma linha por camada, com a carta ativada e os
   * pontos de cada neurônio, os combos de figuras e a soma.
   */
  abrirPlacarPorCamada() {
    const mao = this.mao;
    if (!mao) return null;
    const total = mao.camadas.length;
    const ordem = this.ordemDoPlacar().slice().reverse();
    const pontuacoes = ordem.map((j) => pontuarRede(mao, j));
    let html = cabecalho('Placar por camada') +
      '<p class="nota">Cada linha é uma camada da rede, da entrada à saída. A célula mostra o neurônio ativado e quanto ele vale agora.</p>' +
      '<table class="tabela-partida placar-camadas"><thead><tr><th>Camada</th>' +
      ordem.map((j) => '<th style="color:' + COR_JOGADOR_CSS[j] + '">' + escaparHtml(mao.jogadores[j].nome) + '</th>').join('') + '</tr></thead><tbody>';
    for (let c = 0; c < total; c++) {
      html += '<tr><td>' + escaparHtml(nomeCamada(c, total)) + '</td>' + pontuacoes.map((p) => {
        const x = p.neuronios.find((n) => n.camada === c);
        if (!x) return '<td class="vazio">—</td>';
        const notas = x.notas.length ? ' <small>(' + escaparHtml(x.notas.join(', ')) + ')</small>' : '';
        return '<td><b>' + escaparHtml(rotuloCarta(x.carta)) + '</b> ' + x.pontos + notas + '</td>';
      }).join('') + '</tr>';
    }
    html += '<tr class="soma"><td>Combos</td>' + pontuacoes.map((p) => '<td>' +
      (p.combos.length ? p.combos.map((k) => escaparHtml(k.rotulo)).join('<br>') : '—') + '</td>').join('') + '</tr>';
    html += '<tr class="soma"><td>Soma</td>' + pontuacoes.map((p) => '<td><b>' + p.total + '</b>' + (p.vanishing ? ' <small>(vanishing gradient)</small>' : '') + '</td>').join('') + '</tr>';
    html += '</tbody></table>' + rodape;
    return abrirPainel(html, { fechaAoClicarFora: true });
  },

  /** Registro completo da mão, da primeira jogada à última (o painel da mesa mostra só o fim). */
  abrirRegistroCompleto() {
    const mao = this.mao;
    if (!mao) return null;
    const linhas = mao.registro.length
      ? '<ol class="registro-completo">' + mao.registro.map((l) => '<li>' + escaparHtml(l) + '</li>').join('') + '</ol>'
      : '<p class="nota">Nada aconteceu ainda nesta mão.</p>';
    return abrirPainel(cabecalho('Registro da mão') + linhas + rodape, { fechaAoClicarFora: true });
  },

  /** Cartas fora de jogo: o cemitério (abertas) e o limbo (só a quantidade, porque são ocultas). */
  abrirCemiterio() {
    const mao = this.mao;
    if (!mao) return null;
    const html = cabecalho('Cemitério e limbo') +
      '<h3>Cemitério · ' + mao.cemiterio.length + '</h3>' +
      '<p class="nota">Cartas que saíram da mesa por overfit, early stop, stack overflow, dropout ou descarte. Não voltam.</p>' +
      listaDeCartas(mao.cemiterio, 'O cemitério está vazio.') +
      '<h3>Limbo · ' + mao.limbo.length + '</h3>' +
      '<p class="nota">Cartas queimadas no início, como ruído. Ficam viradas para baixo e só voltam por transfer learning.</p>' +
      rodape;
    return abrirPainel(html, { fechaAoClicarFora: true });
  },
};
