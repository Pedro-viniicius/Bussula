# Modo de teste (sem `.env`, sem banco, sem serviço externo)

Serve para conferir a interface: o projeto sobe com um comando, todas as telas
abrem e os fluxos principais funcionam de ponta a ponta — só que o que estaria
no Postgres fica em memória.

O código de integração real **não foi removido nem alterado na sua lógica**. Cada
função de acesso a dados ganhou uma linha no começo que desvia para a versão em
memória enquanto a flag estiver ligada. Desligou a flag, o caminho real volta a
ser o único.

## Como rodar

```bash
pnpm install
pnpm dev
```

Abra **http://localhost:3000**.

> Use `localhost`, não `127.0.0.1`: no `next dev` o runtime do cliente se liga a
> `localhost`, e pelo IP a página abre mas não hidrata (nenhum clique responde).
> Em `pnpm build && pnpm start` os dois endereços funcionam.

Nenhum arquivo `.env` é necessário. Se já existir um `.env.local`, ele continua
sendo lido — o modo de teste só preenche o que estiver faltando e nunca
sobrescreve o que você definiu.

## Por onde começar

| Tela | Endereço | O que dá para testar |
| --- | --- | --- |
| Acesso | `/` | A porta de entrada do sistema |
| Login do painel | `/admin/login` | Botão **Entrar como usuário de teste** (ou qualquer senha e qualquer código) |
| Visão Geral | `/admin` | Indicadores, sinais, respostas por dia e respostas recentes |
| Formulários | `/admin/formularios` | Os quatro formulários, situação, link público, desativar e arquivar |
| Contatos | `/admin/contatos` | Contatos fictícios do "Cadastro no balcão": nome e telefone escondidos, revelar, cupom, indicações e exportação em CSV |
| Resultados & IA | `/admin/resultados` | Dados, análise, possíveis ações e respostas uma a uma, por formulário |
| Formulário público | `/f/experiencia-na-loja` | Cinco perguntas, uma por vez, envio e confirmação |
| Cadastro com cupom | `/f/cadastro-no-balcao` | Pergunta, nome, WhatsApp, consentimento e a tela com o cupom fictício e o link de indicação |
| Formulário pausado | `/f/pos-venda` | O aviso que o cliente vê quando o formulário não está ativo |
| Endereço inexistente | `/f/nao-existe` | O aviso de formulário não encontrado |
| Privacidade | `/privacidade` | Texto da política |

## O que está fictício

| Serviço real | No modo de teste | Onde |
| --- | --- | --- |
| Formulários no Postgres | Listas em memória, mesmo contrato | `src/repositorios/em-memoria/formularios.ts` |
| Respostas no Postgres | Listas em memória, com a mesma proteção contra envio repetido | `src/repositorios/em-memoria/respostas.ts` |
| Trilha de auditoria | Lista em memória; alimenta o freio de força bruta do login | `src/repositorios/auditoria.ts` |
| Login do admin (senha + TOTP) | Qualquer senha e qualquer código entram; há um botão de atalho | `src/app/(painel)/admin/login/actions.ts` |
| Análise com modelo de linguagem | A análise é sempre feita pelas regras fixas, mesmo com `ANALISE_IA_MODELO` definido | `src/integracoes/analise/index.ts` |

A troca acontece num arquivo só, `src/repositorios/index.ts`: ele escolhe a
implementação e os serviços nunca perguntam qual está em uso.

Os dados de exemplo são quatro formulários — "Experiência na loja" (ativo, na
versão 2), "Interesse em suplementos" (ativo), "Pós-venda" (em preparação) e
"Cadastro no balcão" (ativo, com cupom e indicação) — e 135 respostas: 123
espalhadas pelos últimos 14 dias nos três primeiros e 12 do "Cadastro no
balcão" nos últimos cinco dias. O "Cadastro no balcão" é **fictício**: o nome
e o telefone dos contatos, os cupons e o brinde ("Brinde de exemplo") não
existem de verdade. O sorteio usa semente fixa, então a história é a mesma a cada execução; as datas
são relativas ao momento em que o servidor sobe, para "respostas hoje" e
"última resposta há 4 min" mostrarem alguma coisa em qualquer dia.

