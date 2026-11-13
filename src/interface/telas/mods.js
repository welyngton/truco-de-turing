/**
 * @file Tela "Mods": como criar baralhos, terrenos e ações para o motor do NeuroDeck, com um mod
 * de exemplo comentado (conteudo/modExemplo.js) e links para os arquivos e exemplos no repositório
 * do jogo no GitHub.
 *
 * A API é a do registro do motor (src/motor/engine/registry.js, apiVersion 2). A tela é honesta
 * sobre o estado atual: o motor aceita mods, mas a interface do jogo unificado ainda não os carrega.
 */
import { abrirPainel, escaparHtml } from '../paineis.js';
import { CODIGO_DO_MOD_DE_EXEMPLO } from '../../conteudo/modExemplo.js';

/** Endereço dos arquivos no repositório do jogo no GitHub (ramo main). */
export const REPOSITORIO = 'https://github.com/welyngton/truco-de-turing/blob/main/';

/** Link para um arquivo do repositório, com o caminho como texto. */
const linkDoArquivo = (caminho) => '<a href="' + REPOSITORIO + caminho + '" target="_blank" rel="noopener"><code>' + escaparHtml(caminho) + '</code></a>';

/**
 * Arquivos do repositório que servem de referência e de exemplo para quem vai escrever um mod.
 * O teste de `testes/unidade/interface.test.js` confere que cada um existe.
 */
export const ARQUIVOS_DE_MODS = [
  { caminho: 'src/conteudo/modExemplo.js', texto: 'o mod de exemplo desta tela (terreno "Regularização L1"), pronto para copiar.' },
  { caminho: 'testes/unidade/mods.test.js', texto: 'carrega o exemplo como um mod de verdade e joga partidas com ele no Node: um bom modelo para testar o seu.' },
  { caminho: 'src/motor/engine/registry.js', texto: 'a API de mods: registerDeck, registerTerrain, registerAction, apiVersion e os campos de cada tipo.' },
  { caminho: 'src/motor/engine/index.js', texto: 'registra os baralhos, terrenos e ações nativos e carrega mods externos (loadMod).' },
  { caminho: 'src/motor/engine/decks.js', texto: 'os 7 baralhos do jogo, cada um registrado como mod (Clássico, Truco, Nobreza, Backprop…).' },
  { caminho: 'src/motor/engine/terrains.js', texto: 'os terrenos Montanha, Pântano e Oceano, com os ganchos do turno.' },
  { caminho: 'src/motor/engine/actions.js', texto: 'as ações (tunagem, overfit, early stop, dropout, transfer learning…) com generate, isValid e execute.' },
  { caminho: 'src/motor/ORIGEM.md', texto: 'de onde veio o motor do NeuroDeck e o que mudou na fusão.' },
];

/** Campos de cada tipo de mod, resumidos do registro do motor. */
const TIPOS = [
  {
    nome: 'Baralho', funcao: 'registerDeck', obrigatorios: 'id, name, score', exemplos: 'src/motor/engine/decks.js',
    texto: 'Define como a rede é pontuada. Pode montar as próprias cartas (build), mudar o valor de cada carta na mesa (cardValue) e das cartas empilhadas (stackValue), e reagir depois de cada ação (onAfterAction).',
  },
  {
    nome: 'Terreno', funcao: 'registerTerrain', obrigatorios: 'id, name', exemplos: 'src/motor/engine/terrains.js',
    texto: 'Muda o jogo inteiro por ganchos no ciclo do turno: no começo da partida, no começo e no fim de cada vez, no fim de cada rodada e quando um neurônio é revelado. Também pode ajustar os pontos de cada neurônio (neuronBonus) ou da rede inteira (modifyScore).',
  },
  {
    nome: 'Ação', funcao: 'registerAction', obrigatorios: 'id, name, generate, isValid, execute', exemplos: 'src/motor/engine/actions.js',
    texto: 'Uma jogada nova. generate lista as jogadas possíveis, isValid confere uma jogada e execute aplica no estado. Pode não gastar a vez (consumesTurn: false) e trazer os textos da regra (rule) e do conceito de ML (ml).',
  },
];

