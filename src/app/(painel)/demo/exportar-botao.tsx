"use client";

import { useState } from "react";
import { A } from "@/lib/texts/admin";

/**
 * Consent is the default: the link exports only people who agreed to
 * marketing and says so. Including the rest needs an explicit tick, and
 * the warning appears before the click, not after.
 */
export function ExportarBotao({ comMarketing, semMarketing }: { comMarketing: number; semMarketing: number }) {
  const [tudo, setTudo] = useState(false);
  const E = A.demo.exportar;
  return (
    <div className="space-y-3">
      <a
        href={tudo ? "/demo/exportar?tudo=1" : "/demo/exportar"}
        className={`flex min-h-12 items-center justify-center rounded-lg px-4 text-center text-base font-semibold ${tudo ? "border border-[var(--destaque)] text-white" : "bg-white text-black hover:bg-white/90"}`}
      >
        {tudo ? E.botaoTudo(semMarketing) : E.botao(comMarketing)}
      </a>
      <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm text-white/70">
        <input type="checkbox" checked={tudo} onChange={(e) => setTudo(e.target.checked)} className="size-5 accent-[var(--destaque)]" />
        {E.incluir(semMarketing)}
      </label>
      <p className={`text-xs ${tudo ? "font-medium text-red-300" : "text-white/40"}`}>{tudo ? E.aviso : E.registrado}</p>
    </div>
  );
}
