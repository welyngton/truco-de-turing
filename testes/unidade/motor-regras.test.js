/**
 * @file Regras que a fusão mudou no motor do NeuroDeck (issue #1): B1, B2, R1 e R2.
 *
 * Cada teste descreve o cenário, a regra e o resultado esperado. Os testes foram escritos antes
 * das correções: falhavam no motor copiado e passam no motor da fusão. O conjunto de regras
 * original continua disponível com `newGame({ rules: 'nd-2.0.0' })`.
 *
 *  - B1: desempate "carta mais alta" comparava os pontos da carta, e K contra J caía no naipe.
 *  - B2: o trio de figuras valia o mesmo que o par (20).
 *  - R1 (professor): a carta empilhada conta na sequência de figuras.
 *  - R2: quem aplicou early stop na própria rede também pode passar.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../../src/motor/engine.js';
import { runGame } from '../../src/motor/sim.js';
import { configuracao, resumoDaPartida, RESUMO_DO_SITE } from '../apoio/equivalencia-motor.js';

const K = 13, Q = 12, J = 11, AS = 1;
const carta = (id, rank, suit) => ({ id, rank, suit });

/**
 * Monta a rede do jogador 0 com as cartas dadas (uma por camada, a partir da entrada) e devolve
 * a pontuação. `tunagens`: { índiceDaCamada: quantas cartas iguais empilhadas }.
 */
function pontuar(ranks, tunagens = {}, opcoes = {}) {
  const s = E.newGame({ seed: 9, firstRule: 'random', ...opcoes });
  s.nets[0].path = [];
  ranks.forEach((rank, camada) => {
    const neuronio = s.layers[camada][0];
    neuronio.card = carta(1000 + camada, rank, 'S');
    neuronio.stack = Array.from({ length: tunagens[camada] || 0 }, (_, i) => carta(2000 + camada * 10 + i, rank, 'H'));
    s.nets[0].path.push({ layer: camada, slotIndex: 0 });
  });
  return E.score(s, 0);
}

/** Partida terminada e empatada em pontos e dropouts: o vencedor sai dos desempates pela mão. */
function empatadosComMaos(mao0, mao1, opcoes = {}) {
  const s = E.newGame({ seed: 5, firstRule: 'random', ...opcoes });
  s.nets.forEach((n) => { n.finished = true; n.reason = 'output'; });
  s.firstPlayer = 0;
  s.hands[0] = mao0;
  s.hands[1] = mao1;
  return E.compareTwo(s, 0, 1, [30, 30]);
}

/**
 * Os dois jogadores avançam 3 camadas; a rede do jogador da vez termina pelo `motivo` e ele tem
 * na mão uma carta igual à última carta do rival: existe um ataque (overfit) possível.
 */
function finalizadoComAtaquePossivel(motivo, opcoes = {}) {
  const s = E.newGame({ seed: 11, firstRule: 'random', ...opcoes });
  const p = s.turn, q = 1 - p;
  for (let i = 0; i < 3; i++) {
    E.applyMove(s, p, { type: 'advance', slotIndex: 0 });
    E.applyMove(s, q, { type: 'advance', slotIndex: 1 });
  }
  s.nets[p].finished = true;
  s.nets[p].reason = motivo;
  const alvo = E.lastSlot(s, q).card;
  s.hands[p] = [carta(950, alvo.rank, alvo.suit === 'S' ? 'H' : 'S')];
  return { s, p, q };
}

