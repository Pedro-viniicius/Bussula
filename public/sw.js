/**
 * Service worker for the capture flow. Hand-written, no build step.
 *
 * - /_next/static/*      cache-first (content-hashed, immutable)
 * - /f/*, /privacidade and /resposta/concluida navigations
 *                        network-first with a timeout, keyed by pathname so
 *                        /f/cadastro-no-balcao?o=nfc and ?o=qr share one cached
 *                        page (origin and ref are read in the browser, never here)
 * - "aquecer" message    caches those pages and the assets they reference
 * - Background Sync      replays the IndexedDB answer queue after the tab closed
 *                        and tells the open tabs (postMessage "fila:enviada")
 *
 * The cached page keeps the CSP header and the HTML (with the matching nonce)
 * of the response it came from, so it still runs when served offline.
 *
 * Everything else goes straight to the network.
 */
// v3: /resposta/concluida passou a ser renderizada por requisição (com nonce da
// CSP). A cópia estática guardada na v2 não tem nonce e abriria em branco.
const VERSAO = "v3";
const CACHE_PAGINAS = `paginas-${VERSAO}`;
const CACHE_ESTATICO = `estatico-${VERSAO}`;
const TIMEOUT_REDE_MS = 8000;

// Must match src/lib/offline/queue.ts and sync.ts.
const DB_NOME = "essencial-fit-offline";
const STORE = "fila";
const TAG_SYNC = "fila-respostas";
const IDADE_MAXIMA_MS = 24 * 60 * 60 * 1000;

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((nomes) =>
        Promise.all(
          nomes
            .filter((n) => n !== CACHE_PAGINAS && n !== CACHE_ESTATICO)
            .map((n) => caches.delete(n)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(cacheFirst(request));
    return;
  }
  if (request.mode === "navigate" && paginaGuardada(url.pathname)) {
    event.respondWith(paginaNetworkFirst(url.pathname, request));
  }
});

self.addEventListener("message", (event) => {
  const dados = event.data || {};
  if (dados.tipo === "aquecer" && Array.isArray(dados.urls)) {
    event.waitUntil(Promise.all(dados.urls.map(aquecerPagina)));
  }
});

self.addEventListener("sync", (event) => {
  if (event.tag === TAG_SYNC) event.waitUntil(reenviarFila());
});

function paginaGuardada(pathname) {
  return pathname.startsWith("/f/") || pathname === "/privacidade" || pathname === "/resposta/concluida";
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE_ESTATICO);
  const hit = await cache.match(request);
  if (hit) return hit;
  const res = await fetch(request);
  if (res.ok) cache.put(request, res.clone());
  return res;
}

async function paginaNetworkFirst(pathname, request) {
  const cache = await caches.open(CACHE_PAGINAS);
  const chave = new Request(self.location.origin + pathname);
  try {
    const res = await comTimeout(fetch(request), TIMEOUT_REDE_MS);
    if (res.ok) cache.put(chave, res.clone());
    return res;
  } catch (erro) {
    const hit = await cache.match(chave, { ignoreVary: true });
    if (hit) return hit;
    throw erro;
  }
}

/** Fetches a page and everything under /_next/static it references. */
async function aquecerPagina(pathname) {
  try {
    const res = await fetch(pathname, { credentials: "same-origin" });
    if (!res.ok) return;
    const html = await res.clone().text();
    const cache = await caches.open(CACHE_PAGINAS);
    await cache.put(new Request(self.location.origin + pathname), res);
    const ativos = new Set();
    for (const m of html.matchAll(/(?:src|href)="(\/_next\/static\/[^"]+)"/g)) ativos.add(m[1]);
    const estatico = await caches.open(CACHE_ESTATICO);
    await Promise.all(
      [...ativos].map(async (u) => {
        if (await estatico.match(u)) return;
        const r = await fetch(u);
        if (r.ok) await estatico.put(u, r);
      }),
    );
  } catch {
    /* offline right now; the next visit warms it */
  }
}

function comTimeout(promessa, ms) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("timeout")), ms);
    promessa.then(
      (v) => { clearTimeout(t); resolve(v); },
      (e) => { clearTimeout(t); reject(e); },
    );
  });
}

// ---- Background Sync replay (mirror of src/lib/offline/sync.ts) ----

function abrirBanco() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NOME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) {
        req.result.createObjectStore(STORE, { keyPath: "chave" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function pedido(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/** Conta às abas abertas que o item foi resolvido (a tela de conclusão troca "Gerando seu cupom…"). */
async function avisarPaginas(chave, resultado) {
  if (!resultado) return;
  try {
    const abas = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const aba of abas) aba.postMessage({ tipo: "fila:enviada", chave, resultado });
  } catch {
    /* sem aba aberta ou sem permissão: o item já saiu da fila, não pode voltar */
  }
}

async function reenviarFila() {
  const db = await abrirBanco();
  try {
    const itens = await pedido(db.transaction(STORE, "readonly").objectStore(STORE).getAll());
    let pendente = false;
    for (const item of itens) {
      if (Date.now() - item.criadoEm > IDADE_MAXIMA_MS) {
        await pedido(db.transaction(STORE, "readwrite").objectStore(STORE).delete(item.chave));
        continue;
      }
      try {
        const res = await fetch(`/api/f/${encodeURIComponent(item.slug)}/respostas`, {
          method: "POST",
          headers: { "content-type": "application/json", "x-fila-offline": "1" },
          body: JSON.stringify(item.envio),
        });
        // Limite de envios (429): o limite é do IP, não do item. O item fica e
        // o laço para; o navegador reagenda a sincronização (rejeição abaixo).
        if (res.status === 429) {
          pendente = true;
          break;
        }
        // Falha de servidor também volta para a fila: o cadastro ainda não
        // chegou ao servidor e a pessoa já foi embora. Qualquer outra resposta
        // com sentido — gravada, repetida, formulário fora do ar — encerra o item.
        if (res.status >= 500) throw new Error("pendente");
        let resultado = null;
        try {
          resultado = await res.json();
        } catch {
          /* corpo que não é JSON: o item sai da fila, mas não há o que contar à página */
        }
        await pedido(db.transaction(STORE, "readwrite").objectStore(STORE).delete(item.chave));
        await avisarPaginas(item.chave, resultado);
      } catch {
        pendente = true;
        await pedido(
          db.transaction(STORE, "readwrite").objectStore(STORE).put({ ...item, tentativas: item.tentativas + 1 }),
        );
      }
    }
    // Rejecting tells the browser to schedule another sync with its own backoff.
    if (pendente) throw new Error("fila ainda tem itens");
  } finally {
    db.close();
  }
}
