"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { PerguntaPublica } from "./pergunta-publica";
import { Button } from "@/components/ui/button";
import type { ValorDaResposta } from "@/dominio/formularios/perguntas";
import type { FormularioPublico } from "@/dominio/formularios/tipos";
import { podeEnviar, type EstadoDoEnvio } from "@/dominio/respostas/envio";
import { origemValida, type OrigemDaResposta } from "@/dominio/respostas/tipos";
import { fila } from "@/lib/offline/queue";
import { pedirSyncEmSegundoPlano, postarResposta } from "@/lib/offline/sync";
import { FORMULARIO_PUBLICO as T } from "@/lib/texts/publico";
import { validarResposta } from "@/validacoes/resposta";

/**
 * O formulário que o cliente vê depois de encostar o celular no cartão.
 *
 * Uma pergunta por vez, com o progresso no topo. Escolher uma opção única já
 * avança sozinho — é o toque a menos que faz a diferença entre responder e
 * desistir. Escolha múltipla e texto esperam o "Continuar", porque ali a
 * pessoa ainda não terminou.
 *
 * Um envio que não chega ao servidor não se perde: vai para a fila no próprio
 * aparelho e parte sozinho quando a conexão voltar.
 */
const ESPERA_ANTES_DE_AVANCAR_MS = 320;

export function FormularioPublicoInterativo({
  formulario,
  origem,
}: {
  formulario: FormularioPublico;
  origem: string | null;
}) {
  const router = useRouter();
  const [posicao, setPosicao] = useState(0);
  const [valores, setValores] = useState<Record<string, ValorDaResposta>>({});
  const [erro, setErro] = useState<string | null>(null);
  const [estado, setEstado] = useState<EstadoDoEnvio>("PREENCHENDO");
  const relogio = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Uma chave por preenchimento: se o envio for tentado duas vezes, o servidor
  // reconhece a segunda como repetição em vez de criar outra resposta.
  const chaveEnvio = useMemo(() => crypto.randomUUID(), []);
  const origemDaResposta: OrigemDaResposta = origemValida(origem);

  const pergunta = formulario.perguntas[posicao];
  const ultima = posicao === formulario.perguntas.length - 1;
  const total = formulario.perguntas.length;

  function responder(valor: ValorDaResposta, respostaDefinitiva: boolean) {
    setValores((atuais) => ({ ...atuais, [pergunta.id]: valor }));
    setErro(null);
    if (respostaDefinitiva && !ultima) {
      if (relogio.current) clearTimeout(relogio.current);
      relogio.current = setTimeout(() => setPosicao((p) => p + 1), ESPERA_ANTES_DE_AVANCAR_MS);
    }
  }

  function avancar() {
    // Dois toques rápidos no mesmo botão não devem virar dois envios. O botão
    // já fica desabilitado, mas o estado é quem manda.
    if (!podeEnviar(estado)) return;
    const problema = validarResposta(pergunta, valores[pergunta.id] ?? null);
    if (problema) {
      setErro(problema);
      return;
    }
    if (ultima) void enviar({ ...valores });
    else setPosicao((p) => p + 1);
  }

  function voltar() {
    setErro(null);
    setPosicao((p) => Math.max(0, p - 1));
  }

  async function enviar(respostas: Record<string, ValorDaResposta>) {
    setEstado("ENVIANDO");
    const envio = { slug: formulario.slug, chaveEnvio, valores: respostas, origem: origemDaResposta };

    try {
      const resultado = await postarResposta(formulario.slug, envio);
      if (!resultado.ok) {
        setEstado("ERRO");
        setErro(resultado.mensagem);
        return;
      }
      setEstado("ENVIADO");
      router.push("/resposta/concluida");
    } catch {
      // Falha de rede ou de servidor: guarda no aparelho e segue adiante. A
      // pessoa já respondeu; esperar conexão na frente dela não ajudaria.
      await fila
        .enfileirar({ chave: chaveEnvio, slug: formulario.slug, envio, criadoEm: Date.now(), tentativas: 0 })
        .catch(() => {});
      void pedirSyncEmSegundoPlano();
      setEstado("ENVIADO");
      router.push("/resposta/concluida?guardada=1");
    }
  }

  const enviando = estado === "ENVIANDO";

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <div className="mb-8">
        <p className="text-sm font-medium text-muted-foreground">{T.progresso(posicao + 1, total)}</p>
        <div
          role="progressbar"
          aria-valuenow={posicao + 1}
          aria-valuemin={1}
          aria-valuemax={total}
          aria-label={T.progresso(posicao + 1, total)}
          className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted"
        >
          <span
            className="block h-full rounded-full bg-acento transition-[width] duration-300"
            style={{ width: `${((posicao + 1) / total) * 100}%` }}
          />
        </div>
      </div>

      <div key={pergunta.id} className="anim-surgir flex-1">
        <PerguntaPublica
          pergunta={pergunta}
          valor={valores[pergunta.id] ?? null}
          erro={erro ?? undefined}
          aoResponder={responder}
        />
      </div>

      <div className="mt-10 flex flex-col gap-3">
        <Button size="lg" onClick={avancar} disabled={enviando} aria-busy={enviando}>
          {enviando ? T.enviando : ultima ? T.enviar : T.avancar}
        </Button>
        {posicao > 0 && (
          <Button variant="ghost" size="lg" onClick={voltar} disabled={enviando}>
            {T.voltar}
          </Button>
        )}
      </div>
    </div>
  );
}
