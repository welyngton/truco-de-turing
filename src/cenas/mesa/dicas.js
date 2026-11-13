/**
 * @file Parte da CenaMesa: o modo "dicas".
 *
 * Com as dicas ligadas, o jogador recebe:
 * - a cada vez, uma **dica de jogo** (conteudo/dicasDeJogo.js) no estilo do Glossário: uma
 *   oportunidade, um risco ou uma estratégia geral, sempre com o conceito de redes neurais por trás.
 *   As dicas usam só informação pública e nunca apontam qual neurônio oculto ativar;
 * - **dicas flutuantes** nos botões de ação (Dropout, Transfer, Passar e TRUCO): ao passar o mouse
 *   ou, no celular, ao segurar o botão. Explicam a ação, o que vale fazer agora (no truco, a chance
 *   estimada por simulação) e o conceito do Glossário;
 * - a chance estimada de vitória também na caixa de resposta ao truco.
 *
 * Em troca, a mão jogada com dicas (ligadas em algum momento) não vale conquistas nem conta nas
 * estatísticas. O aviso aparece ao ligar.
 */
import { camadasDesfaziveis, valorParaTransfer, podePassar, alvosDeAtivacao } from '../../nucleo/partida.js';
import { podeTrucar, proximoValor, GRITO_TRUCO, ehMaoDeOnze } from '../../nucleo/truco.js';
import { chanceDeVitoria } from '../../nucleo/oponentes/index.js';
import { VERBETES } from '../../conteudo/grimorio.js';
import { escolherDicaDeJogo } from '../../conteudo/dicasDeJogo.js';
import {
  confirmar, mostrarAviso, mostrarDicaDeJogo, mostrarDicaFlutuante, esconderDicaFlutuante, escaparHtml,
} from '../../interface/paineis.js';
import { retanguloNaTela } from '../recursos.js';

/** Simulações usadas para estimar a chance de vitória mostrada nas dicas. */
const SIMULACOES_DA_DICA = 40;
/** Quantas dicas recentes evitar repetir. */
const MEMORIA_DE_DICAS = 6;

/** Primeira frase do conceito de um verbete (para a linha "conceito" das dicas). */
function conceitoCurto(id) {
  const verbete = VERBETES.find((v) => v.id === id);
  return verbete ? (verbete.conceito.match(/^[^.]*\./) || [verbete.conceito])[0] : '';
}

