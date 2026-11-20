/**
 * @file Conquistas e suas graduações (bronze a antimatéria, como sugere a especificação, e a
 * Singularidade da conquista final, "Convergência global", em homenagem ao prof. Peng).
 *
 * Cada conquista tem um `teste(ctx)` avaliado ao fim de cada mão contra oponentes. O contexto é:
 * ```
 * { mao, eu, venceu, completa,          // estado final da mão, índice do humano, resultado, se foi jogada até o fim
 *   partida, venceuPartida, valorDaMao,  // camada de truco
 *   oponenteCorreu, opcoes,              // se o oponente correu do truco; opções do menu
 *   progresso }                          // contadores acumulados (ver progresso.js)
 * ```
 * Os testes das conquistas novas leem também `mao.lances` (o que cada jogador fez, em ordem; ver nucleo/partida.js)
 * e `partida.iniciadaEm`.
 *
 * As de `VALEM_NA_HORA` também são avaliadas logo depois de cada jogada, no meio da mão, com um
 * contexto menor: `{ mao, eu, opcoes, progresso }`.
 */
import { pontuarRede } from '../nucleo/pontuacao.js';
import { TERRENOS } from '../nucleo/terrenos.js';
import { BARALHOS } from '../nucleo/baralhos.js';
import { VERBETES } from './grimorio.js';
import { ARQUITETURAS, TAMANHO_MAO } from '../nucleo/rede.js';

/**
 * Graduações com nome e cor da medalha. `especial` ganha medalha furta-cor e aviso maior: é a
 * Singularidade, só da conquista final.
 */
export const GRADUACOES = {
  bronze: { nome: 'Bronze', cor: '#c0834a' },
  prata: { nome: 'Prata', cor: '#b8c2cc' },
  ouro: { nome: 'Ouro', cor: '#e7c35a' },
  platina: { nome: 'Platina', cor: '#9fe3e0' },
  adamantium: { nome: 'Adamantium', cor: '#b48cff' },
  antimateria: { nome: 'Antimatéria', cor: '#ff6fb1' },
  singularidade: { nome: 'Singularidade', cor: '#efe2ff', especial: true },
};

/** Id da conquista final, a que desbloqueia quando todas as outras estão desbloqueadas. */
export const CONQUISTA_FINAL = 'convergencia';

/**
 * Progresso até a conquista final: quantas das outras conquistas já estão desbloqueadas. Conta a
 * lista atual, então uma conquista nova (de uma versão futura ou de um mod) entra na conta sozinha.
 * @param {object} [desbloqueadas] id → data do desbloqueio (ver progresso.js)
 * @returns {{feitas: number, total: number}}
 */
export function progressoDaFinal(desbloqueadas = {}) {
  const outras = CONQUISTAS.filter((c) => c.id !== CONQUISTA_FINAL);
  return { feitas: outras.filter((c) => desbloqueadas[c.id]).length, total: outras.length };
}

/** Atalho: dados do jogador humano na mão encerrada. */
const meu = (c) => c.mao.jogadores[c.eu];

/* ---- leitura dos lances da mão (mao.lances, ver nucleo/partida.js) ---- */

