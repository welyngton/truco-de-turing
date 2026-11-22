/**
 * @file A equipe do jogo, mostrada na aba "Equipe" da tela Sobre (issue #135): o professor e os
 * autores, um cartão por pessoa.
 *
 * Cada pessoa tem `nome`, `papel` (o que fez ou quem é) e `miniCV` (texto curto, opcional). Os
 * papéis e o texto do professor são os que a tela Sobre já trazia; ninguém ganha texto novo aqui.
 * `miniCV: null` deixa o campo pronto para quando a pessoa enviar o dela. `foto` só existe para
 * quem autorizou o uso da imagem (hoje, o professor); sem foto, o cartão mostra um avatar gerado
 * a partir do nome.
 */
import { FOTO_PROFESSOR } from '../recursos/retratoProfessor.js';

/** O professor da disciplina. O `miniCV` é o texto que a seção "O professor" já tinha. */
export const PROFESSOR = {
  id: 'peng',
  nome: 'Peng Yaohao',
  papel: 'Professor da Universidade de Brasília',
  miniCV: 'Peng Yaohao é professor da Universidade de Brasília, mestre e doutor pela UnB na área de Finanças e Métodos Quantitativos. Pesquisa aprendizado de máquina, modelos não lineares e econometria financeira, com trabalhos sobre previsão de volatilidade e de preços de ações e um estudo empírico sobre não linearidade e overfitting em machine learning com dados da COVID-19.',
  foto: FOTO_PROFESSOR,
};

/** Os autores, na ordem em que sempre apareceram. */
export const AUTORES = [
  { id: 'welyngton', nome: 'Welyngton José Vinicius Dal Prá', papel: 'Truco de Turing (interface, arte, sons, conquistas e modo truco)', miniCV: null, foto: null },
  { id: 'diego', nome: 'Diego Casagrande', papel: 'Testes e validação das regras', miniCV: null, foto: null },
  { id: 'vinicius', nome: 'Vinícius Chiconato', papel: 'Correções nas regras', miniCV: null, foto: null },
  { id: 'suzy', nome: 'Suzy Arcanjo', papel: 'Verbetes das ações no Livro de conceitos', miniCV: null, foto: null },
];

/** Todas as pessoas, professor primeiro. */
export const EQUIPE = [PROFESSOR, ...AUTORES];

/** Iniciais para o avatar de quem não tem foto: primeira e última palavra do nome. */
export function iniciaisDe(nome) {
  const palavras = nome.trim().split(/\s+/);
  const letra = (p) => (p ? p[0].toUpperCase() : '');
  return palavras.length > 1 ? letra(palavras[0]) + letra(palavras[palavras.length - 1]) : letra(palavras[0]);
}