export const metodosDeDicas = {
  /** Botão "Ativar dicas": avisa sobre as conquistas antes de ligar; desliga direto. */
  alternarDicas() {
    if (this.app.dicasLigadas) {
      this.app.dicasLigadas = false;
      this.dicaAtual = null;
      esconderDicaFlutuante();
      this.atualizarChaves();
      if (this.mao) this.redesenhar();
      return;
    }
    confirmar('Ativar dicas?',
      'Com as dicas ligadas, a cada vez sua aparece uma <b>dica de jogo</b> (estratégia, oportunidades e riscos) junto com o ' +
      '<b>conceito de redes neurais</b> por trás, e os botões de ação ganham explicações (passe o mouse ou, no celular, segure o botão). ' +
      'As dicas usam só o que está à vista: nunca dizem qual carta virada escolher.<br><br>' +
      '<b>Atenção:</b> as mãos jogadas com dicas <b>não valem conquistas</b> nem contam nas estatísticas. ' +
      'A mão atual já fica marcada, mesmo que você desligue as dicas depois.',
      [
        { rotulo: 'Agora não', classe: 'discreto' },
        { rotulo: 'Ativar dicas', classe: 'vinho', acao: () => {
          this.app.dicasLigadas = true;
          this.dicasNaMao = true;
          this.atualizarChaves();
          if (this.mao) { this.darDicaDoTurno(); this.redesenhar(); }
          else mostrarAviso('Dicas ligadas', 'Esta mão não vale conquistas.', null, 4000);
        } },
      ]);
  },

  /* ------------------------------------------------------------------ dica de jogo */

  /** Mostra a dica de jogo da vez do humano (só com as dicas ligadas e só se mudou). */
  darDicaDoTurno() {
    if (!this.app.dicasLigadas || !this.mao || !this.ehVezDoHumano()) return;
    this.dicasRecentes = this.dicasRecentes || [];
    const dica = escolherDicaDeJogo(this.mao, this.quemVe, this.partida, this.dicasRecentes);
    if (this.dicaAtual && this.dicaAtual.id === dica.id) return;
    this.dicaAtual = dica;
    this.dicasRecentes = [dica.id, ...this.dicasRecentes].slice(0, MEMORIA_DE_DICAS);
    const verbete = VERBETES.find((v) => v.id === dica.verbete);
    mostrarDicaDeJogo(dica.titulo, dica.texto, verbete ? verbete.titulo : '', conceitoCurto(dica.verbete));
  },

  /** Linha curta da dica atual, para o rodapé do painel esquerdo. */
  textoDaDicaDeJogo() {
    if (!this.dicaAtual || !this.app.dicasLigadas || !this.ehVezDoHumano()) return '';
    return '\u2605 Dica: ' + this.dicaAtual.titulo;
  },

  /* ------------------------------------------------------------------ dicas flutuantes */

  /** Mostra a dica do botão `chave` ao lado do retângulo (x, y, l, a) do mundo do jogo. */
  mostrarDicaDoBotao(chave, x, y, l, a) {
    if (!this.mao) return;
    const { titulo, corpo, agora, conceito } = this.conteudoDaDica(chave);
    const html = escaparHtml(corpo) +
      (agora ? '<span class="agora">' + escaparHtml(agora) + '</span>' : '') +
      (conceito ? '<span class="conceito">' + escaparHtml(conceito) + '</span>' : '');
    mostrarDicaFlutuante(titulo, html, retanguloNaTela(this, x, y, l, a));
  },

  /** Esconde a dica flutuante. */
  esconderDicaDoBotao() { esconderDicaFlutuante(); },

  /**
   * Texto da dica de cada botão: o que faz, o que vale fazer agora e o conceito de ML.
   * @param {'dropout'|'transfer'|'passar'|'truco'} chave
   */
  conteudoDaDica(chave) {
    const mao = this.mao, eu = this.quemVe >= 0 ? this.quemVe : 0, jogador = mao.jogadores[eu];
    const minhaVez = this.ehVezDoHumano();
    const naoEhAVez = 'Agora: espere a sua vez.';
    if (chave === 'dropout') {
      const n = camadasDesfaziveis(mao, eu);
      return {
        titulo: 'Glossário · Dropout (GatoNet)',
        corpo: 'Desfaz os últimos neurônios ocultos da sua rede, até a camada que você escolher. Eles vão para o cemitério e você continua da camada anterior. Custa 1 carta da mão por camada e não gasta o turno.',
        agora: !minhaVez ? naoEhAVez : n === 0 ? 'Agora: indisponível, não há neurônio oculto para desfazer.'
          : 'Agora: dá para desfazer até ' + Math.min(n, jogador.mao.length) + ' camada(s). Vale a pena quando a rede pegou neurônios fracos ou está perto de formar uma quadra de figuras. Cuidado: se não sobrar neurônio livre na camada, a rede é finalizada.',
        conceito: conceitoCurto('dropout'),
      };
    }
    if (chave === 'transfer') {
      const valor = valorParaTransfer(mao, eu);
      const conta = {};
      for (const c of jogador.mao) conta[c.valor] = (conta[c.valor] || 0) + 1;
      const maior = Object.entries(conta).sort((a, b) => b[1] - a[1])[0];
      return {
        titulo: 'Glossário · Transfer learning',
        corpo: 'Troca quatro cartas de mesmo valor da mão por cartas do limbo. Uma vez por mão; não gasta o turno.',
        agora: jogador.transferUsado ? 'Agora: você já usou o transfer nesta mão.'
          : valor ? 'Agora: você tem quatro ' + valor + '. Troque se eles não servem para tunar nem atacar.'
            : 'Agora: precisa de quatro cartas iguais; seu maior grupo é ' + (maior ? maior[1] + '× ' + maior[0] : 'nenhum') + '.',
        conceito: conceitoCurto('transfer'),
      };
    }
    if (chave === 'passar') {
      const livres = alvosDeAtivacao(mao, eu).length;
      return {
        titulo: 'Passar a vez',
        corpo: 'Só passa a vez quem teve a rede interrompida por early stop e ainda tem cartas na mão: atacar não é obrigatório. Fora isso, só quando não há nenhuma outra jogada. Quem não pode jogar é pulado automaticamente.',
        agora: !minhaVez ? naoEhAVez : podePassar(mao, eu) ? 'Agora: pode passar. Antes, veja se algum ataque com as cartas da mão ainda vale a pena.'
          : livres ? 'Agora: ainda há ' + livres + ' neurônio(s) livre(s) para ativar, então não dá para passar.'
            : 'Agora: sua rede não foi interrompida por early stop e você tem uma jogada possível, então não dá para passar.',
        conceito: conceitoCurto('camadas'),
      };
    }
    /* truco */
    const partida = this.partida, proximo = proximoValor(partida.valor);
    let agora;
    if (partida.alvo <= 1) agora = 'Agora: partida de mão única, sem truco.';
    else if (ehMaoDeOnze(partida)) agora = 'Agora: mão de onze, ninguém pode trucar.';
    else if (!minhaVez || !podeTrucar(partida, eu)) agora = 'Agora: indisponível (não é sua vez ou você foi o último a aumentar).';
    else {
      const chance = Math.round(chanceDeVitoria(mao, eu, SIMULACOES_DA_DICA) * 100);
      agora = 'Agora: sua chance estimada de vencer esta mão é ' + chance + '% (' + SIMULACOES_DA_DICA + ' simulações de Monte Carlo). ' +
        (chance >= 65 ? 'Bom momento para pedir ' + GRITO_TRUCO[proximo] : chance >= 40 ? 'Arriscado: só como blefe.' : 'Melhor não trucar agora.');
    }
    return {
      titulo: 'Glossário · Truco',
      corpo: 'Aumenta o valor da mão: 1 → 3 → 6 → 9 → 12 tentos. Quem recebe o pedido aceita, corre (e entrega o valor atual) ou pede mais.',
      agora,
      conceito: conceitoCurto('truco'),
    };
  },

  /** Linha com a chance estimada, para a caixa de resposta ao truco (só com dicas ligadas). */
  dicaDaRespostaAoTruco(quem) {
    if (!this.app.dicasLigadas || this.mao.jogadores[quem].tipo !== 'humano') return '';
    const chance = Math.round(chanceDeVitoria(this.mao, quem, SIMULACOES_DA_DICA) * 100);
    const conselho = chance >= 70 ? 'dá para aceitar e até pedir mais.' : chance >= 35 ? 'aceitar é razoável.' : 'correr limita o prejuízo.';
    return '<br><br><b>Dica:</b> sua chance estimada de vencer esta mão é ' + chance + '% (' + SIMULACOES_DA_DICA + ' simulações); ' + conselho;
  },
};
