/**
 * Tudo que uma pessoa de fora da Essencial Fit lê: a página de acesso e o
 * formulário que abre pelo cartão NFC ou pelo QR Code.
 *
 * Fica tudo num arquivo só para ser possível revisar a linguagem inteira de
 * uma vez, sem caçar frase espalhada pelos componentes.
 */
import { MARCA } from "@/lib/marca";

export const ACESSO = {
  titulo: MARCA.nome,
  subtitulo: "Coleta e análise da experiência dos clientes.",
  explicacao:
    "Os formulários abrem pelo cartão NFC ou pelo QR Code na loja. As respostas chegam ao painel da equipe.",
  entrarNoPainel: "Entrar no painel administrativo",
  verFormularios: "Ver formulários",
  privacidade: "Como tratamos os dados",
};

export const FORMULARIO_PUBLICO = {
  /** Passo a passo, no topo da tela. */
  progresso: (atual: number, total: number) => `Pergunta ${atual} de ${total}`,
  opcional: "Opcional",
  avancar: "Continuar",
  voltar: "Voltar",
  enviar: "Enviar respostas",
  enviando: "Enviando…",
  carregando: "Carregando…",
  pularPergunta: "Pular esta pergunta",
  podeEscolherVarias: "Pode escolher mais de uma.",
  sim: "Sim",
  nao: "Não",
  estrelas: (nota: number) => `${nota} de 5 estrelas`,
  revisar: "Revisar respostas",

  naoEncontrado: {
    titulo: "Formulário não encontrado",
    texto: "Este endereço não corresponde a nenhum formulário. Confira o cartão ou o QR Code usado.",
  },
  inativo: {
    titulo: "Formulário fora do ar",
    texto: "Este formulário não está recebendo respostas no momento. Obrigado por passar na Essencial Fit!",
  },
  erro: {
    titulo: "Algo deu errado",
    texto: "Não conseguimos carregar o formulário agora. Tente de novo em instantes.",
    tentar: "Tentar de novo",
  },

  falhaNoEnvio: "Não conseguimos enviar agora. Sua resposta ficou guardada neste aparelho e vai sozinha quando a conexão voltar.",
  semConexao: "Sem conexão no momento.",
};

export const CONCLUIDO = {
  titulo: "Resposta enviada",
  texto: "Obrigado! Sua resposta ajuda a Essencial Fit a melhorar o atendimento.",
  guardada: "Sua resposta está guardada neste aparelho e será enviada assim que a conexão voltar.",
  fechar: "Você já pode fechar esta página.",
};

export const PRIVACIDADE = {
  titulo: "Privacidade em linguagem clara",
  resumo:
    "Perguntamos pouco e explicamos por quê. O que você responde nos formulários da Essencial Fit serve para entender a experiência na loja e melhorá-la.",
  secoes: [
    {
      titulo: "O que é registrado",
      texto:
        "Apenas as respostas que você escolheu enviar, a data do envio e se o acesso veio de um cartão NFC, de um QR Code ou de um link. Não pedimos documento, não guardamos o número do seu aparelho e não usamos rastreadores de terceiros.",
    },
    {
      titulo: "Para que usamos",
      texto:
        "As respostas são somadas para virar indicadores da experiência na loja. Nenhuma resposta é vendida nem compartilhada fora da Essencial Fit.",
    },
    {
      titulo: "Quando você se identifica",
      texto:
        "Alguns formulários podem pedir nome ou contato. Quando isso acontecer, a própria pergunta diz para que serve, e responder é opcional salvo indicação em contrário.",
    },
    {
      titulo: "Seus direitos",
      texto: "Você pode pedir confirmação, acesso, correção ou exclusão do que enviou pelo e-mail abaixo.",
    },
  ],
  voltar: "Voltar ao início",
};
