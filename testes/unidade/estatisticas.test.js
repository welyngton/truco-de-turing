/**
 * @file Estatísticas do jogador (issue #66): acessos, contadores a partir dos eventos do jogo,
 * mescla entre aparelho e conta, documento da conta e a lista da tela Jogadores (linhas e CSV).
 *
 * Rodar: node --test testes/unidade/estatisticas.test.js
 */
import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { estatisticasIniciais, estatisticasDe, registrarAcesso, contarEvento, mesclarEstatisticas, resumoDoJogador, tipoDeAparelho } from '../../src/online/estatisticas.js';
import { mesclarProgresso, progressoDaConta, documentoDaConta, TEXTO_DA_CONTA } from '../../src/online/contas.js';
import { registrarEvento, aoRegistrarEvento, reiniciarAnalise, definirConta, EVENTOS, PROPRIEDADES_DO_JOGADOR } from '../../src/interface/analise.js';
import { linhaDoJogador, ordenarJogadores, csvDosJogadores, dataHora, COLUNAS } from '../../src/interface/telas/jogadores.js';

afterEach(() => reiniciarAnalise());

describe('estatísticas do jogador', () => {
  it('progresso antigo ganha as estatísticas vazias, sem perder o que já tem', () => {
    const p = { maos: 3, estatisticas: { acessos: 2, partidas: { iniciadas: 4 } } };
    const e = estatisticasDe(p);
    assert.equal(e.acessos, 2);
    assert.deepEqual(e.partidas, { iniciadas: 4, terminadas: 0, vencidas: 0, abandonadas: 0 });
    assert.deepEqual(e.online, estatisticasIniciais().online);
    assert.equal(p.estatisticas, e);
    assert.deepEqual(estatisticasDe({}), estatisticasIniciais());
  });

  it('acesso: conta a abertura, guarda o primeiro e o último, a versão e o aparelho', () => {
    const p = {};
    assert.equal(registrarAcesso(p, { agora: 1000, versao: '2.4.7', aparelho: 'computador' }), 1);
    assert.equal(registrarAcesso(p, { agora: 5000, versao: '2.5.0', aparelho: 'celular' }), 2);
    assert.deepEqual({ ...p.estatisticas, partidas: 0, maos: 0, trucos: 0, online: 0, porOponente: 0, porBaralho: 0, porTerreno: 0 },
      { acessos: 2, primeiroAcesso: 1000, ultimoAcesso: 5000, versao: '2.5.0', aparelho: 'celular', partidas: 0, maos: 0, trucos: 0, online: 0, porOponente: 0, porBaralho: 0, porTerreno: 0 });
  });

  it('tipo de aparelho: computador, celular ou tablet', () => {
    const janela = (toque, l, a) => ({ matchMedia: () => ({ matches: toque }), innerWidth: l, innerHeight: a });
    assert.equal(tipoDeAparelho(janela(false, 1280, 720)), 'computador');
    assert.equal(tipoDeAparelho(janela(true, 844, 390)), 'celular');
    assert.equal(tipoDeAparelho(janela(true, 1180, 820)), 'tablet');
    assert.equal(tipoDeAparelho({}), 'computador');
  });

  it('eventos do jogo viram contadores: partidas, mãos, truco, salas e tabelas por oponente, baralho e terreno', () => {
    const p = {};
    const contar = (nome, dados) => contarEvento(p, nome, dados);
    assert.equal(contar('jogo_iniciado', { oponente: 'guloso', online: 0 }), true);
    contar('fim_mao', { baralho: 'backprop', terreno: 'oceano', venceu: 1 });
    contar('fim_mao', { baralho: 'backprop', terreno: 'pantano', venceu: 0 });
    contar('jogo_finalizado', { oponente: 'guloso', online: 0, venceu: 1 });
    contar('jogo_iniciado', { oponente: 'guloso', online: 1 });
    contar('jogo_finalizado', { oponente: 'guloso', online: 1, venceu: 0 });
    contar('jogo_iniciado', { oponente: 'montecarlo', online: 0 });
    contar('jogo_abandonado', { oponente: 'montecarlo' });
    assert.equal(contar('truco', { valor: 3, meu: 1 }), true);
    assert.equal(contar('truco', { valor: 6, meu: 0 }), false, 'truco pedido por outro jogador não conta');
    contar('sala_online', { acao: 'criar' });
    contar('sala_online', { acao: 'entrar' });
    assert.equal(contar('sala_online', { acao: 'comecar' }), false);
    assert.equal(contar('menu_clique', { botao: 'jogar' }), false, 'evento sem contador não mexe em nada');
    const e = p.estatisticas;
    assert.deepEqual(e.partidas, { iniciadas: 3, terminadas: 2, vencidas: 1, abandonadas: 1 });
    assert.deepEqual(e.maos, { jogadas: 2, vencidas: 1 });
    assert.deepEqual(e.trucos, { pedidos: 1 });
    assert.deepEqual(e.online, { salasCriadas: 1, salasEntradas: 1, partidas: 1 });
    assert.deepEqual(e.porOponente, { guloso: { jogadas: 1, vencidas: 1 } }, 'a partida online não entra na tabela de oponentes');
    assert.deepEqual(e.porBaralho, { backprop: { jogadas: 2, vencidas: 1 } });
    assert.deepEqual(e.porTerreno, { oceano: { jogadas: 1, vencidas: 1 }, pantano: { jogadas: 1, vencidas: 0 } });
  });

  it('mescla: o maior de cada contador, o primeiro acesso mais antigo e o último mais recente', () => {
    const local = { ...estatisticasIniciais(), acessos: 3, primeiroAcesso: 500, ultimoAcesso: 9000, versao: '2.5.0', aparelho: 'celular',
      partidas: { iniciadas: 2, terminadas: 2, vencidas: 0, abandonadas: 0 }, porBaralho: { classico: { jogadas: 4, vencidas: 1 } } };
    const conta = { acessos: 10, primeiroAcesso: 100, ultimoAcesso: 7000, versao: '2.4.7', aparelho: 'computador',
      partidas: { iniciadas: 8, terminadas: 1, vencidas: 1, abandonadas: 3 }, porBaralho: { classico: { jogadas: 2, vencidas: 2 }, truco: { jogadas: 1, vencidas: 0 } } };
    const m = mesclarEstatisticas(local, conta);
    assert.equal(m.acessos, 10);
    assert.equal(m.primeiroAcesso, 100);
    assert.deepEqual([m.ultimoAcesso, m.versao, m.aparelho], [9000, '2.5.0', 'celular']);
    assert.deepEqual(m.partidas, { iniciadas: 8, terminadas: 2, vencidas: 1, abandonadas: 3 });
    assert.deepEqual(m.porBaralho, { classico: { jogadas: 4, vencidas: 2 }, truco: { jogadas: 1, vencidas: 0 } });
    assert.deepEqual(m.maos, { jogadas: 0, vencidas: 0 }, 'conta antiga, sem o grupo, não quebra');
    /* sem conta, vale o aparelho; não altera as entradas */
    assert.deepEqual(mesclarEstatisticas(local, null), local);
    assert.equal(local.partidas.iniciadas, 2);
    assert.equal(mesclarEstatisticas(null, null).acessos, 0);
  });

  it('o progresso mesclado e o documento da conta levam estatísticas, perfil e resumo', () => {
    const local = { vitorias: 2, maos: 5, lidos: { overfit: true }, desbloqueadas: { primeira: 10 }, estatisticas: { acessos: 1 } };
    const naConta = { vitorias: 1, maos: 9, lidos: { transfer: true }, desbloqueadas: { dez: 20 }, estatisticas: { acessos: 6, partidas: { terminadas: 4, vencidas: 3 } } };
    const m = mesclarProgresso(local, naConta);
    assert.equal(m.estatisticas.acessos, 6);
    assert.equal(progressoDaConta(m).estatisticas, m.estatisticas);
    const doc = documentoDaConta(m, { uid: 'u1', nome: 'Ada', email: 'ada@exemplo.com' }, 'email_novo');
    assert.deepEqual(doc.perfil, { nome: 'Ada', email: 'ada@exemplo.com', metodo: 'email' });
    assert.deepEqual(doc.resumo, { conquistas: 2, verbetesLidos: 2, acessos: 6, ultimoAcesso: 0, partidas: 4, vitorias: 3, maos: 0 });
    assert.deepEqual(resumoDoJogador(m), doc.resumo);
    assert.equal(documentoDaConta(m, null).perfil, undefined);
    assert.match(TEXTO_DA_CONTA, /nome, e-mail/);
  });

  it('registrarEvento avisa quem ouve dentro do jogo, mesmo sem medição, e marca a conta nos eventos de partida', () => {
    const vistos = [];
    const parar = aoRegistrarEvento((nome, dados) => vistos.push([nome, dados]));
    registrarEvento(EVENTOS.fimDaMao, { venceu: 1 });
    definirConta('uid1', 'google');
    registrarEvento(EVENTOS.jogoIniciado, { online: 0 });
    registrarEvento(EVENTOS.menuClique, { botao: 'jogar' });
    parar();
    registrarEvento(EVENTOS.fimDaMao, { venceu: 0 });
    assert.deepEqual(vistos, [['fim_mao', { venceu: 1, conta: 0 }], ['jogo_iniciado', { online: 0, conta: 1 }], ['menu_clique', { botao: 'jogar' }]]);
    /* um ouvinte com erro não derruba o jogo nem os outros */
    const outros = [];
    aoRegistrarEvento(() => { throw new Error('ruim'); });
    aoRegistrarEvento((nome) => outros.push(nome));
    registrarEvento(EVENTOS.truco, { meu: 1 });
    assert.deepEqual(outros, ['truco']);
    for (const nome of ['acesso', 'conta_retomada']) assert.ok(Object.values(EVENTOS).includes(nome));
    for (const prop of ['acessos', 'partidas', 'vitorias']) assert.ok(PROPRIEDADES_DO_JOGADOR.includes(prop));
  });
});

