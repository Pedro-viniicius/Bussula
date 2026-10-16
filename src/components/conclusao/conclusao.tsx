"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { Marca } from "@/components/marca";
import { Aviso } from "@/components/interface/primitivos";
import {
  assinarConclusao,
  interpretarConclusao,
  lerConclusaoBruta,
} from "@/lib/offline/conclusao-guardada";
import { CONCLUIDO } from "@/lib/texts/publico";
import { useGuardadaNaUrl } from "./guardada-na-url";
import { BlocoDeIndicacao } from "./bloco-de-indicacao";
import { BlocoDoCupom } from "./bloco-do-cupom";
import { montarVista } from "./vista-da-conclusao";

/**
 * A tela de confirmação. Não consulta o banco (precisa abrir offline): tudo
 * que varia vem do registro que o formulário deixou em `sessionStorage` e,
 * para envios guardados, do resultado que a fila entrega depois.
 *
 * Antes de hidratar (e no servidor) o registro é "ainda não lido" e a tela é a
 * confirmação genérica, sem o aviso de "dados perdidos".
 */
const SEM_LEITURA = () => undefined;

export function Conclusao() {
  const bruto = useSyncExternalStore(assinarConclusao, lerConclusaoBruta, SEM_LEITURA);
  const guardadaNaUrl = useGuardadaNaUrl();
  const lido = bruto !== undefined;

  const registro = useMemo(() => interpretarConclusao(bruto ?? null), [bruto]);
  const vista = useMemo(() => {
    const v = montarVista(registro, guardadaNaUrl);
    // Antes da leitura não se sabe se há registro: sem o aviso de "dados perdidos".
    return lido ? v : { ...v, semDados: false };
  }, [registro, guardadaNaUrl, lido]);

  const titulo = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    titulo.current?.focus();
  }, []);

  // Anuncia "Seu cupom chegou" só quando o cupom troca de "gerando" para "emitido" com a página aberta.
  const gerando = vista.cupom?.tipo === "gerando";
  const [anteriorGerando, setAnteriorGerando] = useState(gerando);
  const [chegou, setChegou] = useState(false);
  if (anteriorGerando !== gerando) {
    setAnteriorGerando(gerando);
    if (anteriorGerando && vista.cupom?.tipo === "emitido") setChegou(true);
  }

  return (
    <main className="flex flex-1 flex-col items-center bg-background px-6 py-10 text-center">
      <Marca className="mb-10" />
      <div className="anim-surgir flex w-full max-w-sm flex-col items-center gap-6">
        <div>
          <p aria-hidden className="text-5xl">
            {vista.icone === "info" ? "ⓘ" : "✓"}
          </p>
          <h1
            ref={titulo}
            tabIndex={-1}
            className="mt-4 text-2xl font-bold tracking-tight text-balance outline-none sm:text-3xl"
          >
            {vista.titulo}
          </h1>
          <p className="mt-3 text-muted-foreground">{vista.texto}</p>
          {vista.semWhatsapp && <p className="mt-3 text-sm text-muted-foreground">{CONCLUIDO.semWhatsapp}</p>}
          {vista.semDados && <p className="mt-3 text-sm text-muted-foreground">{CONCLUIDO.semDados}</p>}
        </div>

        {vista.aviso && (
          <Aviso tom={vista.aviso.tom} className="w-full text-left">
            {vista.aviso.texto}
          </Aviso>
        )}

        {vista.cupom && <BlocoDoCupom cupom={vista.cupom} />}
        {vista.indicacao && <BlocoDeIndicacao indicacao={vista.indicacao} />}

        <p className="text-sm text-muted-foreground">{vista.rodape}</p>
      </div>
      <output aria-live="polite" className="sr-only">
        {chegou ? CONCLUIDO.cupom.chegou : ""}
      </output>
    </main>
  );
}
