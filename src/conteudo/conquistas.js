/**
 * @file Conquistas e suas graduações (bronze a antimatéria, como sugere a especificação).
 *
 * Cada conquista tem um `teste(ctx)` avaliado ao fim de cada mão contra oponentes. O contexto é:
 * ```
 * { mao, eu, venceu, completa,          // estado final da mão, índice do humano, resultado, se foi jogada até o fim
 *   partida, venceuPartida, valorDaMao,  // camada de truco
 *   oponenteCorreu, opcoes,              // se o oponente correu do truco; opções do menu
 *   progresso }                          // contadores acumulados (ver progresso.js)
 * ```
 */
import { pontuarRede } from '../nucleo/pontuacao.js';
import { TERRENOS } from '../nucleo/terrenos.js';
import { BARALHOS } from '../nucleo/baralhos.js';
import { VERBETES } from './grimorio.js';
import { ARQUITETURAS } from '../nucleo/rede.js';

/** Graduações com nome e cor da medalha. */
export const GRADUACOES = {
  bronze: { nome: 'Bronze', cor: '#c0834a' },
  prata: { nome: 'Prata', cor: '#b8c2cc' },
  ouro: { nome: 'Ouro', cor: '#e7c35a' },
  platina: { nome: 'Platina', cor: '#9fe3e0' },
  adamantium: { nome: 'Adamantium', cor: '#b48cff' },
  antimateria: { nome: 'Antimatéria', cor: '#ff6fb1' },
};

/** Atalho: dados do jogador humano na mão encerrada. */
const meu = (c) => c.mao.jogadores[c.eu];

