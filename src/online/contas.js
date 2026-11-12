/**
 * @file Contas: o progresso (conquistas, avatares, verbetes lidos e contadores) passa a ficar na
 * conta e vale em qualquer aparelho. Ao entrar, o progresso do aparelho e o da conta se juntam
 * sem perder nada nem contar em dobro (`mesclarProgresso`); depois, cada mão salva na conta.
 */

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
  return m;
}

/** Parte do progresso que vai para a conta (sem preferências do aparelho). */
export function progressoDaConta(progresso) {
  const p = {};
  for (const k of [...CONTADORES, ...CONJUNTOS, 'desbloqueadas', 'verbetesLidos', 'avatar']) if (progresso[k] !== undefined) p[k] = progresso[k];
  return p;
}
