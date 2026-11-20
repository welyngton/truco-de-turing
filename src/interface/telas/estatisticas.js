/**
 * @file Página de estatísticas pessoais (issue #154), no estilo das páginas de estatísticas dos
 * jogos de mundo aberto: tudo o que o jogo contou sobre a pessoa, do tempo acumulado em partida às
 * ações na rede, em seções. Aberta pela tela de Conquistas. Vale com ou sem conta: lê o progresso
 * do aparelho, que com a conta conectada já está junto com o dela.
 *
 * `secoesDeEstatisticas` só monta os números (testável no Node); `abrirEstatisticas` desenha.
 */
import { CONQUISTAS, GRADUACOES } from '../../conteudo/conquistas.js';
import { VERBETES } from '../../conteudo/grimorio.js';
import { OPONENTES } from '../../nucleo/oponentes/index.js';
import { BARALHOS } from '../../nucleo/baralhos.js';
import { TERRENOS } from '../../nucleo/terrenos.js';
import { estatisticasDe } from '../../online/estatisticas.js';
import { formatarTempo } from '../../online/placar.js';
import { firebaseConfigurado } from '../../online/firebase.js';
import { contaAtual, haMarcaDeConta } from '../conta.js';
import { abrirPainel, escaparHtml } from '../paineis.js';

/** Nome de cada ação contada (`acao_jogada`): o tipo da jogada ou o efeito que a pilha teve. */
export const NOMES_DAS_ACOES = {
  ativar: 'Neurônios ativados', empilhar: 'Pilhas sem efeito especial', tunagem: 'Tunagens', overfit: 'Overfits',
  earlystop: 'Early stops', stackoverflow: 'Stack overflows', dropout: 'Dropouts', transfer: 'Transferências', passar: 'Passadas de vez',
};

const numero = (n) => Number(n || 0).toLocaleString('pt-BR');
const porcentagem = (parte, todo) => (todo > 0 ? Math.round((100 * parte) / todo) + '%' : '—');
const data = (ms) => (ms ? new Date(ms).toLocaleDateString('pt-BR') : '—');

/** Chave com mais jogadas numa tabela (`{ id: { jogadas, vencidas } }`) e o texto "nome · N jogadas · X% de vitórias". */
function favorito(tabela, nomes) {
  const [chave, linha] = Object.entries(tabela || {}).sort((a, b) => b[1].jogadas - a[1].jogadas)[0] || [];
  if (!chave) return '—';
  const nome = nomes[chave] ? nomes[chave].nome : chave;
  return nome + ' · ' + numero(linha.jogadas) + (linha.jogadas === 1 ? ' vez' : ' vezes') + ' · ' + porcentagem(linha.vencidas, linha.jogadas) + ' de vitórias';
}

/**
 * As seções da página: `[{ titulo, linhas: [[rótulo, valor]] }]`, com os valores já em texto.
 * @param {object} progresso Progresso do jogador (com ou sem `estatisticas`).
 */
