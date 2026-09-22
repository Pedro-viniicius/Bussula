/**
 * O pedaço do endereço que identifica um formulário: `/f/experiencia-na-loja`.
 *
 * Sai do nome que o administrador escreveu, sem acento e sem espaço, porque é
 * isso que vai ser gravado num cartão NFC e lido em voz alta no balcão.
 */
const MAIOR_SLUG = 60;

export function gerarSlug(nome: string): string {
  const limpo = nome
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, MAIOR_SLUG)
    .replace(/-+$/g, "");
  return limpo || "formulario";
}

/** Acrescenta um número ao fim quando o slug já estiver em uso. */
export function slugAlternativo(slug: string, tentativa: number): string {
  const sufixo = `-${tentativa}`;
  return slug.slice(0, MAIOR_SLUG - sufixo.length) + sufixo;
}
