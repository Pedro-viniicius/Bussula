# BUSSULA

**BUSSULA é uma plataforma que conecta o ambiente físico ao digital por meio de
NFC e QR Code.** Ela captura os dados das interações e usa inteligência
artificial para transformá-los em informações, recomendações e apoio à tomada de
decisões.

> **BUSSULA = NFC/QR + captura de dados + gestão + IA para tomada de decisões**
>
> interação física → dado → análise → decisão

Cada cliente é uma instalação própria deste código (projeto na Vercel, banco e
variáveis). A identidade do cliente fica em `src/lib/marca.ts`. A landing de
vendas da plataforma fica em `/lp` (o endereço antigo `/lp/b` redireciona para lá).

O primeiro cliente é a Essencial Fit, descrita abaixo.

## Essencial Fit — coleta e análise da experiência dos clientes

Sistema operacional da Essencial Fit. Faz um fluxo só, do começo ao fim:

```
COLETAR → MEDIR → COMPREENDER → AGIR
```

Os formulários são preparados e configurados pela equipe que cuida do sistema
— a loja recebe cinco incluídos no serviço, um para cada cartão NFC. O endereço público de cada um é
gravado num cartão NFC ou vira um QR Code. O cliente encosta o celular,
responde em alguns segundos, e a resposta aparece no painel virada em
informação: primeiro os números, depois o que eles podem significar e o que
dá para fazer com isso.

O painel da loja tem quatro áreas, e só quatro:

| Área | Pergunta que responde |
| --- | --- |
| Visão Geral | Como está a coleta agora? |
| Formulários | O que está sendo coletado? |
| Contatos | Quem posso chamar? |
| Resultados & IA | O que as respostas significam? |

"Resultados & IA" continua com esse nome. A loja não cria nem edita
formulários pelo painel: as perguntas e os recursos de cada formulário são
preparados pela equipe que cuida do sistema. O que o gerente ajusta no painel
é só a operação — o texto do brinde, se nome e WhatsApp são obrigatórios e
para qual formulário vai o link de indicação.

A raiz `/` da instalação é a página de acesso da loja, não uma página de vendas.

## Rodar

```bash
pnpm install
pnpm dev
```

Abra **http://localhost:3000** — use `localhost`, não `127.0.0.1`.

Nenhum arquivo `.env` é necessário: o projeto sobe em modo de teste, com
formulários e respostas fictícios em memória, e o login do painel ganha um
botão de entrada direta. Veja [MOCKS.md](MOCKS.md) para desligar isso e usar
os serviços de verdade.

## Endereços

| Endereço | O que é |
| --- | --- |
| `/` | Página de acesso |
| `/lp` | Landing de vendas da plataforma Bússola |
| `/admin/login` | Entrada do painel (senha + código do autenticador) |
| `/admin` | Visão Geral: números da coleta, sinais e ritmo dos dias |
| `/admin/formularios` | Formulários disponíveis: situação, respostas, link público |
| `/admin/contatos` | Contatos: quem deixou o WhatsApp, cupom, indicações, "Chamar no WhatsApp" e exportação em CSV |
| `/admin/resultados` | Resultados & IA: dados, análise e possíveis ações de um formulário (`?formulario=<id>`) |
| `/f/[slug]` | O formulário que o cliente abre pelo NFC ou QR Code |
| `/resposta/concluida` | Confirmação para quem respondeu |
| `/privacidade` | Política em linguagem clara |

O formulário público não depende do painel: abre, funciona e envia sozinho.

Endereços antigos do painel continuam valendo e levam ao lugar novo:
`/admin/respostas` e `/admin/formularios/[id]` vão para os resultados;
`/admin/formularios/novo` e `/admin/formularios/[id]/editar` vão para a lista
de formulários (ver `next.config.ts`).

## Como o sistema é organizado

[docs/estrutura-do-projeto.md](docs/estrutura-do-projeto.md) explica o que cada
pasta faz e o que **não** deve ser colocado nela. Escrito para quem não é
desenvolvedor.

O resumo: `dominio` define, `servicos` decide, `repositorios` guarda,
`validacoes` confere, `components` desenha, `app` são os endereços.

## Coisas que valem saber

**Cadastro com WhatsApp, cupom e indicação.** Um formulário pode pedir nome e
WhatsApp e, conforme foi preparado, dar um cupom de boas-vindas e um link de
indicação. Nome e telefone ficam guardados à parte, só na aba Contatos — nunca
dentro das respostas, então os números e a análise não os enxergam. A tela
mostra o contato escondido (`(35) 9••••-••32`) e só mostra completo quando o
gerente clica para revelar; cada revelação e cada exportação ficam registradas.

**Regras do cupom** (decididas com o dono):

- cada telefone ganha **um cupom por formulário**, uma vez só; se o mesmo
  número se cadastrar de novo, não recebe outro e a tela avisa que ele já
  recebeu, sem mostrar o código de novo;
- o cupom vale **30 dias** a partir de quando é emitido;
- sem WhatsApp não há cupom;
- quem se cadastra pode receber o cupom mesmo sem aceitar mensagens de
  propaganda; o botão "Enviar cupom no WhatsApp" do painel entrega só esse
  cupom, com texto fixo. Isso aguarda confirmação do advogado: se ele não
  confirmar, o botão é desligado em `ENVIO_DO_CUPOM_PELO_WHATSAPP`
  (`src/servicos/contatos.ts`);
- se o cliente enviar o cadastro sem sinal, o cupom só aparece na tela se ela
  continuar aberta quando a conexão voltar; de qualquer forma o gerente vê o
  cupom na aba Contatos.

