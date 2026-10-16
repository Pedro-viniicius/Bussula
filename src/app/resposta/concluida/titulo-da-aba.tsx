"use client";

import { useEffect, useMemo, useSyncExternalStore } from "react";
import { useGuardadaNaUrl } from "@/components/conclusao/guardada-na-url";
import { montarVista } from "@/components/conclusao/vista-da-conclusao";
import { assinarConclusao, interpretarConclusao, lerConclusaoBruta } from "@/lib/offline/conclusao-guardada";
import { MARCA } from "@/lib/marca";

const SEM_LEITURA = () => undefined;

/**
 * Faz o `<title>` da aba casar com o `<h1>` da tela. O título da tela depende
 * do que o aparelho guardou (cadastro, cupom, envio guardado), que o servidor
 * não vê; por isso é acertado aqui, no navegador. Renderiza nada.
 */
export function TituloDaAba() {
  const bruto = useSyncExternalStore(assinarConclusao, lerConclusaoBruta, SEM_LEITURA);
  const guardadaNaUrl = useGuardadaNaUrl();
  const titulo = useMemo(
    () => montarVista(interpretarConclusao(bruto ?? null), guardadaNaUrl).titulo,
    [bruto, guardadaNaUrl],
  );

  useEffect(() => {
    if (bruto === undefined) return;
    document.title = `${titulo} — ${MARCA.nome}`;
  }, [bruto, titulo]);

  return null;
}
