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
  /** Texto da última etapa, a de consentimento (a barra tem uma etapa a mais que as perguntas). */
  progressoConsentimento: "Última etapa",

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

  whatsapp: {
    /** Linhas acrescentadas à ajuda da pergunta, conforme os módulos do formulário. */
    ajudaCupom: "O cupom é enviado para este número: sem WhatsApp, não dá para gerar o cupom.",
    ajudaPularSemCupom: "Se pular, você não recebe o cupom nem o link de indicação.",
    /** Uma mensagem por motivo (`MotivoDoTelefoneInvalido`), sempre dizendo como corrigir. */
    erros: {
      vazio: "Digite seu WhatsApp para continuar.",
      incompleto: "Faltam números. Digite o DDD e o número com 9 dígitos, como (35) 99999-8888.",
      ddd: "Esse DDD não existe. Confira os dois primeiros números.",
      naoCelular: "Digite um número de celular: depois do DDD ele começa com 9.",
      repetido: "Esse número parece incorreto. Confira e digite de novo.",
    },
  },
};

/** Etapa final do formulário que pede WhatsApp: como o número pode ser usado. */
export const CONSENTIMENTO = {
  titulo: "Como podemos usar seu número?",
  subtitulo: (comCupom: boolean) =>
    comCupom
      ? "Você escolhe. Nenhuma opção é obrigatória e você recebe o cupom mesmo sem marcar nada."
      : "Você escolhe. Nenhuma opção é obrigatória.",
  quemCuida: (razaoSocial: string, cnpj: string) => `Quem cuida dos seus dados: ${razaoSocial}, CNPJ ${cnpj}.`,
  usoDoNumero: (comCupom: boolean) =>
    comCupom
      ? "Usamos o número só para o que você marcar abaixo, e para gerar e conferir o seu cupom."
      : "Usamos o número só para o que você marcar abaixo.",
  apagar: (email: string) => `Você pode pedir para apagar seus dados quando quiser: ${email}.`,
  verPolitica: "Ler a política de privacidade completa",
  abreEmOutraAba: " (abre em outra aba)",
  legenda: `Quero receber da ${MARCA.nome}:`,
  cupomInfo: "O seu cupom é gerado com o número informado. Cada número recebe um cupom por formulário.",
  enviar: "Enviar",
  enviarComCupom: "Enviar e ver meu cupom",
};

/** Envio barrado pelo limite por IP (HTTP 429). Tom de cuidado, nunca de culpa. */
export const LIMITE = {
  titulo: "Muitos envios em pouco tempo",
  texto:
    "Para proteger a loja contra robôs, limitamos os envios feitos pelo mesmo Wi-Fi. Suas respostas continuam aqui. Espere um pouco e toque em Enviar de novo.",
  tempo: (minutos: number) => `Tente de novo em ${minutos} ${minutos === 1 ? "minuto" : "minutos"}.`,
  enviarEm: (segundos: number) => `Enviar em ${segundos} s`,
  pecaAjuda: "Se estiver na loja, peça ajuda ao vendedor.",
};

/** Formulário que pede dado pessoal e ainda não pode abrir. Sem motivo técnico para o cliente. */
export const TRAVADO = {
  titulo: "Formulário indisponível no momento",
  texto:
    "Estamos terminando de preparar este cadastro. Tente novamente em alguns dias ou fale com o vendedor na loja. Obrigado por passar na Essencial Fit!",
  tituloDaPagina: `Formulário indisponível — ${MARCA.nome}`,
};

export const CONCLUIDO = {
  titulo: "Resposta enviada",
  texto: "Obrigado! Sua resposta ajuda a Essencial Fit a melhorar o atendimento.",
  guardada: "Sua resposta está guardada neste aparelho e será enviada assim que a conexão voltar.",
  fechar: "Você já pode fechar esta página.",

  /** Formulários que pedem contato falam em "cadastro", não em "resposta". */
  tituloCadastro: "Cadastro feito",
  semWhatsapp: "Sem o WhatsApp não foi possível gerar o cupom.",
  semDados: "Se você não guardou o código do cupom, procure o print ou fale com o vendedor na loja.",
  abreOWhatsapp: " (abre o WhatsApp)",

  cupom: {
    titulo: "Seu cupom",
    semBrinde: `Seu cupom da ${MARCA.nome}`,
    copiar: "Copiar código",
    copiado: "Código copiado",
    naoCopiou: "Não deu para copiar. Toque e segure no código para copiar.",
    comoUsar: "Mostre este código ao vendedor na hora de pagar. Vale uma vez, para este número.",
    dica: "Dica: tire um print desta tela para não perder o código.",
    validoAte: (data: string) => `Válido até ${data}`,
    gerando: "Gerando seu cupom…",
    chegou: "Seu cupom chegou",
  },

  jaTinha: {
    titulo: "Esse número já recebeu um cupom",
    texto:
      "Cada número recebe um cupom por formulário, e o cupom deste número já foi enviado. Procure o print ou a mensagem com o código.",
    aviso: "Não achou? Fale com o vendedor na loja, que ajuda você.",
  },

  indicacao: {
    titulo: "Indique um amigo",
    texto:
      "Compartilhe seu link pelo WhatsApp. Quando alguém se cadastrar por ele, a loja registra que foi você que indicou. Nós nunca pedimos o telefone do seu amigo.",
    compartilhar: "Compartilhar no WhatsApp",
    copiarLink: "Copiar link",
    linkCopiado: "Link copiado",
    naoCopiou: "Não deu para copiar. Toque e segure no link abaixo para copiar.",
    aparecerDepois: "Seu link de indicação aparece quando a conexão voltar.",
    /** Texto inicial da mensagem; quem compartilha pode editar. */
    mensagem: (brinde: string | null, link: string) =>
      `Fui na ${MARCA.nome} e lembrei de você!${brinde ? ` Tem brinde para quem se cadastra: ${brinde}.` : ""} Cadastre-se por aqui: ${link}`,
  },

  guardadaComCupom: {
    titulo: "Cadastro guardado",
    texto:
      "Sem conexão agora. Seu cadastro está guardado neste aparelho. Quando a conexão voltar, seu cupom aparece aqui. Mantenha esta página aberta: se você fechá-la, o cupom não será mostrado.",
  },

  cupomFalhou:
    "Recebemos seu cadastro, mas não conseguimos gerar o cupom agora. Fale com o vendedor na loja para receber o brinde.",

  /** O envio guardado foi recusado pelo servidor quando a conexão voltou. */
  naoRegistrado: {
    titulo: "Não conseguimos registrar seu cadastro",
    texto: "Fale com o vendedor na loja, que faz o seu cadastro.",
    rodape: "Se quiser, mostre esta tela ao vendedor.",
  },
};

