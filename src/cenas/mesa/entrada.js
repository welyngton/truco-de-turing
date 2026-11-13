/**
 * @file Parte da CenaMesa: respostas a toques e cliques do jogador. Passar o cursor nos
 * neurônios, clicar neles, selecionar cartas da mão, dropout, transfer, passar a vez e voltar ao menu.
 *
 * Modos de seleção (`this.modo`): 'livre' (padrão), 'inicio' (escolher a carta que decide quem
 * começa), 'dropout' (escolher até onde desfazer) e 'pagarDropout' (escolher as cartas que pagam).
 */
import { rotuloCarta } from '../../nucleo/cartas.js';
import { nomeCamada } from '../../nucleo/rede.js';
import { valorParaTransfer, podePassar, camadasDesfaziveis } from '../../nucleo/partida.js';
import { NeuroDeck } from '../../motor/engine.js';
import { Som } from '../../interface/som.js';
import { confirmar, abrirPainel } from '../../interface/paineis.js';
import { abrirRegras } from '../../interface/telas/regras.js';
import { abrirGrimorio } from '../../interface/telas/grimorio.js';
import { abrirAjudaDasAcoes } from '../../interface/telas/ajudaDasAcoes.js';
import { texturaDeInspecao } from '../recursos.js';
import { registrarEvento, EVENTOS } from '../../interface/analise.js';
import { colunaX, linhaY, NOME_DA_ACAO, cartaDaMesa } from './layout.js';

/** Ação do motor do NeuroDeck correspondente a cada botão (para o texto da regra). */
const ACAO_DO_MOTOR = { tunagem: 'tune', overfit: 'overfit', earlystop: 'earlystop', stackoverflow: 'stackoverflow', dropout: 'dropout', transfer: 'transfer', passar: 'pass' };

