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
  const graduacao = GRADUACOES[conquista.graduacao];
  /* graduação especial (Singularidade): medalha furta-cor, ver estilo.css */
  return '<div class="medalha' + (graduacao.especial ? ' especial' : '') + '" style="--graduacao:' + graduacao.cor + '">' + (ICONES_CONQUISTAS[conquista.id] || '') +
    (desbloqueada ? '' : '<span class="cadeado">' + ICONE_CADEADO + '</span>') + '</div>';
}
