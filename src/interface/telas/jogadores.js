/**
 * @file Tela "Jogadores": lista de todos os jogadores com conta, visível somente para admins
 * (quem tem documento em /admins/<uid> no Firestore). Exibe nome, último acesso, número de
 * acessos, conquistas desbloqueadas, partidas e vitórias. Permite exportar os dados em CSV.
 *
 * Issue #66 — Rastreio dos jogadores: acessos, conquistas e estatísticas de jogo na conta.
 */
import { abrirPainel, escaparHtml } from '../paineis.js';
import { contaAtual } from '../conta.js';

/** Carrega o Firebase (lazy) e retorna { db, doc, getDoc, getDocs, collection }. */
async function carregarFirestore() {
  const { getFirestore, doc, getDoc, getDocs, collection } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
  const { getApp } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js');
  return { db: getFirestore(getApp()), doc, getDoc, getDocs, collection };
}

/** Verifica se a conta atual tem documento em /admins/<uid>. Exportada para verificação sem abrir a tela. */
export async function verificarAdmin() {
  const conta = contaAtual();
  if (!conta) return false;
  try {
    const { db, doc, getDoc } = await carregarFirestore();
    const snap = await getDoc(doc(db, 'admins', conta.uid));
    return snap.exists();
  } catch { return false; }
}

/** Carrega todos os documentos da coleção /contas. Admin only (garantido pelas regras). */
async function carregarJogadores() {
  const { db, getDocs, collection } = await carregarFirestore();
  const snap = await getDocs(collection(db, 'contas'));
  return snap.docs.map((d) => ({ uid: d.id, ...d.data() }));
}

/** Formata data de timestamp Firebase ou ISO string para dd/mm/aaaa. */
function formatarData(valor) {
  if (!valor) return '—';
  try {
    const d = valor.toDate ? valor.toDate() : new Date(valor);
    return d.toLocaleDateString('pt-BR');
  } catch { return '—'; }
}

/** Conta quantas conquistas o jogador desbloqueou. */
function contarConquistas(resumo) {
  if (!resumo || !resumo.conquistas) return 0;
  return Object.values(resumo.conquistas).filter(Boolean).length;
}

/** Converte a lista de jogadores para CSV e faz download. */
function exportarCsv(jogadores) {
  const cabecalho = ['uid', 'nome', 'email', 'metodo', 'acessos', 'primeiro_acesso', 'ultimo_acesso', 'partidas', 'vitorias', 'trucos', 'conquistas'];
  const linhas = jogadores.map((j) => [
    j.uid,
    j.perfil?.nome || '',
    j.perfil?.email || '',
    j.perfil?.metodo || '',
    j.acessos?.total || 0,
    j.acessos?.primeiro ? (j.acessos.primeiro.toDate ? j.acessos.primeiro.toDate().toISOString() : j.acessos.primeiro) : '',
    j.acessos?.ultimo ? (j.acessos.ultimo.toDate ? j.acessos.ultimo.toDate().toISOString() : j.acessos.ultimo) : '',
    j.partidas?.terminadas || 0,
    j.vitorias || 0,
    j.trucos || 0,
    contarConquistas(j.resumo),
  ].map((v) => '"' + String(v).replace(/"/g, '""') + '"').join(','));
  const csv = [cabecalho.join(','), ...linhas].join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' }));
  a.download = 'jogadores-' + new Date().toISOString().slice(0, 10) + '.csv';
  a.click();
}

/** Renderiza a tabela de jogadores dentro do painel já aberto. */
function renderizarTabela(jogadores, container) {
  if (!jogadores.length) { container.innerHTML = '<p class="nota">Nenhum jogador encontrado.</p>'; return; }
  /* ordena por último acesso (mais recente primeiro) */
  jogadores.sort((a, b) => {
    const ta = a.acessos?.ultimo?.seconds || 0;
    const tb = b.acessos?.ultimo?.seconds || 0;
    return tb - ta;
  });
  const linhas = jogadores.map((j) => '<tr>' +
    '<td>' + escaparHtml(j.perfil?.nome || j.uid.slice(0, 8)) + '</td>' +
    '<td class="cel-num">' + (j.acessos?.total || 0) + '</td>' +
    '<td>' + formatarData(j.acessos?.ultimo) + '</td>' +
    '<td class="cel-num">' + contarConquistas(j.resumo) + '</td>' +
    '<td class="cel-num">' + (j.partidas?.terminadas || 0) + '</td>' +
    '<td class="cel-num">' + (j.vitorias || 0) + '</td>' +
    '</tr>').join('');
  container.innerHTML =
    '<table class="tabela-jogadores">' +
    '<thead><tr><th>Nome</th><th>Acessos</th><th>Último acesso</th><th>Conquistas</th><th>Partidas</th><th>Vitórias</th></tr></thead>' +
    '<tbody>' + linhas + '</tbody></table>';
}

/** Abre a tela "Jogadores" (admin). Retorna null se a conta não for admin. */
export async function abrirJogadores() {
  const admin = await verificarAdmin();
  if (!admin) return null;

  const html =
    '<div class="folha sobre jogadores">' +
    '<button class="fechar-x" data-fechar aria-label="Fechar">×</button>' +
    '<h2>Jogadores</h2>' +
    '<p class="nota">Visível apenas para administradores. Dados de quem criou conta no jogo.</p>' +
    '<div class="linha"><button class="botao pequeno" id="j-exportar">Exportar CSV</button></div>' +
    '<div id="j-tabela"><p class="nota">Carregando…</p></div>' +
    '<div class="linha fim"><button class="botao" data-fechar>Fechar</button></div>' +
    '</div>';

  const painel = abrirPainel(html, { fechaAoClicarFora: false });
  const tabela = painel.elemento.querySelector('#j-tabela');
  let jogadores = [];

  carregarJogadores()
    .then((lista) => { jogadores = lista; renderizarTabela(lista, tabela); })
    .catch((e) => { tabela.innerHTML = '<p class="nota erro">Erro ao carregar jogadores: ' + escaparHtml(e.message || String(e)) + '</p>'; });

  painel.elemento.querySelector('#j-exportar').addEventListener('click', () => { if (jogadores.length) exportarCsv(jogadores); });
  return painel;
}
