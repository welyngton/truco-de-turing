/**
 * @file Quadro de conquistas: retrato do professor em moldura medieval à esquerda e as
 * medalhas à direita (desbloqueadas coloridas; bloqueadas em cinza, com cadeado).
 */
import { abrirAvatares } from './avatares.js';
import { CONQUISTAS, GRADUACOES } from '../../conteudo/conquistas.js';
import { ICONES_CONQUISTAS, ICONE_CADEADO } from '../../arte/icones.js';
import { desenharRetratoEmMoldura } from '../../arte/retrato.js';
import { FOTO_PROFESSOR } from '../../recursos/retratoProfessor.js';
import { abrirPainel, escaparHtml } from '../paineis.js';

/**
 * HTML da medalha de uma conquista (também usado no resumo do fim da mão).
 * @param {object} conquista
 * @param {boolean} desbloqueada
 */
export function medalhaHtml(conquista, desbloqueada) {
  const cor = GRADUACOES[conquista.graduacao].cor;
  return '<div class="medalha" style="--graduacao:' + cor + '">' + (ICONES_CONQUISTAS[conquista.id] || '') +
    (desbloqueada ? '' : '<span class="cadeado">' + ICONE_CADEADO + '</span>') + '</div>';
}

/** HTML de um item da lista de conquistas. */
function itemHtml(conquista, desbloqueada) {
  return '<div class="conquista' + (desbloqueada ? '' : ' bloqueada') + '">' + medalhaHtml(conquista, desbloqueada) +
    '<div><span class="graduacao">' + GRADUACOES[conquista.graduacao].nome + '</span><b>' + escaparHtml(conquista.nome) + '</b>' +
    '<small>' + escaparHtml(conquista.descricao) + '</small></div></div>';
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
    '<div class="conquistas-lista">' + CONQUISTAS.map((c) => itemHtml(c, !!p.desbloqueadas[c.id])).join('') + '</div>' +
    '<p class="conquistas-rodape">Contam nas partidas contra os oponentes do computador. Algumas liberam avatares novos. <button class="link" id="c-avatares">Escolher avatar</button></p></div></div></div>';
  const painel = abrirPainel(html, { fechaAoClicarFora: true });
  painel.elemento.querySelector('#c-avatares').addEventListener('click', () => abrirAvatares(app));
  const densidade = Math.min(3, Math.max(2, globalThis.devicePixelRatio || 1));
  desenharRetratoEmMoldura(FOTO_PROFESSOR, densidade, 'Prof. Peng Yaohao', 'Grão-mestre da guilda', (canvas) => {
    painel.elemento.querySelector('#c-retrato')?.appendChild(canvas);
  });
  return painel;
}
