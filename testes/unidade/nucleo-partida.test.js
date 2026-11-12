/**
 * @file Testes de unidade da mão (partida.js), a camada de tradução sobre o motor do NeuroDeck:
 * criação, visão da interface, consultas, cada tipo de jogada, eventos e registro, erros de
 * jogadas inválidas, fim da mão e desempates.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  FORMAS_DE_INICIO, NOME_EFEITO, novaMao, copiarMao, atualizarVisao, finalizarMao, fronteira, alvosDeAtivacao, alvosDeEmpilhamento,
  efeitoDoEmpilhamento, podeEmpilhar, camadasDesfaziveis, valorParaTransfer, podePassar, jogadasLegais, aplicarJogada,
} from '../../src/nucleo/partida.js';
import { TOTAL_CAMADAS, TAMANHO_MAO } from '../../src/nucleo/rede.js';
import { JOGADORES, maoNova, maoJogada, maoAteOFim, procurarSituacao } from '../apoio/estados.js';
import { darMao, montarRede, finalizarRede, ajustar, esvaziarCamada, encerrar } from '../apoio/montagem.js';

/** Ativa o primeiro neurônio livre para quem está na vez. */
const ativarQualquer = (mao) => aplicarJogada(mao, jogadasLegais(mao, mao.vez).find((x) => x.tipo === 'ativar'));

/** Ids das cartas da mão do jogador. */
const ids = (mao, j) => mao.jogadores[j].mao.map((c) => c.id);

describe('novaMao', () => {
  it('monta a mesa 3-5-5-5-5-5-4, distribui 5 cartas e separa 10 no limbo', () => {
    const mao = novaMao({ semente: 5, jogadores: JOGADORES });
    assert.equal(mao.camadas.length, TOTAL_CAMADAS);
    assert.equal(Object.keys(mao.neuronios).length, 32);
    for (const j of mao.jogadores) assert.equal(j.mao.length, TAMANHO_MAO);
    assert.equal(mao.limbo.length, 10);
    assert.equal(mao.fase, 'inicio'); /* padrão do NeuroDeck: revela e descarta */
    assert.equal(mao.config.inicio, 'revela-descarta');
    assert.deepEqual(mao.historico, [[0, 0]]);
    assert.equal(mao.nd.rules, 'fusao'); /* regras da fusão no motor */
  });
  it('início por sorteio já começa a fase de jogo e emite o evento', () => {
    const mao = maoNova();
    assert.equal(mao.fase, 'jogo');
    assert.deepEqual(mao.eventos[0], { tipo: 'inicio', jogador: mao.primeiro, como: 'sorteio' });
  });
  it('oceano sorteia o vento; mesma semente, mesma mesa', () => {
    const a = maoNova({ terreno: 'oceano' }), b = maoNova({ terreno: 'oceano' });
    assert.ok(['E', 'C', 'P', 'O'].includes(a.vento));
    assert.deepEqual(a.camadas.map((c) => c.map((n) => n.cartas[0].id)), b.camadas.map((c) => c.map((n) => n.cartas[0].id)));
  });
  it('sem semente usa uma semente nova', () => {
    assert.ok(Number.isInteger(novaMao({ jogadores: JOGADORES }).semente));
  });
  it('baralho de truco: 2 baralhos, mão de 10 cartas e ids únicos', () => {
    const mao = maoNova({ baralho: 'truco' });
    assert.deepEqual(mao.jogadores.map((j) => j.mao.length), [10, 10]);
    const todas = [...mao.camadas.flat().flatMap((n) => n.cartas), ...mao.jogadores.flatMap((j) => j.mao), ...mao.limbo];
    assert.equal(todas.length, 54);
    assert.equal(new Set(todas.map((c) => c.id)).size, 54);
  });
  it('opção desconhecida é recusada com mensagem clara', () => {
    assert.throws(() => maoNova({ baralho: 'tarot' }), /Baralho desconhecido/);
    assert.throws(() => maoNova({ terreno: 'lua' }), /Terreno desconhecido/);
    assert.throws(() => maoNova({ inicio: 'dado' }), /início desconhecida/);
  });
  it('constantes de apoio', () => {
    assert.equal(Object.keys(FORMAS_DE_INICIO)[0], 'revela-descarta'); /* a primeira é o padrão */
    assert.ok(FORMAS_DE_INICIO['revela-volta'] && FORMAS_DE_INICIO.sorteio);
    assert.ok(NOME_EFEITO.tunagem && NOME_EFEITO.stackoverflow);
  });
});

