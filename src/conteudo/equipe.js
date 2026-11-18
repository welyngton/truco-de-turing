/**
 * @file A equipe do jogo, mostrada na aba "Equipe" da tela Sobre (um cartão por pessoa).
 *
 * É só dados: para completar um cartão, preencha `curriculo` (um parágrafo curto, texto simples) e,
 * se houver foto, `foto`. Pessoa sem `curriculo` aparece com "Mini-CV a caminho"; sem `foto`, com
 * as iniciais. Os textos vêm de cada pessoa: não inventamos currículo de ninguém.
 *
 * Campos:
 *  - `id`: identificador estável;
 *  - `nome`, `papel`: como aparecem no cartão;
 *  - `curriculo`: mini-CV (ou `null` enquanto não chega);
 *  - `foto`: chave da foto (`'professor'` usa o retrato em moldura; `null` mostra as iniciais).
 */
export const EQUIPE = [
  {
    id: 'peng', nome: 'Peng Yaohao', papel: 'Professor da disciplina (FPO 2026/2, PPCA/UnB)', foto: 'professor',
    curriculo: 'Professor da Universidade de Brasília, mestre e doutor pela UnB na área de Finanças e Métodos Quantitativos. Pesquisa aprendizado de máquina, modelos não lineares e econometria financeira, com trabalhos sobre previsão de volatilidade e de preços de ações e um estudo empírico sobre não linearidade e overfitting em machine learning com dados da COVID-19.',
  },
  { id: 'welyngton', nome: 'Welyngton José Vinicius Dal Prá', papel: 'Truco de Turing: interface, arte, sons, conquistas e modo truco', foto: null, curriculo: null },
  { id: 'diego', nome: 'Diego Casagrande', papel: 'Testes e validação das regras', foto: null, curriculo: null },
  { id: 'vinicius', nome: 'Vinícius Chiconato', papel: 'Correções nas regras', foto: null, curriculo: null },
  { id: 'suzy', nome: 'Suzy Arcanjo', papel: 'Verbetes das ações no Livro de conceitos', foto: null, curriculo: null },
];

/** Iniciais para o cartão sem foto: primeira e última palavra do nome (Welyngton Prá → "WP"). */
export function iniciaisDe(nome) {
  const palavras = String(nome).trim().split(/\s+/).filter(Boolean);
  if (!palavras.length) return '';
  const primeira = palavras[0][0], ultima = palavras.length > 1 ? palavras[palavras.length - 1][0] : '';
  return (primeira + ultima).toUpperCase();
}
