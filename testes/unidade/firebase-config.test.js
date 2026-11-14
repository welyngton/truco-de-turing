/**
 * @file Configuração do Firebase (issue #40): os dados do app da Web em src/online/configuracao.js
 * são todos do mesmo projeto que `.firebaserc` (para onde vão as regras), e os tipos de mensagem
 * que firestore.rules aceita nas salas são os que src/online/sala.js envia.
 *
 * Rodar: node --test testes/unidade/firebase-config.test.js
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { FIREBASE } from '../../src/online/configuracao.js';

const ler = (arquivo) => readFileSync(new URL('../../' + arquivo, import.meta.url), 'utf8');

describe('configuração do Firebase', () => {
  it('app da Web e .firebaserc apontam para o mesmo projeto', () => {
    const projeto = JSON.parse(ler('.firebaserc')).projects.default;
    assert.equal(FIREBASE.projectId, projeto);
    assert.equal(FIREBASE.authDomain, projeto + '.firebaseapp.com');
    assert.equal(FIREBASE.storageBucket, projeto + '.firebasestorage.app');
    /* o appId começa pelo número do projeto, que é o messagingSenderId */
    assert.match(FIREBASE.appId, new RegExp('^1:' + FIREBASE.messagingSenderId + ':web:[0-9a-f]+$'));
    assert.match(FIREBASE.apiKey, /^AIza[\w-]{35}$/);
    assert.equal(FIREBASE.measurementId, undefined, 'o Analytics é carregado à parte, com consentimento');
  });

  it('firestore.rules aceita nas salas exatamente os tipos de mensagem que a sala envia', () => {
    const regras = ler('firestore.rules');
    const lista = regras.match(/request\.resource\.data\.tipo in \[([^\]]+)\]/);
    assert.ok(lista, 'lista de tipos nas regras');
    const aceitos = [...lista[1].matchAll(/'(\w+)'/g)].map((m) => m[1]).sort();
    /* toda mensagem da sala leva o tipo e quem mandou (`{ tipo: '…', de: … }`) */
    const enviados = [...new Set([...ler('src/online/sala.js').matchAll(/\{\s*tipo:\s*'(\w+)',\s*de:/g)].map((m) => m[1]))].sort();
    assert.deepEqual(aceitos, enviados);
  });
});
