/**
 * Tudo que a equipe da Essencial Fit lê dentro do painel, em pt-BR.
 *
 * Um arquivo só, pelo mesmo motivo do texto público: dá para revisar a
 * linguagem inteira de uma vez, e ninguém precisa abrir um componente para
 * corrigir uma frase.
 */
import type { Variacao } from "@/dominio/resultados/variacao";
import { formatarPorcentagem } from "@/utilitarios/numeros";

export const A = {
  login: {
    marca: "Essencial Fit",
    titulo: "Acesso administrativo",
    subtitulo: "Painel de respostas. Uso restrito à equipe Essencial Fit.",
    senha: "Senha",
    codigo: "Código do autenticador",
    codigoAjuda: "O código de 6 dígitos é gerado pelo aplicativo autenticador e muda a cada 30 segundos.",
    entrar: "Entrar",
    entrando: "Verificando…",
    erro: "Senha ou código de autenticação inválido.",
    bloqueado: (min: number) => `Muitas tentativas. Aguarde ${min} minutos e tente de novo.`,
    naoConfigurado: "O acesso ainda não foi configurado neste ambiente. Fale com quem administra o sistema.",
    voltar: "Voltar ao início",
    teste: {
      titulo: "Modo de teste",
      texto:
        "Este ambiente roda com dados fictícios em memória, sem banco e sem autenticador. Entre direto — ou preencha os campos com qualquer coisa, que também funciona.",
      entrar: "Entrar como usuário de teste",
      entrando: "Abrindo o painel…",
    },
    ajuda: {
      titulo: "Como configurar o autenticador",
      passos: [
        "Abra o Google Authenticator, Authy ou outro aplicativo de códigos (TOTP).",
        "Adicione uma nova conta.",
        "Escolha inserir uma chave manualmente.",
        "Nome: Essencial Fit.",
        "Chave: a ADMIN_TOTP_SECRET fornecida por quem administra o sistema.",
        "Tipo: baseado em tempo.",
      ],
      rodape:
        "Pronto: o aplicativo passa a mostrar um código de 6 dígitos que muda a cada 30 segundos. A chave nunca aparece nesta tela.",
    },
  },

  nav: {
    areas: "Áreas do painel",
    visaoGeral: "Visão Geral",
    formularios: "Formulários",
    resultados: "Resultados & IA",
    sair: "Sair",
    pular: "Ir para o conteúdo",
  },

  visaoGeral: {
    titulo: "Visão Geral",
    subtitulo: "Como está a coleta de respostas agora.",
    indicadores: {
      titulo: "Resumo da coleta",
      total: "Respostas recebidas",
      hoje: "Respostas hoje",
      hojeContexto: (periodo: number, dias: number) => `${periodo} nos últimos ${dias} dias.`,
      ativos: "Formulários ativos",
      ativosContexto: (total: number) =>
        total === 1 ? "De 1 formulário disponível." : `De ${total} formulários disponíveis.`,
      ultima: "Última resposta",
      ultimaVazio: "Ainda não houve",
      maisRespondido: (nome: string, total: number) => `Mais respondido: ${nome}, com ${total}.`,
    },
    sinais: {
      titulo: "Sinais recentes",
      descricao: "O que os dados pedem agora. Aparece só o que se sustenta.",
      semSinais: "Nada pedindo atenção no momento.",
    },
    serie: {
      titulo: "Respostas por dia",
      descricao: (dias: number) => `Últimos ${dias} dias, no fuso da loja.`,
      vazio: "Nenhuma resposta nesta janela.",
    },
    formularios: { titulo: "Formulários", verTodos: "Ver todos" },
    respostasRecentes: { titulo: "Respostas recentes", verResultados: "Ver resultados por formulário" },
    vazio: {
      titulo: "Nenhum formulário disponível ainda",
      descricao:
        "Um formulário é o que abre quando o cliente encosta o celular no cartão NFC ou lê o QR Code. Assim que o primeiro estiver no ar, os números da coleta aparecem aqui.",
    },
    semRespostas: {
      titulo: "Nenhuma resposta recebida ainda",
      descricao:
        "As respostas aparecerão aqui quando clientes preencherem um formulário pelo NFC ou QR Code.",
    },
  },

  /** "38 respostas nos últimos 7 dias · 12% a menos que nos 7 dias anteriores (43)." */
  comparacao: {
    noPeriodo: (total: number, dias: number) =>
      `${total} ${total === 1 ? "resposta" : "respostas"} nos últimos ${dias} dias`,
    variacao: (variacao: Variacao, anterior: number, dias: number) => {
      switch (variacao.tipo) {
        case "sem-base":
          return `Nenhuma resposta nos ${dias} dias anteriores para comparar.`;
        case "estavel":
          return `Parecido com os ${dias} dias anteriores (${anterior}).`;
        case "alta":
          return `${formatarPorcentagem(variacao.fracao)} a mais que nos ${dias} dias anteriores (${anterior}).`;
        case "queda":
          return `${formatarPorcentagem(variacao.fracao)} a menos que nos ${dias} dias anteriores (${anterior}).`;
      }
    },
  },

  formularios: {
    titulo: "Formulários",
    subtitulo:
      "Os formulários disponíveis para a sua loja e como cada um está indo. Cada um tem um endereço próprio, gravado no cartão NFC ou no QR Code.",
    respostas: (total: number) => `${total} ${total === 1 ? "resposta" : "respostas"}`,
    semRespostas: "Sem respostas",
    campos: {
      objetivo: "Objetivo",
      respostas: "Respostas",
      ultimaResposta: "Última resposta",
      criadoEm: "Criado em",
      nenhumaAinda: "Nenhuma ainda",
    },
    endereco: {
      titulo: "Endereço público",
      ajuda: "É este endereço que vai no cartão NFC ou vira QR Code.",
    },
    acoes: {
      verResultados: "Ver resultados",
      copiarLink: "Copiar link",
      copiado: "Link copiado",
      ativar: "Ativar",
      desativar: "Desativar",
      arquivar: "Arquivar",
      abrirFormulario: "Abrir formulário",
      erro: "Não foi possível mudar a situação agora. Tente de novo.",
    },
    vazio: {
      titulo: "Nenhum formulário disponível ainda",
      descricao:
        "Os formulários são preparados e configurados pela equipe que cuida do sistema. Assim que o primeiro estiver pronto, ele aparece aqui.",
    },
  },

  resultados: {
    titulo: "Resultados & IA",
    subtitulo:
      "Primeiro os números, tirados direto das respostas. Depois, uma leitura do que eles podem significar e do que dá para fazer com isso.",
    escolher: "Escolher formulário",
    vazio: {
      titulo: "Nenhum formulário disponível ainda",
      descricao: "Assim que o primeiro formulário estiver no ar, os resultados aparecem aqui.",
    },
    naoEncontrado: {
      titulo: "Formulário não encontrado",
      descricao: "Este endereço não corresponde a nenhum formulário disponível. Escolha um na lista acima.",
    },
    dados: {
      titulo: "Dados",
      etiqueta: "Direto das respostas",
      descricao: "Tudo nesta parte é contagem feita sobre as respostas recebidas, sem interpretação.",
      total: "Respostas recebidas",
      noPeriodo: (dias: number) => `Nos últimos ${dias} dias`,
      hoje: "Respostas hoje",
      ultima: "Última resposta",
      ultimaVazio: "Ainda não houve",
      semRespostas: {
        titulo: "Nenhuma resposta recebida ainda",
        descricao: "Os números aparecem aqui quando clientes preencherem este formulário pelo NFC ou QR Code.",
      },
    },
    evolucao: {
      titulo: "Evolução das respostas",
      descricao: (dias: number) => `Respostas por dia nos últimos ${dias} dias, no fuso da loja.`,
    },
    origens: {
      titulo: "Por onde as respostas chegam",
      descricao: "Cartão NFC, QR Code ou link direto.",
    },
    porPergunta: {
      titulo: "Resposta por pergunta",
      descricao: "Como as pessoas responderam a cada pergunta da versão atual do formulário.",
      media: (valor: string) => `Média ${valor}`,
      maisEscolhida: (rotulo: string, proporcao: string) => `Mais escolhida: ${rotulo} · ${proporcao}`,
      respostasEmTexto: "Respostas em texto",
      ultimasEmTexto: (mostradas: number, total: number) =>
        mostradas < total ? `As ${mostradas} mais recentes de ${total}.` : "",
      semRespostasNaPergunta: "Ninguém respondeu a esta pergunta ainda.",
    },
    analise: {
      titulo: "Inteligência dos dados",
      etiqueta: "Leitura automática",
      descricao:
        "O que os números acima podem significar. Cada ponto mostra em que dado se apoia, e o que é fato fica separado do que é interpretação ou hipótese.",
      carregando: "Analisando os resultados…",
      insuficiente: (total: number, minimo: number) =>
        `Ainda não há respostas suficientes para gerar esta análise. São ${total} até agora; a análise começa a partir de ${minimo}.`,
      semAchados: "Os dados atuais ainda não são suficientes para sustentar uma conclusão além dos números acima.",
      natureza: {
        fato: "Fato observado",
        interpretacao: "Interpretação",
        hipotese: "Hipótese",
      },
      grupos: {
        fato: { titulo: "Fatos observados", descricao: "O que as respostas mostram, sem interpretação." },
        interpretacao: { titulo: "Interpretações", descricao: "O que os fatos podem indicar." },
        hipotese: { titulo: "Hipóteses a investigar", descricao: "Explicações possíveis. Ainda não são conclusões." },
      },
      comBaseEm: "Com base em",
      fonte: "Fonte",
      limites: "Limites desta análise",
    },
    acoes: {
      titulo: "Possíveis ações",
      descricao: "O que dá para fazer com essa informação. São sugestões para avaliar, não certezas.",
      vazio: "Por enquanto, os dados não apontam uma ação específica. Vale acompanhar os números nas próximas semanas.",
    },
    respostas: {
      titulo: "Respostas individuais",
      descricao: "Cada resposta recebida, da mais recente para a mais antiga — a base de todos os números acima.",
      pagina: (atual: number, total: number) => `Página ${atual} de ${total}`,
      paginacao: "Páginas de respostas",
      anterior: "Anterior",
      proxima: "Próxima",
    },
    erro: {
      titulo: "Não foi possível carregar os resultados.",
      descricao: "Pode ter sido uma falha passageira. Tente de novo em instantes.",
      tentar: "Tentar de novo",
      voltar: "Voltar à Visão Geral",
    },
  },

  /** Uma resposta individual, onde quer que ela apareça. */
  respostas: {
    versao: (numero: number) => `versão ${numero}`,
    semResposta: "Sem resposta",
  },
} as const;
