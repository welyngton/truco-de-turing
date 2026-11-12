/**
 * @file Cena da mesa: onde a partida acontece.
 *
 * A classe é pequena de propósito. Os métodos ficam em arquivos separados por assunto e são
 * copiados para o protótipo no fim deste arquivo:
 *
 * | Arquivo       | Assunto                                                            |
 * |---------------|--------------------------------------------------------------------|
 * | cenario.js    | molduras fixas, botões e criação dos textos dos painéis            |
 * | desenho.js    | desenhar o estado: neurônios, mãos, placar, curva, dica, alvos      |
 * | entrada.js    | cliques e toques do jogador                                        |
 * | turnos.js     | fluxo da mão: iniciar, executar jogada, vez de cada jogador         |
 * | truco.js      | pedir, anunciar e responder truco                                  |
 * | efeitos.js    | animações dos eventos, faíscas, faixas, balão e avisos da Biblioteca de conceitos  |
 * | ambiente.js   | ambiente animado do terreno (neve, neblina, vaga-lumes, ondas, vento)  |
 * | paineis.js    | painéis de leitura: placar por camada, registro completo, cemitério  |
 * | online.js     | partida online: ações pela sala, fila, vez dos outros aparelhos      |
 * | resultado.js  | fim da mão, tentos, conquistas, comemoração e tela de resultado     |
 * | dicas.js      | modo dicas: sugestão de jogada e dicas flutuantes dos botões        |
 *
 * Estado principal da cena:
 * - `this.partida`: placar de tentos e truco (nucleo/truco.js);
 * - `this.mao`: estado da mão atual (nucleo/partida.js);
 * - `this.quemVe`: índice do jogador que está olhando a tela (-1 enquanto o aparelho troca de mãos);
 * - `this.numJogadores`, `this.humanos`, `this.variosHumanos`: quem está na mesa (os humanos são os
 *   primeiros índices; os demais são oponentes do computador);
 * - `this.modo`, `this.selecao`, `this.alvos`: o que o jogador está escolhendo;
 * - `this.ocupada`: verdadeiro durante animações e a vez do oponente (bloqueia cliques);
 * - `this.encerrada`: a mão acabou.
 */
import { Aplicacao, normalizarOpcoes } from '../../aplicacao.js';
import { novaPartida } from '../../nucleo/truco.js';
import { tamanhosDaMesa } from '../../nucleo/rede.js';
import { definirMesa } from './layout.js';
import { abrirRegras } from '../../interface/telas/regras.js';
import { ajustarCamera, colocarFundo, carregarIconesDasAcoes } from '../recursos.js';
import { metodosDoCenario } from './cenario.js';
import { metodosDeDesenho } from './desenho.js';
import { metodosDeEntrada } from './entrada.js';
import { metodosDeTurnos } from './turnos.js';
import { metodosDoTruco } from './truco.js';
import { metodosDeEfeitos } from './efeitos.js';
import { metodosDoResultado } from './resultado.js';
import { metodosDeDicas } from './dicas.js';
import { metodosDosPaineis } from './paineis.js';
import { metodosDoAmbiente } from './ambiente.js';
import { metodosOnline } from './online.js';
import { Musica } from '../../interface/musica.js';
import { esconderDicaFlutuante } from '../../interface/paineis.js';

export class CenaMesa extends Phaser.Scene {
  constructor() { super('Mesa'); }

  /** Monta a mesa e começa a primeira mão (depois das regras, na primeira visita). */
  create() {
    this.app = Aplicacao;
    this.prepararOnline();
    /* online: as opções são as da sala, iguais em todos os aparelhos; cada um vê só a própria mão */
    this.opcoes = normalizarOpcoes(this.online ? this.online.sala.config.opcoes : this.app.opcoes);
    this.numJogadores = this.opcoes.jogadores;
    this.humanos = this.online ? 1 : this.opcoes.humanos;
    this.variosHumanos = !this.online && this.humanos > 1;
    /* a geometria da mesa vale para a partida inteira: arquitetura e número de jogadores não mudam */
    definirMesa(tamanhosDaMesa(this.opcoes.arquitetura, this.numJogadores));
    this.partida = novaPartida(this.opcoes.alvo, this.numJogadores);
    this.mao = null;

    ajustarCamera(this);
    colocarFundo(this, this.opcoes.terreno);
    carregarIconesDasAcoes(this);
    this.criarAmbiente(this.opcoes.terreno);
    this.desenharCenarioFixo();
    /* camadas de desenho, da mais funda para a mais alta */
    this.camadaVazios = this.add.graphics().setDepth(1);
    this.camadaConexoes = this.add.graphics().setDepth(2);
    this.camadaDestaques = this.add.graphics().setDepth(5);
    this.camadaCurva = this.add.graphics().setDepth(6);
    this.camadaVez = this.add.graphics().setDepth(6);
    this.camadaSelecao = this.add.graphics().setDepth(11);
    this.criarPaineis();

    this.input.keyboard?.on('keydown-ESC', () => this.cancelarSelecao());
    this.events.once('shutdown', () => { this.encerrada = true; esconderDicaFlutuante(); Musica.parar(); });
    this.historicoDaPartida = [];
    if (this.app.progresso.musica) Musica.tocar(this.opcoes.terreno);
    const comecar = () => this.iniciarMao();
    if (!this.app.progresso.tutorialVisto) abrirRegras(this.app, comecar);
    else comecar();
  }

  /** A cada quadro: conexões animadas, contornos pulsantes e o destaque de quem está na vez. */
  update(tempo) {
    this.atualizarAmbiente(tempo);
    if (!this.mao) return;
    this.desenharConexoesEAlvos(tempo);
    this.desenharDestaqueDaVez(tempo);
  }
}

Object.assign(CenaMesa.prototype,
  metodosDoCenario, metodosDeDesenho, metodosDeEntrada, metodosDeTurnos,
  metodosDoTruco, metodosDeEfeitos, metodosDoResultado, metodosDeDicas, metodosDosPaineis, metodosDoAmbiente, metodosOnline);
