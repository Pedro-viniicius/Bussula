"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import type { SituacaoDoFormulario } from "@/dominio/formularios/status";
import { mudarSituacaoAction } from "@/app/(painel)/admin/formularios/actions";
import { A } from "@/lib/texts/admin";

/**
 * Publicar, ativar, desativar e arquivar.
 *
 * Quais botões aparecem depende da situação em que o formulário está — não
 * faz sentido oferecer "Desativar" ao que nunca foi publicado. A checagem de
 * verdade é no servidor; isto aqui só evita oferecer o que não cabe.
 */
export function AcoesDeSituacao({ id, situacao }: { id: string; situacao: SituacaoDoFormulario }) {
  const router = useRouter();
  const [mudando, iniciarMudanca] = useTransition();

  const mudar = (nova: SituacaoDoFormulario) =>
    iniciarMudanca(async () => {
      await mudarSituacaoAction(id, nova);
      router.refresh();
    });

  return (
    <div className="flex flex-wrap gap-2">
      {situacao === "RASCUNHO" && (
        <Button size="sm" disabled={mudando} onClick={() => mudar("ATIVO")}>
          {A.formularios.acoes.publicar}
        </Button>
      )}
      {situacao === "INATIVO" && (
        <Button size="sm" disabled={mudando} onClick={() => mudar("ATIVO")}>
          {A.formularios.acoes.ativar}
        </Button>
      )}
      {situacao === "ATIVO" && (
        <Button variant="outline" size="sm" disabled={mudando} onClick={() => mudar("INATIVO")}>
          {A.formularios.acoes.desativar}
        </Button>
      )}
      {situacao !== "ARQUIVADO" && (
        <Button variant="ghost" size="sm" disabled={mudando} onClick={() => mudar("ARQUIVADO")}>
          {A.formularios.acoes.arquivar}
        </Button>
      )}
    </div>
  );
}
