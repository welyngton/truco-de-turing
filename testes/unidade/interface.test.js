/**
 * @file Testes de unidade da interface em HTML (com jsdom): painéis, avisos, confirmações, dicas
 * flutuantes, menu, telas (regras, grimório, conquistas, sobre e revisão), som e música (com um
 * WebAudio de mentira) e a Aplicacao (progresso, conquistas, navegação).
 */
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { instalarNavegadorFalso, registroDeAudio, limparRegistroDeAudio, esperar } from '../apoio/ambiente.js';

instalarNavegadorFalso({ toque: true });
const paineis = await import('../../src/interface/paineis.js');
const { Som, contextoDeAudio } = await import('../../src/interface/som.js');
const { Musica, MUSICAS, TRILHAS, gravarTrilha } = await import('../../src/interface/musica.js');
const { abrirMenu } = await import('../../src/interface/menu.js');
const { abrirAvatares } = await import('../../src/interface/telas/avatares.js');
const { abrirRegras } = await import('../../src/interface/telas/regras.js');
const { abrirGrimorio, htmlDoVerbete } = await import('../../src/interface/telas/grimorio.js');
const { abrirConquistas, medalhaHtml } = await import('../../src/interface/telas/conquistas.js');
const { abrirSobre } = await import('../../src/interface/telas/sobre.js');
const { abrirMods, REPOSITORIO, ARQUIVOS_DE_MODS } = await import('../../src/interface/telas/mods.js');
const { abrirRevisao } = await import('../../src/interface/telas/revisao.js');
const { Aplicacao } = await import('../../src/aplicacao.js');
const { VERSAO } = await import('../../src/versao.js');
const { VERBETES } = await import('../../src/conteudo/grimorio.js');
const { CONQUISTAS } = await import('../../src/conteudo/conquistas.js');
const { novaPartida, marcarTentos } = await import('../../src/nucleo/truco.js');
const { maoAteOFim } = await import('../apoio/estados.js');

const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const clicar = (el) => el.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

beforeEach(() => { paineis.fecharTodos(); $('#avisos').innerHTML = ''; paineis.esconderDicaFlutuante(); });

describe('paineis.js', () => {
  it('escaparHtml', () => {
    assert.equal(paineis.escaparHtml('<a href="x">&</a>'), '&lt;a href=&quot;x&quot;&gt;&amp;&lt;/a&gt;');
    assert.equal(paineis.escaparHtml(5), '5');
  });
  it('abrirPainel: fecha pelo botão data-fechar, por fora e por fecharTodos; chama aoFechar', async () => {
    let fechou = 0;
    const p = paineis.abrirPainel('<div class="folha"><button class="botao" data-fechar>x</button></div>', { fechaAoClicarFora: true, aoFechar: () => fechou++ });
    await esperar(40);
    assert.equal($$('.camada').length, 1);
    clicar(p.elemento.querySelector('[data-fechar]'));
    assert.equal($$('.camada').length, 0);
    assert.equal(fechou, 1);
    const q = paineis.abrirPainel('<div>y</div>', { fechaAoClicarFora: true, transparente: true });
    assert.ok(q.elemento.classList.contains('transparente'));
    clicar(q.elemento);
    assert.equal($$('.camada').length, 0);
    paineis.abrirPainel('<div>z</div>');
    paineis.fecharTodos();
    assert.equal($$('.camada').length, 0);
  });
  it('mostrarAviso e mostrarDicaDeJogo: um por vez, somem sozinhos ou com um toque', async () => {
    paineis.mostrarAviso('Título', 'texto <b>', 'medalha-aviso', 60);
    assert.match($('#avisos').innerHTML, /medalha-aviso/);
    assert.match($('#avisos').textContent, /texto <b>/);
    paineis.mostrarAviso('Outro');
    assert.equal($$('#avisos .aviso').length, 1);
    clicar($('#avisos .aviso'));
    assert.equal($$('#avisos .aviso').length, 0);
    paineis.mostrarAviso('Rápido', '', null, 50);
    await esperar(80);
    assert.equal($$('#avisos .aviso').length, 0);
    paineis.mostrarDicaDeJogo('Corrida', 'Ataque agora.', 'Camadas', 'Uma rede tem camadas.');
    assert.match($('#avisos').textContent, /Dica · Corrida.*Redes neurais · Camadas/s);
    paineis.mostrarDicaDeJogo('Sem conceito', 'texto', '', '');
    assert.equal($$('.dica-de-jogo .conceito').length, 0);
    clicar($('.dica-de-jogo'));
    assert.equal($$('.dica-de-jogo').length, 0);
  });
  it('confirmar: botões com ação, grito de truco e topo', () => {
    let escolha = null;
    paineis.confirmar('Truco?', 'texto', [{ rotulo: 'Não', classe: 'discreto' }, { rotulo: 'Sim', classe: 'vinho', acao: () => { escolha = 'sim'; } }], { grito: true, topo: '<div class="quem">Bia pediu</div>' });
    assert.ok($('.grito-truco .quem'));
    clicar($('.botao.vinho'));
    assert.equal(escolha, 'sim');
    paineis.confirmar('Sem texto', '', [{ rotulo: 'Ok' }]);
    clicar($('[data-indice="0"]'));
    assert.equal($$('.camada').length, 0);
  });
  it('dica flutuante: à esquerda, acima ou abaixo do alvo conforme o espaço', () => {
    for (const alvo of [{ x: 900, y: 300, l: 100, a: 40 }, { x: 10, y: 400, l: 100, a: 40 }, { x: 10, y: 5, l: 100, a: 40 }]) {
      paineis.mostrarDicaFlutuante('Dropout', 'corpo <span class="agora">agora</span>', alvo);
      const caixa = $('.dica-flutuante');
      assert.ok(caixa && caixa.style.left && caixa.style.top);
      assert.equal($$('.dica-flutuante').length, 1);
    }
    paineis.esconderDicaFlutuante();
    assert.equal($$('.dica-flutuante').length, 0);
  });
});

