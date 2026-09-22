/**
 * Tudo que a equipe da Essencial Fit lê dentro do painel, em pt-BR.
 *
 * Um arquivo só, pelo mesmo motivo do texto público: dá para revisar a
 * linguagem inteira de uma vez, e ninguém precisa abrir um componente para
 * corrigir uma frase.
 */
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
    marca: "Essencial Fit",
    areas: "Áreas do painel",
    visaoGeral: "Visão geral",
    formularios: "Formulários",
    novoFormulario: "Novo formulário",
    respostas: "Respostas",
    sair: "Sair",
    pular: "Ir para o conteúdo",
    abrirMenu: "Abrir menu",
    fecharMenu: "Fechar menu",
  },

  visaoGeral: {
    titulo: "Visão geral",
    subtitulo: "Como está a coleta de respostas agora.",
    indicadores: {
      total: "Respostas recebidas",
      totalContexto: (dias: number) => `Desde o primeiro formulário publicado. Últimos ${dias} dias em destaque abaixo.`,
      hoje: "Respostas hoje",
      hojeContexto: (periodo: number, dias: number) => `${periodo} nos últimos ${dias} dias.`,
      ativos: "Formulários ativos",
      ativosContexto: (total: number) => `De ${total} formulário${total === 1 ? "" : "s"} criado${total === 1 ? "" : "s"}.`,
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
    respostasRecentes: { titulo: "Respostas recentes", verTodas: "Ver todas as respostas" },
    vazio: {
      titulo: "Nenhum formulário criado ainda",
      descricao:
        "Um formulário é o que abre quando o cliente encosta o celular no cartão NFC ou lê o QR Code. Crie o primeiro para começar a receber respostas.",
      acao: "Criar primeiro formulário",
    },
    semRespostas: {
      titulo: "Nenhuma resposta recebida ainda",
      descricao:
        "As respostas aparecerão aqui quando clientes preencherem um formulário pelo NFC ou QR Code.",
    },
  },

  formularios: {
    titulo: "Formulários",
    subtitulo: "Cada formulário tem um endereço próprio para gravar no cartão NFC ou virar QR Code.",
    novo: "Novo formulário",
    respostas: (total: number) => `${total} ${total === 1 ? "resposta" : "respostas"}`,
    semRespostas: "Sem respostas",
    ultimaResposta: (quando: string) => `Última resposta ${quando}`,
    versao: (numero: number) => `Versão ${numero}`,
    acoes: {
      verRespostas: "Ver respostas",
      editar: "Editar",
      copiarLink: "Copiar link",
      copiado: "Link copiado",
      publicar: "Publicar",
      ativar: "Ativar",
      desativar: "Desativar",
      arquivar: "Arquivar",
      abrirFormulario: "Abrir formulário",
    },
    vazio: {
      titulo: "Nenhum formulário criado ainda",
      descricao: "Crie o primeiro e o endereço público aparece pronto para copiar.",
      acao: "Criar primeiro formulário",
    },
  },

  editor: {
    tituloNovo: "Novo formulário",
    tituloEdicao: "Editar formulário",
    subtituloNovo: "Dê um nome, escreva as perguntas e publique. Leva poucos minutos.",
    subtituloEdicao: "Publicar de novo cria uma versão nova. As respostas já recebidas continuam como estão.",
    nome: "Nome do formulário",
    nomeAjuda: "Aparece no topo da tela que o cliente vê. Ex.: Experiência na loja.",
    descricao: "Descrição curta",
    descricaoAjuda: "Opcional. Uma linha explicando para que serve.",
    perguntas: "Perguntas",
    perguntasAjuda: "Pergunte só o necessário. Toque é mais rápido que digitação.",
    adicionar: "Adicionar pergunta",
    pergunta: (indice: number) => `Pergunta ${indice}`,
    enunciado: "Pergunta",
    enunciadoAjuda: "Ajuda (opcional)",
    tipo: "Tipo de resposta",
    obrigatoria: "Resposta obrigatória",
    opcoes: "Opções",
    adicionarOpcao: "Adicionar opção",
    removerOpcao: "Remover opção",
    opcao: (indice: number) => `Opção ${indice}`,
    escalaDe: "De",
    escalaAte: "Até",
    rotuloMinimo: "Rótulo do menor (opcional)",
    rotuloMaximo: "Rótulo do maior (opcional)",
    subir: "Mover para cima",
    descer: "Mover para baixo",
    remover: "Remover pergunta",
    salvar: "Salvar",
    salvando: "Salvando…",
    salvarEPublicar: "Salvar e publicar",
    cancelar: "Cancelar",
    semPerguntas: "Nenhuma pergunta ainda. Adicione a primeira.",
    erroGeral: "Confira os campos destacados.",
  },

  detalhe: {
    link: "Endereço público",
    linkAjuda: "É este endereço que vai no cartão NFC ou vira QR Code.",
    linkIndisponivel: "O endereço público fica disponível depois de publicar.",
    resultados: "Resultados",
    resultadosDescricao: "Como as pessoas responderam a cada pergunta.",
    media: (valor: string) => `Média ${valor}`,
    respostasEmTexto: "Respostas em texto",
    semRespostasNaPergunta: "Ninguém respondeu a esta pergunta ainda.",
    perguntasDaVersao: (numero: number) => `Perguntas da versão ${numero}`,
    vazio: {
      titulo: "Nenhuma resposta recebida ainda",
      descricao:
        "As respostas aparecerão aqui quando clientes preencherem este formulário pelo NFC ou QR Code.",
    },
  },

  respostas: {
    titulo: "Respostas",
    subtitulo: "O que os clientes enviaram, da mais recente para a mais antiga.",
    todosOsFormularios: "Todos os formulários",
    filtrar: "Filtrar por formulário",
    de: (nome: string) => `Formulário: ${nome}`,
    recebidaEm: "Recebida",
    origem: "Origem",
    versao: (numero: number) => `versão ${numero}`,
    semResposta: "Sem resposta",
    pagina: (atual: number, total: number) => `Página ${atual} de ${total}`,
    anterior: "Anterior",
    proxima: "Próxima",
    vazio: {
      titulo: "Nenhuma resposta recebida ainda",
      descricao:
        "As respostas aparecerão aqui quando clientes preencherem um formulário pelo NFC ou QR Code.",
    },
  },

  erros: {
    naoEncontrado: "Formulário não encontrado.",
    validacao: "Confira os campos destacados e tente de novo.",
    generico: "Não foi possível concluir. Tente de novo em instantes.",
  },
} as const;
