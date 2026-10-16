# Decisões de produto

Mais recentes primeiro.

## 2026-10-15 — Aceite de mensagens por finalidade, CSV e versão do consentimento

- **Contexto:** a regra anterior valia só o cadastro mais recente do telefone e tratava cadastro sem finalidades como "não aceita" (revogação implícita). Isso apagava um aceite dado antes só porque a pessoa se cadastrou de novo num formulário que não perguntava nada.
- **Decisão:**
  - Vale a última resposta explícita por finalidade (recompra, ofertas) entre todos os cadastros do telefone. Cadastro que não exibiu a finalidade não altera o estado dela; desmarcar num cadastro mais recente vale como recusa. "Aceita mensagens" = alguma finalidade com última resposta "concedido".
  - No CSV de contatos, o telefone sai só com dígitos e código do país (ex.: 5535999998832), sem "+", sem máscara e sem apóstrofo.
  - A versão do texto de consentimento fica só gravada no banco.
- **Motivo:** só uma recusa explícita deve tirar alguém da lista; o formato numérico abre direto em ferramentas de envio e no Excel sem virar fórmula.
- **Alternativas descartadas:** revogação pelo último cadastro (mesmo sem pergunta); telefone formatado no CSV; versão do consentimento visível ao gerente.

## 2026-10-15 — Premissas do plano técnico e regras derivadas na implementação

- **Contexto:** o dono aprovou o plano técnico (`planos/essencial-fit-cadastro.md`) sem objetar às premissas abertas do arquiteto; outras regras surgiram nas revisões e seguem as decisões já tomadas.
- **Decisão:**
  - Um cupom por telefone por formulário, para sempre, mesmo depois de vencer.
  - Indicação vinda de formulário sem pergunta de WhatsApp não é contada.
  - Se o mesmo cadastro for enviado duas vezes ao mesmo tempo (página e fila offline), quem recebe a resposta "já emitido" não vê o código; o código nunca é reexibido. O gerente vê o cupom na aba "Contatos" e pode enviá-lo pelo WhatsApp.
  - Formulário com cupom ligado não emite cupom enquanto o gerente não cadastrar o texto do brinde.
  - O script de publicação não reativa formulário pausado no painel.
- **Motivo:** coerência com "código nunca reexibido" e "brinde cadastrado pelo cliente", e evitar que o cliente gaste o cupom sem saber o que ganhou.
- **Alternativas descartadas:** reexibir o código em envio duplicado; emitir cupom sem brinde; o script reativar formulários inativos.

## 2026-10-15 — Configuração por formulário no painel e cupom de cadastro offline

- **Contexto:** complemento às regras do cupom e do painel da Essencial Fit (entrada abaixo).
- **Decisão:**
  - Por formulário, o gerente cadastra no painel o texto do brinde, se o nome é obrigatório, se o WhatsApp é obrigatório e para qual formulário aponta o link de indicação (padrão: o mesmo). Isso substitui a regra "o gerente edita só o texto do brinde". Os módulos recompra, cupom e indicação continuam só para leitura.
  - Cadastro feito sem internet com cupom: o gerente vê o cupom na aba "Contatos" e pode enviá-lo ao cliente pelo WhatsApp.
  - Pendência jurídica: confirmar com advogado se esse envio pode ocorrer para quem não aceitou recompra.
- **Motivo:** dar à loja controle sobre o essencial de cada formulário e não deixar o cliente offline sem o cupom.
- **Alternativas descartadas:** só o texto do brinde editável; cupom offline visível apenas se a página continuar aberta, sem alternativa para o gerente.

## 2026-10-15 — Manter o nome "Resultados & IA" no painel

- **Contexto:** o brief aprovado previa renomear a aba para "Resultados e análise" enquanto o modelo de IA não estivesse configurado.
- **Decisão:** a aba mantém o nome "Resultados & IA", mesmo sem modelo configurado. A renomeação saiu do item 8 do brief; o resto da higiene continua.
- **Motivo:** preferência do dono por manter "IA" no produto.
- **Alternativas descartadas:** "Resultados e análise" até configurar o modelo.

## 2026-10-15 — Regras do cupom, do WhatsApp e do painel (Essencial Fit)

