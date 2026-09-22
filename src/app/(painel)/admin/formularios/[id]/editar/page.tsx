import { notFound } from "next/navigation";
import { Container } from "@/components/interface/primitivos";
import { EditorDeFormulario } from "@/components/formularios/editor";
import { TopoAdmin } from "@/components/navegacao/topo-admin";
import { exigirAdmin } from "@/lib/admin/session";
import { A } from "@/lib/texts/admin";
import { buscarFormularioPorId } from "@/servicos/formularios";

export const dynamic = "force-dynamic";

export default async function EditarFormularioPage({ params }: PageProps<"/admin/formularios/[id]/editar">) {
  const { id } = await params;
  await exigirAdmin(`/admin/formularios/${id}/editar`);

  const formulario = await buscarFormularioPorId(id);
  if (!formulario) notFound();

  return (
    <>
      <TopoAdmin atual="formularios" />
      <main id="conteudo" className="flex-1 py-6 sm:py-8">
        <Container className="max-w-3xl">
          <header className="mb-8">
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{A.editor.tituloEdicao}</h1>
            <p className="mt-1 text-muted-foreground">{A.editor.subtituloEdicao}</p>
          </header>
          <EditorDeFormulario
            id={formulario.id}
            jaPublicado={formulario.situacao !== "RASCUNHO"}
            inicial={{
              nome: formulario.nome,
              descricao: formulario.descricao,
              perguntas: formulario.perguntas,
            }}
          />
        </Container>
      </main>
    </>
  );
}
