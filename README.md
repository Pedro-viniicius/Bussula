# Fiat Day — captura de leads

Formulário de cadastro para o evento de 19/09/2026. Visitante encosta o cartão NFC
ou lê o QR, preenche uma tela e recebe um cupom.

Site: https://fiat-mvp-pi.vercel.app

> README completo (rodar local, seed, vendedores, exportação, plano de contingência)
> chega na etapa de hardening. Esta seção já é definitiva.

## Dia do evento

### Qual banco está no ar? (5 segundos)

Cada banco Neon tem um endereço próprio, `ep-xxx.sa-east-1.aws.neon.tech`.
O sistema imprime esse endereço (nunca a senha) em dois lugares. Se os dois
forem iguais, terminal e site estão falando com o mesmo banco.

1. **O que o site está usando** — Vercel → projeto `fiat-mvp` → **Logs** →
   pesquise `banco de dados`. A linha mostra `"host":"ep-xxx…"`. Ela é gravada
   quando a função sobe, então se não aparecer, abra o formulário uma vez e
   pesquise de novo.
2. **O que o seu terminal está usando** — na pasta do projeto:

   ```bash
   pnpm db:whoami:prod
   ```

   Imprime `→ lendo de ep-xxx… (arquivo: .env.producao)`, os eventos, o número
   de vendedores e de leads (com a hora do último). É só leitura e apaga o
   arquivo de credenciais ao terminar.

Para saber a qual branch o `ep-xxx` pertence: Neon → projeto → **Branches** →
cada branch lista o seu endpoint. `pnpm db:whoami` (sem `:prod`) mostra o banco
do `.env` local, que deve ser a branch `dev`.

Todo script que escreve no banco (`db:seed`, `anonimizar`) começa com a linha
`→ escrevendo em ep-xxx… (arquivo: …)`. Se o `ep-` não for o de produção quando
deveria ser (ou for, quando não deveria), Ctrl-C.

## Painel (`/admin`) e demonstração (`/demo`)

O acesso é por senha + código do aplicativo autenticador (TOTP). Configure, no
`.env` local e nas variáveis do projeto na Vercel:

- `ADMIN_PASSWORD` — mínimo 16 caracteres.
- `ADMIN_TOTP_SECRET` — gere com `pnpm totp:enroll` e cadastre a chave no
  Google Authenticator / Authy (o comando imprime a chave e a URI `otpauth://`).
- `SESSION_SECRET` — `openssl rand -hex 32`. Trocar este valor derruba todas as
  sessões.

Sem `ADMIN_TOTP_SECRET` o login é recusado (nunca cai em "só senha").

### `/demo` — painel de gestão com dados fictícios

Mostra ao cliente o que o painel faz com os dados capturados, usando um evento
inventado (`slug = demo`, sempre inativo, nunca recebe cadastros reais):

```bash
pnpm db:seed:demo             # cria o evento demo com ~220 cadastros inventados
pnpm db:seed:demo --purge     # apaga o evento demo e tudo que pertence a ele
pnpm db:seed:demo:prod        # o mesmo, contra a produção (pede confirmação visual do host)
```

Nomes, telefones (`(DD) 90xxx-xxxx`, faixa que a Anatel não atribui) e e-mails
(`@example.com`) são gerados; nenhum dado real aparece na tela. Todas as
consultas são filtradas pelo evento demo — a URL só carrega filtros da lista.

O que a tela demonstra de LGPD: dados pessoais mascarados por padrão; "Revelar"
grava `auditoria.acao = 'dado_revelado'`; a exportação CSV só inclui quem
consentiu marketing (o contrário exige marcar a opção explicitamente) e grava
`auditoria.acao = 'exportacao'`; quem não consentiu marketing aparece como "Não
contatar por campanha"; o prazo de anonimização fica visível.
