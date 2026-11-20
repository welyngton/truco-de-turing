/**
 * @file Painel "Conquistas globais" (issue #154), aberto pela tela de Conquistas:
 * - "Estatísticas globais": onde o jogador conectado fica entre os demais em cada número (posição,
 *   quanto % dos jogadores ele passa, o líder e a mediana);
 * - "Raridade das conquistas": quantos % dos jogadores já desbloquearam cada medalha, das mais
 *   raras para as mais comuns.
 *
 * Os dados vêm do Firestore (`placar/`, online/placar.js): resumos anônimos, sem nome nem e-mail
 * de ninguém. Só quem está conectado a uma conta vê e participa; as outras pessoas veem o convite
 * para entrar. Ao abrir, o painel publica o placar do próprio jogador, para ele já aparecer.
 */
import { CONQUISTAS, GRADUACOES } from '../../conteudo/conquistas.js';
import { firebaseConfigurado, listarPlacar } from '../../online/firebase.js';
import { explicarErroFirebase } from '../../online/errosFirebase.js';
import { placarDoJogador, analisarPlacar, formatarCampo } from '../../online/placar.js';
import { contaAtual, haMarcaDeConta, aoMudarDeConta, publicarPlacar } from '../conta.js';
import { medalhaHtml } from '../medalha.js';
import { abrirPainel, escaparHtml } from '../paineis.js';

const numero = (n) => Number(n || 0).toLocaleString('pt-BR');
const plural = (n, um, varios) => numero(n) + ' ' + (n === 1 ? um : varios);

/** HTML da área "Estatísticas globais": o resumo da posição e a tabela por número. */
export function estatisticasGlobaisHtml(analise) {
  const { jogadores, posicoes } = analise;
  const conquistas = posicoes.find((p) => p.chave === 'conquistas');
  const resumo = jogadores > 1
    ? 'Você está entre <b>' + plural(jogadores, 'jogador', 'jogadores') + '</b>' + (conquistas ? ' e é o <b>' + conquistas.posicao + 'º em conquistas</b>, à frente de ' + conquistas.melhorQue + '% deles.' : '.')
    : 'Por enquanto você é o <b>único jogador</b> no placar. Convide alguém para a mesa!';
  const linhas = posicoes.map((p) => '<tr><td>' + escaparHtml(p.rotulo) + '</td><td><b>' + escaparHtml(formatarCampo(p, p.valor)) + '</b></td>' +
    '<td>' + p.posicao + 'º de ' + numero(p.de) + '</td><td>' + (jogadores > 1 ? p.melhorQue + '%' : '—') + '</td>' +
    '<td>' + escaparHtml(formatarCampo(p, p.lider)) + '</td><td>' + escaparHtml(formatarCampo(p, p.mediana)) + '</td></tr>').join('');
  return '<section class="global-secao" id="g-estatisticas"><h3>Estatísticas globais</h3><p class="global-resumo">' + resumo + '</p>' +
    '<div class="global-tabela"><table class="tabela-partida"><thead><tr><th>Número</th><th>Você</th><th>Posição</th><th>Melhor que</th><th>Líder</th><th>Mediana</th></tr></thead><tbody>' + linhas + '</tbody></table></div>' +
    '<p class="nota">Empates dividem a posição. Os outros jogadores são anônimos: o placar guarda só números e as conquistas de cada conta, nunca nome ou e-mail.</p></section>';
}

/** HTML da área "Raridade das conquistas". */
export function raridadeHtml(analise) {
  const { jogadores, raridade } = analise;
  const itens = raridade.map((r) => {
    const c = CONQUISTAS.find((x) => x.id === r.id);
    return '<div class="conquista raridade' + (r.minha ? '' : ' bloqueada') + '" data-conquista="' + escaparHtml(r.id) + '">' + medalhaHtml(c, r.minha) +
      '<div><span class="graduacao">' + GRADUACOES[c.graduacao].nome + (r.minha ? ' · você tem' : '') + '</span><b>' + escaparHtml(c.nome) + '</b>' +
      '<span class="progresso-final"><span class="barra" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + r.porcento + '" aria-label="Jogadores com a conquista ' + escaparHtml(c.nome) + '"><i style="width:' + r.porcento + '%"></i></span>' +
      r.porcento.toLocaleString('pt-BR') + '%</span><small>' + plural(r.quantos, 'jogador', 'jogadores') + ' de ' + numero(jogadores) + '</small></div></div>';
  }).join('');
  return '<section class="global-secao" id="g-raridade"><h3>Raridade das conquistas</h3><p class="nota">Da mais rara para a mais comum.</p><div class="conquistas-lista">' + itens + '</div></section>';
}

/** Mensagem para quem ainda não pode ver o painel (sem conta ou sem Firebase). */
function convite() {
  if (!firebaseConfigurado()) return 'O placar global precisa do projeto online do jogo, que não está configurado nesta versão.';
  if (haMarcaDeConta() && !contaAtual()) return 'Carregando a sua conta…';
  return 'As conquistas globais comparam você com os outros jogadores, e para isso é preciso estar numa conta. Entre em <b>Jogar online</b> (conta Google ou e-mail e senha) e volte aqui.';
}

/**
 * Abre o painel. Se a conta entrar (ou sair) com ele aberto, ele se atualiza.
 * @param {object} app Aplicação (lê o progresso).
 */
export function abrirConquistasGlobais(app) {
  const painel = abrirPainel('<div class="folha larga conquistas-globais"><button class="fechar-x" data-fechar aria-label="Fechar">×</button>' +
    '<h2>Conquistas globais</h2><div class="global-conteudo" aria-live="polite"></div>' +
    '<div class="linha fim"><button class="botao" data-fechar>Fechar</button></div></div>', { fechaAoClicarFora: true, aoFechar: () => pararDeOuvir() });
  let pararDeOuvir = () => {}, rodada = 0;
  const conteudo = () => painel.elemento.querySelector('.global-conteudo');

  async function carregar() {
    const minha = ++rodada, alvo = conteudo(), conta = contaAtual();
    if (!alvo) return;
    if (!conta) { alvo.innerHTML = '<p class="nota" role="status">' + convite() + '</p>'; return; }
    alvo.innerHTML = '<p class="nota" role="status">Buscando o placar dos jogadores…</p>';
    try {
      /* publica o próprio placar antes de ler, para o jogador já estar na conta; se falhar, a leitura mostra o que houver */
      let meu = placarDoJogador(app.progresso);
      try { meu = await publicarPlacar(app, conta, true); } catch (e) { /* segue com o dado local */ }
      const docs = (await listarPlacar()).filter((d) => d.uid !== conta.uid);
      docs.push({ ...meu, uid: conta.uid });
      if (minha !== rodada || !alvo.isConnected) return;
      const analise = analisarPlacar(docs, conta.uid);
      alvo.innerHTML = estatisticasGlobaisHtml(analise) + raridadeHtml(analise);
    } catch (e) {
      if (minha !== rodada || !alvo.isConnected) return;
      alvo.innerHTML = '<p class="nota" role="status">Não deu para ler o placar. ' + escaparHtml(explicarErroFirebase(e) || '') + '</p>';
    }
  }

  pararDeOuvir = aoMudarDeConta(() => {
    if (!conteudo() || !conteudo().isConnected) { pararDeOuvir(); return; }
    carregar();
  });
  carregar();
  return painel;
}
