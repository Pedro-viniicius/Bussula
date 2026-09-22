import { Container } from "@/components/interface/primitivos";
import { EditorDeFormulario } from "@/components/formularios/editor";
import { TopoAdmin } from "@/components/navegacao/topo-admin";
import { perguntaEmBranco } from "@/dominio/formularios/perguntas";
import { exigirAdmin } from "@/lib/admin/session";
import { A } from "@/lib/texts/admin";

export const dynamic = "force-dynamic";

/** Começa com uma pergunta já no lugar: uma folha em branco trava mais do que ajuda. */
export default async function NovoFormularioPage() {
  await exigirAdmin("/admin/formularios/novo");

  return (
    <>
      <TopoAdmin atual="novo-formulario" />
      <main id="conteudo" className="flex-1 py-6 sm:py-8">
        <Container className="max-w-3xl">
          <header className="mb-8">
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{A.editor.tituloNovo}</h1>
            <p className="mt-1 text-muted-foreground">{A.editor.subtituloNovo}</p>
          </header>
          <EditorDeFormulario
            id={null}
            jaPublicado={false}
            inicial={{
              nome: "",
              descricao: null,
              perguntas: [perguntaEmBranco("primeira-pergunta", "escolha_unica")],
            }}
          />
        </Container>
      </main>
    </>
  );
}