describe('tela Jogadores', () => {
  const doc = { uid: 'u1', perfil: { nome: 'Ada', email: 'ada@exemplo.com', metodo: 'google' }, desbloqueadas: { a: 1, b: 2 }, verbetesLidos: 7,
    estatisticas: { acessos: 5, primeiroAcesso: 1000, ultimoAcesso: 2000, aparelho: 'celular', versao: '2.5.0',
      partidas: { iniciadas: 4, terminadas: 3, vencidas: 2, abandonadas: 1 }, maos: { jogadas: 20, vencidas: 11 }, trucos: { pedidos: 6 }, online: { partidas: 1 } } };

  it('linha do jogador a partir do documento da conta; conta antiga usa os contadores que tem', () => {
    const j = linhaDoJogador(doc);
    assert.deepEqual([j.nome, j.acessos, j.conquistas, j.partidas, j.vitorias, j.abandonos, j.maos, j.maosVencidas, j.trucos, j.partidasOnline],
      ['Ada', 5, 2, 3, 2, 1, 20, 11, 6, 1]);
    const antiga = linhaDoJogador({ uid: 'u0', maos: 12, vitorias: 5 });
    assert.deepEqual([antiga.nome, antiga.email, antiga.acessos, antiga.maos, antiga.maosVencidas, antiga.ultimoAcesso], ['(sem nome)', '', 0, 12, 5, 0]);
  });

  it('ordem: último acesso mais recente primeiro, depois o nome', () => {
    const nomes = ordenarJogadores([{ nome: 'Caio', ultimoAcesso: 0 }, { nome: 'Bia', ultimoAcesso: 9 }, { nome: 'Ana', ultimoAcesso: 0 }]).map((j) => j.nome);
    assert.deepEqual(nomes, ['Bia', 'Ana', 'Caio']);
  });

  it('CSV com todas as colunas, ponto e vírgula, aspas e sem fórmulas vindas de nomes', () => {
    const csv = csvDosJogadores([linhaDoJogador(doc), linhaDoJogador({ uid: 'u2', perfil: { nome: '=SOMA(A1)', email: 'x;"y"@exemplo.com' } })]);
    const linhas = csv.replace('﻿', '').trim().split('\r\n');
    assert.ok(csv.startsWith('﻿'));
    assert.equal(linhas.length, 3);
    assert.equal(linhas[0], COLUNAS.map(([titulo]) => titulo).join(';'));
    assert.equal(linhas[1].split(';').length, COLUNAS.length);
    assert.ok(linhas[1].startsWith('Ada;ada@exemplo.com;google;' + dataHora(2000) + ';' + dataHora(1000) + ';5;2;7;4;3;2;1;20;11;6;1;celular;2.5.0;u1'));
    assert.ok(linhas[2].startsWith("'=SOMA(A1);\"x;\"\"y\"\"@exemplo.com\";"));
    assert.equal(dataHora(0), '');
    assert.match(dataHora(Date.UTC(2026, 10, 14, 12, 0)), /^2026-11-14 \d\d:00$/);
  });
});
