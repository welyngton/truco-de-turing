/**
 * @file Sala online (src/online/sala.js) com a central em memória: entrada, cadeiras, ordem das
 * ações e mãos inteiras jogadas em vários aparelhos ao mesmo tempo, sem divergência de estado,
 * inclusive com mensagens fora de ordem, truco, alguém que cai e o anfitrião que sai.
 *
 * Rodar: node --test testes/unidade/online.test.js
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Sala, codigoDeSala, TEMPO_SEM_SINAL, BATIMENTO } from '../../src/online/sala.js';
import { centralEmMemoria } from '../../src/online/transportes.js';
import { mesclarProgresso } from '../../src/online/contas.js';
import { novaMao, aplicarJogada } from '../../src/nucleo/partida.js';
import { novaPartida, pedirTruco, responderTruco } from '../../src/nucleo/truco.js';
import { jogadaAleatoria } from '../../src/nucleo/oponentes/estrategias.js';
import { escolherJogada } from '../../src/nucleo/oponentes/index.js';

/** Relógio falso compartilhado: `andar(ms)` dispara os batimentos vencidos. */
function relogioFalso() {
  let agora = 0, id = 0;
  const timers = new Map();
  return {
    agora: () => agora,
    intervalo: (fn, ms) => { timers.set(++id, { fn, ms, proximo: agora + ms }); return id; },
    parar: (i) => timers.delete(i),
    andar(ms) {
      const fim = agora + ms;
      while (true) {
        const vencidos = [...timers.values()].filter((t) => t.proximo <= fim).sort((a, b) => a.proximo - b.proximo);
        if (!vencidos.length) break;
        const t = vencidos[0]; agora = t.proximo; t.proximo += t.ms; t.fn();
      }
      agora = fim;
    },
  };
}

/**
 * Um aparelho: a sala e a cópia local da mão, que só muda pelas ações numeradas. Joga pela
 * própria cadeira com jogadas aleatórias e, se for o anfitrião, pelos oponentes do computador.
 */
function aparelho(central, relogio, nome, sortear) {
  const a = { nome, sala: null, mao: null, partida: null, aplicadas: [], esperando: false };
  a.sala = new Sala(central.conectar(), { cliente: nome, nome }, relogio);
  a.sala.on('acao', (acao) => {
    a.aplicadas.push(acao.seq);
    if (acao.tipo === 'jogada') aplicarJogada(a.mao, acao.jogada);
    if (acao.tipo === 'truco') pedirTruco(a.partida, acao.cadeira);
    if (acao.tipo === 'resposta') responderTruco(a.partida, acao.cadeira, acao.resposta);
    if (acao.tipo === 'substituir') a.mao.jogadores[acao.cadeira].tipo = 'oponente';
    a.esperando = false;
  });
  a.comecarMao = () => {
    const c = a.sala.config;
    a.partida = novaPartida(12, c.opcoes.jogadores);
    a.mao = novaMao({ ...c.opcoes, semente: c.semente, inicio: 'sorteio',
      jogadores: c.cadeiras.map((x) => ({ nome: x.nome || 'bot', tipo: x.tipo === 'humano' ? 'humano' : 'oponente', oponente: 'aleatorio' })) });
  };
  /** Se for a vez deste aparelho (ou de um bot, no anfitrião), manda uma jogada. */
  a.jogar = () => {
    const mao = a.mao;
    if (!mao || mao.fase !== 'jogo' || a.esperando || a.partida.pedido) return false;
    const vez = mao.vez, minha = vez === a.sala.minhaCadeira, bot = mao.jogadores[vez].tipo === 'oponente';
    if (!minha && !(bot && a.sala.souAnfitriao)) return false;
    const jogada = bot ? escolherJogada(mao, vez) : jogadaAleatoria(mao, vez);
    delete jogada.simulacao;
    a.esperando = true;
    a.sala.enviar({ tipo: 'jogada', cadeira: vez, jogada });
    return true;
  };
  return a;
}

