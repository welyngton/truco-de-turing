/**
 * @file Progresso do jogador guardado no navegador (localStorage): contadores, conquistas,
 * verbetes lidos, avatar escolhido, opções do menu e preferência de som.
 *
 * O armazenamento pode falhar (janela anônima, armazenamento bloqueado); por isso toda leitura e
 * escrita é protegida e o jogo funciona normalmente sem ele.
 */

const CHAVE = 'truco-de-turing:v2';
const CHAVE_ANTIGA = 'truco-de-turing:v1';

/** Progresso vazio. */
function progressoInicial() {
  return {
    vitorias: 0, maos: 0, dropouts: 0, vitoriasZen: 0,
    verbetesLidos: 0, lidos: {}, terrenos: {}, baralhos: {}, arquiteturas: {}, desbloqueadas: {}, avatar: 'p1',
    mudo: false, musica: true, musicaEscolhida: false, tutorialVisto: false, opcoes: null,
  };
}

/** Converte o formato da versão anterior (nomes em inglês) para o atual, sem perder conquistas. */
function migrarV1(antigo) {
  const opcoes = antigo.opts ? {
    oponente: antigo.opts.bot === 'hotseat' ? 'doisHumanos' : antigo.opts.bot, baralho: antigo.opts.deck, terreno: antigo.opts.terrain, inicio: antigo.opts.starter, alvo: antigo.opts.target,
  } : null;
  return {
    vitorias: antigo.wins || 0, maos: antigo.hands || 0, dropouts: antigo.dropouts || 0, vitoriasZen: antigo.zenWins || 0,
    verbetesLidos: antigo.codexRead || 0, lidos: antigo.read || {}, terrenos: antigo.terrains || {}, baralhos: antigo.decks || {},
    desbloqueadas: antigo.unlocked || {}, mudo: !!antigo.muted, tutorialVisto: !!antigo.seenTutorial, opcoes,
  };
}

/** Lê o progresso salvo (ou o inicial). */
export function carregarProgresso() {
  const base = progressoInicial();
  try {
    const bruto = globalThis.localStorage?.getItem(CHAVE);
    if (bruto) return Object.assign(base, JSON.parse(bruto));
    const antigo = globalThis.localStorage?.getItem(CHAVE_ANTIGA);
    if (antigo) return Object.assign(base, migrarV1(JSON.parse(antigo)));
  } catch (e) { /* sem armazenamento disponível */ }
  return base;
}

/** Salva o progresso. Falhas são ignoradas. */
export function salvarProgresso(progresso) {
  try { globalThis.localStorage?.setItem(CHAVE, JSON.stringify(progresso)); } catch (e) { /* ignora */ }
}
