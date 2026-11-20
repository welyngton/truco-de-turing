/**
 * @file Placar global (issue #154): cada conta publica em `placar/<uid>` um resumo anônimo do
 * próprio progresso (só números e os ids das conquistas, sem nome nem e-mail), e quem está
 * conectado lê todos eles para ver a raridade das conquistas e a própria posição entre os
 * jogadores. As contas em si (`contas/<uid>`) continuam privadas.
 *
 * Só lógica, sem navegador nem Firebase (testável no Node): montar o documento do placar a partir
 * do progresso (`placarDoJogador`) e analisar os documentos lidos (`analisarPlacar`).
 */
import { CONQUISTAS } from '../conteudo/conquistas.js';
import { estatisticasDe } from './estatisticas.js';

/**
 * Números do placar: chave no documento, nome na tela e como mostrar (`tempo` vira horas e minutos).
 * São as chaves aceitas pelas regras do Firestore (firestore.rules, `placarValido`).
 */
export const CAMPOS_DO_PLACAR = [
  { chave: 'conquistas', rotulo: 'Conquistas' },
  { chave: 'maosVencidas', rotulo: 'Mãos vencidas' },
  { chave: 'maos', rotulo: 'Mãos jogadas' },
  { chave: 'partidasVencidas', rotulo: 'Partidas vencidas' },
  { chave: 'pontos', rotulo: 'Pontos de rede (todas as mãos)' },
  { chave: 'maiorRede', rotulo: 'Maior rede numa mão' },
  { chave: 'maiorSequencia', rotulo: 'Maior sequência de mãos vencidas' },
  { chave: 'dropouts', rotulo: 'Dropouts' },
  { chave: 'vitoriasZen', rotulo: 'Vitórias sem usar ações' },
  { chave: 'trucos', rotulo: 'Trucos pedidos' },
  { chave: 'verbetes', rotulo: 'Verbetes lidos' },
  { chave: 'tempo', rotulo: 'Tempo em partida', formato: 'tempo' },
];

/** Quantas conquistas cabem no documento (as regras aceitam até isso). */
export const MAXIMO_DE_IDS = 200;

const inteiro = (n) => Math.max(0, Math.round(Number(n) || 0));

/**
 * Documento que a conta publica em `placar/<uid>`.
 * @param {object} progresso Progresso da conta (conteudo/progresso.js).
 * @returns {object} Números inteiros por campo (`tempo` em segundos), `ids` das conquistas feitas e `atualizado` (ms).
 */
export function placarDoJogador(progresso, agora = Date.now()) {
  const e = estatisticasDe(progresso), ids = Object.keys(progresso.desbloqueadas || {}).slice(0, MAXIMO_DE_IDS);
  return {
    conquistas: ids.length, maosVencidas: inteiro(progresso.vitorias), maos: inteiro(progresso.maos),
    partidasVencidas: inteiro(e.partidas.vencidas), pontos: inteiro(progresso.pontos),
    maiorRede: inteiro(e.recordes.maiorRede), maiorSequencia: inteiro(e.recordes.maiorSequencia),
    dropouts: inteiro(progresso.dropouts), vitoriasZen: inteiro(progresso.vitoriasZen), trucos: inteiro(e.trucos.pedidos),
    verbetes: inteiro(progresso.verbetesLidos), tempo: Math.round(inteiro(e.tempoDePartida) / 1000),
    ids, atualizado: inteiro(agora),
  };
}

/** Texto do valor de um campo: números com separador de milhar e o tempo em horas e minutos. */
export function formatarCampo(campo, valor) {
  if (campo.formato === 'tempo') return formatarTempo(valor * 1000);
  return Number(valor || 0).toLocaleString('pt-BR');
}

/** Duração em português: "2 h 05 min", "7 min 30 s" ou "45 s". */
export function formatarTempo(ms) {
  const s = Math.max(0, Math.round((Number(ms) || 0) / 1000));
  if (s < 60) return s + ' s';
  const m = Math.floor(s / 60);
  if (m < 60) return m + ' min ' + String(s % 60).padStart(2, '0') + ' s';
  return Math.floor(m / 60) + ' h ' + String(m % 60).padStart(2, '0') + ' min';
}

const mediana = (valores) => {
  const v = [...valores].sort((a, b) => a - b), n = v.length;
  if (!n) return 0;
  return n % 2 ? v[(n - 1) / 2] : Math.round((v[n / 2 - 1] + v[n / 2]) / 2);
};

/**
 * Analisa os documentos do placar do ponto de vista de `uid`.
 * - raridade de cada conquista: quantos jogadores a têm e a porcentagem (da mais rara à mais comum);
 * - posição em cada campo: 1 + quantos têm valor maior (empate divide a posição), a porcentagem
 *   de jogadores que ficaram abaixo e o valor do líder e o da mediana.
 * @param {Array<object & {uid: string}>} docs Documentos de `placar/` com o `uid` de cada um.
 * @param {string} uid Conta de quem olha (precisa estar em `docs`).
 * @returns {{jogadores: number, meu: object|null, raridade: object[], posicoes: object[]}}
 */
export function analisarPlacar(docs, uid) {
  const jogadores = docs.length, meu = docs.find((d) => d.uid === uid) || null;
  const contagem = new Map();
  for (const d of docs) for (const id of new Set(Array.isArray(d.ids) ? d.ids : [])) contagem.set(id, (contagem.get(id) || 0) + 1);
  const raridade = CONQUISTAS.map((c) => {
    const quantos = contagem.get(c.id) || 0;
    return { id: c.id, quantos, porcento: jogadores ? Math.round((1000 * quantos) / jogadores) / 10 : 0, minha: !!(meu && Array.isArray(meu.ids) && meu.ids.includes(c.id)) };
  }).sort((a, b) => a.quantos - b.quantos || CONQUISTAS.findIndex((c) => c.id === a.id) - CONQUISTAS.findIndex((c) => c.id === b.id));
  const posicoes = !meu ? [] : CAMPOS_DO_PLACAR.map((campo) => {
    const valores = docs.map((d) => inteiro(d[campo.chave])), valor = inteiro(meu[campo.chave]);
    const maiores = valores.filter((v) => v > valor).length, menores = valores.filter((v) => v < valor).length;
    return {
      ...campo, valor, posicao: maiores + 1, de: jogadores,
      melhorQue: jogadores > 1 ? Math.round((100 * menores) / (jogadores - 1)) : 0,
      lider: Math.max(...valores), mediana: mediana(valores),
    };
  });
  return { jogadores, meu, raridade, posicoes };
}