describe('B1: desempate pela carta mais alta', () => {
  test('K vence J quando a soma das mãos empata', () => {
    // Cenário: mãos K♦ 3♥ contra 3♠ J♠; figura vale 0, então as somas empatam (3 a 3).
    // Regra: decide a carta mais alta, na ordem A > K > Q > J > 10 … 2.
    // Esperado: vence o jogador 0 (K), pelo critério 'carta-alta'.
    const r = empatadosComMaos([carta(900, K, 'D'), carta(901, 3, 'H')], [carta(902, 3, 'S'), carta(903, J, 'S')]);
    assert.deepEqual(r, { winner: 0, tiebreak: 'carta-alta' });
  });

  test('Q vence J, e figura vence carta numérica', () => {
    // Cenário: somas empatadas e cartas mais altas diferentes, sem depender do naipe.
    // Esperado: a carta mais alta decide (Q > J; K > 8, mesmo valendo 0 ponto).
    assert.deepEqual(empatadosComMaos([carta(900, Q, 'D')], [carta(901, J, 'S')]), { winner: 0, tiebreak: 'carta-alta' });
    assert.deepEqual(empatadosComMaos([carta(900, K, 'D'), carta(901, 10, 'H')], [carta(902, 8, 'S'), carta(903, 2, 'S')]), { winner: 0, tiebreak: 'carta-alta' });
  });

  test('Ás é a carta mais alta', () => {
    // Cenário: Ás e K contra 5 e 6: as duas mãos somam 11. Esperado: vence quem tem o Ás.
    assert.deepEqual(empatadosComMaos([carta(900, AS, 'D'), carta(901, K, 'D')], [carta(902, 5, 'S'), carta(903, 6, 'S')]), { winner: 0, tiebreak: 'carta-alta' });
  });

  test('o naipe só decide quando a carta mais alta é a mesma', () => {
    // Cenário: K♦ 3♥ contra 3♠ K♠: mesma soma e mesma carta mais alta (K).
    // Regra: aí decide o naipe (♠ > ♥ > ♣ > ♦).
    // Esperado: vence o jogador 1 (K♠), pelo critério 'naipe'.
    const r = empatadosComMaos([carta(900, K, 'D'), carta(901, 3, 'H')], [carta(902, 3, 'S'), carta(903, K, 'S')]);
    assert.deepEqual(r, { winner: 1, tiebreak: 'naipe' });
  });

  test('no motor original (nd-2.0.0), K contra J era decidido pelo naipe', () => {
    // Registro do comportamento antigo, mantido para a conferência de equivalência.
    const r = empatadosComMaos([carta(900, K, 'D'), carta(901, 3, 'H')], [carta(902, 3, 'S'), carta(903, J, 'S')], { rules: 'nd-2.0.0' });
    assert.deepEqual(r, { winner: 1, tiebreak: 'naipe' });
  });
});

describe('B2: o trio de figuras vale mais que o par', () => {
  test('par de figuras iguais vale 20 (10 por figura)', () => {
    // Cenário: 2-K-K-2. Esperado: 2 + 20 + 2 = 24.
    assert.equal(pontuar([2, K, K, 2]).total, 24);
  });

  test('trio de figuras iguais vale 30 (10 por figura)', () => {
    // Cenário: 2-K-K-K-2. Esperado: 2 + 30 + 2 = 34, mais que o par (24).
    assert.equal(pontuar([2, K, K, K, 2]).total, 34);
    assert.ok(pontuar([2, K, K, K, 2]).total > pontuar([2, K, K, 2]).total);
  });

  test('quadra de figuras iguais zera a rede (vanishing gradient)', () => {
    // Cenário: 2-K-K-K-K-2. Esperado: total 0 e a marca de vanishing.
    const r = pontuar([2, K, K, K, K, 2]);
    assert.equal(r.total, 0);
    assert.equal(r.vanishing, true);
  });

  test('figura isolada continua valendo 0, e figuras diferentes não formam par', () => {
    assert.equal(pontuar([2, K, 2]).total, 4);
    assert.equal(pontuar([2, K, Q, 2]).total, 4);
  });

  test('no motor original (nd-2.0.0), o trio empatava com o par', () => {
    assert.equal(pontuar([2, K, K, K, 2], {}, { rules: 'nd-2.0.0' }).total, 24);
    assert.equal(pontuar([2, K, K, 2], {}, { rules: 'nd-2.0.0' }).total, 24);
  });
});

describe('R1: a carta empilhada conta na sequência de figuras', () => {
  test('exemplo do slide: 8-K-K-3 com um K tunado vale 41', () => {
    // Cenário: os dois Ks vizinhos e mais um K empilhado formam um trio (30).
    // Esperado: 8 + 30 + 3 = 41; a figura empilhada conta só na sequência, sem os +10 da tunagem.
    assert.equal(pontuar([8, K, K, 3], { 1: 1 }).total, 41);
  });

  test('tunar os dois Ks de um par forma quadra e zera a rede', () => {
    // Regra do professor: tunar demais um ponto prejudica a rede como um todo.
    const r = pontuar([2, K, K, 2], { 1: 1, 2: 1 });
    assert.equal(r.total, 0);
    assert.equal(r.vanishing, true);
  });

  test('figura isolada tunada com outra igual forma par e vale 20', () => {
    // Cenário: 2-K-2 com um K empilhado sobre o K. Esperado: 2 + 20 + 2 = 24.
    assert.equal(pontuar([2, K, 2], { 1: 1 }).total, 24);
  });

  test('tunagem de carta numérica continua somando o valor da carta empilhada', () => {
    // Cenário: 2-7-2 com um 7 empilhado. Esperado: 2 + 7 + 7 + 2 = 18.
    assert.equal(pontuar([2, 7, 2], { 1: 1 }).total, 18);
  });

  test('o detalhamento por neurônio soma o total', () => {
    const r = pontuar([8, K, K, 3], { 1: 1 });
    assert.deepEqual(r.items.map((it) => it.subtotal), [8, 20, 10, 3]);
    assert.deepEqual(r.items.map((it) => it.base), [8, 10, 10, 3]);
    assert.deepEqual(r.items.map((it) => it.tune), [0, 10, 0, 0]);
  });

  test('no motor original (nd-2.0.0), a carta empilhada não entrava na sequência', () => {
    assert.equal(pontuar([8, K, K, 3], { 1: 1 }, { rules: 'nd-2.0.0' }).total, 41); // 8 + 20 (par) + 10 (tunagem) + 3
    assert.equal(pontuar([2, K, K, 2], { 1: 1, 2: 1 }, { rules: 'nd-2.0.0' }).total, 44);
  });
});

