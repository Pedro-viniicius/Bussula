"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { EditorDePergunta } from "./editor-de-pergunta";
import { Aviso, Cartao } from "@/components/interface/primitivos";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { perguntaEmBranco, type Pergunta } from "@/dominio/formularios/perguntas";
import type { DadosDoFormulario } from "@/dominio/formularios/tipos";
import { salvarFormularioAction } from "@/app/(painel)/admin/formularios/actions";
import { A } from "@/lib/texts/admin";
import { MAXIMO_DE_PERGUNTAS, type ErrosDoFormulario } from "@/validacoes/formulario";

/**
 * A tela de criar e editar um formulário.
 *
 * Guarda o rascunho inteiro em memória e só chama o servidor ao salvar — quem
 * está escrevendo pode reordenar e apagar perguntas à vontade sem nada ser
 * gravado pela metade. O servidor valida de novo o que chega; o que é
 * conferido aqui serve para avisar antes, não no lugar dele.
 */
const SEM_ERROS: ErrosDoFormulario = { porPergunta: {} };

export function EditorDeFormulario({
  id,
  inicial,
  jaPublicado,
}: {
  id: string | null;
  inicial: DadosDoFormulario;
  jaPublicado: boolean;
}) {
  const router = useRouter();
  const [nome, setNome] = useState(inicial.nome);
  const [descricao, setDescricao] = useState(inicial.descricao ?? "");
  const [perguntas, setPerguntas] = useState<Pergunta[]>(inicial.perguntas);
  const [erros, setErros] = useState<ErrosDoFormulario>(SEM_ERROS);
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [salvando, iniciarSalvamento] = useTransition();

  const trocarPergunta = (posicao: number, nova: Pergunta) =>
    setPerguntas((atuais) => atuais.map((p, i) => (i === posicao ? nova : p)));

  const removerPergunta = (posicao: number) =>
    setPerguntas((atuais) => atuais.filter((_, i) => i !== posicao));

  const moverPergunta = (posicao: number, direcao: -1 | 1) =>
    setPerguntas((atuais) => {
      const destino = posicao + direcao;
      if (destino < 0 || destino >= atuais.length) return atuais;
      const copia = [...atuais];
      [copia[posicao], copia[destino]] = [copia[destino], copia[posicao]];
      return copia;
    });

  const adicionarPergunta = () =>
    setPerguntas((atuais) => [...atuais, perguntaEmBranco(crypto.randomUUID(), "escolha_unica")]);

  function salvar(publicar: boolean) {
    setMensagem(null);
    iniciarSalvamento(async () => {
      const resultado = await salvarFormularioAction(
        id,
        { nome, descricao: descricao || null, perguntas },
        publicar,
      );
      if (resultado.ok) {
        router.push(`/admin/formularios/${resultado.id}`);
        router.refresh();
        return;
      }
      if ("erros" in resultado) {
        setErros(resultado.erros);
        setMensagem(A.editor.erroGeral);
      } else {
        setErros(SEM_ERROS);
        setMensagem(resultado.mensagem);
      }
    });
  }

  return (
    <div className="space-y-6">
      <Cartao>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="nome">{A.editor.nome}</Label>
            <Input
              id="nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              aria-invalid={erros.nome ? true : undefined}
              aria-describedby={erros.nome ? "nome-erro" : "nome-ajuda"}
            />
            {erros.nome ? (
              <p id="nome-erro" role="alert" className="text-sm font-medium text-perigo">
                {erros.nome}
              </p>
            ) : (
              <p id="nome-ajuda" className="text-sm text-muted-foreground">
                {A.editor.nomeAjuda}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="descricao">{A.editor.descricao}</Label>
            <Input
              id="descricao"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              aria-describedby="descricao-ajuda"
            />
            <p id="descricao-ajuda" className="text-sm text-muted-foreground">
              {A.editor.descricaoAjuda}
            </p>
          </div>
        </div>
      </Cartao>

      <section aria-labelledby="perguntas-titulo">
        <h2 id="perguntas-titulo" className="text-lg font-semibold tracking-tight sm:text-xl">
          {A.editor.perguntas}
        </h2>
        <p className="mt-0.5 text-sm text-muted-foreground">{A.editor.perguntasAjuda}</p>

        {erros.perguntas && (
          <Aviso tom="perigo" role="alert" className="mt-3 font-medium text-perigo">
            {erros.perguntas}
          </Aviso>
        )}

        {perguntas.length === 0 ? (
          <p className="mt-4 rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
            {A.editor.semPerguntas}
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {perguntas.map((pergunta, posicao) => (
              <EditorDePergunta
                key={pergunta.id}
                pergunta={pergunta}
                indice={posicao}
                total={perguntas.length}
                erro={erros.porPergunta[pergunta.id]}
                aoMudar={(nova) => trocarPergunta(posicao, nova)}
                aoRemover={() => removerPergunta(posicao)}
                aoMover={(direcao) => moverPergunta(posicao, direcao)}
              />
            ))}
          </ul>
        )}

        <Button
          variant="outline"
          className="mt-4 w-full sm:w-auto"
          onClick={adicionarPergunta}
          disabled={perguntas.length >= MAXIMO_DE_PERGUNTAS}
        >
          {A.editor.adicionar}
        </Button>
      </section>

      {mensagem && (
        <Aviso tom="perigo" role="alert" className="font-medium text-perigo">
          {mensagem}
        </Aviso>
      )}

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button size="lg" onClick={() => salvar(true)} disabled={salvando} aria-busy={salvando}>
          {salvando ? A.editor.salvando : jaPublicado ? A.editor.salvar : A.editor.salvarEPublicar}
        </Button>
        {!jaPublicado && (
          <Button variant="outline" size="lg" onClick={() => salvar(false)} disabled={salvando}>
            {A.editor.salvar}
          </Button>
        )}
        <Button variant="ghost" size="lg" onClick={() => router.back()} disabled={salvando}>
          {A.editor.cancelar}
        </Button>
      </div>
    </div>
  );
}