describe('som.js e musica.js', () => {
  it('cada efeito sonoro agenda osciladores ou ruído; mudo não toca nada', () => {
    const efeitos = ['virarCarta', 'colocarCarta', 'selecionar', 'tunagem', 'golpe', 'explosao', 'dropout', 'vitoria', 'fanfarra', 'campeao', 'derrota', 'medalha'];
    Som.definirMudo(false);
    Som.desbloquear();
    for (const efeito of efeitos) {
      limparRegistroDeAudio();
      Som[efeito]();
      assert.ok(registroDeAudio.osciladores.length + registroDeAudio.fontes.length > 0, efeito);
    }
    for (const forca of [undefined, 1, 4, 9]) { limparRegistroDeAudio(); Som.truco(forca); assert.ok(registroDeAudio.osciladores.length >= 5); }
    Som.definirMudo(true);
    assert.ok(Som.estaMudo());
    limparRegistroDeAudio();
    Som.golpe(); Som.truco(2);
    assert.equal(registroDeAudio.osciladores.length + registroDeAudio.fontes.length, 0);
    Som.definirMudo(false);
    assert.ok(contextoDeAudio());
  });
  it('trilhas: menu e os quatro terrenos, com tema composto que cabe nos compassos', () => {
    assert.deepEqual(TRILHAS, ['menu', 'neutro', 'oceano', 'montanha', 'pantano']);
    for (const nome of TRILHAS) {
      limparRegistroDeAudio();
      const contexto = contextoDeAudio(), saida = contexto.createGain();
      gravarTrilha(saida, nome, 20);
      assert.ok(registroDeAudio.osciladores.length > 100, nome);
      /* um compasso de tema por acorde; nenhuma nota invade a seguinte nem passa do compasso */
      const m = MUSICAS[nome], passos = m.tempos * m.subdivisao;
      assert.equal(m.tema.length, m.acordes.length, nome);
      for (const compasso of m.tema) {
        let fim = 0;
        for (const [passo, , dur] of compasso) { assert.ok(passo >= fim && passo + dur <= passos, nome); fim = passo + dur; }
      }
    }
  });
  it('trilha do menu: baião animado (andamento, percussão em todo tempo, refrão em duas partes)', () => {
    const m = MUSICAS.menu, passos = m.tempos * m.subdivisao;
    assert.ok(m.bpm >= 110, 'andamento animado');
    assert.equal(m.acordes.length, 16, 'partes A e B de 8 compassos');
    assert.ok(m.acordes.some(([r]) => r % 12 === 5), 'o Fá natural do mixolídio na parte B');
    /* todo tempo do compasso tem percussão (zabumba, palmas ou triângulo) */
    for (let passo = 0; passo < passos; passo += m.subdivisao) {
      limparRegistroDeAudio();
      const saida = contextoDeAudio().createGain();
      m.tocar(saida, 1, 1, passo, m.acordes[1], () => 0.5, 0.12);
      assert.ok(registroDeAudio.osciladores.length + registroDeAudio.fontes.length >= 3, 'tempo ' + passo / m.subdivisao);
    }
    /* a melodia cobre quase todo o compasso (o refrão não fica parado) */
    for (const compasso of m.tema) assert.ok(compasso.reduce((soma, [, , dur]) => soma + dur, 0) >= passos - 2);
  });
  it('música: cada terreno agenda notas; trocar, repetir e parar', async (t) => {
    for (const terreno of ['menu', 'neutro', 'oceano', 'montanha', 'pantano', 'desconhecido']) {
      limparRegistroDeAudio();
      Musica.tocar(terreno);
      assert.ok(Musica.tocando());
      const contexto = contextoDeAudio();
      for (let passo = 0; passo < 12; passo++) { contexto.currentTime += 0.5; await esperar(105); }
      assert.ok(registroDeAudio.osciladores.length > 5, terreno);
      Musica.tocar(terreno); /* mesma música: não reinicia */
    }
    contextoDeAudio().currentTime = -5; /* aba em segundo plano: o agendador retoma do agora */
    await esperar(110);
    Musica.parar();
    assert.ok(!Musica.tocando());
    Musica.parar();
    await esperar(950);
  });
});

