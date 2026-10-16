"use client";

import { useEffect, useRef, useState } from "react";
import { Aviso } from "@/components/interface/primitivos";
import { Button } from "@/components/ui/button";
import { A } from "@/lib/texts/admin";

/** Quanto tempo o botão fica em "Gerando arquivo…": o download não navega, então não há evento de fim. */
const ESPERA_MS = 4000;

/**
 * Botão de exportação. É um `<form method="post">` de verdade, com os filtros
 * em campos ocultos: funciona sem JavaScript e a exportação (que é auditada)
 * nunca é um GET. O texto de espera é só uma melhoria.
 */
export function ExportarContatos({
  total,
  filtros,
  comErro,
}: {
  /** Quantos contatos saem no arquivo (um por telefone, só quem aceitou). */
  total: number;
  /** Os filtros ativos, repassados como campos ocultos. */
  filtros: Record<string, string>;
  comErro: boolean;
}) {
  const E = A.contatos.exportar;
  const [gerando, setGerando] = useState(false);
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (temporizador.current) clearTimeout(temporizador.current);
    };
  }, []);

  return (
    <div className="w-full sm:w-auto sm:max-w-sm">
      <form
        method="post"
        action="/admin/contatos/exportar"
        onSubmit={() => {
          setGerando(true);
          temporizador.current = setTimeout(() => setGerando(false), ESPERA_MS);
        }}
      >
        {Object.entries(filtros).map(([nome, valor]) => (
          <input key={nome} type="hidden" name={nome} value={valor} />
        ))}
        <Button type="submit" disabled={total === 0 || gerando} className="w-full sm:w-auto">
          {gerando ? E.gerando : E.botao(total)}
        </Button>
      </form>
      <p className="mt-2 text-xs leading-snug text-muted-foreground">{total === 0 ? E.nenhum : E.apoio}</p>
      {comErro && (
        <Aviso tom="perigo" role="alert" className="mt-2">
          {E.erro}
        </Aviso>
      )}
    </div>
  );
}
