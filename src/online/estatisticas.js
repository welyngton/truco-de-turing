/**
 * @file Estatísticas de jogo gravadas no documento `contas/{uid}` do Firestore (issue #66).
 *
 * Cada campo existe tanto no aparelho (localStorage, via progresso) quanto na conta (Firestore).
 * Os dois são mesclados sem duplicar ao entrar numa conta (ver online/contas.js).
 *
 * Campos novos em `contas/{uid}`:
 * - `perfil`: nome, e-mail e método de login (para a tela Jogadores)
 * - `acessos`: contadores de acesso (total, primeiro, último, versão e aparelho do último)
 * - `partidas`: iniciadas, terminadas, vencidas e abandonadas
 * - `maosJogadas`, `maosVencidas`: contadores de mão (os campos `maos` e `vitorias` já existem)
 * - `trucos`: pedidos de truco feitos pelo jogador
 * - `online`: salas criadas, salas em que entrou, partidas online
 * - `porOponente`, `porBaralho`, `porTerreno`: { id: { jogadas, vencidas } }
 * - `resumo`: { conquistas, verbetesLidos } — para ordenar a lista sem abrir cada conta
 *
 * Esses campos são calculados em `atualizarEstatisticas` e mesclados em `mesclarProgresso`
 * (online/contas.js), mantendo a compatibilidade com progressos anteriores.
 */

import { VERSAO } from '../versao.js';

/** Tipo de aparelho simplificado. */
export function tipoDeAparelho() {
  try {
    const ua = globalThis.navigator?.userAgent || '';
    if (/android/i.test(ua)) return 'android';
    if (/iphone|ipad|ipod/i.test(ua)) return 'ios';
    if (/mobile/i.test(ua)) return 'mobile';
    return 'desktop';
  } catch (e) { return 'desconhecido'; }
}

/**
 * Registra um acesso no progresso (local ou da conta). Deve ser chamado ao abrir o jogo.
 * @param {object} progresso Progresso do jogador (mutado).
 * @param {object} [opcoes]
 * @param {string} [opcoes.versao] Versão do jogo neste acesso.
 * @param {string} [opcoes.aparelho] Tipo de aparelho neste acesso.
 */
export function registrarAcesso(progresso, { versao = VERSAO, aparelho = tipoDeAparelho() } = {}) {
  const agora = Date.now();
  if (!progresso.acessos) progresso.acessos = { total: 0, primeiro: agora, ultimo: agora, versao, aparelho };
  progresso.acessos.total = (progresso.acessos.total || 0) + 1;
  if (!progresso.acessos.primeiro) progresso.acessos.primeiro = agora;
  progresso.acessos.ultimo = agora;
  progresso.acessos.versao = versao;
  progresso.acessos.aparelho = aparelho;
}

/**
 * Registra o início de uma partida.
 * @param {object} progresso
 * @param {{ online?: boolean }} [opcoes]
 */
export function registrarInicioDePartida(progresso, { online = false } = {}) {
  if (!progresso.partidas) progresso.partidas = { iniciadas: 0, terminadas: 0, vencidas: 0, abandonadas: 0 };
  progresso.partidas.iniciadas = (progresso.partidas.iniciadas || 0) + 1;
  if (online) {
    if (!progresso.onlineStats) progresso.onlineStats = { salasCriadas: 0, salasEntrou: 0, partidas: 0 };
    progresso.onlineStats.partidas = (progresso.onlineStats.partidas || 0) + 1;
  }
}

/**
 * Registra o fim de uma partida (vencida, perdida ou abandonada).
 * @param {object} progresso
 * @param {{ venceu?: boolean, abandonada?: boolean }} [opcoes]
 */
export function registrarFimDePartida(progresso, { venceu = false, abandonada = false } = {}) {
  if (!progresso.partidas) progresso.partidas = { iniciadas: 0, terminadas: 0, vencidas: 0, abandonadas: 0 };
  if (abandonada) {
    progresso.partidas.abandonadas = (progresso.partidas.abandonadas || 0) + 1;
  } else {
    progresso.partidas.terminadas = (progresso.partidas.terminadas || 0) + 1;
    if (venceu) progresso.partidas.vencidas = (progresso.partidas.vencidas || 0) + 1;
  }
}

/**
 * Registra um pedido de truco feito pelo jogador.
 * @param {object} progresso
 */
export function registrarTruco(progresso) {
  progresso.trucos = (progresso.trucos || 0) + 1;
}

