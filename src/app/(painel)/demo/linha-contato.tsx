"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { A } from "@/lib/texts/admin";
import { revelarAction, type Revelado } from "./actions";

type Props = { id: string; nome: string; telefone: string; email: string | null };

/**
 * Masked by default. "Revelar" asks the server for the full values, which
 * writes an auditoria row; the page is refreshed so the counter moves.
 */
export function LinhaContato({ id, nome, telefone, email }: Props) {
  const [revelado, setRevelado] = useState<Revelado | null>(null);
  const [pendente, iniciar] = useTransition();
  const router = useRouter();
  const T = A.demo.lista;
  const v = revelado ?? { nome, telefone, email };

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
      <div className="min-w-0">
        <p className="truncate text-base font-semibold sm:text-lg">{v.nome}</p>
        <p className="truncate text-sm text-white/70 tabular-nums sm:text-base">
          {v.telefone}
          {v.email && <span className="text-white/50"> · {v.email}</span>}
        </p>
      </div>
      {revelado ? (
        <span className="text-xs font-medium tracking-wide text-white/40 uppercase">{T.revelado}</span>
      ) : (
        <button
          type="button"
          disabled={pendente}
          onClick={() =>
            iniciar(async () => {
              const r = await revelarAction(id);
              if (r) {
                setRevelado(r);
                router.refresh();
              }
            })
          }
          className="min-h-11 rounded-lg border border-white/20 px-3 text-sm font-medium text-white hover:bg-white/10 disabled:opacity-50"
        >
          {pendente ? T.revelando : T.revelar}
        </button>
      )}
    </div>
  );
}
