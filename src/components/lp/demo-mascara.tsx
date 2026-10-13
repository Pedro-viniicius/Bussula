"use client";

import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import { LP } from "@/lib/texts/lp";
import { LinhaMascarada, type Registro } from "./linha-mascarada";

const horaAgora = () =>
  new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(new Date());

/** Uma linha mascarada e, abaixo, o registro de auditoria que aparece quando alguém revela. */
export function DemoMascara() {
  const [registros, setRegistros] = useState<string[]>([]);
  const T = LP.privacidade.demo;
  const linha = LP.mock.registros.linhas[0] as Registro;

  return (
    <div className="rounded-[28px] bg-canvas p-6 text-ink sm:p-10">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[15px] font-semibold">{T.titulo}</p>
        <span className="rounded-full border border-hairline px-2.5 py-0.5 text-[12px] font-medium text-ink-muted">
          {LP.mock.exemplo}
        </span>
      </div>
      <p className="mt-1 text-[15px] text-ink-muted">{T.instrucao}</p>

      <div className="mt-6 border-y border-hairline">
        <LinhaMascarada grande registro={linha} aoRevelar={() => setRegistros((r) => [horaAgora(), ...r])} />
      </div>

      <div className="mt-5 min-h-12" aria-live="polite">
        {registros.length === 0 ? (
          <p className="text-[15px] text-ink-muted">{LP.mock.registros.aviso}</p>
        ) : (
          <ul className="space-y-2">
            {registros.map((hora, i) => (
              <li key={`${hora}-${i}`} className="flex items-start gap-2 text-[15px]">
                <ShieldCheck className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden />
                <span>
                  <span className="font-medium">{T.registrado}</span>{" "}
                  <span className="text-ink-muted">
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
