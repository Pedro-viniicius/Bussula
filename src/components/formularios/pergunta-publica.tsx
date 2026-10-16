"use client";

import { useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { MAIOR_NOTA_DA_AVALIACAO, type Pergunta, type ValorDaResposta } from "@/dominio/formularios/perguntas";
import { FORMULARIO_PUBLICO as T } from "@/lib/texts/publico";
import { cn } from "@/lib/utils";
import { mascararTelefone } from "@/lib/validation/phone";

const EXEMPLO_DE_WHATSAPP = "(35) 99999-8888";

/**
 * A spec pede 15, mas um número colado com "+55 35 99999-8888" tem 17
 * caracteres: o navegador cortaria a colagem antes da máscara tirar o 55.
 */
const MAIOR_WHATSAPP_DIGITADO = 20;

/**
 * Uma pergunta na tela de quem responde.
 *
 * Cada tipo tem o seu caso, e todos os alvos de toque passam de 44 px: quem
 * responde está de pé, na loja, segurando o celular com uma mão só.
 *
 * `aoResponder` avisa o valor; `respostaDefinitiva` avisa que aquele toque já
 * encerra a pergunta, para a tela poder seguir sozinha para a próxima.
 */
export function PerguntaPublica({
  pergunta,
  valor,
  erro,
  aoResponder,
}: {
  pergunta: Pergunta;
  valor: ValorDaResposta;
  erro?: string;
  aoResponder: (valor: ValorDaResposta, respostaDefinitiva: boolean) => void;
}) {
  const idErro = `erro-${pergunta.id}`;
  const titulo = useRef<HTMLHeadingElement>(null);

  // A tela é remontada a cada pergunta: o foco vai ao título para o leitor de
  // tela anunciar a nova pergunta. Campos de texto já têm `autoFocus` e ficam com ele.
  const ficaComAutoFoco = ["texto_curto", "texto_livre", "whatsapp", "nome"].includes(pergunta.tipo);
  useEffect(() => {
    if (!ficaComAutoFoco) titulo.current?.focus({ preventScroll: true });
  }, [ficaComAutoFoco]);

  const descrito = erro ? idErro : pergunta.ajuda ? `ajuda-${pergunta.id}` : undefined;

  return (
    <div>
      <h1
        ref={titulo}
        tabIndex={-1}
        className="text-2xl font-bold tracking-tight text-balance outline-none sm:text-3xl"
      >{pergunta.enunciado}</h1>
      {pergunta.ajuda && (
        <p id={`ajuda-${pergunta.id}`} className="mt-2 text-muted-foreground">
          {pergunta.ajuda}
        </p>
      )}
      {!pergunta.obrigatoria && <p className="mt-2 text-sm text-muted-foreground">{T.opcional}</p>}

      <div className="mt-6" aria-describedby={descrito}>
        {pergunta.tipo === "escolha_unica" && (
          <ListaDeOpcoes
            nome={pergunta.id}
            opcoes={pergunta.opcoes}
            selecionadas={typeof valor === "string" ? [valor] : []}
            multipla={false}
            aoEscolher={(opcao) => aoResponder(opcao, true)}
          />
        )}

        {pergunta.tipo === "multipla_escolha" && (
          <ListaDeOpcoes
            nome={pergunta.id}
            opcoes={pergunta.opcoes}
            selecionadas={Array.isArray(valor) ? valor : []}
            multipla
            aoEscolher={(opcao) => {
              const atuais = Array.isArray(valor) ? valor : [];
              const novas = atuais.includes(opcao) ? atuais.filter((v) => v !== opcao) : [...atuais, opcao];
              aoResponder(novas, false);
            }}
          />
        )}

        {pergunta.tipo === "sim_nao" && (
          <div className="grid grid-cols-2 gap-3">
            {[true, false].map((opcao) => (
              <button
                key={String(opcao)}
                type="button"
                aria-pressed={valor === opcao}
                onClick={() => aoResponder(opcao, true)}
                className={cn(BOTAO_DE_ESCOLHA, "justify-center", valor === opcao ? ESCOLHIDO : NAO_ESCOLHIDO)}
              >
                {opcao ? T.sim : T.nao}
              </button>
            ))}
          </div>
        )}

        {pergunta.tipo === "avaliacao" && (
          <div className="flex justify-between gap-2">
            {Array.from({ length: MAIOR_NOTA_DA_AVALIACAO }, (_, i) => i + 1).map((nota) => (
              <button
                key={nota}
                type="button"
                aria-label={T.estrelas(nota)}
                aria-pressed={valor === nota}
                onClick={() => aoResponder(nota, true)}
                className={cn(
                  "flex h-16 flex-1 items-center justify-center rounded-xl border text-3xl transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                  typeof valor === "number" && nota <= valor
                    ? "border-acento bg-acento-suave text-acento"
                    : "border-input text-muted-foreground",
                )}
              >
                <span aria-hidden>{typeof valor === "number" && nota <= valor ? "★" : "☆"}</span>
              </button>
            ))}
          </div>
        )}

        {pergunta.tipo === "escala" && pergunta.escala && (
          <div>
            <div className="flex flex-wrap gap-2">
              {intervalo(pergunta.escala.minimo, pergunta.escala.maximo).map((ponto) => (
                <button
                  key={ponto}
                  type="button"
                  aria-pressed={valor === ponto}
                  onClick={() => aoResponder(ponto, true)}
                  className={cn(
                    "h-12 min-w-12 flex-1 rounded-lg border text-base font-semibold tabular-nums transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                    valor === ponto ? ESCOLHIDO : NAO_ESCOLHIDO,
                  )}
                >
                  {ponto}
                </button>
              ))}
            </div>
            {(pergunta.escala.rotuloMinimo || pergunta.escala.rotuloMaximo) && (
              <div className="mt-2 flex justify-between text-sm text-muted-foreground">
                <span>{pergunta.escala.rotuloMinimo}</span>
                <span>{pergunta.escala.rotuloMaximo}</span>
              </div>
            )}
          </div>
        )}

        {pergunta.tipo === "texto_curto" && (
          <Input
            autoFocus
            value={typeof valor === "string" ? valor : ""}
            onChange={(e) => aoResponder(e.target.value, false)}
            aria-invalid={erro ? true : undefined}
            aria-label={pergunta.enunciado}
          />
        )}

        {pergunta.tipo === "whatsapp" && (
          <Input
            autoFocus
            type="tel"
            inputMode="tel"
            autoComplete="tel-national"
            maxLength={MAIOR_WHATSAPP_DIGITADO}
            placeholder={EXEMPLO_DE_WHATSAPP}
            value={typeof valor === "string" ? valor : ""}
            onChange={(e) => aoResponder(mascararTelefone(e.target.value), false)}
            aria-invalid={erro ? true : undefined}
            aria-describedby={descrito}
            aria-label={pergunta.enunciado}
            className="h-14 text-xl tabular-nums"
          />
        )}

        {pergunta.tipo === "nome" && (
          <Input
            autoFocus
            type="text"
            autoComplete="name"
            value={typeof valor === "string" ? valor : ""}
            onChange={(e) => aoResponder(e.target.value, false)}
            aria-invalid={erro ? true : undefined}
            aria-describedby={descrito}
            aria-label={pergunta.enunciado}
            className="h-14"
          />
        )}

        {pergunta.tipo === "texto_livre" && (
          <textarea
            autoFocus
            rows={5}
            value={typeof valor === "string" ? valor : ""}
            onChange={(e) => aoResponder(e.target.value, false)}
            aria-invalid={erro ? true : undefined}
            aria-label={pergunta.enunciado}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          />
        )}
      </div>

      {erro && (
        <p id={idErro} role="alert" className="mt-3 text-sm font-medium text-perigo">
          {erro}
        </p>
      )}
    </div>
  );
}

const BOTAO_DE_ESCOLHA =
  "flex min-h-14 w-full items-center gap-3 rounded-xl border px-4 py-3 text-left text-base font-medium transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50";
const ESCOLHIDO = "border-acento bg-acento-suave text-acento-forte";
const NAO_ESCOLHIDO = "border-input hover:bg-muted";

function ListaDeOpcoes({
  nome,
  opcoes,
  selecionadas,
  multipla,
  aoEscolher,
}: {
  nome: string;
  opcoes: string[];
  selecionadas: string[];
  multipla: boolean;
  aoEscolher: (opcao: string) => void;
}) {
  return (
    <div role={multipla ? "group" : "radiogroup"} aria-labelledby={undefined} className="space-y-2.5">
      {multipla && <p className="text-sm text-muted-foreground">{FORMULARIO_MULTIPLA}</p>}
      {opcoes.map((opcao) => {
        const marcada = selecionadas.includes(opcao);
        return (
          <button
            key={`${nome}-${opcao}`}
            type="button"
            role={multipla ? "checkbox" : "radio"}
            aria-checked={marcada}
            onClick={() => aoEscolher(opcao)}
            className={cn(BOTAO_DE_ESCOLHA, marcada ? ESCOLHIDO : NAO_ESCOLHIDO)}
          >
            <span
              aria-hidden
              className={cn(
                "flex size-6 shrink-0 items-center justify-center border-2",
                multipla ? "rounded-md" : "rounded-full",
                marcada ? "border-acento bg-acento text-white" : "border-input",
              )}
            >
              {marcada ? "✓" : ""}
            </span>
            {opcao}
          </button>
        );
      })}
    </div>
  );
}

const FORMULARIO_MULTIPLA = T.podeEscolherVarias;

function intervalo(menor: number, maior: number): number[] {
  return Array.from({ length: maior - menor + 1 }, (_, i) => menor + i);
}
