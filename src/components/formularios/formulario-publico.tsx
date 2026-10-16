"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { EtapaConsentimento } from "./etapa-consentimento";
import { PerguntaPublica } from "./pergunta-publica";
import { Button } from "@/components/ui/button";
import { respostaVazia, type Pergunta, type ValorDaResposta } from "@/dominio/formularios/perguntas";
import type { FormularioPublico } from "@/dominio/formularios/tipos";
import { podeEnviar, type EstadoDoEnvio, type ResultadoDoEnvio } from "@/dominio/respostas/envio";
import { origemValida } from "@/dominio/respostas/tipos";
import { fila } from "@/lib/offline/queue";
import { guardarConclusao, limparConclusao } from "@/lib/offline/conclusao-guardada";
import { pedirSyncEmSegundoPlano, postarResposta } from "@/lib/offline/sync";
import { CONSENTIMENTO, FORMULARIO_PUBLICO as T, LIMITE } from "@/lib/texts/publico";
import type { EnvioDeResposta } from "@/servicos/respostas";
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
 *
 * Formulário com pergunta de WhatsApp ganha uma última etapa, a de
 * consentimento (a menos que a pessoa tenha pulado o WhatsApp: sem número não
 * há o que consentir). Se o servidor barrar o envio pelo limite por IP, a
 * pessoa fica nessa mesma tela, com tudo preenchido, e nada vai para a fila.
 *
 * `o` (origem) e `ref` (indicação) são lidos aqui, no navegador, e não no
 * servidor: o service worker guarda a página sem query, e a origem ou a
 * indicação de uma visita não podem vazar para outra.
 */
const ESPERA_ANTES_DE_AVANCAR_MS = 320;
/** Abaixo disto o botão espera a contagem; acima, fica ativo e a mensagem orienta. */
const ESPERA_CURTA_S = 60;
const MAIOR_REF = 40;

/** Origem e indicação da visita, lidas do endereço real da aba (nunca do HTML guardado). */
function lerDoEndereco(): { origem: string | null; ref: string | null } {
  if (typeof window === "undefined") return { origem: null, ref: null };
  const consulta = new URLSearchParams(window.location.search);
  const ref = consulta.get("ref")?.trim().slice(0, MAIOR_REF) || null;
  return { origem: consulta.get("o"), ref };
}

/**
 * A ajuda da pergunta de WhatsApp avisa, antes, o que o cupom exige e o que
 * acontece se pular. A segunda frase depende da configuração da loja (WhatsApp
 * opcional), que não faz parte da definição do formulário, então vem daqui. A
 * primeira só entra se a definição ainda não a trouxer, para não repetir.
 */
function comAjudaDoCadastro(pergunta: Pergunta, cupom: boolean): Pergunta {
  if (pergunta.tipo !== "whatsapp" || !cupom) return pergunta;
  const linhas = [
    pergunta.ajuda,
    pergunta.ajuda?.includes(T.whatsapp.ajudaCupom) ? null : T.whatsapp.ajudaCupom,
    pergunta.obrigatoria ? null : T.whatsapp.ajudaPularSemCupom,
  ];
  return { ...pergunta, ajuda: linhas.filter(Boolean).join(" ") };
}