/** Monta uma sala com o anfitrião e `convidados`, todos sentados. */
function montarSala({ jogadores = 2, pessoas = 2, convidados = ['B'], atrasar = false, baralho = 'classico' } = {}) {
  const central = centralEmMemoria({ atrasar }), relogio = relogioFalso();
  const opcoes = { jogadores, humanos: pessoas, baralho, terreno: 'neutro', arquitetura: 'padrao', baralhos: 1, oponente: 'aleatorio', alvo: 12 };
  const A = aparelho(central, relogio, 'A');
  A.sala.criar('ABCDE', opcoes, pessoas, 4242);
  const outros = convidados.map((n) => { const x = aparelho(central, relogio, n); x.sala.entrar(); return x; });
  if (atrasar) for (let i = 0; i < 5; i++) central.entregar();
  A.sala.comecar();
  if (atrasar) central.entregar();
  const todos = [A, ...outros];
  for (const x of todos) x.comecarMao();
  return { central, relogio, todos, A, outros };
}

/** Joga até o fim da mão; `entre` roda depois de cada rodada de mensagens. */
function jogarAteOFim({ central, todos }, { atrasar = false, embaralhar = null, entre = () => {}, limite = 3000 } = {}) {
  for (let passo = 0; passo < limite; passo++) {
    if (todos[0].mao.fase !== 'jogo') break;
    for (const x of todos) x.jogar();
    if (atrasar) central.entregar(embaralhar || undefined);
    entre(passo);
  }
}

/** O estado do motor de cada aparelho, para comparar. */
const foto = (x) => JSON.stringify({ nd: x.mao.nd.nets, mesa: x.mao.nd.layers, fase: x.mao.fase, resultado: x.mao.resultado && x.mao.resultado.somas });

describe('sala online', () => {
  it('código de sala sem letras ambíguas; anfitrião na cadeira 0, convidado na primeira vaga, o resto vira bot ao começar', () => {
    let k = 0;
    assert.match(codigoDeSala(() => sorteadorFixo(++k)), /^[A-HJ-NP-Z2-9]{5}$/);
    const { A, outros } = montarSala({ jogadores: 4, pessoas: 3, convidados: ['B'] });
    const c = A.sala.config.cadeiras;
    assert.deepEqual(c.map((x) => x.tipo), ['humano', 'humano', 'oponente', 'oponente']);
    assert.equal(c[1].cliente, 'B');
    assert.equal(outros[0].sala.minhaCadeira, 1);
    assert.equal(outros[0].sala.config.iniciada, true);
    assert.ok(A.sala.souAnfitriao && !outros[0].sala.souAnfitriao);
  });

  it('duas pessoas jogam uma mão inteira e terminam com o mesmo estado', () => {
    const s = montarSala();
    jogarAteOFim(s);
    const [A, B] = s.todos;
    assert.equal(A.mao.fase, 'fim');
    assert.equal(foto(A), foto(B));
    assert.deepEqual(A.aplicadas, B.aplicadas);
  });

  it('cinco jogadores (3 pessoas e 2 bots), mensagens entregues fora de ordem: todos convergem', () => {
    let k = 0;
    const embaralhar = (fila) => fila.sort(() => (sorteadorFixo(++k) < 0.5 ? -1 : 1));
    const s = montarSala({ jogadores: 5, pessoas: 3, convidados: ['B', 'C'], atrasar: true });
    jogarAteOFim(s, { atrasar: true, embaralhar });
    for (let i = 0; i < 5; i++) s.central.entregar();
    const [A, B, C] = s.todos;
    assert.equal(A.mao.fase, 'fim');
    assert.equal(foto(A), foto(B));
    assert.equal(foto(A), foto(C));
  });

  it('pedido em nome da cadeira de outro é ignorado pelo anfitrião', () => {
    const { A, outros: [B] } = montarSala();
    const antes = A.sala.seq;
    B.sala.transporte.enviar({ tipo: 'pedido', de: 'B', acao: { tipo: 'jogada', cadeira: 0, jogada: { tipo: 'passar', jogador: 0 } } });
    assert.equal(A.sala.seq, antes);
  });

  it('truco entre duas telas: pedir, aumentar e aceitar chegam iguais aos dois lados', () => {
    const { A, outros: [B] } = montarSala();
    A.sala.enviar({ tipo: 'truco', cadeira: 0 });
    B.sala.enviar({ tipo: 'resposta', cadeira: 1, resposta: 'aumentar' });
    A.sala.enviar({ tipo: 'resposta', cadeira: 0, resposta: 'aceitar' });
    assert.equal(A.partida.valor, 6);
    assert.deepEqual(A.partida, B.partida);
  });

  it('quem cai vira oponente do computador no mesmo ponto em todas as telas, e a mão termina', () => {
    const s = montarSala({ jogadores: 3, pessoas: 3, convidados: ['B', 'C'] });
    const [A, B, C] = s.todos;
    jogarAteOFim(s, { limite: 6 });
    C.sala.transporte.fechar(); /* C fecha a aba sem avisar */
    s.relogio.andar(TEMPO_SEM_SINAL + 2 * BATIMENTO);
    assert.equal(A.mao.jogadores[2].tipo, 'oponente');
    assert.equal(B.mao.jogadores[2].tipo, 'oponente');
    assert.equal(A.sala.config.cadeiras[2].saiu, 'C');
    jogarAteOFim({ ...s, todos: [A, B] });
    assert.equal(A.mao.fase, 'fim');
    assert.equal(foto(A), foto(B));
  });

  it('se o anfitrião sai, a menor cadeira presente assume e a numeração continua', () => {
    const s = montarSala({ jogadores: 3, pessoas: 3, convidados: ['B', 'C'] });
    const [A, B, C] = s.todos;
    jogarAteOFim(s, { limite: 4 });
    const seq = B.sala.entregue;
    A.sala.sair();
    s.relogio.andar(BATIMENTO);
    assert.ok(B.sala.souAnfitriao);
    assert.equal(C.sala.anfitriao, 'B');
    assert.equal(B.mao.jogadores[0].tipo, 'oponente');
    jogarAteOFim({ ...s, todos: [B, C] });
    assert.ok(B.sala.entregue > seq);
    assert.equal(B.mao.fase, 'fim');
    assert.equal(foto(B), foto(C));
  });

  it('quem recarrega a aba (mesmo cliente) volta à cadeira e recebe as ações que perdeu', () => {
    const s = montarSala({ jogadores: 2, pessoas: 2 });
    const [A, B] = s.todos;
    jogarAteOFim(s, { limite: 5 });
    B.sala.transporte.fechar(); /* a aba recarrega: a conexão antiga morre sem avisar */
    const B2 = aparelho(s.central, s.relogio, 'B');
    B2.sala.config = JSON.parse(JSON.stringify(A.sala.config));
    B2.comecarMao();
    B2.sala.entrar();
    assert.equal(B2.sala.minhaCadeira, 1);
    assert.equal(foto(B2), foto(A));
    jogarAteOFim({ ...s, todos: [A, B2] });
    assert.equal(A.mao.fase, 'fim');
    assert.equal(foto(A), foto(B2));
  });
});