describe('visão da interface', () => {
  it('a visão acompanha o estado do motor a cada jogada', () => {
    const mao = maoNova();
    for (let passo = 0; passo < 60 && mao.fase === 'jogo'; passo++) {
      const legais = jogadasLegais(mao, mao.vez, { comDropout: true });
      aplicarJogada(mao, legais[(passo * 7) % legais.length]);
      const nd = mao.nd;
      assert.equal(mao.vez, nd.turn);
      assert.equal(mao.cemiterio.length, nd.graveyard.length);
      assert.equal(mao.limbo.length, nd.limbo.length);
      mao.jogadores.forEach((jogador, j) => {
        assert.equal(jogador.mao.length, nd.hands[j].length);
        assert.equal(jogador.caminho.length, nd.nets[j].path.length);
        assert.equal(jogador.situacao === 'construindo', !nd.nets[j].finished);
        for (const id of jogador.caminho) assert.equal(mao.neuronios[id].dono, j);
      });
      for (const n of mao.camadas.flat()) {
        const slot = nd.layers[n.camada][n.posicao];
        assert.equal(n.removido, slot.removed);
        assert.equal(n.cartas.length, slot.removed ? 0 : 1 + slot.stack.length);
      }
    }
    assert.equal(mao.historico.length > 2, true);
  });
  it('atualizarVisao refaz a visão depois de uma mudança direta no estado do motor', () => {
    const mao = maoNova();
    mao.nd.hands[0].pop();
    assert.equal(mao.jogadores[0].mao.length, 5);
    assert.equal(atualizarVisao(mao), mao);
    assert.equal(mao.jogadores[0].mao.length, 4);
  });
  it('as cartas da interface mantêm valor, naipe e id ao longo da mão', () => {
    const mao = maoNova();
    const antes = mao.camadas[0][0].cartas[0];
    ativarQualquer(mao);
    assert.equal(mao.camadas[0][0].cartas[0], antes); /* o mesmo objeto */
    assert.match(antes.id, /^(10|[2-9AJQK])[ECPO]$/);
  });
});

describe('copiarMao', () => {
  it('cópia independente, sem eventos, em modo simulação', () => {
    const mao = maoJogada(4), copia = copiarMao(mao);
    assert.equal(copia.simulacao, true);
    assert.deepEqual(copia.eventos, []);
    assert.notEqual(copia.nd, mao.nd);
    ativarQualquer(copia);
    assert.notEqual(copia.turno, mao.turno);
    assert.deepEqual(copia.eventos, []);
    assert.deepEqual(copia.registro, []);
    assert.equal(copia.neuronios[copia.camadas[0][0].id], copia.camadas[0][0]);
  });
});