export function FormularioPublicoInterativo({ formulario }: { formulario: FormularioPublico }) {
  const router = useRouter();
  const [posicao, setPosicao] = useState(0);
  const [valores, setValores] = useState<Record<string, ValorDaResposta>>({});
  // As respostas também numa ref, e é ela que os manipuladores leem. Um toque
  // na opção seguido de um toque em "Continuar" acontece antes do re-render, e
  // o estado ainda traria o valor anterior — a pessoa veria "responda esta
  // pergunta" logo depois de responder.
  const respondido = useRef<Record<string, ValorDaResposta>>({});
  const [aceites, setAceites] = useState<Record<string, boolean>>({});
  const [erro, setErro] = useState<string | null>(null);
  const [estado, setEstado] = useState<EstadoDoEnvio>("PREENCHENDO");
  const [limite, setLimite] = useState<{ ate: number } | null>(null);
  const [agora, setAgora] = useState(0);
  const relogio = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Uma chave por preenchimento: se o envio for tentado duas vezes, o servidor
  // reconhece a segunda como repetição em vez de criar outra resposta.
  const chaveEnvio = useMemo(() => crypto.randomUUID(), []);
  // Lido uma vez, na primeira renderização no navegador, antes de qualquer
  // reescrita do endereço pelo roteador.
  const [doEndereco] = useState(lerDoEndereco);

  const total = formulario.perguntas.length;
  const perguntaWhatsapp = formulario.perguntas.find((p) => p.tipo === "whatsapp") ?? null;
  const consentimento = perguntaWhatsapp ? formulario.consentimento : null;
  /** A etapa final existe enquanto houver WhatsApp preenchido: quem pula não consente nada. */
  const pediuConsentimento = (vals: Record<string, ValorDaResposta>) =>
    consentimento !== null && perguntaWhatsapp !== null && !respostaVazia(vals[perguntaWhatsapp.id] ?? null);
  const temEtapa = pediuConsentimento(valores);
  /** Para o rótulo do botão e a barra: com WhatsApp obrigatório a etapa vem, mesmo antes de digitar. */
  const haveraEtapa = temEtapa || (consentimento !== null && perguntaWhatsapp?.obrigatoria === true);

  const naEtapa = temEtapa && posicao === total;
  const pergunta = formulario.perguntas[Math.min(posicao, total - 1)];
  const ultima = posicao === total - 1;
  const comCupom = formulario.modulos.cupom;

  /** Cancela um avanço automático que esteja a caminho. */
  function cancelarAvancoAutomatico() {
    if (relogio.current) clearTimeout(relogio.current);
    relogio.current = null;
  }

  function responder(valor: ValorDaResposta, respostaDefinitiva: boolean) {
    respondido.current = { ...respondido.current, [pergunta.id]: valor };
    setValores(respondido.current);
    // Depois do primeiro erro, nome e WhatsApp são revalidados a cada tecla: o
    // aviso só some quando o valor fica válido (e não ao primeiro caractere).
    const revalida = erro !== null && (pergunta.tipo === "whatsapp" || pergunta.tipo === "nome");
    setErro(revalida ? validarResposta(pergunta, valor) : null);
    cancelarAvancoAutomatico();
    if (respostaDefinitiva && !ultima) {
      relogio.current = setTimeout(() => {
        relogio.current = null;
        setPosicao((p) => p + 1);
      }, ESPERA_ANTES_DE_AVANCAR_MS);
    }
  }

  function avancar() {
    // Dois toques rápidos no mesmo botão não devem virar dois envios. O botão
    // já fica desabilitado, mas o estado é quem manda.
    if (!podeEnviar(estado)) return;
    // Tocar numa opção agenda o avanço automático. Se a pessoa tocar em
    // "Continuar" antes de ele disparar, os dois avançariam e uma pergunta
    // passaria batida: o agendado é cancelado aqui.
    cancelarAvancoAutomatico();
    if (naEtapa) {
      void enviar({ ...respondido.current });
      return;
    }
    const problema = validarResposta(pergunta, respondido.current[pergunta.id] ?? null);
    if (problema) {
      setErro(problema);
      return;
    }
    if (!ultima) setPosicao((p) => p + 1);
    else if (pediuConsentimento(respondido.current)) setPosicao(total);
    else void enviar({ ...respondido.current });
  }

  function voltar() {
    cancelarAvancoAutomatico();
    setErro(null);
    setLimite(null);
    setPosicao((p) => Math.max(0, p - 1));
  }

  async function enviar(respostas: Record<string, ValorDaResposta>) {
    setEstado("ENVIANDO");
    setErro(null);
    setLimite(null);

    const comConsentimento = pediuConsentimento(respostas) && consentimento !== null;
    const envio: EnvioDeResposta = {
      slug: formulario.slug,
      chaveEnvio,
      valores: respostas,
      origem: origemValida(doEndereco.origem),
      ...(doEndereco.ref ? { ref: doEndereco.ref } : {}),
      ...(comConsentimento
        ? {
            consentimento: {
              versao: consentimento.versao,
              // Uma entrada por finalidade exibida: o que não foi marcado vai como "não".
              aceites: Object.fromEntries(consentimento.finalidades.map((f) => [f.id, aceites[f.id] === true])),
            },
          }
        : {}),
    };
    const registro = {
      chaveEnvio,
      slug: formulario.slug,
      modulos: formulario.modulos,
      pediuContato: perguntaWhatsapp !== null,
      pulouContato: perguntaWhatsapp !== null && respostaVazia(respostas[perguntaWhatsapp.id] ?? null),
    };

    let resultado: ResultadoDoEnvio;
    try {
      resultado = await postarResposta(formulario.slug, envio);
    } catch {
      // Falha de rede ou de servidor: guarda no aparelho e segue adiante. A
      // pessoa já respondeu; esperar conexão na frente dela não ajudaria.
      await fila
        .enfileirar({ chave: chaveEnvio, slug: formulario.slug, envio, criadoEm: Date.now(), tentativas: 0 })
        .catch(() => {});
      void pedirSyncEmSegundoPlano();
      guardarConclusao({ ...registro, resultado: null });
      setEstado("ENVIADO");
      router.push("/resposta/concluida?guardada=1");
      return;
    }

    if (!resultado.ok) {
      setEstado("ERRO");
      if (resultado.erro === "LIMITE_EXCEDIDO") {
        // Fica na tela, com tudo preenchido, e não vai para a fila.
        const agoraMs = Date.now();
        setAgora(agoraMs);
        setLimite({ ate: agoraMs + (resultado.tenteDeNovoEmSegundos ?? ESPERA_CURTA_S) * 1000 });
        return;
      }
      // Recusa de validação: leva a pessoa à primeira pergunta com problema.
      const porPergunta = resultado.porPergunta ?? {};
      const primeira = formulario.perguntas.findIndex((p) => porPergunta[p.id]);
      if (primeira >= 0) {
        setPosicao(primeira);
        setErro(porPergunta[formulario.perguntas[primeira].id]);
        return;
      }
      setErro(resultado.mensagem);
      return;
    }

    guardarConclusao({ ...registro, resultado });
    setEstado("ENVIADO");
    router.push("/resposta/concluida");
  }

  // Um formulário novo começa sem o registro da conclusão anterior.
  useEffect(() => {
    limparConclusao();
  }, []);

  // Contagem regressiva do limite: um tique por segundo, só enquanto houver espera.
  const restante = limite ? Math.max(0, Math.ceil((limite.ate - agora) / 1000)) : 0;
  useEffect(() => {
    if (!limite) return;
    const tique = setInterval(() => {
      const agoraMs = Date.now();
      setAgora(agoraMs);
      if (agoraMs >= limite.ate) clearInterval(tique);
    }, 1000);
    return () => clearInterval(tique);
  }, [limite]);

  const enviando = estado === "ENVIANDO";
  const esperando = restante > 0 && restante < ESPERA_CURTA_S;
  const pulavel =
    !naEtapa &&
    !pergunta.obrigatoria &&
    (pergunta.tipo === "whatsapp" || pergunta.tipo === "nome") &&
    respostaVazia(valores[pergunta.id] ?? null);
  const rotuloDoBotao = enviando
    ? T.enviando
    : esperando
      ? LIMITE.enviarEm(restante)
      : naEtapa
        ? comCupom
          ? CONSENTIMENTO.enviarComCupom
          : CONSENTIMENTO.enviar
        : pulavel
          ? T.pularPergunta
          : ultima && !haveraEtapa
            ? T.enviar
            : T.avancar;
  const totalDePassos = total + (haveraEtapa ? 1 : 0);
  const textoDoProgresso = naEtapa ? T.progressoConsentimento : T.progresso(posicao + 1, total);

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <div className="mb-8">
        <p className="text-sm font-medium text-muted-foreground">{textoDoProgresso}</p>
        <div
          role="progressbar"
          aria-valuenow={posicao + 1}
          aria-valuemin={1}
          aria-valuemax={totalDePassos}
          aria-label={textoDoProgresso}
          className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted"
        >
          <span
            className="block h-full rounded-full bg-acento transition-[width] duration-300"
            style={{ width: `${((posicao + 1) / totalDePassos) * 100}%` }}
          />
        </div>
      </div>

      <div key={naEtapa ? "consentimento" : pergunta.id} className="anim-surgir flex-1">
        {naEtapa && consentimento ? (
          <EtapaConsentimento
            consentimento={consentimento}
            controlador={formulario.controlador}
            comCupom={comCupom}
            aceites={aceites}
            desabilitado={enviando}
            aoAlternar={(id, marcada) => setAceites((atuais) => ({ ...atuais, [id]: marcada }))}
          />
        ) : (
          <PerguntaPublica
            pergunta={comAjudaDoCadastro(pergunta, comCupom)}
            valor={valores[pergunta.id] ?? null}
            erro={erro ?? undefined}
            aoResponder={responder}
          />
        )}
      </div>

      <div className="mt-10 flex flex-col gap-3">
        {limite && (
          <div
            role="alert"
            className="rounded-xl border border-border border-l-4 border-l-atencao bg-card p-4 text-left"
          >
            <p className="font-semibold">{LIMITE.titulo}</p>
            <p className="mt-1 text-sm leading-snug text-muted-foreground">{LIMITE.texto}</p>
            {/* A contagem muda a cada segundo: não é anunciada, só o texto inicial. */}
            <p aria-live="off" className="mt-1 text-sm leading-snug text-muted-foreground">
              {/* Abaixo de 1 minuto quem avisa é a contagem do botão. */}
              {restante >= ESPERA_CURTA_S ? LIMITE.tempo(Math.ceil(restante / 60)) : ""}
            </p>
            <p className="mt-1 text-sm leading-snug text-muted-foreground">{LIMITE.pecaAjuda}</p>
          </div>
        )}
        {naEtapa && erro && (
          <p role="alert" className="text-sm font-medium text-perigo">
            {erro}
          </p>
        )}
        <Button size="lg" onClick={avancar} disabled={enviando || esperando} aria-busy={enviando}>
          {rotuloDoBotao}
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
