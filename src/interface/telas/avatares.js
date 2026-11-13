/**
 * @file Tela de avatares: o jogador escolhe o retrato que aparece no placar. Os bloqueados mostram
 * a conquista que os libera.
 */
import { AVATARES_DO_JOGADOR, avatarLiberado, avatarDoJogador, conquistaQueLibera } from '../../conteudo/avatares.js';
import { CORES_CSS } from '../../configuracao.js';
import { desenharAvatar } from '../../arte/avatares.js';
import { ICONE_CADEADO } from '../../arte/icones.js';
import { abrirPainel, escaparHtml } from '../paineis.js';
import { registrarEvento, EVENTOS } from '../analise.js';

/** Retratos já desenhados (data URL), por id. */
const retratos = {};
/** Data URL do retrato do avatar, desenhado na primeira vez; vazio se não houver canvas. */
export function retratoDoAvatar(id) {
  if (!retratos[id]) { try { retratos[id] = desenharAvatar(id, CORES_CSS.j0, 1.5).toDataURL(); } catch (e) { return ''; } }
  return retratos[id];
}

/**
 * Abre a escolha de avatar.
 * @param {object} app Aplicação (lê e grava `progresso.avatar`).
 * @param {() => void} [aoMudar] Chamado depois de trocar de avatar.
 */
export function abrirAvatares(app, aoMudar) {
  const p = app.progresso;
  const atual = avatarDoJogador(p);
  const itens = AVATARES_DO_JOGADOR.map((a) => {
    const livre = avatarLiberado(a, p);
    const img = retratoDoAvatar(a.id);
    return '<button class="avatar-opcao' + (livre ? '' : ' bloqueado') + '" data-avatar="' + a.id + '" aria-pressed="' + (a.id === atual) + '"' + (livre ? '' : ' aria-disabled="true"') + '>' +
      '<span class="avatar-retrato">' + (img ? '<img alt="" src="' + img + '">' : '') + (livre ? '' : '<span class="cadeado">' + ICONE_CADEADO + '</span>') + '</span>' +
      '<b>' + escaparHtml(a.nome) + '</b><small>' + escaparHtml(livre ? a.descricao : 'Liberado pela conquista "' + conquistaQueLibera(a) + '".') + '</small></button>';
  }).join('');
  const livres = AVATARES_DO_JOGADOR.filter((a) => avatarLiberado(a, p)).length;
  const html = '<div class="folha larga avatares"><button class="fechar-x" data-fechar aria-label="Fechar">×</button>' +
    '<h2>Seu avatar</h2><p>O retrato que aparece no placar da mesa. ' + livres + ' de ' + AVATARES_DO_JOGADOR.length + ' liberados; os outros saem com conquistas.</p>' +
    '<div class="avatares-grade">' + itens + '</div>' +
    '<div class="linha fim" style="margin-top:14px"><button class="botao" data-fechar>Pronto</button></div></div>';
  const painel = abrirPainel(html, { fechaAoClicarFora: true });
  painel.elemento.querySelectorAll('.avatar-opcao').forEach((b) => b.addEventListener('click', () => {
    const avatar = AVATARES_DO_JOGADOR.find((a) => a.id === b.dataset.avatar);
    if (!avatarLiberado(avatar, app.progresso)) return;
    app.progresso.avatar = avatar.id;
    app.salvar();
    registrarEvento(EVENTOS.avatar, { avatar: avatar.id });
    if (app.atualizarJogadorNasEstatisticas) app.atualizarJogadorNasEstatisticas();
    painel.elemento.querySelectorAll('.avatar-opcao').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    if (aoMudar) aoMudar(avatar.id);
  }));
  return painel;
}
