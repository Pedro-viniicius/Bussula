/**
 * Copy da landing page (/lp e /lp/b). Tudo em pt-BR.
 *
 * Regras:
 * - O que está entre colchetes é placeholder e precisa ser trocado antes de
 *   publicar. Procure por "[" para achar todos.
 * - Nada aqui fala de tecnologia. Fala de cliente, equipe, decisão e reais.
 * - Nenhum depoimento, nome, empresa ou número de resultado foi inventado.
 */

/** Número no formato internacional, só dígitos (ex.: 5511999999999). Vazio = ainda não definido. */
export const WHATSAPP_NUMERO = "";

export const LP = {
  meta: {
    titulo: "Bussula · Decida com o que o seu cliente acabou de dizer",
    descricao:
      "O cliente encosta o celular no cartão, responde em menos de 40 segundos e você vê no painel o que merece atenção. Sem app, com consentimento registrado e privacidade levada a sério.",
  },

  nav: {
    marca: "Bussula",
    comoFunciona: "Como funciona",
    privacidade: "Privacidade",
    piloto: "Piloto",
    perguntas: "Perguntas",
    cta: "Quero um piloto",
  },

  hero: {
    selo: "Para donos e gestores de [segmento]",
    titulo: "Chega de decidir no feeling.",
    subtitulo:
      "O cliente encosta o celular no cartão, responde em 40 segundos e você vê no painel o que merece atenção.",
    ctaPrimario: "Quero um piloto",
    ctaSecundario: "Ver como funciona",
    provas: ["Sem app", "Sem cadastro", "Funciona sem sinal", "Consentimento registrado"],
    legendaMock: "Painel com dados de exemplo",
  },

  problema: {
    rotulo: "O que se perde hoje",
    titulo: "Você atende bem. Mas o que o cliente disse não chega até você.",
    dores: [
      {
        titulo: "O que o cliente diz no balcão some",
        texto:
          "A reclamação, o elogio, o interesse por um produto. Tudo vira conversa e morre no fim do turno.",
      },
      {
        titulo: "Papel e planilha não dizem quem coletou",
        texto:
          "Você não sabe quem da equipe trouxe cada contato. E não consegue provar que a pessoa autorizou ser procurada.",
      },
      {
        titulo: "E a decisão continua no palpite",
        texto:
          "Trocar a escala, mudar o mix, premiar alguém. Tudo no feeling, porque o dado não chega a tempo.",
      },
    ],
  },

  comoFunciona: {
    rotulo: "Como funciona",
    titulo: "Três passos. Nenhum deles exige tecnologia da sua equipe.",
    passos: [
      {
        numero: "01",
        titulo: "Encostar",
        texto:
          "Sua equipe leva o cartão NFC ou o QR code. O cliente encosta o celular e responde na própria tela em menos de 40 segundos. Sem app, sem conta, sem download.",
      },
      {
        numero: "02",
        titulo: "Registrar",
        texto:
          "A resposta chega na hora, já no nome de quem atendeu e com o consentimento guardado. Caiu o sinal? Fica no celular e sobe sozinha quando a internet volta.",
      },
      {
        numero: "03",
        titulo: "Ler",
        texto:
          "O painel mostra o que mudou. A IA aponta onde vale olhar. A decisão continua sendo sua.",
      },
    ],
  },

  painel: {
    rotulo: "O painel",
    titulo: "O que mudou, quem trouxe e onde olhar. Numa tela só.",
    texto:
      "Contagem ao vivo, ranking da equipe e os registros do dia. Os dados pessoais ficam escondidos até você precisar deles.",
    legenda: "Dados de exemplo. Nenhuma pessoa real aparece aqui.",
  },

  mock: {
    local: "Loja Centro",
    periodo: "Hoje",
    aoVivo: "ao vivo",
    exemplo: "exemplo",
    kpis: [
      { rotulo: "Respostas hoje", valor: "47", nota: "+9 que ontem" },
      { rotulo: "Satisfação média", valor: "4,2", nota: "de 5" },
      { rotulo: "Pediram contato", valor: "12", nota: "com consentimento" },
    ],
    ranking: {
      titulo: "Ranking da equipe",
      periodo: "esta semana",
      pessoas: [
        { nome: "Ana", valor: 31 },
        { nome: "Carlos", valor: 27 },
        { nome: "Bia", valor: 19 },
        { nome: "Diego", valor: 11 },
      ],
    },
    registros: {
      titulo: "Últimos registros",
      revelar: "Revelar",
      revelado: "Revelado",
      aviso: "Revelar fica registrado na auditoria.",
      linhas: [
        { nome: "Marcos A.", telefone: "(11) 9••••-••42", email: "m•••@gmail.com", quem: "Ana", quando: "14:32" },
        { nome: "Juliana R.", telefone: "(21) 9••••-••07", email: "j•••@outlook.com", quem: "Bia", quando: "14:19" },
        { nome: "Paulo H.", telefone: "(31) 9••••-••85", email: null, quem: "Ana", quando: "13:58" },
      ],
    },
    atencao: {
      titulo: "Ponto de atenção",
      selo: "exemplo",
      oQueMudou: { rotulo: "O que mudou", texto: "A satisfação no turno da noite caiu 18% em 3 semanas." },
      oQueMostra: {
        rotulo: "O dado que mostra isso",
        texto: "“Demora no atendimento” aparece em 4 de cada 10 comentários.",
      },
      porQueImporta: {
        rotulo: "Por que importa",
        texto: "Quem espera demais não volta e não indica.",
      },
      valeOlhar: { rotulo: "Vale olhar", texto: "A escala desse turno." },
      rodape: "A IA aponta. Quem decide é você.",
    },
  },

  usos: {
    rotulo: "Um mecanismo, vários usos",
    titulo: "O mesmo cartão serve para o que você precisar medir.",
    casos: [
      { titulo: "Captação de contatos", texto: "Nome, WhatsApp e interesse, já no nome de quem atendeu." },
      { titulo: "Pesquisa de satisfação", texto: "Uma nota e um comentário, na hora, antes de o cliente sair." },
      { titulo: "Pedido de avaliação", texto: "Quem gostou é convidado a avaliar a loja na internet." },
      { titulo: "Check-in", texto: "Presença registrada em eventos, consultas e turmas." },
      { titulo: "Inscrições", texto: "Sorteios, listas de espera e lançamentos sem papel." },
      { titulo: "Registro de garantia", texto: "O cliente cadastra o produto no ato da compra." },
    ],
  },

  privacidade: {
    rotulo: "Privacidade",
    titulo: "Quem vê o dado do seu cliente? Você sabe. E consegue provar.",
    texto:
      "Na planilha, qualquer um com o arquivo vê tudo. Aqui, o acesso é controlado e dá para enxergar isso em 3 segundos.",
    demo: {
      titulo: "Experimente",
      instrucao: "Toque em “Revelar” para ver o que acontece.",
      registrado: "Registrado na auditoria",
      por: "por [seu nome]",
    },
    garantias: [
      {
        titulo: "Consentimento separado por finalidade",
        texto:
          "Contato, promoção e novidades são autorizações diferentes. Nenhuma vem marcada. A versão exata do texto que a pessoa leu fica guardada.",
      },
      {
        titulo: "Telefone e e-mail escondidos por padrão",
        texto: "A equipe vê o nome, não o contato. Quem revela deixa registro de quem foi e quando.",
      },
      {
        titulo: "Dados anonimizados no prazo",
        texto: "Quando a retenção termina, o registro perde a identificação sozinho. Sem lembrete, sem esquecimento.",
      },
      {
        titulo: "Toda exportação fica registrada",
        texto: "Se alguém baixou a lista, você sabe quem, quando e o quê.",
      },
    ],
    fechamento: "Isso é o que a LGPD pede. E é o que nenhuma planilha oferece.",
  },

  canais: {
    rotulo: "Canais de captura",
    titulo: "Por onde a resposta chega",
    disponivelRotulo: "Disponível hoje",
    emBreveRotulo: "Em breve",
    disponiveis: [
      { titulo: "Cartão NFC", texto: "O cliente encosta o celular." },
      { titulo: "QR code", texto: "Na mesa, no balcão, na vitrine." },
      { titulo: "Registro manual", texto: "A equipe digita quando o cliente prefere." },
    ],
    emBreve: [
      { titulo: "WhatsApp", texto: "Pesquisa enviada depois da visita." },
      { titulo: "Totem de autoatendimento", texto: "Para filas e recepções." },
      { titulo: "Pesquisa porta a porta", texto: "Equipe de campo com o mesmo cartão." },
      { titulo: "Integração com PDV e ERP", texto: "Resposta ligada à venda." },
    ],
  },

  visao: {
    rotulo: "Visão de produto",
    titulo: "Para onde o Bussula vai",
    texto:
      "Hoje o produto captura e organiza. O próximo passo é ler esses dados junto com os seus números de venda.",
    itens: [
      { titulo: "Mix de produtos", texto: "O que continuar vendendo e o que comprar mais." },
      { titulo: "Preço e demanda", texto: "O que o cliente aceita pagar e quando procura." },
      { titulo: "Segmentação de clientes", texto: "Quem volta, quem some e quem indica." },
      { titulo: "Alertas automáticos", texto: "Aviso quando um número sai do normal." },
      { titulo: "Resumo semanal no WhatsApp", texto: "Os três pontos da semana, sem abrir o painel." },
      { titulo: "Diário de decisões", texto: "Registra o que você decidiu e mede o resultado depois." },
    ],
  },

  piloto: {
    rotulo: "Piloto",
    titulo: "60 a 90 dias para provar na prática.",
    texto:
      "Combinamos a meta antes de começar. No fim, você olha o número e decide se continua.",
    etapas: [
      { titulo: "Meta combinada", texto: "Um número, acordado com você. Ex.: [meta a definir]." },
      { titulo: "Equipe pronta no primeiro dia", texto: "Cartões entregues e um treino curto, no balcão." },
      { titulo: "Acompanhamento semanal", texto: "Olhamos o painel juntos e ajustamos o que precisar." },
      { titulo: "Resultado na mesa", texto: "Meta batida ou não, com o dado para mostrar." },
    ],
    cta: "Quero um piloto",
    investimento: "Investimento: [a definir]",
  },

  provaSocial: {
    rotulo: "Quem já usa",
    titulo: "Resultados de clientes",
    depoimento: "[depoimento a definir]",
    autor: "[nome e cargo a definir]",
    logos: ["[logo de cliente]", "[logo de cliente]", "[logo de cliente]"],
    numeros: [
      { valor: "[número de resultado]", rotulo: "[o que o número mede]" },
      { valor: "[número de resultado]", rotulo: "[o que o número mede]" },
    ],
  },

  faq: {
    rotulo: "Perguntas frequentes",
    titulo: "O que todo gestor pergunta antes",
    itens: [
      {
        pergunta: "O cliente precisa instalar algum aplicativo?",
        resposta:
          "Não. Ele encosta o celular no cartão ou aponta a câmera para o QR code e a tela abre no navegador. Sem download, sem cadastro, sem senha.",
      },
      {
        pergunta: "E se a internet cair no meio do atendimento?",
        resposta:
          "A resposta fica guardada no celular e é enviada sozinha quando o sinal volta. Nada se perde e nada é registrado em dobro. A equipe também pode digitar o registro à mão.",
      },
      {
        pergunta: "Como fica a LGPD? Quem responde pelos dados?",
        resposta:
          "A sua empresa continua sendo a responsável pelos dados dos seus clientes. O Bussula faz a parte prática: pede cada consentimento em separado, guarda a versão do texto aceito, esconde o contato por padrão, registra quem revelou ou exportou e anonimiza tudo no prazo que você definir.",
      },
      {
        pergunta: "Preciso de equipe técnica?",
        resposta:
          "Não. A equipe recebe o cartão e aprende em minutos. O painel é feito para ser lido pelo gestor, não por um analista.",
      },
      {
        pergunta: "Em quanto tempo vejo resultado?",
        resposta:
          "O painel mostra as primeiras respostas no mesmo dia. A leitura de tendência, como a queda de satisfação num turno, aparece com algumas semanas de uso. Por isso o piloto dura de 60 a 90 dias.",
      },
      {
        pergunta: "Quanto custa?",
        resposta: "[a definir]",
      },
    ],
  },

  ctaFinal: {
    titulo: "Vamos combinar uma meta e medir?",
    texto: "Deixe seu contato. Respondemos em até [prazo a definir].",
    campos: {
      nome: "Nome",
      nomePlaceholder: "Como podemos te chamar",
      empresa: "Empresa",
      empresaPlaceholder: "Nome da loja ou do grupo",
      whatsapp: "WhatsApp",
      whatsappPlaceholder: "(11) 99999-9999",
    },
    botao: "Quero um piloto",
    ouWhatsapp: "ou fale direto no WhatsApp",
    whatsappBotao: "Falar no WhatsApp",
    whatsappPendente: "[número de WhatsApp a definir]",
    enviado: "Pronto. Seu WhatsApp abriu com a mensagem preenchida.",
    mensagem: (nome: string, empresa: string) =>
      `Olá! Sou ${nome}, da ${empresa}. Quero saber mais sobre o piloto do Bussula.`,
    aviso: "Usamos seu contato só para responder a este pedido.",
  },

  rodape: {
    marca: "Bussula",
    frase: "Dados reais do atendimento presencial.",
    linhas: ["[razão social e CNPJ]", "[cidade e estado]", "[e-mail de contato]"],
    politica: "[Política de privacidade]",
    direcoes: { a: "Direção A", b: "Direção B", comparar: "Comparar direções:" },
  },
} as const;
