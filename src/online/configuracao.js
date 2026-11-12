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
  apiKey: 'AIzaSyCAqlXwLR3Cl8DrgkLIoIS5A0zcF5TGfng',
  authDomain: 'truco-e26e8.firebaseapp.com',
  projectId: 'truco-e26e8',
  storageBucket: 'truco-e26e8.firebasestorage.app',
  messagingSenderId: '932294943078',
  appId: '1:932294943078:web:e5d0edf14d5a44de45a8a7',
  /* sem measurementId: o jogo não usa o Google Analytics */
};

/** Versão do SDK do Firebase carregada do CDN oficial. */
export const VERSAO_FIREBASE = '10.12.2';
