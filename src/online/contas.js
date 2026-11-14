/**
 * @file Contas: o progresso (conquistas, avatares, verbetes lidos e contadores) passa a ficar na
 * conta e vale em qualquer aparelho. Ao entrar, o progresso do aparelho e o da conta se juntam
 * sem perder nada nem contar em dobro (`mesclarProgresso`); depois, cada mão salva na conta.
 * O documento da conta (`documentoDaConta`) leva também as estatísticas do jogador
 * (estatisticas.js), o perfil (nome, e-mail e método de login) e um resumo para a lista de
 * jogadores (issue #66).
 */
import { mesclarEstatisticas, resumoDoJogador } from './estatisticas.js';

/** O que fica guardado na conta, em palavras para quem joga (tela "Sobre" e "Jogar online"). */
export const TEXTO_DA_CONTA = 'Quem entra numa conta tem guardados nela, no Firebase do jogo: nome, e-mail, conquistas, verbetes lidos, avatar e as estatísticas de jogo (acessos, partidas, mãos e vitórias). Os responsáveis pelo jogo conseguem ver esses dados. Sem conta, tudo isso fica só neste aparelho.';

/** Contadores que só crescem: na mescla vale o maior. */
const CONTADORES = ['vitorias', 'maos', 'dropouts', 'vitoriasZen'];
/** Conjuntos marcados (id → valor): na mescla vale a união. */
const CONJUNTOS = ['lidos', 'terrenos', 'baralhos', 'arquiteturas'];

/**
 * Junta o progresso do aparelho com o da conta.
 * - contadores: o maior dos dois (as mesmas mãos não contam duas vezes);
 * - conquistas: a união, com a data mais antiga de cada uma;
 * - verbetes, terrenos, baralhos e arquiteturas: a união;
 * - avatar: o da conta, se houver; preferências do aparelho (som, música, opções do menu) ficam.
 * @param {object} local Progresso deste aparelho.
 * @param {object|null} conta Progresso salvo na conta (null na primeira vez).
 * @returns {object} Progresso mesclado (novo objeto).
 */
export function mesclarProgresso(local, conta) {
  if (!conta) return { ...local };
  const m = { ...local };
  for (const k of CONTADORES) m[k] = Math.max(local[k] || 0, conta[k] || 0);
  for (const k of CONJUNTOS) m[k] = { ...(local[k] || {}), ...(conta[k] || {}) };
  m.desbloqueadas = { ...(local.desbloqueadas || {}) };
  for (const [id, quando] of Object.entries(conta.desbloqueadas || {})) {
    m.desbloqueadas[id] = m.desbloqueadas[id] ? Math.min(m.desbloqueadas[id], quando) : quando;
  }
  m.verbetesLidos = Object.keys(m.lidos).length;
  if (conta.avatar) m.avatar = conta.avatar;
  m.estatisticas = mesclarEstatisticas(local.estatisticas, conta.estatisticas);
  return m;
}

/** Parte do progresso que vai para a conta (sem preferências do aparelho). */
export function progressoDaConta(progresso) {
  const p = {};
  for (const k of [...CONTADORES, ...CONJUNTOS, 'desbloqueadas', 'verbetesLidos', 'avatar', 'estatisticas']) if (progresso[k] !== undefined) p[k] = progresso[k];
  return p;
}

/**
 * Documento gravado em `contas/<uid>`: o progresso da conta, o perfil de quem entrou e o resumo
 * usado na lista de jogadores (tela Jogadores, só para administradores).
 * @param {object} progresso
 * @param {{nome?: string, email?: string}|null} conta
 * @param {string} [metodo] 'google', 'email' ou 'email_novo'.
 */
export function documentoDaConta(progresso, conta, metodo) {
  const doc = progressoDaConta(progresso);
  if (conta) doc.perfil = { nome: conta.nome || '', email: conta.email || '', metodo: metodo && metodo.startsWith('email') ? 'email' : metodo || 'conta' };
  doc.resumo = resumoDoJogador(progresso);
  return doc;
}
