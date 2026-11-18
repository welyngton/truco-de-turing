/**
 * @file Quadro de conquistas: as medalhas (desbloqueadas coloridas; bloqueadas em cinza, com cadeado), com a linha
 * que diz se elas são da conta conectada ou só deste aparelho. A conquista final fica em destaque
 * no alto, com o progresso até ela.
 */
import { abrirAvatares } from './avatares.js';
import { CONQUISTAS, GRADUACOES, CONQUISTA_FINAL, progressoDaFinal } from '../../conteudo/conquistas.js';
import { firebaseConfigurado } from '../../online/firebase.js';
import { contaAtual, haMarcaDeConta, aoMudarDeConta } from '../conta.js';
import { abrirPainel, escaparHtml } from '../paineis.js';
import { medalhaHtml } from '../medalha.js';

/* a medalha também é usada no resumo do fim da mão e no aviso do alto da tela */
export { medalhaHtml };

/** HTML de um item da lista de conquistas. */
function itemHtml(conquista, desbloqueada) {
  return '<div class="conquista' + (desbloqueada ? '' : ' bloqueada') + '">' + medalhaHtml(conquista, desbloqueada) +
    '<div><span class="graduacao">' + GRADUACOES[conquista.graduacao].nome + '</span><b>' + escaparHtml(conquista.nome) + '</b>' +
    '<small>' + escaparHtml(conquista.descricao) + '</small></div></div>';
}

/** HTML da conquista final, em destaque: medalha, nome, descrição e quantas das outras já foram feitas. */
function finalHtml(conquista, progresso) {
  const desbloqueada = !!progresso.desbloqueadas[conquista.id];
  const { feitas, total } = progressoDaFinal(progresso.desbloqueadas);
  const porcento = total ? Math.round((100 * feitas) / total) : 100;
  return '<div class="conquista final' + (desbloqueada ? '' : ' bloqueada') + '">' + medalhaHtml(conquista, desbloqueada) +
    '<div><span class="graduacao">Conquista final · ' + GRADUACOES[conquista.graduacao].nome + '</span><b>' + escaparHtml(conquista.nome) + '</b>' +
    '<small>' + escaparHtml(conquista.descricao) + '</small>' +
    '<span class="progresso-final"><span class="barra" role="progressbar" aria-valuemin="0" aria-valuemax="' + total + '" aria-valuenow="' + feitas + '"' +
    ' aria-label="Conquistas para a final"><i style="width:' + porcento + '%"></i></span>' + feitas + ' de ' + total + '</span></div></div>';
}

/**
 * De quem são as conquistas da tela: da conta conectada (com o nome), da conta que ainda está sendo
 * retomada, ou só deste aparelho.
 */
export function origemDasConquistas() {
  const conta = contaAtual();
  if (conta) return 'Conquistas da conta de <b>' + escaparHtml(conta.nome) + '</b>: valem em qualquer aparelho em que você entrar.';
  if (haMarcaDeConta()) return 'Carregando as conquistas da sua conta…';
  if (!firebaseConfigurado()) return 'Conquistas deste aparelho.';
  return 'Conquistas só deste aparelho. Para guardá-las e vê-las em outros aparelhos, entre numa conta em <b>Jogar online</b>.';
}

/** Origem, resumo e lista de medalhas (a parte que muda quando a conta entra ou sai). */
function conteudoHtml(p) {
  const total = CONQUISTAS.filter((c) => p.desbloqueadas[c.id]).length;
  return '<p class="conquistas-origem">' + origemDasConquistas() + '</p>' +
    '<p class="conquistas-resumo"><b>' + total + '</b> de ' + CONQUISTAS.length + ' desbloqueadas · ' + p.vitorias + ' mãos vencidas · ' + p.dropouts + ' dropouts</p>' +
    CONQUISTAS.filter((c) => c.id === CONQUISTA_FINAL).map((c) => finalHtml(c, p)).join('') +
    '<div class="conquistas-lista">' + CONQUISTAS.filter((c) => c.id !== CONQUISTA_FINAL).map((c) => itemHtml(c, !!p.desbloqueadas[c.id])).join('') + '</div>';
}

/**
 * Abre o quadro de conquistas. Se a conta entrar (ou sair) com o quadro aberto, ele se atualiza.
 * @param {object} app Aplicação (lê o progresso).
 */
export function abrirConquistas(app) {
  const html = '<div class="folha larga"><button class="fechar-x" data-fechar aria-label="Fechar">×</button>' +
    '<div class="conquistas-salao">' +
    '<div class="conquistas-principal"><h2>Conquistas</h2>' +
    '<div class="conquistas-conteudo">' + conteudoHtml(app.progresso) + '</div>' +
    '<p class="conquistas-rodape">Contam nas partidas contra os oponentes do computador. Algumas liberam avatares novos. <button class="link" id="c-avatares">Escolher avatar</button></p></div></div></div>';
  let pararDeOuvir = () => {};
  const painel = abrirPainel(html, { fechaAoClicarFora: true, aoFechar: () => pararDeOuvir() });
  painel.elemento.querySelector('#c-avatares').addEventListener('click', () => abrirAvatares(app));
  pararDeOuvir = aoMudarDeConta(() => {
    const conteudo = painel.elemento.querySelector('.conquistas-conteudo');
    if (!conteudo || !conteudo.isConnected) { pararDeOuvir(); return; }
    conteudo.innerHTML = conteudoHtml(app.progresso);
  });
  return painel;
}
