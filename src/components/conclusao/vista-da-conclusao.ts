import type { RegistroDaConclusao } from "@/lib/offline/conclusao-guardada";
import { CONCLUIDO } from "@/lib/texts/publico";

/**
 * Decide o que a tela de conclusão mostra, a partir do que o envio deixou no
 * aparelho. Função pura: a tela só desenha o que esta função devolve.
 *
 * Os estados vêm da spec (seção 3): cupom novo, número que já recebeu cupom,
 * só indicação, WhatsApp pulado, cupom que falhou, envio guardado offline e
 * aparelho sem registro (página recarregada ou dados perdidos).
 */
export type VistaDaConclusao = {
  titulo: string;
  texto: string;
  /** `info` troca o ✓ do cabeçalho por ⓘ (decorativo). */
  icone: "ok" | "info";
  aviso: { tom: "neutro" | "atencao"; texto: string } | null;
  cupom:
    | null
    | { tipo: "gerando" }
    | { tipo: "emitido"; codigo: string; brinde: string | null; validoAte: string };
  indicacao: null | { tipo: "aguardando" } | { tipo: "pronta"; codigo: string; slugDestino: string; brinde: string | null };
  /** Linha neutra de quem pulou o WhatsApp num formulário com cupom. */
  semWhatsapp: boolean;
  /** "Se você não guardou o código…": aparelho sem registro do envio. */
  semDados: boolean;
  /** Última linha da tela. */
  rodape: string;
};

/** `AAAA-MM-DD` → `dd/mm/aaaa`, sem passar por `Date` (que mudaria o dia com o fuso). */
export function formatarValidade(data: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(data);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : data;
}

const BASE: VistaDaConclusao = {
  titulo: CONCLUIDO.titulo,
  texto: CONCLUIDO.texto,
  icone: "ok",
  aviso: null,
  cupom: null,
  indicacao: null,
  semWhatsapp: false,
  semDados: false,
  rodape: CONCLUIDO.fechar,
};

export function montarVista(registro: RegistroDaConclusao | null, guardadaNaUrl: boolean): VistaDaConclusao {
  if (!registro) {
    return guardadaNaUrl
      ? { ...BASE, texto: CONCLUIDO.guardada }
      : { ...BASE, semDados: true };
  }

  const { modulos, pediuContato, pulouContato, resultado } = registro;
  const titulo = pediuContato ? CONCLUIDO.tituloCadastro : CONCLUIDO.titulo;
  // Sem WhatsApp não existe contato: nada de cupom nem de link de indicação.
  const rendeBeneficio = pediuContato && !pulouContato;

  // Envio guardado no aparelho, ainda sem resposta do servidor.
  if (resultado === null) {
    const semWhatsapp = pulouContato && modulos.cupom;
    if (rendeBeneficio && modulos.cupom) {
      return {
        ...BASE,
        titulo: CONCLUIDO.guardadaComCupom.titulo,
        texto: CONCLUIDO.guardadaComCupom.texto,
        cupom: { tipo: "gerando" },
        indicacao: modulos.indicacao ? { tipo: "aguardando" } : null,
      };
    }
    return {
      ...BASE,
      titulo,
      texto: CONCLUIDO.guardada,
      indicacao: rendeBeneficio && modulos.indicacao ? { tipo: "aguardando" } : null,
      semWhatsapp,
    };
  }

  // O servidor recusou o envio quando a conexão voltou (formulário fora do ar, por exemplo).
  if (!resultado.ok) {
    // A mensagem do servidor é técnica e não vai para o cliente: a orientação é fixa.
    return {
      ...BASE,
      titulo: CONCLUIDO.naoRegistrado.titulo,
      texto: CONCLUIDO.naoRegistrado.texto,
      icone: "info",
      rodape: CONCLUIDO.naoRegistrado.rodape,
    };
  }

  // Itens antigos da fila podem não trazer `beneficios`.
  const cupom = resultado.beneficios?.cupom ?? null;
  const indicacao = resultado.beneficios?.indicacao ?? null;
  const brinde = cupom?.status === "emitido" ? cupom.textoDoBrinde : null;

  const vista: VistaDaConclusao = {
    ...BASE,
    titulo,
    indicacao: indicacao ? { tipo: "pronta", codigo: indicacao.codigo, slugDestino: indicacao.slugDestino, brinde } : null,
  };

  if (cupom?.status === "emitido") {
    vista.cupom = { tipo: "emitido", codigo: cupom.codigo, brinde: cupom.textoDoBrinde, validoAte: formatarValidade(cupom.validoAte) };
  } else if (cupom?.status === "ja_emitido") {
    // Sem código e sem validade: quem sabe o número de outra pessoa não vê o cupom dela.
    vista.titulo = CONCLUIDO.jaTinha.titulo;
    vista.texto = CONCLUIDO.jaTinha.texto;
    vista.icone = "info";
    vista.aviso = { tom: "neutro", texto: CONCLUIDO.jaTinha.aviso };
  } else if (cupom?.status === "falhou") {
    vista.aviso = { tom: "atencao", texto: CONCLUIDO.cupomFalhou };
  } else if (pulouContato && modulos.cupom) {
    vista.semWhatsapp = true;
  }

  return vista;
}
