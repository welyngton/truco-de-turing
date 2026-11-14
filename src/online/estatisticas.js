/**
 * @file Estatísticas do jogador (issue #66): acessos, partidas, mãos, truco, salas online e o
 * desempenho por oponente, baralho e terreno. Ficam em `progresso.estatisticas`, no aparelho, e
 * sobem para a conta (`contas/<uid>` no Firestore) quando a pessoa está conectada.
 *
 * Os contadores são alimentados pelos mesmos eventos enviados ao Google Analytics
 * (`contarEvento`, ligado em aplicacao.js por `aoRegistrarEvento`), para os dois lados contarem
 * as mesmas coisas. Aqui a contagem vale sempre, com ou sem consentimento de medição: é o
 * registro do próprio jogador, guardado com o progresso dele.
 *
 * Só lógica, sem navegador nem Firebase (testável no Node).
 */

/** Estatísticas vazias. */
export function estatisticasIniciais() {
  return {
    acessos: 0, primeiroAcesso: 0, ultimoAcesso: 0, versao: '', aparelho: '',
    partidas: { iniciadas: 0, terminadas: 0, vencidas: 0, abandonadas: 0 },
    maos: { jogadas: 0, vencidas: 0 },
    trucos: { pedidos: 0 },
    online: { salasCriadas: 0, salasEntradas: 0, partidas: 0 },
    porOponente: {}, porBaralho: {}, porTerreno: {},
  };
}

/** Grupos de contadores simples (nome → número). */
const GRUPOS = ['partidas', 'maos', 'trucos', 'online'];
/** Tabelas por chave (id → `{ jogadas, vencidas }`). */
const TABELAS = ['porOponente', 'porBaralho', 'porTerreno'];

/**
 * Garante `progresso.estatisticas` completo (progressos antigos não têm; versões novas ganham
 * campos) e o devolve.
 */
export function estatisticasDe(progresso) {
  const base = estatisticasIniciais(), e = progresso.estatisticas || {};
  for (const k of Object.keys(base)) {
    if (GRUPOS.includes(k)) e[k] = { ...base[k], ...(e[k] || {}) };
    else if (e[k] === undefined || e[k] === null) e[k] = base[k];
  }
  progresso.estatisticas = e;
  return e;
}

/** Celular ou computador, pelo jeito de apontar e pelo tamanho da tela. */
export function tipoDeAparelho(janela = globalThis) {
  try {
    const toque = janela.matchMedia && janela.matchMedia('(pointer: coarse)').matches;
    return toque ? (Math.min(janela.innerWidth, janela.innerHeight) < 600 ? 'celular' : 'tablet') : 'computador';
  } catch (e) { return 'computador'; }
}

/**
 * Conta uma abertura do jogo.
 * @param {object} progresso
 * @param {{agora?: number, versao?: string, aparelho?: string}} [dados]
 * @returns {number} O número deste acesso.
 */
export function registrarAcesso(progresso, { agora = Date.now(), versao = '', aparelho = '' } = {}) {
  const e = estatisticasDe(progresso);
  e.acessos += 1;
  if (!e.primeiroAcesso) e.primeiroAcesso = agora;
  e.ultimoAcesso = agora;
  e.versao = versao;
  e.aparelho = aparelho;
  return e.acessos;
}

const somarNaTabela = (tabela, chave, venceu) => {
  if (!chave) return;
  const linha = tabela[chave] || (tabela[chave] = { jogadas: 0, vencidas: 0 });
  linha.jogadas += 1;
  if (venceu) linha.vencidas += 1;
};

/**
 * Atualiza os contadores a partir de um evento do jogo (os nomes de `EVENTOS`, em
 * interface/analise.js).
 * @param {object} progresso
 * @param {string} nome Nome do evento.
 * @param {object} [dados] Parâmetros do evento.
 * @returns {boolean} true se algum contador mudou.
 */
export function contarEvento(progresso, nome, dados = {}) {
  const e = estatisticasDe(progresso);
  switch (nome) {
    case 'jogo_iniciado':
      e.partidas.iniciadas += 1;
      if (dados.online) e.online.partidas += 1;
      return true;
    case 'jogo_finalizado':
      e.partidas.terminadas += 1;
      if (dados.venceu) e.partidas.vencidas += 1;
      /* na partida online o "oponente" do menu não joga: a tabela é só do jogo contra o computador */
      if (!dados.online) somarNaTabela(e.porOponente, dados.oponente, !!dados.venceu);
      return true;
    case 'jogo_abandonado':
      e.partidas.abandonadas += 1;
      return true;
    case 'fim_mao':
      e.maos.jogadas += 1;
      if (dados.venceu) e.maos.vencidas += 1;
      somarNaTabela(e.porBaralho, dados.baralho, !!dados.venceu);
      somarNaTabela(e.porTerreno, dados.terreno, !!dados.venceu);
      return true;
    case 'truco':
      if (!dados.meu) return false;
      e.trucos.pedidos += 1;
      return true;
    case 'sala_online':
      if (dados.acao === 'criar') e.online.salasCriadas += 1;
      else if (dados.acao === 'entrar') e.online.salasEntradas += 1;
      else return false;
      return true;
    default:
      return false;
  }
}

/**
 * Junta as estatísticas do aparelho com as da conta, como o resto do progresso (contas.js): cada
 * contador fica com o maior dos dois, para as mesmas partidas não contarem duas vezes; o primeiro
 * acesso é o mais antigo e o último, o mais recente (com a versão e o aparelho dele).
 * @returns {object} Estatísticas novas.
 */
export function mesclarEstatisticas(local, conta) {
  const a = estatisticasDe({ estatisticas: local ? JSON.parse(JSON.stringify(local)) : null });
  if (!conta) return a;
  const b = estatisticasDe({ estatisticas: JSON.parse(JSON.stringify(conta)) });
  const m = estatisticasIniciais();
  m.acessos = Math.max(a.acessos, b.acessos);
  m.primeiroAcesso = Math.min(a.primeiroAcesso || Infinity, b.primeiroAcesso || Infinity);
  if (!Number.isFinite(m.primeiroAcesso)) m.primeiroAcesso = 0;
  const recente = b.ultimoAcesso > a.ultimoAcesso ? b : a;
  m.ultimoAcesso = recente.ultimoAcesso; m.versao = recente.versao; m.aparelho = recente.aparelho;
  for (const g of GRUPOS) for (const k of new Set([...Object.keys(a[g]), ...Object.keys(b[g])])) m[g][k] = Math.max(a[g][k] || 0, b[g][k] || 0);
  for (const t of TABELAS) {
    for (const chave of new Set([...Object.keys(a[t]), ...Object.keys(b[t])])) {
      const x = a[t][chave] || {}, y = b[t][chave] || {};
      m[t][chave] = { jogadas: Math.max(x.jogadas || 0, y.jogadas || 0), vencidas: Math.max(x.vencidas || 0, y.vencidas || 0) };
    }
  }
  return m;
}

/**
 * Números de cabeçalho da conta, para listar e ordenar jogadores sem abrir cada estatística.
 * @param {object} progresso
 */
export function resumoDoJogador(progresso) {
  const e = estatisticasDe(progresso);
  return {
    conquistas: Object.keys(progresso.desbloqueadas || {}).length,
    verbetesLidos: progresso.verbetesLidos || 0,
    acessos: e.acessos, ultimoAcesso: e.ultimoAcesso,
    partidas: e.partidas.terminadas, vitorias: e.partidas.vencidas, maos: e.maos.jogadas,
  };
}