describe('R2: qualquer early stop libera o passar', () => {
  test('quem sofreu early stop do rival pode passar, mesmo com ataque possível', () => {
    const { s, p, q } = finalizadoComAtaquePossivel('earlystop');
    assert.ok(E.legalMoves(s, p).some((m) => m.type === 'pass'));
    E.applyMove(s, p, { type: 'pass' });
    assert.equal(s.turn, q);
  });

  test('quem aplicou early stop na própria rede também pode passar', () => {
    const { s, p, q } = finalizadoComAtaquePossivel('auto-earlystop');
    assert.ok(E.legalMoves(s, p).some((m) => m.type === 'pass'));
    E.applyMove(s, p, { type: 'pass' });
    assert.equal(s.turn, q);
  });

  test('quem chegou à saída ou ficou sem neurônio livre é obrigado a jogar se puder', () => {
    for (const motivo of ['output', 'stuck']) {
      const { s, p } = finalizadoComAtaquePossivel(motivo);
      assert.ok(!E.legalMoves(s, p).some((m) => m.type === 'pass'), motivo);
      assert.throws(() => E.applyMove(s, p, { type: 'pass' }), motivo);
    }
  });

  test('com a rede aberta não se pode passar', () => {
    const s = E.newGame({ seed: 3, firstRule: 'random' });
    assert.throws(() => E.applyMove(s, s.turn, { type: 'pass' }));
  });

  test('no motor original (nd-2.0.0), quem se aplicou early stop era obrigado a atacar', () => {
    const { s, p } = finalizadoComAtaquePossivel('auto-earlystop', { rules: 'nd-2.0.0' });
    assert.throws(() => E.applyMove(s, p, { type: 'pass' }));
  });
});

describe('Conjuntos de regras', () => {
  test('o padrão é o conjunto da fusão, e o nome fica no estado', () => {
    assert.equal(E.newGame({ seed: 1 }).rules, 'fusao');
    assert.equal(E.newGame({ seed: 1, rules: 'nd-2.0.0' }).rules, 'nd-2.0.0');
    assert.throws(() => E.newGame({ seed: 1, rules: 'inexistente' }));
  });

  test('refazendo as mesmas jogadas com as regras da fusão, só muda o resultado de partidas que tocam B1, B2 ou R1', () => {
    // Cenário: as 1.000 partidas do site, com as mesmas jogadas, pontuadas pelas regras da fusão.
    // Regra: R2 só acrescenta a opção de passar, então toda jogada original continua válida.
    // Esperado: placar, vencedor ou desempate só mudam se a partida tem figura tunada ou trio
    // de figuras na rede de alguém (B2, R1), ou se chegou ao desempate pela carta mais alta (B1).
    let mudaram = 0;
    for (let i = 0; i < RESUMO_DO_SITE.total; i++) {
      const cfg = configuracao(i);
      const opcoes = { deck: cfg.deck, terrain: cfg.terrain, seed: cfg.seed, firstRule: cfg.firstRule, copies: cfg.copies, players: cfg.bots.length };
      const original = runGame({ ...cfg, rules: 'nd-2.0.0' });
      const refeita = E.replay({ ...opcoes, rules: 'fusao' }, original.moves);
      assert.equal(refeita.over, true, 'partida ' + i + ' termina no mesmo ponto');
      if (resumoDaPartida(refeita) === resumoDaPartida(original)) continue;
      mudaram++;
      const tocaFiguras = refeita.nets.some((net) => {
        const slots = net.path.map((r) => refeita.layers[r.layer][r.slotIndex]);
        return slots.some((sl, k) => sl.card.rank >= 11 && (sl.stack.length > 0 || (slots[k + 1]?.card.rank === sl.card.rank && slots[k + 2]?.card.rank === sl.card.rank)));
      });
      const tocaCartaAlta = [original.tiebreak, refeita.tiebreak].some((t) => t === 'carta-alta' || t === 'naipe');
      assert.ok(tocaFiguras || tocaCartaAlta, 'partida ' + i + ' mudou sem tocar B1, B2 ou R1');
    }
    assert.ok(mudaram > 0, 'alguma partida precisa exercitar as regras novas');
  });
});

