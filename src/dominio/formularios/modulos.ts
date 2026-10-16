/**
 * Módulos de um formulário: o que o número de WhatsApp pode ser usado para.
 *
 * Os módulos são versionados junto com as perguntas (`versoes_formulario.modulos`)
 * e só mudam pelo script de publicação — a loja os vê, mas não os edita.
 */
import { PREFIXO_PADRAO_DO_CUPOM, prefixoDeCupomValido } from "@/dominio/contatos/codigos";

export type ModulosDoFormulario = {
  /** Finalidade "recompra" na etapa de consentimento e "Chamar no WhatsApp" no painel. */
  recompra: boolean;
  /** Finalidade "ofertas" na etapa de consentimento (opcional). */
  ofertas: boolean;
  /** Cupom único por telefone; o prefixo tem 2 a 6 caracteres A-Z ou 0-9. */
  cupom: { prefixo: string } | null;
  indicacao: boolean;
};

export const MODULOS_DESLIGADOS: Readonly<ModulosDoFormulario> = Object.freeze({
  recompra: false,
  ofertas: false,
  cupom: null,
  indicacao: false,
});

/** Verdadeiro quando algum módulo usa o número de WhatsApp. */
export function usaNumero(modulos: ModulosDoFormulario): boolean {
  return modulos.recompra || modulos.ofertas || modulos.cupom !== null || modulos.indicacao;
}

/**
 * Lê o jsonb do banco sem confiar nele. Valor ausente ou inválido vale como
 * desligado, campo a campo — as versões antigas (jsonb `{}`) ficam sem módulo
 * nenhum, que é o que elas sempre foram.
 *
 * Um módulo só liga com `true` de verdade; "sim", 1 ou texto não contam.
 * `cupom` precisa ser um objeto: sem `prefixo` vale o padrão, com `prefixo`
 * inválido fica desligado.
 */
export function lerModulos(json: unknown): ModulosDoFormulario {
  if (typeof json !== "object" || json === null || Array.isArray(json)) {
    return { ...MODULOS_DESLIGADOS };
  }
  const bruto = json as Record<string, unknown>;
  return {
    recompra: bruto.recompra === true,
    ofertas: bruto.ofertas === true,
    cupom: lerCupom(bruto.cupom),
    indicacao: bruto.indicacao === true,
  };
}

function lerCupom(valor: unknown): ModulosDoFormulario["cupom"] {
  if (typeof valor !== "object" || valor === null || Array.isArray(valor)) return null;
  const prefixo = (valor as Record<string, unknown>).prefixo;
  if (prefixo === undefined) return { prefixo: PREFIXO_PADRAO_DO_CUPOM };
  return typeof prefixo === "string" && prefixoDeCupomValido(prefixo) ? { prefixo } : null;
}
