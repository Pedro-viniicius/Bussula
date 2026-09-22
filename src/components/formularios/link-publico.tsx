"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { A } from "@/lib/texts/admin";

/**
 * O endereço público do formulário, pronto para copiar.
 *
 * A URL é montada no navegador, a partir do endereço em que a página está
 * aberta. Assim ela está certa em qualquer ambiente — local, preview ou
 * produção — sem depender de nenhuma variável configurada.
 */
const SEM_ASSINATURA = () => () => {};

export function LinkPublico({ caminho }: { caminho: string }) {
  // Falso no HTML do servidor, verdadeiro depois de montar. Sem `useEffect`
  // com `setState`: o valor é derivado, não um estado que precise ser mantido.
  const noNavegador = useSyncExternalStore(
    SEM_ASSINATURA,
    () => true,
    () => false,
  );
  const url = noNavegador ? `${window.location.origin}${caminho}` : caminho;
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    if (!copiado) return;
    const relogio = setTimeout(() => setCopiado(false), 2500);
    return () => clearTimeout(relogio);
  }, [copiado]);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(url);
      setCopiado(true);
    } catch {
      /* sem permissão para a área de transferência: o endereço continua visível para copiar à mão */
    }
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <code className="min-w-0 flex-1 truncate rounded-lg bg-muted px-3 py-2.5 font-mono text-sm">{url}</code>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={copiar}>
          {copiado ? A.formularios.acoes.copiado : A.formularios.acoes.copiarLink}
        </Button>
        <a
          href={caminho}
          target="_blank"
          rel="noreferrer"
          className="inline-flex min-h-11 items-center rounded-lg border border-border px-3 text-sm font-semibold outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          {A.formularios.acoes.abrirFormulario}
        </a>
      </div>
      <output aria-live="polite" className="sr-only">
        {copiado ? A.formularios.acoes.copiado : ""}
      </output>
    </div>
  );
}
