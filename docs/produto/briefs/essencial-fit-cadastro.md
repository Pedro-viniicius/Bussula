# Essencial Fit: cadastro com recompra, cupom e indicação

- Status: aprovado
- Prioridade: alta
- Data: 2026-10-15
- Repositório-alvo: `/home/ufla/Documentos/Bussola/bussula`, branch `main`

> Aprovado pelo dono em 2026-10-15, com a decisão "5 formulários". Este documento reproduz o brief aprovado, com os caminhos atualizados para o repositório unificado (base = código da Essencial Fit; do Bussula vieram a landing `/lp` e os logos em `public/brand/`).
>
> Peças do antigo Bussula que não existem mais na `main` estão marcadas como **(a recuperar)**. Todas estão no histórico git deste repositório, no commit `3b65ad3` (segundo pai do merge `c176c0d`, última versão do Bussula). Para ler uma delas: `git show 3b65ad3:<caminho>`. Cópia de segurança alternativa: `~/Documentos/backup-bussola-2026-10-15.tar.gz`.

## Problema

A Essencial Fit (loja física de suplementos, 1 vendedor, 1 gerente que usa o painel) quer transformar o cliente que passa pelo balcão em um contato que pode ser chamado de novo. Hoje o sistema só coleta respostas anônimas: a loja não tem como fazer recompra por WhatsApp, dar cupom nem medir indicação.

## Para quem

- **Cliente da loja:** encosta o celular no cartão NFC (ou lê o QR), responde rápido e recebe um benefício.
- **Gerente da loja:** vê os contatos no painel e chama pelo WhatsApp quem aceitou ser contatado.

## Por que agora

- É o primeiro cliente pagante da Bússola: R$ 500 de implantação, com 5 cartões NFC (um por formulário), mais R$ 100/mês.
- O código da Essencial Fit já tem formulários configuráveis, origem NFC/QR e painel. Falta a camada de contato com consentimento (registro do "sim" do cliente para cada uso dos dados), que já existia no Bussula e pode ser reaproveitada.

## Proposta

Colocar a Essencial Fit em uso real e pago. O cliente se cadastra pelo cartão, com consentimento, e a loja pode usar esse cadastro para recompra por WhatsApp, cupom e indicação.

**Decisão de pacote:** 5 formulários, um por cartão NFC, todos inclusos nos R$ 500 de implantação (+ R$ 100/mês).

### Dentro do escopo

