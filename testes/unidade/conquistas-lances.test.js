/**
 * @file Testes das conquistas sugeridas pelo professor Peng (issue #117) com jogadas de verdade:
 * a mão guarda um lance por jogada (`mao.lances`, ver nucleo/partida.js) e cada conquista lê os lances.
 * Os casos sintéticos de cada conquista estão em conteudo.test.js; aqui o motor joga.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { aplicarJogada, jogadasLegais, copiarMao, atualizarVisao } from '../../src/nucleo/partida.js';
import { CONQUISTAS, VALEM_NA_HORA, VALEM_SEM_MAO_COMPLETA } from '../../src/conteudo/conquistas.js';
import { novaPartida } from '../../src/nucleo/truco.js';
import { maoNova, maoAteOFim } from '../apoio/estados.js';
import { darMao, montarRede, ajustar, esvaziarCamada, criarCarta, encerrar } from '../apoio/montagem.js';

/** Testa a conquista `id` na mão, do ponto de vista do jogador `eu`. */
const vale = (id, mao, eu = 0, extra = {}) => CONQUISTAS.find((c) => c.id === id).teste({ mao, eu, opcoes: {}, progresso: {}, partida: novaPartida(12), completa: true, venceu: false, ...extra });

/** Id do último neurônio da rede de `j`. */
const fim = (mao, j) => mao.jogadores[j].caminho.at(-1);

describe('lances da mão', () => {
  it('cada jogada vira um lance, com camada, alvo e cartas gastas', () => {
    const mao = maoNova();
    montarRede(mao, 0, [['3'], ['4']]);
    montarRede(mao, 1, [['5'], ['9']]);
    const m1 = darMao(mao, 1, ['9', '2']);
    const m0 = darMao(mao, 0, ['9', '9', '7']);
    ajustar(mao, { vez: 1 });
    aplicarJogada(mao, { tipo: 'empilhar', jogador: 1, neuronio: fim(mao, 1), cartas: [m1[0].id] });
    aplicarJogada(mao, { tipo: 'empilhar', jogador: 0, neuronio: fim(mao, 1), cartas: [m0[0].id, m0[1].id] });
    assert.deepEqual(mao.lances.map((l) => [l.tipo, l.jogador, l.alvo, l.camada, l.cartas, l.proprio, l.consomeVez]), [
      ['tunagem', 1, 1, 1, 1, true, true],
      ['stackoverflow', 0, 1, 1, 2, false, true],
    ]);
  });
  it('ativação guarda a camada e os pontos do neurônio depois dos bônus; dropout e transfer não gastam a vez', () => {
    const mao = maoNova({ terreno: 'montanha' });
    const ativar = jogadasLegais(mao, mao.vez).find((j) => j.tipo === 'ativar');
    const quem = mao.vez;
    aplicarJogada(mao, ativar);
    const [lance] = mao.lances;
    assert.deepEqual([lance.tipo, lance.jogador, lance.camada], ['ativar', quem, 0]);
    assert.equal(typeof lance.valor, 'number');
    /* dropout e transfer */
    const m = maoNova();
    montarRede(m, 0, [['3'], ['4']]);
    const cartas = darMao(m, 0, ['2', '8', '8', '8', '8']);
    ajustar(m, { vez: 0 });
    aplicarJogada(m, { tipo: 'dropout', jogador: 0, n: 1, pagamento: [cartas[0].id] });
    aplicarJogada(m, { tipo: 'transfer', jogador: 0, cartas: cartas.slice(1).map((c) => c.id) });
    assert.deepEqual(m.lances.map((l) => [l.tipo, l.consomeVez, l.cartas]), [['dropout', false, 1], ['transfer', false, 4]]);
    assert.deepEqual(m.lances[0].camadas, [1]);
  });
  it('simulações não guardam lances', () => {
    const mao = maoNova();
    const copia = copiarMao(mao);
    aplicarJogada(copia, jogadasLegais(copia, copia.vez).find((j) => j.tipo === 'ativar'));
    assert.deepEqual(copia.lances, []);
  });
  it('mãos jogadas até o fim têm lances coerentes com as estatísticas dos jogadores', () => {
    for (let semente = 1; semente <= 40; semente++) {
      const mao = maoAteOFim({ semente });
      for (const [j, jogador] of mao.jogadores.entries()) {
        const meus = mao.lances.filter((l) => l.jogador === j);
        assert.equal(meus.filter((l) => l.tipo === 'tunagem').length, jogador.estatisticas.tunagens, 'tunagens, semente ' + semente);
        assert.equal(meus.filter((l) => l.tipo === 'overfit' && l.alvo !== j).length, jogador.estatisticas.overfits);
        assert.equal(meus.filter((l) => l.tipo === 'stackoverflow' && l.alvo !== j).length, jogador.estatisticas.overflows);
        assert.equal(meus.filter((l) => l.tipo === 'ativar').length, jogador.estatisticas.ativacoes);
      }
    }
  });
});