describe('telas', () => {
  /** Aplicação de mentira para as telas. */
  const appFalso = () => ({
    progresso: { tutorialVisto: false, lidos: {}, desbloqueadas: { primeira: 1 }, vitorias: 3, dropouts: 4 },
    opcoes: { oponente: 'guloso', baralho: 'truco', terreno: 'oceano', inicio: 'sorteio', alvo: 12 },
    salvo: 0, salvar() { this.salvo++; }, salvarOpcoes() { this.salvo++; },
    marcarVerbeteLido(id) { this.progresso.lidos[id] = true; },
    jogou: 0, jogar() { this.jogou++; },
  });
  it('menu: mostra as escolhas, lê as mudanças, atualiza as miniaturas e abre cada tela', () => {
    const app = appFalso();
    abrirMenu(app);
    assert.equal($('#m-baralho').value, 'truco');
    assert.equal($('#m-oponente').options.length, 3);
    $('#m-terreno').value = 'montanha';
    $('#m-terreno').dispatchEvent(new window.Event('change'));
    assert.ok($$('.miniatura img').length >= 1);
    for (const id of ['m-regras', 'm-grimorio', 'm-conquistas', 'm-mods', 'm-sobre']) {
      clicar($('#' + id));
      assert.equal(app.opcoes.terreno, 'montanha');
    }
    clicar($('#m-jogar'));
    assert.equal(app.jogou, 1);
  });

  it('menu: cada botão e cada escolha viram eventos das estatísticas (com a medição ligada)', async () => {
    const { JSDOM } = await import('jsdom');
    const analise = await import('../../src/interface/analise.js');
    const { BOTOES_DO_MENU } = await import('../../src/interface/menu.js');
    /* uma janela "no site publicado", com consentimento, só para receber os eventos */
    const site = new JSDOM('<!doctype html><head></head><body></body>', { url: 'https://welyngton.github.io/truco-de-turing/' }).window;
    site.localStorage.setItem(analise.CHAVE_DO_CONSENTIMENTO, 'sim');
    analise.reiniciarAnalise();
    analise.iniciarAnalise(site);
    try {
      const app = appFalso();
      abrirMenu(app);
      $('#m-baralho').value = 'backprop';
      $('#m-baralho').dispatchEvent(new window.Event('change'));
      for (const id of Object.keys(BOTOES_DO_MENU)) { if (id !== 'm-online') clicar($('#' + id)); if (!$('#m-jogar')) abrirMenu(app); }
      const eventos = site.dataLayer.map((a) => Array.from(a)).filter((c) => c[0] === 'event');
      assert.deepEqual(eventos[0], ['event', 'menu_opcao', { campo: 'baralho', valor: 'backprop' }]);
      const botoes = eventos.filter((e) => e[1] === 'menu_clique').map((e) => e[2].botao);
      assert.deepEqual(botoes.sort(), ['avatar', 'como_jogar', 'conquistas', 'glossario', 'jogar', 'mods', 'sobre']);
    } finally { analise.reiniciarAnalise(); }
  });

  it('menu: configurações do NeuroDeck (jogadores, humanos, oponentes, arquitetura e baralhos)', () => {
    const app = appFalso();
    abrirMenu(app);
    const mudar = (id, valor) => { $('#' + id).value = String(valor); $('#' + id).dispatchEvent(new window.Event('change')); };
    /* padrão: 2 jogadores, 1 humano, arquitetura padrão, 1 baralho (o Truco pede 2) */
    assert.deepEqual([$('#m-jogadores').value, $('#m-humanos').value, $('#m-arquitetura').value, $('#m-baralhos').value], ['2', '1', 'padrao', '1']);
    assert.match($('#m-mesa-dica').textContent, /Mesa 3-5-5-5-5-5-4 .*Mão de 10 cartas \(o baralho Truco usa no mínimo 2 baralhos\)/);
    /* cada opção de partida com o seu rótulo: a de mão única não pode virar "12 tentos" */
    assert.match($('#m-partida option[value="12"]').textContent, /com truco/);
    assert.equal($('#m-partida option[value="1"]').textContent, 'Mão única, sem truco');
    /* 4 jogadores: a lista de humanos vai até 4, a mesa cresce e o truco sai */
    mudar('m-jogadores', 4);
    assert.equal($('#m-humanos').options.length, 4);
    assert.match($('#m-mesa-dica').textContent, /Mesa 5-7-7-7-7-7-6/);
    assert.match($('#m-partida option[value="12"]').textContent, /truco só com 2/);
    assert.equal($('#m-partida option[value="1"]').textContent, 'Mão única, sem truco');
    assert.match($('#m-oponente-rotulo').textContent, /Oponentes \(3/);
    /* todos humanos: some a escolha de oponente */
    mudar('m-humanos', 4);
    assert.equal($('#m-campo-oponente').hidden, true);
    mudar('m-humanos', 2);
    assert.equal($('#m-campo-oponente').hidden, false);
    mudar('m-arquitetura', 'profunda');
    mudar('m-baralhos', 3);
    mudar('m-baralho', 'classico');
    assert.match($('#m-mesa-dica').textContent, /Mão de 15 cartas\.$/);
    /* voltando para 3 jogadores, os humanos ficam no máximo 3 */
    mudar('m-jogadores', 3);
    assert.equal($('#m-humanos').value, '2');
    clicar($('#m-jogar'));
    assert.deepEqual({ jogadores: app.opcoes.jogadores, humanos: app.opcoes.humanos, arquitetura: app.opcoes.arquitetura, baralhos: app.opcoes.baralhos },
      { jogadores: 3, humanos: 2, arquitetura: 'profunda', baralhos: 3 });
  });

  it('mods: tipos, exemplo comentado e o aviso de que a interface ainda não carrega mods', async () => {
    abrirMods();
    const texto = $('.mods').textContent;
    for (const termo of ['registerDeck', 'registerTerrain', 'registerAction', 'apiVersion', 'Regularização L1', 'neurodeck-fpo.web.app/?mod=', 'Ainda não no jogo unificado']) assert.ok(texto.includes(termo), termo);
    clicar($('#mods-copiar'));
    await esperar(20);
    assert.ok($('#mods-copiado').textContent.length > 0);
    const links = [...$$('.mods a')].map((a) => a.getAttribute('href'));
    assert.ok(links.some((h) => h.endsWith('docs/MANUAL.md')), 'link para o manual do código');
    /* links para os arquivos e exemplos no repositório: o exemplo, o teste, a API e os nativos de cada tipo */
    for (const caminho of ['src/conteudo/modExemplo.js', 'testes/unidade/mods.test.js', 'src/motor/engine/registry.js', 'src/motor/engine/decks.js', 'src/motor/engine/terrains.js', 'src/motor/engine/actions.js']) {
      assert.ok(links.includes(REPOSITORIO + caminho), caminho);
    }
    assert.equal($$('.tipo-de-mod a').length, 3, 'cada tipo de mod aponta para os exemplos nativos');
    for (const a of $$('.mods a')) assert.equal(a.getAttribute('target'), '_blank');
    /* todo arquivo citado existe no repositório */
    for (const { caminho } of ARQUIVOS_DE_MODS) assert.ok(existsSync(new URL('../../' + caminho, import.meta.url)), caminho);
  });
  it('regras: marca o tutorial como visto e chama aoFechar', () => {
    const app = appFalso();
    let fechou = false;
    abrirRegras(app, () => { fechou = true; });
    assert.ok(app.progresso.tutorialVisto);
    assert.match($('.camada').textContent, /41/);
    clicar($('.camada [data-fechar]'));
    assert.ok(fechou);
    abrirRegras(null);
    assert.ok($('.camada'));
  });
  it('grimório: abre no verbete pedido, troca de verbete e marca como lido', () => {
    const app = appFalso();
    abrirGrimorio(app, 'dropout');
    assert.match($('#g-verbete').textContent, /Dropout/i);
    clicar($$('#g-lista button')[0]);
    assert.ok(app.progresso.lidos[VERBETES[0].id] && app.progresso.lidos.dropout);
    assert.ok($$('#g-lista .lido').length >= 2);
    abrirGrimorio(app, 'nao-existe');
  });
  it('Glossário: verbete de Ação mostra a ideia, a matemática para se aprofundar e a autoria', () => {
    abrirGrimorio(appFalso(), 'overfit');
    const texto = $('#g-verbete').textContent;
    for (const trecho of ['A ideia', 'No jogo', 'Até onde vale a comparação', 'Para se aprofundar', 'Suzy Arcanjo']) assert.match(texto, new RegExp(trecho));
    assert.ok($('#g-verbete .equacao math'));
    assert.ok($('#g-verbete .aprofundar p math:not([display])'), 'λ na linha, em MathML');
    assert.ok($('#g-verbete .aprofundar .formula math[display="block"]'), 'fórmula em destaque, em MathML');
    assert.doesNotMatch($('#g-verbete').innerHTML, /katex|formula-tex|\\frac/);
    const curto = htmlDoVerbete(VERBETES.find((v) => !v.ideia));
    assert.doesNotMatch(curto, /A ideia|Para se aprofundar|Colaboração/);
  });
  it('Glossário: título novo, equação, figura e "até onde vale a comparação"', () => {
    abrirGrimorio(appFalso(), 'dropout');
    assert.match($('.camada h2').textContent, /Glossário/);
    assert.ok($('#g-verbete .equacao math'));
    assert.ok($('#g-verbete .figura svg'));
    assert.match($('#g-verbete .limite').textContent, /Até onde vale/);
    assert.match($('#g-verbete .fonte').textContent, /Srivastava/);
  });
  it('regras em abas: troca de aba, ajuda das ações e "Ver o conceito" abrindo o verbete certo', () => {
    const app = appFalso();
    abrirRegras(app);
    const abas = $$('.abas [data-aba]').map((b) => b.textContent);
    assert.deepEqual(abas, ['Como jogar', 'Ações', 'Pontuação', 'Baralhos e terrenos', 'Dicas e estratégias']);
    assert.ok(!$$('.abas [data-aba]').some((b) => /Cartas|Decisões/.test(b.textContent)));
    clicar($('.abas [data-aba="pontuacao"]'));
    assert.equal($('section.aba[data-aba="pontuacao"]').hidden, false);
    assert.equal($('section.aba[data-aba="jogar"]').hidden, true);
    clicar($('.abas [data-aba="extensoes"]'));
    assert.equal($$('section.aba[data-aba="extensoes"] .extensao').length, 11); /* 7 baralhos e 4 terrenos */
    clicar($('#r-ajuda-acoes'));
    assert.equal($$('.cartao-acao').length, 8);
    assert.match($('.cartao-acao[data-acao="earlystop"]').textContent, /Early stopping/);
    clicar($('.cartao-acao[data-acao="stackoverflow"] [data-verbete]'));
    assert.match($('#g-verbete h2').textContent, /Stack overflow/);
    assert.ok(app.progresso.lidos.stackoverflow);
  });
  it('avatares: escolhe um liberado, ignora o bloqueado e avisa quem mudou', () => {
    const app = appFalso();
    app.progresso.desbloqueadas = { gato10: 1 };
    let mudou = null;
    abrirAvatares(app, (id) => { mudou = id; });
    assert.equal($$('.avatar-opcao').length, 9);
    assert.equal($$('.avatar-opcao.bloqueado').length, 5);
    clicar($('.avatar-opcao[data-avatar="cosmico"]')); /* bloqueado: nada muda */
    assert.equal(mudou, null);
    clicar($('.avatar-opcao[data-avatar="gato"]'));
    assert.equal(app.progresso.avatar, 'gato');
    assert.equal(mudou, 'gato');
    assert.equal($('.avatar-opcao[data-avatar="gato"]').getAttribute('aria-pressed'), 'true');
    assert.match($('.avatar-opcao[data-avatar="cosmico"]').textContent, /Contra tudo e contra todos/);
  });
  it('conquistas: medalhas bloqueadas e desbloqueadas, contagem e retrato', async () => {
    const app = appFalso();
    abrirConquistas(app);
    assert.match($('.conquistas-resumo').textContent, /1 de 35/);
    assert.equal($$('.conquista').length, CONQUISTAS.length);
    await esperar(50);
    assert.ok($('#c-retrato canvas'));
    assert.match(medalhaHtml(CONQUISTAS[0], true), /medalha/);
    assert.match(medalhaHtml(CONQUISTAS[0], false), /cadeado|bloquead/);
  });
  it('sobre: versão, os dois jogos, disciplina, professor e autores', () => {
    abrirSobre();
    const texto = $('.camada').textContent;
    assert.ok(texto.includes('Versão ' + VERSAO));
    assert.match(texto, /Peng Yaohao/);
    for (const termo of ['NeuroDeck', 'Truco de Turing', 'Francisco Lima', 'Welyngton', 'Diego Casagrande', 'Vinícius Chiconato', 'Suzy Arcanjo', 'neurodeck-fpo.web.app']) assert.ok(texto.includes(termo), termo);
    /* estatísticas de uso: o texto sempre aparece; fora do site publicado não há botões e nada é medido */
    assert.match(texto, /Estatísticas de uso/);
    assert.match(texto, /Google Analytics/);
    assert.match($('#s-estatisticas').textContent, /fora do site publicado/);
    assert.equal($('#s-estatisticas-sim'), null);
  });
  it('revisão: resumo, curva, linha do tempo comentada e placar da partida', () => {
    const mao = maoAteOFim({ terreno: 'pantano' });
    const somasDosPassos = [[7, 0], [12, 3], [9, 5], [9, 14], [9, 20], [16, 20], [16, 22], [30, 22], [30, 22]];
    const tipos = ['ativar', 'empilhar', 'empilhar', 'empilhar', 'dropout', 'transfer', 'truco', 'ativar', 'passar'];
    const eventos = [['ativacao'], ['tunagem'], ['overfit'], ['stackoverflow'], ['dropout'], ['transfer'], ['truco'], ['ativacao', 'completa'], ['passe']];
    const linhaDoTempo = tipos.map((tipo, i) => {
      return { numero: i + 1, jogador: i % 2, tipo, eventos: eventos[i], texto: 'passo ' + i, somas: somasDosPassos[i] };
    });
    const partida = novaPartida(12);
    marcarTentos(partida, 0, 12);
    let voltou = false;
    abrirRevisao({
      mao, linhaDoTempo, partida, numeroDaMao: 3, aoFechar: () => { voltou = true; },
      historicoDaPartida: [{ numero: 1, vencedor: 1, ganho: 3, completa: false, somas: [0, 0], tentos: [0, 3] }, { numero: 2, vencedor: 0, ganho: 12, completa: true, somas: [40, 30], tentos: [12, 3] }],
    });
    const texto = $('.revisao').textContent;
    assert.match(texto, /Revisão da mão 3/);
    assert.match(texto, /Maior salto/);
    assert.match(texto, /Golpe mais duro/);
    assert.match(texto, /virada/i);
    assert.match(texto, /Pântano/);
    assert.match(texto, /1 lance de truco/);
    assert.ok($$('.curva-svg .marca').length >= 5);
    assert.ok($('.curva-svg .linha-truco'));
    assert.equal($$('.linha-do-tempo li').length, tipos.length);
    assert.equal($$('.tabela-partida tbody tr').length, 2);
    clicar($('.revisao .botao.vinho'));
    assert.ok(voltou);
    abrirRevisao({ mao: maoAteOFim(), linhaDoTempo: [], partida: novaPartida(1), historicoDaPartida: [], numeroDaMao: 1, aoFechar() {} });
    assert.match($('.revisao').textContent, /Nenhuma jogada/);
  });
});

describe('aplicacao.js', () => {
  /** Jogo de mentira que registra as cenas ligadas e desligadas. */
  const jogoFalso = () => ({ cenas: [], scene: { stop(n) { this.dono.cenas.push('-' + n); }, start(n) { this.dono.cenas.push('+' + n); } } });
  it('iniciar: opções padrão, música ligada sem escolha e som conforme o progresso', () => {
    Aplicacao.progresso.musicaEscolhida = false; Aplicacao.progresso.musica = false; Aplicacao.progresso.mudo = true;
    Aplicacao.iniciar();
    assert.equal(Aplicacao.opcoes.oponente, 'guloso');
    assert.equal(Aplicacao.progresso.musica, true);
    assert.ok(Som.estaMudo());
    Aplicacao.alternarSom();
    assert.ok(!Som.estaMudo());
  });
  it('salvarOpcoes, alternarMusica (liga com terreno, desliga sem)', () => {
    Aplicacao.opcoes.baralho = 'yinyang';
    Aplicacao.salvarOpcoes();
    assert.equal(JSON.parse(localStorage.getItem('truco-de-turing:v2')).opcoes.baralho, 'yinyang');
    Aplicacao.progresso.musica = false;
    Aplicacao.alternarMusica('oceano');
    assert.ok(Musica.tocando() && Aplicacao.progresso.musicaEscolhida);
    Aplicacao.alternarMusica();
    assert.ok(!Musica.tocando());
  });
  it('jogar e irParaMenu trocam as cenas; modo imersivo pede tela cheia no toque', () => {
    const jogo = jogoFalso(); jogo.scene.dono = jogo;
    Aplicacao.jogo = jogo;
    let pediu = false;
    document.documentElement.requestFullscreen = () => { pediu = true; return Promise.resolve(); };
    Aplicacao.jogar();
    assert.ok(document.body.classList.contains('em-partida'));
    assert.ok(pediu);
    Aplicacao.irParaMenu();
    assert.deepEqual(jogo.cenas, ['-Menu', '+Mesa', '-Mesa', '+Menu']);
    document.documentElement.requestFullscreen = () => { throw new Error('negado'); };
    assert.doesNotThrow(() => Aplicacao.modoImersivo());
  });
  it('registrarMao: contadores, conquistas novas (uma vez só) e mão encerrada por truco', () => {
    const p = Aplicacao.progresso;
    p.desbloqueadas = {}; p.vitorias = 0; p.maos = 0; p.vitoriasZen = 0; p.terrenos = {}; p.baralhos = {};
    const mao = maoAteOFim();
    mao.jogadores[0].acoesUsadas = 0;
    const novas = Aplicacao.registrarMao({ mao, eu: 0, venceu: true, completa: true, partida: novaPartida(12), venceuPartida: false, valorDaMao: 3, oponenteCorreu: true, opcoes: { oponente: 'guloso' } });
    const ids = novas.map((c) => c.id);
    assert.ok(ids.includes('primeira') && ids.includes('truco') && ids.includes('correu') && ids.includes('zen'));
    assert.equal(p.vitorias, 1);
    assert.equal(p.vitoriasZen, 1);
    const repetidas = Aplicacao.registrarMao({ mao, eu: 0, venceu: true, completa: false, partida: novaPartida(12), venceuPartida: false, valorDaMao: 1, oponenteCorreu: false, opcoes: {} });
    assert.ok(!repetidas.some((c) => ids.includes(c.id)));
    assert.ok(!repetidas.some((c) => c.id === 'zen'));
  });
  it('marcarVerbeteLido: conta cada verbete uma vez e concede "Bibliotecário" no fim', () => {
    const p = Aplicacao.progresso;
    p.lidos = {}; p.verbetesLidos = 0; delete p.desbloqueadas.biblio;
    for (const v of VERBETES) { Aplicacao.marcarVerbeteLido(v.id); Aplicacao.marcarVerbeteLido(v.id); }
    assert.equal(p.verbetesLidos, VERBETES.length);
    assert.ok(p.desbloqueadas.biblio);
    assert.match($('#avisos').textContent, /Bibliotecário/);
  });
});
