/**
 * @file Tela de revisão didática do fim da mão (e da partida).
 *
 * Mostra, a partir da linha do tempo guardada pela mesa (cenas/mesa/turnos.js):
 * - um resumo com os momentos-chave (maior salto, golpe mais duro, a virada) e o que cada um fez;
 * - a curva de treino das duas redes, passo a passo, com marcas nas ações importantes;
 * - a linha do tempo comentada, ligando cada ação ao conceito de redes neurais do Glossário;
 * - na partida com várias mãos, o placar mão a mão.
 */
import { CORES_JOGADORES_CSS } from '../../configuracao.js';
import { VERBETES } from '../../conteudo/grimorio.js';
import { TERRENOS } from '../../nucleo/terrenos.js';
import { abrirPainel, escaparHtml } from '../paineis.js';

/** Cor das redes (até 5 jogadores). */
const COR = CORES_JOGADORES_CSS;

/** Junta números com ' × ' (placar de 2 a 5 jogadores). */
const placar = (lista) => lista.join(' × ');

/** Cor e rótulo de cada tipo de acontecimento marcado na curva. */
const MARCAS = {
  tunagem: { cor: '#3f9e4c', rotulo: 'Tunagem' },
  overfit: { cor: '#e07b1a', rotulo: 'Overfit' },
  earlystop: { cor: '#d0283c', rotulo: 'Early stop' },
  stackoverflow: { cor: '#c02ca8', rotulo: 'Stack overflow' },
  dropout: { cor: '#1f9bb8', rotulo: 'Dropout' },
  transfer: { cor: '#3a8f8b', rotulo: 'Transfer learning' },
  truco: { cor: '#7a1626', rotulo: 'Truco' },
  completa: { cor: '#b8860b', rotulo: 'Rede completa' },
};

/** Tipo principal de um passo: o evento mais marcante, ou o tipo da jogada. */
function tipoDoPasso(passo) {
  for (const t of ['stackoverflow', 'earlystop', 'overfit', 'tunagem', 'dropout', 'transfer', 'truco', 'completa']) {
    if (passo.eventos.includes(t) || passo.tipo === t) return t;
  }
  return passo.tipo === 'ativar' ? 'ativacao' : passo.tipo;
}

/** Verbete do Glossário ligado a cada tipo de passo. */
const VERBETE_DO_TIPO = {
  ativacao: 'forward', tunagem: 'tunagem', overfit: 'overfit', earlystop: 'earlystop', stackoverflow: 'stackoverflow',
  dropout: 'dropout', transfer: 'transfer', truco: 'truco', completa: 'camadas', inicio: 'neuronio',
};

/** Diferença das somas em relação ao passo anterior. */
function variacoes(passos) {
  return passos.map((p, i) => {
    const antes = i ? passos[i - 1].somas : p.somas.map(() => 0);
    return p.somas.map((s, j) => s - antes[j]);
  });
}

/** Momentos-chave da mão, em frases curtas. */
function momentosChave(passos, nomes) {
  const deltas = variacoes(passos);
  const frases = [];
  let maior = null, pior = null, virada = null, lider = -1;
  passos.forEach((p, i) => {
    p.somas.forEach((_, j) => {
      if (!maior || deltas[i][j] > maior.d) maior = { i, j, d: deltas[i][j] };
      if (!pior || deltas[i][j] < pior.d) pior = { i, j, d: deltas[i][j] };
    });
    /* líder isolado (sem empate na frente); a virada é a troca de líder */
    const topo = Math.max(...p.somas);
    const agora = p.somas.filter((s) => s === topo).length === 1 ? p.somas.indexOf(topo) : -1;
    if (agora >= 0 && agora !== lider) { if (lider >= 0) virada = i; lider = agora; }
  });
  if (maior && maior.d > 0) frases.push('<b>Maior salto:</b> passo ' + passos[maior.i].numero + ', +' + maior.d + ' para ' + escaparHtml(nomes[maior.j]) + '. ' + escaparHtml(passos[maior.i].texto));
  if (pior && pior.d < 0) frases.push('<b>Golpe mais duro:</b> passo ' + passos[pior.i].numero + ', ' + pior.d + ' para ' + escaparHtml(nomes[pior.j]) + '. ' + escaparHtml(passos[pior.i].texto));
  if (virada != null) frases.push('<b>A virada:</b> no passo ' + passos[virada].numero + ' a liderança trocou de lado. ' + escaparHtml(passos[virada].texto));
  return frases;
}

/** Quantas vezes cada jogador fez cada tipo de ação. */
function contagens(passos) {
  const conta = [];
  for (const p of passos) {
    const t = tipoDoPasso(p);
    if (!Number.isInteger(p.jogador) || p.jogador < 0) continue;
    conta[p.jogador] = conta[p.jogador] || {};
    conta[p.jogador][t] = (conta[p.jogador][t] || 0) + 1;
  }
  return conta;
}