| # | Item | Esforço |
|---|---|---|
| 1 | Script para criar e publicar em produção os **5 formulários** pedidos pelo cliente. As funções já existem em `src/servicos/formularios.ts`, mas não há seed (script que popula o banco). O script deve receber a definição dos formulários **como dado** (arquivo de configuração), sem formulários fixos no código: quais são os 5 e as perguntas de cada um ainda não foram definidos pelo cliente (ver Perguntas em aberto). | P |
| 2 | Pergunta do tipo WhatsApp com validação, e consentimento por finalidade (versionado) gravado junto da resposta. Já existe `src/lib/validation/phone.ts`. O texto de consentimento pode vir do Bussula: `src/lib/texts/privacy.ts` e `src/components/lead-form/consent-section.tsx` **(a recuperar)**. | M |
| 3 | Módulos que se ligam ou desligam em cada formulário (ligados pelo script do item 1; no painel aparecem **só para leitura**): (a) contato para recompra, com lista no painel e botão "Chamar no WhatsApp" (`wa.me`, abre a conversa com uma **mensagem pré-preenchida provisória**), envio manual; (b) cupom único por telefone, sem sorteio, com **validade de 30 dias a partir da emissão**, base em `src/lib/coupon.ts` **(a recuperar)**. O cupom **não depende** de aceitar mensagens de marketing, mas exige WhatsApp: formulário com cupom e sem WhatsApp informado não gera cupom. Telefone que já recebeu cupom naquele formulário **não vê o código de novo**, só o aviso de que já recebeu. Cadastro feito sem internet e com cupom: o gerente vê o cupom na aba "Contatos" e pode enviá-lo ao cliente pelo WhatsApp. **No painel, por formulário, o gerente cadastra:** o texto do brinde, se o nome é obrigatório, se o WhatsApp é obrigatório e para qual formulário aponta o link de indicação (padrão: o mesmo formulário); (c) indicação por link compartilhável com `?ref=`, contada no painel, sem nunca pedir o telefone do amigo. | M (a) + P/M (b) + P/M (c) |
| 4 | Painel de contatos, numa **nova aba "Contatos"** no painel (aprovada pelo dono): dados mascarados, botão "revelar" e CSV só de quem consentiu, tudo registrado na auditoria. Já existem `src/repositorios/auditoria.ts` e a tabela `auditoria` em `src/lib/db/schema.ts`. Pode vir do `/demo` do Bussula: `src/app/(painel)/demo/` (página, lista, linha de contato, ações, exportação), `src/lib/demo/mascara.ts`, `src/lib/demo/queries.ts` e `src/lib/admin/audit.ts` **(todos a recuperar)**. | M |
| 5 | Origem por cartão: sem código novo. Cada formulário tem endereço próprio e o sistema já grava `?o=nfc`, `?o=qr` ou link direto (`src/dominio/respostas/tipos.ts:11`, `src/app/f/[slug]/page.tsx:28`). Basta gravar `/f/<formulario>?o=nfc` no chip e `/f/<formulario>?o=qr` no QR impresso, e conferir se a origem aparece no painel. | P (operação) |
| 6 | Limite de envios por IP, **generoso e configurável** por variável de ambiente (os clientes no Wi-Fi da loja aparecem com o mesmo IP; o limite serve contra robôs, não contra quem quer um segundo cupom). Base: `src/lib/security/rate-limit.ts` e as variáveis `LIMITE_POR_MINUTO` e `LIMITE_POR_HORA` do `.env.example` do Bussula **(a recuperar)**; o hash de IP já existe em `src/lib/security/ip-hash.ts`. Anti-abuso do cupom pelo telefone: **1 cupom por telefone por formulário**. Quem for barrado vê uma mensagem clara, sem a resposta ir para a fila offline. | P |
| 7 | Dados do controlador (a empresa responsável pelos dados, na LGPD) em `src/lib/marca.ts`: razão social, CNPJ, endereço e e-mail de privacidade, como campos de placeholder até o cliente enviar (o e-mail atual em `src/lib/marca.ts:15` é placeholder). Textos de `/privacidade` (`src/app/privacidade/page.tsx`) e do consentimento atualizados: hoje `src/lib/texts/publico.ts:69` diz que o número do aparelho não é guardado. **Trava de produção:** em produção, um formulário que pede consentimento não abre enquanto esses campos estiverem vazios ou com placeholder. | P (mais advogado) |
| 8 | Higiene: tirar "fiat" de `package.json:2`, `docs/admin-acesso.md:14` e `:29`, `public/sw.js:6`; decidir o destino das tabelas legadas (`src/lib/db/schema.ts:23-113`). A aba "Resultados & IA" **mantém o nome**, mesmo sem modelo de IA configurado (decisão do dono em 2026-10-15). | P |
| 9 | Operação: confirmar que `USAR_MOCKS` (modo de teste com dados fictícios) não está ligado no projeto da Vercel. **Nenhum push sem aprovação do dono.** Nunca push forçado. | P (sem código) |

## Histórias de usuário

- Como cliente da loja, quero me cadastrar pelo cartão em poucos segundos, para ganhar o benefício da loja.
- Como cliente da loja, quero escolher para que meus dados podem ser usados, para só ser contatado se eu aceitar.
- Como cliente da loja, quero compartilhar um link com um amigo, para indicar a loja sem passar o telefone dele.
- Como gerente, quero ver a lista de quem aceitou contato e abrir o WhatsApp com um toque, para fazer a recompra.
- Como gerente, quero saber de qual cartão (NFC ou QR) e de qual formulário veio cada cadastro, para saber o que funciona na loja.

## Critérios de aceite

- Dado o modo de teste desligado, quando o cliente encosta o celular num cartão e envia nome, WhatsApp e consentimento, então a resposta aparece no painel com o formulário, a origem (NFC ou QR) e a versão do texto aceito.
- Dado o cupom ligado, quando o cliente envia o formulário com WhatsApp, então recebe um código único válido por 30 dias a partir da emissão, mesmo sem aceitar mensagens de marketing.
- Dado um telefone que já recebeu cupom naquele formulário, quando ele envia de novo, então não vê o código outra vez, só o aviso de que já recebeu.
- Dado o cupom ligado, quando o cliente envia sem WhatsApp, então não recebe cupom.
- Dado o envio feito sem internet (fila offline), quando a conexão volta, então o cupom só aparece se a página continuar aberta (limitação aceita pelo dono).
- Dado um cadastro feito sem internet que gerou cupom, quando o gerente abre a aba "Contatos", então vê o cupom desse contato e pode enviá-lo ao cliente pelo WhatsApp.
- Dado o gerente no painel, quando ele abre um formulário, então pode cadastrar o texto do brinde, se o nome é obrigatório, se o WhatsApp é obrigatório e para qual formulário aponta o link de indicação (padrão: o mesmo); os módulos (recompra, cupom, indicação) aparecem só para leitura.
- Dado um link com `?ref=`, quando alguém se cadastra por ele, então conta como indicação de quem compartilhou.
- Dado o gerente no painel, quando ele vê os contatos, então eles aparecem mascarados; "revelar" e o CSV ficam registrados na auditoria, e o CSV só traz quem consentiu.
- Dado um contato que aceitou recompra, quando o gerente toca em "Chamar no WhatsApp", então a conversa abre no WhatsApp com a mensagem pré-preenchida provisória.
- Dado vários envios seguidos pelo mesmo Wi-Fi da loja, quando o uso é normal, então nenhum é bloqueado.
- O formulário identificado (que pede nome e WhatsApp) não tem pergunta de saúde ou objetivo.
- O `/admin` não abre sem senha e TOTP (código de 6 dígitos do aplicativo autenticador).
- Dado produção, quando os dados do controlador estão vazios ou com placeholder, então um formulário que pede consentimento não abre.
- Não sobra "fiat" nem "concessionária" fora do histórico do git.
- Testes, typecheck e lint passam.

