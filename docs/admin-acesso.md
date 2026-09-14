# Acesso ao painel (`/admin`)

O painel usa dois fatores: a **senha** do painel e um **código de 6 dígitos**
gerado no celular por um aplicativo autenticador (Google Authenticator, Authy,
Microsoft Authenticator, 1Password…). O código muda a cada 30 segundos.

## Primeiro acesso — configurar o autenticador

Quem administra o sistema tem a chave `ADMIN_TOTP_SECRET`. Com ela em mãos:

1. Instale um aplicativo autenticador no celular.
2. Toque em **Adicionar conta**.
3. Escolha **Inserir chave manualmente** (ou "chave de configuração").
4. Nome: `Fiat Day`.
5. Chave: cole o valor de `ADMIN_TOTP_SECRET`.
6. Tipo: **baseado em tempo**.

O aplicativo passa a mostrar um código de 6 dígitos. Está pronto.

Alternativa: `pnpm totp:enroll` no computador mostra um QR Code no terminal
para escanear — mas só na **primeira** configuração, quando ainda não existe
chave (veja "Gerar uma nova configuração" abaixo).

## Login diário

1. Abra `/admin`.
2. Digite a senha.
3. Abra o aplicativo autenticador.
4. Digite os 6 números que aparecem em "Fiat Day".
5. Toque em **Entrar**.

A sessão dura 12 horas. **Sair** encerra na hora. A mensagem "Senha ou código
de autenticação inválido" é a mesma para os dois erros, de propósito. Depois
de 10 tentativas erradas em 15 minutos, o acesso daquele endereço fica
bloqueado por 15 minutos.

## Novo celular

A chave é a mesma: repita "Primeiro acesso" no celular novo usando o valor
atual de `ADMIN_TOTP_SECRET`. Não é preciso gerar nada. Só gere uma chave
nova se o celular antigo foi perdido ou a chave pode ter vazado.

## Gerar código para teste local

Com o `.env` configurado no computador:

```bash
pnpm totp:code
```

Mostra o código atual e por quantos segundos ele ainda vale. Só existe como
comando local; não há endereço na web que devolva o código.

## Gerar uma nova configuração TOTP

```bash
pnpm totp:enroll             # só gera se ainda não existe chave no .env
pnpm totp:enroll -- --rotate # substitui conscientemente a chave atual
```

O comando **não grava nada**: imprime a chave, a URI e o QR Code, e você
atualiza os lugares por sua conta.

> **Atenção ao rotacionar.** A chave nova invalida todos os autenticadores
> cadastrados com a anterior. Atualize, na mesma sessão de trabalho:
> 1. `ADMIN_TOTP_SECRET` no `.env` local;
> 2. `ADMIN_TOTP_SECRET` na Vercel (Production) e faça um novo deploy;
> 3. cada celular que usa o painel;
> 4. e teste o login antes de fechar o terminal.

## Variáveis necessárias (uma vez, no deploy)

| Variável | O que é |
|---|---|
| `ADMIN_PASSWORD` | Senha do painel, mínimo 16 caracteres. |
| `ADMIN_TOTP_SECRET` | Chave do autenticador (base32), gerada por `pnpm totp:enroll`. |
| `SESSION_SECRET` | Assina o cookie de sessão. `openssl rand -hex 32`. Trocar derruba todas as sessões. |

Sem qualquer uma delas o login fica fechado e a tela avisa "O acesso ainda não
foi configurado neste ambiente"; o motivo exato aparece só no log do servidor.

Para copiar os três valores do `.env` local para a Vercel sem exibi-los:

```bash
for v in ADMIN_PASSWORD ADMIN_TOTP_SECRET SESSION_SECRET; do
  grep "^$v=" .env | cut -d= -f2- | vercel env add "$v" production
done
vercel redeploy --prod
```
