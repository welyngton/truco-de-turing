/**
 * @file Parte da CenaMesa: o truco. Pedir, anunciar com grito na tela, perguntar a resposta
 * (ao humano numa caixa, ao oponente pelo seu perfil) e aplicar aceitar, correr ou aumentar.
 */
import { podeTrucar, pedirTruco, responderTruco, proximoValor, GRITO_TRUCO } from '../../nucleo/truco.js';
import { registrarEvento } from '../../interface/analise.js';
import { responderAoTruco } from '../../nucleo/oponentes/index.js';
import { provocar } from '../../conteudo/textos.js';
import { confirmar, escaparHtml } from '../../interface/paineis.js';
import { COR_JOGADOR_CSS } from './layout.js';

export const metodosDoTruco = {
  /** Botão TRUCO! do jogador humano. */
  pedirTrucoHumano() {
    if (!this.ehVezDoHumano() || !podeTrucar(this.partida, this.quemVe)) return;
    this.anunciarTruco(this.quemVe);
  },

  /** Registra o pedido de `j`, grita na tela e pergunta a resposta ao outro jogador. */
  anunciarTruco(j, daRede = false) {
    if (this.online && !daRede) return this.enviarOnline({ tipo: 'truco', cadeira: j });
    pedirTruco(this.partida, j);
    registrarEvento('truco', { valor: this.partida.pedido.para, quem: this.mao.jogadores[j].tipo });
    this.impactoDoTruco(this.partida.pedido.para);
    this.avisarVerbete('truco');
    this.faixa(GRITO_TRUCO[this.partida.pedido.para], COR_JOGADOR_CSS[j], 72);
    if (this.mao.jogadores[j].tipo === 'oponente') this.falar(provocar('truco'), j);
    this.anotarNaLinhaDoTempo(null, [{ tipo: 'truco', jogador: j }], this.mao.jogadores[j].nome + ' pediu ' + GRITO_TRUCO[this.partida.pedido.para].replace('!', '') + '.');
    this.ocupada = true;
    this.redesenhar();
    this.time.delayedCall(900, () => this.pedirResposta());
  },

  /** Pergunta a resposta a quem recebeu o pedido. */
  pedirResposta() {
    const partida = this.partida, pedido = partida.pedido;
    const quem = 1 - pedido.por;
    const jogador = this.mao.jogadores[quem];
    const podeAumentar = proximoValor(pedido.para) != null;
    /* online: só quem recebeu o pedido responde na própria tela; pelo computador, só o anfitrião */
    if (this.online && (jogador.tipo === 'oponente' ? !this.souAnfitriaoOnline() : quem !== this.cadeiraOnline())) return this.esperarRede();
    if (jogador.tipo === 'oponente') {
      const resposta = responderAoTruco(this.mao, quem, jogador.oponente, pedido.para, podeAumentar);
      this.falar(provocar(resposta), quem);
      return this.aplicarResposta(quem, resposta);
    }
    /* várias pessoas no aparelho: quem responde pega o aparelho antes, sem ver a mão de quem pediu */
    if (this.variosHumanos && this.quemVe !== quem) return this.passarAparelho(quem, () => this.pedirResposta());
    const quemPediu = this.mao.jogadores[pedido.por].nome;
    const botoes = [
      /* quem corre entrega o valor atual da mão */
      { rotulo: 'Correr (Perde ' + partida.valor + ')', classe: 'discreto', acao: () => this.aplicarResposta(quem, 'correr') },
      { rotulo: 'Desce! (vale ' + pedido.para + ')', classe: 'vinho', acao: () => this.aplicarResposta(quem, 'aceitar') },
    ];
    if (podeAumentar) botoes.push({ rotulo: 'Pedir ' + GRITO_TRUCO[proximoValor(pedido.para)], acao: () => this.aplicarResposta(quem, 'aumentar') });
    confirmar(GRITO_TRUCO[pedido.para],
      escaparHtml((this.variosHumanos ? jogador.nome + ', responda. ' : '') + 'Se aceitar, a mão vale ' + pedido.para + ' tentos. Se correr, ' + quemPediu + ' leva ' + partida.valor + ' agora.') +
        this.dicaDaRespostaAoTruco(quem),
      botoes, { grito: true, topo: '<div class="quem">' + escaparHtml(quemPediu) + ' pediu</div>' });
  },

  /**
   * Aplica a resposta de `quem`.
   * @param {'aceitar'|'correr'|'aumentar'} resposta
   */
  aplicarResposta(quem, resposta, daRede = false) {
    if (this.online && !daRede) return this.enviarOnline({ tipo: 'resposta', cadeira: quem, resposta });
    const resultado = responderTruco(this.partida, quem, resposta);
    const nome = this.mao.jogadores[quem].nome;
    const texto = { correr: nome + ' correu do truco.', aceitar: nome + ' aceitou: a mão vale ' + this.partida.valor + '.', aumentar: nome + ' pediu mais.' }[resposta];
    this.anotarNaLinhaDoTempo(null, [{ tipo: 'truco', jogador: quem }], texto);
    if (resposta === 'correr') {
      this.faixa(this.mao.jogadores[quem].nome + ' correu!', '#efe3c6', 40);
      if (this.mao.jogadores[quem].tipo === 'oponente') this.oponenteCorreu = true;
      this.time.delayedCall(900, () => this.encerrarMao(resultado));
      return;
    }
    if (resposta === 'aumentar') {
      this.impactoDoTruco(this.partida.pedido.para);
      this.faixa(GRITO_TRUCO[this.partida.pedido.para], COR_JOGADOR_CSS[quem], 72);
      this.redesenhar();
      this.time.delayedCall(900, () => this.pedirResposta());
      return;
    }
    this.textoFlutuante(610, 300, 'Aceito: mão vale ' + this.partida.valor, '#f6dc8f', 26);
    this.redesenhar();
    this.time.delayedCall(600, () => { this.ocupada = false; this.avancar(); });
  },
};
