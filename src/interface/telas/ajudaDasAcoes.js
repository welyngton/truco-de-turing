/**
 * @file Ajuda das ações, como o botão "?" do NeuroDeck: um cartão por jogada com a regra (texto do
 * próprio motor), quando o botão acende e, no verso, o conceito de machine learning, com um botão
 * "Ver o conceito" que abre o verbete certo do Glossário.
 */
import { NeuroDeck } from '../../motor/engine.js';
import { abrirPainel, escaparHtml } from '../paineis.js';
import { abrirGrimorio } from './grimorio.js';
import { ICONES_DAS_ACOES } from '../../arte/icones.js';

/**
 * Ações da ajuda, na ordem da barra da mesa. `motor` é o id da ação no NeuroDeck (de onde vêm a
 * regra e o conceito); `verbete` é o verbete do Glossário.
 */
export const ACOES_DA_AJUDA = [
  { id: 'avancar', nome: 'Avançar', motor: 'advance', verbete: 'forward',
    resumo: 'Clique num neurônio destacado da próxima camada: ele é revelado e entra na sua rede.',
    quando: 'Na sua vez, enquanto a sua rede estiver aberta e houver neurônio livre na próxima camada.' },
  { id: 'tunagem', nome: 'Tunagem', motor: 'tune', verbete: 'tunagem',
    resumo: '1 carta igual sobre o seu último neurônio oculto: soma pontos à sua rede.',
    quando: 'Com 1 carta selecionada do mesmo valor do seu último neurônio oculto.' },
  { id: 'overfit', nome: 'Overfit', motor: 'overfit', verbete: 'overfit',
    resumo: 'A pilha do rival fica com 2 cartas: o neurônio vai para o cemitério e ele recua uma camada.',
    quando: 'Com cartas do mesmo valor do último neurônio oculto de um rival, em número que deixe a pilha com 2.' },
  { id: 'earlystop', nome: 'Early stop', motor: 'earlystop', verbete: 'earlystop',
    resumo: 'A pilha fica com 3 cartas: a rede atingida é finalizada na hora, sem esse neurônio.',
    quando: 'Com cartas suficientes para deixar a pilha com 3 (na rede de um rival ou na sua).' },
  { id: 'stackoverflow', nome: 'Stack overflow', motor: 'stackoverflow', verbete: 'stackoverflow',
    resumo: 'A pilha fica com 4 cartas: a rede é finalizada e o dono perde a mão inteira.',
    quando: 'Com cartas suficientes para deixar a pilha com 4.' },
  { id: 'dropout', nome: 'Dropout', motor: 'dropout', verbete: 'dropout',
    resumo: 'Descarte 1 carta por camada oculta para desfazer seus últimos neurônios. Não gasta o turno.',
    quando: 'Com cartas selecionadas, no máximo uma por camada oculta que você tem para desfazer; sem seleção, o botão deixa escolher até onde desfazer.' },
  { id: 'transfer', nome: 'Transfer', motor: 'transfer', verbete: 'transfer',
    resumo: '4 cartas iguais da mão trocadas por 4 do limbo, uma vez por partida. Não gasta o turno.',
    quando: 'Com 4 cartas do mesmo valor na mão, se você ainda não usou o transfer nesta partida.' },
  { id: 'passar', nome: 'Passar', motor: 'pass', verbete: 'earlystop',
    resumo: 'Só para quem teve a rede interrompida por early stop e ainda tem cartas, ou para quem não tem jogada.',
    quando: 'Depois de sofrer (ou aplicar em si) um early stop, ou sem nenhuma outra jogada possível.' },
];

/** Ação do NeuroDeck, ou um objeto vazio se o motor não tiver aquele id. */
function doMotor(id) {
  try { return NeuroDeck.action(id) || {}; } catch (e) { return {}; }
}

/**
 * Abre a ajuda das ações.
 * @param {object} app Aplicação (guarda os verbetes lidos quando abre o Glossário).
 * @param {string} [idInicial] Ação destacada e rolada até a vista (ids de ACOES_DA_AJUDA).
 */
export function abrirAjudaDasAcoes(app, idInicial) {
  const cartoes = ACOES_DA_AJUDA.map((a) => {
    const m = doMotor(a.motor);
    return '<article class="cartao-acao" data-acao="' + a.id + '"' + (a.id === idInicial ? ' aria-current="true"' : '') + '>' +
      '<h3>' + (ICONES_DAS_ACOES[a.id] ? '<span class="icone-acao">' + ICONES_DAS_ACOES[a.id] + '</span>' : '') + escaparHtml(a.nome) + '</h3>' +
      '<p><b>Regra:</b> ' + escaparHtml(m.rule || a.resumo) + '</p>' +
      '<p class="quando"><b>Quando acende:</b> ' + escaparHtml(a.quando) + '</p>' +
      (m.ml ? '<p class="em-ml"><b>Em machine learning:</b> ' + escaparHtml(m.ml) + '</p>' : '') +
      '<button class="botao discreto" data-verbete="' + a.verbete + '">Ver o conceito</button>' +
      '</article>';
  }).join('');
  const html = '<div class="folha larga ajuda-acoes"><button class="fechar-x" data-fechar aria-label="Fechar">×</button>' +
    '<h2>Ajuda das ações</h2><p>Selecione cartas da mão e acendem só os botões das jogadas possíveis. Cada cartão traz a regra, quando o botão acende e o conceito de redes neurais por trás da jogada.</p>' +
    '<div class="cartoes-acao">' + cartoes + '</div>' +
    '<div class="linha fim" style="margin-top:14px"><button class="botao" data-fechar>Voltar</button></div></div>';
  const painel = abrirPainel(html, { fechaAoClicarFora: true });
  painel.elemento.querySelectorAll('[data-verbete]').forEach((b) => b.addEventListener('click', () => abrirGrimorio(app, b.dataset.verbete)));
  const alvo = idInicial && painel.elemento.querySelector('[data-acao="' + idInicial + '"]');
  if (alvo && alvo.scrollIntoView) setTimeout(() => alvo.scrollIntoView({ block: 'center' }), 30);
  return painel;
}
