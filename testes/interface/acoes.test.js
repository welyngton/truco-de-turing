/**
 * @file Testes de interface das ações da mesa: inspeção e seleção, tunagem, overfit, stack
 * overflow, early stop na própria rede, dropout, transfer learning, passar a vez, truco (pedir,
 * aceitar, aumentar, correr), modo dicas (dica de jogo, dicas dos botões com mouse e segurando no
 * toque), som e música, comemorações e volta ao menu.
 */
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { subirServidor, abrirJogo, comecarPartida, carregarMontagem, jogarAteOResultado, naCena, esperarCena, esperarMenu, capturar } from '../apoio/navegador.js';

let servidor;
before(async () => { servidor = await subirServidor(); });
after(() => servidor.fechar());

/** Responde às caixas abertas (botão vinho) e espera a vez do humano. */
async function esperarMinhaVez(pagina) {
  for (let i = 0; i < 400; i++) {
    const pronto = await naCena(pagina, `
      const vinho = document.querySelector('.camada .botao.vinho');
      if (vinho && !document.querySelector('#r-proxima')) { vinho.click(); return false; }
      if (cena.modo === 'inicio') { cena.aoClicarNaCarta(cena.mao.jogadores[cena.quemVe].mao[0].id); return false; }
      return cena.ehVezDoHumano();`);
    if (pronto) return;
    await pagina.waitForTimeout(80);
  }
  throw new Error('a vez do humano não chegou');
}

/**
 * Espera a mesa ficar sem pedido de truco pendente, com a mão em jogo: fecha o resultado (se o
 * oponente correu) e aceita o pedido do oponente (se ele pediu mais).
 */
async function semPedidoNaMesa(pagina) {
  for (let i = 0; i < 400; i++) {
    const estado = await naCena(pagina, `
      if (document.querySelector('#r-proxima')) return 'resultado';
      if (document.querySelector('.grito-truco .botao.vinho')) return 'grito';
      return cena.mao && !cena.encerrada && cena.mao.fase === 'jogo' && !cena.partida.pedido && !document.querySelector('.camada') ? 'pronto' : 'espera';`);
    if (estado === 'pronto') return;
    if (estado === 'resultado') await pagina.click('#r-proxima');
    if (estado === 'grito') await pagina.locator('.grito-truco .botao.vinho').click();
    await pagina.waitForTimeout(150);
  }
  throw new Error('o pedido de truco não se resolveu');
}

/** Ativa um neurônio qualquer na vez do humano. */
const ativarQualquer = (pagina) => naCena(pagina, 'cena.aoClicarNoNeuronio(Object.keys(cena.alvos)[0]);');

/** Clica num botão da mesa (o botão age ao soltar). */
/** Abre a janela REGRAS ou MENU da mesa e clica numa das opções dela. */
const naJanela = async (pagina, botao, seletor) => {
  await apertar(pagina, botao);
  await pagina.locator('.janela-da-mesa ' + seletor).dispatchEvent('click');
};
const apertar = (pagina, botao) => naCena(pagina, `const b = cena.painel[arg]; b.emit('pointerover', { wasTouch: false }); b.emit('pointerdown'); b.emit('pointerup'); b.emit('pointerout');`, botao);