/** Abre a tela "Mods". */
export function abrirMods() {
  const html = '<div class="folha mods"><button class="fechar-x" data-fechar aria-label="Fechar">×</button>' +
    '<h2>Mods</h2>' +
    '<p>As regras do jogo vêm do motor do NeuroDeck, que foi feito para receber <b>mods</b>: pequenos módulos JavaScript que acrescentam baralhos, terrenos e ações sem mexer no código do jogo. Tudo o que varia no jogo entra por um registro, e os baralhos, terrenos e ações que já existem são registrados do mesmo jeito.</p>' +
    '<h3>O que um mod pode criar</h3>' +
    '<div class="tipos-de-mod">' + TIPOS.map((t) => '<div class="tipo-de-mod"><h4>' + t.nome + '</h4><p>' + escaparHtml(t.texto) + '</p>' +
      '<p class="campos"><code>NeuroDeck.' + t.funcao + '({ … })</code><br>Campos obrigatórios: <code>' + t.obrigatorios + '</code><br>Exemplos no repositório: ' + linkDoArquivo(t.exemplos) + '</p></div>').join('') + '</div>' +
    '<h3>Como um mod é feito</h3>' +
    '<ol>' +
    '<li>Um arquivo <code>.js</code> que exporta <code>apiVersion = 2</code> e uma função padrão.</li>' +
    '<li>A função recebe o registro do motor (<code>NeuroDeck</code>) e chama <code>registerDeck</code>, <code>registerTerrain</code> ou <code>registerAction</code>.</li>' +
    '<li>O estado da partida é um objeto simples: mesa (<code>state.layers</code>), mãos, limbo, cemitério e a rede de cada jogador (<code>state.nets</code>). Para sortear, use <code>NeuroDeck.rand(state)</code>, que mantém a partida reproduzível.</li>' +
    '</ol>' +
    '<h3>Exemplo comentado: terreno "Regularização L1"</h3>' +
    '<p class="campos">Arquivo no repositório: ' + linkDoArquivo('src/conteudo/modExemplo.js') + '</p>' +
    '<pre class="codigo-mod"><code>' + escaparHtml(CODIGO_DO_MOD_DE_EXEMPLO) + '</code></pre>' +
    '<div class="linha"><button class="botao" id="mods-copiar">Copiar o exemplo</button><span class="mods-copiado" id="mods-copiado" aria-live="polite"></span></div>' +
    '<h3>Como testar um mod</h3>' +
    '<ul>' +
    '<li><b>No NeuroDeck original:</b> publique o arquivo num endereço público e abra <code>https://neurodeck-fpo.web.app/?mod=</code> seguido do endereço do arquivo.</li>' +
    '<li><b>No repositório:</b> o motor roda no Node. Importe <code>src/motor/engine.js</code> e o mod, chame a função do mod com <code>NeuroDeck</code> e jogue partidas com <code>newGame</code> e <code>applyMove</code> (o teste ' + linkDoArquivo('testes/unidade/mods.test.js') + ' faz isso com o exemplo acima).</li>' +
    '</ul>' +
    '<p class="aviso-mods"><b>Ainda não no jogo unificado:</b> o motor já aceita mods, mas a interface do Truco de Turing ainda não os carrega, porque cada baralho, terreno e ação precisa de arte, textos e animação próprios. Por enquanto, use o NeuroDeck original ou o Node para testar.</p>' +
    '<h3>Arquivos e exemplos no repositório</h3>' +
    '<ul class="arquivos-de-mods">' + ARQUIVOS_DE_MODS.map((a) => '<li>' + linkDoArquivo(a.caminho) + ': ' + escaparHtml(a.texto) + '</li>').join('') + '</ul>' +
    '<p>Para ir além: o <a href="https://github.com/welyngton/truco-de-turing/blob/main/docs/MANUAL.md" target="_blank" rel="noopener">manual do código</a> explica como acrescentar baralho, terreno, oponente, conquista ou verbete no Truco de Turing, e a <a href="https://github.com/welyngton/truco-de-turing/blob/main/docs/REFERENCIA.md" target="_blank" rel="noopener">referência</a> lista cada função.</p>' +
    '<div class="linha fim" style="margin-top:14px"><button class="botao" data-fechar>Fechar</button></div></div>';
  const painel = abrirPainel(html, { fechaAoClicarFora: true });
  const copiado = painel.elemento.querySelector('#mods-copiado');
  painel.elemento.querySelector('#mods-copiar').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(CODIGO_DO_MOD_DE_EXEMPLO);
      copiado.textContent = 'Copiado.';
    } catch (e) {
      /* sem acesso à área de transferência: seleciona o código para copiar à mão */
      const selecao = window.getSelection && window.getSelection();
      const codigo = painel.elemento.querySelector('.codigo-mod');
      if (selecao && codigo && document.createRange) { const r = document.createRange(); r.selectNodeContents(codigo); selecao.removeAllRanges(); selecao.addRange(r); }
      copiado.textContent = 'Não deu para copiar sozinho: o código ficou selecionado.';
    }
  });
  return painel;
}