## Fora do escopo

- Anonimização automática (precisa existir antes do 11º mês de uso).
- Envio automático ou API de WhatsApp.
- Sorteio.
- Validar cupom no caixa.
- Vários usuários ou atendentes no painel.
- Multi-cliente e self-service.
- Landing page (`/lp`): já está no repositório, mas não faz parte deste trabalho.
- Cobrança automática.
- Ligar ou desligar módulos pelo painel (ficam só para leitura; quem liga é o script). No painel, o gerente cadastra só texto do brinde, obrigatoriedade de nome e de WhatsApp e destino do link de indicação; editar perguntas fica fora.
- Renomear a aba "Resultados & IA".

## Como vamos medir o sucesso

- A Essencial Fit no ar e pagando (R$ 500 + primeira mensalidade de R$ 100).
- Cadastros reais chegando pelos 5 cartões, com origem e formulário visíveis no painel.
- O gerente usando a lista de contatos para recompra por WhatsApp.

## Riscos e premissas

- **Dado de saúde:** pergunta de saúde ou objetivo ligada a nome e telefone vira dado sensível na LGPD. Por isso o formulário identificado não tem esse tipo de pergunta. Confirmar com advogado.
- **IP compartilhado:** o Wi-Fi da loja faz todos os clientes parecerem um só; o limite por IP precisa ser generoso, e a proteção do cupom vem do telefone.
- **Código a recuperar:** consentimento, cupom, limite por IP, máscara e auditoria do `/demo` vêm do Bussula (commit `3b65ad3`) e precisam ser adaptados ao modelo de formulários da Essencial Fit, não copiados como estão.
- **Fiat Day não ocorreu:** não usar como prova social em nenhum texto.

## Pendências para entrar no ar (não bloqueiam o desenvolvimento)

1. Razão social, CNPJ, endereço e e-mail de privacidade reais da Essencial Fit, preenchidos na configuração.
2. Revisão por advogado do texto de consentimento e da política de privacidade, incluindo a **base legal para entregar cupom a quem não aceitou marketing** e **se o gerente pode enviar pelo WhatsApp o cupom de um cadastro offline a quem não aceitou recompra** (pendências jurídicas).
3. Confirmação de que a Vercel está sem `USAR_MOCKS` e de que o banco de produção foi criado.
4. Decisão sobre nota fiscal e forma de cobrança (contador). A Bússola ainda não tem CNPJ.
5. Conteúdo dos 5 formulários definido pelo cliente (ver abaixo).

## Perguntas em aberto

- **Quais são os 5 formulários e quais as perguntas de cada um?** O cliente ainda não definiu. O script do item 1 recebe essa definição como dado; o desenvolvimento não deve inventar formulários.
- Texto definitivo da mensagem pré-preenchida do "Chamar no WhatsApp" (hoje provisória).
- Resolvido em 2026-10-15: o gerente cadastra no painel, por formulário, o texto do brinde, a obrigatoriedade de nome e de WhatsApp e o destino do link de indicação.

## Interface

Sim, tem tela:

- **Formulário público** (`/f/[slug]`): pergunta de WhatsApp, consentimento por finalidade, tela de sucesso com cupom (e validade) e link de indicação, aviso de "você já recebeu seu cupom", mensagem de bloqueio por limite.
- **Painel** (`/admin`): nova aba "Contatos" com a lista mascarada, "revelar", "Chamar no WhatsApp", cupom de cadastros offline com envio pelo WhatsApp, exportar CSV e contagem de indicações; configuração por formulário (texto do brinde, nome obrigatório, WhatsApp obrigatório, destino do link de indicação), com os módulos mostrados só para leitura. A aba "Resultados & IA" mantém o nome.
- **`/privacidade`:** texto atualizado com os dados do controlador.

Precisa de especificação do designer para a tela de sucesso (cupom e indicação), o bloco de consentimento e a lista de contatos no painel.