describe('consultas', () => {
  it('fronteira: null sem rede; depois o último neurônio do caminho', () => {
    const mao = maoNova();
    const j = mao.vez;
    assert.equal(fronteira(mao, j), null);
    ativarQualquer(mao);
    assert.equal(fronteira(mao, j).camada, 0);
  });
  it('alvosDeAtivacao: livres da próxima camada; vazio para rede finalizada', () => {
    const mao = maoNova();
    assert.equal(alvosDeAtivacao(mao, 0).length, 3);
    finalizarRede(mao, 0, 'output');
    assert.deepEqual(alvosDeAtivacao(mao, 0), []);
  });
  it('alvosDeEmpilhamento: só fronteiras ocultas de redes em construção', () => {
    const mao = maoJogada(4);
    for (const n of alvosDeEmpilhamento(mao)) assert.ok(n.camada >= 1 && n.camada <= 5);
    assert.equal(alvosDeEmpilhamento(maoNova()).length, 0);
  });
  it('efeitoDoEmpilhamento: pela pilha final (2, 3, 4) e por quem é o dono', () => {
    const n = { cartas: [{}], dono: 0 };
    assert.deepEqual(efeitoDoEmpilhamento(null, 0, n, 1), { tipo: 'tunagem', proprio: true });
    assert.deepEqual(efeitoDoEmpilhamento(null, 1, n, 1), { tipo: 'overfit', proprio: false });
    assert.equal(efeitoDoEmpilhamento(null, 1, n, 2).tipo, 'earlystop');
    assert.equal(efeitoDoEmpilhamento(null, 1, n, 3).tipo, 'stackoverflow');
    assert.equal(efeitoDoEmpilhamento(null, 1, n, 4), null);
  });
  it('podeEmpilhar: exige vez, alvo válido, mesma figura e pilha ≤ 4', () => {
    const { mao, jogada } = procurarSituacao((m, x) => x.tipo === 'empilhar');
    assert.ok(podeEmpilhar(mao, jogada.jogador, jogada.neuronio, jogada.cartas));
    assert.ok(!podeEmpilhar(mao, 1 - jogada.jogador, jogada.neuronio, jogada.cartas));
    assert.ok(!podeEmpilhar(mao, jogada.jogador, jogada.neuronio, []));
    assert.ok(!podeEmpilhar(mao, jogada.jogador, 'inexistente', jogada.cartas));
    assert.ok(!podeEmpilhar(mao, jogada.jogador, jogada.neuronio, ['carta-fora-da-mao']));
    assert.ok(!podeEmpilhar(mao, jogada.jogador, 'C0N0', jogada.cartas)); /* entrada é imune */
  });
  it('camadasDesfaziveis: camadas ocultas do caminho', () => {
    const mao = maoNova();
    assert.equal(camadasDesfaziveis(mao, 0), 0);
    for (let i = 0; i < 6; i++) ativarQualquer(mao);
    assert.equal(camadasDesfaziveis(mao, 0), 2);
  });
  it('valorParaTransfer: quatro iguais na mão, uma vez por mão', () => {
    const mao = maoNova();
    darMao(mao, 0, ['7E', '7C', '7P', '7O', '2E']);
    assert.equal(valorParaTransfer(mao, 0), '7');
    mao.nd.transferUsed[0] = true;
    atualizarVisao(mao);
    assert.equal(valorParaTransfer(mao, 0), null);
    darMao(mao, 1, ['7E', '8E', '9E', '2E', '3E']);
    assert.equal(valorParaTransfer(mao, 1), null);
  });
  it('podePassar: rede interrompida por early stop com cartas na mão, ou nenhuma outra jogada', () => {
    const mao = maoNova(), j = mao.vez;
    assert.equal(podePassar(mao, j), false); /* rede em construção */
    assert.equal(podePassar(mao, 1 - j), false); /* fora da vez */
    finalizarRede(mao, j, 'earlystop');
    assert.equal(podePassar(mao, j), true);
    finalizarRede(mao, j, 'output'); /* chegou à saída e não tem jogada: só resta passar */
    assert.equal(podePassar(mao, j), true);
    assert.deepEqual(jogadasLegais(mao, j), [{ tipo: 'passar', jogador: j }]);
  });
});

describe('jogadasLegais', () => {
  it('fase de início: uma jogada por carta da mão, para quem ainda não escolheu', () => {
    const mao = novaMao({ semente: 2, jogadores: JOGADORES });
    assert.equal(jogadasLegais(mao, 0).length, 5);
    assert.ok(jogadasLegais(mao, 0).every((x) => x.tipo === 'inicio'));
    aplicarJogada(mao, jogadasLegais(mao, 0)[0]);
    assert.deepEqual(jogadasLegais(mao, 0), []);
    assert.equal(jogadasLegais(mao, 1).length, 5);
  });
  it('fora da vez e depois do fim: nenhuma jogada', () => {
    const mao = maoNova();
    assert.deepEqual(jogadasLegais(mao, 1 - mao.vez), []);
    const fim = maoAteOFim();
    assert.deepEqual(jogadasLegais(fim, 0).concat(jogadasLegais(fim, 1)), []);
  });
  it('inclui dropout só com a opção comDropout', () => {
    const mao = maoNova();
    for (let i = 0; i < 6; i++) ativarQualquer(mao);
    const j = mao.vez;
    assert.ok(!jogadasLegais(mao, j).some((x) => x.tipo === 'dropout'));
    const dropouts = jogadasLegais(mao, j, { comDropout: true }).filter((x) => x.tipo === 'dropout');
    assert.deepEqual(dropouts.map((x) => x.n), [1, 2]);
  });
  it('toda jogada listada é aceita, em mãos inteiras de todos os baralhos', () => {
    for (const baralho of ['classico', 'truco', 'fraternidade', 'yinyang', 'powerbi']) {
      const mao = maoNova({ baralho, semente: 21 });
      for (let passo = 0; passo < 300 && mao.fase === 'jogo'; passo++) {
        const legais = jogadasLegais(mao, mao.vez, { comDropout: true });
        assert.ok(legais.length > 0, baralho);
        for (const jogada of legais) assert.doesNotThrow(() => aplicarJogada(copiarMao(mao), jogada), baralho + ': ' + JSON.stringify(jogada));
        aplicarJogada(mao, legais[(passo * 5 + 1) % legais.length]);
      }
      assert.equal(mao.fase, 'fim', baralho);
    }
  });
});

