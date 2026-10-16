/**
 * Trava do controlador (D9): sem os dados da empresa responsável, um
 * formulário que coleta dado pessoal não pode abrir em produção.
 */
export type Controlador = {
  razaoSocial: string;
  cnpj: string;
  endereco: string;
  emailPrivacidade: string;
};

export type CampoDoControlador = keyof Controlador;

export type SituacaoDoControlador = {
  completo: boolean;
  pendentes: CampoDoControlador[];
};

const CAMPOS: CampoDoControlador[] = ["razaoSocial", "cnpj", "endereco", "emailPrivacidade"];
const PLACEHOLDER = /preencher|exemplo|placeholder/i;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** CNPJ com 14 dígitos e dígitos verificadores corretos (aceita máscara). */
export function cnpjValido(cnpj: string): boolean {
  const d = cnpj.replace(/\D/g, "");
  if (d.length !== 14 || /^(\d)\1{13}$/.test(d)) return false;
  const digito = (base: string) => {
    let peso = base.length - 7;
    let soma = 0;
    for (const c of base) {
      soma += Number(c) * peso--;
      if (peso < 2) peso = 9;
    }
    const resto = soma % 11;
    return resto < 2 ? 0 : 11 - resto;
  };
  const d1 = digito(d.slice(0, 12));
  const d2 = digito(d.slice(0, 12) + d1);
  return d1 === Number(d[12]) && d2 === Number(d[13]);
}

function pendente(campo: CampoDoControlador, valor: string): boolean {
  const v = valor.trim();
  if (!v || PLACEHOLDER.test(v)) return true;
  if (campo === "cnpj") return !cnpjValido(v);
  if (campo === "emailPrivacidade") return !EMAIL.test(v);
  return false;
}

export function situacaoDoControlador(c: Controlador): SituacaoDoControlador {
  const pendentes = CAMPOS.filter((campo) => pendente(campo, c[campo] ?? ""));
  return { completo: pendentes.length === 0, pendentes };
}
