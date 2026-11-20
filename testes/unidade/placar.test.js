/**
 * @file Estatísticas pessoais e conquistas globais (issue #154): contadores novos (tempo, ações,
 * recordes), a página de estatísticas, o resumo anônimo que a conta publica no placar e a análise
 * da posição do jogador entre os demais.
 *
 * Rodar: node --test testes/unidade/placar.test.js
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { estatisticasDe, contarEvento, mesclarEstatisticas } from '../../src/online/estatisticas.js';
import { mesclarProgresso, TEXTO_DA_CONTA } from '../../src/online/contas.js';
import { placarDoJogador, analisarPlacar, formatarTempo, formatarCampo, CAMPOS_DO_PLACAR, MAXIMO_DE_IDS } from '../../src/online/placar.js';
import { CONQUISTAS } from '../../src/conteudo/conquistas.js';
import { instalarNavegadorFalso } from '../apoio/ambiente.js';

instalarNavegadorFalso({ toque: true });
const { secoesDeEstatisticas, secaoHtml, NOMES_DAS_ACOES } = await import('../../src/interface/telas/estatisticas.js');
const { estatisticasGlobaisHtml, raridadeHtml } = await import('../../src/interface/telas/conquistasGlobais.js');

describe('contadores novos das estatísticas', () => {
  it('tempo de partida soma a duração de partidas terminadas e abandonadas, ignorando valores absurdos', () => {
    const p = {};
    contarEvento(p, 'jogo_finalizado', { venceu: 1, duracaoMs: 600000 });
    contarEvento(p, 'jogo_abandonado', { duracaoMs: 120000 });
    contarEvento(p, 'jogo_finalizado', { venceu: 0, duracaoMs: 0 });
    contarEvento(p, 'jogo_finalizado', { venceu: 0, duracaoMs: 7 * 60 * 60 * 1000 });
    contarEvento(p, 'jogo_finalizado', { venceu: 0, duracaoMs: 'x' });
    contarEvento(p, 'jogo_finalizado', { venceu: 0 });
    assert.equal(p.estatisticas.tempoDePartida, 720000);
  });

  it('ações jogadas viram contadores por tipo; sem o tipo, nada muda', () => {
    const p = {};
    assert.equal(contarEvento(p, 'acao_jogada', { acao: 'tunagem' }), true);
    contarEvento(p, 'acao_jogada', { acao: 'tunagem' });
    contarEvento(p, 'acao_jogada', { acao: 'overfit' });
    assert.equal(contarEvento(p, 'acao_jogada', {}), false);
    assert.deepEqual(p.estatisticas.acoes, { tunagem: 2, overfit: 1 });
  });

  it('recordes: maior rede e maior sequência de mãos vencidas', () => {
    const p = {};
    for (const [venceu, soma] of [[1, 40], [1, 72.4], [0, 10], [1, 55], [1, 30], [1, 31]]) contarEvento(p, 'fim_mao', { venceu, soma, baralho: 'classico', terreno: 'neutro' });
    assert.deepEqual(p.estatisticas.recordes, { maiorRede: 72, maiorSequencia: 3, sequenciaAtual: 3 });
  });

  it('mescla entre aparelho e conta: o maior de cada um, sem contar em dobro', () => {
    const a = { tempoDePartida: 5000, acoes: { tunagem: 3 }, recordes: { maiorRede: 50, maiorSequencia: 2, sequenciaAtual: 0 } };
    const b = { tempoDePartida: 9000, acoes: { tunagem: 1, dropout: 4 }, recordes: { maiorRede: 40, maiorSequencia: 5, sequenciaAtual: 1 } };
    const m = mesclarEstatisticas(a, b);
    assert.equal(m.tempoDePartida, 9000);
    assert.deepEqual(m.acoes, { tunagem: 3, dropout: 4 });
    assert.deepEqual(m.recordes, { maiorRede: 50, maiorSequencia: 5, sequenciaAtual: 1 });
    assert.deepEqual(mesclarEstatisticas(m, m), m, 'juntar de novo não muda nada');
    assert.equal(estatisticasDe({}).tempoDePartida, 0, 'progresso antigo ganha os campos novos');
  });
});

describe('página de estatísticas pessoais', () => {
  const progresso = () => {
    const p = { vitorias: 7, maos: 12, dropouts: 4, vitoriasZen: 1, pontos: 800, verbetesLidos: 3, terrenos: { neutro: true }, baralhos: { classico: true }, desbloqueadas: { primeira: 1, fio: 2 } };
    for (const nome of ['jogo_iniciado', 'jogo_iniciado']) contarEvento(p, nome, { online: 0 });
    contarEvento(p, 'jogo_finalizado', { venceu: 1, oponente: 'guloso', duracaoMs: 1500000 });
    contarEvento(p, 'jogo_abandonado', { duracaoMs: 300000 });
    for (const acao of ['tunagem', 'tunagem', 'dropout']) contarEvento(p, 'acao_jogada', { acao });
    contarEvento(p, 'fim_mao', { venceu: 1, soma: 61, baralho: 'backprop', terreno: 'oceano' });
    return p;
  };
  const valor = (secoes, titulo, rotulo) => secoes.find((s) => s.titulo === titulo).linhas.find(([r]) => r === rotulo)[1];

  it('mostra tempo acumulado, partidas, mãos, ações, favoritos e conquistas por graduação', () => {
    const s = secoesDeEstatisticas(progresso());
    assert.deepEqual(s.map((x) => x.titulo), ['Tempo', 'Partidas', 'Mãos', 'Ações na rede', 'Truco e partidas online', 'Favoritos', 'Conquistas e biblioteca']);
    assert.equal(valor(s, 'Tempo', 'Tempo acumulado em partida'), '30 min 00 s');
    assert.equal(valor(s, 'Tempo', 'Tempo médio por partida'), '15 min 00 s');
    assert.equal(valor(s, 'Partidas', 'Aproveitamento'), '100%');
    assert.equal(valor(s, 'Partidas', 'Abandonadas'), '1');
    assert.equal(valor(s, 'Mãos', 'Maior rede numa mão'), '61');
    assert.equal(valor(s, 'Mãos', 'Pontos de rede somados (todas as mãos)'), '800');
    assert.equal(valor(s, 'Ações na rede', 'Tunagens'), '2');
    assert.equal(valor(s, 'Ações na rede', 'Overfits'), '0');
    assert.match(valor(s, 'Favoritos', 'Oponente mais enfrentado'), /Gradiente Guloso · 1 vez · 100% de vitórias/);
    assert.match(valor(s, 'Favoritos', 'Baralho mais usado'), /1 vez/);
    assert.equal(valor(s, 'Conquistas e biblioteca', 'Conquistas desbloqueadas'), '2 de ' + CONQUISTAS.length);
    assert.equal(valor(s, 'Conquistas e biblioteca', 'Prata'), '1 de ' + CONQUISTAS.filter((c) => c.graduacao === 'prata').length);
    for (const k of Object.keys(NOMES_DAS_ACOES)) assert.ok(NOMES_DAS_ACOES[k]);
  });

  it('jogador novo: tudo zerado, sem dividir por zero nem quebrar', () => {
    const s = secoesDeEstatisticas({});
    assert.equal(valor(s, 'Tempo', 'Tempo acumulado em partida'), '0 s');
    assert.equal(valor(s, 'Tempo', 'Tempo médio por partida'), '—');
    assert.equal(valor(s, 'Partidas', 'Aproveitamento'), '—');
    assert.equal(valor(s, 'Favoritos', 'Terreno mais usado'), '—');
    assert.match(secaoHtml(s[0]), /<dl>/);
  });

  it('ação que a página não conhece entra no fim, com o próprio nome, escapado', () => {
    const p = { estatisticas: { acoes: { '<b>nova</b>': 2 } } };
    const secao = secoesDeEstatisticas(p).find((x) => x.titulo === 'Ações na rede');
    assert.deepEqual(secao.linhas.at(-2), ['<b>nova</b>', '2']);
    assert.ok(!secaoHtml(secao).includes('<b>nova</b>'));
  });
});

describe('placar global', () => {
  it('formatarTempo e formatarCampo', () => {
    assert.equal(formatarTempo(45000), '45 s');
    assert.equal(formatarTempo(450000), '7 min 30 s');
    assert.equal(formatarTempo(7500000), '2 h 05 min');
    assert.equal(formatarTempo(-5), '0 s');
    assert.equal(formatarCampo({ formato: 'tempo' }, 3600), '1 h 00 min');
    assert.equal(formatarCampo({ chave: 'maos' }, 12345), (12345).toLocaleString('pt-BR'));
  });

  it('o resumo da conta leva só números inteiros e ids de conquistas, sem nome nem e-mail', () => {
    const p = { vitorias: 6, maos: 10, dropouts: 2, vitoriasZen: 1, pontos: 123.6, verbetesLidos: 4, desbloqueadas: { fio: 5, uno: 9 }, perfil: { nome: 'Ada', email: 'ada@exemplo.com' } };
    contarEvento(p, 'jogo_finalizado', { venceu: 1, duracaoMs: 90000 });
    contarEvento(p, 'truco', { meu: 1 });
    const placar = placarDoJogador(p, 1234);
    assert.deepEqual(placar, { conquistas: 2, maosVencidas: 6, maos: 10, partidasVencidas: 1, pontos: 124, maiorRede: 0, maiorSequencia: 0,
      dropouts: 2, vitoriasZen: 1, trucos: 1, verbetes: 4, tempo: 90, ids: ['fio', 'uno'], atualizado: 1234 });
    assert.ok(!JSON.stringify(placar).includes('Ada') && !JSON.stringify(placar).includes('exemplo'));
    for (const c of CAMPOS_DO_PLACAR) assert.ok(Number.isInteger(placar[c.chave]), c.chave);
    const grande = placarDoJogador({ desbloqueadas: Object.fromEntries(Array.from({ length: 300 }, (_, i) => ['c' + i, 1])) });
    assert.equal(grande.ids.length, MAXIMO_DE_IDS);
    assert.deepEqual(Object.keys(placarDoJogador({})).sort(), [...CAMPOS_DO_PLACAR.map((c) => c.chave), 'ids', 'atualizado'].sort());
  });

  const docs = () => [
    { uid: 'ana', conquistas: 3, maos: 50, tempo: 7200, pontos: 900, ids: ['fio', 'uno', 'bias'] },
    { uid: 'beto', conquistas: 1, maos: 50, tempo: 600, pontos: 100, ids: ['fio'] },
    { uid: 'caio', conquistas: 2, maos: 10, tempo: 60, pontos: 5000, ids: ['fio', 'uno'] },
    { uid: 'dani', conquistas: 0, maos: 0, tempo: 0, pontos: 0, ids: [] },
  ];
  const campo = (analise, chave) => analise.posicoes.find((p) => p.chave === chave);

  it('posição: 1 + quantos têm mais, empate divide a posição, e % de jogadores que ficam abaixo', () => {
    const a = analisarPlacar(docs(), 'ana');
    assert.equal(a.jogadores, 4);
    assert.deepEqual([campo(a, 'conquistas').posicao, campo(a, 'conquistas').melhorQue, campo(a, 'conquistas').lider, campo(a, 'conquistas').mediana], [1, 100, 3, 2]);
    assert.equal(campo(a, 'maos').posicao, 1);
    assert.equal(analisarPlacar(docs(), 'beto').posicoes.find((p) => p.chave === 'maos').posicao, 1, 'empate no primeiro lugar');
    assert.equal(campo(a, 'pontos').posicao, 2);
    const c = analisarPlacar(docs(), 'caio');
    assert.deepEqual([campo(c, 'pontos').posicao, campo(c, 'pontos').melhorQue], [1, 100]);
    assert.deepEqual([campo(c, 'tempo').posicao, campo(c, 'tempo').melhorQue], [3, 33]);
    const d = analisarPlacar(docs(), 'dani');
    assert.deepEqual([campo(d, 'conquistas').posicao, campo(d, 'conquistas').melhorQue], [4, 0]);
    assert.equal(a.posicoes.length, CAMPOS_DO_PLACAR.length);
  });

  it('raridade: quantos jogadores têm cada conquista, da mais rara para a mais comum', () => {
    const a = analisarPlacar(docs(), 'ana');
    assert.equal(a.raridade.length, CONQUISTAS.length);
    const por = Object.fromEntries(a.raridade.map((r) => [r.id, r]));
    assert.deepEqual([por.fio.quantos, por.fio.porcento, por.uno.quantos, por.bias.quantos, por.bias.minha, por.fio.minha], [3, 75, 2, 1, true, true]);
    assert.equal(por.exodia.quantos, 0);
    assert.equal(analisarPlacar(docs(), 'dani').raridade.find((r) => r.id === 'fio').minha, false);
    const quantos = a.raridade.map((r) => r.quantos);
    assert.deepEqual(quantos, [...quantos].sort((x, y) => x - y));
    assert.equal(a.raridade.at(-1).id, 'fio', 'a mais comum no fim');
  });

  it('sozinho no placar, ou fora dele, a análise não quebra', () => {
    const so = analisarPlacar([{ uid: 'ana', conquistas: 2, ids: ['fio'] }], 'ana');
    assert.deepEqual([so.jogadores, campo(so, 'conquistas').posicao, campo(so, 'conquistas').melhorQue], [1, 1, 0]);
    const fora = analisarPlacar(docs(), 'ninguem');
    assert.deepEqual([fora.meu, fora.posicoes], [null, []]);
    assert.equal(analisarPlacar([], 'ana').raridade[0].porcento, 0);
    /* documento mal formado de outro jogador não derruba a conta */
    const torto = analisarPlacar([{ uid: 'ana', conquistas: 1, ids: ['fio'] }, { uid: 'x', ids: 'fio', conquistas: 'muitas' }], 'ana');
    assert.equal(torto.jogadores, 2);
  });

  it('HTML: área de estatísticas globais e raridade, sem nome de ninguém', () => {
    const a = analisarPlacar(docs(), 'beto');
    const html = estatisticasGlobaisHtml(a);
    assert.match(html, /Estatísticas globais/);
    assert.match(html, /entre <b>4 jogadores<\/b>.*<b>3º em conquistas<\/b>/s);
    assert.equal((html.match(/<tr>/g) || []).length, CAMPOS_DO_PLACAR.length + 1);
    assert.match(html, /Tempo em partida/);
    assert.match(html, /10 min 00 s|10 min/, 'tempo formatado');
    assert.ok(!/\b(ana|caio|dani)\b/i.test(html), 'os outros jogadores são anônimos');
    assert.match(estatisticasGlobaisHtml(analisarPlacar([docs()[0]], 'ana')), /único jogador/);
    const r = raridadeHtml(a);
    assert.equal((r.match(/data-conquista=/g) || []).length, CONQUISTAS.length);
    assert.match(r, /data-conquista="exodia"[^>]*>.*?0%/s);
    assert.match(r, /você tem/);
  });

  it('o texto da conta avisa do placar anônimo', () => {
    assert.match(TEXTO_DA_CONTA, /resumo anônimo.*sem nome nem e-mail/);
    assert.equal(mesclarProgresso({ pontos: 3 }, { pontos: 9 }).pontos, 9);
  });
});
