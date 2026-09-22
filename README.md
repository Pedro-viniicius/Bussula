# Essencial Fit — coleta e análise da experiência dos clientes

Sistema operacional da Essencial Fit. Faz um fluxo só, do começo ao fim:

```
CRIAR → PUBLICAR → COLETAR → ENTENDER
```

A equipe cria um formulário no painel. O endereço público dele é gravado num
cartão NFC ou vira um QR Code. O cliente encosta o celular, responde em alguns
segundos, e a resposta aparece no painel virada em informação.

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
| `/admin` | Visão geral da coleta |
| `/admin/formularios` | Lista de formulários |
| `/admin/formularios/novo` | Criar formulário |
| `/admin/formularios/[id]` | Um formulário: link público, situação e resultados |
| `/admin/formularios/[id]/editar` | Editar formulário |
| `/admin/respostas` | Todas as respostas, com filtro por formulário |
| `/f/[slug]` | O formulário que o cliente abre pelo NFC ou QR Code |
| `/resposta/concluida` | Confirmação para quem respondeu |
| `/privacidade` | Política em linguagem clara |

O formulário público não depende do painel: abre, funciona e envia sozinho.

## Como o sistema é organizado

[docs/estrutura-do-projeto.md](docs/estrutura-do-projeto.md) explica o que cada
pasta faz e o que **não** deve ser colocado nela. Escrito para quem não é
desenvolvedor.

O resumo: `dominio` define, `servicos` decide, `repositorios` guarda,
`validacoes` confere, `components` desenha, `app` são os endereços.

## Coisas que valem saber

**Editar um formulário publicado cria uma versão nova.** As respostas já
recebidas continuam apontando para a versão em que foram dadas, então uma
resposta de março continua legível depois de a pergunta mudar em junho.

**Enviar duas vezes não cria duas respostas.** Cada preenchimento tem uma chave
própria; o servidor reconhece a repetição e devolve a resposta original.

**Uma resposta não se perde por falta de sinal.** Se o envio não chegar, ela
fica guardada no próprio aparelho e parte sozinha quando a conexão voltar — e
continua tentando mesmo com a aba fechada, onde o navegador permite.

**Nenhum número do painel é gravado.** Tudo é contado a partir das respostas no
momento da consulta, então não existe indicador que possa discordar do que os
clientes responderam.

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
