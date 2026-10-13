"use client";

import { useState } from "react";
import { LP } from "@/lib/texts/lp";
import { cn } from "@/lib/utils";

export type Registro = {
  nome: string;
  telefone: string;
  email: string | null;
  quem: string;
  quando: string;
};

type Props = {
  registro: Registro;
  /** A demonstração de privacidade usa para montar o registro de auditoria. */
  aoRevelar?: (registro: Registro) => void;
  grande?: boolean;
};

/** Depois de "revelar", o telefone de exemplo usa a faixa 90xxx, que a Anatel não atribui. */
function desmascarar(r: Registro): Registro {
  const ddd = r.telefone.slice(1, 3);
  const fim = r.telefone.slice(-2);
  const nomeCompleto = r.nome.replace(/ (\w)\.$/, " $1[sobrenome]");
  const email = r.email ? `${r.email[0]}.${r.nome.split(" ")[0].toLowerCase()}@${r.email.split("@")[1]}` : null;
  return { ...r, nome: nomeCompleto, telefone: `(${ddd}) 90234-56${fim}`, email };
}

/** Linha do painel com contato mascarado. "Revelar" mostra o dado (fictício) e marca que ficou registrado. */
export function LinhaMascarada({ registro, aoRevelar, grande = false }: Props) {
  const [revelado, setRevelado] = useState(false);
  const T = LP.mock.registros;
  const v = revelado ? desmascarar(registro) : registro;

  return (
    <div className={cn("flex flex-wrap items-center justify-between gap-x-4 gap-y-3", grande ? "py-5" : "py-3.5")}>
      <div className="min-w-0">
        <p className={cn("font-semibold text-ink", grande ? "text-lg" : "text-[15px]")}>{v.nome}</p>
        <p className={cn("text-ink tabular-nums", grande ? "text-[17px] break-words" : "truncate text-sm")}>
          {v.telefone}
          {v.email && <span className="text-ink-muted"> · {v.email}</span>}
        </p>
        <p className="mt-0.5 text-[13px] text-ink-muted">
          {registro.quem} · {registro.quando}
        </p>
      </div>
      {revelado ? (
        <span className="text-[13px] font-medium text-ink-muted">{T.revelado}</span>
      ) : (
        <button
          type="button"
          onClick={() => {
            setRevelado(true);
            aoRevelar?.(registro);
          }}
          className={cn(
            "rounded-full border border-hairline bg-canvas font-medium text-brand transition-colors hover:border-brand",
            grande ? "min-h-11 px-5 text-[15px]" : "min-h-9 px-4 text-[13px]",
          )}
        >
          {T.revelar}
        </button>
      )}
    </div>
  );
}
