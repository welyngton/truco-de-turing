/**
 * @file Testes de aceitação das regras de negócio (especificação do tema 4, FPO 2026/2).
 *
 * Cada teste tem um identificador RN-xx, o mesmo usado na planilha
 * `relatorios/validacao/testes-regras-de-negocio.xlsx`, e um comentário com:
 *   Cenário:  a situação montada na mesa;
 *   Regra:    o que o enunciado, o professor ou o grupo determinaram;
 *   Esperado: o resultado verificado.
 *
 * As regras são as do motor do NeuroDeck com as decisões da fusão (10/11/2026). Os testes
 * marcados com "Mudou na fusão" fixavam outra leitura no Truco de Turing 1.2; o comentário diz
 * o que valia antes.
 *
 * Rodar: npm run testar   (ou: node --test testes/unidade/regras-de-negocio.test.js)
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  novaMao, aplicarJogada, jogadasLegais, fronteira, alvosDeEmpilhamento, podeEmpilhar, podePassar, valorParaTransfer,
} from '../../src/nucleo/partida.js';
import { pontuarRede } from '../../src/nucleo/pontuacao.js';
import { novaPartida, pedirTruco, responderTruco, podeTrucar, marcarTentos, ehMaoDeOnze } from '../../src/nucleo/truco.js';
import { TAMANHOS_CAMADAS } from '../../src/nucleo/rede.js';
import { JOGADORES, maoNova, redeCom } from '../apoio/estados.js';
import { darMao, montarRede, finalizarRede, ajustar, esvaziarCamada, encerrar } from '../apoio/montagem.js';

/* ======================================================================== auxiliares */

const NAIPES = ['E', 'C', 'P', 'O'];

/** Soma da rede do jogador 0 montada camada a camada; cada camada é 'K' ou 'K+K' (carta + tunagens). */
function soma(...camadas) {
  const pilhas = camadas.map((c) => c.split('+').map((valor, i) => [valor, NAIPES[i % 4]]));
  return pontuarRede(redeCom(pilhas), 0).total;
}

/** Quem está na vez ativa o primeiro neurônio livre. */
function jogarUmaVez(mao) {
  const j = mao.vez;
  aplicarJogada(mao, jogadasLegais(mao, j).find((x) => x.tipo === 'ativar'));
}

/** Faz `n` ativações alternadas a partir de uma mão nova (início por sorteio). */
function maoAvancada(n, opcoes = {}) {
  const mao = maoNova(opcoes);
  for (let i = 0; i < n; i++) jogarUmaVez(mao);
  return mao;
}

/** Encerra a mão com as duas redes vazias (soma 0 x 0), para decidir só pelos desempates. */
function desempate(mao0, mao1, { dropouts = [0, 0], primeiro = 0 } = {}) {
  const mao = maoNova();
  for (const j of [0, 1]) { montarRede(mao, j, []); finalizarRede(mao, j, 'output'); }
  darMao(mao, 0, mao0);
  darMao(mao, 1, mao1);
  ajustar(mao, { dropouts, primeiro });
  return encerrar(mao);
}

/** `quantas` cartas de mesmo valor da carta de cima do neurônio, em naipes variados. */
const iguaisA = (neuronio, quantas) => Array.from({ length: quantas }, (_, i) => [neuronio.cartas[0].valor, NAIPES[i % 4]]);

/** Ids das cartas da mão do jogador. */
const idsDaMao = (mao, j) => mao.jogadores[j].mao.map((c) => c.id);

/* ======================================================================== preparação */

describe('Preparação da mesa', () => {
  it('RN-01 mesa 3-5-5-5-5-5-4 virada, 5 cartas na mão de cada jogador e 10 no limbo (52 no total)', () => {
    // Cenário: mão nova com o baralho clássico.
    // Regra: 32 neurônios virados para baixo e sem dono; 5 cartas para cada jogador; 10 no limbo.
    const mao = maoNova();
    assert.deepEqual(mao.camadas.map((c) => c.length), TAMANHOS_CAMADAS);
    const neuronios = mao.camadas.flat();
    assert.equal(neuronios.length, 32);
    assert.ok(neuronios.every((n) => !n.revelado && n.dono === -1 && n.cartas.length === 1));
    assert.deepEqual(mao.jogadores.map((j) => j.mao.length), [5, 5]);
    assert.equal(mao.limbo.length, 10);
    const ids = [...neuronios.map((n) => n.cartas[0].id), ...mao.jogadores.flatMap((j) => j.mao.map((c) => c.id)), ...mao.limbo.map((c) => c.id)];
    assert.equal(new Set(ids).size, 52);
  });
});

