import type { EnvioDeResposta } from "@/servicos/respostas";

/**
 * Fila de respostas que não conseguiram chegar ao servidor, guardada no
 * IndexedDB do próprio celular.
 *
 * A chave é a `chaveEnvio`, a mesma que o servidor usa para reconhecer um
 * reenvio — por isso reprocessar a fila nunca cria uma segunda resposta.
 * O service worker (public/sw.js) lê este mesmo depósito em segundo plano;
 * se DB_NOME, STORE ou o formato do registro mudarem aqui, mudam lá também.
 */
export const DB_NOME = "essencial-fit-offline";
export const STORE = "fila";
const VERSAO = 1;

export type ItemFila = {
  /** É a chaveEnvio: uma resposta só pode estar na fila uma vez. */
  chave: string;
  slug: string;
  envio: EnvioDeResposta;
  criadoEm: number;
  tentativas: number;
};

function abrir(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NOME, VERSAO);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) {
        req.result.createObjectStore(STORE, { keyPath: "chave" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function pedido<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function comStore<T>(modo: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await abrir();
  try {
    return await pedido(fn(db.transaction(STORE, modo).objectStore(STORE)));
  } finally {
    db.close();
  }
}

export const fila = {
  disponivel: () => typeof indexedDB !== "undefined",
  enfileirar: (item: ItemFila) => comStore("readwrite", (s) => s.put(item)),
  listar: () => comStore<ItemFila[]>("readonly", (s) => s.getAll()),
  remover: (chave: string) => comStore("readwrite", (s) => s.delete(chave)),
  atualizar: (item: ItemFila) => comStore("readwrite", (s) => s.put(item)),
  tamanho: () => comStore<number>("readonly", (s) => s.count()),
};
