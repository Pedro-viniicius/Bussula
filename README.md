# Essencial Fit — coleta e análise da experiência dos clientes

Sistema operacional da Essencial Fit. Faz um fluxo só, do começo ao fim:

```
COLETAR → MEDIR → COMPREENDER → AGIR
```

Os formulários são preparados e configurados pela equipe que cuida do sistema
— a loja recebe três incluídos no serviço. O endereço público de cada um é
gravado num cartão NFC ou vira um QR Code. O cliente encosta o celular,
responde em alguns segundos, e a resposta aparece no painel virada em
informação: primeiro os números, depois o que eles podem significar e o que
dá para fazer com isso.

O painel da loja tem três áreas, e só três:

| Área | Pergunta que responde |
| --- | --- |
| Visão Geral | Como está a coleta agora? |
| Formulários | O que está sendo coletado? |
| Resultados & IA | O que as respostas significam? |

A loja não cria nem edita formulários pelo painel.

Não é um site institucional e não tem página de vendas.

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
| `/admin/login` | Entrada do painel (senha + código do autenticador) |
| `/admin` | Visão Geral: números da coleta, sinais e ritmo dos dias |
| `/admin/formularios` | Formulários disponíveis: situação, respostas, link público |
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