describe('Quem começa', () => {
  it('RN-02 opção (a), o padrão: cada um revela uma carta, a maior começa e as cartas vão para o cemitério', () => {
    // Cenário: início "revela e descarta"; jogador 0 revela Ás, jogador 1 revela Rei.
    // Esperado: jogador 0 começa; cada um fica com 4 cartas; 2 cartas no cemitério.
    const mao = novaMao({ semente: 3, jogadores: JOGADORES });
    assert.equal(mao.config.inicio, 'revela-descarta');
    const reveladas = [darMao(mao, 0, ['AO', '2E', '3E', '4E', '5E'])[0], darMao(mao, 1, ['KE', '2C', '3C', '4C', '5C'])[0]];
    for (const j of [0, 1]) aplicarJogada(mao, { tipo: 'inicio', jogador: j, carta: reveladas[j].id });
    assert.equal(mao.fase, 'jogo');
    assert.equal(mao.vez, 0);
    assert.deepEqual(mao.jogadores.map((j) => j.mao.length), [4, 4]);
    assert.equal(mao.cemiterio.length, 2);
  });

  it('RN-03 opção (b): a maior começa e as cartas reveladas voltam para a mão', () => {
    // Mudou na fusão: a opção (b) deixou de ser o padrão; continua disponível no menu.
    // Cenário: início "revela e volta"; jogador 0 revela Rei de Copas, jogador 1 revela Rei de Espadas.
    // Regra: valores iguais desempatam pelo naipe (♠ > ♥ > ♣ > ♦).
    // Esperado: jogador 1 começa; os dois continuam com 5 cartas; cemitério vazio.
    const mao = novaMao({ semente: 3, inicio: 'revela-volta', jogadores: JOGADORES });
    const reveladas = [darMao(mao, 0, ['KC', '2E', '3E', '4E', '5E'])[0], darMao(mao, 1, ['KE', '2C', '3C', '4C', '5C'])[0]];
    for (const j of [0, 1]) aplicarJogada(mao, { tipo: 'inicio', jogador: j, carta: reveladas[j].id });
    assert.equal(mao.vez, 1);
    assert.deepEqual(mao.jogadores.map((j) => j.mao.length), [5, 5]);
    assert.equal(mao.cemiterio.length, 0);
  });

  it('RN-04 opção (c): par ou ímpar sorteia quem começa e a mão já está em jogo', () => {
    const mao = maoNova();
    assert.equal(mao.fase, 'jogo');
    assert.ok([0, 1].includes(mao.vez));
  });

  it('RN-05 força das cartas para começar: Ás > K > Q > J > 10 … 2', () => {
    // Cenário: jogador 0 revela Rei de Ouros, jogador 1 revela Dez de Espadas.
    // Esperado: o Rei vence, mesmo com naipe mais fraco (o naipe só desempata valores iguais).
    const mao = novaMao({ semente: 3, inicio: 'revela-volta', jogadores: JOGADORES });
    const reveladas = [darMao(mao, 0, ['KO', '2E'])[0], darMao(mao, 1, ['10E', '2C'])[0]];
    for (const j of [0, 1]) aplicarJogada(mao, { tipo: 'inicio', jogador: j, carta: reveladas[j].id });
    assert.equal(mao.vez, 0);
  });
});

/* ======================================================================== construção da rede */

