"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { mudancasPermitidasALoja, type SituacaoDoFormulario } from "@/dominio/formularios/status";
import { mudarSituacaoAction } from "@/app/(painel)/admin/formularios/actions";
import { A } from "@/lib/texts/admin";

/**
 * Pausar, retomar e arquivar um formulário.
 *
 * Os botões saem da mesma lista que o servidor confere
 * (`mudancasPermitidasALoja`): um formulário em preparação não mostra botão
 * nenhum, porque colocá-lo no ar é trabalho da equipe que cuida do sistema.
 */
const COMO_MOSTRAR: Record<SituacaoDoFormulario, { rotulo: string; variante: "default" | "outline" | "ghost" } | null> = {
  ATIVO: { rotulo: A.formularios.acoes.ativar, variante: "default" },
  INATIVO: { rotulo: A.formularios.acoes.desativar, variante: "outline" },
  ARQUIVADO: { rotulo: A.formularios.acoes.arquivar, variante: "ghost" },
  RASCUNHO: null,
};

export function AcoesDeSituacao({ id, situacao }: { id: string; situacao: SituacaoDoFormulario }) {
  const router = useRouter();
  const [mudando, iniciarMudanca] = useTransition();
  const [falhou, setFalhou] = useState(false);
  const destinos = mudancasPermitidasALoja(situacao);

  if (destinos.length === 0) return null;

  function mudarPara(nova: SituacaoDoFormulario) {
    setFalhou(false);
    iniciarMudanca(async () => {
      const resultado = await mudarSituacaoAction(id, nova);
      if (!resultado.ok) {
        setFalhou(true);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {destinos.map((destino) => {
          const botao = COMO_MOSTRAR[destino];
          if (!botao) return null;
          return (
            <Button
              key={destino}
              variant={botao.variante}
              size="sm"
              disabled={mudando}
              aria-busy={mudando}
              onClick={() => mudarPara(destino)}
            >
              {botao.rotulo}
            </Button>
          );
        })}
      </div>
      {falhou && (
        <p role="alert" className="text-sm font-medium text-perigo">
          {A.formularios.acoes.erro}
        </p>
      )}
    </div>
  );
}
