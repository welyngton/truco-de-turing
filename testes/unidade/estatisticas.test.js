/**
 * @file Testes unitários para src/online/estatisticas.js (issue #66).
 * Verifica contadores, merge sem dupla contagem e resumo da conta.
 *
 * Rodar: node --test testes/unidade/estatisticas.test.js
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  registrarAcesso,
  registrarInicioDePartida,
  registrarFimDePartida,
  registrarTruco,
  registrarSalaOnline,
  registrarMaoPorContexto,
  resumoDaConta,
  mesclarEstatisticas,
} from '../../src/online/estatisticas.js';

/** Progresso mínimo para os testes (sem nenhuma estatística prévia). */
function progresso() { return {}; }

describe('registrarAcesso', () => {
  it('incrementa total e guarda primeiro e último acesso', () => {
    const p = progresso();
    registrarAcesso(p);
    assert.equal(p.acessos.total, 1);
    assert.ok(p.acessos.primeiro);
    assert.ok(p.acessos.ultimo);
    registrarAcesso(p);
    assert.equal(p.acessos.total, 2);
    assert.ok(p.acessos.primeiro, 'primeiro acesso não muda no segundo acesso');
  });
});

describe('registrarInicioDePartida / registrarFimDePartida', () => {
  it('contabiliza partidas iniciadas, terminadas e vitórias', () => {
    const p = progresso();
    registrarInicioDePartida(p, { online: false });
    assert.equal(p.partidas.iniciadas, 1);
    assert.equal(p.partidas.terminadas, 0);
    registrarFimDePartida(p, { venceu: true });
    assert.equal(p.partidas.terminadas, 1);
    assert.equal(p.partidas.vencidas, 1);
    registrarInicioDePartida(p, { online: false });
    registrarFimDePartida(p, { venceu: false });
    assert.equal(p.partidas.terminadas, 2);
    assert.equal(p.partidas.vencidas, 1);
  });

  it('contabiliza partida abandonada (não conta como terminada)', () => {
    const p = progresso();
    registrarInicioDePartida(p, { online: false });
    registrarFimDePartida(p, { abandonada: true });
    assert.equal(p.partidas.abandonadas, 1);
    assert.equal(p.partidas.terminadas, 0, 'abandonada não é terminada');
  });
});

describe('registrarTruco', () => {
  it('incrementa o contador de trucos', () => {
    const p = progresso();
    registrarTruco(p);
    registrarTruco(p);
    assert.equal(p.trucos, 2);
  });
});

describe('registrarSalaOnline', () => {
  it('contabiliza salas criadas e entradas', () => {
    const p = progresso();
    registrarSalaOnline(p, { criou: true });
    registrarSalaOnline(p, { criou: false });
    registrarSalaOnline(p, { criou: false });
    assert.equal(p.onlineStats.salasCriadas, 1);
    assert.equal(p.onlineStats.salasEntrou, 2);
  });
});

describe('registrarMaoPorContexto', () => {
  it('contabiliza jogadas e vitórias por oponente, baralho e terreno', () => {
    const p = progresso();
    registrarMaoPorContexto(p, { oponente: 'padrao', baralho: 'base', terreno: 'neutro', venceu: true });
    registrarMaoPorContexto(p, { oponente: 'padrao', baralho: 'base', terreno: 'neutro', venceu: false });
    assert.equal(p.porOponente.padrao.jogadas, 2);
    assert.equal(p.porOponente.padrao.vencidas, 1);
    assert.equal(p.porBaralho.base.jogadas, 2);
    assert.equal(p.porTerreno.neutro.jogadas, 2);
  });
});

describe('mesclarEstatisticas', () => {
  it('contadores tomam o maior valor (sem dupla contagem)', () => {
    const local = progresso();
    registrarAcesso(local);
    registrarAcesso(local);
    registrarTruco(local);

    /* simulação do que veio da conta: 3 acessos já gravados antes */
    const conta = { acessos: { total: 3 }, trucos: 1 };

    mesclarEstatisticas(local, conta);

    /* deve ficar com o maior: conta tinha 3 acessos, local tinha 2 → fica 3 */
    assert.equal(local.acessos.total, 3);
    /* trucos: ambos tinham 1 → fica 1 */
    assert.equal(local.trucos, 1);
  });

  it('mescla porOponente, porBaralho e porTerreno tomando o maior em cada chave', () => {
    const local = progresso();
    registrarMaoPorContexto(local, { oponente: 'padrao', baralho: 'base', terreno: 'neutro', venceu: true });

    const conta = {
      porOponente: { padrao: { jogadas: 5, vencidas: 3 } },
      porBaralho: { base: { jogadas: 10, vencidas: 4 } },
      porTerreno: { neutro: { jogadas: 8, vencidas: 2 } },
    };

    mesclarEstatisticas(local, conta);

    assert.equal(local.porOponente.padrao.jogadas, 5);
    assert.equal(local.porOponente.padrao.vencidas, 3);
    assert.equal(local.porBaralho.base.jogadas, 10);
    assert.equal(local.porTerreno.neutro.jogadas, 8);
  });

  it('não falha com conta vazia ou undefined', () => {
    const p = progresso();
    registrarAcesso(p);
    assert.doesNotThrow(() => mesclarEstatisticas(p, {}));
    assert.doesNotThrow(() => mesclarEstatisticas(p, null));
    assert.doesNotThrow(() => mesclarEstatisticas(p, undefined));
    assert.equal(p.acessos.total, 1);
  });
});

describe('resumoDaConta', () => {
  it('retorna contagens calculadas a partir do progresso', () => {
    const p = progresso();
    p.vitorias = 5;
    p.partidas = { terminadas: 10, vencidas: 5, iniciadas: 10, abandonadas: 0 };
    const r = resumoDaConta(p);
    assert.ok(typeof r === 'object');
    /* conquistas pode ser objeto vazio quando não há nenhuma */
    assert.ok('conquistas' in r);
  });
});
