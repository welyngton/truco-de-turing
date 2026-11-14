/**
 * @file Regras do Firestore (firestore.rules) no emulador, issue #62: cada conta só grava e lê o
 * próprio progresso; mensagens de sala levam o uid de quem envia, a hora do servidor e um prazo
 * de validade; ninguém edita mensagens; só as vencidas podem ser apagadas e achadas na busca de
 * todas as salas (a limpeza de src/online/firebase.js, `limparMensagensVencidas`).
 *
 * Rodar (precisa de Java 21; o emulador é baixado na primeira vez): npm run testar:regras
 * Sem o emulador (FIRESTORE_EMULATOR_HOST vazio), a suíte é pulada.
 */
import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import {
  doc, getDoc, setDoc, addDoc, updateDoc, deleteDoc, collection, collectionGroup, query, where, limit, getDocs,
  serverTimestamp, Timestamp, writeBatch,
} from 'firebase/firestore';

const REGRAS = readFileSync(new URL('../../firestore.rules', import.meta.url), 'utf8');
const PROJETO = process.env.GCLOUD_PROJECT || 'demo-truco-de-turing';
const SEM_EMULADOR = !process.env.FIRESTORE_EMULATOR_HOST && 'sem o emulador do Firestore (rode npm run testar:regras)';

const HORA = 60 * 60 * 1000;
/** Mesma validade e margem usadas pelo jogo (src/online/firebase.js). */
const VALIDADE = 6 * HORA, MARGEM = 10 * 60 * 1000;

let ambiente;

/** Firestore visto pela conta `uid` (ou sem conta). */
const banco = (uid) => (uid ? ambiente.authenticatedContext(uid) : ambiente.unauthenticatedContext()).firestore();
/** Grava sem passar pelas regras (para montar o estado do teste). */
const semRegras = (fn) => ambiente.withSecurityRulesDisabled((contexto) => fn(contexto.firestore()));
const mensagens = (db, codigo = 'ABCDE') => collection(db, 'salas', codigo, 'mensagens');
/** Mensagem como o jogo grava (firebase.js, `transporteFirebase`). */
const mensagem = (uid, extra = {}) => ({ tipo: 'vivo', de: 'c1', uid, em: serverTimestamp(), expira: Timestamp.fromMillis(Date.now() + VALIDADE), ...extra });
/** A busca da limpeza: mensagens vencidas de todas as salas. */
const vencidas = (db, ate = Date.now() - MARGEM) => query(collectionGroup(db, 'mensagens'), where('expira', '<', Timestamp.fromMillis(ate)), limit(200));