/** Gráfico SVG da curva de treino com as marcas das ações. */
function graficoDaCurva(passos, nomes) {
  const L = 680, A = 250, m = { e: 40, d: 14, c: 16, b: 30 };
  const pontos = [{ somas: nomes.map(() => 0) }, ...passos];
  /* escala com marcas redondas: múltiplos de 20 divididos em 4 faixas */
  const maximo = Math.max(20, Math.ceil(Math.max(...pontos.flatMap((p) => p.somas)) / 20) * 20);
  const minimo = Math.min(0, Math.floor(Math.min(...pontos.flatMap((p) => p.somas)) / 20) * 20);
  const x = (i) => m.e + (i / Math.max(1, pontos.length - 1)) * (L - m.e - m.d);
  const y = (v) => m.c + (1 - (v - minimo) / (maximo - minimo)) * (A - m.c - m.b);
  let svg = '<svg class="curva-svg" viewBox="0 0 ' + L + ' ' + A + '" role="img" aria-label="Curva de treino: soma de cada rede a cada passo">';
  for (let k = 0; k <= 4; k++) {
    const v = Math.round(minimo + ((maximo - minimo) * k) / 4);
    svg += '<line x1="' + m.e + '" x2="' + (L - m.d) + '" y1="' + y(v) + '" y2="' + y(v) + '" class="grade"/><text x="' + (m.e - 6) + '" y="' + (y(v) + 4) + '" class="eixo" text-anchor="end">' + v + '</text>';
  }
  svg += '<text x="' + (L / 2) + '" y="' + (A - 6) + '" class="eixo" text-anchor="middle">passos da mão</text>';
  passos.forEach((p, i) => {
    if (tipoDoPasso(p) === 'truco') svg += '<line x1="' + x(i + 1) + '" x2="' + x(i + 1) + '" y1="' + m.c + '" y2="' + (A - m.b) + '" class="linha-truco"><title>' + escaparHtml(p.texto) + '</title></line>';
  });
  for (let j = 0; j < nomes.length; j++) {
    svg += '<polyline fill="none" stroke="' + COR[j] + '" stroke-width="3" stroke-linejoin="round" points="' + pontos.map((p, i) => x(i) + ',' + y(p.somas[j])).join(' ') + '"/>';
  }
  const deltas = variacoes(passos);
  passos.forEach((p, i) => {
    const t = tipoDoPasso(p), marca = MARCAS[t];
    if (!marca || t === 'truco') return;
    /* ataques ficam marcados na curva da vítima; o resto, na de quem jogou */
    const autor = Number.isInteger(p.jogador) && p.jogador >= 0 ? p.jogador : 0;
    const ataque = ['overfit', 'earlystop', 'stackoverflow'].includes(t);
    /* vítima: quem mais perdeu no passo (num ataque à própria rede, o próprio autor) */
    let vitima = autor;
    deltas[i].forEach((d, k) => { if (d < deltas[i][vitima]) vitima = k; });
    const j = ataque ? vitima : autor;
    svg += '<g class="marca"><circle cx="' + x(i + 1) + '" cy="' + y(p.somas[j]) + '" r="8" fill="' + marca.cor + '" stroke="#fff" stroke-width="1.5"/>' +
      '<text x="' + x(i + 1) + '" y="' + (y(p.somas[j]) + 3.5) + '" text-anchor="middle">' + p.numero + '</text><title>' + escaparHtml(p.numero + '. ' + p.texto) + '</title></g>';
  });
  svg += '</svg>';
  const legenda = '<div class="curva-legenda">' + nomes.map((n, j) => '<span><i style="background:' + COR[j] + '"></i>' + escaparHtml(n) + '</span>').join('') +
    Object.values(MARCAS).map((mk) => '<span><i class="redonda" style="background:' + mk.cor + '"></i>' + mk.rotulo + '</span>').join('') + '</div>';
  return svg + legenda;
}

/** Linha do tempo comentada: cada passo, a variação das somas e o conceito (na primeira vez). */
function linhaDoTempoHtml(passos, nomes) {
  const deltas = variacoes(passos), explicados = new Set();
  return '<ol class="linha-do-tempo">' + passos.map((p, i) => {
    const t = tipoDoPasso(p), marca = MARCAS[t];
    const j = Number.isInteger(p.jogador) && p.jogador >= 0 ? p.jogador : 0;
    const chips = deltas[i].map((_, k) => k).filter((k) => deltas[i][k] !== 0).map((k) =>
      '<span class="variacao ' + (deltas[i][k] > 0 ? 'sobe' : 'desce') + '" style="--cor:' + COR[k] + '">' + (deltas[i][k] > 0 ? '+' : '') + deltas[i][k] + ' ' + escaparHtml(nomes[k]) + '</span>').join('');
    let conceito = '';
    const verbete = VERBETES.find((v) => v.id === VERBETE_DO_TIPO[t]);
    if (verbete && !explicados.has(verbete.id)) {
      explicados.add(verbete.id);
      conceito = '<div class="conceito-passo"><b>' + escaparHtml(verbete.titulo) + ':</b> ' + escaparHtml(verbete.conceito) + '</div>';
    }
    return '<li style="--cor:' + COR[j] + '"><span class="numero">' + p.numero + '</span><div>' +
      (marca ? '<span class="tipo" style="background:' + marca.cor + '">' + marca.rotulo + '</span> ' : '') +
      escaparHtml(p.texto) + (chips ? ' <span class="variacoes">' + chips + '</span>' : '') + conceito + '</div></li>';
  }).join('') + '</ol>';
}

