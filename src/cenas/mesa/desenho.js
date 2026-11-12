/**
 * @file Parte da CenaMesa: desenhar o estado da mão na tela. Neurônios, mãos, placar, curva de
 * treino, dica do turno, alvos destacados e as conexões animadas entre os neurônios de cada rede.
 *
 * Nada aqui muda as regras; só lê `this.mao` e `this.partida`.
 */
import { TAMANHO_CARTA } from '../../configuracao.js';
import { rotuloCarta, NAIPE } from '../../nucleo/cartas.js';
import { BARALHOS } from '../../nucleo/baralhos.js';
import { TERRENOS } from '../../nucleo/terrenos.js';
import { ehOculta, nomeCamada } from '../../nucleo/rede.js';
import { pontuarRede } from '../../nucleo/pontuacao.js';
import {
  alvosDeAtivacao, alvosDeEmpilhamento, podeEmpilhar, efeitoDoEmpilhamento,
  camadasDesfaziveis, valorParaTransfer, podePassar, fronteira,
} from '../../nucleo/partida.js';
import { podeTrucar, proximoValor, ehMaoDeOnze, temTruco, GRITO_TRUCO } from '../../nucleo/truco.js';
import { OPONENTES } from '../../nucleo/oponentes/index.js';
import { texturaDaCartaNaMao, texturaDaCartaNaMesa, texturaDeInspecao } from '../recursos.js';
import {
  PAINEL_ESQ, PAINEL_DIR, ESQ, DIR, TABULEIRO, colunaX, linhaY, COR_JOGADOR, COR_JOGADOR_CSS, COR_DO_ALVO, NOME_SITUACAO,
  ajustarCartaDaMesa, ajustarLinha, ajustarBloco, cartaDaMesa, NOME_DA_ACAO,
} from './layout.js';

