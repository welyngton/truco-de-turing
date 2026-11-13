/**
 * @file Tela "Sobre": versão, o jogo unificado (NeuroDeck + Truco de Turing), a disciplina, as regras
 * originais, o professor, os autores, as estatísticas de uso (ligar e desligar) e a licença.
 */
import { abrirPainel } from '../paineis.js';
import { VERSAO, DATA_DA_VERSAO } from '../../versao.js';
import { podeMedir, consentimento, definirConsentimento, TEXTO_DAS_ESTATISTICAS } from '../analise.js';

/** Situação das estatísticas de uso neste aparelho, em texto. */
function situacaoDasEstatisticas() {
  if (!podeMedir()) return 'Nesta cópia do jogo (fora do site publicado) nada é medido.';
  const escolha = consentimento();
  return escolha === 'sim' ? 'Neste aparelho: ligadas.' : escolha === 'nao' ? 'Neste aparelho: desligadas.' : 'Neste aparelho: ainda sem escolha.';
}

/** Abre a tela "Sobre". */
export function abrirSobre() {
  const html = '<div class="folha sobre"><button class="fechar-x" data-fechar aria-label="Fechar">\u00d7</button>' +
      '<h2>Sobre o jogo</h2>' +
      '<p class="versao">Versão ' + VERSAO + ' \u00b7 ' + DATA_DA_VERSAO.split('-').reverse().join('/') +
      ' \u00b7 <a href="https://github.com/welyngton/truco-de-turing/blob/main/CHANGELOG.md" target="_blank" rel="noopener">histórico de versões</a></p>' +
      '<p>Um jogo de cartas para navegador que ensina redes neurais jogando. Cada carta é um neurônio, cada mão é uma rede construída da entrada à saída, e cada ação com as cartas (tunagem, overfit, dropout, early stop, transfer learning) é um conceito do treino de modelos. Entre dois jogadores, o truco fica por cima de tudo: tentos, pedidos de TRUCO, SEIS, NOVE e DOZE, e blefe.</p>' +
      '<h3>Dois jogos que viraram um</h3>' +
      '<p>A turma fez dois jogos para o mesmo tema, e o professor decidiu juntar o melhor de cada um:</p>' +
      '<ul>' +
      '<li><b>NeuroDeck</b> (<a href="https://neurodeck-fpo.web.app/" target="_blank" rel="noopener">neurodeck-fpo.web.app</a>): as <b>regras</b>. O motor do NeuroDeck decide tudo o que acontece na mesa: jogadas, pontuação, terrenos, desempates, as arquiteturas de rede, de 2 a 5 jogadores, os oponentes do computador e a API de mods.</li>' +
      '<li><b>Truco de Turing</b>: a <b>interface</b>. Arte das cartas, menu, mesa, efeitos, sons, música, avatares, conquistas, a Biblioteca de conceitos e o modo truco.</li>' +
      '</ul>' +
      '<p>O motor do NeuroDeck foi copiado para o projeto sem alterações e conferido contra o site publicado em 1.000 partidas; depois recebeu as decisões de regra do professor e do grupo, registradas no repositório.</p>' +
      '<h3>A disciplina</h3>' +
      '<p>Trabalho do tema 4 da disciplina Fundamentos em Pesquisa Operacional (FPO), semestre 2026/2, no Programa de Pós-Graduação em Computação Aplicada (PPCA) da Universidade de Brasília, com o prof. Peng Yaohao. O tema pede um jogo indie para ensinar conceitos de machine learning e redes neurais, a partir de uma premissa: um jogo educativo precisa, antes de tudo, ser um jogo divertido. Se o jogo for divertido e o docente tiver competência suficiente, ele pode se tornar educativo.</p>' +
      '<h3>As regras originais</h3>' +
      '<ul>' +
      '<li>Mesa com um baralho de 52 cartas: 3 neurônios na entrada, 5 camadas ocultas de 5 neurônios e 4 na saída. Cada jogador recebe 5 cartas; as 10 restantes vão para o limbo, como ruído.</li>' +
      '<li>Os jogadores se alternam ativando neurônios para ligar a entrada à saída. Vence a rede de maior soma: 2 a 10 pelo valor, Ás 11, figuras 0, com figuras iguais vizinhas valendo 10 cada (par 20, trio 30) e quadras zerando a rede (vanishing gradient).</li>' +
      '<li>Ações com a mão: tunagem, overfit, early stop, stack overflow, dropout (o GatoNet) e transfer learning. Entrada e saída são imunes.</li>' +
      '<li>Desempates em cascata e três formas de decidir quem começa.</li>' +
      '<li>Extensões propostas: baralhos com efeitos (truco, fraternidade, yin-yang, Power BI), terrenos (montanha, pântano, oceano), coringas e conquistas em graduações de bronze a antimatéria.</li>' +
      '<li>Inspirações citadas: TensorFlow Playground, Balatro, Magic: The Gathering e Geometry Dash.</li>' +
      '</ul>' +
      '<h3>O professor</h3>' +
      '<p><b>Peng Yaohao</b> é professor da Universidade de Brasília, mestre e doutor pela UnB na área de Finanças e Métodos Quantitativos. Pesquisa aprendizado de máquina, modelos não lineares e econometria financeira, com trabalhos sobre previsão de volatilidade e de preços de ações e um estudo empírico sobre não linearidade e overfitting em machine learning com dados da COVID-19.</p>' +
      '<h3>Autores</h3>' +
      '<ul class="autores">' +
      '<li><b>Francisco Lima</b>: NeuroDeck (regras, motor, oponentes e mods).</li>' +
      '<li><b>Welyngton José Vinicius Dal Prá</b>: Truco de Turing (interface, arte, sons, conquistas e modo truco).</li>' +
      '<li><b>Diego Casagrande</b>: testes, validação das regras e fusão dos dois jogos.</li>' +
      '<li><b>Vinícius Chiconato</b>: correções da fusão.</li>' +
      '<li><b>Suzy Arcanjo</b>: verbetes das ações na Biblioteca de conceitos.</li>' +
      '</ul>' +
      '<p class="contribuicoes">Contribuições são bem-vindas: o código está aberto no repositório.</p>' +
      '<h3>Estatísticas de uso</h3>' +
      '<p>' + TEXTO_DAS_ESTATISTICAS + '</p>' +
      '<p class="estatisticas-situacao" id="s-estatisticas">' + situacaoDasEstatisticas() + '</p>' +
      (podeMedir() ? '<div class="linha"><button class="botao pequeno" id="s-estatisticas-sim">Ligar</button><button class="botao pequeno discreto" id="s-estatisticas-nao">Desligar</button></div>' : '') +
      '<h3>Créditos e licença</h3>' +
      '<p>Código aberto sob a licença <a href="https://github.com/welyngton/truco-de-turing#GPL-3.0-1-ov-file" target="_blank" rel="noopener">GPL-3.0</a>, no repositório <a href="https://github.com/welyngton/truco-de-turing" target="_blank" rel="noopener">github.com/welyngton/truco-de-turing</a>. O motor de regras é o do NeuroDeck, incluído com a concordância do grupo (ver <code>src/motor/ORIGEM.md</code>). Feito com Phaser 3; toda a arte das cartas é gerada por código; fontes Cinzel e Spectral.</p>' +
      '<div class="linha fim" style="margin-top:14px"><button class="botao" data-fechar>Fechar</button></div></div>';
  const painel = abrirPainel(html, { fechaAoClicarFora: true });
  for (const escolha of ['sim', 'nao']) {
    const botao = painel.elemento.querySelector('#s-estatisticas-' + escolha);
    if (botao) botao.addEventListener('click', () => {
      definirConsentimento(escolha);
      painel.elemento.querySelector('#s-estatisticas').textContent = situacaoDasEstatisticas();
    });
  }
  return painel;
}
