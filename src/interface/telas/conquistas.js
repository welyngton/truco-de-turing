/**
 * @file Quadro de conquistas: retrato do professor em moldura medieval à esquerda e as
 * medalhas à direita (desbloqueadas coloridas; bloqueadas em cinza, com cadeado). A conquista
 * final fica em destaque no alto, com o progresso até ela.
 */
import { abrirAvatares } from './avatares.js';
import { CONQUISTAS, GRADUACOES, CONQUISTA_FINAL, progressoDaFinal } from '../../conteudo/conquistas.js';
import { desenharRetratoEmMoldura } from '../../arte/retrato.js';
import { FOTO_PROFESSOR } from '../../recursos/retratoProfessor.js';
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
 * Abre o quadro de conquistas.
 * @param {object} app Aplicação (lê o progresso).
 */
export function abrirConquistas(app) {
  const p = app.progresso;
  const total = CONQUISTAS.filter((c) => p.desbloqueadas[c.id]).length;
  const html = '<div class="folha larga"><button class="fechar-x" data-fechar aria-label="Fechar">×</button>' +
    '<div class="conquistas-salao">' +
    '<aside class="guilda"><div class="retrato" id="c-retrato" role="img" aria-label="Retrato do prof. Peng Yaohao em moldura medieval"></div>' +
    '<p class="guilda-nota">Guardião do salão das conquistas. Cada medalha aqui foi conquistada contra os oponentes da mesa.</p></aside>' +
    '<div class="conquistas-principal"><h2>Conquistas</h2>' +
    '<p class="conquistas-resumo"><b>' + total + '</b> de ' + CONQUISTAS.length + ' desbloqueadas · ' + p.vitorias + ' mãos vencidas · ' + p.dropouts + ' dropouts</p>' +
    CONQUISTAS.filter((c) => c.id === CONQUISTA_FINAL).map((c) => finalHtml(c, p)).join('') +
    '<div class="conquistas-lista">' + CONQUISTAS.filter((c) => c.id !== CONQUISTA_FINAL).map((c) => itemHtml(c, !!p.desbloqueadas[c.id])).join('') + '</div>' +
    '<p class="conquistas-rodape">Contam nas partidas contra os oponentes do computador. Algumas liberam avatares novos. <button class="link" id="c-avatares">Escolher avatar</button></p></div></div></div>';
  const painel = abrirPainel(html, { fechaAoClicarFora: true });
  painel.elemento.querySelector('#c-avatares').addEventListener('click', () => abrirAvatares(app));
  const densidade = Math.min(3, Math.max(2, globalThis.devicePixelRatio || 1));
  desenharRetratoEmMoldura(FOTO_PROFESSOR, densidade, 'Prof. Peng Yaohao', 'Grão-mestre da guilda', (canvas) => {
    painel.elemento.querySelector('#c-retrato')?.appendChild(canvas);
  });
  return painel;
}
