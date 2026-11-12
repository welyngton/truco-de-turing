/**
 * @file Avatares que o jogador pode escolher. Os livres valem desde o início; os outros são
 * liberados por uma conquista. A escolha fica no progresso salvo no navegador (`progresso.avatar`)
 * até existirem contas (issue #11).
 */
import { CONQUISTAS } from './conquistas.js';

/**
 * Avatares do jogador, na ordem da tela de escolha. `conquista` é o id da conquista que libera o
 * avatar (null = livre). `tipo` é o desenho em arte/avatares.js.
 */
export const AVATARES_DO_JOGADOR = [
  { id: 'p1', nome: 'Truqueiro', descricao: 'Chapéu de palha e capim no canto da boca.', conquista: null },
  { id: 'p2', nome: 'Truqueiro de bigode', descricao: 'O parceiro de mesa, com lenço verde.', conquista: null },
  { id: 'robo', nome: 'Autômato', descricao: 'Latão, engrenagem e antena ligada.', conquista: null },
  { id: 'gato', nome: 'GatoNet', descricao: 'O gato do dropout, com crachá e tudo.', conquista: 'gato10' },
  { id: 'coruja', nome: 'Coruja da validação', descricao: 'Vigia o erro de validação e sabe a hora de parar.', conquista: 'earlystop' },
  { id: 'monge', nome: 'Monge do forward pass', descricao: 'Só ativa neurônios e confia no sinal.', conquista: 'zen' },
  { id: 'nobre', nome: 'Nobre', descricao: 'Coroa e arminho, para quem domina as figuras.', conquista: 'nobreza' },
  { id: 'decifrador', nome: 'Decifrador', descricao: 'O rotor de uma máquina de cifras, em homenagem a Turing.', conquista: 'campeao' },
  { id: 'cosmico', nome: 'Antimatéria', descricao: 'Um buraco negro: venceu com a rede estourada.', conquista: 'contra' },
];

/** O avatar está liberado neste progresso? */
export function avatarLiberado(avatar, progresso) {
  return !avatar.conquista || !!(progresso.desbloqueadas && progresso.desbloqueadas[avatar.conquista]);
}

/** Id do avatar do jogador: o escolhido, se estiver liberado; senão, o truqueiro. */
export function avatarDoJogador(progresso) {
  const escolhido = AVATARES_DO_JOGADOR.find((a) => a.id === progresso.avatar);
  return escolhido && avatarLiberado(escolhido, progresso) ? escolhido.id : 'p1';
}

/** Nome da conquista que libera o avatar. */
export function conquistaQueLibera(avatar) {
  const c = CONQUISTAS.find((x) => x.id === avatar.conquista);
  return c ? c.nome : '';
}

/** Avatares liberados por uma conquista (para avisar quando ela sai). */
export function avataresDaConquista(id) {
  return AVATARES_DO_JOGADOR.filter((a) => a.conquista === id);
}
