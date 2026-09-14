/** Every user-facing string of the capture flow, pt-BR. */
export const M = {
  form: {
    titulo: "Cadastre-se em 30 segundos",
    subtitulo: "Ganhe seu cupom para o sorteio e condições especiais no evento.",
    nome: "Nome completo",
    nomePlaceholder: "Como você quer ser chamado",
    whatsapp: "WhatsApp",
    whatsappPlaceholder: "(00) 00000-0000",
    email: "E-mail",
    emailOpcional: "(opcional)",
    emailPlaceholder: "voce@exemplo.com",
    modelo: "Modelo de interesse",
    prazo: "Quando pretende comprar?",
    naoSei: "Ainda não sei",
    consentimentos: "Suas autorizações",
    privacidadeResumo: [
      "Seus dados são coletados pela concessionária para retornar seu contato sobre o veículo escolhido.",
      "Ficam guardados por até 12 meses e depois são anonimizados. Não vendemos nem compartilhamos com terceiros.",
      "Dúvidas ou pedidos de exclusão: fale com o encarregado de dados em privacidade@concessionaria.com.br.",
    ],
    verPolitica: "Ler a política de privacidade completa",
    enviar: "Quero meu cupom",
    enviando: "Enviando…",
    obrigatorio: "obrigatório",
  },
  prazos: ["Este mês", "Em até 3 meses", "Em até 6 meses", "Só pesquisando"] as const,
  erros: {
    nome: "Digite seu nome e sobrenome",
    whatsapp: "Digite um WhatsApp com DDD, por exemplo (31) 99999-9999",
    email: "Confira o e-mail digitado, parece incompleto",
    consentimentoObrigatorio: "Para receber o cupom, precisamos da sua autorização de contato",
    generico: "Não foi possível enviar agora. Tente novamente em instantes.",
  },
  sucesso: {
    titulo: "Seu cupom",
    instrucao: "Mostre este código ao vendedor para participar do sorteio.",
    salvoOffline: "Sem sinal agora. Seu cadastro foi salvo e será enviado automaticamente.",
  },
  encerrado: {
    titulo: "Cadastro encerrado",
    texto: "As inscrições para este evento foram encerradas. Obrigado pela visita!",
  },
  manual: {
    aviso: "Modo balcão: após enviar, o formulário volta em branco para o próximo visitante.",
    enviado: "Cadastro enviado. Cupom:",
  },
} as const;
