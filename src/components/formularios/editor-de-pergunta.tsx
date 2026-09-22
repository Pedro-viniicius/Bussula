"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DESCRICAO_DO_TIPO,
  ESCALA_PADRAO,
  TIPOS_DE_PERGUNTA,
  trocarTipo,
  type Pergunta,
  type TipoDePergunta,
} from "@/dominio/formularios/perguntas";
import { MAXIMO_DE_OPCOES } from "@/validacoes/formulario";
import { A } from "@/lib/texts/admin";

/**
 * O editor de uma pergunta.
 *
 * Os campos extras aparecem conforme o que o tipo escolhido declara em
 * `DESCRICAO_DO_TIPO` — este componente não tem uma lista própria de tipos.
 * É por isso que criar um tipo novo não exige reescrever o editor.
 */
export function EditorDePergunta({
  pergunta,
  indice,
  total,
  erro,
  aoMudar,
  aoRemover,
  aoMover,
}: {
  pergunta: Pergunta;
  indice: number;
  total: number;
  erro?: string;
  aoMudar: (pergunta: Pergunta) => void;
  aoRemover: () => void;
  aoMover: (direcao: -1 | 1) => void;
}) {
  const descricao = DESCRICAO_DO_TIPO[pergunta.tipo];
  const idBase = `pergunta-${pergunta.id}`;

  const mudarOpcao = (posicao: number, texto: string) => {
    const opcoes = [...pergunta.opcoes];
    opcoes[posicao] = texto;
    aoMudar({ ...pergunta, opcoes });
  };

  return (
    <li className="rounded-xl border border-border bg-card p-4 sm:p-5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-muted-foreground">{A.editor.pergunta(indice + 1)}</p>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => aoMover(-1)}
            disabled={indice === 0}
            aria-label={A.editor.subir}
            title={A.editor.subir}
          >
            ↑
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => aoMover(1)}
            disabled={indice === total - 1}
            aria-label={A.editor.descer}
            title={A.editor.descer}
          >
            ↓
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={aoRemover}
            aria-label={A.editor.remover}
            title={A.editor.remover}
            className="text-perigo hover:bg-perigo-suave"
          >
            ✕
          </Button>
        </div>
      </div>

      <div className="mt-3 space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor={`${idBase}-enunciado`}>{A.editor.enunciado}</Label>
          <Input
            id={`${idBase}-enunciado`}
            value={pergunta.enunciado}
            onChange={(e) => aoMudar({ ...pergunta, enunciado: e.target.value })}
            aria-invalid={erro ? true : undefined}
            aria-describedby={erro ? `${idBase}-erro` : undefined}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor={`${idBase}-tipo`}>{A.editor.tipo}</Label>
            <select
              id={`${idBase}-tipo`}
              value={pergunta.tipo}
              onChange={(e) => aoMudar(trocarTipo(pergunta, e.target.value as TipoDePergunta))}
              className="flex min-h-11 w-full rounded-md border border-input bg-background px-3 text-base outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              {TIPOS_DE_PERGUNTA.map((tipo) => (
                <option key={tipo} value={tipo}>
                  {DESCRICAO_DO_TIPO[tipo].rotulo}
                </option>
              ))}
            </select>
            <p className="text-xs leading-snug text-muted-foreground">{descricao.quandoUsar}</p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={`${idBase}-ajuda`}>{A.editor.enunciadoAjuda}</Label>
            <Input
              id={`${idBase}-ajuda`}
              value={pergunta.ajuda ?? ""}
              onChange={(e) => aoMudar({ ...pergunta, ajuda: e.target.value || null })}
            />
          </div>
        </div>

        {descricao.usaOpcoes && (
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">{A.editor.opcoes}</legend>
            {pergunta.opcoes.map((opcao, posicao) => (
              <div key={posicao} className="flex items-center gap-2">
                <Input
                  value={opcao}
                  aria-label={A.editor.opcao(posicao + 1)}
                  onChange={(e) => mudarOpcao(posicao, e.target.value)}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={A.editor.removerOpcao}
                  title={A.editor.removerOpcao}
                  disabled={pergunta.opcoes.length <= 2}
                  onClick={() => aoMudar({ ...pergunta, opcoes: pergunta.opcoes.filter((_, i) => i !== posicao) })}
                >
                  ✕
                </Button>
              </div>
            ))}
            <Button
              variant="outline"
              size="sm"
              disabled={pergunta.opcoes.length >= MAXIMO_DE_OPCOES}
              onClick={() => aoMudar({ ...pergunta, opcoes: [...pergunta.opcoes, ""] })}
            >
              {A.editor.adicionarOpcao}
            </Button>
          </fieldset>
        )}

        {descricao.usaEscala && (
          <fieldset className="grid gap-4 sm:grid-cols-4">
            <legend className="sr-only">{A.editor.tipo}</legend>
            <CampoDaEscala
              id={`${idBase}-minimo`}
              rotulo={A.editor.escalaDe}
              valor={pergunta.escala?.minimo ?? ESCALA_PADRAO.minimo}
              aoMudar={(minimo) =>
                aoMudar({ ...pergunta, escala: { ...(pergunta.escala ?? ESCALA_PADRAO), minimo } })
              }
            />
            <CampoDaEscala
              id={`${idBase}-maximo`}
              rotulo={A.editor.escalaAte}
              valor={pergunta.escala?.maximo ?? ESCALA_PADRAO.maximo}
              aoMudar={(maximo) =>
                aoMudar({ ...pergunta, escala: { ...(pergunta.escala ?? ESCALA_PADRAO), maximo } })
              }
            />
            <div className="space-y-1.5">
              <Label htmlFor={`${idBase}-rotulo-min`}>{A.editor.rotuloMinimo}</Label>
              <Input
                id={`${idBase}-rotulo-min`}
                value={pergunta.escala?.rotuloMinimo ?? ""}
                onChange={(e) =>
                  aoMudar({
                    ...pergunta,
                    escala: { ...(pergunta.escala ?? ESCALA_PADRAO), rotuloMinimo: e.target.value || null },
                  })
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`${idBase}-rotulo-max`}>{A.editor.rotuloMaximo}</Label>
              <Input
                id={`${idBase}-rotulo-max`}
                value={pergunta.escala?.rotuloMaximo ?? ""}
                onChange={(e) =>
                  aoMudar({
                    ...pergunta,
                    escala: { ...(pergunta.escala ?? ESCALA_PADRAO), rotuloMaximo: e.target.value || null },
                  })
                }
              />
            </div>
          </fieldset>
        )}

        <label className="flex min-h-11 items-center gap-2.5 text-sm">
          <input
            type="checkbox"
            checked={pergunta.obrigatoria}
            onChange={(e) => aoMudar({ ...pergunta, obrigatoria: e.target.checked })}
            className="size-5 rounded border-input accent-acento"
          />
          {A.editor.obrigatoria}
        </label>

        {erro && (
          <p id={`${idBase}-erro`} role="alert" className="text-sm font-medium text-perigo">
            {erro}
          </p>
        )}
      </div>
    </li>
  );
}

function CampoDaEscala({
  id,
  rotulo,
  valor,
  aoMudar,
}: {
  id: string;
  rotulo: string;
  valor: number;
  aoMudar: (valor: number) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{rotulo}</Label>
      <Input
        id={id}
        type="number"
        inputMode="numeric"
        value={valor}
        onChange={(e) => aoMudar(Number.parseInt(e.target.value, 10) || 0)}
      />
    </div>
  );
}