describe('contas: progresso mesclado entre o aparelho e a conta', () => {
  it('soma nada em dobro: contadores pelo maior, conquistas e verbetes pela união, avatar da conta', () => {
    const local = { vitorias: 3, maos: 10, dropouts: 4, vitoriasZen: 0, desbloqueadas: { primeira: 5 }, lidos: { dropout: true }, terrenos: { neutro: true }, baralhos: {}, arquiteturas: {}, avatar: 'p1', mudo: true };
    const conta = { vitorias: 7, maos: 8, dropouts: 1, vitoriasZen: 1, desbloqueadas: { primeira: 2, gato10: 9 }, lidos: { overfit: true }, terrenos: { oceano: true }, baralhos: { truco: true }, arquiteturas: { curta: true }, avatar: 'gato' };
    const m = mesclarProgresso(local, conta);
    assert.deepEqual([m.vitorias, m.maos, m.dropouts, m.vitoriasZen], [7, 10, 4, 1]);
    assert.deepEqual(m.desbloqueadas, { primeira: 2, gato10: 9 });
    assert.deepEqual(Object.keys(m.lidos).sort(), ['dropout', 'overfit']);
    assert.equal(m.verbetesLidos, 2);
    assert.deepEqual(m.terrenos, { neutro: true, oceano: true });
    assert.equal(m.avatar, 'gato');
    assert.equal(m.mudo, true); /* preferências do aparelho ficam */
    assert.deepEqual(mesclarProgresso(local, null), local);
  });
});

/** Número pseudoaleatório fixo para embaralhar a entrega. */
function sorteadorFixo(k) { const x = Math.sin(k * 12.9898) * 43758.5453; return x - Math.floor(x); }