describe('Construção da rede', () => {
  it('RN-06 um neurônio por camada, só na próxima camada, e cada neurônio tem um único dono', () => {
    // Cenário: o primeiro jogador ativa um neurônio da entrada.
    // Esperado: o rival não pode ativar o mesmo neurônio nem pular para a Oculta 2; pode ativar outro da entrada.
    const mao = maoNova();
    const p = mao.vez;
    aplicarJogada(mao, { tipo: 'ativar', jogador: p, neuronio: 'C0N0' });
    const q = mao.vez;
    assert.notEqual(q, p);
    assert.throws(() => aplicarJogada(mao, { tipo: 'ativar', jogador: q, neuronio: 'C0N0' }));
    assert.throws(() => aplicarJogada(mao, { tipo: 'ativar', jogador: q, neuronio: 'C2N0' }));
    aplicarJogada(mao, { tipo: 'ativar', jogador: q, neuronio: 'C0N1' });
    assert.equal(mao.neuronios.C0N0.dono, p);
    assert.equal(mao.neuronios.C0N1.dono, q);
    assert.ok(mao.neuronios.C0N0.revelado);
  });

  it('RN-07 ao chegar à camada de saída a rede está concluída, com 7 neurônios', () => {
    // Cenário: os dois jogadores só ativam neurônios até o fim.
    // Esperado: as duas redes concluídas, cada uma com um neurônio por camada, e a mão encerrada.
    const mao = maoNova();
    for (let i = 0; i < 40 && mao.fase === 'jogo'; i++) jogarUmaVez(mao);
    assert.equal(mao.fase, 'fim');
    for (const j of mao.jogadores) {
      assert.equal(j.situacao, 'concluida');
      assert.deepEqual(j.caminho.map((id) => mao.neuronios[id].camada), [0, 1, 2, 3, 4, 5, 6]);
    }
  });
});

/* ======================================================================== pontuação */

describe('Pontuação (baralho clássico)', () => {
  it('RN-08 números valem o valor, Ás vale 11 e figura isolada vale 0', () => {
    // Cenário: rede Ás - 5 - Rei.  Esperado: 11 + 5 + 0 = 16.
    assert.equal(soma('A', '5', 'K'), 16);
  });

  it('RN-09 par de figuras iguais em camadas vizinhas vale 20 (10 por figura)', () => {
    // Mudou na fusão (confirmado pelo professor): o par valia 10 no total.
    // Cenário: rede 2 - K - K - 2.  Esperado: 2 + 20 (par) + 2 = 24.
    assert.equal(soma('2', 'K', 'K', '2'), 24);
  });

  it('RN-10 trio de figuras iguais vizinhas vale 30 (10 por figura)', () => {
    // Mudou na fusão: o trio valia 20. Com o par a 20, o trio a 30 volta a valer mais que o par.
    // Cenário: rede 2 - K - K - K - 2.  Esperado: 2 + 30 (trio) + 2 = 34.
    assert.equal(soma('2', 'K', 'K', 'K', '2'), 34);
  });

  it('RN-11 figuras iguais não vizinhas, ou vizinhas e diferentes, não pontuam', () => {
    // Cenários: 2 - K - 5 - K - 2 (Reis separados) e 2 - K - Q - 2 (figuras diferentes).
    assert.equal(soma('2', 'K', '5', 'K', '2'), 9);
    assert.equal(soma('2', 'K', 'Q', '2'), 4);
  });

  it('RN-12 quadra de figuras iguais vizinhas zera a rede inteira (vanishing gradient)', () => {
    // Cenário: rede 2 - K - K - K - K - 2.  Esperado: 0.
    assert.equal(soma('2', 'K', 'K', 'K', 'K', '2'), 0);
    assert.equal(pontuarRede(redeCom([['2'], ['K'], ['KC'], ['KP'], ['KO']]), 0).vanishing, true);
  });

  it('RN-13 exemplo do enunciado: 8-K-K-3 vale 31; com tunagem num K vale 41', () => {
    // Mudou na fusão: sem tunagem valia 21 (par a 10). O exemplo do slide (41) se mantém.
    // Regra (professor): a carta empilhada conta na sequência de figuras, e cada figura vale 10.
    // Com tunagem: K(2 cartas) + K = três Reis = trio (30): 8 + 30 + 3 = 41.
    assert.equal(soma('8', 'K', 'K', '3'), 31);
    assert.equal(soma('8', 'K+K', 'K', '3'), 41);
  });

  it('RN-14 tunar os dois Reis de um par forma quadra e zera a rede', () => {
    // Regra (professor): tunar demais um ponto prejudica a rede como um todo.
    // Cenário: 2 - K+K - K+K - 2.  Esperado: 0.
    assert.equal(soma('2', 'K+K', 'K+K', '2'), 0);
  });

  it('RN-15 tunagem numérica soma o valor da carta empilhada; figura isolada tunada forma par', () => {
    // Mudou na fusão: o Rei isolado tunado valia 10; agora os dois Reis da pilha formam um par (20).
    // Cenários: 2 - 6+6 - 2 = 16;  2 - K+K - 2 = 24.
    assert.equal(soma('2', '6+6', '2'), 16);
    assert.equal(soma('2', 'K+K', '2'), 24);
  });
});

