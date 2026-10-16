"use client";

import { useEffect, useRef } from "react";
import type { ConsentimentoPublico, ControladorPublico } from "@/dominio/formularios/tipos";
import { CONSENTIMENTO as T } from "@/lib/texts/publico";
import { cn } from "@/lib/utils";

/**
 * A última etapa do formulário que pede WhatsApp: como o número pode ser usado.
 *
 * Nenhuma caixa vem marcada, nenhuma é obrigatória e o cupom (quando há)
 * vem mesmo sem marcar nada. Quem decide o que marcar é a pessoa; quem guarda
 * as marcações é o formulário, para elas sobreviverem a "Voltar" e a um envio
 * recusado.
 */
export function EtapaConsentimento({
  consentimento,
  controlador,
  comCupom,
  aceites,
  desabilitado,
  aoAlternar,
}: {
  consentimento: ConsentimentoPublico;
  controlador: ControladorPublico | null;
  comCupom: boolean;
  aceites: Record<string, boolean>;
  desabilitado: boolean;
  aoAlternar: (id: string, marcada: boolean) => void;
}) {
  const titulo = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    // Ao entrar na etapa o leitor de tela anuncia o título.
    titulo.current?.focus();
  }, []);

  return (
    <div>
      <h1
        ref={titulo}
        tabIndex={-1}
        className="text-2xl font-bold tracking-tight text-balance outline-none sm:text-3xl"
      >
        {T.titulo}
      </h1>
      <p className="mt-2 text-muted-foreground">{T.subtitulo(comCupom)}</p>

      <div className="mt-6 space-y-2 rounded-xl border border-linha bg-superficie p-4 text-sm break-words">
        {controlador?.razaoSocial && controlador.cnpj && <p>{T.quemCuida(controlador.razaoSocial, controlador.cnpj)}</p>}
        <p>{T.usoDoNumero(comCupom)}</p>
        {controlador?.emailPrivacidade && <p>{T.apagar(controlador.emailPrivacidade)}</p>}
        <a
          href="/privacidade"
          target="_blank"
          rel="noopener"
          className="inline-flex min-h-11 items-center font-medium text-acento underline underline-offset-4 outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          {T.verPolitica}
          <span className="sr-only">{T.abreEmOutraAba}</span>
        </a>
      </div>

      {consentimento.finalidades.length > 0 && (
        <fieldset className="mt-6 min-w-0" disabled={desabilitado}>
          <legend className="mb-3 text-base font-semibold">{T.legenda}</legend>
          <div className="space-y-2.5">
            {consentimento.finalidades.map((finalidade) => {
              const marcada = aceites[finalidade.id] === true;
              return (
                <label
                  key={finalidade.id}
                  className={cn(
                    "flex min-h-14 w-full cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-base font-medium transition-colors has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/50",
                    marcada ? "border-acento bg-acento-suave text-acento-forte" : "border-linha-forte hover:bg-muted",
                  )}
                >
                  <input
                    type="checkbox"
                    autoComplete="off"
                    checked={marcada}
                    onChange={(e) => aoAlternar(finalidade.id, e.target.checked)}
                    className="size-6 shrink-0 accent-primary"
                  />
                  <span>{finalidade.rotulo}</span>
                </label>
              );
            })}
          </div>
        </fieldset>
      )}

      {comCupom && <p className="mt-6 text-sm text-muted-foreground">{T.cupomInfo}</p>}
    </div>
  );
}
