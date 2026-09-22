import type { SinalRelevante } from "@/dominio/dashboard/tipos";
import { Atencao } from "@/components/interface/primitivos";
import { A } from "@/lib/texts/admin";

/** O que merece atenção agora. Lista vazia é uma resposta boa, e diz isso. */
export function Sinais({ sinais }: { sinais: SinalRelevante[] }) {
  if (sinais.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
        {A.visaoGeral.sinais.semSinais}
      </p>
    );
  }

  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {sinais.map((sinal) => (
        <Atencao
          key={sinal.chave}
          tom={sinal.tom}
          titulo={sinal.titulo}
          texto={sinal.texto}
          href={sinal.href}
          acao={sinal.acao}
        />
      ))}
    </ul>
  );
}