describe('Decisões confirmadas pelo professor (o motor já fazia assim)', () => {
  /** Os dois jogadores avançam 3 camadas (entrada, oculta 1 e oculta 2). */
  function redesNaOculta2() {
    const s = E.newGame({ seed: 11, firstRule: 'random' });
    const p = s.turn, q = 1 - p;
    for (let i = 0; i < 3; i++) {
      E.applyMove(s, p, { type: 'advance', slotIndex: 0 });
      E.applyMove(s, q, { type: 'advance', slotIndex: 1 });
    }
    return { s, p, q };
  }

  test('dropout: o neurônio desfeito sai da mesa, vai para o cemitério e não gasta a vez', () => {
    // Professor: "sai da mesa e não pode ser reutilizada".
    const { s, p } = redesNaOculta2();
    const neuronio = E.lastSlot(s, p), cartaDoNeuronio = neuronio.card;
    E.applyMove(s, p, { type: 'dropout', layers: 1, cardIds: [s.hands[p][0].id] });
    assert.equal(neuronio.removed, true);
    assert.equal(neuronio.owner, null);
    assert.ok(s.graveyard.includes(cartaDoNeuronio));
    assert.equal(s.turn, p);
    assert.equal(s.nets[p].dropouts, 1);
    assert.ok(!E.legalMoves(s, p).some((m) => m.type === 'advance' && m.slotIndex === neuronio.slotIndex));
  });

  test('camada sem neurônio livre: a rede é finalizada ali ("acabou o campo")', () => {
    // Cenário: os neurônios livres da próxima camada do jogador são removidos da mesa.
    const { s, p, q } = redesNaOculta2();
    for (const slot of s.layers[3]) if (slot.owner === null) slot.removed = true;
    s.hands[p] = []; s.hands[q] = [];
    E.applyMove(s, p, { type: 'pass' });
    assert.deepEqual(s.nets.map((n) => n.reason), ['stuck', 'stuck']);
    assert.equal(s.over, true);
  });

  test('transfer learning não gasta a vez e só vale uma vez por partida', () => {
    const s = E.newGame({ seed: 21, firstRule: 'random' });
    const p = s.turn;
    s.hands[p] = [carta(901, K, 'S'), carta(902, K, 'H'), carta(903, K, 'C'), carta(904, K, 'D'), carta(905, 2, 'S')];
    E.applyMove(s, p, { type: 'transfer', rank: K });
    assert.equal(s.turn, p);
    assert.equal(s.hands[p].length, 5);
    assert.equal(s.limbo.length, 6);
    s.hands[p] = [carta(911, Q, 'S'), carta(912, Q, 'H'), carta(913, Q, 'C'), carta(914, Q, 'D')];
    assert.throws(() => E.applyMove(s, p, { type: 'transfer', rank: Q }));
  });
});

describe('Regressão com as regras da fusão', () => {
  test('em 350 partidas aleatórias (7 baralhos, 4 terrenos, 2 a 4 jogadores) nenhuma carta some ou duplica e toda partida termina', () => {
    const baralhos = ['classic', 'backprop', 'nobreza', 'truco', 'fraternidade', 'yinyang', 'powerbi'];
    const terrenos = ['none', 'montanha', 'pantano', 'oceano'];
    const inicios = ['reveal', 'reveal-keep', 'random'];
    const todas = (s) => {
      const ids = [];
      for (const camada of s.layers) for (const slot of camada) if (!slot.removed) ids.push(slot.card.id, ...slot.stack.map((c) => c.id));
      for (const mao of s.hands) ids.push(...mao.map((c) => c.id));
      return ids.concat(s.limbo.map((c) => c.id), s.graveyard.map((c) => c.id), (s.unused || []).map((c) => c.id));
    };
    for (let g = 0; g < 350; g++) {
      const s = E.newGame({ seed: 4000 + g, deck: baralhos[g % 7], terrain: terrenos[g % 4], firstRule: inicios[g % 3], players: 2 + (g % 3) });
      const sorteio = E.mulberry32(77 + g);
      let jogadas = 0;
      while (!s.over && jogadas < 3000) {
        const p = s.turn;
        let lances = E.legalMoves(s, p);
        const semPassar = lances.filter((m) => m.type !== 'pass');
        if (semPassar.length) lances = semPassar;
        E.applyMove(s, p, lances[Math.floor(sorteio() * lances.length)]);
        jogadas++;
        const ids = todas(s);
        assert.equal(ids.length, s.totalCards, `partida ${g}, jogada ${jogadas}`);
        assert.equal(new Set(ids).size, s.totalCards, `partida ${g}, jogada ${jogadas}: carta duplicada`);
      }
      assert.equal(s.over, true, `partida ${g} não terminou`);
      assert.ok(Number.isInteger(s.winner), `partida ${g} sem vencedor`);
    }
  });
});
