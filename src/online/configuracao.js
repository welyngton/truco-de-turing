/**
 * @file Configuração do projeto Firebase do grupo (Authentication + Firestore), usada pelas contas
 * e pelas partidas pela internet. Enquanto for `null`, o jogo oferece só a conta local (neste
 * aparelho) e as partidas entre abas e janelas do mesmo navegador.
 *
 * Para ligar: no console do Firebase, crie o projeto, ative Authentication (Google e
 * e-mail/senha) e o Firestore, publique as regras de `firestore.rules`, registre um app da Web e
 * cole aqui o objeto `firebaseConfig` que o console mostra. Esses valores não são segredo: quem
 * protege os dados são as regras do Firestore.
 */
export const FIREBASE = {
  /* projeto "truco-e26e8" no console, de ID truco-e26e8-703bc; app da Web "truco-de-turing" */
  apiKey: 'AIzaSyCH3yfsmf0KJQ0hJ7aU4DhCBcBVOqwRSHs',
  authDomain: 'truco-e26e8-703bc.firebaseapp.com',
  projectId: 'truco-e26e8-703bc',
  storageBucket: 'truco-e26e8-703bc.firebasestorage.app',
  messagingSenderId: '832619971345',
  appId: '1:832619971345:web:b50cd62330112e05b942b0',
  /* sem measurementId: o Google Analytics é carregado à parte, com consentimento (interface/analise.js) */
};

/** Versão do SDK do Firebase carregada do CDN oficial. */
export const VERSAO_FIREBASE = '10.12.2';
