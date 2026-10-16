import { Atencao, Aviso } from "@/components/interface/primitivos";
import { A } from "@/lib/texts/admin";
import type { SituacaoDaPrivacidade } from "@/servicos/formularios";

/**
 * Avisa o gerente que há formulários que não abrem por falta dos dados da
 * empresa responsável. Mostra só os NOMES dos campos pendentes, nunca valores.
 *
 * Em produção é o alerta de perigo; fora dela (onde o formulário abre) é um
 * lembrete discreto. Sem formulário afetado ou com os dados completos, não
 * aparece nada.
 */
export function AvisoDeTravado({ situacao }: { situacao: SituacaoDaPrivacidade }) {
  if (situacao.completo || situacao.formulariosAfetados.length === 0) return null;
  const T = A.formularios.travado;

  if (!situacao.travaAtiva) {
    return (
      <Aviso tom="atencao">
        {T.avisoDeExemplo}
      </Aviso>
    );
  }

  const faltam = situacao.pendentes.map((campo) => T.campos[campo]).join(", ");
  return (
    <ul>
      <Atencao tom="perigo" titulo={T.aviso.titulo} texto={T.aviso.texto(faltam)} />
    </ul>
  );
}