describe('firestore.rules (emulador)', { skip: SEM_EMULADOR }, () => {
  before(async () => { ambiente = await initializeTestEnvironment({ projectId: PROJETO, firestore: { rules: REGRAS } }); });
  after(async () => { if (ambiente) await ambiente.cleanup(); });
  beforeEach(() => ambiente.clearFirestore());

  describe('contas', () => {
    it('cada conta lê e grava só o próprio progresso', async () => {
      await assertSucceeds(setDoc(doc(banco('ana'), 'contas', 'ana'), { vitorias: 1 }));
      await assertSucceeds(getDoc(doc(banco('ana'), 'contas', 'ana')));
      await assertFails(getDoc(doc(banco('beto'), 'contas', 'ana')));
      await assertFails(setDoc(doc(banco('beto'), 'contas', 'ana'), { vitorias: 99 }));
      await assertFails(getDoc(doc(banco(null), 'contas', 'ana')));
    });

    it('administrador (documento em admins/) lê e lista todas as contas, sem gravar nas dos outros (#66)', async () => {
      await semRegras(async (db) => {
        await setDoc(doc(db, 'admins', 'prof'), { desde: 1 });
        await setDoc(doc(db, 'contas', 'ana'), { vitorias: 1 });
        await setDoc(doc(db, 'contas', 'beto'), { vitorias: 2 });
      });
      await assertSucceeds(getDoc(doc(banco('prof'), 'contas', 'ana')));
      assert.equal((await assertSucceeds(getDocs(collection(banco('prof'), 'contas')))).size, 2);
      await assertFails(setDoc(doc(banco('prof'), 'contas', 'ana'), { vitorias: 99 }));
      await assertFails(deleteDoc(doc(banco('prof'), 'contas', 'ana')));
      /* conta comum não lista as contas */
      await assertFails(getDocs(collection(banco('ana'), 'contas')));
      await assertFails(getDocs(collection(banco(null), 'contas')));
    });

    it('admins/: cada conta só lê o próprio documento, e ninguém grava pelo jogo', async () => {
      await semRegras((db) => setDoc(doc(db, 'admins', 'prof'), { desde: 1 }));
      await assertSucceeds(getDoc(doc(banco('prof'), 'admins', 'prof')));
      await assertSucceeds(getDoc(doc(banco('ana'), 'admins', 'ana')));
      await assertFails(getDoc(doc(banco('ana'), 'admins', 'prof')));
      await assertFails(getDocs(collection(banco('prof'), 'admins')));
      await assertFails(setDoc(doc(banco('ana'), 'admins', 'ana'), { desde: 1 }));
      await assertFails(setDoc(doc(banco('prof'), 'admins', 'ana'), { desde: 1 }));
      await assertFails(deleteDoc(doc(banco('prof'), 'admins', 'prof')));
    });
  });

  describe('mensagens da sala: criar', () => {
    it('a conta grava mensagem com o próprio uid', async () => {
      await assertSucceeds(addDoc(mensagens(banco('ana')), mensagem('ana')));
      await assertSucceeds(addDoc(mensagens(banco('ana')), mensagem('ana', { tipo: 'pedido', acao: { tipo: 'jogada', cadeira: 1 } })));
    });

    it('uma conta não grava mensagem em nome de outra', async () => {
      await assertFails(addDoc(mensagens(banco('beto')), mensagem('ana')));
      const { uid, ...semUid } = mensagem('beto');
      await assertFails(addDoc(mensagens(banco('beto')), semUid));
    });

    it('sem conta não grava', async () => {
      await assertFails(addDoc(mensagens(banco(null)), mensagem(undefined, { uid: 'ana' })));
    });

    it('tipo, remetente, hora e validade são conferidos', async () => {
      const db = banco('ana');
      await assertFails(addDoc(mensagens(db), mensagem('ana', { tipo: 'trapaca' })));
      await assertFails(addDoc(mensagens(db), mensagem('ana', { de: 42 })));
      await assertFails(addDoc(mensagens(db), mensagem('ana', { de: 'x'.repeat(65) })));
      await assertFails(addDoc(mensagens(db), mensagem('ana', { em: Timestamp.fromMillis(Date.now() - HORA) })), 'em: só a hora do servidor');
      await assertFails(addDoc(mensagens(db), mensagem('ana', { expira: Timestamp.fromMillis(Date.now() + 25 * HORA) })), 'validade acima de 1 dia');
      await assertFails(addDoc(mensagens(db), mensagem('ana', { expira: Timestamp.fromMillis(Date.now() - HORA) })), 'já vencida');
      const { expira, ...semValidade } = mensagem('ana');
      await assertFails(addDoc(mensagens(db), semValidade));
    });
  });

  describe('mensagens da sala: ler, editar e apagar', () => {
    it('quem tem conta e sabe o código lê a sala; sem conta, não', async () => {
      await addDoc(mensagens(banco('ana')), mensagem('ana'));
      const lidas = await assertSucceeds(getDocs(mensagens(banco('beto'))));
      assert.equal(lidas.size, 1);
      assert.equal(lidas.docs[0].data().uid, 'ana');
      await assertFails(getDocs(mensagens(banco(null))));
    });

    it('ninguém edita uma mensagem, nem a própria', async () => {
      const ref = await addDoc(mensagens(banco('ana')), mensagem('ana'));
      await assertFails(updateDoc(doc(banco('ana'), ref.path), { tipo: 'tchau' }));
    });

    it('só mensagens vencidas podem ser apagadas, por qualquer conta', async () => {
      await semRegras(async (db) => {
        await setDoc(doc(db, 'salas/ABCDE/mensagens/valida'), { ...mensagem('ana'), em: Timestamp.now() });
        await setDoc(doc(db, 'salas/ABCDE/mensagens/vencida'), { ...mensagem('ana'), em: Timestamp.now(), expira: Timestamp.fromMillis(Date.now() - HORA) });
      });
      await assertFails(deleteDoc(doc(banco('ana'), 'salas/ABCDE/mensagens/valida')), 'nem a própria, antes de vencer');
      await assertFails(deleteDoc(doc(banco(null), 'salas/ABCDE/mensagens/vencida')));
      await assertSucceeds(deleteDoc(doc(banco('beto'), 'salas/ABCDE/mensagens/vencida')));
    });
  });

  describe('limpeza das salas antigas', () => {
    beforeEach(() => semRegras(async (db) => {
      const agora = Date.now();
      await setDoc(doc(db, 'salas/VELHA/mensagens/m1'), { ...mensagem('ana'), em: Timestamp.fromMillis(agora - 8 * HORA), expira: Timestamp.fromMillis(agora - 2 * HORA) });
      await setDoc(doc(db, 'salas/VELHA/mensagens/m2'), { ...mensagem('beto'), em: Timestamp.fromMillis(agora - 8 * HORA), expira: Timestamp.fromMillis(agora - 2 * HORA) });
      await setDoc(doc(db, 'salas/NOVAS/mensagens/m3'), { ...mensagem('ana'), em: Timestamp.fromMillis(agora) });
    }));

    it('a busca em todas as salas acha só as mensagens vencidas, e a limpeza apaga todas elas', async () => {
      const db = banco('carla');
      const achadas = await assertSucceeds(getDocs(vencidas(db)));
      assert.deepEqual(achadas.docs.map((d) => d.ref.path).sort(), ['salas/VELHA/mensagens/m1', 'salas/VELHA/mensagens/m2']);
      const lote = writeBatch(db);
      for (const d of achadas.docs) lote.delete(d.ref);
      await assertSucceeds(lote.commit());
      await semRegras(async (livre) => {
        const sobrou = await getDocs(collectionGroup(livre, 'mensagens'));
        assert.deepEqual(sobrou.docs.map((d) => d.ref.path), ['salas/NOVAS/mensagens/m3']);
      });
    });

    it('sem o filtro de vencidas, ninguém lista as mensagens de todas as salas (e descobre os códigos)', async () => {
      await assertFails(getDocs(query(collectionGroup(banco('carla'), 'mensagens'), limit(200))));
      await assertFails(getDocs(vencidas(banco('carla'), Date.now() + 24 * HORA)), 'o filtro precisa ser de vencidas');
      await assertFails(getDocs(vencidas(banco(null))));
    });
  });
});