describe('ações da mesa', () => {
  it('inspeção, seleção, Esc, tunagem, overfit, stack overflow e early stop na própria rede', async () => {
    const jogo = await abrirJogo(servidor.url, { consulta: '?res=1' });
    const { pagina } = jogo;
    try {
      await comecarPartida(pagina, { oponente: 'aleatorio', baralho: 'classico', terreno: 'neutro', inicio: 'sorteio' });
      await carregarMontagem(pagina);
      await esperarMinhaVez(pagina);
      /* inspeção: neurônio virado, carta da mão, limbo, cemitério e terreno */
      await naCena(pagina, `
        const id = Object.keys(cena.alvos)[0];
        cena.aoPassarNoNeuronio(id, true); cena.aoPassarNoNeuronio(id, false);
        const carta = cena.cartasDaMao[0]; carta.emit('pointerover'); carta.emit('pointerout');
        cena.painel.limbo.carta.emit('pointerover'); cena.painel.cemiterio.carta.emit('pointerover'); cena.painel.textoTerreno.emit('pointerover');`);
      /* seleção e Esc */
      await naCena(pagina, 'cena.cartasDaMao[0].emit("pointerdown"); cena.cartasDaMao[1].emit("pointerdown");');
      assert.ok(await naCena(pagina, 'return cena.selecao.length >= 1'));
      await naCena(pagina, 'cena.aoClicarNoNeuronio("C6N0");'); /* alvo inválido: "não encaixa" */
      await pagina.keyboard.press('Escape');
      assert.equal(await naCena(pagina, 'return cena.selecao.length'), 0);
      /*
       * Cada ação parte de uma situação montada no motor: as duas redes com um neurônio oculto na
       * ponta, o oponente sem cartas (só pode avançar) e, na mão do humano, quatro cartas iguais à
       * do alvo. Assim o teste não depende do que o oponente sorteia.
       */
      const executar = async (alvo, quantas, efeito) => {
        await esperarMinhaVez(pagina);
        const ok = await naCena(pagina, `
          const [alvo, quantas] = arg;
          for (const j of [0, 1]) { M.reabrirRede(cena.mao, j); M.montarRede(cena.mao, j, [[j ? '2C' : '2E'], [j ? '9P' : '8E']]); }
          M.darMao(cena.mao, 1, []);
          const c = cena.mao.jogadores[alvo].caminho, n = cena.mao.neuronios[c[c.length - 1]];
          M.darMao(cena.mao, 0, Array.from({ length: 4 }, (_, i) => [n.cartas[0].valor, 'ECPO'[i]]));
          cena.redesenhar();
          for (let i = 0; i < quantas; i++) cena.aoClicarNaCarta(cena.mao.jogadores[0].mao[i].id);
          if (!cena.alvos[n.id]) return 'sem alvo';
          cena.aoPassarNoNeuronio(n.id, true);
          cena.aoClicarNoNeuronio(n.id);
          return true;`, [alvo, quantas]);
        assert.equal(ok, true, efeito);
        await esperarCena(pagina, `return cena.linhaDoTempo.some((p) => p.eventos.includes('${efeito}'))`);
      };
      await executar(0, 1, 'tunagem');
      await capturar(pagina, '13-tunagem');
      await executar(1, 1, 'overfit');
      await executar(1, 3, 'stackoverflow');
      await capturar(pagina, '14-stack-overflow');
      /* depois do stack overflow o oponente não joga mais: a vez continua com o humano */
      await executar(0, 2, 'earlystop');
      /* a rede do humano foi interrompida por ele mesmo: joga (ou passa) até o resultado */
      await jogarAteOResultado(pagina);
      assert.match(await pagina.locator('.folha').first().textContent(), /Critério/);
      assert.deepEqual(jogo.erros, []);
    } finally { await jogo.fechar(); }
  });

  it('barra de ações do NeuroDeck: botões acendem pela seleção, selo de tunagem, pontos por neurônio e painéis de leitura', async () => {
    const jogo = await abrirJogo(servidor.url, { consulta: '?res=1' });
    const { pagina } = jogo;
    try {
      await comecarPartida(pagina, { oponente: 'aleatorio', baralho: 'classico', terreno: 'neutro', inicio: 'sorteio' });
      await carregarMontagem(pagina);
      await esperarMinhaVez(pagina);
      /* as duas redes com dois neurônios; na mão, uma carta igual à ponta da própria rede */
      const estado = await naCena(pagina, `
        for (const j of [0, 1]) { M.reabrirRede(cena.mao, j); M.montarRede(cena.mao, j, [[j ? '2C' : '2E'], [j ? '9P' : '8E']]); }
        M.darMao(cena.mao, 1, []);
        M.darMao(cena.mao, 0, [['8', 'C'], ['3', 'O']]);
        cena.redesenhar();
        const acoes = cena.painel.acoes, ligado = () => Object.fromEntries(Object.entries(acoes).map(([k, b]) => [k, b.habilitado]));
        const antes = ligado();
        cena.aoClicarNaCarta(cena.mao.jogadores[0].mao.find((c) => c.valor === '8').id);
        const comOito = ligado();
        acoes.overfit.emit('pointerover', { wasTouch: false });
        const explicacao = cena.dicaDoCursor;
        acoes.overfit.emit('pointerout');
        return { antes, comOito, explicacao, quantos: Object.keys(acoes).length };`);
      assert.equal(estado.quantos, 8, 'oito botões, como no NeuroDeck');
      assert.equal(estado.antes.tunagem, false, 'sem seleção nenhuma ação de carta acende');
      assert.equal(estado.comOito.tunagem, true, 'um 8 sobre o 8 da própria rede: tunagem');
      assert.equal(estado.comOito.stackoverflow, false, 'stack overflow precisa de três cartas');
      assert.equal(estado.comOito.limpar, true);
      assert.match(estado.explicacao, /Overfit/);
      /* o botão executa a tunagem no único alvo possível */
      await naCena(pagina, `const b = cena.painel.acoes.tunagem; b.emit('pointerdown'); b.emit('pointerup');`);
      await esperarCena(pagina, `return cena.linhaDoTempo.some((p) => p.eventos.includes('tunagem'))`);
      const selo = await naCena(pagina, `
        const c = cena.mao.jogadores[0].caminho, v = cena.visuais[c[c.length - 1]];
        return { selo: v.pilha.visible && v.pilha.text, pontos: v.pontos.visible && v.pontos.text };`);
      assert.equal(selo.selo, '\u26a11', 'selo de tunagem com uma carta empilhada');
      assert.ok(Number(selo.pontos) > 0, 'chip de pontos do neurônio');
      /* painéis: placar por camada (clique no bloco), registro completo e cemitério */
      await naCena(pagina, 'cena.painel.blocos[0].area.emit("pointerdown");');
      await pagina.waitForSelector('.placar-camadas');
      assert.ok(await pagina.locator('.placar-camadas tbody tr').count() >= 7);
      await capturar(pagina, '25-placar-por-camada');
      await pagina.locator('.painel-mesa [data-fechar]').first().dispatchEvent('click'); /* sem esperar a animação de entrada */
      await naCena(pagina, 'cena.painel.areaRegistro.emit("pointerdown");');
      await pagina.waitForSelector('.registro-completo li');
      await pagina.locator('.painel-mesa [data-fechar]').first().dispatchEvent('click'); /* sem esperar a animação de entrada */
      await naCena(pagina, 'cena.painel.cemiterio.carta.emit("pointerdown");');
      await pagina.waitForSelector('.painel-mesa h2:has-text("Cemitério")');
      await pagina.locator('.painel-mesa [data-fechar]').first().dispatchEvent('click'); /* sem esperar a animação de entrada */
      assert.deepEqual(jogo.erros, []);
    } finally { await jogo.fechar(); }
  });

  it('dropout (escolher camadas e pagar), cancelar, transfer learning, passar a vez e vanishing gradient', async () => {
    const jogo = await abrirJogo(servidor.url, { consulta: '?res=1' });
    const { pagina } = jogo;
    try {
      await comecarPartida(pagina, { oponente: 'aleatorio', baralho: 'truco', terreno: 'oceano', inicio: 'revela-descarta' });
      await carregarMontagem(pagina);
      await esperarMinhaVez(pagina);
      /* monta a rede do humano com duas camadas ocultas, para o resto do teste não depender do oponente */
      await naCena(pagina, 'M.montarRede(cena.mao, 0, [["2E"], ["3E"], ["2C"]]); M.darMao(cena.mao, 0, ["3O", "2O", "AO", "QC"]); cena.redesenhar();');
      /* dropout: entra e sai do modo; depois escolhe a camada e paga */
      await apertar(pagina, 'botaoDropout');
      assert.equal(await naCena(pagina, 'return cena.modo'), 'dropout');
      await apertar(pagina, 'botaoDropout');
      assert.equal(await naCena(pagina, 'return cena.modo'), 'livre');
      await apertar(pagina, 'botaoDropout');
      const alvo = await naCena(pagina, 'const id = Object.keys(cena.alvos).filter((k) => cena.alvos[k].tipo === "dropout").sort((a, b) => cena.alvos[a].n - cena.alvos[b].n)[0]; cena.aoPassarNoNeuronio(id, true); cena.aoClicarNoNeuronio(id); return cena.modo;');
      assert.equal(alvo, 'pagarDropout');
      await naCena(pagina, 'const n = cena.camadasDropout; const ids = cena.mao.jogadores[0].mao.slice(0, n).map((c) => c.id); cena.aoClicarNaCarta(ids[0]); cena.aoClicarNaCarta(ids[0]); ids.forEach((id) => cena.aoClicarNaCarta(id));');
      await esperarCena(pagina, 'return cena.mao.jogadores[0].dropouts > 0');
      await capturar(pagina, '15-dropout');
      /* transfer learning: quatro cartas iguais */
      await esperarMinhaVez(pagina);
      await naCena(pagina, 'M.darMao(cena.mao, 0, ["7E", "7C", "7P", "7O"]); cena.redesenhar();');
      await apertar(pagina, 'botaoTransfer');
      await esperarCena(pagina, 'return cena.mao.jogadores[0].transferUsado');
      /* o transfer não gasta a vez: o humano continua jogando */
      await esperarMinhaVez(pagina);
      /* vanishing gradient: quatro Reis seguidos na rede */
      await naCena(pagina, `
        M.montarRede(cena.mao, 0, [['2E'], ['KE', 'KC'], ['KP', 'KO']]); /* dois Reis tunados: quadra */
        cena.redesenhar(); cena.animarEventos([]);`);
      assert.equal(await naCena(pagina, 'return cena.vanishingAvisado[0]'), true);
      assert.equal(await naCena(pagina, 'return cena.pontuacoes[0].total'), 0);
      /* passar a vez: só depois de um early stop, com cartas na mão */
      await esperarMinhaVez(pagina);
      assert.equal(await naCena(pagina, 'return cena.painel.botaoPassar.habilitado'), false);
      await naCena(pagina, 'M.finalizarRede(cena.mao, 0, "earlystop"); M.darMao(cena.mao, 0, ["2E"]); cena.redesenhar();');
      assert.equal(await naCena(pagina, 'return cena.painel.botaoPassar.habilitado'), true);
      await apertar(pagina, 'botaoPassar');
      await esperarCena(pagina, 'return cena.mao.registro.some((l) => /passou a vez/.test(l)) || !!document.querySelector("#r-proxima")');
      assert.deepEqual(jogo.erros, []);
    } finally { await jogo.fechar(); }
  });

  it('baralho Backprop: saída baixa depois das ativações avisa "saída saturada", e não vanishing gradient', async () => {
    const jogo = await abrirJogo(servidor.url, { consulta: '?res=1' });
    const { pagina } = jogo;
    try {
      await comecarPartida(pagina, { oponente: 'aleatorio', baralho: 'backprop', terreno: 'neutro', inicio: 'revela-descarta' });
      await carregarMontagem(pagina);
      await esperarMinhaVez(pagina);
      /* 8 → J♥ (ReLU) 8 → 5♦ (linear) 9,8: abaixo de 20 depois de uma ativação não linear */
      await naCena(pagina, `
        M.montarRede(cena.mao, 0, [['8E'], ['JC'], ['5O']]);
        cena.redesenhar(); cena.animarEventos([]);`);
      const p = await naCena(pagina, 'const p = cena.pontuacoes[0]; return { total: p.total, saturada: p.saturada, vanishing: p.vanishing, rotulo: p.combos[0] && p.combos[0].rotulo };');
      assert.deepEqual(p, { total: 9.8, saturada: true, vanishing: false, rotulo: 'Saída saturada depois das ativações' });
      assert.equal(await naCena(pagina, 'return cena.vanishingAvisado[0]'), true);
      assert.equal(await naCena(pagina, 'return !!cena.app.verbetesAvisados.saturacao && !cena.app.verbetesAvisados.vanishing'), true);
      /* placar por camada: a soma traz "(saída saturada)" e nenhum texto fala em vanishing gradient */
      await naCena(pagina, 'cena.abrirPlacarPorCamada();');
      await pagina.waitForSelector('.placar-camadas');
      const placar = await pagina.locator('.placar-camadas').textContent();
      assert.match(placar, /saída saturada/);
      assert.doesNotMatch(placar, /vanishing/i);
      assert.deepEqual(jogo.erros, []);
    } finally { await jogo.fechar(); }
  });

  it('truco: pedir, responder (aumentar, aceitar, correr) e a mão terminada por corrida', async () => {
    const jogo = await abrirJogo(servidor.url, { consulta: '?res=1' });
    const { pagina } = jogo;
    try {
      await comecarPartida(pagina, { oponente: 'guloso', baralho: 'classico', terreno: 'neutro', inicio: 'sorteio', partida: '12' });
      await esperarMinhaVez(pagina);
      /* o humano pede truco; o oponente responde sozinho */
      await apertar(pagina, 'truco');
      await esperarCena(pagina, 'return !cena.partida.pedido || !!document.querySelector(".grito-truco")');
      /* desfecho do pedido: o oponente aceitou (a mão segue), correu (resultado e próxima mão) ou pediu mais (o humano aceita) */
      await semPedidoNaMesa(pagina);
      /* espera a vez do humano antes de forçar o pedido: com o oponente no meio da jogada, a mão podia
         acabar por baixo do pedido forçado e o resultado cobria os botões do truco */
      await esperarMinhaVez(pagina);
      /* o oponente pede truco: o humano pede mais, depois aceita */
      await naCena(pagina, 'cena.partida.aumentadoPor = -1; cena.partida.valor = 1; cena.anunciarTruco(1);');
      await pagina.waitForSelector('.grito-truco');
      await capturar(pagina, '16-truco');
      assert.match(await pagina.locator('.grito-truco').textContent(), /Correr \(Perde 1\)/);
      const aumentar = pagina.locator('.grito-truco .botao', { hasText: 'Pedir' });
      if (await aumentar.count()) await aumentar.click();
      await pagina.waitForTimeout(1500);
      if (await pagina.$('.grito-truco')) await pagina.locator('.grito-truco .botao.vinho').click();
      await pagina.waitForTimeout(800);
      /* novo pedido do oponente: o humano corre e a mão acaba na hora */
      await esperarCena(pagina, 'return !document.querySelector(".grito-truco")');
      /* se o oponente correu do aumento, a mão já acabou e o resultado vai aparecer */
      await esperarCena(pagina, 'return !!document.querySelector("#r-proxima") || (!cena.partida.pedido && !cena.encerrada)', 60000);
      if (!(await pagina.$('#r-proxima'))) {
        await naCena(pagina, 'cena.partida.aumentadoPor = -1; if (cena.partida.valor >= 12) cena.partida.valor = 1; cena.anunciarTruco(1);');
        await pagina.waitForSelector('.grito-truco');
        await pagina.locator('.grito-truco .botao', { hasText: 'Correr' }).click();
      }
      await pagina.waitForSelector('#r-proxima', { timeout: 60000 });
      assert.ok(await naCena(pagina, 'return cena.historicoDaPartida.length >= 1'));
      assert.deepEqual(jogo.erros, []);
    } finally { await jogo.fechar(); }
  });

  it('truco com duas pessoas no aparelho: quem responde pega o aparelho antes de ver o pedido', async () => {
    const jogo = await abrirJogo(servidor.url, { consulta: '?res=1' });
    const { pagina } = jogo;
    try {
      await comecarPartida(pagina, { jogadores: 2, humanos: 2, baralho: 'classico', terreno: 'neutro', inicio: 'sorteio', partida: '12' });
      await esperarMinhaVez(pagina);
      await esperarCena(pagina, 'return cena.quemVe === cena.mao.vez && !cena.ocupada');
      const pediu = await naCena(pagina, 'return cena.quemVe');
      await apertar(pagina, 'truco');
      /* antes do TRUCO! vem o "passe o aparelho", com a mão de quem pediu escondida */
      await pagina.waitForSelector('.camada .botao.vinho');
      assert.equal(await naCena(pagina, 'return cena.quemVe'), -1);
      assert.equal(await pagina.$('.grito-truco'), null);
      await pagina.locator('.camada .botao.vinho', { hasText: 'Estou pronto' }).click();
      await pagina.waitForSelector('.grito-truco');
      assert.equal(await naCena(pagina, 'return cena.quemVe'), 1 - pediu);
      /* quem respondeu aceita, e a vez volta para quem pediu, de novo pelo "passe o aparelho" */
      await pagina.locator('.grito-truco .botao.vinho').click();
      await esperarCena(pagina, 'return cena.quemVe === -1 && !!document.querySelector(".camada .botao.vinho")');
      assert.deepEqual(jogo.erros, []);
    } finally { await jogo.fechar(); }
  });

  it('dicas: aviso de conquistas, dica de jogo a cada vez, dicas dos botões com o mouse e desligar', async () => {
    const jogo = await abrirJogo(servidor.url, { consulta: '?res=1' });
    const { pagina } = jogo;
    try {
      await comecarPartida(pagina, { oponente: 'aleatorio', baralho: 'classico', terreno: 'pantano', inicio: 'sorteio', partida: '12' });
      await naJanela(pagina, 'botaoRegras', '[data-opcao="dicas"]');
      await pagina.waitForSelector('.camada h2:has-text("Ativar dicas")');
      /* o computador pode gritar truco ao mesmo tempo: mira a caixa das dicas, e não a de cima */
      const caixa = pagina.locator('.camada', { has: pagina.locator('h2', { hasText: 'Ativar dicas' }) });
      assert.match(await caixa.locator('.folha').textContent(), /não valem conquistas/);
      await caixa.locator('.botao.vinho').dispatchEvent('click');
      await esperarMinhaVez(pagina);
      await pagina.waitForSelector('.dica-de-jogo');
      await capturar(pagina, '17-dica-de-jogo');
      assert.match(await naCena(pagina, 'return cena.painel.dica.text'), /Dica:/);
      for (const chave of ['dropout', 'transfer', 'passar', 'truco']) {
        const conteudo = await naCena(pagina, 'return cena.conteudoDaDica(arg)', chave);
        assert.ok(conteudo.titulo && conteudo.corpo && conteudo.agora, chave);
      }
      /* passar o mouse sobre o botão TRUCO mostra a dica flutuante */
      const [x, y] = await naCena(pagina, `
        const b = cena.painel.truco, canvas = jogo.canvas, r = canvas.getBoundingClientRect(), cam = cena.cameras.main, k = r.width / canvas.width;
        return [r.left + (b.x - cam.worldView.x) * cam.zoom * k, r.top + (b.y - cam.worldView.y) * cam.zoom * k];`);
      await pagina.mouse.move(x, y);
      await pagina.waitForSelector('.dica-flutuante');
      await capturar(pagina, '18-dica-do-botao');
      await pagina.mouse.move(600, 300);
      /* com dicas, a mão não vale conquistas */
      assert.equal(await naCena(pagina, 'return cena.dicasNaMao'), true);
      await naJanela(pagina, 'botaoRegras', '[data-opcao="dicas"]');
      assert.equal(await naCena(pagina, 'return app.dicasLigadas'), false);
      assert.deepEqual(jogo.erros, []);
    } finally { await jogo.fechar(); }
  });

  it('celular: segurar um botão mostra a dica sem executar a ação; toque rápido executa (também com a página ocupada)', async () => {
    const jogo = await abrirJogo(servidor.url, { dispositivo: 'Pixel 7', deitado: true, consulta: '?res=1' });
    const { pagina, contexto } = jogo;
    try {
      await comecarPartida(pagina, { oponente: 'aleatorio', partida: '12', inicio: 'sorteio' });
      await naCena(pagina, 'app.dicasLigadas = true; cena.dicasNaMao = true; cena.atualizarChaves();');
      await esperarMinhaVez(pagina);
      const [x, y] = await naCena(pagina, `
        const b = cena.painel.truco, canvas = jogo.canvas, r = canvas.getBoundingClientRect(), cam = cena.cameras.main, k = r.width / canvas.width;
        return [r.left + (b.x - cam.worldView.x) * cam.zoom * k, r.top + (b.y - cam.worldView.y) * cam.zoom * k];`);
      const cdp = await contexto.newCDPSession(pagina);
      /* Cada toque leva o carimbo de tempo do dedo (como num celular de verdade): o botão decide entre
         segurar e tocar pela duração real, mesmo que a página processe os eventos atrasada. */
      const tocar = async (duracao, { ocupada = false, durante = null } = {}) => {
        const inicio = Date.now() / 1000;
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }], timestamp: inicio });
        /* página ocupada durante o toque (como nas simulações da dica do truco): o temporizador de
           "segurar" e o fim do toque chegam juntos e fora de ordem */
        const trabalho = ocupada ? pagina.evaluate((ms) => { const t = performance.now(); while (performance.now() - t < ms); }, duracao + 500) : null;
        await pagina.waitForTimeout(duracao);
        if (durante) await durante();
        await Promise.all([cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [], timestamp: inicio + duracao / 1000 }), trabalho]);
      };
      /* O temporizador de "segurar" (450 ms) só começa quando o Phaser processa o toque, num quadro do
         jogo. Com a máquina ocupada (CI), isso atrasa: o dedo continua na tela até a dica aparecer, em
         vez de conferir num instante fixo. O carimbo do fim do toque continua sendo início + 800 ms. */
      await tocar(800, { durante: async () => { await pagina.waitForSelector('.dica-flutuante', { timeout: 10000 }); } });
      await pagina.waitForTimeout(300);
      assert.equal(await naCena(pagina, 'return cena.partida.valor > 1 || !!cena.partida.pedido'), false, 'segurar não truca');
      await pagina.waitForTimeout(2400); /* a dica some */
      await tocar(800, { ocupada: true });
      await pagina.waitForTimeout(400);
      assert.equal(await naCena(pagina, 'return cena.partida.valor > 1 || !!cena.partida.pedido'), false, 'segurar com a página ocupada não truca');
      await pagina.waitForTimeout(2400);
      await tocar(60, { ocupada: true });
      await esperarCena(pagina, 'return cena.partida.valor > 1 || !!cena.partida.pedido || cena.encerrada');
      assert.deepEqual(jogo.erros, []);
    } finally { await jogo.fechar(); }
  });

  it('celular em tela cheia: botão responde mesmo com o polegar apoiado na borda da tela', async () => {
    const jogo = await abrirJogo(servidor.url, { dispositivo: 'Pixel 7', deitado: true, consulta: '?res=1' });
    const { pagina, contexto } = jogo;
    try {
      await comecarPartida(pagina, { oponente: 'aleatorio', partida: '12', inicio: 'sorteio' });
      /* entrar e sair da tela cheia remede o canvas (os toques seguem caindo nos botões) */
      await pagina.evaluate(() => document.dispatchEvent(new Event('fullscreenchange')));
      await pagina.waitForTimeout(1400);
      const [x, y] = await naCena(pagina, `
        const b = cena.painel.botaoMenu, canvas = jogo.canvas, r = canvas.getBoundingClientRect(), cam = cena.cameras.main, k = r.width / canvas.width;
        return [r.left + (b.x - cam.worldView.x) * cam.zoom * k, r.top + (b.y - cam.worldView.y) * cam.zoom * k];`);
      const cdp = await contexto.newCDPSession(pagina);
      const toque = (type, touchPoints) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints });
      const polegar = { x: 4, y: 200, id: 1 }, dedo = { x, y, id: 2 };
      await toque('touchStart', [polegar]);
      await pagina.waitForTimeout(100);
      await toque('touchStart', [polegar, dedo]);
      await pagina.waitForTimeout(80);
      await toque('touchEnd', [polegar]);
      await pagina.waitForTimeout(100);
      await toque('touchEnd', []);
      await pagina.waitForTimeout(300);
      assert.ok(await pagina.$('.janela-da-mesa'), 'o segundo dedo aperta o botão MENU');
      assert.deepEqual(jogo.erros, []);
    } finally { await jogo.fechar(); }
  });

  it('som, música, comemorações, derrota e voltar ao menu', async () => {
    const jogo = await abrirJogo(servidor.url, { consulta: '?res=1' });
    const { pagina } = jogo;
    try {
      await comecarPartida(pagina, { oponente: 'aleatorio', terreno: 'montanha', partida: '12', inicio: 'sorteio' });
      /* MENU: som e música mudam com a janela aberta */
      await apertar(pagina, 'botaoMenu');
      const som = pagina.locator('.janela-da-mesa [data-chave="som"]'), musica = pagina.locator('.janela-da-mesa [data-chave="musica"]');
      await som.dispatchEvent('click');
      assert.match(await som.textContent(), /Som: não/);
      await som.dispatchEvent('click');
      assert.match(await som.textContent(), /Som: sim/);
      await musica.dispatchEvent('click');
      assert.match(await musica.textContent(), /Música: não/);
      await musica.dispatchEvent('click');
      assert.match(await musica.textContent(), /Música: sim/);
      await capturar(pagina, '20-menu-da-mesa');
      await pagina.locator('.janela-da-mesa [data-fechar]').dispatchEvent('click');
      /* comemorações e impacto do truco */
      await naCena(pagina, 'cena.comemorar("mao", "Você"); cena.impactoDoTruco(12);');
      await pagina.waitForTimeout(500);
      await capturar(pagina, '19-vitoria');
      await naCena(pagina, 'cena.comemorar("partida", "Você");');
      await pagina.waitForTimeout(300);
      /* regras, ajuda das ações e Glossário pelos botões da mesa */
      await naJanela(pagina, 'botaoRegras', '[data-opcao="regras"]');
      await pagina.locator('.camada [data-fechar] >> nth=0').click();
      await naJanela(pagina, 'botaoRegras', '[data-opcao="ajuda"]');
      await pagina.waitForSelector('.cartao-acao');
      await pagina.locator('.camada [data-fechar] >> nth=0').click();
      await naCena(pagina, `const b = cena.painel.acoes.overfit; b.emit('pointerover', { wasTouch: false }); b.emit('pointerout'); const a = cena.painel.botaoAjuda; a.emit('pointerdown'); a.emit('pointerup');`);
      await pagina.waitForSelector('.cartao-acao[data-acao="overfit"][aria-current="true"]');
      await pagina.locator('.camada [data-fechar] >> nth=0').click();
      await naJanela(pagina, 'botaoRegras', '[data-opcao="grimorio"]');
      await pagina.locator('.camada [data-fechar] >> nth=0').click();
      /* menu: continuar jogando, depois voltar */
      await naJanela(pagina, 'botaoMenu', '[data-opcao="sair"]');
      await pagina.locator('.camada .botao', { hasText: 'Continuar jogando' }).click();
      await naJanela(pagina, 'botaoMenu', '[data-opcao="sair"]');
      await pagina.locator('.camada .botao', { hasText: 'Voltar ao menu' }).click();
      await esperarMenu(pagina);
      assert.deepEqual(jogo.erros, []);
    } finally { await jogo.fechar(); }
  });
});
