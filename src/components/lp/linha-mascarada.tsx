"use client";

import { useState } from "react";
import { LP } from "@/lib/texts/lp";

export type Registro = {
  nome: string;
  telefone: string;
  email: string | null;
  quem: string;
  quando: string;
};

type Props = {
  registro: Registro;
  /** Chamado quando a pessoa revela; a demonstração de privacidade usa para montar o registro de auditoria. */
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

/**
 * Linha do painel com dados mascarados. "Revelar" mostra o dado inteiro
 * (fictício) e deixa claro que a ação ficou registrada.
 */
export function LinhaMascarada({ registro, aoRevelar, grande = false }: Props) {
  const [revelado, setRevelado] = useState(false);
  const T = LP.mock.registros;
  const v = revelado ? desmascarar(registro) : registro;

  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-3">
      <div className="min-w-0">
        <p className={grande ? "text-lg font-semibold" : "text-sm font-semibold"}>{v.nome}</p>
        <p className={`truncate tabular-nums text-(--lp-ink-2) ${grande ? "text-base" : "text-xs sm:text-sm"}`}>
          {v.telefone}
          {v.email && <span className="text-(--lp-muted)"> · {v.email}</span>}
        </p>
        <p className="text-xs text-(--lp-muted)">
          {registro.quem} · {registro.quando}
        </p>
      </div>
      {revelado ? (
        <span className="text-xs font-medium tracking-wide text-(--lp-muted) uppercase">{T.revelado}</span>
      ) : (
        <button
          type="button"
          onClick={() => {
            setRevelado(true);
            aoRevelar?.(registro);
          }}
          className={`rounded-lg border border-(--lp-line) bg-(--lp-surface) font-medium text-(--lp-ink) hover:border-(--lp-accent) ${grande ? "min-h-11 px-4 text-sm" : "min-h-9 px-3 text-xs"}`}
        >
          {T.revelar}
        </button>
      )}
    </div>
  );
}
