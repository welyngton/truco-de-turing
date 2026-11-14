/**
 * @file Tela "Jogadores" (issue #66), só para administradores: a lista das contas com acessos,
 * conquistas e estatísticas de jogo, lida de `contas/` no Firestore, com exportação em CSV.
 *
 * Quem é administrador é decidido pelas regras do Firestore (documento em `admins/<uid>`); para
 * as outras contas a leitura é recusada e a tela nem é oferecida.
 */
import { listarContas } from '../../online/firebase.js';
import { explicarErroFirebase } from '../../online/errosFirebase.js';
import { CONQUISTAS } from '../../conteudo/conquistas.js';
import { abrirPainel, escaparHtml, mostrarAviso } from '../paineis.js';

/** Colunas da lista e do CSV: título e como tirar o valor da linha. */
export const COLUNAS = [
  ['Nome', (j) => j.nome],
  ['E-mail', (j) => j.email],
  ['Login', (j) => j.metodo],
  ['Último acesso', (j) => dataHora(j.ultimoAcesso)],
  ['Primeiro acesso', (j) => dataHora(j.primeiroAcesso)],
  ['Acessos', (j) => j.acessos],
  ['Conquistas', (j) => j.conquistas],
  ['Verbetes lidos', (j) => j.verbetesLidos],
  ['Partidas iniciadas', (j) => j.partidasIniciadas],
  ['Partidas terminadas', (j) => j.partidas],
  ['Vitórias', (j) => j.vitorias],
  ['Abandonos', (j) => j.abandonos],
  ['Mãos jogadas', (j) => j.maos],
  ['Mãos vencidas', (j) => j.maosVencidas],
  ['Trucos pedidos', (j) => j.trucos],
  ['Partidas online', (j) => j.partidasOnline],
  ['Aparelho', (j) => j.aparelho],
  ['Versão', (j) => j.versao],
  ['Identificador', (j) => j.uid],
];
/** Colunas mostradas na tela (o CSV leva todas). */
const NA_TELA = ['Nome', 'Último acesso', 'Acessos', 'Conquistas', 'Partidas terminadas', 'Vitórias', 'Mãos jogadas'];

const dois = (n) => String(n).padStart(2, '0');
/** Data e hora locais, `2026-11-14 15:47`; vazio sem data. */
export function dataHora(ms) {
  if (!ms) return '';
  const d = new Date(ms);
  return d.getFullYear() + '-' + dois(d.getMonth() + 1) + '-' + dois(d.getDate()) + ' ' + dois(d.getHours()) + ':' + dois(d.getMinutes());
}

/**
 * Linha da lista a partir do documento da conta (contas.js, `documentoDaConta`). Contas gravadas
 * antes das estatísticas existirem aparecem com o que têm.
 * @param {object} doc Documento de `contas/<uid>`, com `uid`.
 */
export function linhaDoJogador(doc) {
  const e = doc.estatisticas || {}, perfil = doc.perfil || {}, p = e.partidas || {}, m = e.maos || {};
  return {
    uid: doc.uid, nome: perfil.nome || '(sem nome)', email: perfil.email || '', metodo: perfil.metodo || '',
    ultimoAcesso: e.ultimoAcesso || 0, primeiroAcesso: e.primeiroAcesso || 0, acessos: e.acessos || 0,
    conquistas: Object.keys(doc.desbloqueadas || {}).length, verbetesLidos: doc.verbetesLidos || 0,
    partidasIniciadas: p.iniciadas || 0, partidas: p.terminadas || 0, vitorias: p.vencidas || 0, abandonos: p.abandonadas || 0,
    maos: m.jogadas || doc.maos || 0, maosVencidas: m.vencidas || doc.vitorias || 0,
    trucos: (e.trucos || {}).pedidos || 0, partidasOnline: (e.online || {}).partidas || 0,
    aparelho: e.aparelho || '', versao: e.versao || '',
  };
}

/** Jogadores em ordem: último acesso mais recente primeiro. */
export function ordenarJogadores(linhas) {
  return [...linhas].sort((a, b) => b.ultimoAcesso - a.ultimoAcesso || a.nome.localeCompare(b.nome));
}

/**
 * CSV da lista (separado por ponto e vírgula, como o Excel em português espera, com a marca de
 * UTF-8). Células que começam com =, +, - ou @ ganham um apóstrofo, para a planilha não as tratar
 * como fórmula (nomes e e-mails vêm das contas).
 */
export function csvDosJogadores(linhas) {
  const celula = (v) => {
    let t = String(v === undefined || v === null ? '' : v);
    if (/^[=+\-@\t\r]/.test(t)) t = "'" + t;
    return /[";\n\r]/.test(t) ? '"' + t.replace(/"/g, '""') + '"' : t;
  };
  return '﻿' + [COLUNAS.map(([titulo]) => celula(titulo)).join(';'), ...linhas.map((j) => COLUNAS.map(([, valor]) => celula(valor(j))).join(';'))].join('\r\n') + '\r\n';
}

/** Abre a tela com a lista das contas. */
export async function abrirJogadores() {
  const painel = abrirPainel('<div class="folha jogadores"><button class="fechar" data-fechar aria-label="Fechar">×</button><h2>Jogadores</h2>' +
    '<p class="nota" id="j-estado" role="status">Carregando as contas…</p><div class="jogadores-lista" id="j-lista"></div>' +
    '<div class="linha fim"><button class="botao discreto" id="j-csv" disabled>Baixar CSV</button><button class="botao" data-fechar>Fechar</button></div></div>');
  const $ = (id) => painel.elemento.querySelector('#' + id);
  let linhas;
  try { linhas = ordenarJogadores((await listarContas()).map(linhaDoJogador)); } catch (e) {
    if ($('j-estado')) $('j-estado').textContent = 'Não deu para ler as contas. ' + (explicarErroFirebase(e) || '');
    return painel;
  }
  if (!$('j-estado')) return painel; /* fechou enquanto carregava */
  const comConquistas = linhas.filter((j) => j.conquistas > 0).length;
  $('j-estado').textContent = linhas.length + (linhas.length === 1 ? ' conta' : ' contas') + ', ' + comConquistas + ' com conquistas (de ' + CONQUISTAS.length + ' possíveis). O CSV leva todas as colunas.';
  const colunas = COLUNAS.filter(([titulo]) => NA_TELA.includes(titulo));
  $('j-lista').innerHTML = '<table class="tabela-partida"><thead><tr>' + colunas.map(([titulo]) => '<th>' + escaparHtml(titulo) + '</th>').join('') + '</tr></thead><tbody>' +
    linhas.map((j) => '<tr>' + colunas.map(([titulo, valor]) => '<td' + (titulo === 'Nome' ? ' title="' + escaparHtml(j.email) + '"' : '') + '>' + escaparHtml(String(valor(j))) + '</td>').join('') + '</tr>').join('') + '</tbody></table>';
  $('j-csv').disabled = false;
  $('j-csv').addEventListener('click', () => {
    const url = URL.createObjectURL(new Blob([csvDosJogadores(linhas)], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url; a.download = 'truco-de-turing-jogadores-' + dataHora(Date.now()).slice(0, 10) + '.csv';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    mostrarAviso('Jogadores', 'CSV baixado com ' + linhas.length + (linhas.length === 1 ? ' conta.' : ' contas.'), null, 3000);
  });
  return painel;
}
