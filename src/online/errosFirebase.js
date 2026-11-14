/**
 * @file Erros do Firebase em português, dizendo o que fazer. Os códigos que vêm de configuração
 * que falta no console (login desativado, domínio não autorizado, Firestore não criado, regras
 * não publicadas) apontam o passo do guia `docs/FIREBASE.md`, para quem testa saber onde mexer.
 */

/** Mensagem por código de erro do Firebase (Authentication e Firestore). */
const MENSAGENS = {
  /* configuração do projeto no console (docs/FIREBASE.md) */
  'auth/operation-not-allowed': 'Esse jeito de entrar ainda não está ativado no projeto Firebase (Authentication > Método de login).',
  'auth/unauthorized-domain': 'Este endereço ainda não está autorizado no projeto Firebase (Authentication > Configurações > Domínios autorizados).',
  'auth/configuration-not-found': 'O Authentication ainda não foi ativado no projeto Firebase.',
  'auth/invalid-api-key': 'A chave do app da Web em src/online/configuracao.js não confere com o projeto Firebase.',
  'auth/api-key-not-valid.-please-pass-a-valid-api-key.': 'A chave do app da Web em src/online/configuracao.js não confere com o projeto Firebase.',
  'permission-denied': 'O Firestore recusou o pedido: confira se as regras de firestore.rules foram publicadas e se a conta está conectada.',
  'not-found': 'O banco Firestore do projeto ainda não foi criado (Firestore Database > Criar banco de dados).',
  'failed-precondition': 'O banco Firestore do projeto ainda não foi criado ou não está pronto.',
  /* o que acontece com qualquer pessoa */
  'auth/popup-blocked': 'O navegador bloqueou a janela do Google. Libere as janelas deste site e tente de novo.',
  'auth/operation-not-supported-in-environment': 'Este navegador não abre a janela do Google aqui. Entre com e-mail e senha.',
  'auth/network-request-failed': 'Sem conexão com o Firebase. Confira a internet e tente de novo.',
  'unavailable': 'Sem conexão com o Firebase. Confira a internet e tente de novo.',
  'auth/too-many-requests': 'Muitas tentativas seguidas. Espere um pouco e tente de novo.',
  'auth/invalid-email': 'Esse e-mail não parece válido.',
  'auth/missing-email': 'Escreva o e-mail.',
  'auth/missing-password': 'Escreva a senha.',
  'auth/weak-password': 'A senha precisa ter pelo menos 6 caracteres.',
  'auth/email-already-in-use': 'Já existe uma conta com esse e-mail. Use "Entrar com e-mail".',
  'auth/invalid-credential': 'E-mail ou senha não conferem.',
  'auth/invalid-login-credentials': 'E-mail ou senha não conferem.',
  'auth/wrong-password': 'E-mail ou senha não conferem.',
  'auth/user-not-found': 'Não há conta com esse e-mail. Use "Criar conta".',
  'auth/user-disabled': 'Esta conta foi desativada.',
  'auth/account-exists-with-different-credential': 'Esse e-mail já entra de outro jeito (Google ou e-mail e senha). Use o mesmo de antes.',
};

/** Quem fechou a janela do Google desistiu: não é erro para avisar. */
const DESISTIU = new Set(['auth/popup-closed-by-user', 'auth/cancelled-popup-request', 'auth/user-cancelled']);

/**
 * Explica um erro do Firebase.
 * @param {any} erro Erro do SDK (com `code`) ou qualquer outro.
 * @returns {string|null} Mensagem para o jogador, ou null quando ele mesmo desistiu (não avisar).
 */
export function explicarErroFirebase(erro) {
  /* o SDK às vezes só põe o código no texto: "Firebase: Error (auth/xyz)." */
  const noTexto = /\(([a-z-]+\/[a-z0-9.-]+)\)/i.exec(String((erro && erro.message) || ''));
  const codigo = String((erro && erro.code) || (noTexto && noTexto[1]) || '').toLowerCase();
  if (DESISTIU.has(codigo)) return null;
  if (MENSAGENS[codigo]) return MENSAGENS[codigo];
  const texto = String((erro && erro.message) || erro || '').replace(/^Firebase:\s*/, '').trim();
  return texto || 'Algo deu errado com o Firebase.';
}