/* ======================================================================== ações com cartas */

describe('Ações com cartas da mão', () => {
  it('RN-16 entrada e saída são imunes: só a fronteira em camada oculta aceita cartas', () => {
    // Cenário: os dois jogadores só ativaram a entrada.  Esperado: nenhum alvo para empilhar.
    const mao = maoAvancada(2);
    assert.deepEqual(alvosDeEmpilhamento(mao), []);
    // Depois de avançarem para a Oculta 1, só as duas fronteiras são alvos.
    jogarUmaVez(mao); jogarUmaVez(mao);
    const alvos = alvosDeEmpilhamento(mao);
    assert.equal(alvos.length, 2);
    assert.ok(alvos.every((n) => n.camada === 1 && n === fronteira(mao, n.dono)));
  });

  it('RN-17 empilhar exige carta de mesmo valor; o naipe não importa', () => {
    // Cenário: fronteira do rival na Oculta 1; jogador da vez com uma carta de mesmo valor (outro naipe) e uma diferente.
    const mao = maoAvancada(4);
    const p = mao.vez, q = 1 - p, alvo = fronteira(mao, q);
    const outroNaipe = NAIPES.find((n) => n !== alvo.cartas[0].naipe);
    const [igual, diferente] = darMao(mao, p, [[alvo.cartas[0].valor, outroNaipe], [alvo.cartas[0].valor === '2' ? '3' : '2', 'E']]);
    assert.equal(podeEmpilhar(mao, p, alvo.id, [igual.id]), true);
    assert.equal(podeEmpilhar(mao, p, alvo.id, [diferente.id]), false);
  });

  it('RN-18 overfit: 1 carta no último neurônio do rival manda o neurônio ao cemitério e a rede dele recua', () => {
    const mao = maoAvancada(4);
    const p = mao.vez, q = 1 - p, alvo = fronteira(mao, q);
    darMao(mao, p, iguaisA(alvo, 1));
    aplicarJogada(mao, { tipo: 'empilhar', jogador: p, neuronio: alvo.id, cartas: idsDaMao(mao, p) });
    assert.equal(alvo.removido, true);
    assert.equal(mao.jogadores[q].caminho.length, 1); // voltou para a entrada
    assert.equal(mao.jogadores[q].situacao, 'construindo'); // continua jogando
    assert.equal(mao.cemiterio.length, 2); // neurônio + carta usada
  });

  it('RN-19 early stop: pilha de 3 cartas finaliza a rede do rival sem esse neurônio', () => {
    const mao = maoAvancada(4);
    const p = mao.vez, q = 1 - p, alvo = fronteira(mao, q);
    const entrada = mao.neuronios[mao.jogadores[q].caminho[0]].cartas[0];
    darMao(mao, p, iguaisA(alvo, 2));
    aplicarJogada(mao, { tipo: 'empilhar', jogador: p, neuronio: alvo.id, cartas: idsDaMao(mao, p) });
    assert.equal(mao.jogadores[q].situacao, 'earlystop');
    assert.equal(mao.jogadores[q].caminho.length, 1);
    assert.equal(pontuarRede(mao, q).total, pontuarRede(redeCom([[[entrada.valor, entrada.naipe]]]), 0).total);
  });

  it('RN-20 neurônio já tunado (2 cartas) sofre early stop com uma única carta do rival', () => {
    // Cenário: o jogador da vez tuna a própria fronteira; na vez seguinte o rival joga 1 carta igual nela.
    const mao = maoAvancada(4);
    const p = mao.vez, q = 1 - p, propria = fronteira(mao, p);
    darMao(mao, p, iguaisA(propria, 1));
    aplicarJogada(mao, { tipo: 'empilhar', jogador: p, neuronio: propria.id, cartas: idsDaMao(mao, p) });
    assert.equal(propria.cartas.length, 2); // tunagem
    darMao(mao, q, [[propria.cartas[0].valor, 'O']]);
    aplicarJogada(mao, { tipo: 'empilhar', jogador: q, neuronio: propria.id, cartas: idsDaMao(mao, q) });
    assert.equal(mao.jogadores[p].situacao, 'earlystop');
  });

  it('RN-21 stack overflow: pilha de 4 finaliza a rede do rival e ele perde toda a mão', () => {
    const mao = maoAvancada(4);
    const p = mao.vez, q = 1 - p, alvo = fronteira(mao, q);
    const maoDoRival = mao.jogadores[q].mao.length;
    darMao(mao, p, iguaisA(alvo, 3));
    aplicarJogada(mao, { tipo: 'empilhar', jogador: p, neuronio: alvo.id, cartas: idsDaMao(mao, p) });
    assert.equal(mao.jogadores[q].situacao, 'overflow');
    assert.equal(mao.jogadores[q].mao.length, 0);
    assert.equal(mao.cemiterio.length, 4 + maoDoRival);
  });

  it('RN-22 auto early stop e auto stack overflow: empilhar 2 ou 3 cartas na própria fronteira encerra a própria rede', () => {
    for (const [quantas, situacao] of [[2, 'earlystop'], [3, 'overflow']]) {
      const mao = maoAvancada(4);
      const p = mao.vez, propria = fronteira(mao, p);
      darMao(mao, p, iguaisA(propria, quantas));
      aplicarJogada(mao, { tipo: 'empilhar', jogador: p, neuronio: propria.id, cartas: idsDaMao(mao, p) });
      assert.equal(mao.jogadores[p].situacao, situacao);
      assert.equal(mao.jogadores[p].estatisticas.autoParadas, 1);
    }
  });

  it('RN-23 rede finalizada não pode mais ser atacada', () => {
    // Cenário: o rival sofreu early stop.  Esperado: nenhum neurônio dele entre os alvos.
    const mao = maoAvancada(4);
    const p = mao.vez, q = 1 - p, alvo = fronteira(mao, q);
    darMao(mao, p, iguaisA(alvo, 2));
    aplicarJogada(mao, { tipo: 'empilhar', jogador: p, neuronio: alvo.id, cartas: idsDaMao(mao, p) });
    assert.ok(alvosDeEmpilhamento(mao).every((n) => n.dono !== q));
  });
});

