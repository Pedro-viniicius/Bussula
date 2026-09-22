import { cn } from "@/lib/utils";
import { ROTULO_DA_SITUACAO, type SituacaoDoFormulario } from "@/dominio/formularios/status";

/**
 * A situação de um formulário, escrita por extenso.
 *
 * O ponto colorido acompanha a palavra, nunca a substitui: quem não distingue
 * verde de cinza lê "Ativo" do mesmo jeito. O ponto é `aria-hidden` porque
 * não acrescenta nada a quem usa leitor de tela.
 */
const COR_DO_PONTO: Record<SituacaoDoFormulario, string> = {
  RASCUNHO: "bg-muted-foreground",
  ATIVO: "bg-sucesso",
  INATIVO: "bg-atencao",
  ARQUIVADO: "bg-muted-foreground",
};

const COR_DO_TEXTO: Record<SituacaoDoFormulario, string> = {
  RASCUNHO: "text-muted-foreground",
  ATIVO: "text-sucesso",
  INATIVO: "text-atencao",
  ARQUIVADO: "text-muted-foreground",
};

export function Situacao({ situacao, className }: { situacao: SituacaoDoFormulario; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-sm font-medium", COR_DO_TEXTO[situacao], className)}>
      <span aria-hidden className={cn("size-2 rounded-full", COR_DO_PONTO[situacao])} />
      {ROTULO_DA_SITUACAO[situacao]}
    </span>
  );
}
