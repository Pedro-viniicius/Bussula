# BUSSULA

**BUSSULA é uma plataforma que conecta o ambiente físico ao digital por meio de
NFC e QR Code.** Ela captura os dados das interações e usa inteligência
artificial para transformá-los em informações, recomendações e apoio à tomada de
decisões.

> **BUSSULA = NFC/QR + captura de dados + gestão + IA para tomada de decisões**
>
> interação física → dado → análise → decisão

### Onde o projeto está hoje

Este repositório é o MVP e cobre as duas primeiras etapas: a interação física e
o dado. Ele traz a captura via NFC/QR, o armazenamento com consentimentos
conforme a LGPD e um painel de gestão. A camada de IA para análise e decisão é
a próxima etapa.

Na prática, a pessoa encosta o celular numa tag NFC ou lê um QR code, preenche
uma tela curta e recebe um cupom. Cada ponto de captura (um evento, uma loja,
uma campanha) é um registro no banco, identificado por um `slug`. O mesmo
sistema atende quantos forem necessários, sem novo deploy.

## Como funciona

- **Formulário** em `/f/<slug>`. Nome, telefone, e-mail opcional, item de
  interesse e prazo de compra, além dos consentimentos separados por finalidade
  (contato comercial, promoção e marketing). Ao enviar, o visitante recebe um
  cupom único.
- **Origem e vendedor pela URL.** `?o=nfc|qr|manual` registra por onde o
  visitante chegou. `?v=07` atribui o cadastro ao vendedor de código `07`.
  Exemplo: `/f/meu-evento?o=nfc&v=07`.
- **Funciona sem internet.** Um service worker guarda a página, e os cadastros
  feitos offline entram numa fila que é reenviada quando a conexão volta. Uma
  chave de idempotência impede cadastro duplicado.
- **Abrir e fechar o evento.** Só o campo `ativo` controla isso. `inicio` e
  `fim` servem para relatórios e nunca fecham o formulário sozinhos.
- **Itens de interesse.** Os modelos ou produtos mostrados como opções ficam em
  `eventos.modelos`, no banco. Dá para mudar a lista sem deploy.
- **Proteção contra abuso.** Há um limite de cadastros por IP. O IP é guardado
  só como hash com sal, nunca em texto puro.
- **Painel** (`/admin`), protegido por senha e código TOTP, e **demonstração**
  (`/demo`) com dados fictícios.

Stack: Next.js (App Router) · Drizzle ORM · Postgres (Neon) · Tailwind · Vercel.

## Rodando localmente

```bash
pnpm install
cp .env.example .env   # preencha DATABASE_URL, IP_HASH_SALT, SESSION_SECRET…
pnpm db:migrate
pnpm db:seed           # cria o evento e os vendedores
pnpm dev
```

A raiz `/` redireciona para a landing page em `/lp`. Os cartões NFC e QR codes
apontam direto para `/f/<slug>`.

### Configurando um novo evento

O evento criado pelo seed vem da constante `EVENTO` em `scripts/seed.ts`:
slug, nome, janela de datas, retenção e lista de modelos. A quantidade de
vendedores fica em `QTD_VENDEDORES`. Ajuste esses valores e rode
`pnpm db:seed`. O script é idempotente e se recusa a rodar num banco que já tem
leads, a menos que você passe `--force`.

### Outros comandos

```bash
pnpm test         # testes
pnpm typecheck    # checagem de tipos
pnpm lint
pnpm db:studio    # navegar no banco
```

## Dia do evento

### Qual banco está no ar? (5 segundos)

Cada banco Neon tem um endereço próprio, `ep-xxx.sa-east-1.aws.neon.tech`.
O sistema imprime esse endereço (nunca a senha) em dois lugares. Se os dois
forem iguais, terminal e site estão falando com o mesmo banco.

1. **O que o site está usando.** Abra o projeto na Vercel, vá em **Logs** e
   pesquise `banco de dados`. A linha mostra `"host":"ep-xxx…"`. Ela é gravada
   quando a função sobe. Se não aparecer, abra o formulário uma vez e pesquise
   de novo.
2. **O que o seu terminal está usando.** Na pasta do projeto:

   ```bash
   pnpm db:whoami:prod
   ```

   Imprime `→ lendo de ep-xxx… (arquivo: .env.producao)`, os eventos, o número
   de vendedores e o de leads (com a hora do último). O comando só lê o banco e
   apaga o arquivo de credenciais ao terminar.

Para saber a qual branch o `ep-xxx` pertence, abra o projeto no Neon e vá em
**Branches**: cada branch lista o seu endpoint. `pnpm db:whoami` (sem `:prod`)
mostra o banco do `.env` local, que deve ser a branch `dev`.

Todo script que escreve no banco (`db:seed`, `anonimizar`) começa com a linha
`→ escrevendo em ep-xxx… (arquivo: …)`. Se o `ep-` não for o de produção quando
deveria ser, ou for quando não deveria, aperte Ctrl-C.

## Painel (`/admin`) e demonstração (`/demo`)

O acesso é por senha e pelo código de 6 dígitos do aplicativo autenticador
(TOTP). O guia do operador está em
[`docs/admin-acesso.md`](docs/admin-acesso.md) e cobre o primeiro acesso, o
login diário, a troca de celular e a rotação da chave. Resumo dos comandos:

```bash
pnpm totp:enroll             # gera a chave TOTP (recusa se já existir)
pnpm totp:enroll -- --rotate # troca a chave conscientemente
pnpm totp:code               # código atual, para testar o login localmente
```

Variáveis: `ADMIN_PASSWORD` (16+ caracteres), `ADMIN_TOTP_SECRET` (base32) e
`SESSION_SECRET` (`openssl rand -hex 32`). Se faltar qualquer uma delas, o login
fica fechado.

### `/demo`: painel de gestão com dados fictícios

Mostra ao cliente o que o painel faz com os dados capturados. Usa um evento
inventado (`slug = demo`), que fica sempre inativo e nunca recebe cadastros
reais:

```bash
pnpm db:seed:demo             # cria o evento demo com ~220 cadastros inventados
pnpm db:seed:demo --purge     # apaga o evento demo e tudo que pertence a ele
pnpm db:seed:demo:prod        # o mesmo, contra a produção (pede confirmação visual do host)
```

Nomes, telefones e e-mails são gerados. Os telefones usam `(DD) 90xxx-xxxx`,
faixa que a Anatel não atribui, e os e-mails usam `@example.com`. Nenhum dado
real aparece na tela. Todas as consultas são filtradas pelo evento demo, e a URL
só carrega filtros da lista.

O que a tela demonstra de LGPD:

- Dados pessoais aparecem mascarados por padrão. Clicar em "Revelar" grava
  `auditoria.acao = 'dado_revelado'`.
- A exportação CSV só inclui quem consentiu marketing, a menos que a opção
  contrária seja marcada explicitamente. Cada exportação grava
  `auditoria.acao = 'exportacao'`.
- Quem não consentiu marketing aparece como "Não contatar por campanha".
- O prazo de anonimização fica visível.
