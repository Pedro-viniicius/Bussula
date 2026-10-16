/**
 * Tudo que a equipe da Essencial Fit lê dentro do painel, em pt-BR.
 *
 * Um arquivo só, pelo mesmo motivo do texto público: dá para revisar a
 * linguagem inteira de uma vez, e ninguém precisa abrir um componente para
 * corrigir uma frase.
 */
import type { Variacao } from "@/dominio/resultados/variacao";
import { formatarPorcentagem } from "@/utilitarios/numeros";

/** "Oi, Marcos!" ou, sem nome, "Oi!". */
function saudacao(primeiroNome: string | null): string {
  return primeiroNome ? `Oi, ${primeiroNome}!` : "Oi!";
}

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
    contatos: "Contatos",
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

    /** Formulário que pede dado pessoal e depende dos dados da empresa responsável. */
    travado: {
      etiqueta: "Travado",
      explicacao: "Travado: não abre para os clientes até os dados da empresa serem preenchidos.",
      linkNaoAbre: "Este link não abre enquanto o formulário estiver travado.",
      aviso: {
        titulo: "Há formulários fora do ar por falta de dados da empresa",
        texto: (faltam: string) =>
          `Em produção, formulários que pedem consentimento só abrem depois que os dados da empresa responsável (razão social, CNPJ, endereço e e-mail de privacidade) estiverem preenchidos. Faltam: ${faltam}. Peça a quem cuida do sistema para completá-los.`,
      },
      /** Fora de produção o formulário abre; o painel só lembra. */
      avisoDeExemplo:
        "Dados da empresa ainda são de exemplo. Em produção este formulário ficaria travado.",
      campos: {
        razaoSocial: "razão social",
        cnpj: "CNPJ",
        endereco: "endereço",
        emailPrivacidade: "e-mail de privacidade",
      },
    },

    /** Módulos do formulário, só leitura. */
    modulos: {
      titulo: "Módulos deste formulário",
      ligado: "Ligado",
      desligado: "Desligado",
      definidosPelaEquipe: "Os módulos são definidos pela equipe que cuida do sistema.",
      nenhum: "Este formulário só coleta respostas.",
      lista: {
        recompra: {
          rotulo: "Contato para recompra",
          descricao: "Pede o WhatsApp e o consentimento. O gerente chama pelo painel.",
        },
        ofertas: {
          rotulo: "Ofertas e novidades",
          descricao: "Pergunta se o cliente aceita receber ofertas e novidades.",
        },
        cupom: {
          rotulo: "Cupom de desconto",
          descricao: "Gera um código único por telefone. Sem sorteio.",
        },
        indicacao: {
          rotulo: "Indique um amigo",
          descricao: "Mostra um link para compartilhar no WhatsApp. Conta indicações no painel.",
        },
      },
    },

    /** Configuração da loja por formulário (não cria versão). */
    configuracao: {
      titulo: "Configurar este formulário",
      salvar: "Salvar configurações",
      salvando: "Salvando…",
      salvo: "Configurações salvas.",
      notaSemVersao: "Estas opções não criam uma nova versão do formulário. Cada alteração fica registrada.",
      erroGeral: "Não foi possível salvar agora. Suas alterações continuam na tela. Tente de novo.",
      somenteLeitura: "Este formulário está fora do ar ou arquivado. As configurações aparecem só para consulta.",
      sim: "Sim",
      nao: "Não",
      nome: {
        rotulo: "Pedir o nome do cliente",
        ajuda: "Se desligado, o cliente pode pular a pergunta de nome.",
        semPergunta: "Este formulário não tem a pergunta de nome.",
        precisaDoWhatsapp: "Para exigir o nome, o WhatsApp também precisa ser obrigatório.",
      },
      whatsapp: {
        rotulo: "Exigir o WhatsApp",
        ajuda: "Se desligado, o cliente pode pular o WhatsApp.",
        semPergunta: "Este formulário não tem a pergunta de WhatsApp.",
        travadoPeloNome: "Desligue a exigência do nome antes de tornar o WhatsApp opcional.",
        semWhatsappSemCupom:
          "Sem WhatsApp, sem cupom: com o cupom ligado, quem pular o WhatsApp não recebe cupom nem link de indicação e vai embora sem brinde.",
      },
      destino: {
        rotulo: "Para onde vai o link 'Indique um amigo'",
        ajuda: "É o formulário que seu amigo vai abrir pelo link.",
        ajudaSemOutros: "Não há outros formulários ativos com WhatsApp.",
        opcaoPadrao: "Este mesmo formulário (padrão)",
        foraDoAr: (nome: string) => `${nome} (fora do ar)`,
        avisoForaDoAr:
          "O formulário de destino da indicação saiu do ar. Por enquanto o link aponta para este mesmo formulário. Escolha outro destino se quiser mudar.",
      },
      brinde: {
        rotulo: "Texto do brinde",
        ajuda: "Aparece para o cliente junto do código. Ex.: 10% de desconto na próxima compra.",
        contador: (n: number, maximo: number) => `${n}/${maximo} caracteres`,
        nota: "Mudar o texto vale para os próximos cupons; quem já recebeu mantém o texto antigo.",
        vazio: "Escreva o brinde que o cliente vai receber.",
        longo: "Use até 120 caracteres.",
      },
      previa: {
        titulo: "Como o cliente vê",
        exemplo: "Exemplo",
        cupom: "Seu cupom",
        codigo: "EXEMPLO-0000",
      },
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

  /** Contatos: quem se cadastrou e pode ser chamado. Dado pessoal: tudo aparece escondido até alguém revelar. */
  contatos: {
    titulo: "Contatos",
    subtitulo:
      "Clientes que se cadastraram pelos cartões e QR Codes. Os dados aparecem escondidos; revelar e exportar ficam registrados.",
    resumo: {
      titulo: "Resumo dos contatos",
      contatos: "Contatos cadastrados",
      aceitam: "Aceitam receber mensagens",
      cupons: "Cupons emitidos",
      indicacoes: "Indicações recebidas",
    },
    filtros: {
      titulo: "Filtrar contatos",
      formulario: "Formulário",
      todosFormularios: "Todos os formulários",
      origem: "Origem",
      todasOrigens: "Todas",
      mostrar: "Mostrar",
      mostrarTodos: "Todos",
      mostrarQueAceitam: "Só quem aceitou mensagens",
      ordenar: "Ordenar",
      maisRecentes: "Mais recentes",
      maisIndicacoes: "Mais indicações",
      aplicar: "Aplicar",
      limpar: "Limpar filtros",
    },
    exportar: {
      botao: (total: number) => `Exportar CSV (${total} ${total === 1 ? "contato" : "contatos"})`,
      gerando: "Gerando arquivo…",
      apoio:
        "Inclui só quem aceitou receber mensagens, respeitando os filtros acima. O download fica registrado. Colunas: Nome, WhatsApp, formulário, origem, data, aceita recompra, aceita ofertas, indicações.",
      nenhum: "Nenhum contato que aceitou mensagens nesta seleção.",
      erro: "Não foi possível gerar o arquivo agora. Tente de novo.",
      colunas: [
        "Nome",
        "WhatsApp",
        "Formulário",
        "Origem",
        "Data",
        "Aceita recompra",
        "Aceita ofertas",
        "Indicações",
      ],
      sim: "Sim",
      nao: "Não",
      nomeDoArquivo: (data: string) => `contatos-${data}.csv`,
    },
    lista: {
      titulo: "Lista de contatos",
      contador: (total: number) => `${total} ${total === 1 ? "contato" : "contatos"}`,
      colunas: { contato: "Contato", formulario: "Formulário e origem", quando: "Quando", indicacoes: "Indicações", acoes: "Ações" },
      semNome: "Sem nome",
      formulario: "Formulário",
      aceita: "Aceita mensagens",
      naoAceitou: "Não aceitou mensagens",
      indicacoes: (total: number) => (total === 1 ? "1 indicação" : `${total} indicações`),
      nenhumaIndicacao: "Nenhuma indicação",
      pagina: (atual: number, total: number) => `Página ${atual} de ${total}`,
      paginacao: "Páginas de contatos",
      anterior: "Anterior",
      proxima: "Próxima",
    },
    cupom: {
      valido: "Cupom válido",
      vencido: "Cupom vencido",
      sem: "Sem cupom",
      validoAte: (data: string) => `Válido até ${data}`,
      venceuEm: (data: string) => `Venceu em ${data}`,
      naoGerado: "Não foi possível gerar o cupom deste contato.",
      jaTinha: "Já recebeu o cupom antes",
      codigo: (codigo: string) => `Cupom ${codigo}`,
    },
    acoes: {
      revelar: "Revelar contato",
      revelando: "Revelando…",
      revelarDe: (contato: string) => `Revelar contato de ${contato}`,
      revelado: "Contato revelado",
      anunciarRevelado: "Contato revelado.",
      ocultar: "Ocultar",
      ocultarDe: (contato: string) => `Ocultar contato de ${contato}`,
      chamar: "Chamar no WhatsApp",
      chamarDe: (contato: string) => `Chamar ${contato} no WhatsApp`,
      enviarCupom: "Enviar cupom no WhatsApp",
      enviarCupomDe: (contato: string) => `Enviar cupom a ${contato} no WhatsApp`,
      abreWhatsapp: "(abre o WhatsApp)",
      erroAoRevelar: "Não foi possível revelar agora. Tente de novo.",
      naoAceitou: "Não aceitou mensagens.",
      apoioSoCupom:
        "Este contato não aceitou mensagens de recompra ou ofertas. Envie só o cupom, uma vez, e nada além disso.",
    },
    vazio: {
      titulo: "Nenhum contato cadastrado ainda",
      descricao:
        "Os contatos aparecem aqui quando um cliente se cadastra pelo cartão NFC ou QR Code com a pergunta de WhatsApp. Confira se o cartão tem o endereço do formulário certo, na página Formulários.",
      verFormularios: "Ver formulários",
    },
    vazioComFiltro: {
      titulo: "Nenhum contato com estes filtros",
      descricao: "Tente outro formulário ou origem.",
    },
    erro: {
      titulo: "Não foi possível carregar os contatos.",
      descricao: "Pode ter sido uma falha passageira. Tente de novo em instantes.",
      tentar: "Tentar de novo",
      voltar: "Voltar à Visão Geral",
    },
    carregando: "Carregando contatos…",

    /**
     * Mensagem provisória de recompra, aberta no WhatsApp para o gerente
     * revisar e enviar à mão. A loja ajusta o texto aqui.
     */
    mensagemWhatsApp: (primeiroNome: string | null) =>
      `${saudacao(primeiroNome)} Aqui é da Essencial Fit. Passando para dizer que temos novidades e para ver se você precisa repor algum produto. Posso ajudar?`,

    /**
     * Entrega do cupom. Texto FIXO, sem oferta nem novidade: a loja não o edita
     * pelo painel (pendente de confirmação jurídica, ver `ENVIO_DO_CUPOM_PELO_WHATSAPP`).
     * `validoAte` já vem como dd/mm/aaaa.
     */
    mensagemCupom: (primeiroNome: string | null, codigo: string, brinde: string | null, validoAte: string) => {
      const textoDoBrinde = brinde?.trim() ? ` ${brinde.trim().replace(/([^.!?])$/, "$1.")}` : "";
      return `${saudacao(primeiroNome)} Aqui é da Essencial Fit. Seu cupom: ${codigo}.${textoDoBrinde} Válido até ${validoAte}. É só mostrar este código ao vendedor na hora de pagar.`;
    },
  },

  /** Uma resposta individual, onde quer que ela apareça. */
  respostas: {
    versao: (numero: number) => `versão ${numero}`,
    semResposta: "Sem resposta",
  },
} as const;