export const CONQUISTAS = [
  { id: 'primeira', nome: 'Primeira época', descricao: 'Vença sua primeira mão.', graduacao: 'bronze', teste: (c) => c.venceu },
  { id: 'dez', nome: 'Convergiu', descricao: 'Vença 10 mãos.', graduacao: 'prata', teste: (c) => c.progresso.vitorias >= 10 },
  { id: 'cinquenta', nome: 'Estado da arte', descricao: 'Vença 50 mãos.', graduacao: 'ouro', teste: (c) => c.progresso.vitorias >= 50 },
  { id: 'gato10', nome: 'Gato curioso', descricao: 'Faça 10 dropouts somando todas as mãos.', graduacao: 'bronze', teste: (c) => c.progresso.dropouts >= 10 },
  { id: 'gato100', nome: 'Sete vidas não bastam', descricao: 'Faça 100 dropouts.', graduacao: 'platina', teste: (c) => c.progresso.dropouts >= 100 },
  { id: 'zen', nome: 'Inferência pura', descricao: 'Vença uma mão sem executar nenhuma ação, só ativando neurônios.', graduacao: 'prata', teste: (c) => c.venceu && meu(c).acoesUsadas === 0 },
  { id: 'zen10', nome: 'Monge do forward pass', descricao: 'Vença 10 mãos sem executar nenhuma ação.', graduacao: 'adamantium', teste: (c) => c.progresso.vitoriasZen >= 10 },
  { id: 'desk', nome: 'Desk rejection', descricao: 'Aplique early stop ou stack overflow na sua própria rede.', graduacao: 'prata', teste: (c) => meu(c).estatisticas.autoParadas > 0 },
  { id: 'patos', nome: 'Marcha dos patos', descricao: 'Perca para um jogador que ficou travado numa camada oculta.', graduacao: 'ouro', teste: (c) => !c.venceu && c.mao.resultado.travados[c.mao.resultado.vencedor] },
  { id: 'contra', nome: 'Contra tudo e contra todos', descricao: 'Vença com uma rede que sofreu stack overflow.', graduacao: 'antimateria', teste: (c) => c.venceu && meu(c).situacao === 'overflow' },
  { id: 'artilheiro', nome: 'Artilheiro dos gols inúteis', descricao: 'Faça transfer learning e perca a mão mesmo assim.', graduacao: 'ouro', teste: (c) => !c.venceu && meu(c).transferUsado },
  { id: 'transfer', nome: 'Pré-treinado', descricao: 'Faça um transfer learning.', graduacao: 'prata', teste: (c) => meu(c).transferUsado },
  { id: 'vanishing', nome: 'Gradiente evaporado', descricao: 'Termine uma mão com alguma rede zerada por vanishing gradient.', graduacao: 'ouro', teste: (c) => c.mao.jogadores.some((_, j) => pontuarRede(c.mao, j).vanishing) },
  { id: 'overfit', nome: 'Regularizador', descricao: 'Aplique overfit no adversário.', graduacao: 'bronze', teste: (c) => meu(c).estatisticas.overfits > 0 },
  { id: 'earlystop', nome: 'Paciência de validação', descricao: 'Aplique early stop no adversário.', graduacao: 'prata', teste: (c) => meu(c).estatisticas.earlyStops > 0 },
  { id: 'overflow', nome: 'Segmentation fault', descricao: 'Aplique stack overflow no adversário.', graduacao: 'ouro', teste: (c) => meu(c).estatisticas.overflows > 0 },
  { id: 'trio', nome: 'Atenção multi-cabeça', descricao: 'Termine com um trio de figuras na sua rede.', graduacao: 'prata', teste: (c) => pontuarRede(c.mao, c.eu).combos.some((k) => k.quantidade === 3) },
  { id: 'sessenta', nome: 'Rede profunda', descricao: 'Termine uma mão com 60 pontos ou mais.', graduacao: 'ouro', teste: (c) => c.mao.resultado.somas[c.eu] >= 60 },
  { id: 'truco', nome: 'Truco, marreco!', descricao: 'Vença uma mão trucada.', graduacao: 'bronze', teste: (c) => c.venceu && c.valorDaMao >= 3 },
  { id: 'doze', nome: 'Vale a partida', descricao: 'Vença uma mão valendo 12 tentos.', graduacao: 'platina', teste: (c) => c.venceu && c.valorDaMao >= 12 },
  { id: 'correu', nome: 'Corre que é cilada', descricao: 'Faça o oponente correr do truco.', graduacao: 'prata', teste: (c) => c.oponenteCorreu },
  { id: 'campeao', nome: 'Campeão da mesa', descricao: 'Vença uma partida de 12 tentos.', graduacao: 'ouro', teste: (c) => c.venceuPartida },
  { id: 'maquina', nome: 'Venceu a máquina', descricao: 'Vença o Mestre Monte Carlo numa partida de 12 tentos.', graduacao: 'adamantium', teste: (c) => c.venceuPartida && c.opcoes.oponente === 'montecarlo' },
  { id: 'cartografo', nome: 'Cartógrafo', descricao: 'Vença mãos em todos os terrenos.', graduacao: 'platina', teste: (c) => Object.keys(TERRENOS).every((t) => c.progresso.terrenos[t]) },
  { id: 'colecionador', nome: 'Colecionador', descricao: 'Vença mãos com todos os baralhos.', graduacao: 'platina', teste: (c) => Object.keys(BARALHOS).every((b) => c.progresso.baralhos[b]) },
  { id: 'zap', nome: 'Zap na saída', descricao: 'Vença com o Zap (4♣) na rede, no baralho de truco.', graduacao: 'ouro', teste: (c) => c.venceu && c.mao.config.baralho === 'truco' && meu(c).caminho.some((id) => { const carta = c.mao.neuronios[id].cartas[0]; return carta.valor === '4' && carta.naipe === 'P'; }) },
  { id: 'biblio', nome: 'Bibliotecário', descricao: 'Leia todos os verbetes da Biblioteca de conceitos.', graduacao: 'prata', teste: (c) => c.progresso.verbetesLidos >= VERBETES.length },
  /* conquistas da fusão: baralhos, mesas e arquiteturas do NeuroDeck */
  { id: 'nobreza', nome: 'Sangue azul', descricao: 'Vença uma mão do baralho Nobreza com figuras iguais vizinhas na sua rede.', graduacao: 'prata', teste: (c) => c.venceu && c.mao.config.baralho === 'nobreza' && pontuarRede(c.mao, c.eu).neuronios.some((n) => n.notas.includes('×2 figura')) },
  { id: 'backprop', nome: 'Forward pass de ouro', descricao: 'Termine uma mão do baralho Backprop com a saída da sua rede em 45 ou mais.', graduacao: 'ouro', teste: (c) => c.mao.config.baralho === 'backprop' && c.mao.resultado.somas[c.eu] >= 45 },
  { id: 'tunador', nome: 'Ajuste fino', descricao: 'Faça 3 tunagens numa mesma mão.', graduacao: 'bronze', teste: (c) => meu(c).estatisticas.tunagens >= 3 },
  { id: 'batch', nome: 'Batch grande', descricao: 'Vença uma mão com 4 ou mais jogadores na mesa.', graduacao: 'prata', teste: (c) => c.venceu && c.mao.jogadores.length >= 4 },
  { id: 'ensemble', nome: 'Ensemble', descricao: 'Vença uma mão contra quatro adversários (5 jogadores).', graduacao: 'ouro', teste: (c) => c.venceu && c.mao.jogadores.length >= 5 },
  { id: 'bigdata', nome: 'Big data', descricao: 'Vença uma mão jogada com 3 baralhos.', graduacao: 'prata', teste: (c) => c.venceu && c.mao.config.baralhos >= 3 },
  { id: 'profunda', nome: 'Deep learning de verdade', descricao: 'Vença uma mão na arquitetura profunda.', graduacao: 'prata', teste: (c) => c.venceu && c.mao.config.arquitetura === 'profunda' },
  { id: 'arquiteto', nome: 'Arquiteto de redes', descricao: 'Vença mãos em todas as arquiteturas (padrão, curta, profunda e larga).', graduacao: 'platina', teste: (c) => Object.keys(ARQUITETURAS).every((a) => c.progresso.arquiteturas && c.progresso.arquiteturas[a]) },
];

/** Conquistas que podem ser ganhas mesmo quando a mão termina porque alguém correu do truco. */
export const VALEM_SEM_MAO_COMPLETA = new Set(['correu', 'campeao', 'maquina', 'primeira', 'dez', 'cinquenta', 'gato10', 'gato100', 'biblio', 'truco', 'doze', 'cartografo', 'colecionador', 'arquiteto']);