**Regras da indicação.** Cada contato recebe um link próprio para passar a
amigos. O painel conta **pessoas diferentes** (pelo telefone) que se
cadastraram por aquele link, e ninguém indica a si mesmo. O link leva ao
formulário escolhido pelo gerente; se esse formulário sair do ar, leva ao
próprio formulário.

**"Aceita mensagens" vale por telefone e por finalidade.** Para cada
finalidade (recompra, ofertas), vale a última vez em que a pessoa respondeu
de forma explícita, em qualquer cadastro daquele número. Um cadastro que nem
perguntou aquela finalidade não muda nada; se a pessoa desmarcou num cadastro
mais novo, a recusa vence. "Aceita mensagens" (botão "Chamar no WhatsApp",
filtro "só quem aceita" e exportação) significa que ela aceita pelo menos
uma finalidade.

**Telefone no CSV.** A exportação traz o telefone só com números, com o código
do país, por exemplo `5535999998832` (sem `+`, sem parênteses nem traço).

**Limite de envios por IP.** Para conter abuso, cada rede pode enviar até
`LIMITE_POR_MINUTO` (padrão 20) e `LIMITE_POR_HORA` (padrão 200) respostas.
Cuidado: o Wi-Fi da loja é uma rede só — todos os clientes que cadastram por
ele contam juntos. Se a loja tiver muito movimento, aumente os limites.

**Mudar um formulário publicado cria uma versão nova.** Quando a equipe muda
as perguntas, as respostas já recebidas continuam apontando para a versão em
que foram dadas, então uma resposta de março continua legível depois de a
pergunta mudar em junho.

**Enviar duas vezes não cria duas respostas.** Cada preenchimento tem uma chave
própria; o servidor reconhece a repetição e devolve a resposta original.

**Uma resposta não se perde por falta de sinal.** Se o envio não chegar, ela
fica guardada no próprio aparelho e parte sozinha quando a conexão voltar — e
continua tentando mesmo com a aba fechada, onde o navegador permite.

**Nenhum número do painel é gravado.** Tudo é contado a partir das respostas no
momento da consulta, então não existe indicador que possa discordar do que os
clientes responderam.

**A análise nunca inventa.** Em "Resultados & IA", cada frase aponta para um
número tirado das respostas, e fato, interpretação, hipótese e possível ação
aparecem separados. Uma trava descarta qualquer frase que cite dado
inexistente, traga um número que os dados não têm ou fale com tom de certeza.

**Quem analisa pode ser uma regra fixa ou um modelo de linguagem.** Sem
configuração, a análise é feita por regras fixas, sem serviço externo. Com
`ANALISE_IA_MODELO` definido (e uma credencial do AI Gateway da Vercel), um
modelo escreve as interpretações, as hipóteses e as ações sobre os fatos que as
regras calcularam — e as regras assumem sozinhas se ele demorar ou errar. O
modelo recebe só números agregados e os enunciados das perguntas: nenhuma
resposta individual nem texto escrito por cliente sai do servidor. A mesma
análise não é pedida duas vezes enquanto não chega resposta nova.

## Publicar os formulários

Os formulários dos clientes ficam descritos em arquivos em
`config/formularios/` (veja `exemplo.json`, que é só um modelo fictício). Quem
cuida do sistema os publica com um script:

```bash
pnpm formularios:publicar config/formularios/<cliente>.json            # simulação, nada é gravado
pnpm formularios:publicar config/formularios/<cliente>.json --aplicar  # grava
pnpm formularios:publicar:prod config/formularios/<cliente>.json       # simulação em PRODUÇÃO
pnpm formularios:publicar:prod config/formularios/<cliente>.json --aplicar
```

Sempre rode primeiro sem `--aplicar` e confira o banco anunciado na primeira
linha. O script:

- cria o formulário novo, ou grava uma versão nova se as perguntas mudaram; se
  nada mudou, não faz nada (pode rodar de novo à vontade);
- só põe no ar o formulário que tem `"publicar": true` no arquivo;
- **não reativa** um formulário que a loja pausou (aparece "INATIVO: não
  reativado") e **recusa** um arquivado — use outro endereço;
- nunca apaga nem arquiva o que não está no arquivo e nunca mexe no que o
  gerente configurou;
- recusa formulário que pede nome ou WhatsApp junto de pergunta sobre saúde ou
  objetivo (peso, dieta, meta, treino…), e telefone sem uso declarado;
- se algum formulário do arquivo for recusado ou inválido, nada é gravado. Se
  o banco cair no meio da gravação, rode o mesmo comando de novo.

Em produção, formulário que pede dado pessoal só abre depois de preencher os
dados da empresa responsável (`CONTROLADOR`, em `src/lib/marca.ts`).

## Acesso administrativo

Senha forte + código de 6 dígitos de um aplicativo autenticador (TOTP). Veja
[docs/admin-acesso.md](docs/admin-acesso.md) para configurar.

## Comandos

| Comando | Para quê |
| --- | --- |
| `pnpm dev` | Roda o projeto localmente |
| `pnpm build` | Compila para produção |
| `pnpm typecheck` | Confere os tipos |
| `pnpm lint` | Confere o estilo do código |
| `pnpm test` | Roda os testes |
| `pnpm db:generate` | Cria uma migração a partir do schema |
| `pnpm db:migrate` | Aplica as migrações pendentes |
| `pnpm totp:enroll` | Gera a chave do autenticador do painel |
| `pnpm formularios:publicar <arquivo>` | Simula (ou, com `--aplicar`, grava) os formulários de um arquivo; `:prod` age no banco de produção |
| `pnpm db:whoami` | Mostra em qual banco o terminal está e quantas linhas ele tem |
