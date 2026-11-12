/**
 * @file Parte da CenaMesa: elementos fixos da tela (molduras dos painéis, colunas das camadas),
 * botões e criação de todos os textos e imagens dos painéis.
 *
 * Os métodos daqui são copiados para CenaMesa.prototype; `this` é a cena.
 */
import { FONTES, RESOLUCAO, CORES, TAMANHO_CARTA } from '../../configuracao.js';
import { nomeCamada } from '../../nucleo/rede.js';
import { TERRENOS } from '../../nucleo/terrenos.js';
import { desenharBotao, MARGEM_BOTAO } from '../../arte/botoes.js';
import { Som } from '../../interface/som.js';
import { texturaDeInspecao } from '../recursos.js';
import { PAINEL_ESQ, PAINEL_DIR, ESQ, DIR, FOLGA_DE_TOQUE, BARRA_DE_ACOES, colunaX, linhaY, ajustarLinha, geometria, cartaDaMesa, blocosDoPlacar } from './layout.js';

/** Cor do rótulo de cada variante de botão. */
const COR_ROTULO = { ouro: '#2a1606', vinho: '#fff0e0', pedra: '#f6ecd6' };

export const metodosDoCenario = {
  /** Molduras dos painéis laterais, divisórias e colunas das camadas com seus nomes. */
  desenharCenarioFixo() {
    const g = this.add.graphics().setDepth(0);
    for (const p of [PAINEL_ESQ, PAINEL_DIR]) {
      g.fillStyle(0x000000, 0.35); g.fillRoundedRect(p.x + 2, p.y + 4, p.l, p.a, 12);
      g.fillStyle(0x07150e, 0.82); g.fillRoundedRect(p.x, p.y, p.l, p.a, 12);
      g.lineStyle(1.5, CORES.ouro, 0.55); g.strokeRoundedRect(p.x, p.y, p.l, p.a, 12);
      g.lineStyle(1, CORES.ouro, 0.18); g.strokeRoundedRect(p.x + 4, p.y + 4, p.l - 8, p.a - 8, 9);
    }
    g.lineStyle(1, CORES.ouro, 0.25);
    for (const y of [ESQ.divisoria1, ESQ.divisoria2]) g.lineBetween(PAINEL_ESQ.x + 18, y, PAINEL_ESQ.x + PAINEL_ESQ.l - 18, y);
    /* uma coluna por camada; a largura e a altura acompanham a mesa (arquitetura e jogadores) */
    const { tamanhos, coluna } = geometria(), { ma } = cartaDaMesa(), total = tamanhos.length;
    const largura = Math.min(84, coluna - 8), margem = ma + 9;
    for (let c = 0; c < total; c++) {
      const imune = c === 0 || c === total - 1;
      const topo = linhaY(c, 0) - margem, base = linhaY(c, tamanhos[c] - 1) + margem;
      g.fillStyle(imune ? 0x2a1a08 : 0x000000, imune ? 0.35 : 0.18);
      g.fillRoundedRect(colunaX(c) - largura / 2, topo, largura, base - topo, 10);
      if (imune) { g.lineStyle(1.5, 0xe8a7b8, 0.5); g.strokeRoundedRect(colunaX(c) - largura / 2, topo, largura, base - topo, 10); }
      const rotulo = this.add.text(colunaX(c), 86, nomeCamada(c, total).toUpperCase(), { fontFamily: FONTES.titulo, fontStyle: '700', fontSize: '13px', color: imune ? '#f3c3cf' : '#e8d6a8', letterSpacing: 1 }).setOrigin(0.5).setDepth(1);
      ajustarLinha(rotulo, rotulo.text, 13, coluna - 7, 8);
      /* "imune a ações" só cabe acima da coluna quando sobra espaço sob o nome da camada */
      if (imune && topo - 11 > 98) {
        const aviso = this.add.text(colunaX(c), topo - 11, 'imune a ações', { fontFamily: FONTES.texto, fontStyle: 'italic', fontSize: '11.5px', color: '#f3c3cf' }).setOrigin(0.5).setDepth(1);
        ajustarLinha(aviso, aviso.text, 11.5, coluna + 6, 8);
      }
    }
    this.add.text(PAINEL_ESQ.x + PAINEL_ESQ.l / 2, ESQ.titulo, 'INSPEÇÃO', { fontFamily: FONTES.titulo, fontStyle: '700', fontSize: '12px', color: '#e8d6a8', letterSpacing: 2 }).setOrigin(0.5).setDepth(7);
  },

  /**
   * Cria um botão com textura própria e rótulo que se ajusta à largura.
   * O objeto devolvido ganha `definirRotulo(texto)` e `habilitar(sim)`.
   *
   * Com `opcoes.dica`, o botão mostra uma dica flutuante (modo "dicas" ligado): ao passar o mouse,
   * ou, no celular, ao segurar o botão apertado. Soltar depois de segurar não executa a ação,
   * para que dê para ler a dica sem jogar sem querer. A ação roda ao soltar o toque/clique.
   * `explicar`, quando dado, devolve o texto que aparece no quadro de instruções (painel
   * esquerdo) enquanto o cursor está sobre o botão: o que a ação faria agora, antes de confirmar.
   * @param {{variante?: 'ouro'|'vinho'|'pedra', tamanho?: number, dica?: string, explicar?: () => string}} [opcoes]
   */
  criarBotao(x, y, l, a, rotulo, acao, opcoes = {}) {
    const variante = opcoes.variante || 'ouro';
    const textura = (estado) => {
      const chave = 'botao:' + variante + ':' + l + 'x' + a + ':' + estado;
      if (!this.textures.exists(chave)) this.textures.addCanvas(chave, desenharBotao(l, a, Math.min(RESOLUCAO, 2.5), variante, estado));
      return chave;
    };
    const botao = this.add.container(x, y).setDepth(8);
    const fundo = this.add.image(0, 0, textura('normal')).setDisplaySize(l + MARGEM_BOTAO * 2, a + MARGEM_BOTAO * 2);
    const tamanho = opcoes.tamanho || 14;
    const texto = this.add.text(0, -0.5, rotulo, { fontFamily: FONTES.titulo, fontStyle: '700', fontSize: tamanho + 'px', color: COR_ROTULO[variante], align: 'center' }).setOrigin(0.5);
    botao.add([fundo, texto]);
    botao.setSize(l, a);
    /* área de toque um pouco maior que o desenho (o dedo cobre mais do que o cursor) */
    const folga = FOLGA_DE_TOQUE;
    botao.setInteractive({
      hitArea: new Phaser.Geom.Rectangle(-folga, -folga, l + folga * 2, a + folga * 2),
      hitAreaCallback: Phaser.Geom.Rectangle.Contains,
      useHandCursor: true,
    });
    botao.habilitado = true;
    const pintar = (estado) => fundo.setTexture(textura(estado)).setDisplaySize(l + MARGEM_BOTAO * 2, a + MARGEM_BOTAO * 2);
    const temDica = () => opcoes.dica && this.app.dicasLigadas;
    const mostrarDica = () => this.mostrarDicaDoBotao(opcoes.dica, x, y, l, a);
    let segurando = null, segurou = false;
    botao.on('pointerover', (ponteiro) => {
      if (botao.habilitado) pintar('foco');
      if (opcoes.explicar && !ponteiro.wasTouch) { this.dicaDoCursor = opcoes.explicar(); this.mostrarDica(this.dicaDoCursor); }
      if (temDica() && !ponteiro.wasTouch) mostrarDica();
    });
    botao.on('pointerout', () => {
      pintar(botao.habilitado ? 'normal' : 'inativo');
      if (opcoes.explicar) { this.dicaDoCursor = null; if (this.mao) this.mostrarDica(this.textoComDicaDeJogo()); }
      clearTimeout(segurando);
      if (!segurou) this.esconderDicaDoBotao();
    });
    botao.on('pointerdown', () => {
      segurou = false;
      clearTimeout(segurando);
      if (temDica()) segurando = setTimeout(() => { segurou = true; mostrarDica(); }, 450);
    });
    botao.on('pointerup', () => {
      clearTimeout(segurando);
      if (segurou) { segurou = false; setTimeout(() => this.esconderDicaDoBotao(), 2200); return; }
      if (botao.habilitado) { Som.selecionar(); acao(); }
    });
    botao.texto = texto;
    botao.definirRotulo = (s) => { ajustarLinha(texto, s, tamanho, l - 18, 9); return botao; };
    botao.habilitar = (sim) => {
      if (botao.habilitado === sim) return botao;
      botao.habilitado = sim;
      pintar(sim ? 'normal' : 'inativo');
      texto.setColor(sim ? COR_ROTULO[variante] : variante === 'vinho' ? '#a77a7a' : '#8c7f63');
      return botao;
    };
    botao.definirRotulo(rotulo);
    return botao;
  },

  /** Cria os textos, imagens e botões dos painéis. Ficam em `this.painel`. */
  criarPaineis() {
    const p = (this.painel = {});
    this.criarPainelEsquerdo(p);
    this.criarPlacar(p);
    this.criarBotoesDeAcao(p);
    this.atualizarChaves();
  },

  /** Atalho para criar texto na fonte do corpo, já na profundidade dos painéis. */
  criarTexto(x, y, s, estilo) {
    return this.add.text(x, y, s, { fontFamily: FONTES.texto, fontSize: '13px', color: '#efe3c6', ...(estilo || {}) }).setDepth(7);
  },

  /** Painel esquerdo: inspeção, limbo e cemitério (como pilhas), terreno e dica do turno. */
  criarPainelEsquerdo(p) {
    const titulo = { fontFamily: FONTES.titulo, fontStyle: '700' };
    const cx = PAINEL_ESQ.x + PAINEL_ESQ.l / 2;
    p.inspecao = this.add.image(cx, ESQ.inspecao, 'terreno-' + this.opcoes.terreno).setDisplaySize(TAMANHO_CARTA.inspecaoL, TAMANHO_CARTA.inspecaoA).setDepth(7);
    p.notaInspecao = this.criarTexto(cx, ESQ.nota, '', { fontStyle: 'italic', fontSize: '12px', color: '#d6c8a6', align: 'center', wordWrap: { width: PAINEL_ESQ.l - 30 }, lineSpacing: 0 }).setOrigin(0.5, 0);

    /* limbo e cemitério: cada um é uma pilha desenhada em `atualizarPilha` (desenho.js) */
    const rotuloPilha = { ...titulo, fontSize: '11px', color: '#e8d6a8', letterSpacing: 1 };
    const criarPilha = (x) => ({
      x, y: ESQ.pilhas,
      camadas: this.add.graphics().setDepth(7),
      carta: this.add.image(x, ESQ.pilhas, this.verso('mesa')).setDisplaySize(ESQ.pilha.l, ESQ.pilha.a).setDepth(8).setInteractive(),
      contador: this.criarTexto(x + ESQ.pilha.l / 2 - 2, ESQ.pilhas + ESQ.pilha.a / 2 - 2, '', {
        fontStyle: '800', fontSize: '12px', color: '#24170c', backgroundColor: '#f6dc8f', padding: { x: 5, y: 1 },
      }).setOrigin(0.5).setDepth(9),
      rotulo: this.criarTexto(x, ESQ.rotulosPilha, '', rotuloPilha).setOrigin(0.5, 0),
    });
    p.limbo = criarPilha(PAINEL_ESQ.x + 64);
    p.cemiterio = criarPilha(PAINEL_ESQ.x + PAINEL_ESQ.l - 64);
    p.limbo.carta.on('pointerover', () => this.inspecionar(this.verso('inspecao'),
      'Limbo: ' + (this.mao ? this.mao.limbo.length : 0) + ' carta(s) queimadas no início (ruído). Só voltam por transfer learning.'));
    p.cemiterio.carta.on('pointerover', () => {
      const ultima = this.mao?.cemiterio[this.mao.cemiterio.length - 1];
      this.inspecionar(ultima ? texturaDeInspecao(this, ultima, this.mao.config.baralho) : this.verso('inspecao'),
        'Cemitério: ' + (this.mao ? this.mao.cemiterio.length : 0) + ' carta(s) fora de jogo. Mostrando a do topo. Clique para ver todas.');
    });
    /* clicar numa pilha abre a lista completa (cemitério aberto, limbo só contado) */
    for (const pilha of [p.limbo, p.cemiterio]) {
      pilha.carta.input.cursor = 'pointer';
      pilha.carta.on('pointerdown', () => this.abrirCemiterio());
    }

    p.textoTerreno = this.criarTexto(cx, ESQ.terreno, '', { fontSize: '12px', align: 'center', color: '#d6c8a6', wordWrap: { width: PAINEL_ESQ.l - 30 } }).setOrigin(0.5, 0).setInteractive({ useHandCursor: true });
    p.textoTerreno.on('pointerover', () => {
      const t = TERRENOS[this.opcoes.terreno];
      this.inspecionar('terreno-' + this.opcoes.terreno, t.nome + ': ' + t.resumo);
    });
    p.dica = this.criarTexto(PAINEL_ESQ.x + 14, ESQ.dica, '', { fontSize: '13.5px', color: '#efe3c6', wordWrap: { width: PAINEL_ESQ.l - 28 }, lineSpacing: 1 });

    /* só dois botões no rodapé: REGRAS (como jogar, Biblioteca de conceitos e dicas) e MENU (som, música, sair) */
    const lb = (PAINEL_ESQ.l - 28 - 10) / 2, pedra = { tamanho: 17, variante: 'pedra' };
    p.botaoRegras = this.criarBotao(PAINEL_ESQ.x + 14 + lb / 2, ESQ.botoes, lb, ESQ.alturaBotao, 'REGRAS', () => this.abrirRegrasDaMesa(), pedra);
    p.botaoMenu = this.criarBotao(PAINEL_ESQ.x + PAINEL_ESQ.l - 14 - lb / 2, ESQ.botoes, lb, ESQ.alturaBotao, 'MENU', () => this.abrirMenuDaMesa(), pedra);

    /* balão de fala do oponente (aponta para o avatar dele no placar) */
    p.balao = this.add.container(800, 40).setDepth(30).setVisible(false);
    p.fundoBalao = this.add.graphics();
    p.textoBalao = this.add.text(0, 0, '', { fontFamily: FONTES.texto, fontStyle: 'italic', fontSize: '15px', color: '#24170c', wordWrap: { width: 230 }, align: 'center' }).setOrigin(0.5);
    p.balao.add([p.fundoBalao, p.textoBalao]);
  },

  /**
   * Placar (painel direito): título da mão e um bloco por jogador com avatar, nome, nível,
   * situação, detalhes, tentos e soma da rede. Os blocos de cima são os adversários de quem está
   * vendo; o dele fica por último. Com mais de 2 jogadores os blocos são compactos (ver
   * `blocosDoPlacar` em layout.js).
   */
  criarPlacar(p) {
    const titulo = { fontFamily: FONTES.titulo, fontStyle: '700' };
    const rx = PAINEL_DIR.x + 12, rl = PAINEL_DIR.l - 24, rc = PAINEL_DIR.x + PAINEL_DIR.l / 2;
    p.tituloMao = this.criarTexto(rc, DIR.tituloMao, '', { ...titulo, fontSize: '16px', color: '#f6dc8f', letterSpacing: 1 }).setOrigin(0.5);
    p.subtitulo = this.criarTexto(rc, DIR.subtitulo, '', { fontStyle: 'italic', fontSize: '12.5px', color: '#cdbf9e' }).setOrigin(0.5);
    const forma = blocosDoPlacar(this.numJogadores);
    if (forma.compacto) { p.blocos = forma.posicoes.map((y) => this.criarBlocoCompacto(rx, y, rl, forma.altura)); }
    else p.blocos = forma.posicoes.map((y) => {
      const b = { x: rx, y, l: rl, a: DIR.alturaBloco };
      const tx = rx + 14 + DIR.avatar + 10; /* início dos textos, depois do avatar */
      b.textoX = tx;
      b.grafico = this.add.graphics().setDepth(6);
      b.avatar = this.add.image(rx + 14 + DIR.avatar / 2, y + 44, 'avatar-p1').setDisplaySize(DIR.avatar, DIR.avatar).setDepth(7);
      b.selo = this.criarTexto(b.avatar.x, y + 86, 'NA VEZ', { ...titulo, fontSize: '10px', color: '#0d0a08', padding: { x: 6, y: 2 }, letterSpacing: 1 }).setOrigin(0.5).setDepth(8);
      b.nome = this.criarTexto(tx, y + 16, '', { ...titulo, fontSize: '15px' }).setOrigin(0, 0.5);
      b.nivel = this.criarTexto(tx, y + 34, '', { fontStyle: 'italic', fontSize: '12px', color: '#cdbf9e' }).setOrigin(0, 0.5);
      b.situacao = this.criarTexto(tx, y + 56, '', { ...titulo, fontSize: '9.5px', color: '#e0cc9a', letterSpacing: 0.8 }).setOrigin(0, 0.5);
      b.detalhe = this.criarTexto(tx, y + 72, '', { fontSize: '12px', color: '#cdbf9e' }).setOrigin(0, 0.5);
      b.tentos = this.criarTexto(tx + 12 * 9 + 4, y + 89, '', { fontSize: '11px', color: '#cdbf9e' }).setOrigin(0, 0.5);
      b.rotuloSoma = this.criarTexto(rx + rl - 12, y + 13, 'SOMA', { ...titulo, fontSize: '8.5px', color: '#9a8c6c', letterSpacing: 1 }).setOrigin(1, 0.5);
      b.soma = this.criarTexto(rx + rl - 12, y + 37, '0', { fontFamily: FONTES.titulo, fontStyle: '900', fontSize: '34px' }).setOrigin(1, 0.5);
      return b;
    });
    p.rotuloCurva = this.criarTexto(rx, DIR.rotuloCurva, 'CURVA DE TREINO', { ...titulo, fontSize: '10px', color: '#e0cc9a', letterSpacing: 1 }).setOrigin(0, 0.5);
    p.subCurva = this.criarTexto(rx + rl, DIR.rotuloCurva, 'soma da rede por turno', { fontStyle: 'italic', fontSize: '11px', color: '#9a8c6c' }).setOrigin(1, 0.5);
    p.maximoCurva = this.criarTexto(rx + 6, DIR.curva + 8, '', { fontSize: '10px', color: '#9a8c6c' }).setOrigin(0, 0.5);
    p.registro = this.criarTexto(rx, DIR.registro, '', { fontSize: '12px', color: '#dccfb2', wordWrap: { width: rl }, lineSpacing: 2 });
    /* leitura detalhada, como no NeuroDeck: clicar num bloco abre o placar por camada; clicar no
       registro abre a mão inteira */
    for (const b of p.blocos) {
      b.area = this.add.zone(b.x + b.l / 2, b.y + b.a / 2, b.l, b.a).setDepth(9).setInteractive({ useHandCursor: true });
      b.area.on('pointerdown', () => this.abrirPlacarPorCamada());
      b.area.on('pointerover', () => this.mostrarDica('Clique no placar para ver os pontos camada por camada.'));
      b.area.on('pointerout', () => this.mostrarDica(this.dicaDoCursor || this.textoComDicaDeJogo()));
    }
    p.areaRegistro = this.add.zone(rx + rl / 2, DIR.registro + DIR.alturaRegistro / 2, rl, DIR.alturaRegistro).setDepth(9).setInteractive({ useHandCursor: true });
    p.areaRegistro.on('pointerdown', () => this.abrirRegistroCompleto());
    p.rotuloRegistro = this.criarTexto(rx + rl, DIR.registro - 8, 'registro completo \u2197', { fontStyle: 'italic', fontSize: '10.5px', color: '#9a8c6c' }).setOrigin(1, 0.5);
  },

  /**
   * Bloco compacto do placar (mesas com 3 a 5 jogadores): avatar pequeno, nome, uma linha com a
   * situação e a mão, e a soma à direita. Tem os mesmos campos do bloco grande, para que
   * `atualizarBlocoDoJogador` sirva aos dois.
   */
  criarBlocoCompacto(rx, y, rl, a) {
    const titulo = { fontFamily: FONTES.titulo, fontStyle: '700' };
    const lado = Math.min(a - 10, 40);
    const b = { x: rx, y, l: rl, a, compacto: true, avatarLado: lado };
    b.textoX = rx + 12 + lado + 8;
    b.grafico = this.add.graphics().setDepth(6);
    b.avatar = this.add.image(rx + 12 + lado / 2, y + a / 2, 'avatar-p1').setDisplaySize(lado, lado).setDepth(7);
    b.selo = this.criarTexto(rx + rl - 64, y + a / 2, 'NA VEZ', { ...titulo, fontSize: '8.5px', color: '#0d0a08', padding: { x: 4, y: 1 }, letterSpacing: 1 }).setOrigin(1, 0.5).setDepth(8);
    b.nome = this.criarTexto(b.textoX, y + a * 0.3, '', { ...titulo, fontSize: '13px' }).setOrigin(0, 0.5);
    b.nivel = this.criarTexto(0, 0, '', { fontSize: '1px' }).setVisible(false);
    b.situacao = this.criarTexto(b.textoX, y + a * 0.72, '', { ...titulo, fontSize: '9px', color: '#e0cc9a', letterSpacing: 0.6 }).setOrigin(0, 0.5);
    b.detalhe = this.criarTexto(0, 0, '', { fontSize: '1px' }).setVisible(false);
    b.tentos = this.criarTexto(0, 0, '', { fontSize: '1px' }).setVisible(false);
    b.rotuloSoma = this.criarTexto(0, 0, '', { fontSize: '1px' }).setVisible(false);
    b.soma = this.criarTexto(rx + rl - 10, y + a / 2, '0', { fontFamily: FONTES.titulo, fontStyle: '900', fontSize: Math.min(26, a * 0.62) + 'px' }).setOrigin(1, 0.5);
    return b;
  },

  /**
   * Botão de truco e a barra de ações, como no NeuroDeck: selecione cartas da mão e acendem só os
   * botões das jogadas possíveis com elas; passar o cursor num botão explica o efeito no quadro de
   * instruções antes de confirmar. Os botões ficam em `p.acoes[id]`; dropout, transfer e passar
   * também em `p.botaoDropout`, `p.botaoTransfer` e `p.botaoPassar`.
   */
  criarBotoesDeAcao(p) {
    const rx = PAINEL_DIR.x + 12, rl = PAINEL_DIR.l - 24, rc = PAINEL_DIR.x + PAINEL_DIR.l / 2;
    /* TRUCO! e, ao lado, o "?" com a ajuda das ações (regra, quando acende e o conceito) */
    const lado = DIR.alturaTruco + 4, lt = rl - lado - 6;
    p.truco = this.criarBotao(rx + lt / 2, DIR.truco, lt, DIR.alturaTruco, 'TRUCO!', () => this.pedirTrucoHumano(), { variante: 'vinho', tamanho: 20, dica: 'truco' });
    p.botaoAjuda = this.criarBotao(rx + rl - lado / 2, DIR.truco, lado, DIR.alturaTruco, '?', () => this.abrirAjudaDaMesa(), {
      variante: 'pedra', tamanho: 22,
      explicar: () => 'Ajuda das ações: a regra de cada jogada, quando o botão acende e o conceito de redes neurais por trás dela.',
    });
    const espaco = 6, bl = (rl - espaco * 3) / 4, coluna = (i) => rx + bl / 2 + i * (bl + espaco);
    const acoes = {
      tunagem: () => this.executarAcao('tunagem'), overfit: () => this.executarAcao('overfit'),
      earlystop: () => this.executarAcao('earlystop'), stackoverflow: () => this.executarAcao('stackoverflow'),
      dropout: () => this.acionarDropout(), transfer: () => this.fazerTransfer(), passar: () => this.passarAVez(), limpar: () => this.cancelarSelecao(),
    };
    p.acoes = {};
    const porLinha = [0, 0];
    for (const [id, rotulo, linha] of BARRA_DE_ACOES) {
      const y = linha === 0 ? DIR.acoes : DIR.acoes2, i = porLinha[linha]++;
      p.acoes[id] = this.criarBotao(coluna(i), y, bl, DIR.alturaAcao, rotulo, acoes[id], {
        tamanho: 13, dica: ['dropout', 'transfer', 'passar'].includes(id) ? id : undefined,
        explicar: () => this.explicarAcao(id),
      });
    }
    p.botaoDropout = p.acoes.dropout;
    p.botaoTransfer = p.acoes.transfer;
    p.botaoPassar = p.acoes.passar;
  },

  /**
   * Atualiza os rótulos das chaves (som, música e dicas) nas janelas REGRAS e MENU, se abertas.
   * O botão REGRAS ganha uma estrela quando as dicas estão ligadas.
   */
  atualizarChaves() {
    this.painel.botaoRegras.definirRotulo(this.app.dicasLigadas ? 'REGRAS \u2605' : 'REGRAS');
    const rotulos = {
      som: Som.estaMudo() ? 'Som: não' : 'Som: sim',
      musica: this.app.progresso.musica ? 'Música: sim' : 'Música: não',
      dicas: this.app.dicasLigadas ? 'Desligar dicas' : 'Ativar dicas',
    };
    for (const [chave, rotulo] of Object.entries(rotulos)) {
      const botao = document.querySelector('#paineis [data-chave="' + chave + '"]');
      if (botao) botao.textContent = rotulo;
    }
  },
};
