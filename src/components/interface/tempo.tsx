import { dataCompleta, tempoRelativo } from "@/utilitarios/tempo";

/**
 * Uma data do jeito que se lê: "há 8 min".
 *
 * O carimbo exato fica no `title`, para quem precisar do minuto certo — e no
 * atributo `dateTime`, que é o que uma ferramenta de acessibilidade lê.
 */
export function Quando({ data, className }: { data: Date; className?: string }) {
  return (
    <time dateTime={data.toISOString()} title={dataCompleta(data)} className={className}>
      {tempoRelativo(data)}
    </time>
  );
}
