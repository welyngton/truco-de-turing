/**
 * @file Erros do Firebase em português (src/online/errosFirebase.js): cada código vira uma frase
 * que diz o que fazer, e quem desistiu do login não recebe aviso.
 *
 * Rodar: node --test testes/unidade/erros-firebase.test.js
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { explicarErroFirebase } from '../../src/online/errosFirebase.js';

const erro = (code, message) => Object.assign(new Error(message || 'Firebase: Error (' + code + ').'), { code });

describe('erros do Firebase', () => {
  it('códigos conhecidos viram uma frase em português, sem o texto cru do SDK', () => {
    assert.match(explicarErroFirebase(erro('auth/popup-blocked')), /bloqueou a janela do Google/);
    assert.match(explicarErroFirebase(erro('auth/invalid-credential')), /E-mail ou senha não conferem/);
    assert.match(explicarErroFirebase(erro('permission-denied')), /firestore\.rules/);
    assert.match(explicarErroFirebase(erro('unavailable')), /Sem conexão/);
    assert.match(explicarErroFirebase(erro('auth/unauthorized-domain')), /Domínios autorizados/);
    for (const codigo of ['auth/popup-blocked', 'auth/weak-password', 'permission-denied']) assert.doesNotMatch(explicarErroFirebase(erro(codigo)), /Firebase: Error/);
  });

  it('o código também é lido do texto, quando o SDK não preenche `code`', () => {
    assert.match(explicarErroFirebase(new Error('Firebase: Error (auth/popup-blocked).')), /bloqueou a janela do Google/);
  });

  it('quem fecha a janela do Google desistiu: null, para a tela não avisar', () => {
    for (const codigo of ['auth/popup-closed-by-user', 'auth/cancelled-popup-request', 'auth/user-cancelled']) assert.equal(explicarErroFirebase(erro(codigo)), null);
  });

  it('código desconhecido: o texto do erro sem o prefixo "Firebase:"; sem texto, uma frase genérica', () => {
    assert.equal(explicarErroFirebase(erro('auth/coisa-nova', 'Firebase: algo novo aconteceu')), 'algo novo aconteceu');
    assert.equal(explicarErroFirebase(null), 'Algo deu errado com o Firebase.');
    assert.equal(explicarErroFirebase('texto solto'), 'texto solto');
  });
});
