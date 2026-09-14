import type { LeadInput } from "@/lib/validation/lead";

/**
 * IndexedDB queue of leads that could not reach the server.
 *
 * Keyed by chave_idempotencia, so a replay can never create a second row.
 * The service worker (public/sw.js) reads the same store under Background
 * Sync; keep DB_NOME / STORE / the record shape in step with it.
 */
export const DB_NOME = "fiat-offline";
export const STORE = "fila";
const VERSAO = 1;

export type ItemFila = {
  chave: string;
  slug: string;
  input: LeadInput;
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