"Experiência na loja" tem respostas das versões 1 e 2 de propósito: é o que
deixa ver, na prática, uma resposta antiga continuando legível depois de o
formulário ganhar uma pergunta nova.

**O que você cadastrar durante o teste vive enquanto o servidor estiver de pé.**
Ao reiniciar, tudo volta ao estado inicial.

## Voltar aos serviços reais

1. Em `src/lib/mock/config.ts`, troque `const PADRAO = true` por `false`.
   (Ou, sem editar código, exporte `USAR_MOCKS=false` no ambiente.)
2. Preencha o `.env.local` a partir do `.env.example`:

   | Variável | Para quê | Sem ela |
   | --- | --- | --- |
   | `DATABASE_URL` | Conexão do Neon (endpoint com pool) | Nada que toque o banco funciona |
   | `NEXT_PUBLIC_SITE_URL` | Endereço canônico nos metadados das páginas | Cai em `http://localhost:3000` |
   | `IP_HASH_SALT` | Hash do IP no freio do login **e no limite de envios por IP** (`openssl rand -hex 32`). **Obrigatório em produção** | O freio do login conta por tentativa global; o limite de envios fica desligado e o servidor registra um erro |
   | `LIMITE_POR_MINUTO`, `LIMITE_POR_HORA` | Quantas respostas uma mesma rede pode enviar (padrões 20 e 200). Opcionais | Valem os padrões |
   | `SESSION_SECRET` | Assina o cookie do `/admin` (32+ caracteres) | O login não abre |
   | `ADMIN_PASSWORD` | Senha do painel (16+ caracteres) | O login não abre |
   | `ADMIN_TOTP_SECRET` | Chave do autenticador (`pnpm totp:enroll`) | O login não abre |

3. Rode as migrações:

   ```bash
   pnpm db:migrate
   ```

   Não há seed: o painel abre com o estado vazio. Os formulários não são
   criados pelo painel — quem cuida do sistema os publica a partir de um
   arquivo com `pnpm formularios:publicar config/formularios/<arquivo>.json`
   (simulação; `--aplicar` grava), que passa por todas as validações. Veja o
   README.

   Em **produção** de verdade (modo de teste desligado), um formulário que pede
   nome ou WhatsApp **não abre** enquanto os dados da empresa responsável
   (`CONTROLADOR`, em `src/lib/marca.ts`) estiverem vazios. No modo de teste
   essa trava não existe, para dar para ver as telas.

Num deploy na Vercel o modo de teste já fica desligado sozinho, mesmo com
`PADRAO = true`: a variável `VERCEL` denuncia o ambiente e o painel nunca sobe
sem senha por descuido.

## Publicar como vitrine na Vercel

Para o site no ar mostrar a interface sem banco nenhum, defina **`USAR_MOCKS=true`**
nas variáveis do projeto na Vercel. Essa escolha explícita vence a proteção acima,
e o `vercel-build` (`scripts/vercel-build.sh`) pula a migração — sem ela, o build
falharia na hora de migrar um banco que não existe.

Três coisas para saber antes:

- **O `/admin` fica aberto.** Sem senha e sem autenticador, para qualquer pessoa
  com o endereço. Os dados são fictícios e o `/admin` em si é um estado vazio,
  mas o endereço é público.
- **O que for cadastrado no ar não persiste.** Cada instância da função tem a sua
  própria memória: um cadastro feito numa requisição pode não aparecer na
  seguinte, e some a cada instância reciclada. Serve para demonstrar as telas,
  não para receber cadastro de verdade.
- **Os números são sempre os mesmos.** É a semente fixa: os mesmos quatro
  formulários e as mesmas 135 respostas. Bom para apresentar, inútil como
  relatório.

Para voltar a publicar de verdade, remova `USAR_MOCKS` das variáveis da Vercel.
O build passa a migrar e a compilar como antes, sem mais nenhuma mudança.