/** Placar mão a mão da partida. */
function tabelaDaPartida(historico, nomes) {
  return '<table class="tabela-partida"><thead><tr><th>Mão</th><th>Vencedor</th><th>Como</th><th>Tentos ganhos</th><th>Placar</th></tr></thead><tbody>' +
    historico.map((h) => '<tr><td>' + h.numero + '</td><td style="color:' + COR[h.vencedor] + ';font-weight:700">' + escaparHtml(nomes[h.vencedor]) + '</td>' +
      '<td>' + (h.completa ? 'rede ' + placar(h.somas) : 'correram do truco') + '</td><td>+' + h.ganho + '</td><td>' + placar(h.tentos) + '</td></tr>').join('') +
    '</tbody></table>';
}

/**
 * Abre a revisão.
 * @param {{mao: object, linhaDoTempo: object[], partida: object, historicoDaPartida: object[], numeroDaMao: number, aoFechar: () => void}} dados
 */
export function abrirRevisao({ mao, linhaDoTempo, partida, historicoDaPartida, numeroDaMao, aoFechar }) {
  const nomes = mao.jogadores.map((j) => j.nome);
  const passos = linhaDoTempo.filter((p) => p.tipo !== 'inicio' || p.eventos.includes('inicio'));
  const conta = contagens(passos);
  const linha = (j) => {
    const c = conta[j] || {};
    const ataques = (c.overfit || 0) + (c.earlystop || 0) + (c.stackoverflow || 0);
    const qtd = (n, singular, plural) => n + ' ' + (n === 1 ? singular : plural);
    return '<li style="--cor:' + COR[j] + '"><b>' + escaparHtml(nomes[j]) + '</b>: ' + qtd(c.ativacao || 0, 'ativação', 'ativações') + ', ' + qtd(c.tunagem || 0, 'tunagem', 'tunagens') + ', ' +
      qtd(ataques, 'ataque', 'ataques') + ', ' + qtd(c.dropout || 0, 'dropout', 'dropouts') + (c.truco ? ', ' + qtd(c.truco, 'lance de truco', 'lances de truco') : '') + '. Soma final: <b>' + (passos.length ? passos[passos.length - 1].somas[j] : 0) + '</b>.</li>';
  };
  const momentos = momentosChave(passos, nomes);
  let html = '<div class="folha larga revisao"><button class="fechar-x" data-fechar aria-label="Fechar">×</button>' +
    '<h2>Revisão da mão ' + numeroDaMao + '</h2>' +
    '<p class="introducao">Como num treino de rede neural, acompanhe a <b>curva de treino</b> (a soma de cada rede a cada passo) e veja o que cada ação fez com ela.' +
    (mao.config.terreno !== 'neutro' ? ' Terreno ' + escaparHtml(TERRENOS[mao.config.terreno].nome) + ': ' + escaparHtml(TERRENOS[mao.config.terreno].resumo) + ' Por isso algumas somas mudam sem ação direta.' : '') + '</p>' +
    '<h3>Em resumo</h3><ul class="resumo">' + nomes.map((_, j) => linha(j)).join('') + momentos.map((f) => '<li>' + f + '</li>').join('') +
    (mao.resultado ? '<li><b>Critério de vitória:</b> ' + escaparHtml(mao.resultado.motivo) + '.</li>' : '') + '</ul>' +
    '<h3>Curva de treino</h3>' + (passos.length ? graficoDaCurva(passos, nomes) : '<p>Nenhuma jogada registrada.</p>') +
    '<p class="dica-grafico">Passe o mouse (ou toque) nas marcas numeradas para ver o que aconteceu. Linhas tracejadas vinho são pedidos de truco.</p>' +
    '<h3>Passo a passo</h3>' + linhaDoTempoHtml(passos, nomes);
  if (historicoDaPartida.length > 1 || partida.alvo > 1) {
    html += '<h3>A partida, mão a mão</h3>' + tabelaDaPartida(historicoDaPartida, nomes) +
      (partida.encerrada ? '<p><b>' + escaparHtml(nomes[partida.vencedor]) + '</b> venceu a partida por ' + placar(partida.tentos) + '.</p>' : '');
  }
  html += '<div class="linha fim" style="margin-top:16px"><button class="botao vinho" data-fechar>Voltar ao resultado</button></div></div>';
  abrirPainel(html, { aoFechar });
}