/**
 * Registra a criação ou entrada numa sala online.
 * @param {object} progresso
 * @param {{ criou?: boolean }} [opcoes]
 */
export function registrarSalaOnline(progresso, { criou = false } = {}) {
  if (!progresso.onlineStats) progresso.onlineStats = { salasCriadas: 0, salasEntrou: 0, partidas: 0 };
  if (criou) progresso.onlineStats.salasCriadas = (progresso.onlineStats.salasCriadas || 0) + 1;
  else progresso.onlineStats.salasEntrou = (progresso.onlineStats.salasEntrou || 0) + 1;
}

/**
 * Registra o resultado de uma mão por oponente, baralho e terreno.
 * @param {object} progresso
 * @param {{ oponente: string, baralho: string, terreno: string, venceu: boolean }} ctx
 */
export function registrarMaoPorContexto(progresso, { oponente, baralho, terreno, venceu }) {
  for (const [campo, chave] of [['porOponente', oponente], ['porBaralho', baralho], ['porTerreno', terreno]]) {
    if (!chave) continue;
    if (!progresso[campo]) progresso[campo] = {};
    if (!progresso[campo][chave]) progresso[campo][chave] = { jogadas: 0, vencidas: 0 };
    progresso[campo][chave].jogadas++;
    if (venceu) progresso[campo][chave].vencidas++;
  }
}

/**
 * Calcula o resumo da conta (conquistas e verbetes lidos), para a lista de jogadores.
 * `conquistas` é o mapa de conquistas desbloqueadas (chave → true), para a tela Jogadores saber
 * quais estão ativas sem abrir o progresso inteiro.
 * @param {object} progresso
 * @returns {{ conquistas: object, verbetesLidos: number }}
 */
export function resumoDaConta(progresso) {
  return {
    conquistas: progresso.desbloqueadas || {},
    verbetesLidos: progresso.verbetesLidos || 0,
  };
}

/**
 * Campos de estatísticas que fazem parte do progresso da conta no Firestore.
 * Usados em `progressoDaConta` (online/contas.js).
 */
export const CAMPOS_DE_ESTATISTICAS = ['acessos', 'partidas', 'trucos', 'onlineStats', 'porOponente', 'porBaralho', 'porTerreno', 'perfil', 'resumo'];

/**
 * Mescla os campos de estatísticas de dois progressos (local e conta), sem duplicar.
 * Os contadores somam; os campos de primeiro acesso preservam o mais antigo.
 * @param {object} local
 * @param {object} conta
 * @returns {object} Progresso com estatísticas mescladas (mutado em `local`).
 */
export function mesclarEstatisticas(local, conta) {
  if (!conta) return local;
  /* acessos: soma total, preserva o primeiro mais antigo */
  if (conta.acessos) {
    if (!local.acessos) {
      local.acessos = { ...conta.acessos };
    } else {
      local.acessos.total = Math.max(local.acessos.total || 0, conta.acessos.total || 0);
      if (conta.acessos.primeiro && (!local.acessos.primeiro || conta.acessos.primeiro < local.acessos.primeiro)) {
        local.acessos.primeiro = conta.acessos.primeiro;
      }
      /* versão e aparelho: mantém o do local (mais recente) */
    }
  }
  /* partidas e onlineStats: soma os contadores */
  for (const campo of ['partidas', 'onlineStats']) {
    if (!conta[campo]) continue;
    if (!local[campo]) { local[campo] = { ...conta[campo] }; continue; }
    for (const [k, v] of Object.entries(conta[campo])) {
      local[campo][k] = Math.max(local[campo][k] || 0, v || 0);
    }
  }
  /* trucos: o maior */
  if (conta.trucos) local.trucos = Math.max(local.trucos || 0, conta.trucos || 0);
  /* por oponente/baralho/terreno: união, somando jogadas e vencidas */
  for (const campo of ['porOponente', 'porBaralho', 'porTerreno']) {
    if (!conta[campo]) continue;
    if (!local[campo]) { local[campo] = {}; }
    for (const [chave, v] of Object.entries(conta[campo])) {
      if (!local[campo][chave]) { local[campo][chave] = { ...v }; continue; }
      local[campo][chave].jogadas = Math.max(local[campo][chave].jogadas || 0, v.jogadas || 0);
      local[campo][chave].vencidas = Math.max(local[campo][chave].vencidas || 0, v.vencidas || 0);
    }
  }
  /* perfil: da conta (mais recente, atualizado no login) */
  if (conta.perfil) local.perfil = { ...conta.perfil };
  return local;
}