/* ======================================================================== dropout e transfer learning */

describe('Dropout (GatoNet) e transfer learning', () => {
  it('RN-24 dropout custa uma carta por camada desfeita, não gasta o turno e conta no desempate', () => {
    // Cenário: jogador da vez com 3 camadas (entrada, Oculta 1, Oculta 2) desfaz as 2 ocultas.
    const mao = maoAvancada(6);
    const p = mao.vez, jogador = mao.jogadores[p];
    aplicarJogada(mao, { tipo: 'dropout', jogador: p, n: 2, pagamento: idsDaMao(mao, p).slice(0, 2) });
    assert.equal(mao.vez, p);
    assert.equal(jogador.caminho.length, 1);
    assert.equal(jogador.mao.length, 3);
    assert.equal(jogador.dropouts, 2);
    assert.equal(mao.cemiterio.length, 4); // 2 cartas pagas + 2 neurônios desfeitos
  });

  it('RN-25 o neurônio desfeito sai da mesa e vai para o cemitério, com as tunagens', () => {
    // Mudou na fusão (confirmado pelo professor): o neurônio voltava virado e livre para a mesa.
    // Cenário: o jogador tuna a própria Oculta 1, o rival joga, e o jogador desfaz essa camada.
    const mao = maoAvancada(4);
    const p = mao.vez, neuronio = fronteira(mao, p);
    const carta = neuronio.cartas[0];
    const [tunagem, paga] = darMao(mao, p, [...iguaisA(neuronio, 1), ['2', 'O'], ['3', 'O']]);
    aplicarJogada(mao, { tipo: 'empilhar', jogador: p, neuronio: neuronio.id, cartas: [tunagem.id] });
    jogarUmaVez(mao);
    aplicarJogada(mao, { tipo: 'dropout', jogador: p, n: 1, pagamento: [paga.id] });
    assert.equal(neuronio.removido, true);
    assert.equal(neuronio.dono, -1);
    assert.deepEqual(neuronio.cartas, []);
    for (const c of [carta, tunagem, paga]) assert.ok(mao.cemiterio.some((x) => x.id === c.id), c.id + ' no cemitério');
    assert.ok(!jogadasLegais(mao, mao.vez).some((x) => x.tipo === 'ativar' && x.neuronio === neuronio.id)); // não volta a ser ativado
  });

  it('RN-26 dropout não desfaz a camada de entrada', () => {
    const mao = maoAvancada(6);
    const p = mao.vez;
    assert.throws(() => aplicarJogada(mao, { tipo: 'dropout', jogador: p, n: 3, pagamento: idsDaMao(mao, p).slice(0, 3) }));
  });

  it('RN-27 transfer learning: quadra na mão troca por cartas do limbo, uma vez por mão, e não gasta o turno', () => {
    // Mudou na fusão (confirmado pelo professor): o transfer learning gastava o turno.
    const mao = maoNova();
    const p = mao.vez, jogador = mao.jogadores[p];
    darMao(mao, p, ['7E', '7C', '7P', '7O', '2E']);
    const jogada = jogadasLegais(mao, p).find((x) => x.tipo === 'transfer');
    assert.ok(jogada);
    aplicarJogada(mao, jogada);
    assert.equal(mao.vez, p); // continua na vez
    assert.equal(jogador.mao.length, 5);
    assert.equal(mao.limbo.length, 6);
    darMao(mao, p, ['9E', '9C', '9P', '9O']);
    assert.equal(valorParaTransfer(mao, p), null); // segunda vez na mesma mão: não pode
    assert.ok(!jogadasLegais(mao, p).some((x) => x.tipo === 'transfer'));
  });

  it('RN-28 sem quadra na mão não há transfer learning', () => {
    const mao = maoNova();
    darMao(mao, mao.vez, ['7E', '7C', '7P', '2O']);
    assert.ok(!jogadasLegais(mao, mao.vez).some((x) => x.tipo === 'transfer'));
  });
});

