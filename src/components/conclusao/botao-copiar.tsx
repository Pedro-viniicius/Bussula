"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

/**
 * Copia um texto para a área de transferência e diz o que aconteceu: o rótulo
 * muda por 3 s e uma região `aria-live` anuncia para leitor de tela. Se o
 * navegador negar a cópia, mostra a mensagem de apoio (e o texto, se for pedido).
 */
const TEMPO_DO_AVISO_MS = 3000;

export function BotaoCopiar({
  texto,
  rotulo,
  rotuloCopiado,
  mensagemDeFalha,
  mostrarTextoSeFalhar = false,
  className,
}: {
  texto: string;
  rotulo: string;
  rotuloCopiado: string;
  mensagemDeFalha: string;
  /** Para textos que não estão visíveis na tela (o link de indicação). */
  mostrarTextoSeFalhar?: boolean;
  className?: string;
}) {
  const [resultado, setResultado] = useState<"copiado" | "falhou" | null>(null);

  useEffect(() => {
    if (!resultado) return;
    const relogio = setTimeout(() => setResultado(null), TEMPO_DO_AVISO_MS);
    return () => clearTimeout(relogio);
  }, [resultado]);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(texto);
      setResultado("copiado");
    } catch {
      setResultado("falhou");
    }
  }

  return (
    <div className={className}>
      <Button variant="outline" onClick={copiar} className="w-full">
        {resultado === "copiado" ? rotuloCopiado : rotulo}
      </Button>
      <output aria-live="polite" className="sr-only">
        {resultado === "copiado" ? rotuloCopiado : ""}
      </output>
      {resultado === "falhou" && (
        <div role="status" className="mt-2 text-sm text-muted-foreground">
          <p>{mensagemDeFalha}</p>
          {mostrarTextoSeFalhar && <code className="mt-1 block break-all font-mono text-xs select-all">{texto}</code>}
        </div>
      )}
    </div>
  );
}
