"use client";

import { useSyncExternalStore } from "react";

const SEM_ASSINATURA = () => () => {};
const LER_DA_URL = () => new URLSearchParams(window.location.search).get("guardada") === "1";
const NO_SERVIDOR = () => false;

/**
 * O `?guardada=1` da URL, lido só depois da hidratação.
 *
 * Offline, o service worker serve a cópia guardada de `/resposta/concluida`
 * (sem `guardada`), mas a URL do navegador traz `?guardada=1`. Ler a URL já na
 * hidratação (como `useSearchParams` faz) renderizaria diferente do HTML e
 * causaria o erro #418. Aqui a hidratação usa o snapshot de servidor (falso) e
 * o React volta a renderizar com o valor real logo em seguida.
 */
export function useGuardadaNaUrl(): boolean {
  return useSyncExternalStore(SEM_ASSINATURA, LER_DA_URL, NO_SERVIDOR);
}