describe('conquistas lidas dos lances, com jogadas de verdade', () => {
  it('Uno Reverse Card: stack overflow logo depois da tunagem do oponente, mesmo com um dropout meu no meio', () => {
    const mao = maoNova();
    montarRede(mao, 0, [['3'], ['4'], ['6']]);
    montarRede(mao, 1, [['5'], ['9']]);
    const m1 = darMao(mao, 1, ['9', '2']);
    const m0 = darMao(mao, 0, ['9', '9', '2']);
    ajustar(mao, { vez: 1 });
    aplicarJogada(mao, { tipo: 'empilhar', jogador: 1, neuronio: fim(mao, 1), cartas: [m1[0].id] });
    assert.ok(!vale('uno', mao));
    aplicarJogada(mao, { tipo: 'dropout', jogador: 0, n: 1, pagamento: [m0[2].id] });
    aplicarJogada(mao, { tipo: 'empilhar', jogador: 0, neuronio: fim(mao, 1), cartas: [m0[0].id, m0[1].id] });
    assert.ok(vale('uno', mao), 'o dropout não gasta a vez e não quebra o "acabou de aplicar"');
  });
  it('Uno Reverse Card não vale se o oponente jogou outra coisa depois da tunagem', () => {
    const mao = maoNova();
    montarRede(mao, 0, [['3'], ['4']]);
    montarRede(mao, 1, [['5'], ['9']]);
    const m1 = darMao(mao, 1, ['9', '2']);
    darMao(mao, 0, ['2', '2']);
    ajustar(mao, { vez: 1 });
    aplicarJogada(mao, { tipo: 'empilhar', jogador: 1, neuronio: fim(mao, 1), cartas: [m1[0].id] });
    aplicarJogada(mao, { tipo: 'ativar', jogador: 0, neuronio: jogadasLegais(mao, 0).find((j) => j.tipo === 'ativar').neuronio });
    assert.equal(mao.vez, 1);
    aplicarJogada(mao, { tipo: 'ativar', jogador: 1, neuronio: jogadasLegais(mao, 1).find((j) => j.tipo === 'ativar').neuronio });
    assert.ok(!vale('uno', mao), 'depois da tunagem ele ainda ativou um neurônio');
  });
  it('There is no spoon e Cold start: stack overflow no primeiro neurônio oculto que o oponente revelou', () => {
    const mao = maoNova();
    montarRede(mao, 0, [['3']]);
    montarRede(mao, 1, [['5']]);
    ajustar(mao, { vez: 1 });
    aplicarJogada(mao, jogadasLegais(mao, 1).find((j) => j.tipo === 'ativar'));
    const alvo = mao.neuronios[fim(mao, 1)];
    assert.equal(alvo.camada, 1);
    const valor = alvo.cartas[0].valor;
    const cartas = darMao(mao, 0, [valor, valor, valor]);
    aplicarJogada(mao, { tipo: 'empilhar', jogador: 0, neuronio: alvo.id, cartas: cartas.map((c) => c.id) });
    assert.ok(vale('semspoon', mao, 0));
    assert.ok(!vale('semspoon', mao, 1), 'quem sofreu não aplicou');
    assert.ok(vale('coldstart', mao, 1));
    assert.ok(!vale('coldstart', mao, 0));
  });
  it('There is no spoon não vale no segundo neurônio oculto que o oponente revela na camada 1', () => {
    const mao = maoNova();
    montarRede(mao, 0, [['3']]);
    montarRede(mao, 1, [['5']]);
    ajustar(mao, { vez: 1 });
    aplicarJogada(mao, jogadasLegais(mao, 1).find((j) => j.tipo === 'ativar'));
    const primeiro = mao.neuronios[fim(mao, 1)];
    const v = primeiro.cartas[0].valor;
    const dois = darMao(mao, 0, [v]);
    aplicarJogada(mao, { tipo: 'empilhar', jogador: 0, neuronio: primeiro.id, cartas: [dois[0].id] }); /* overfit: ele recua */
    assert.equal(mao.jogadores[1].caminho.length, 1);
    aplicarJogada(mao, jogadasLegais(mao, 1).find((j) => j.tipo === 'ativar')); /* revela de novo na camada 1 */
    const segundo = mao.neuronios[fim(mao, 1)];
    const w = segundo.cartas[0].valor;
    const tres = darMao(mao, 0, [w, w, w]);
    aplicarJogada(mao, { tipo: 'empilhar', jogador: 0, neuronio: segundo.id, cartas: tres.map((c) => c.id) });
    assert.ok(!vale('semspoon', mao, 0));
    assert.ok(vale('coldstart', mao, 1));
  });
  it('Foi sem querer querendo: o dropout só conta se o neurônio seguinte vale mais que o desfeito', () => {
    const mao = maoNova();
    montarRede(mao, 0, [['3'], ['4']]);
    montarRede(mao, 1, [['5']]);
    /* na camada 1, o neurônio livre 0 vale 9 e o 1 vale 2 */
    const livres = mao.estadoMotor.layers[1].filter((s) => s.owner === null);
    livres[0].card = criarCarta(mao, '9');
    livres[1].card = criarCarta(mao, '2');
    atualizarVisao(mao);
    const cartas = darMao(mao, 0, ['2', '2']);
    ajustar(mao, { vez: 0 });
    aplicarJogada(mao, { tipo: 'dropout', jogador: 0, n: 1, pagamento: [cartas[0].id] });
    aplicarJogada(mao, { tipo: 'ativar', jogador: 0, neuronio: 'C1N' + livres[0].slotIndex });
    const [drop1] = mao.lances.filter((l) => l.tipo === 'dropout');
    assert.equal(drop1.revelouMaior, true, '9 no lugar do 4');
    /* segundo dropout, agora ativando o 2 no lugar do 9 */
    ajustar(mao, { vez: 0 });
    aplicarJogada(mao, { tipo: 'dropout', jogador: 0, n: 1, pagamento: [cartas[1].id] });
    aplicarJogada(mao, { tipo: 'ativar', jogador: 0, neuronio: 'C1N' + livres[1].slotIndex });
    const dropouts = mao.lances.filter((l) => l.tipo === 'dropout');
    assert.deepEqual(dropouts.map((l) => l.revelouMaior), [true, false]);
  });
  it('Na União Soviética… e Ideias são à prova de balas: camada oculta sem neurônio livre trava a rede', () => {
    const mao = maoNova();
    montarRede(mao, 0, [['3']]);
    montarRede(mao, 1, [['5'], ['6'], ['7']]);
    esvaziarCamada(mao, 3);
    ajustar(mao, { vez: 0 });
    aplicarJogada(mao, jogadasLegais(mao, 0).find((j) => j.tipo === 'ativar'));
    assert.equal(mao.jogadores[1].situacao, 'travada');
    assert.deepEqual(mao.lances.filter((l) => l.tipo === 'travada').map((l) => [l.jogador, l.camada]), [[1, 3]]);
    assert.ok(vale('uniao', mao, 0));
    assert.ok(!vale('uniao', mao, 1), 'quem travou não impediu ninguém');
    assert.ok(vale('balas', mao, 1, { venceu: true }));
    assert.ok(!vale('balas', mao, 1, { venceu: false }));
    assert.ok(!vale('balas', mao, 0, { venceu: true }));
  });
  it('travar na camada de saída não é travar numa camada oculta', () => {
    const mao = maoNova();
    montarRede(mao, 0, [['3']]);
    montarRede(mao, 1, [['5'], ['6'], ['7'], ['8'], ['9'], ['10']]);
    esvaziarCamada(mao, 6);
    ajustar(mao, { vez: 0 });
    aplicarJogada(mao, jogadasLegais(mao, 0).find((j) => j.tipo === 'ativar'));
    assert.equal(mao.jogadores[1].situacao, 'travada');
    assert.ok(!vale('uniao', mao, 0));
  });
  it('Redenção de Akaza e Desk rejection: três cartas iguais na própria última camada oculta', () => {
    const mao = maoNova();
    montarRede(mao, 0, [['3'], ['4'], ['5'], ['6'], ['7'], ['8']]);
    montarRede(mao, 1, [['5']]);
    const cartas = darMao(mao, 0, ['8', '8', '8']);
    ajustar(mao, { vez: 0 });
    aplicarJogada(mao, { tipo: 'empilhar', jogador: 0, neuronio: fim(mao, 0), cartas: cartas.map((c) => c.id) });
    const [lance] = mao.lances;
    assert.deepEqual([lance.tipo, lance.proprio, lance.camada], ['stackoverflow', true, 5]);
    assert.ok(vale('redencao', mao, 0, { venceu: false }));
    assert.ok(!vale('redencao', mao, 0, { venceu: true }));
    assert.ok(!vale('redencao', mao, 0, { venceu: false, completa: false }));
  });
  it('Expansão de Domínio: a mão esvazia só com ataques aos adversários; uma tunagem no meio estraga', () => {
    const mesa = () => {
      const mao = maoNova({ jogadores: [{ nome: 'A' }, { nome: 'B' }, { nome: 'C' }] });
      montarRede(mao, 0, [['3'], ['4']]);
      montarRede(mao, 1, [['5'], ['9']]);
      montarRede(mao, 2, [['6'], ['8']]);
      return mao;
    };
    /* stack overflow (3 cartas) no B e early stop (2 cartas) no C: as 5 cartas da mão saem em ataques */
    const mao = mesa();
    const cartas = darMao(mao, 0, ['9', '9', '9', '8', '8']);
    ajustar(mao, { vez: 0 });
    aplicarJogada(mao, { tipo: 'empilhar', jogador: 0, neuronio: fim(mao, 1), cartas: cartas.slice(0, 3).map((c) => c.id) });
    assert.ok(!vale('dominio', mao, 0), 'ainda sobram duas cartas');
    ajustar(mao, { vez: 0 });
    aplicarJogada(mao, { tipo: 'empilhar', jogador: 0, neuronio: fim(mao, 2), cartas: cartas.slice(3).map((c) => c.id) });
    assert.equal(mao.estadoMotor.hands[0].length, 0);
    assert.deepEqual(mao.lances.map((l) => [l.tipo, l.cartas]), [['stackoverflow', 3], ['earlystop', 2]]);
    assert.ok(vale('dominio', mao, 0));
    assert.ok(!vale('dominio', mao, 1), 'a mão do B foi descartada pelo stack overflow, mas ele não gastou cartas atacando');

    /* com uma tunagem no meio, a mão pode até esvaziar, mas não só com ataques */
    const outra = mesa();
    const c2 = darMao(outra, 0, ['4', '9', '9', '9', '7']);
    ajustar(outra, { vez: 0 });
    aplicarJogada(outra, { tipo: 'empilhar', jogador: 0, neuronio: fim(outra, 0), cartas: [c2[0].id] });
    ajustar(outra, { vez: 0 });
    aplicarJogada(outra, { tipo: 'empilhar', jogador: 0, neuronio: fim(outra, 1), cartas: c2.slice(1, 4).map((c) => c.id) });
    darMao(outra, 0, []);
    assert.ok(!vale('dominio', outra, 0));
  });
  it('Exodia, obliterar!: Royal Flush entre as cartas que sobraram na mão', () => {
    const mao = maoNova();
    darMao(mao, 0, [['A', 'E'], ['10', 'E'], ['J', 'E'], ['Q', 'E'], ['K', 'E']]);
    assert.ok(vale('exodia', mao, 0, { venceu: true }));
    assert.ok(!vale('exodia', mao, 0, { venceu: false }));
    darMao(mao, 0, [['A', 'E'], ['10', 'E'], ['J', 'E'], ['Q', 'E'], ['K', 'C']]);
    assert.ok(!vale('exodia', mao, 0, { venceu: true }));
  });
  it('Por um fio: só vale com desempate entre os dois primeiros e a mão completa', () => {
    const mao = maoNova();
    montarRede(mao, 0, [['3'], ['4']]);
    montarRede(mao, 1, [['3'], ['4']]);
    const resultado = encerrar(mao);
    assert.equal(resultado.somas[0], resultado.somas[1]);
    assert.ok(mao.estadoMotor.tiebreak, 'rede igual: decide por desempate');
    assert.ok(vale('fio', mao, 0));
    assert.ok(vale('fio', mao, 1));
    assert.ok(!vale('fio', mao, 0, { completa: false }));
    /* soma diferente: nada de desempate */
    const sem = maoNova();
    montarRede(sem, 0, [['3'], ['9']]);
    montarRede(sem, 1, [['3'], ['4']]);
    encerrar(sem);
    assert.equal(sem.estadoMotor.tiebreak, null);
    assert.ok(!vale('fio', sem, 0));
  });
  it('as conquistas que olham o resultado e as que valem na hora estão nas listas certas', () => {
    for (const id of ['coldstart', 'uno', 'semspoon', 'uniao', 'bias', 'dominio']) assert.ok(VALEM_NA_HORA.has(id), id + ' vale na hora');
    for (const id of ['fio', 'validacao', 'semquerer', 'balas', 'redencao', 'portal', 'alianca', 'doismais', 'virada', 'exodia', 'featureeng']) assert.ok(!VALEM_NA_HORA.has(id), id + ' espera o fim da mão');
    for (const id of ['namekusei', 'diganome']) assert.ok(VALEM_SEM_MAO_COMPLETA.has(id), id + ' vale mesmo se a mão acabou por truco');
  });
  it('Adeus, Namekusei: o relógio conta da criação da partida até a vitória', () => {
    const mao = maoNova();
    const partida = novaPartida(12);
    assert.ok(Date.now() - partida.iniciadaEm < 1000);
    const c = (extra) => vale('namekusei', mao, 0, { venceuPartida: true, partida, ...extra });
    assert.ok(c());
    partida.iniciadaEm = Date.now() - 5 * 60 * 1000 - 1;
    assert.ok(!c(), 'cinco minutos ou mais não vale');
    partida.iniciadaEm = Date.now() - 60 * 1000;
    assert.ok(!c({ venceuPartida: false }));
    assert.ok(!vale('namekusei', mao, 0, { venceuPartida: true, partida: novaPartida(6) }), 'só partida de 12 tentos');
  });
});