/* ======================================================================== passar e fim da mão */

describe('Passar a vez e fim da mão', () => {
  it('RN-29 com a rede em construção não é permitido passar', () => {
    const mao = maoNova();
    assert.equal(podePassar(mao, mao.vez), false);
    assert.throws(() => aplicarJogada(mao, { tipo: 'passar', jogador: mao.vez }));
  });

  it('RN-30 só passa quem teve a rede interrompida por early stop; rede concluída com ataque possível é obrigada a jogar', () => {
    // Mudou na fusão: qualquer rede sem neurônio para ativar podia passar.
    // Regra (professor): passar "só existe se ele sofre um early stop e tiver carta na mão"; o grupo
    // estendeu para o early stop aplicado na própria rede (o professor deixou a escolha em aberto).
    // Cenário: a rede do jogador da vez está finalizada e ele tem na mão uma carta que ataca o rival.
    const situacao = (motivo) => {
      const mao = maoAvancada(4);
      const p = mao.vez, q = 1 - p;
      finalizarRede(mao, p, motivo);
      darMao(mao, p, iguaisA(fronteira(mao, q), 1));
      return { mao, p, q, tipos: jogadasLegais(mao, p).map((x) => x.tipo) };
    };
    for (const motivo of ['earlystop', 'auto-earlystop']) {
      const { mao, p, q, tipos } = situacao(motivo);
      assert.ok(tipos.includes('empilhar') && tipos.includes('passar'), motivo);
      aplicarJogada(mao, { tipo: 'passar', jogador: p });
      assert.equal(mao.vez, q, motivo);
    }
    const { mao, p, tipos } = situacao('output');
    assert.ok(tipos.includes('empilhar') && !tipos.includes('passar'));
    assert.throws(() => aplicarJogada(mao, { tipo: 'passar', jogador: p }), /Só passa a vez/);
  });

  it('RN-31 rede sem neurônio livre na próxima camada é finalizada ali e conta a soma parcial', () => {
    // Mudou na fusão (professor: "acabou o campo"): a rede travada continuava aberta até todos passarem.
    // Cenário: os dois jogadores têm 3 camadas; a Oculta 3 fica sem neurônio livre; quem está na vez só pode passar.
    const mao = maoAvancada(6);
    const p = mao.vez, q = 1 - p;
    darMao(mao, 0, []); darMao(mao, 1, []);
    const parciais = [0, 1].map((j) => pontuarRede(mao, j).total);
    esvaziarCamada(mao, 3);
    aplicarJogada(mao, { tipo: 'passar', jogador: p });
    assert.deepEqual(mao.jogadores.map((j) => j.situacao), ['travada', 'travada']);
    assert.ok(alvosDeEmpilhamento(mao).length === 0); // rede finalizada não é mais atacada
    assert.equal(mao.fase, 'fim');
    assert.deepEqual(mao.resultado.travados, [true, true]);
    assert.deepEqual(mao.resultado.somas, parciais);
    assert.ok(mao.registro.some((linha) => /ficou sem neurônio livre/.test(linha)));
    assert.equal(mao.jogadores[q].caminho.length, 3);
  });
});

