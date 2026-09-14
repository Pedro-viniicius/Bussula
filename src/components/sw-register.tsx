"use client";

import { useEffect } from "react";
import { sincronizar } from "@/lib/offline/sync";

/**
 * Registers the service worker, warms the cache of the pages this visitor
 * will need without signal, and replays the offline queue whenever the page
 * loads or the connection comes back. Renders nothing.
 *
 * Production only: dev chunks are not content-hashed and must not be cached.
 */
export function SwRegister({ slug }: { slug: string }) {
  useEffect(() => {
    void sincronizar();
    const aoVoltar = () => void sincronizar();
    window.addEventListener("online", aoVoltar);

    const suportaSw = process.env.NODE_ENV === "production" && "serviceWorker" in navigator;
    const aquecer = () => {
      navigator.serviceWorker.ready.then((reg) => {
        reg.active?.postMessage({
          tipo: "aquecer",
          urls: [`/f/${encodeURIComponent(slug)}`, `/f/${encodeURIComponent(slug)}/sucesso`],
        });
      });
    };
    if (suportaSw) {
      navigator.serviceWorker.register("/sw.js").then(aquecer, () => {
        /* no service worker: the form still works, just not offline */
      });
      // First install: the worker takes control a moment after `ready`.
      navigator.serviceWorker.addEventListener("controllerchange", aquecer);
    }
    return () => {
      window.removeEventListener("online", aoVoltar);
      if (suportaSw) navigator.serviceWorker.removeEventListener("controllerchange", aquecer);
    };
  }, [slug]);
  return null;
}