describe('aplicarJogada', () => {
  it('início "revela e descarta" (padrão): a carta mais forte começa e as cartas vão para o cemitério', () => {
    const mao = novaMao({ semente: 4, jogadores: JOGADORES });
    const reveladas = [darMao(mao, 0, ['AE', '2E', '3E', '4E', '5E'])[0], darMao(mao, 1, ['2O', '3O', '4O', '5O', '6O'])[0]];
    aplicarJogada(mao, { tipo: 'inicio', jogador: 0, carta: reveladas[0].id });
    assert.equal(mao.fase, 'inicio');
    assert.equal(mao.jogadores[0].cartaInicial, reveladas[0]);
    assert.deepEqual(mao.eventos, []); /* a escolha fica escondida até os dois revelarem */
    aplicarJogada(mao, { tipo: 'inicio', jogador: 1, carta: reveladas[1].id });
    assert.equal(mao.fase, 'jogo');
    assert.equal(mao.vez, 0);
    assert.deepEqual(mao.jogadores.map((j) => j.mao.length), [4, 4]);
    assert.equal(mao.cemiterio.length, 2);
    const evento = mao.eventos.find((e) => e.tipo === 'inicio');
    assert.deepEqual({ jogador: evento.jogador, como: evento.como, descarta: evento.descarta, empate: evento.empate }, { jogador: 0, como: 'revela', descarta: true, empate: false });
    assert.deepEqual(evento.cartas, reveladas);
    assert.match(mao.registro[0], /Ana começa/);
  });
  it('início "revela e volta": as cartas voltam para a mão; empate vai para o sorteio', () => {
    const mao = novaMao({ semente: 4, inicio: 'revela-volta', jogadores: JOGADORES });
    const reveladas = [darMao(mao, 0, ['KE', '2E'])[0], darMao(mao, 1, ['KE', '2O'])[0]];
    aplicarJogada(mao, { tipo: 'inicio', jogador: 0, carta: reveladas[0].id });
    aplicarJogada(mao, { tipo: 'inicio', jogador: 1, carta: reveladas[1].id });
    assert.equal(mao.cemiterio.length, 0);
    assert.deepEqual(mao.jogadores.map((j) => j.mao.length), [2, 2]);
    assert.ok(mao.eventos.some((e) => e.tipo === 'inicio' && e.empate && !e.descarta));
    assert.throws(() => aplicarJogada(mao, { tipo: 'inicio', jogador: 0, carta: reveladas[0].id }), /já começou/);
  });
  it('ativar: revela, liga à rede e passa a vez', () => {
    const mao = maoNova(), j = mao.vez;
    const alvo = alvosDeAtivacao(mao, j)[0];
    mao.eventos.splice(0);
    aplicarJogada(mao, { tipo: 'ativar', jogador: j, neuronio: alvo.id });
    assert.ok(alvo.revelado && alvo.dono === j);
    assert.equal(mao.vez, 1 - j);
    assert.equal(mao.jogadores[j].estatisticas.ativacoes, 1);
    assert.deepEqual(mao.eventos, [{ tipo: 'ativacao', jogador: j, neuronio: alvo.id, carta: alvo.cartas[0] }]);
    assert.match(mao.registro.at(-1), /ativou .* na camada Entrada/);
  });
  it('ativar na camada de saída conclui a rede', () => {
    const mao = maoNova();
    for (let i = 0; i < 14 && mao.fase === 'jogo'; i++) ativarQualquer(mao);
    assert.deepEqual(mao.jogadores.map((j) => j.situacao), ['concluida', 'concluida']);
    assert.equal(mao.eventos.filter((e) => e.tipo === 'completa').length, 2);
    assert.equal(mao.fase, 'fim');
    assert.equal(mao.eventos.at(-1).tipo, 'fim');
  });
  it('tunagem, overfit, early stop e stack overflow: eventos, estatísticas e registro', () => {
    for (const [quantas, proprio, tipo] of [[1, true, 'tunagem'], [1, false, 'overfit'], [2, false, 'earlystop'], [3, false, 'stackoverflow']]) {
      const mao = maoNova();
      for (let i = 0; i < 4; i++) ativarQualquer(mao);
      const j = mao.vez, dono = proprio ? j : 1 - j, alvo = fronteira(mao, dono);
      const pilha = alvo.cartas.slice(), somaAntes = mao.historico.at(-1)[j];
      const jogadas = darMao(mao, j, Array.from({ length: quantas }, (_, i) => [alvo.cartas[0].valor, 'ECPO'[i]]));
      mao.eventos.splice(0);
      aplicarJogada(mao, { tipo: 'empilhar', jogador: j, neuronio: alvo.id, cartas: jogadas.map((c) => c.id) });
      const evento = mao.eventos.find((e) => e.tipo === tipo);
      assert.ok(evento, tipo);
      assert.equal(evento.dono, dono);
      assert.equal(mao.jogadores[j].acoesUsadas, 1);
      if (tipo === 'tunagem') {
        assert.deepEqual(evento.cartas, jogadas);
        assert.equal(evento.ganho, mao.historico.at(-1)[j] - somaAntes);
        assert.equal(alvo.cartas.length, 2);
        assert.equal(mao.jogadores[j].estatisticas.tunagens, 1);
      } else {
        assert.deepEqual(evento.cartas, pilha.concat(jogadas)); /* tudo o que foi para o cemitério */
        assert.equal(evento.proprio, false);
        assert.equal(alvo.removido, true);
        assert.equal(mao.jogadores[dono].estatisticas.sofridos, 1);
      }
      if (tipo === 'overfit') assert.equal(mao.jogadores[j].estatisticas.overfits, 1);
      if (tipo === 'earlystop') { assert.equal(mao.jogadores[dono].situacao, 'earlystop'); assert.equal(mao.jogadores[j].estatisticas.earlyStops, 1); }
      if (tipo === 'stackoverflow') { assert.deepEqual(mao.jogadores[dono].mao, []); assert.equal(mao.jogadores[j].estatisticas.overflows, 1); assert.match(mao.registro.at(-1), /STACK OVERFLOW/); }
    }
  });
  it('dropout: os neurônios vão para o cemitério, paga com cartas e não gasta o turno', () => {
    const mao = maoNova();
    for (let i = 0; i < 4; i++) ativarQualquer(mao);
    const j = mao.vez, desfeito = fronteira(mao, j), pagamento = [mao.jogadores[j].mao[0].id];
    mao.eventos.splice(0);
    aplicarJogada(mao, { tipo: 'dropout', jogador: j, n: 1, pagamento });
    assert.equal(mao.vez, j);
    assert.equal(mao.jogadores[j].dropouts, 1);
    assert.equal(desfeito.removido, true);
    assert.equal(mao.cemiterio.length, 2);
    assert.deepEqual(mao.eventos[0].neuronios, [desfeito.id]);
    assert.equal(mao.eventos[0].pagas[0].id, pagamento[0]);
    assert.throws(() => aplicarJogada(mao, { tipo: 'dropout', jogador: j, n: 3, pagamento: [] }), /Dropout inválido/);
  });
  it('transfer learning: troca quatro iguais por cartas do limbo e não gasta o turno', () => {
    const mao = maoNova(), j = mao.vez;
    const cartas = darMao(mao, j, ['9E', '9C', '9P', '9O', '2E']).slice(0, 4).map((c) => c.id);
    aplicarJogada(mao, { tipo: 'transfer', jogador: j, cartas });
    assert.ok(mao.jogadores[j].transferUsado);
    assert.equal(mao.jogadores[j].mao.length, 5);
    assert.equal(mao.limbo.length, 6);
    assert.equal(mao.vez, j);
    assert.equal(mao.jogadores[j].estatisticas.transfer, 1);
    assert.equal(mao.eventos.at(-1).entram, 4);
    assert.throws(() => aplicarJogada(mao, { tipo: 'transfer', jogador: mao.vez, cartas: [] }), /indisponível/);
  });
  it('Power BI embaralha a mão com o limbo depois de uma ação com cartas', () => {
    const mao = maoNova({ baralho: 'powerbi' }), j = mao.vez;
    const cartas = darMao(mao, j, ['5E', '5C', '5P', '5O', '3E']).slice(0, 4).map((c) => c.id);
    aplicarJogada(mao, { tipo: 'transfer', jogador: j, cartas });
    assert.ok(mao.eventos.some((e) => e.tipo === 'powerbi' && e.jogador === j));
    assert.equal(mao.jogadores[j].mao.length, 5);
    assert.equal(mao.limbo.length, 6);
  });
  it('passar: recusado com a rede em construção; permitido depois de um early stop', () => {
    const mao = maoNova(), j = mao.vez;
    assert.throws(() => aplicarJogada(mao, { tipo: 'passar', jogador: j }), /Só passa/);
    finalizarRede(mao, j, 'earlystop');
    mao.eventos.splice(0);
    aplicarJogada(mao, { tipo: 'passar', jogador: j });
    assert.deepEqual(mao.eventos, [{ tipo: 'passe', jogador: j }]);
    assert.equal(mao.vez, 1 - j);
  });
  it('rede sem neurônio livre na camada seguinte é finalizada como travada', () => {
    const mao = maoNova();
    for (let i = 0; i < 2; i++) ativarQualquer(mao);
    const j = mao.vez;
    esvaziarCamada(mao, 1);
    darMao(mao, 0, []); darMao(mao, 1, []);
    mao.eventos.splice(0);
    aplicarJogada(mao, { tipo: 'passar', jogador: j });
    assert.deepEqual(mao.jogadores.map((x) => x.situacao), ['travada', 'travada']);
    assert.deepEqual(mao.eventos.filter((e) => e.tipo === 'travada').map((e) => e.jogador).sort(), [0, 1]);
    assert.equal(mao.fase, 'fim');
    assert.deepEqual(mao.resultado.travados, [true, true]);
  });
  it('oceano: a virada do vento a cada rodada vira evento', () => {
    const mao = maoNova({ terreno: 'oceano' });
    mao.eventos.splice(0);
    ativarQualquer(mao);
    assert.ok(!mao.eventos.some((e) => e.tipo === 'vento'));
    ativarQualquer(mao); /* fim da primeira rodada */
    assert.deepEqual(mao.eventos.filter((e) => e.tipo === 'vento'), [{ tipo: 'vento', naipe: mao.vento }]);
    assert.equal(mao.rodada, 2);
  });
  it('erros: fora da vez, mão não iniciada, jogada desconhecida, carta fora da mão; o estado não muda', () => {
    const mao = maoNova();
    const foto = JSON.stringify(mao.nd);
    assert.throws(() => aplicarJogada(mao, { tipo: 'ativar', jogador: 1 - mao.vez, neuronio: 'C0N0' }), /Não é a vez/);
    assert.throws(() => aplicarJogada(mao, { tipo: 'voar', jogador: mao.vez }), /desconhecida/);
    assert.throws(() => aplicarJogada(mao, { tipo: 'ativar', jogador: mao.vez, neuronio: 'C3N0' }), /indisponível/);
    assert.throws(() => aplicarJogada(mao, { tipo: 'ativar', jogador: 7, neuronio: 'C0N0' }), /inexistente/);
    assert.throws(() => aplicarJogada(mao, { tipo: 'empilhar', jogador: mao.vez, neuronio: 'C0N0', cartas: [mao.jogadores[mao.vez].mao[0].id] }), /Empilhamento inválido/);
    assert.equal(JSON.stringify(mao.nd), foto);
    const parada = novaMao({ semente: 1, jogadores: JOGADORES });
    assert.throws(() => aplicarJogada(parada, { tipo: 'ativar', jogador: 0, neuronio: 'C0N0' }), /não está em andamento/);
    const { mao: m2, jogada } = procurarSituacao((m, x) => x.tipo === 'dropout');
    assert.throws(() => aplicarJogada(m2, { ...jogada, pagamento: ['nao-existe'] }), /fora da mão/);
  });
  it('early stop na própria rede: empilhar 2 cartas no próprio neurônio finaliza a rede', () => {
    const mao = maoNova();
    for (let i = 0; i < 4; i++) ativarQualquer(mao);
    const j = mao.vez, propria = fronteira(mao, j);
    const cartas = darMao(mao, j, [[propria.cartas[0].valor, 'E'], [propria.cartas[0].valor, 'C'], ['2', 'O']]).slice(0, 2).map((c) => c.id);
    aplicarJogada(mao, { tipo: 'empilhar', jogador: j, neuronio: propria.id, cartas });
    assert.equal(mao.jogadores[j].estatisticas.autoParadas, 1);
    assert.equal(mao.jogadores[j].situacao, 'earlystop');
    assert.ok(mao.eventos.some((e) => e.tipo === 'earlystop' && e.proprio));
    /* quem se aplicou early stop e ainda tem cartas pode passar (regra da fusão) */
    ativarQualquer(mao);
    if (mao.vez === j) assert.equal(podePassar(mao, j), true);
  });
});