/* ======================================================================== desempates */

describe('Desempates (soma igual)', () => {
  it('RN-32 1º critério: menos dropouts', () => {
    const r = desempate(['5O'], ['5E'], { dropouts: [1, 0] });
    assert.equal(r.vencedor, 1);
    assert.match(r.motivo, /dropouts/);
  });

  it('RN-33 2º critério: maior soma das N melhores cartas da mão (N = tamanho da menor mão)', () => {
    // Cenário: mãos [10, 2] e [9, 9].  Esperado: 12 x 18, vence o jogador 1.
    const r = desempate(['10O', '2P'], ['9E', '9C']);
    assert.equal(r.vencedor, 1);
    assert.match(r.motivo, /melhores cartas/);
  });

  it('RN-34 quem ficou sem cartas na mão perde para quem tem pelo menos uma', () => {
    const r = desempate([], ['2O']);
    assert.equal(r.vencedor, 1);
    assert.match(r.motivo, /sem cartas/);
  });

  it('RN-35 3º critério: carta mais alta da mão (Ás > K > Q > J > 10 … 2); o naipe só decide entre cartas iguais', () => {
    // Mudou na fusão: a carta mais alta era comparada pelos pontos (figura vale 0) antes da força.
    // Cenário A: [K♦, 3♥] x [3♠, J♠]: somas 3 x 3; carta mais alta K x J: vence o jogador 0.
    const a = desempate(['KO', '3C'], ['3E', 'JE']);
    assert.equal(a.vencedor, 0);
    assert.match(a.motivo, /carta mais alta/);
    // Cenário B: [K♦] x [J♠]: vence o Rei, mesmo com o naipe mais fraco.
    assert.equal(desempate(['KO'], ['JE']).vencedor, 0);
    // Cenário C: [K♦, 3♥] x [3♠, K♠]: mesma carta mais alta (K); decide o naipe: vence o jogador 1.
    const c = desempate(['KO', '3C'], ['3E', 'KE']);
    assert.equal(c.vencedor, 1);
    assert.match(c.motivo, /naipe/);
  });

  it('RN-36 último critério: vence quem jogou primeiro', () => {
    // Cenário: mãos idênticas (5♠ x 5♠); o jogador 1 começou a mão.
    const r = desempate(['5E'], ['5E'], { primeiro: 1 });
    assert.equal(r.vencedor, 1);
    assert.match(r.motivo, /primeiro/);
  });
});

/* ======================================================================== truco */