export function secoesDeEstatisticas(progresso) {
  const e = estatisticasDe(progresso), p = progresso, partidas = e.partidas, maos = e.maos;
  const perdidas = Math.max(0, partidas.terminadas - partidas.vencidas);
  const feitas = CONQUISTAS.filter((c) => (p.desbloqueadas || {})[c.id]);
  const porGraduacao = Object.keys(GRADUACOES).map((g) => {
    const todas = CONQUISTAS.filter((c) => c.graduacao === g);
    return [GRADUACOES[g].nome, feitas.filter((c) => c.graduacao === g).length + ' de ' + todas.length];
  }).filter(([, valor]) => !valor.endsWith(' de 0'));
  const acoes = Object.keys(NOMES_DAS_ACOES).map((k) => [NOMES_DAS_ACOES[k], numero(e.acoes[k])]);
  /* ações que a página ainda não conhece entram no fim, com o próprio nome */
  for (const k of Object.keys(e.acoes)) if (!NOMES_DAS_ACOES[k]) acoes.push([k, numero(e.acoes[k])]);
  return [
    { titulo: 'Tempo', linhas: [
      ['Tempo acumulado em partida', formatarTempo(e.tempoDePartida)],
      ['Tempo médio por partida', partidas.terminadas + partidas.abandonadas ? formatarTempo(e.tempoDePartida / (partidas.terminadas + partidas.abandonadas)) : '—'],
      ['Vezes que abriu o jogo', numero(e.acessos)],
      ['Primeiro acesso', data(e.primeiroAcesso)],
      ['Último acesso', data(e.ultimoAcesso)],
    ] },
    { titulo: 'Partidas', linhas: [
      ['Iniciadas', numero(partidas.iniciadas)], ['Terminadas', numero(partidas.terminadas)],
      ['Vencidas', numero(partidas.vencidas)], ['Perdidas', numero(perdidas)], ['Abandonadas', numero(partidas.abandonadas)],
      ['Aproveitamento', porcentagem(partidas.vencidas, partidas.terminadas)],
    ] },
    { titulo: 'Mãos', linhas: [
      ['Jogadas', numero(Math.max(maos.jogadas, p.maos || 0))], ['Vencidas', numero(Math.max(maos.vencidas, p.vitorias || 0))],
      ['Aproveitamento', porcentagem(Math.max(maos.vencidas, p.vitorias || 0), Math.max(maos.jogadas, p.maos || 0))],
      ['Pontos de rede somados (todas as mãos)', numero(p.pontos)],
      ['Maior rede numa mão', numero(e.recordes.maiorRede)],
      ['Maior sequência de mãos vencidas', numero(e.recordes.maiorSequencia)],
      ['Vitórias sem usar ações', numero(p.vitoriasZen)],
    ] },
    { titulo: 'Ações na rede', linhas: [...acoes, ['Dropouts (contados nas mãos)', numero(p.dropouts)]] },
    { titulo: 'Truco e partidas online', linhas: [
      ['Trucos pedidos', numero(e.trucos.pedidos)], ['Salas criadas', numero(e.online.salasCriadas)],
      ['Salas em que entrou', numero(e.online.salasEntradas)], ['Partidas online', numero(e.online.partidas)],
    ] },
    { titulo: 'Favoritos', linhas: [
      ['Oponente mais enfrentado', favorito(e.porOponente, OPONENTES)],
      ['Baralho mais usado', favorito(e.porBaralho, BARALHOS)],
      ['Terreno mais usado', favorito(e.porTerreno, TERRENOS)],
    ] },
    { titulo: 'Conquistas e biblioteca', linhas: [
      ['Conquistas desbloqueadas', feitas.length + ' de ' + CONQUISTAS.length], ...porGraduacao,
      ['Verbetes lidos', (p.verbetesLidos || 0) + ' de ' + VERBETES.length],
      ['Terrenos vencidos', Object.keys(p.terrenos || {}).length + ' de ' + Object.keys(TERRENOS).length],
      ['Baralhos vencidos', Object.keys(p.baralhos || {}).length + ' de ' + Object.keys(BARALHOS).length],
    ] },
  ];
}

/** HTML de uma seção: título e tabela de pares rótulo/valor. */
export function secaoHtml(secao) {
  return '<section class="estatisticas-secao"><h3>' + escaparHtml(secao.titulo) + '</h3><dl>' +
    secao.linhas.map(([rotulo, valor]) => '<div><dt>' + escaparHtml(rotulo) + '</dt><dd>' + escaparHtml(valor) + '</dd></div>').join('') + '</dl></section>';
}

/** De quem são os números: da conta conectada, da conta que ainda está sendo retomada, ou só deste aparelho. */
function origemDasEstatisticas() {
  const conta = contaAtual();
  if (conta) return 'Estatísticas da conta de <b>' + escaparHtml(conta.nome) + '</b>: valem em qualquer aparelho em que você entrar.';
  if (haMarcaDeConta()) return 'Carregando as estatísticas da sua conta…';
  if (!firebaseConfigurado()) return 'Estatísticas deste aparelho.';
  return 'Estatísticas só deste aparelho. Para guardá-las e comparar com outros jogadores, entre numa conta em <b>Jogar online</b>.';
}

/**
 * Abre a página de estatísticas pessoais.
 * @param {object} app Aplicação (lê o progresso).
 */
export function abrirEstatisticas(app) {
  const html = '<div class="folha larga estatisticas"><button class="fechar-x" data-fechar aria-label="Fechar">×</button>' +
    '<h2>Estatísticas</h2><p class="conquistas-origem">' + origemDasEstatisticas() + '</p>' +
    '<div class="estatisticas-grade">' + secoesDeEstatisticas(app.progresso).map(secaoHtml).join('') + '</div>' +
    '<div class="linha fim"><button class="botao" data-fechar>Fechar</button></div></div>';
  return abrirPainel(html, { fechaAoClicarFora: true });
}
