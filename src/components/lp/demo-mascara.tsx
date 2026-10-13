"use client";

import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import { LP } from "@/lib/texts/lp";
import { LinhaMascarada, type Registro } from "./linha-mascarada";

const horaAgora = () =>
  new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(new Date());

/**
 * Demonstração da seção de privacidade: uma linha mascarada e, logo abaixo,
 * o registro de auditoria que aparece quando alguém revela.
 */
export function DemoMascara() {
  const [registros, setRegistros] = useState<string[]>([]);
  const T = LP.privacidade.demo;
  const linha = LP.mock.registros.linhas[0] as Registro;

  return (
    <div className="rounded-(--lp-radius) border border-(--lp-line) bg-(--lp-surface) p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold">{T.titulo}</p>
        <span className="rounded-full bg-(--lp-accent-soft) px-2.5 py-0.5 text-xs font-medium text-(--lp-accent)">
          {LP.mock.exemplo}
        </span>
      </div>
      <p className="mt-1 text-sm text-(--lp-muted)">{T.instrucao}</p>

      <div className="mt-4 border-y border-(--lp-line)">
        <LinhaMascarada grande registro={linha} aoRevelar={() => setRegistros((r) => [horaAgora(), ...r])} />
      </div>

      <div className="mt-4 min-h-14">
        {registros.length === 0 ? (
          <p className="text-sm text-(--lp-muted)">{LP.mock.registros.aviso}</p>
        ) : (
          <ul className="space-y-2" aria-live="polite">
            {registros.map((hora, i) => (
              <li key={`${hora}-${i}`} className="flex items-start gap-2 text-sm">
                <ShieldCheck className="mt-0.5 size-4 shrink-0 text-(--lp-accent)" aria-hidden />
                <span>
                  <span className="font-medium">{T.registrado}</span>{" "}
                  <span className="text-(--lp-muted)">
                    às {hora} · {T.por}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