- **Contexto:** perguntas em aberto do brief `briefs/essencial-fit-cadastro.md`, respondidas pelo dono.
- **Decisão:**
  - O cupom pode ser recebido sem aceitar mensagens de marketing (base legal a confirmar com advogado: pendência jurídica).
  - Sem WhatsApp num formulário com cupom, não há cupom.
  - Telefone que já tem cupom no formulário não vê o código de novo; só é avisado de que já recebeu.
  - O cupom vale 30 dias a partir da emissão.
  - Envio offline: o cupom só aparece se a página continuar aberta (limitação aceita).
  - "Chamar no WhatsApp" abre com mensagem pré-preenchida provisória.
  - O gerente edita só o texto do brinde de cada formulário, no painel; os módulos recompra, cupom e indicação aparecem só para leitura.
  - Nova aba "Contatos" no painel aprovada.
  - O conteúdo dos 5 formulários continua pendente com o cliente.
- **Motivo:** fechar as regras de negócio para o plano e o design sem aumentar o escopo.
- **Alternativas descartadas:** exigir aceite de marketing para dar cupom; mostrar o código de novo ao telefone repetido; ligar e desligar módulos pelo painel.

## 2026-10-15 — Base técnica unificada no repositório `bussula`

- **Contexto:** havia dois códigos com histórico em comum: `MVP_essencial_fit` (formulários configuráveis, origem NFC/QR, painel 2.0) e `MVP_bussula/Bussula` (consentimento, telefone, cupom, limite por IP, máscara, auditoria, CSV e landing). Os dois clones apontavam para o mesmo `origin`.
- **Decisão:** um único repositório em `/home/ufla/Documentos/Bussola/bussula`, branch `main`, com o código da Essencial Fit como base. Do Bussula vieram a landing `/lp` e os logos em `public/brand/` (merge `c176c0d`). As peças de consentimento, cupom, limite por IP e `/demo` continuam no histórico git (commit `3b65ad3`) e serão recuperadas pelo brief da Essencial Fit.
- **Motivo:** cobrar o primeiro cliente rápido e não manter dois códigos.
- **Alternativas descartadas:** manter os dois repositórios; usar o Bussula como base e portar os formulários configuráveis para ele.
- Backup das pastas antigas: `~/Documentos/backup-bussola-2026-10-15.tar.gz`.

## 2026-10-15 — 5 formulários e 5 cartões inclusos nos R$ 500

- **Contexto:** o preço inclui 5 cartões NFC, mas o README falava em "três formulários incluídos".
- **Decisão:** 5 formulários, um por cartão NFC, todos inclusos nos R$ 500 de implantação (+ R$ 100/mês). O conteúdo dos 5 formulários ainda será definido pelo cliente.
- **Motivo:** um cartão por formulário identifica a origem sem código novo e simplifica a oferta.
- **Alternativas descartadas:** 3 formulários com cartões extras para o mesmo formulário; cobrar formulário adicional à parte.

## 2026-10-15 — Essencial Fit é o primeiro cliente

- **Contexto:** primeiro cliente pagante disponível; o Fiat Day não aconteceu e não há outros leads reais.
- **Decisão:** colocar a Essencial Fit (loja física de suplementos, 1 vendedor, 1 gerente no painel) em uso real, com cadastro, recompra por WhatsApp, cupom e indicação. Preço: R$ 500 de implantação (5 cartões NFC) + R$ 100/mês. Brief: `briefs/essencial-fit-cadastro.md`.
- **Motivo:** validar com um cliente pagante antes de investir em escala.
- **Alternativas descartadas:** não registradas na sessão; não havia outro cliente disponível.

## 2026-10-15 — Posicionamento como plataforma genérica

- **Contexto:** o produto nasceu para eventos de concessionária (Fiat Day), que não ocorreu.
- **Decisão:** lançar a Bússola como plataforma genérica de captura por NFC/QR, sem escolher segmentos de entrada por enquanto. O Fiat Day não é usado como prova social.
- **Motivo:** não há leads reais em nenhum segmento; o primeiro cliente é varejo físico.
- **Alternativas descartadas:** focar só em concessionárias; escolher um segmento vertical já agora.
