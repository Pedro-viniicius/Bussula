import { eq } from "drizzle-orm";
import { db } from "./index";
import { eventos } from "./schema";

/** Only what the public form needs; never leaks retention or internal ids. */
export async function buscarEventoPorSlug(slug: string) {
  const [evento] = await db
    .select({
      id: eventos.id,
      slug: eventos.slug,
      nome: eventos.nome,
      ativo: eventos.ativo,
      politicaVersao: eventos.politicaVersao,
      modelos: eventos.modelos,
    })
    .from(eventos)
    .where(eq(eventos.slug, slug))
    .limit(1);
  return evento ?? null;
}
