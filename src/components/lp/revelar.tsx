"use client";

import { useEffect } from "react";

/**
 * Entrada suave dos blocos marcados com `data-reveal` quando entram na tela.
 * Não faz nada se o usuário prefere movimento reduzido ou se o navegador não
 * tem IntersectionObserver: o conteúdo já nasce visível.
 */
export function RevelarAoRolar() {
  useEffect(() => {
    const raiz = document.querySelector<HTMLElement>(".lp");
    if (!raiz || !("IntersectionObserver" in window)) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const alvos = raiz.querySelectorAll<HTMLElement>("[data-reveal]");
    const obs = new IntersectionObserver(
      (entradas) => {
        for (const e of entradas) {
          if (e.isIntersecting) {
            e.target.classList.add("lp-visivel");
            obs.unobserve(e.target);
          }
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 },
    );
    raiz.classList.add("lp-revelar-on");
    alvos.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, []);
  return null;
}
