/**
 * @file Estatísticas de uso (src/interface/analise.js): onde mede, consentimento, faixa, carga do
 * gtag.js e eventos.
 *
 * Cada caso usa uma janela própria do jsdom com o endereço que interessa (site publicado,
 * localhost, arquivo local, fork) e o estado do módulo é reiniciado entre os casos.
 *
 * Rodar: node --test testes/unidade/analise.test.js
 */
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import {
  ID_GOOGLE_ANALYTICS, CHAVE_DO_CONSENTIMENTO, podeMedir, consentimento, definirConsentimento,
  iniciarAnalise, registrarEvento, medindo, reiniciarAnalise,
} from '../../src/interface/analise.js';

const SITE = 'https://welyngton.github.io/truco-de-turing/';

/** Janela do jsdom no endereço dado; `webdriver` simula um navegador automatizado. */
function janela(url = SITE, { webdriver = false, escolha } = {}) {
  const { window } = new JSDOM('<!doctype html><html><head></head><body></body></html>', { url });
  Object.defineProperty(window.navigator, 'webdriver', { value: webdriver, configurable: true });
  /* em file:// o jsdom não tem localStorage (origem opaca), como alguns navegadores */
  if (escolha) try { window.localStorage.setItem(CHAVE_DO_CONSENTIMENTO, escolha); } catch (e) { /* sem armazenamento */ }
  return window;
}

/** Comandos enviados ao gtag (cada item do dataLayer é o `arguments` de uma chamada). */
const comandos = (w) => (w.dataLayer || []).map((a) => Array.from(a));
const scriptsDoGoogle = (w) => [...w.document.querySelectorAll('script[src*="googletagmanager.com"]')];

describe('analise.js', () => {
  beforeEach(() => reiniciarAnalise());

  it('só mede no site publicado, por https e fora de navegador automatizado', () => {
    assert.equal(podeMedir(janela()), true);
    assert.equal(podeMedir(janela('http://localhost:8080/')), false);
    assert.equal(podeMedir(janela('http://127.0.0.1:5000/')), false);
    assert.equal(podeMedir(janela('file:///home/x/dist/truco-de-turing.html')), false);
    assert.equal(podeMedir(janela('https://outra-pessoa.github.io/truco-de-turing/')), false, 'fork publicado');
    assert.equal(podeMedir(janela(SITE, { webdriver: true })), false, 'Playwright');
  });

  it('primeira visita: mostra a faixa e não carrega nada até a escolha', () => {
    const w = janela();
    iniciarAnalise(w);
    const faixa = w.document.getElementById('faixa-estatisticas');
    assert.ok(faixa);
    assert.match(faixa.textContent, /Google Analytics/);
    assert.equal(scriptsDoGoogle(w).length, 0);
    assert.equal(consentimento(w), null);
    registrarEvento('inicio_partida', { baralho: 'classico' });
    assert.equal(w.dataLayer, undefined, 'sem consentimento, nenhum evento');
  });

  it('"Aceitar" guarda a escolha, carrega o gtag.js com o ID do fluxo e envia eventos', () => {
    const w = janela();
    iniciarAnalise(w);
    w.document.querySelector('#faixa-estatisticas [data-escolha="sim"]').click();
    assert.equal(w.document.getElementById('faixa-estatisticas'), null);
    assert.equal(w.localStorage.getItem(CHAVE_DO_CONSENTIMENTO), 'sim');
    const [script] = scriptsDoGoogle(w);
    assert.equal(script.src, 'https://www.googletagmanager.com/gtag/js?id=' + ID_GOOGLE_ANALYTICS);
    assert.ok(script.async);
    const config = comandos(w).find((c) => c[0] === 'config');
    assert.deepEqual(config, ['config', 'G-VWSGVWJK6Q', { allow_google_signals: false, allow_ad_personalization_signals: false }]);
    const padrao = comandos(w).find((c) => c[0] === 'consent');
    assert.equal(padrao[2].ad_storage, 'denied');
    assert.ok(medindo());
    registrarEvento('fim_mao', { venceu: 1, baralho: 'backprop' });
    assert.deepEqual(comandos(w).at(-1), ['event', 'fim_mao', { venceu: 1, baralho: 'backprop' }]);
  });

  it('quem já aceitou mede direto, sem faixa; quem recusou não vê a faixa nem é medido', () => {
    const aceitou = janela(SITE, { escolha: 'sim' });
    iniciarAnalise(aceitou);
    assert.equal(aceitou.document.getElementById('faixa-estatisticas'), null);
    assert.equal(scriptsDoGoogle(aceitou).length, 1);
    reiniciarAnalise();
    const recusou = janela(SITE, { escolha: 'nao' });
    iniciarAnalise(recusou);
    assert.equal(recusou.document.getElementById('faixa-estatisticas'), null);
    assert.equal(scriptsDoGoogle(recusou).length, 0);
    assert.equal(medindo(), false);
  });

  it('"Recusar" (ou desligar no Sobre depois de aceitar) para os eventos e apaga os cookies _ga', () => {
    const w = janela(SITE, { escolha: 'sim' });
    iniciarAnalise(w);
    w.document.cookie = '_ga=GA1.1.123; path=/';
    w.document.cookie = '_ga_VWSGVWJK6Q=GS1.1.456; path=/';
    w.document.cookie = 'outro=1; path=/';
    definirConsentimento('nao', w);
    assert.equal(w.localStorage.getItem(CHAVE_DO_CONSENTIMENTO), 'nao');
    assert.deepEqual(comandos(w).at(-1), ['consent', 'update', { analytics_storage: 'denied' }]);
    assert.equal(medindo(), false);
    const antes = comandos(w).length;
    registrarEvento('truco', { valor: 3 });
    assert.equal(comandos(w).length, antes);
    assert.doesNotMatch(w.document.cookie, /_ga/);
    assert.match(w.document.cookie, /outro=1/);
    /* religar não carrega o script de novo */
    definirConsentimento('sim', w);
    assert.deepEqual(comandos(w).at(-1), ['consent', 'update', { analytics_storage: 'granted' }]);
    assert.equal(scriptsDoGoogle(w).length, 1);
    assert.ok(medindo());
  });

  it('fora do site publicado nada aparece, mesmo com a escolha "sim" guardada', () => {
    for (const url of ['http://localhost:8080/', 'file:///tmp/truco.html']) {
      const w = janela(url, { escolha: 'sim' });
      iniciarAnalise(w);
      assert.equal(w.document.getElementById('faixa-estatisticas'), null, url);
      assert.equal(scriptsDoGoogle(w).length, 0, url);
    }
    assert.equal(medindo(), false);
    assert.doesNotThrow(() => registrarEvento('inicio_partida'));
  });
});
