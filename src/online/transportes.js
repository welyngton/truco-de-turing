/**
 * @file Transportes da sala online: por onde as mensagens passam. Todos têm a mesma forma:
 * `{ enviar(msg), aoReceber(cb) → desinscrever, fechar() }`.
 *
 * - `transporteLocal`: abas e janelas do mesmo navegador (BroadcastChannel). Funciona sem
 *   servidor e serve para jogar em várias telas no mesmo computador e para os testes.
 * - `transporteMemoria`: vários clientes no mesmo programa (testes de unidade).
 * - O transporte pela internet (Firebase) fica em firebase.js e só é usado quando o projeto do
 *   grupo estiver configurado (configuracao.js).
 */

/** Abas e janelas do mesmo navegador, pelo canal `truco-de-turing:<codigo>`. */
export function transporteLocal(codigo) {
  const Canal = globalThis.BroadcastChannel;
  if (!Canal) throw new Error('Este navegador não tem BroadcastChannel.');
  const canal = new Canal('truco-de-turing:' + codigo);
  const ouvintes = new Set();
  canal.onmessage = (e) => { for (const cb of ouvintes) cb(e.data); };
  return {
    enviar: (msg) => canal.postMessage(JSON.parse(JSON.stringify(msg))),
    aoReceber: (cb) => { ouvintes.add(cb); return () => ouvintes.delete(cb); },
    fechar: () => { ouvintes.clear(); canal.close(); },
  };
}

/**
 * Central em memória: `central.conectar()` devolve um transporte; tudo o que um envia chega aos
 * outros (cópia por JSON, como na rede). Com `atrasar: true` as mensagens só saem em
 * `central.entregar()`, para os testes controlarem a ordem.
 */
export function centralEmMemoria({ atrasar = false } = {}) {
  const clientes = new Set();
  const fila = [];
  const despachar = (de, msg) => { for (const c of clientes) if (c !== de && c.aberto) for (const cb of c.ouvintes) cb(JSON.parse(msg)); };
  return {
    conectar() {
      const cliente = { ouvintes: new Set(), aberto: true };
      clientes.add(cliente);
      return {
        enviar: (msg) => { if (!cliente.aberto) return; const texto = JSON.stringify(msg); if (atrasar) fila.push([cliente, texto]); else despachar(cliente, texto); },
        aoReceber: (cb) => { cliente.ouvintes.add(cb); return () => cliente.ouvintes.delete(cb); },
        fechar: () => { cliente.aberto = false; clientes.delete(cliente); },
      };
    },
    /** Entrega as mensagens guardadas (com `atrasar`), na ordem ou embaralhadas por `ordem(fila)`. */
    entregar(ordem = (f) => f) {
      const lote = ordem(fila.splice(0));
      for (const [de, texto] of lote) despachar(de, texto);
      return lote.length;
    },
  };
}
