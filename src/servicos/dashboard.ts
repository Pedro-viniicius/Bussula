/**
 * Transforma respostas guardadas em informação para quem administra.
 *
 * Nenhum número daqui é gravado no banco: tudo é contado a partir das
 * respostas cruas no momento da consulta. É mais uma consulta, e em troca não
 * existe indicador que possa discordar do que os clientes responderam.
 */
import { DIAS_PERIODO_PADRAO } from "@/dominio/constantes";
import type { DistribuicaoDaPergunta, PontoDaSerie, ResumoDaColeta, SinalRelevante } from "@/dominio/dashboard/tipos";
import { MAIOR_NOTA_DA_AVALIACAO, type Pergunta } from "@/dominio/formularios/perguntas";
import type { FormularioNaLista } from "@/dominio/formularios/tipos";
import type { Resposta } from "@/dominio/respostas/tipos";
import { formulariosGravados, respostasGravadas } from "@/repositorios";
import { inicioDeDiasAtras, inicioDeHoje } from "@/utilitarios/tempo";

/** Quantos textos abertos a tela mostra por pergunta. */
const TEXTOS_MOSTRADOS_POR_PERGUNTA = 8;

/** Dias sem resposta a partir dos quais um formulário ativo vira um sinal. */
const DIAS_DE_SILENCIO_QUE_PREOCUPAM = 7;

export async function carregarResumoDoDashboard(agora: Date = new Date()): Promise<ResumoDaColeta> {
  const [formularios, totaisPorFormulario, totalDeRespostas, respostasHoje, respostasNoPeriodo, ultimaRespostaEm] =
    await Promise.all([
      formulariosGravados.listar(),
      respostasGravadas.totaisPorFormulario(),
      respostasGravadas.contarTudo(),
      respostasGravadas.contarDesde(inicioDeHoje(agora)),
      respostasGravadas.contarDesde(inicioDeDiasAtras(DIAS_PERIODO_PADRAO - 1, agora)),
      respostasGravadas.ultimaEm(),
    ]);

  let maisRespondido: ResumoDaColeta["formularioMaisRespondido"] = null;
  for (const formulario of formularios) {
    const total = totaisPorFormulario.get(formulario.id)?.total ?? 0;
    if (total > (maisRespondido?.total ?? 0)) {
      maisRespondido = { id: formulario.id, nome: formulario.nome, total };
    }
  }

  return {
    totalDeRespostas,
    respostasHoje,
    respostasNoPeriodo,
    formulariosAtivos: formularios.filter((f) => f.situacao === "ATIVO").length,
    ultimaRespostaEm,
    formularioMaisRespondido: maisRespondido,
  };
}

/** Respostas por dia na janela padrão, com os dias vazios preenchidos com zero. */
export async function carregarSerieDeRespostas(
  dias: number = DIAS_PERIODO_PADRAO,
  agora: Date = new Date(),
): Promise<PontoDaSerie[]> {
  const desde = inicioDeDiasAtras(dias - 1, agora);
  const recebidas = await respostasGravadas.porDia(desde);
  const porDia = new Map(recebidas.map((p) => [p.dia.toDateString(), p.total]));

  const serie: PontoDaSerie[] = [];
  for (let i = 0; i < dias; i++) {
    const dia = inicioDeDiasAtras(dias - 1 - i, agora);
    serie.push({ dia, total: porDia.get(dia.toDateString()) ?? 0 });
  }
  return serie;
}

/**
 * O que merece atenção agora. Só entra na lista o que os dados sustentam —
 * sem sinal inventado para a tela não ficar vazia.
 */
