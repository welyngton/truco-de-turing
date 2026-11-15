/**
 * @file HTML da medalha de uma conquista, na cor da graduação: usado no quadro de conquistas, na
 * tela de resultado e no aviso do alto da tela. Fica num módulo leve, sem as telas, para a
 * Aplicacao poder montar o aviso.
 */
import { GRADUACOES } from '../conteudo/conquistas.js';
import { ICONES_CONQUISTAS, ICONE_CADEADO } from '../arte/icones.js';

/**
 * HTML da medalha de uma conquista.
 * @param {object} conquista
 * @param {boolean} desbloqueada Bloqueada leva o cadeado.
 */
export function medalhaHtml(conquista, desbloqueada) {
  const cor = GRADUACOES[conquista.graduacao].cor;
  return '<div class="medalha" style="--graduacao:' + cor + '">' + (ICONES_CONQUISTAS[conquista.id] || '') +
    (desbloqueada ? '' : '<span class="cadeado">' + ICONE_CADEADO + '</span>') + '</div>';
}