export const metodosDeEntrada = {
  /** Aproxima a carta da mesa sob o cursor (zoom leve, por cima das vizinhas) e a devolve ao sair. */
  realcarNeuronio(id, entrando) {
    const v = this.visuais && this.visuais[id];
    if (!v || !v.imagem.visible) return;
    if (v.profundidade === undefined) v.profundidade = v.imagem.depth;
    const { l, a } = cartaDaMesa(), f = entrando ? 1.28 : 1;
    const bx = l / v.imagem.frame.width, by = a / v.imagem.frame.height;
    this.tweens.killTweensOf(v.imagem);
    v.imagem.setDepth(entrando ? 9 : v.profundidade);
    this.tweens.add({ targets: v.imagem, scaleX: bx * f, scaleY: by * f, duration: 110, ease: 'Quad.easeOut' });
  },

  /** Cursor sobre um neurônio: mostra a carta na inspeção e explica o efeito de clicar. */
  aoPassarNoNeuronio(id, entrando) {
    const mao = this.mao, n = mao.neuronios[id], baralho = mao.config.baralho;
    this.realcarNeuronio(id, entrando);
    if (!entrando) { this.dicaDoCursor = null; this.mostrarDica(this.textoComDicaDeJogo()); return; }
    if (n.removido) return;
    if (n.revelado) {
      const dono = n.dono >= 0 ? mao.jogadores[n.dono].nome : '';
      const pontuado = n.dono >= 0 ? this.pontuacoes[n.dono].neuronios.find((x) => x.neuronio.id === id) : null;
      this.inspecionar(texturaDeInspecao(this, n.cartas[0], baralho), 'Neurônio de ' + dono +
        (pontuado ? ': vale ' + pontuado.pontos + (pontuado.notas.length ? ' (' + pontuado.notas.join(', ') + ')' : '') : '') +
        (n.cartas.length > 1 ? ' · ' + n.cartas.length + ' cartas empilhadas' : ''));
    } else if (n.conhecido) {
      this.inspecionar(texturaDeInspecao(this, n.cartas[0], baralho), 'Neurônio conhecido: ' + rotuloCarta(n.cartas[0]) + '.');
    } else {
      this.inspecionar(this.verso('inspecao'), nomeCamada(n.camada, mao.camadas.length) + ': neurônio desconhecido.');
    }
    const alvo = this.alvos[id];
    if (!alvo) return;
    const vitima = n.dono >= 0 ? mao.jogadores[n.dono].nome : '';
    const carta = rotuloCarta(n.cartas[0]);
    const explicacao = {
      ativar: 'Ativar este neurônio na sua rede.',
      tunagem: 'Tunagem: empilha ' + this.selecao.length + ' carta(s) em ' + carta + ' e soma à sua rede. Em figura, a carta entra na sequência de figuras iguais.',
      overfit: 'Overfit: ' + carta + ' de ' + vitima + ' vai para o cemitério e a rede recua uma camada.',
      earlystop: alvo.proprio ? 'Early stop na própria rede: ela congela agora e ' + carta + ' some. Tem certeza?' : 'Early stop: a rede de ' + vitima + ' é finalizada agora, sem ' + carta + '.',
      stackoverflow: alvo.proprio ? 'Stack overflow na própria rede: você perde a rede e a mão. Desk rejection garantida.' : 'Stack overflow: ' + vitima + ' perde a rede aqui e todas as cartas da mão.',
      dropout: 'Dropout de ' + alvo.n + ' camada(s), custando ' + alvo.n + ' carta(s) da mão. Os neurônios desfeitos vão para o cemitério.',
    }[alvo.tipo];
    this.dicaDoCursor = explicacao;
    this.mostrarDica(explicacao);
  },

  /**
   * Botão de empilhar da barra (tunagem, overfit, early stop, stack overflow): com um alvo só,
   * joga direto; com mais de um (vários rivais), destaca só os alvos dessa ação e espera o clique.
   */
  executarAcao(tipo) {
    if (!this.ehVezDoHumano()) return;
    const alvos = this.alvosDaAcao(tipo);
    if (!alvos.length) return;
    /* um só alvo, na rede de outro (ou tunagem): executa direto; na própria rede (early stop,
       stack overflow) o jogador ainda confirma clicando no neurônio, para não perder a rede por engano */
    const unico = alvos.length === 1 ? this.alvos[alvos[0]] : null;
    if (unico && (tipo === 'tunagem' || !unico.proprio)) { this.acaoEscolhida = null; this.aoClicarNoNeuronio(alvos[0]); return; }
    this.acaoEscolhida = tipo;
    this.redesenhar();
  },

  /**
   * Botão Dropout: com cartas selecionadas, desfaz uma camada por carta e paga com elas (como no
   * NeuroDeck); sem seleção, entra no modo de escolher até onde desfazer no tabuleiro.
   */
  acionarDropout() {
    if (!this.ehVezDoHumano()) return;
    const n = this.selecao.length;
    if (n && this.modo === 'livre' && n <= camadasDesfaziveis(this.mao, this.quemVe)) {
      this.executarJogada({ tipo: 'dropout', jogador: this.quemVe, n, pagamento: this.selecao.slice() });
      return;
    }
    this.alternarDropout();
  },

  /**
   * Texto do quadro de instruções para um botão da barra: o que ele faria agora, com as cartas
   * selecionadas, ou o que falta para ele acender; depois, a regra do NeuroDeck.
   */
  explicarAcao(id) {
    const mao = this.mao;
    if (!mao) return '';
    if (id !== 'limpar') this.ultimaAcaoExplicada = id; /* o "?" abre a ajuda nesta ação */
    const eu = this.quemVe, nome = NOME_DA_ACAO[id];
    const regra = ACAO_DO_MOTOR[id] ? ' Regra: ' + NeuroDeck.action(ACAO_DO_MOTOR[id]).rule : '';
    if (!this.ehVezDoHumano()) return nome + ': espere a sua vez.' + regra;
    const qtd = this.selecao.length, valor = this.valorSelecionado();
    if (['tunagem', 'overfit', 'earlystop', 'stackoverflow'].includes(id)) {
      const alvos = this.alvosDaAcao(id);
      if (!qtd) return nome + ': selecione antes as cartas da mão que vai empilhar.' + regra;
      if (!alvos.length) return nome + ' não é possível com ' + qtd + ' carta(s) ' + valor + ' agora.' + regra;
      const descricoes = alvos.map((alvoId) => {
        const n = mao.neuronios[alvoId], carta = rotuloCarta(n.cartas[0]);
        if (id === 'tunagem') {
          const a = this.alvos[alvoId];
          return a.tipo === 'tunagem' ? 'empilha ' + qtd + ' carta(s) no seu ' + carta + ' (fica com ' + (n.cartas.length + qtd) + ')'
            : a.tipo === 'earlystop' ? 'a pilha do seu ' + carta + ' chega a 3: early stop na própria rede, que congela agora sem esse neurônio'
              : 'a pilha do seu ' + carta + ' chega a 4: stack overflow na própria rede, e você perde a rede e a mão';
        }
        const vitima = mao.jogadores[n.dono].nome;
        return { overfit: carta + ' de ' + vitima + ' vai para o cemitério e a rede recua uma camada',
          earlystop: 'a rede de ' + vitima + ' é finalizada agora, sem ' + carta,
          stackoverflow: vitima + ' perde a rede no ' + carta + ' e todas as cartas da mão' }[id];
      });
      return nome + ' com ' + qtd + ' carta(s) ' + valor + ': ' + descricoes.join('; ou ') + '.' + (alvos.length > 1 ? ' Depois de clicar, escolha o alvo no tabuleiro.' : '');
    }
    if (id === 'dropout') {
      const camadas = camadasDesfaziveis(mao, eu);
      if (this.modo === 'dropout' || this.modo === 'pagarDropout') return 'Cancelar o dropout.';
      if (qtd) return qtd <= camadas
        ? 'Dropout de ' + qtd + ' camada(s), pagando com as ' + qtd + ' carta(s) selecionada(s): os últimos neurônios ocultos da sua rede vão para o cemitério. Não gasta a vez.'
        : 'Dropout: você só tem ' + camadas + ' camada(s) oculta(s) para desfazer; selecione no máximo ' + camadas + ' carta(s).';
      return camadas ? 'Dropout: escolha no tabuleiro até onde desfazer, ou selecione antes as cartas que vão pagar (uma por camada).' + regra : 'Dropout: não há neurônio oculto na sua rede para desfazer.' + regra;
    }
    if (id === 'transfer') {
      const v = valorParaTransfer(mao, eu);
      return v ? 'Transfer learning: troca os quatro ' + v + ' da mão por quatro cartas do limbo. Uma vez por mão; não gasta a vez.' : 'Transfer learning precisa de quatro cartas iguais na mão (uma vez por mão).' + regra;
    }
    if (id === 'passar') return podePassar(mao, eu) ? 'Passar: encerra a sua vez sem jogar.' + regra : 'Passar não está disponível: você ainda tem jogada.' + regra;
    return qtd || this.modo !== 'livre' ? 'Limpar a seleção e voltar ao começo da jogada (Esc).' : 'Nada selecionado.';
  },

  /** Clique num neurônio: ativa, empilha as cartas selecionadas ou escolhe o alcance do dropout. */
  aoClicarNoNeuronio(id) {
    if (!this.ehVezDoHumano()) return;
    const alvo = this.alvos[id];
    if (!alvo) {
      const n = this.mao.neuronios[id];
      if (this.selecao.length) this.textoFlutuante(colunaX(n.camada), linhaY(n.camada, n.posicao), 'não encaixa', '#ffb3a8', 16);
      return;
    }
    this.dicaDoCursor = null;
    const eu = this.quemVe;
    if (alvo.tipo === 'ativar') return this.executarJogada({ tipo: 'ativar', jogador: eu, neuronio: id });
    if (alvo.tipo === 'dropout') {
      this.modo = 'pagarDropout';
      this.camadasDropout = alvo.n;
      this.selecao = [];
      this.redesenhar();
      return;
    }
    this.executarJogada({ tipo: 'empilhar', jogador: eu, neuronio: id, cartas: this.selecao.slice() });
  },

  /** Clique numa carta da mão: escolhe a carta de início, paga o dropout ou monta a seleção. */
  aoClicarNaCarta(idCarta) {
    const mao = this.mao, eu = this.quemVe;
    if (mao.fase === 'inicio' && this.modo === 'inicio') {
      this.modo = 'livre';
      Som.colocarCarta();
      this.executarJogada({ tipo: 'inicio', jogador: eu, carta: idCarta });
      return;
    }
    if (!this.ehVezDoHumano()) return;
    Som.selecionar();
    const i = this.selecao.indexOf(idCarta);
    if (this.modo === 'pagarDropout') {
      if (i >= 0) this.selecao.splice(i, 1);
      else if (this.selecao.length < this.camadasDropout) this.selecao.push(idCarta);
      if (this.selecao.length === this.camadasDropout) {
        this.executarJogada({ tipo: 'dropout', jogador: eu, n: this.camadasDropout, pagamento: this.selecao.slice() });
        return;
      }
      this.redesenhar();
      return;
    }
    if (this.modo === 'dropout') this.modo = 'livre';
    this.acaoEscolhida = null;
    const carta = mao.jogadores[eu].mao.find((c) => c.id === idCarta);
    if (i >= 0) this.selecao.splice(i, 1);
    else {
      /* só cartas do mesmo valor podem ser empilhadas juntas */
      const valor = this.valorSelecionado();
      if (valor && valor !== carta.valor) this.selecao = [];
      this.selecao.push(idCarta);
    }
    this.redesenhar();
  },

  /** Esc: limpa a seleção e sai do modo de dropout. */
  cancelarSelecao() {
    if (!this.selecao.length && this.modo === 'livre' && !this.acaoEscolhida) return;
    this.acaoEscolhida = null;
    this.selecao = [];
    if (this.modo !== 'inicio') this.modo = 'livre';
    this.redesenhar();
  },

  /** Botão Dropout: entra ou sai do modo de escolher o alcance. */
  alternarDropout() {
    this.modo = this.modo === 'dropout' || this.modo === 'pagarDropout' ? 'livre' : 'dropout';
    this.selecao = [];
    this.redesenhar();
  },

  /** Botão Transfer: troca as quatro cartas iguais da mão. */
  fazerTransfer() {
    const eu = this.quemVe, valor = valorParaTransfer(this.mao, eu);
    if (!valor) return;
    const cartas = this.mao.jogadores[eu].mao.filter((c) => c.valor === valor).slice(0, 4).map((c) => c.id);
    this.executarJogada({ tipo: 'transfer', jogador: eu, cartas });
  },

  /** Botão Passar a vez. */
  passarAVez() {
    if (this.ehVezDoHumano() && podePassar(this.mao, this.quemVe)) this.executarJogada({ tipo: 'passar', jogador: this.quemVe });
  },

  /** Botão Menu: confirma antes de abandonar a partida. */
  /**
   * Botão REGRAS da mesa: como jogar, Biblioteca de conceitos e a chave das dicas, numa janela só.
   */
  abrirRegrasDaMesa() {
    const dicas = this.app.dicasLigadas;
    registrarEvento(EVENTOS.mesaClique, { botao: 'regras' });
    const painel = abrirPainel(
      '<div class="folha estreita janela-da-mesa"><h2>Regras</h2>' +
      '<p>Consulte as regras, a ajuda de cada ação, os conceitos de redes neurais da Biblioteca ou ligue as dicas durante a partida.</p>' +
      '<div class="grade-de-botoes">' +
      '<button class="botao" data-opcao="regras">Como jogar</button>' +
      '<button class="botao" data-opcao="ajuda">Ajuda das ações</button>' +
      '<button class="botao" data-opcao="grimorio">Biblioteca de conceitos</button>' +
      '<button class="botao ' + (dicas ? 'discreto' : 'vinho') + '" data-opcao="dicas" data-chave="dicas">' + (dicas ? 'Desligar dicas' : 'Ativar dicas') + '</button>' +
      '<button class="botao discreto" data-fechar>Voltar ao jogo</button>' +
      '</div></div>', { fechaAoClicarFora: true });
    const acoes = {
      regras: () => abrirRegras(this.app),
      ajuda: () => this.abrirAjudaDaMesa(),
      grimorio: () => abrirGrimorio(this.app),
      dicas: () => this.alternarDicas(),
    };
    painel.elemento.querySelectorAll('[data-opcao]').forEach((b) => b.addEventListener('click', () => {
      painel.fechar();
      registrarEvento(EVENTOS.mesaClique, { botao: 'regras_' + b.dataset.opcao });
      acoes[b.dataset.opcao]();
    }));
    return painel;
  },

  /** Botão "?" da mesa: ajuda das ações, aberta na última ação explicada no quadro. */
  abrirAjudaDaMesa() {
    return abrirAjudaDasAcoes(this.app, this.ultimaAcaoExplicada);
  },

  /**
   * Botão MENU da mesa: som e música (a janela fica aberta para ligar e desligar), voltar ao jogo
   * ou abandonar a partida.
   */
  abrirMenuDaMesa() {
    registrarEvento(EVENTOS.mesaClique, { botao: 'menu' });
    const painel = abrirPainel(
      '<div class="folha estreita janela-da-mesa"><h2>Menu</h2>' +
      '<div class="grade-de-botoes">' +
      '<button class="botao" data-chave="som"></button>' +
      '<button class="botao" data-chave="musica"></button>' +
      '<button class="botao discreto" data-fechar>Voltar ao jogo</button>' +
      '<button class="botao vinho" data-opcao="sair">Sair da partida</button>' +
      '</div></div>', { fechaAoClicarFora: true });
    const q = (seletor) => painel.elemento.querySelector(seletor);
    q('[data-chave="som"]').addEventListener('click', () => { this.app.alternarSom(); this.atualizarChaves(); });
    q('[data-chave="musica"]').addEventListener('click', () => { this.app.alternarMusica(this.opcoes.terreno); this.atualizarChaves(); });
    q('[data-opcao="sair"]').addEventListener('click', () => { painel.fechar(); this.perguntarSeVoltaAoMenu(); });
    this.atualizarChaves();
    return painel;
  },

  /** Estatísticas de uso: saiu da partida antes do fim (`jogo_abandonado`). */
  registrarAbandono() {
    const config = this.mao ? this.mao.config : {}, eu = this.online ? this.cadeiraOnline() : 0;
    registrarEvento(EVENTOS.jogoAbandonado, {
      baralho: config.baralho, terreno: config.terreno, oponente: this.opcoes ? this.opcoes.oponente : '',
      maos: this.partida ? this.partida.numeroMao + 1 : 0, tentos: this.partida ? this.partida.tentos[eu] || 0 : 0,
      online: this.online ? 1 : 0,
    });
  },

  perguntarSeVoltaAoMenu() {
    confirmar('Abandonar a partida?', 'O placar de tentos desta partida será perdido. Conquistas já desbloqueadas ficam salvas.', [
      { rotulo: 'Continuar jogando', classe: 'discreto' },
      { rotulo: 'Voltar ao menu', classe: 'vinho', acao: () => { this.registrarAbandono(); this.app.irParaMenu(); } },
    ]);
  },
};