export function detectarSinais(formularios: FormularioNaLista[], agora: Date = new Date()): SinalRelevante[] {
  const sinais: SinalRelevante[] = [];
  const ativos = formularios.filter((f) => f.situacao === "ATIVO");

  if (formularios.length > 0 && ativos.length === 0) {
    sinais.push({
      chave: "sem-formulario-ativo",
      tom: "atencao",
      titulo: "Nenhum formulário ativo",
      texto: "Nenhum cartão NFC ou QR Code está recebendo respostas neste momento.",
      href: "/admin/formularios",
      acao: "Ver formulários",
    });
  }

  for (const formulario of ativos) {
    if (formulario.totalDeRespostas === 0) {
      sinais.push({
        chave: `sem-resposta-${formulario.id}`,
        tom: "atencao",
        titulo: `"${formulario.nome}" ainda não recebeu respostas`,
        texto: "Confira se o link certo foi gravado no cartão NFC ou no QR Code.",
        href: `/admin/formularios/${formulario.id}`,
        acao: "Abrir formulário",
      });
      continue;
    }

    const diasEmSilencio = formulario.ultimaRespostaEm
      ? Math.floor((agora.getTime() - formulario.ultimaRespostaEm.getTime()) / 86_400_000)
      : 0;
    if (diasEmSilencio >= DIAS_DE_SILENCIO_QUE_PREOCUPAM) {
      sinais.push({
        chave: `silencio-${formulario.id}`,
        tom: "atencao",
        titulo: `"${formulario.nome}" está sem respostas há ${diasEmSilencio} dias`,
        texto: "O formulário está ativo, mas ninguém respondeu na última semana.",
        href: `/admin/formularios/${formulario.id}`,
        acao: "Abrir formulário",
      });
    }
  }

  return sinais;
}

/**
 * Como as pessoas responderam a cada pergunta de um formulário.
 *
 * Lê as respostas de todas as versões e casa cada valor com a pergunta de
 * mesmo id na versão atual. Pergunta que só existiu numa versão antiga não
 * aparece — o que foi respondido continua guardado, só não tem onde ser
 * mostrado aqui.
 */
export async function calcularDistribuicoes(
  formularioId: string,
  perguntas: Pergunta[],
): Promise<DistribuicaoDaPergunta[]> {
  const respostas = await respostasGravadas.doFormulario(formularioId);
  return perguntas.map((pergunta) => resumirPergunta(pergunta, respostas));
}

function resumirPergunta(pergunta: Pergunta, respostas: Resposta[]): DistribuicaoDaPergunta {
  const valores = respostas
    .map((r) => r.valores[pergunta.id])
    .filter((v) => v !== undefined && v !== null);

  const base: DistribuicaoDaPergunta = {
    perguntaId: pergunta.id,
    enunciado: pergunta.enunciado,
    tipo: pergunta.tipo,
    totalDeRespostas: valores.length,
    opcoes: [],
    media: null,
    textos: [],
  };

  switch (pergunta.tipo) {
    case "escolha_unica":
      base.opcoes = contarRotulos(pergunta.opcoes, valores.filter((v): v is string => typeof v === "string"));
      return base;

    case "multipla_escolha": {
      const marcadas = valores.flatMap((v) => (Array.isArray(v) ? v : []));
      base.opcoes = contarRotulos(pergunta.opcoes, marcadas);
      return base;
    }

    case "sim_nao": {
      const booleanos = valores.filter((v): v is boolean => typeof v === "boolean");
      base.opcoes = [
        { rotulo: "Sim", total: booleanos.filter(Boolean).length },
        { rotulo: "Não", total: booleanos.filter((v) => !v).length },
      ];
      return base;
    }

    case "escala":
    case "avaliacao": {
      const numeros = valores.filter((v): v is number => typeof v === "number");
      const menor = pergunta.tipo === "avaliacao" ? 1 : (pergunta.escala?.minimo ?? 0);
      const maior = pergunta.tipo === "avaliacao" ? MAIOR_NOTA_DA_AVALIACAO : (pergunta.escala?.maximo ?? 10);
      const pontos: { rotulo: string; total: number }[] = [];
      for (let valor = menor; valor <= maior; valor++) {
        pontos.push({ rotulo: String(valor), total: numeros.filter((n) => n === valor).length });
      }
      base.opcoes = pontos;
      base.media = numeros.length ? numeros.reduce((soma, n) => soma + n, 0) / numeros.length : null;
      return base;
    }

    case "texto_curto":
    case "texto_livre":
      base.textos = valores
        .filter((v): v is string => typeof v === "string" && v.trim() !== "")
        .slice(0, TEXTOS_MOSTRADOS_POR_PERGUNTA);
      return base;
  }
}

/** Conta quantas vezes cada opção apareceu, na ordem em que foram escritas. */
function contarRotulos(opcoes: string[], marcadas: string[]): { rotulo: string; total: number }[] {
  return opcoes.map((rotulo) => ({ rotulo, total: marcadas.filter((m) => m === rotulo).length }));
}
