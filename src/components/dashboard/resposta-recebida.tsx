import Link from "next/link";
import { Quando } from "@/components/interface/tempo";
import { semDadosPessoais, type Pergunta } from "@/dominio/formularios/perguntas";
import { ROTULO_DA_ORIGEM, type Resposta } from "@/dominio/respostas/tipos";
import { A } from "@/lib/texts/admin";
import { formatarValor } from "@/utilitarios/valores";

/**
 * Uma resposta de cliente, pergunta a pergunta.
 *
 * As perguntas vêm da versão em que a resposta foi dada, e não da versão
 * atual — é isso que mantém uma resposta antiga fazendo sentido depois de o
 * formulário mudar.
 *
 * O nome do formulário é opcional: numa lista em que todas as respostas são
 * do mesmo formulário, repeti-lo em cada cartão só atrapalharia a leitura.
 */
export function RespostaRecebida({
  resposta,
  perguntas,
  nomeDoFormulario,
  href,
}: {
  resposta: Resposta;
  perguntas: Pergunta[];
  nomeDoFormulario?: string;
  href?: string;
}) {
  // Dado pessoal não aparece em resposta individual, nem se estiver em `valores`.
  const respondidas = semDadosPessoais(perguntas)
    .map((pergunta) => ({ pergunta, texto: formatarValor(pergunta, resposta.valores[pergunta.id] ?? null) }))
    .filter((item) => item.texto !== null);

  return (
    <li className="rounded-xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        {nomeDoFormulario && (
          <p className="text-sm font-semibold">
            {href ? (
              <Link href={href} className="underline-offset-4 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50">
                {nomeDoFormulario}
              </Link>
            ) : (
              nomeDoFormulario
            )}
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          <Quando data={resposta.criadoEm} /> · {ROTULO_DA_ORIGEM[resposta.origem]} ·{" "}
          {A.respostas.versao(resposta.versaoFormulario)}
        </p>
      </div>

      {respondidas.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">{A.respostas.semResposta}</p>
      ) : (
        <dl className="mt-3 space-y-2">
          {respondidas.map(({ pergunta, texto }) => (
            <div key={pergunta.id} className="grid gap-0.5 sm:grid-cols-[minmax(0,14rem)_1fr] sm:gap-4">
              <dt className="text-sm text-muted-foreground">{pergunta.enunciado}</dt>
              <dd className="text-sm font-medium">{texto}</dd>
            </div>
          ))}
        </dl>
      )}
    </li>
  );
}