export const metodosDeDesenho = {
  /** Mostra uma textura na inspeção, com uma nota explicativa embaixo. */
  inspecionar(textura, nota) {
    this.painel.inspecao.setTexture(textura).setDisplaySize(TAMANHO_CARTA.inspecaoL, TAMANHO_CARTA.inspecaoA);
    ajustarBloco(this.painel.notaInspecao, nota || '', 12, PAINEL_ESQ.l - 30, 40, 9.5);
  },

  /** Mostra a dica do turno no rodapé do painel esquerdo. */
  mostrarDica(texto) {
    ajustarBloco(this.painel.dica, texto, 14, PAINEL_ESQ.l - 28, ESQ.botoes - ESQ.alturaBotao / 2 - 8 - ESQ.dica, 10);
  },

  /** Redesenha tudo a partir do estado: pontuações, alvos, neurônios, mãos e painéis. */
  redesenhar() {
    const mao = this.mao, baralho = mao.config.baralho;
    const { l, a, ml, ma } = cartaDaMesa();
    this.pontuacoes = mao.jogadores.map((_, j) => pontuarRede(mao, j));
    this.calcularAlvos();
    this.camadaVazios.clear();
    /* pontos de cada neurônio na rede do dono (placar por camada, como no NeuroDeck) */
    const pontosDe = {};
    this.pontuacoes.forEach((pont) => { for (const x of pont.neuronios) pontosDe[x.neuronio.id] = x.pontos; });
    for (const camada of mao.camadas) {
      for (const n of camada) {
        const v = this.visuais[n.id];
        const p = pontosDe[n.id];
        v.pontos.setVisible(p !== undefined && n.dono >= 0).setText(p === undefined ? '' : String(p));
        if (p !== undefined && n.dono >= 0) v.pontos.setBackgroundColor(COR_JOGADOR_CSS[n.dono]);
        if (n.removido) {
          v.imagem.setVisible(false); v.pilha.setVisible(false); v.memoria.setVisible(false); v.pontos.setVisible(false);
          this.camadaVazios.lineStyle(1.5, 0xd9b260, 0.28);
          this.camadaVazios.strokeRoundedRect(v.imagem.x - ml, v.imagem.y - ma, l, a, 6);
          continue;
        }
        v.imagem.setVisible(true);
        if (n.revelado) {
          ajustarCartaDaMesa(v.imagem.setTexture(texturaDaCartaNaMesa(this, n.cartas[0], baralho)));
          v.memoria.setVisible(false);
        } else {
          ajustarCartaDaMesa(v.imagem.setTexture(this.verso('mesa')));
          v.memoria.setVisible(n.conhecido).setText(n.conhecido ? 'lembra: ' + rotuloCarta(n.cartas[0]) : '');
        }
        /* selo de tunagem: quantas cartas foram empilhadas sobre o neurônio */
        v.pilha.setVisible(n.cartas.length > 1).setText('\u26a1' + (n.cartas.length - 1));
      }
    }
    this.desenharMaos();
    this.atualizarPaineis();
  },

  /** Desenha a mão do jogador de baixo (aberta) e a do de cima (versos). */
  desenharMaos() {
    const mao = this.mao, baralho = mao.config.baralho;
    for (const c of this.cartasDaMao) c.destroy();
    for (const c of this.cartasDoAdversario) c.destroy();
    this.cartasDaMao = []; this.cartasDoAdversario = [];
    const debaixo = this.jogadorDeBaixo();
    const aberta = this.quemVe >= 0;
    const cartas = mao.jogadores[debaixo].mao;
    const espaco = Math.min(TAMANHO_CARTA.maoL + 8, 660 / Math.max(1, cartas.length));
    cartas.forEach((carta, i) => {
      const x = 610 + (i - (cartas.length - 1) / 2) * espaco;
      const y = this.selecao.includes(carta.id) ? 628 : 646;
      const imagem = this.add.image(x, y, aberta ? texturaDaCartaNaMao(this, carta, baralho) : this.verso('mao'))
        .setDisplaySize(TAMANHO_CARTA.maoL, TAMANHO_CARTA.maoA).setDepth(10 + i);
      imagem.yBase = y;
      imagem.idCarta = carta.id;
      if (aberta) {
        imagem.setInteractive({ useHandCursor: true });
        imagem.on('pointerover', () => { imagem.y = imagem.yBase - 8; this.inspecionar(texturaDeInspecao(this, carta, baralho), this.notaDaCartaDaMao(carta)); });
        imagem.on('pointerout', () => { imagem.y = imagem.yBase; });
        imagem.on('pointerdown', () => this.aoClicarNaCarta(carta.id));
      }
      this.cartasDaMao.push(imagem);
    });
    /* mãos dos outros jogadores no alto, viradas; com mais de um adversário, um leque para cada, com a cor da rede embaixo */
    const outros = this.outrosJogadores();
    outros.forEach((j, k) => {
      const { x, largura } = this.posicaoDaMaoDeCima(k, outros.length);
      const qtd = mao.jogadores[j].mao.length;
      const passo = qtd > 1 ? Math.min(34, (largura - 50) / (qtd - 1)) : 0;
      for (let i = 0; i < qtd; i++) {
        this.cartasDoAdversario.push(this.add.image(x + (i - (qtd - 1) / 2) * passo, 40, this.verso('mesa'))
          .setDisplaySize(41, 57).setDepth(7).setAngle((i - (qtd - 1) / 2) * Math.min(4, 24 / qtd)));
      }
      if (outros.length > 1) {
        const faixa = this.add.rectangle(x, 73, Math.min(largura - 16, 40 + passo * Math.max(0, qtd - 1)), 3, COR_JOGADOR[j]).setDepth(7);
        this.cartasDoAdversario.push(faixa);
      }
    });
    this.camadaSelecao.clear();
    for (const imagem of this.cartasDaMao) {
      if (!this.selecao.includes(imagem.idCarta)) continue;
      this.camadaSelecao.lineStyle(4, this.modo === 'pagarDropout' ? COR_DO_ALVO.dropout : 0xf6dc8f, 1);
      const l = TAMANHO_CARTA.maoL + 4, a = TAMANHO_CARTA.maoA + 4;
      this.camadaSelecao.strokeRoundedRect(imagem.x - l / 2, imagem.y - a / 2, l, a, 10);
    }
  },

  /**
   * Centro e largura do leque de cartas de um adversário no alto da mesa.
   * @param {number} k Posição do adversário entre os outros jogadores (0 = o próximo a jogar).
   * @param {number} n Quantos outros jogadores há.
   */
  posicaoDaMaoDeCima(k, n) {
    if (n <= 1) return { x: 560, largura: 520 };
    const largura = (TABULEIRO.x1 - TABULEIRO.x0) / n;
    return { x: TABULEIRO.x0 + largura * (k + 0.5), largura };
  },

  /** Nota da inspeção para uma carta da mão: onde ela pode ser usada agora. */
  notaDaCartaDaMao(carta) {
    const eu = this.quemVe;
    const alvos = alvosDeEmpilhamento(this.mao).filter((n) => n.cartas[0].valor === carta.valor);
    if (!alvos.length) return 'Sem alvo para esta carta agora. Guarde para tunar, atacar ou pagar dropouts.';
    return 'Clique para selecionar. Mesma figura de: ' + alvos.map((n) => rotuloCarta(n.cartas[0]) + (n.dono === eu ? ' (sua)' : ' (adversário)')).join(', ') + '.';
  },

  /** Atualiza os textos e botões dos painéis. */
  atualizarPaineis() {
    const mao = this.mao, p = this.painel, partida = this.partida;
    ajustarLinha(p.tituloMao, 'MÃO ' + (partida.numeroMao + 1) + ' · VALE ' + partida.valor + (partida.valor === 1 ? ' TENTO' : ' TENTOS'), 16, PAINEL_DIR.l - 28, 11);
    ajustarLinha(p.subtitulo, partida.alvo <= 1 ? 'Mão única, sem truco' : !temTruco(partida) ? 'Partida até ' + partida.alvo + ' tentos, sem truco (' + partida.tentos.length + ' jogadores)' : ehMaoDeOnze(partida) ? 'Mão de onze: ninguém pode trucar' : 'Partida até ' + partida.alvo + ' tentos', 12.5, PAINEL_DIR.l - 28, 10);
    this.ordemDoPlacar().forEach((j, i) => this.atualizarBlocoDoJogador(p.blocos[i], j));
    const baralho = mao.config.baralho;
    this.atualizarPilha(p.limbo, 'LIMBO', mao.limbo.length, null);
    const topo = mao.cemiterio[mao.cemiterio.length - 1];
    this.atualizarPilha(p.cemiterio, 'CEMITÉRIO', mao.cemiterio.length, topo ? texturaDaCartaNaMesa(this, topo, baralho) : null);
    const extra = [];
    if (mao.config.terreno !== 'neutro') extra.push('Rodada ' + mao.rodada);
    if (mao.config.terreno === 'oceano' && mao.vento) extra.push('vento: ' + NAIPE[mao.vento].nome + ' revelado agora vale dobro');
    ajustarBloco(p.textoTerreno, TERRENOS[mao.config.terreno].nome + ' · baralho ' + BARALHOS[mao.config.baralho].nome + (extra.length ? '\n' + extra.join(' · ') : ''), 12, PAINEL_ESQ.l - 30, 34, 9);
    this.atualizarBotoes();
    this.atualizarRegistro();
    this.desenharCurva();
    this.mostrarDica(this.dicaDoCursor || this.textoComDicaDeJogo());
  },

  /** Dica do turno e, com as dicas ligadas, o título da dica de jogo atual. */
  textoComDicaDeJogo() {
    const dica = this.textoDaDicaDeJogo();
    return this.textoDaDica() + (dica ? '\n' + dica : '');
  },

  /**
   * Desenha uma pilha (limbo ou cemitério): a carta do topo (ou o verso), bordas de cartas
   * empilhadas por baixo quando há mais de uma, o contador e o rótulo.
   * @param {string|null} texturaDoTopo Carta virada para cima; null mostra o verso.
   */
  atualizarPilha(pilha, nome, quantidade, texturaDoTopo) {
    const { l, a } = ESQ.pilha, g = pilha.camadas;
    const camadas = Math.min(4, Math.max(0, quantidade - 1)); /* bordas visíveis por baixo do topo */
    const desvio = 3; /* deslocamento de cada carta da pilha, para cima e para a direita */
    g.clear();
    if (quantidade === 0) {
      /* lugar vazio: só o contorno tracejado da carta */
      g.lineStyle(1.5, 0xd9b260, 0.35); g.strokeRoundedRect(pilha.x - l / 2, pilha.y - a / 2, l, a, 6);
    }
    for (let k = camadas; k >= 1; k--) {
      const x = pilha.x - l / 2 + k * desvio, y = pilha.y - a / 2 - k * desvio;
      g.fillStyle(0x0b0907, 1); g.fillRoundedRect(x, y, l, a, 6);
      g.fillStyle(0xe9dcbc, 1); g.fillRoundedRect(x + 1.5, y + 1.5, l - 3, a - 3, 5);
      g.lineStyle(1, 0x7a6a4c, 0.8); g.strokeRoundedRect(x + 1.5, y + 1.5, l - 3, a - 3, 5);
    }
    pilha.carta.setTexture(texturaDoTopo || this.verso('mesa')).setDisplaySize(l, a).setVisible(quantidade > 0);
    pilha.contador.setVisible(quantidade > 1).setText('\u00d7' + quantidade);
    ajustarLinha(pilha.rotulo, nome, 11, 110, 8);
  },

  /** Bloco de placar de um jogador: avatar, nome, nível, situação, detalhes, tentos e soma. */
  atualizarBlocoDoJogador(b, j) {
    const mao = this.mao, jogador = mao.jogadores[j], partida = this.partida;
    const naVez = this.estaNaVez(j);
    const g = b.grafico, cor = COR_JOGADOR[j];
    g.clear();
    if (b.compacto) return this.atualizarBlocoCompacto(b, j, naVez);
    g.fillStyle(naVez ? 0x12261b : 0x000000, naVez ? 0.95 : 0.3); g.fillRoundedRect(b.x, b.y, b.l, b.a, 8);
    g.fillStyle(cor, 1); g.fillRoundedRect(b.x, b.y, naVez ? 8 : 5, b.a, { tl: 8, bl: 8, tr: 0, br: 0 });
    g.lineStyle(naVez ? 2.5 : 1, naVez ? cor : 0xd9b260, naVez ? 1 : 0.22); g.strokeRoundedRect(b.x, b.y, b.l, b.a, 8);
    /* avatar: aceso e com aro na cor do jogador quando é a vez dele; apagado quando não é */
    b.avatar.setTexture(this.avatarDe(j)).setDisplaySize(DIR.avatar, DIR.avatar).setAlpha(naVez ? 1 : 0.55);
    if (naVez) { g.lineStyle(3, cor, 1); g.strokeCircle(b.avatar.x, b.avatar.y, DIR.avatar / 2 + 3); }
    b.selo.setVisible(naVez).setBackgroundColor(COR_JOGADOR_CSS[j]).setText(j === this.quemVe ? 'SUA VEZ' : 'NA VEZ');
    /* nome e nível vão até a coluna da soma (canto superior direito); as linhas de baixo usam a largura toda */
    const larguraAteSoma = b.x + b.l - 12 - 62 - b.textoX, larguraTexto = b.x + b.l - 12 - b.textoX;
    ajustarLinha(b.nome.setColor(COR_JOGADOR_CSS[j]), jogador.nome, 15, larguraAteSoma, 10);
    /* linha de nível: perfil do oponente; `notaDoOponente` ("pensando…", simulação) tem prioridade */
    const perfil = OPONENTES[jogador.oponente];
    const nivel = perfil ? (this.notaDoOponente || perfil.nivel + ' \u00b7 ' + perfil.metodo) : (this.variosHumanos ? 'Jogador humano' : 'Você joga com o azul');
    ajustarLinha(b.nivel, nivel, 12, larguraAteSoma, 9);
    ajustarLinha(b.situacao, this.textoDaSituacao(j).toUpperCase(), 9.5, larguraTexto, 7.5);
    ajustarLinha(b.detalhe, 'Mão ' + jogador.mao.length + ' \u00b7 Dropouts ' + jogador.dropouts + (jogador.transferUsado ? ' \u00b7 TL usado' : ''), 12, larguraTexto, 9);
    if (partida.alvo > 1) {
      /* tentos como grãos de feijão do truco */
      for (let k = 0; k < Math.min(12, partida.alvo); k++) {
        const px = b.textoX + 4 + k * 9, py = b.y + 89;
        if (k < partida.tentos[j]) { g.fillStyle(cor, 1); g.fillCircle(px, py, 3.2); g.lineStyle(1, 0xffffff, 0.5); g.strokeCircle(px, py, 3.2); }
        else { g.lineStyle(1, 0xd9b260, 0.45); g.strokeCircle(px, py, 2.8); }
      }
      b.tentos.setVisible(true);
      ajustarLinha(b.tentos, partida.tentos[j] + (partida.tentos[j] === 1 ? ' tento' : ' tentos'), 11, 70, 8.5);
    } else b.tentos.setVisible(false);
    const pontuacao = this.pontuacoes[j];
    ajustarLinha(b.soma.setColor(pontuacao.vanishing ? '#ff7b88' : '#f6ecd6'), String(pontuacao.total), 34, 60, 18);
  },

  /** Situação da rede do jogador e a camada em que está: "em construção · camada 3/6". */
  textoDaSituacao(j) {
    const mao = this.mao, jogador = mao.jogadores[j];
    const travada = jogador.situacao === 'construindo' && mao.fase === 'jogo' && alvosDeAtivacao(mao, j).length === 0;
    return (travada ? 'travada' : NOME_SITUACAO[jogador.situacao]) + ' \u00b7 camada ' + Math.max(0, jogador.caminho.length - 1) + '/' + (mao.camadas.length - 1);
  },

  /** Bloco compacto do placar (3 a 5 jogadores): nome, situação, mão e tentos numa linha, e a soma. */
  atualizarBlocoCompacto(b, j, naVez) {
    const mao = this.mao, jogador = mao.jogadores[j], g = b.grafico, cor = COR_JOGADOR[j];
    g.fillStyle(naVez ? 0x12261b : 0x000000, naVez ? 0.95 : 0.3); g.fillRoundedRect(b.x, b.y, b.l, b.a, 6);
    g.fillStyle(cor, 1); g.fillRoundedRect(b.x, b.y, naVez ? 7 : 4, b.a, { tl: 6, bl: 6, tr: 0, br: 0 });
    g.lineStyle(naVez ? 2 : 1, naVez ? cor : 0xd9b260, naVez ? 1 : 0.22); g.strokeRoundedRect(b.x, b.y, b.l, b.a, 6);
    b.avatar.setTexture(this.avatarDe(j)).setDisplaySize(b.avatarLado, b.avatarLado).setAlpha(naVez ? 1 : 0.55);
    if (naVez) { g.lineStyle(2, cor, 1); g.strokeCircle(b.avatar.x, b.avatar.y, b.avatarLado / 2 + 2); }
    b.selo.setVisible(naVez).setBackgroundColor(COR_JOGADOR_CSS[j]).setText(j === this.quemVe ? 'SUA VEZ' : 'NA VEZ');
    const largura = b.x + b.l - 10 - 46 - b.textoX;
    const nome = jogador.nome + (j === this.quemVe && !this.variosHumanos ? '' : this.notaDoOponente && naVez && jogador.tipo === 'oponente' ? ' \u00b7 ' + this.notaDoOponente : '');
    ajustarLinha(b.nome.setColor(COR_JOGADOR_CSS[j]), nome, 13, naVez ? largura - 52 : largura, 9);
    const tentos = this.partida.alvo > 1 ? ' \u00b7 ' + this.partida.tentos[j] + ' t' : '';
    ajustarLinha(b.situacao, (this.textoDaSituacao(j) + ' \u00b7 mão ' + jogador.mao.length + (jogador.dropouts ? ' \u00b7 dropouts ' + jogador.dropouts : '') + tentos).toUpperCase(), 9, largura, 7);
    const pontuacao = this.pontuacoes[j];
    ajustarLinha(b.soma.setColor(pontuacao.vanishing ? '#ff7b88' : '#f6ecd6'), String(pontuacao.total), Math.min(26, b.a * 0.62), 46, 12);
  },

  /** O jogador `j` está na vez (e a mão está em andamento)? */
  estaNaVez(j) {
    return this.mao.fase === 'jogo' && this.mao.vez === j && !this.encerrada;
  },

  /** Brilho pulsante em volta do bloco de placar de quem está na vez (desenhado a cada quadro). */
  desenharDestaqueDaVez(tempo) {
    const g = this.camadaVez;
    g.clear();
    const indice = this.ordemDoPlacar().findIndex((j) => this.estaNaVez(j));
    if (indice < 0) return;
    const b = this.painel.blocos[indice], cor = COR_JOGADOR[this.mao.vez];
    const pulso = 0.5 + 0.5 * Math.sin(tempo / 260);
    const camadas = b.compacto ? 2 : 3;
    for (let k = 1; k <= camadas; k++) {
      g.lineStyle(2, cor, (0.38 - k * 0.1) * (0.5 + pulso));
      g.strokeRoundedRect(b.x - k * 2, b.y - k * 2, b.l + k * 4, b.a + k * 4, 8 + k * 2);
    }
    g.lineStyle(2, cor, 0.35 + 0.5 * pulso);
    g.strokeCircle(b.avatar.x, b.avatar.y, (b.compacto ? b.avatarLado : DIR.avatar) / 2 + (b.compacto ? 4 : 6) + pulso * (b.compacto ? 2 : 3));
  },

  /** Habilita os botões conforme o que o jogador pode fazer agora. */
  atualizarBotoes() {
    const p = this.painel, mao = this.mao, eu = this.quemVe, partida = this.partida;
    const minhaVez = this.ehVezDoHumano();
    /* empilhar: acende quando as cartas selecionadas encaixam em algum alvo daquele tipo */
    for (const tipo of ['tunagem', 'overfit', 'earlystop', 'stackoverflow']) p.acoes[tipo].habilitar(minhaVez && this.alvosDaAcao(tipo).length > 0);
    p.botaoDropout.habilitar(minhaVez && this.dropoutPossivel());
    p.botaoDropout.definirRotulo(this.modo === 'dropout' || this.modo === 'pagarDropout' ? 'Cancelar' : 'Dropout');
    p.botaoTransfer.habilitar(minhaVez && !!valorParaTransfer(mao, eu));
    p.botaoPassar.habilitar(minhaVez && podePassar(mao, eu));
    p.acoes.limpar.habilitar(minhaVez && (this.selecao.length > 0 || this.modo === 'dropout' || this.modo === 'pagarDropout' || !!this.acaoEscolhida));
    p.truco.habilitar(minhaVez && podeTrucar(partida, eu));
    const proximo = proximoValor(partida.valor);
    p.truco.definirRotulo(!temTruco(partida) ? 'SEM TRUCO' : ehMaoDeOnze(partida) ? 'MÃO DE ONZE' : proximo ? GRITO_TRUCO[proximo] : 'VALE TUDO');
  },

  /** Registro de jogadas: as linhas mais recentes que couberem. */
  atualizarRegistro() {
    const registro = this.painel.registro;
    const linhas = this.mao.registro.slice(-10);
    registro.setFontSize(12).setWordWrapWidth(PAINEL_DIR.l - 24);
    registro.setText(linhas.join('\n'));
    while (linhas.length > 1 && registro.height > DIR.alturaRegistro) { linhas.shift(); registro.setText(linhas.join('\n')); }
  },

  /** Curva de treino: soma de cada rede a cada turno. */
  desenharCurva() {
    const g = this.camadaCurva, historico = this.mao.historico;
    g.clear();
    const x0 = PAINEL_DIR.x + 12, l = PAINEL_DIR.l - 24, topo = DIR.curva, a = DIR.alturaCurva;
    g.fillStyle(0x000000, 0.3); g.fillRoundedRect(x0, topo, l, a, 6);
    g.lineStyle(1, 0xd9b260, 0.2); g.strokeRoundedRect(x0, topo, l, a, 6);
    let maximo = 40;
    for (const linha of historico) for (const v of linha) maximo = Math.max(maximo, v);
    maximo = Math.ceil(maximo / 20) * 20;
    this.painel.maximoCurva.setText(maximo + ' pts');
    const ix = x0 + 8, il = l - 16, base = topo + a - 8, ia = a - 20;
    g.lineStyle(1, 0xd9b260, 0.15);
    for (const f of [0.5, 1]) g.lineBetween(ix, base - ia * f, ix + il, base - ia * f);
    const pontos = Math.max(2, historico.length);
    for (let j = 0; j < this.mao.jogadores.length; j++) {
      g.lineStyle(2.5, COR_JOGADOR[j], 1);
      g.beginPath();
      historico.forEach((linha, i) => {
        const x = ix + (i / (pontos - 1)) * il, y = base - (linha[j] / maximo) * ia;
        if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
      });
      g.strokePath();
      const ultimo = historico[historico.length - 1];
      if (ultimo) { g.fillStyle(COR_JOGADOR[j], 1); g.fillCircle(ix + ((historico.length - 1) / (pontos - 1)) * il, base - (ultimo[j] / maximo) * ia, 3.5); }
    }
  },

  /** Texto de ajuda do momento, conforme a fase e o modo de seleção. */
  textoDaDica() {
    const mao = this.mao, eu = this.quemVe;
    if (this.encerrada) return 'Fim da mão.';
    if (this.partida.pedido) return 'Truco na mesa! Aguardando resposta.';
    if (mao.fase === 'inicio') {
      if (this.modo === 'inicio') return mao.config.inicio === 'revela-descarta'
        ? 'Escolha uma carta da mão para revelar. A mais alta começa. Ela vai para o cemitério.'
        : 'Escolha uma carta da mão para revelar. A mais alta começa. Ela volta para a sua mão.';
      return 'Decidindo quem começa…';
    }
    const daVez = mao.jogadores[mao.vez];
    if (!this.ehVezDoHumano()) return daVez.tipo === 'oponente' ? daVez.nome + ' está pensando…' : mao.vez === eu ? 'Sua vez.' : 'Vez de ' + daVez.nome + '.';
    if (this.modo === 'dropout') return 'Dropout: clique no neurônio oculto da sua rede até onde quer desfazer. Cada camada custa 1 carta da mão. Esc cancela.';
    if (this.modo === 'pagarDropout') return 'Escolha ' + this.camadasDropout + ' carta(s) da mão para pagar o dropout (' + this.selecao.length + '/' + this.camadasDropout + '). Esc cancela.';
    if (this.selecao.length) {
      const valor = this.valorSelecionado(), qtd = this.selecao.length + ' carta(s) ' + valor;
      if (this.acaoEscolhida) return NOME_DA_ACAO[this.acaoEscolhida] + ' com ' + qtd + ': clique no neurônio destacado do rival que quer atacar. Esc cancela.';
      const possiveis = ['tunagem', 'overfit', 'earlystop', 'stackoverflow'].filter((t) => this.alvosDaAcao(t).length).map((t) => NOME_DA_ACAO[t]);
      if (this.dropoutPossivel()) possiveis.push('Dropout de ' + this.selecao.length + ' camada(s)');
      return possiveis.length
        ? 'Com ' + qtd + ' você pode: ' + possiveis.join(', ') + '. Use os botões acesos (passe o cursor para ver o efeito) ou clique num neurônio destacado.'
        : 'Nenhuma ação aceita ' + qtd + ' agora. Tunagem e ataques só valem no último neurônio oculto de uma rede, com o mesmo valor.';
    }
    const jogador = mao.jogadores[eu];
    if (jogador.situacao !== 'construindo') return 'Sua rede está finalizada. Ainda dá para atacar a fronteira do adversário com cartas da mão.' + (podePassar(mao, eu) ? ' Atacar não é obrigatório: você também pode passar a vez.' : '');
    return 'Sua vez: ative um neurônio da camada ' + nomeCamada(jogador.caminho.length, mao.camadas.length) + ' (dourado) ou selecione cartas da mão para uma ação.';
  },

  /**
   * Neurônios onde a ação da barra pode ser feita com a seleção atual. "Tunagem" é qualquer pilha
   * na própria rede (inclusive a de 3 e 4 cartas, que aplica early stop ou stack overflow em si);
   * os outros três são ataques à rede de um rival.
   * @param {'tunagem'|'overfit'|'earlystop'|'stackoverflow'} tipo
   * @returns {string[]} ids dos neurônios
   */
  alvosDaAcao(tipo) {
    if (!this.alvos || !this.selecao.length) return [];
    return Object.keys(this.alvos).filter((id) => {
      const a = this.alvos[id];
      return a.tipo === tipo;
    });
  },

  /** Dá para fazer dropout agora? Com cartas selecionadas, desfazendo uma camada por carta. */
  dropoutPossivel() {
    const mao = this.mao, eu = this.quemVe;
    if (!this.ehVezDoHumano() || mao.fase !== 'jogo') return false;
    const camadas = camadasDesfaziveis(mao, eu), cartas = mao.jogadores[eu].mao.length;
    if (this.modo === 'dropout' || this.modo === 'pagarDropout') return true; /* o botão vira "Cancelar" */
    if (this.selecao.length) return this.selecao.length <= camadas;
    return camadas > 0 && cartas > 0;
  },

  /** Valor (A, 2…K) das cartas selecionadas na mão. */
  valorSelecionado() {
    const carta = this.mao.jogadores[this.quemVe].mao.find((c) => c.id === this.selecao[0]);
    return carta ? carta.valor : '';
  },

  /** Calcula quais neurônios podem ser clicados agora e com que efeito (em `this.alvos`). */
  calcularAlvos() {
    const mao = this.mao, eu = this.quemVe;
    this.alvos = {};
    if (mao.fase !== 'jogo' || !this.ehVezDoHumano()) return;
    if (this.modo === 'dropout') {
      const jogador = mao.jogadores[eu];
      jogador.caminho.forEach((id, i) => {
        if (i >= 1 && ehOculta(mao.neuronios[id].camada, mao.camadas.length)) {
          const n = jogador.caminho.length - i;
          if (n <= jogador.mao.length) this.alvos[id] = { tipo: 'dropout', n };
        }
      });
      return;
    }
    if (this.modo === 'pagarDropout') return;
    if (this.selecao.length) {
      for (const n of alvosDeEmpilhamento(mao)) {
        if (!podeEmpilhar(mao, eu, n.id, this.selecao)) continue;
        const efeito = efeitoDoEmpilhamento(mao, eu, n, this.selecao.length);
        this.alvos[n.id] = { tipo: efeito.tipo, proprio: efeito.proprio };
      }
      /* depois de escolher a ação na barra, só os alvos dela continuam destacados */
      if (this.acaoEscolhida) {
        const manter = new Set(this.alvosDaAcao(this.acaoEscolhida));
        for (const id of Object.keys(this.alvos)) if (!manter.has(id)) delete this.alvos[id];
      }
      return;
    }
    for (const n of alvosDeAtivacao(mao, eu)) this.alvos[n.id] = { tipo: 'ativar' };
  },

  /**
   * Desenho contínuo (a cada quadro): contorno e conexões de cada rede, com espessura proporcional
   * ao valor, pulsos de "sinal" percorrendo as ligações e o contorno pulsante dos alvos.
   */
  desenharConexoesEAlvos(tempo) {
    const mao = this.mao, g = this.camadaConexoes;
    const { ml, ma } = cartaDaMesa();
    g.clear();
    mao.jogadores.forEach((jogador, j) => {
      const pontuacao = this.pontuacoes?.[j];
      for (let i = 0; i < jogador.caminho.length; i++) {
        const a = mao.neuronios[jogador.caminho[i]];
        const ax = colunaX(a.camada), ay = linhaY(a.camada, a.posicao);
        g.lineStyle(3, COR_JOGADOR[j], 0.95); g.strokeRoundedRect(ax - ml - 2, ay - ma - 2, ml * 2 + 4, ma * 2 + 4, 7);
        if (i === jogador.caminho.length - 1) continue;
        const b = mao.neuronios[jogador.caminho[i + 1]];
        const bx = colunaX(b.camada), by = linhaY(b.camada, b.posicao);
        const pontos = pontuacao?.neuronios[i + 1] ? pontuacao.neuronios[i + 1].pontos : 2;
        const espessura = 1.5 + Math.min(9, pontos * 0.5);
        g.lineStyle(espessura, COR_JOGADOR[j], 0.55);
        g.lineBetween(ax + ml, ay, bx - ml, by);
        for (let k = 0; k < 2; k++) {
          const t = (tempo / 1100 + k * 0.5 + i * 0.13) % 1;
          g.fillStyle(0xffffff, 0.85);
          g.fillCircle(ax + ml + (bx - ax - ml * 2) * t, ay + (by - ay) * t, 2 + espessura * 0.15);
        }
      }
    });
    /* leque de candidatos, como no TensorFlow Playground */
    if (this.ehVezDoHumano() && !this.selecao.length && this.modo === 'livre') {
      const f = fronteira(mao, this.quemVe);
      if (f) {
        for (const id of Object.keys(this.alvos)) {
          const n = mao.neuronios[id];
          g.lineStyle(1, COR_JOGADOR[this.quemVe], 0.25);
          g.lineBetween(colunaX(f.camada) + ml, linhaY(f.camada, f.posicao), colunaX(n.camada) - ml, linhaY(n.camada, n.posicao));
        }
      }
    }
    const d = this.camadaDestaques;
    d.clear();
    const pulso = 0.55 + 0.45 * Math.sin(tempo / 180);
    if (this.modo === 'inicio') {
      for (const imagem of this.cartasDaMao) { d.lineStyle(3, 0xf6dc8f, pulso); d.strokeRoundedRect(imagem.x - 50, imagem.y - 69, 100, 138, 10); }
    }
    for (const [id, alvo] of Object.entries(this.alvos || {})) {
      const n = mao.neuronios[id];
      d.lineStyle(alvo.tipo === 'ativar' ? 2.5 : 4, COR_DO_ALVO[alvo.tipo], pulso);
      d.strokeRoundedRect(colunaX(n.camada) - ml - 5, linhaY(n.camada, n.posicao) - ma - 5, ml * 2 + 10, ma * 2 + 10, 9);
    }
  },
};