/** Ataques ao neurônio de alguém: overfit, early stop e stack overflow. */
const ATAQUES = ['overfit', 'earlystop', 'stackoverflow'];
/** Motivos de uma rede ter parado por early stop ou stack overflow, do adversário ou da própria. */
const PARADAS = ['earlystop', 'stackoverflow', 'auto-earlystop', 'auto-stackoverflow'];
/** Lances da mão (vazio se a mão não os guardou). */
const lancesDa = (c) => c.mao.lances || [];
/** Lances do jogador humano. */
const meusLances = (c) => lancesDa(c).filter((l) => l.jogador === c.eu);
/** Ataque do jogador a um neurônio de outro jogador (`tipo` opcional). */
const ataqueMeu = (c, l, tipo) => l.jogador === c.eu && l.alvo !== c.eu && (tipo ? l.tipo === tipo : ATAQUES.includes(l.tipo));
/** Camada oculta da mesa (nem entrada nem saída)? */
const ehOcultaDaMesa = (c, camada) => camada > 0 && camada < c.mao.camadas.length - 1;
/** Alguma carta de valor `rank` e naipe `suit` do motor sobra na mão? Para o Royal Flush: A, 10, J, Q e K do mesmo naipe. */
const temRoyalFlush = (cartas) => ['S', 'H', 'C', 'D'].some((naipe) => [1, 10, 11, 12, 13].every((rank) => cartas.some((k) => k.suit === naipe && k.rank === rank)));
/** Maior desvantagem do jogador em relação ao líder entre os outros, olhando a soma de cada rede a cada jogada. */
const maiorDesvantagem = (c) => Math.max(0, ...(c.mao.historico || []).map((soma) => Math.max(...soma.filter((_, i) => i !== c.eu)) - soma[c.eu]));

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
  { id: 'biblio', nome: 'Bibliotecário', descricao: 'Leia todos os verbetes do Glossário.', graduacao: 'prata', teste: (c) => c.progresso.verbetesLidos >= VERBETES.length },
  /* conquistas da fusão: baralhos, mesas e arquiteturas do motor */
  { id: 'nobreza', nome: 'Sangue azul', descricao: 'Vença uma mão do baralho Nobreza com figuras iguais vizinhas na sua rede.', graduacao: 'prata', teste: (c) => c.venceu && c.mao.config.baralho === 'nobreza' && pontuarRede(c.mao, c.eu).neuronios.some((n) => n.notas.includes('×2 figura')) },
  { id: 'backprop', nome: 'Forward pass de ouro', descricao: 'Termine uma mão do baralho Backprop com a saída da sua rede em 45 ou mais.', graduacao: 'ouro', teste: (c) => c.mao.config.baralho === 'backprop' && c.mao.resultado.somas[c.eu] >= 45 },
  { id: 'tunador', nome: 'Ajuste fino', descricao: 'Faça 3 tunagens numa mesma mão.', graduacao: 'bronze', teste: (c) => meu(c).estatisticas.tunagens >= 3 },
  { id: 'batch', nome: 'Batch grande', descricao: 'Vença uma mão com 4 ou mais jogadores na mesa.', graduacao: 'prata', teste: (c) => c.venceu && c.mao.jogadores.length >= 4 },
  { id: 'ensemble', nome: 'Ensemble', descricao: 'Vença uma mão contra quatro adversários (5 jogadores).', graduacao: 'ouro', teste: (c) => c.venceu && c.mao.jogadores.length >= 5 },
  { id: 'bigdata', nome: 'Big data', descricao: 'Vença uma mão jogada com 3 baralhos.', graduacao: 'prata', teste: (c) => c.venceu && c.mao.config.baralhos >= 3 },
  { id: 'profunda', nome: 'Deep learning de verdade', descricao: 'Vença uma mão na arquitetura profunda.', graduacao: 'prata', teste: (c) => c.venceu && c.mao.config.arquitetura === 'profunda' },
  { id: 'arquiteto', nome: 'Arquiteto de redes', descricao: 'Vença mãos em todas as arquiteturas (padrão, curta, profunda e larga).', graduacao: 'platina', teste: (c) => Object.keys(ARQUITETURAS).every((a) => c.progresso.arquiteturas && c.progresso.arquiteturas[a]) },
  /* conquistas sugeridas pelo professor Peng (issue #117): leem os lances da mão e, algumas, o relógio da partida */
  { id: 'fio', nome: 'Por um fio', descricao: 'Vença ou perca uma mão por algum critério de desempate.', graduacao: 'prata', teste: (c) => c.completa && !!c.mao.estadoMotor.tiebreak && (c.mao.estadoMotor.ranking || []).slice(0, 2).includes(c.eu) },
  { id: 'validacao', nome: 'Validação cruzada', descricao: 'Vença uma mão aplicando dropouts em todas as camadas ocultas.', graduacao: 'prata', teste: (c) => c.venceu && c.mao.camadas.every((_, camada) => !ehOcultaDaMesa(c, camada) || meusLances(c).some((l) => l.tipo === 'dropout' && l.camadas.includes(camada))) },
  { id: 'coldstart', nome: 'Cold start', descricao: 'Sofra um stack overflow na primeira camada oculta.', graduacao: 'ouro', teste: (c) => lancesDa(c).some((l) => l.tipo === 'stackoverflow' && l.alvo === c.eu && l.camada === 1) },
  { id: 'featureeng', nome: 'Feature Engineering', descricao: 'Vença uma mão aplicando pelo menos 5 tunagens numa rede de arquitetura profunda.', graduacao: 'ouro', teste: (c) => c.venceu && c.mao.config.arquitetura === 'profunda' && meu(c).estatisticas.tunagens >= 5 },
  {
    id: 'uno', nome: 'Uno Reverse Card', descricao: 'Aplique stack overflow num neurônio em que o seu oponente acabou de aplicar tunagem.', graduacao: 'ouro',
    teste: (c) => {
      const lances = lancesDa(c);
      return lances.some((l, i) => {
        if (!ataqueMeu(c, l, 'stackoverflow')) return false;
        /* a jogada anterior de verdade: sem as redes travadas nem os dropouts e transfers do próprio jogador */
        let k = i - 1;
        while (k >= 0 && (lances[k].tipo === 'travada' || (lances[k].jogador === c.eu && !lances[k].consomeVez))) k--;
        return k >= 0 && lances[k].tipo === 'tunagem' && lances[k].jogador === l.alvo && lances[k].camada === l.camada;
      });
    },
  },
  { id: 'namekusei', nome: 'Adeus, Namekusei', descricao: 'Vença uma partida de 12 tentos em menos de 5 minutos.', graduacao: 'ouro', teste: (c) => c.venceuPartida && c.partida.alvo === 12 && !!c.partida.iniciadaEm && Date.now() - c.partida.iniciadaEm < 5 * 60 * 1000 },
  {
    id: 'semspoon', nome: 'There is no spoon', descricao: 'Aplique um stack overflow no oponente no primeiro neurônio que ele revelar (a entrada é imune, então vale o primeiro oculto).', graduacao: 'ouro',
    teste: (c) => {
      const lances = lancesDa(c);
      return lances.some((l, i) => ataqueMeu(c, l, 'stackoverflow') && l.camada === 1
        && lances.slice(0, i).filter((o) => o.tipo === 'ativar' && o.jogador === l.alvo && o.camada === 1).length === 1);
    },
  },
  { id: 'cincoreis', nome: 'A escada dos cinco Reis', descricao: 'Vença uma partida de 12 tentos com 5 jogadores.', graduacao: 'ouro', teste: (c) => c.venceuPartida && c.partida.alvo === 12 && c.mao.jogadores.length === 5 },
  { id: 'semquerer', nome: 'Foi sem querer querendo', descricao: 'Vença uma mão aplicando pelo menos 3 dropouts que revelaram a seguir cartas de maior valor, depois de todos os bônus.', graduacao: 'ouro', teste: (c) => c.venceu && meusLances(c).filter((l) => l.tipo === 'dropout' && l.revelouMaior).length >= 3 },
  { id: 'uniao', nome: 'Na União Soviética, a dimensão é VC', descricao: 'Impeça o seu oponente de prosseguir na rede por falta de neurônios disponíveis em alguma camada oculta.', graduacao: 'adamantium', teste: (c) => lancesDa(c).some((l) => l.tipo === 'travada' && l.jogador !== c.eu && ehOcultaDaMesa(c, l.camada)) },
  {
    id: 'bias', nome: 'All your bias are belong to us', descricao: 'Aplique overfit no oponente em 3 turnos consecutivos.', graduacao: 'adamantium',
    teste: (c) => {
      /* só os lances que gastam a vez contam como turno; dropout e transfer não interrompem a sequência */
      const turnos = meusLances(c).filter((l) => l.consomeVez);
      return turnos.some((_, i) => i >= 2 && turnos.slice(i - 2, i + 1).every((l) => ataqueMeu(c, l, 'overfit')));
    },
  },
  { id: 'exodia', nome: 'Exodia, obliterar!', descricao: 'Ganhe uma mão com um Royal Flush dentre as cartas não jogadas.', graduacao: 'adamantium', teste: (c) => c.venceu && temRoyalFlush(c.mao.estadoMotor.hands[c.eu]) },
  {
    id: 'dominio', nome: 'Expansão de Domínio', descricao: 'Esvazie a sua mão apenas aplicando ações contra cartas do adversário.', graduacao: 'adamantium',
    teste: (c) => {
      const gastos = meusLances(c).filter((l) => l.cartas > 0);
      const maoInicial = TAMANHO_MAO * (c.mao.estadoMotor.handCopies || 1);
      return c.mao.estadoMotor.hands[c.eu].length === 0 && gastos.length > 0 && gastos.every((l) => ataqueMeu(c, l)) && gastos.reduce((soma, l) => soma + l.cartas, 0) === maoInicial;
    },
  },
  { id: 'redencao', nome: 'Redenção de Akaza', descricao: 'Perca uma mão após aplicar stack overflow em si mesmo na última camada oculta da rede.', graduacao: 'adamantium', teste: (c) => c.completa && !c.venceu && meusLances(c).some((l) => l.tipo === 'stackoverflow' && l.alvo === c.eu && l.camada === c.mao.camadas.length - 2) },
  { id: 'balas', nome: 'Ideias são à prova de balas', descricao: 'Vença uma mão após ser impedido de prosseguir na rede por falta de neurônios disponíveis em alguma camada oculta.', graduacao: 'adamantium', teste: (c) => c.venceu && lancesDa(c).some((l) => l.tipo === 'travada' && l.jogador === c.eu && ehOcultaDaMesa(c, l.camada)) },
  { id: 'diganome', nome: 'Diga meu nome', descricao: 'Acumule um total de 737000 pontos no placar ao longo de todas as mãos e partidas.', graduacao: 'adamantium', teste: (c) => c.progresso.pontos >= 737000 },
  { id: 'portal', nome: 'Portal C-137', descricao: 'Vença uma mão com mais de 100 pontos tendo aplicado stack overflow no oponente.', graduacao: 'antimateria', teste: (c) => c.venceu && c.mao.resultado.somas[c.eu] > 100 && meu(c).estatisticas.overflows > 0 },
  {
    id: 'alianca', nome: 'Aliança Shinobi no Jutsu', descricao: 'Vença uma mão aplicando 5 tipos de ações distintas.', graduacao: 'antimateria',
    teste: (c) => {
      /* tunagem, dropout e transfer, mais cada ataque ao adversário (early stop e stack overflow em si não contam como outro tipo) */
      const tipos = new Set(meusLances(c).filter((l) => ['tunagem', 'dropout', 'transfer'].includes(l.tipo) || ataqueMeu(c, l)).map((l) => l.tipo));
      return c.venceu && tipos.size >= 5;
    },
  },
  { id: 'doismais', nome: '2 + 2 = ?', descricao: 'Perca uma mão em que ambos os jogadores sofreram early stop ou stack overflow.', graduacao: 'antimateria', teste: (c) => c.completa && !c.venceu && c.mao.estadoMotor.nets.every((rede) => PARADAS.includes(rede.reason)) },
  { id: 'virada', nome: 'Rede da virada, rede do amor', descricao: 'Vença uma mão revertendo uma desvantagem de 60 pontos ou mais no placar.', graduacao: 'antimateria', teste: (c) => c.venceu && maiorDesvantagem(c) >= 60 },
  /* conquista final (CONQUISTA_FINAL), sempre a última da lista: a Aplicacao a concede logo depois da última que faltava */
  { id: 'convergencia', nome: 'Convergência global', descricao: 'Desbloqueie todas as outras conquistas. Em homenagem ao prof. Peng Yaohao.', graduacao: 'singularidade', teste: (c) => { const { feitas, total } = progressoDaFinal(c.progresso.desbloqueadas); return feitas === total; } },
];

/** Conquistas que podem ser ganhas mesmo quando a mão termina porque alguém correu do truco. */
export const VALEM_SEM_MAO_COMPLETA = new Set(['correu', 'campeao', 'maquina', 'primeira', 'dez', 'cinquenta', 'gato10', 'gato100', 'biblio', 'truco', 'doze', 'cartografo', 'colecionador', 'arquiteto', 'namekusei', 'diganome']);

/**
 * Conquistas que valem na hora da jogada, sem esperar a mão acabar: dependem só do que o jogador já
 * fez (ações e dropouts). Na jogada, `progresso.dropouts` já soma os dropouts da mão em andamento.
 */
export const VALEM_NA_HORA = new Set(['gato10', 'gato100', 'desk', 'transfer', 'overfit', 'earlystop', 'overflow', 'tunador', 'coldstart', 'uno', 'semspoon', 'uniao', 'bias', 'dominio']);