describe('fim da mão e desempates', () => {
  it('mão jogada até o fim tem vencedor, somas e motivo', () => {
    const mao = maoAteOFim();
    assert.equal(mao.fase, 'fim');
    assert.ok([0, 1].includes(mao.resultado.vencedor));
    assert.equal(mao.resultado.somas.length, 2);
    assert.ok(mao.resultado.motivo);
    assert.match(mao.registro.at(-1), /Fim da mão/);
    assert.deepEqual(mao.historico.at(-1), mao.resultado.somas);
  });
  it('finalizarMao encerra a mão no ponto em que está', () => {
    const mao = maoJogada(5);
    assert.equal(finalizarMao(mao), mao);
    assert.equal(mao.fase, 'fim');
    assert.ok(mao.resultado);
    assert.equal(finalizarMao(mao).eventos.filter((e) => e.tipo === 'fim').length, 1); /* não encerra duas vezes */
  });
  /** Mão empatada em 0 x 0, com as redes finalizadas, encerrada na hora. */
  function empatada(ajuste) {
    const mao = maoNova();
    for (const j of [0, 1]) { montarRede(mao, j, []); finalizarRede(mao, j, 'output'); }
    ajuste(mao);
    return encerrar(mao);
  }
  it('sem empate: maior soma da rede', () => {
    const r = empatada((m) => montarRede(m, 1, [['9']]));
    assert.equal(r.vencedor, 1);
    assert.equal(r.motivo, 'maior soma da rede');
  });
  it('1º desempate: menos dropouts', () => {
    const r = empatada((m) => ajustar(m, { dropouts: [2, 0] }));
    assert.equal(r.vencedor, 1);
    assert.match(r.motivo, /dropouts/);
  });
  it('2º: quem ficou sem cartas perde', () => {
    const r = empatada((m) => darMao(m, 1, []));
    assert.equal(r.vencedor, 0);
    assert.match(r.motivo, /sem cartas/);
  });
  it('3º: soma das melhores cartas da mão', () => {
    const r = empatada((m) => { darMao(m, 0, ['2E', '3E']); darMao(m, 1, ['9E', '8E', '7E']); });
    assert.equal(r.vencedor, 1);
    assert.match(r.motivo, /2 melhores cartas/);
  });
  it('4º: carta mais alta; 5º: naipe; 6º: quem jogou primeiro', () => {
    const r1 = empatada((m) => { darMao(m, 0, ['QO']); darMao(m, 1, ['JE']); });
    assert.equal(r1.vencedor, 0);
    assert.match(r1.motivo, /carta mais alta/);
    const r2 = empatada((m) => { darMao(m, 0, ['5E']); darMao(m, 1, ['5O']); });
    assert.equal(r2.vencedor, 0);
    assert.match(r2.motivo, /naipe/);
    const r3 = empatada((m) => { darMao(m, 0, ['5E']); darMao(m, 1, ['5E']); ajustar(m, { primeiro: 1 }); });
    assert.equal(r3.vencedor, 1);
    assert.match(r3.motivo, /primeiro/);
  });
});