/**
 * PROVISÓRIO, PENDENTE DE REVISÃO DO ADVOGADO (LGPD). Não publicar como final.
 * Pendências marcadas: prazo de guarda (`PRAZO_PROVISORIO`), nomes dos
 * operadores e transferência internacional. Os dados do controlador vêm de
 * `CONTROLADOR` (src/lib/marca.ts) e são montados na página.
 */
type SecaoDePrivacidade = {
  titulo: string;
  itens?: string[];
  texto?: string | ((prazo: string) => string);
  rodape?: string;
  /** Termina com a frase de contato (muda se o e-mail de privacidade já existe). */
  comContato?: boolean;
};

export const PRIVACIDADE = {
  titulo: "Privacidade em linguagem clara",
  resumo:
    "Perguntamos pouco e explicamos por quê. Aqui está quem cuida dos seus dados, o que guardamos, para que usamos e como você pode pedir a exclusão.",
  responsavel: {
    titulo: "Quem é o responsável",
    texto: (marca: string) => `Quem decide como seus dados são usados é a empresa responsável pela ${marca}:`,
    razaoSocial: "Razão social",
    cnpj: "CNPJ",
    endereco: "Endereço",
    email: "E-mail de privacidade",
    contatoComEmail: "Escreva para o e-mail de privacidade acima.",
    contatoSemEmail: "O e-mail de privacidade será informado aqui.",
    pendente: "Os dados da empresa responsável ainda serão informados aqui.",
  },
  secoes: [
    {
      titulo: "O que guardamos",
      itens: [
        "As respostas que você escolheu enviar e a data do envio.",
        "Seu nome e seu WhatsApp, quando o formulário pede e você informa.",
        "O cupom gerado para o seu número, quando o formulário tem cupom.",
        "O vínculo de indicação, quando você chega por um link de um amigo (guardamos um código, nunca o telefone dele).",
        "De onde veio o acesso: cartão NFC, QR Code ou link.",
        "Uma identificação do seu acesso em formato embaralhado (hash do IP), guardada por pouco tempo, só para limitar envios repetidos e evitar abuso.",
      ],
    },
    {
      titulo: "Para que usamos",
      itens: [
        "Entender a experiência na loja e melhorá-la, somando respostas em indicadores.",
        "Recompra: avisar no WhatsApp sobre reposição dos produtos, se você aceitar. É opcional.",
        "Ofertas e novidades no WhatsApp, se você aceitar. É opcional.",
        "Cupom e indicação: só acontecem a pedido seu, quando você se cadastra.",
      ],
      rodape: "Você pode responder sem aceitar nenhuma mensagem. Nada é vendido nem compartilhado para outros fins.",
    },
    {
      titulo: "Por quanto tempo guardamos",
      texto: (prazo: string) => `Até você pedir a exclusão ou, no máximo, ${prazo}.`,
    },
    {
      titulo: "Seus direitos",
      texto:
        "Você pode pedir confirmação de que tratamos seus dados, acesso, correção, exclusão, e retirar o consentimento a qualquer momento, sem custo.",
      comContato: true,
    },
    {
      titulo: "Quem nos ajuda a operar",
      texto:
        "Usamos empresas de apoio (operadores) que tratam dados em nosso nome: hospedagem do sistema (Vercel), banco de dados (Neon) e um provedor de inteligência artificial que analisa respostas, sem nome nem contato.",
    },
  ] as SecaoDePrivacidade[],
  voltar: "Voltar ao início",
};

/** PENDÊNCIA: prazo máximo provisório de guarda; o advogado define o definitivo. */
export const PRAZO_PROVISORIO = "24 meses";
