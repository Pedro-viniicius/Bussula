import type { ModulosPublicos } from "@/dominio/formularios/tipos";
import type { ResultadoDoEnvio } from "@/dominio/respostas/envio";
import { EVENTO_FILA_ENVIADA, type DetalheFilaEnviada } from "./sync";

/**
 * O que a tela de conclusão precisa saber do envio que acabou de acontecer.
 *
 * A tela `/resposta/concluida` não consulta o banco (precisa abrir offline) e
 * o cupom nunca vai na URL. Por isso o formulário deixa aqui, em
 * `sessionStorage`, o resultado do envio; `resultado: null` quer dizer que o
 * envio ficou na fila do aparelho e ainda não chegou ao servidor.
 *
 * Quando a fila sincroniza, o resultado chega por dois caminhos: o evento
 * `fila:enviada` da janela (sync.ts, página aberta) e o `postMessage` do
 * service worker (aba aberta, envio feito em segundo plano). Os dois acabam em
 * `registrarResultadoDaFila`. Fechou a página, perdeu o cupom: é decisão do
 * dono, e o gerente consegue ver e enviar o cupom pelo painel.
 */
export type RegistroDaConclusao = {
  chaveEnvio: string;
  slug: string;
  modulos: ModulosPublicos;
  /** O formulário tem pergunta de WhatsApp (e, portanto, pode render benefícios). */
  pediuContato: boolean;
  /** A pessoa pulou o WhatsApp: não existe contato, cupom nem indicação. */
  pulouContato: boolean;
  resultado: ResultadoDoEnvio | null;
};

const CHAVE_DO_ARMAZENAMENTO = "bussola:conclusao";

/** Grava o registro. Sem `sessionStorage` (modo privado, bloqueio), a tela cai no texto genérico. */
export function guardarConclusao(registro: RegistroDaConclusao): void {
  try {
    sessionStorage.setItem(CHAVE_DO_ARMAZENAMENTO, JSON.stringify(registro));
  } catch {
    /* sem armazenamento: a conclusão mostra a confirmação genérica */
  }
}

/**
 * Apaga o registro. Um formulário novo começa sem ele: o aparelho da loja é
 * compartilhado e o cupom (ou o código de indicação) de uma pessoa não pode
 * sobrar para a próxima que abrir a tela de conclusão.
 */
export function limparConclusao(): void {
  try {
    sessionStorage.removeItem(CHAVE_DO_ARMAZENAMENTO);
  } catch {
    /* sem armazenamento: não há o que apagar */
  }
  avisarOuvintes();
}

/** O texto cru guardado. É o "snapshot" do `useSyncExternalStore`: strings comparam por valor. */
export function lerConclusaoBruta(): string | null {
  try {
    return sessionStorage.getItem(CHAVE_DO_ARMAZENAMENTO);
  } catch {
    return null;
  }
}

/** Lê o texto guardado com desconfiança: o que está lá pode ser de uma versão antiga ou adulterado. */
export function interpretarConclusao(bruto: string | null): RegistroDaConclusao | null {
  if (!bruto) return null;
  try {
    const dado = JSON.parse(bruto) as Partial<RegistroDaConclusao> | null;
    if (!dado || typeof dado !== "object") return null;
    if (typeof dado.chaveEnvio !== "string" || typeof dado.slug !== "string") return null;
    const m = dado.modulos;
    return {
      chaveEnvio: dado.chaveEnvio,
      slug: dado.slug,
      modulos: {
        recompra: m?.recompra === true,
        ofertas: m?.ofertas === true,
        cupom: m?.cupom === true,
        indicacao: m?.indicacao === true,
      },
      pediuContato: dado.pediuContato === true,
      pulouContato: dado.pulouContato === true,
      resultado: dado.resultado && typeof dado.resultado === "object" ? dado.resultado : null,
    };
  } catch {
    return null;
  }
}

const ouvintes = new Set<() => void>();

function avisarOuvintes() {
  for (const ouvinte of ouvintes) ouvinte();
}

/** Assinatura para o `useSyncExternalStore`. */
export function assinarConclusao(ouvinte: () => void): () => void {
  ouvintes.add(ouvinte);
  return () => ouvintes.delete(ouvinte);
}

/**
 * Um item da fila foi resolvido. Só interessa se for o envio desta aba: grava
 * o resultado no registro e avisa a tela.
 *
 * O primeiro resultado vence. A página e o service worker podem reenviar o
 * mesmo item quase ao mesmo tempo, e o segundo reenvio volta como
 * `ja_emitido` (sem código): ele não pode apagar o cupom que acabou de chegar.
 * A única exceção é o inverso: um resultado com cupom `emitido` substitui um
 * registro anterior que ainda não o tinha (ex.: o `ja_emitido` de um reenvio
 * que chegou primeiro), porque só o `emitido` traz o código que a pessoa precisa.
 */
export function registrarResultadoDaFila(chave: string, resultado: ResultadoDoEnvio): void {
  const registro = interpretarConclusao(lerConclusaoBruta());
  if (!registro || registro.chaveEnvio !== chave) return;
  if (registro.resultado !== null && !(trazCupomEmitido(resultado) && !trazCupomEmitido(registro.resultado))) return;
  guardarConclusao({ ...registro, resultado });
  avisarOuvintes();
}

function trazCupomEmitido(resultado: ResultadoDoEnvio): boolean {
  return resultado.ok && resultado.beneficios?.cupom?.status === "emitido";
}

let escutando = false;

/**
 * Liga as escutas uma vez por página, no momento em que o módulo é carregado
 * (antes de qualquer efeito de React), para o resultado de um envio rápido da
 * fila não chegar antes de alguém estar ouvindo.
 */
function escutarFila() {
  if (escutando || typeof window === "undefined") return;
  escutando = true;

  window.addEventListener(EVENTO_FILA_ENVIADA, (e) => {
    const detalhe = (e as CustomEvent<DetalheFilaEnviada>).detail;
    if (detalhe) registrarResultadoDaFila(detalhe.chave, detalhe.resultado);
  });

  navigator.serviceWorker?.addEventListener("message", (e: MessageEvent) => {
    const dados = e.data as { tipo?: string; chave?: unknown; resultado?: ResultadoDoEnvio } | null;
    if (dados?.tipo === EVENTO_FILA_ENVIADA && typeof dados.chave === "string" && dados.resultado) {
      registrarResultadoDaFila(dados.chave, dados.resultado);
    }
  });
}

escutarFila();