describe('Camada de truco (partida até 12 tentos)', () => {
  it('RN-37 escada TRUCO (3) → SEIS (6) → NOVE (9) → DOZE (12); correr entrega o valor atual', () => {
    const partida = novaPartida(12);
    assert.equal(pedirTruco(partida, 0), true);
    responderTruco(partida, 1, 'aceitar');
    assert.equal(partida.valor, 3);
    pedirTruco(partida, 1);
    responderTruco(partida, 0, 'aumentar'); // aceita o 6 e pede 9
    assert.equal(partida.valor, 6);
    assert.deepEqual(partida.pedido, { por: 0, para: 9 });
    assert.deepEqual(responderTruco(partida, 1, 'correr'), { maoEncerrada: true, vencedor: 0, pontos: 6 });
  });

  it('RN-38 quem aumentou por último não pede de novo; mão única e mão de onze não têm truco', () => {
    const partida = novaPartida(12);
    pedirTruco(partida, 0);
    responderTruco(partida, 1, 'aceitar');
    assert.equal(podeTrucar(partida, 0), false);
    assert.equal(podeTrucar(partida, 1), true);
    assert.equal(podeTrucar(novaPartida(1), 0), false);
    const onze = novaPartida(12);
    onze.tentos = [11, 4];
    assert.equal(ehMaoDeOnze(onze), true);
    assert.equal(podeTrucar(onze, 0) || podeTrucar(onze, 1), false);
  });

  it('RN-39 a partida termina quando alguém chega a 12 tentos', () => {
    const partida = novaPartida(12);
    partida.tentos = [10, 0];
    marcarTentos(partida, 0, 3);
    assert.equal(partida.tentos[0], 12);
    assert.equal(partida.encerrada, true);
    assert.equal(partida.vencedor, 0);
  });
});

/* ======================================================================== invariantes */

describe('Invariantes em partidas aleatórias', () => {
  it('RN-40 em 300 mãos aleatórias (5 baralhos x 4 terrenos x 3 inícios) nenhuma carta some ou duplica, os donos batem com as redes e toda mão termina', () => {
    // O baralho de truco usa 2 baralhos de 27 cartas (54); os outros, 52. No Power BI a mão é
    // embaralhada com o limbo, sem criar cartas.
    const baralhos = ['classico', 'truco', 'fraternidade', 'yinyang', 'powerbi'];
    const terrenos = ['neutro', 'montanha', 'pantano', 'oceano'];
    const inicios = ['revela-descarta', 'revela-volta', 'sorteio'];
    let estado = 2026;
    const sortear = (n) => { estado = (estado * 1103515245 + 12345) & 0x7fffffff; return estado % n; };
    for (let g = 0; g < 300; g++) {
      const mao = novaMao({
        semente: 500 + g, jogadores: JOGADORES,
        baralho: baralhos[g % 5], terreno: terrenos[Math.floor(g / 5) % 4], inicio: inicios[g % 3],
      });
      const total = mao.config.baralho === 'truco' ? 54 : 52;
      let jogadas = 0;
      while (mao.fase !== 'fim' && jogadas < 500) {
        if (mao.fase === 'inicio') {
          for (const j of [0, 1]) if (!mao.jogadores[j].cartaInicial) aplicarJogada(mao, { tipo: 'inicio', jogador: j, carta: mao.jogadores[j].mao[0].id });
          continue;
        }
        const legais = jogadasLegais(mao, mao.vez, { comDropout: true });
        aplicarJogada(mao, legais[sortear(legais.length)]);
        jogadas++;
        const ids = [
          ...mao.camadas.flat().flatMap((n) => n.cartas.map((c) => c.id)),
          ...mao.jogadores.flatMap((j) => j.mao.map((c) => c.id)),
          ...mao.limbo.map((c) => c.id), ...mao.cemiterio.map((c) => c.id),
        ];
        assert.equal(ids.length, total, `mão ${g}, jogada ${jogadas}: ${ids.length} cartas`);
        assert.equal(new Set(ids).size, total, `mão ${g}, jogada ${jogadas}: carta duplicada`);
        mao.jogadores.forEach((jogador, j) => {
          for (const id of jogador.caminho) assert.equal(mao.neuronios[id].dono, j, `mão ${g}: dono incoerente`);
        });
      }
      assert.equal(mao.fase, 'fim', `mão ${g} não terminou`);
      assert.ok(mao.resultado && [0, 1].includes(mao.resultado.vencedor), `mão ${g} sem vencedor`);
    }
  });
});
