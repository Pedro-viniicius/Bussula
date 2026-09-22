# Onde fica cada coisa

Este documento é para quem precisa achar alguma coisa no projeto sem ser
desenvolvedor — e para quem é, mas voltou depois de três meses.

A regra geral: **cada pasta tem uma responsabilidade só**. Se um arquivo
parece caber em duas, quase sempre ele está fazendo duas coisas e deveria ser
dividido.

## O caminho de uma resposta

É útil ter esta sequência na cabeça, porque a estrutura de pastas a segue:

```
cliente encosta o celular no cartão NFC (ou lê o QR Code)
   ↓
abre o formulário público            src/app/f/[slug]/
   ↓
responde                             src/components/formularios/
   ↓
o que foi respondido é conferido     src/validacoes/
   ↓
a resposta é enviada                 src/app/api/f/[slug]/respostas/
   ↓
as regras são aplicadas              src/servicos/
   ↓
a resposta é guardada                src/repositorios/
   ↓
o painel conta e mostra              src/app/(painel)/ + src/servicos/dashboard.ts
```

## As pastas

### `src/dominio/`

**É o dicionário do produto.** O que é um formulário, quais tipos de pergunta
existem, o que significa "ativo", como um erro se chama.

Cada definição existe aqui **uma vez só**, e o resto do sistema lê daqui. É por
isso que "Ativo" é escrito igual no painel inteiro.

*Não coloque aqui:* nada que toque banco de dados, nada que desenhe tela.

### `src/servicos/`

**É onde o produto decide.** Como nasce o endereço público de um formulário,
quando uma edição vira uma versão nova, o que conta como resposta válida, quais
números a visão geral mostra.

*Não coloque aqui:* SQL, nem componente de tela.

### `src/repositorios/`

**É onde os dados são guardados e lidos.** É a única pasta que sabe que existe
um banco de dados.

Tem duas versões de tudo: uma que fala com o Postgres e uma que guarda em
memória, usada no modo de teste (veja `MOCKS.md`). Quem escolhe entre as duas é
o arquivo `index.ts`, e só ele.

*Não coloque aqui:* regra de negócio. Esta pasta guarda e devolve; não decide.

### `src/validacoes/`

**É onde se confere o que foi preenchido.** As mesmas funções rodam no celular
de quem responde (para avisar antes de enviar) e no servidor (porque o que
chega pela rede nunca é confiável).

### `src/componentes/` → na prática `src/components/`

As peças de tela, separadas por assunto:

- `interface/` — peças que qualquer tela usa: cartão, etiqueta, número, aviso,
  estado vazio, situação, data.
- `navegacao/` — a barra do painel.
- `formularios/` — criar e editar um formulário, e a tela que o cliente vê.
- `dashboard/` — indicadores, gráfico, sinais, resposta recebida.
- `ui/` — botão, campo e rótulo. A base de tudo; mexa com cuidado.

*Não coloque aqui:* consulta ao banco, nem regra de negócio.

### `src/app/`

**São os endereços do site.** O Next.js exige esta pasta e exige os nomes
`page.tsx`, `layout.tsx`, `route.ts`, `loading.tsx` e `error.tsx` — esses não
podem ser traduzidos.

- `app/page.tsx` — a página de acesso (`/`)
- `app/(painel)/admin/…` — tudo que exige login
- `app/f/[slug]/` — o formulário que o cliente abre
- `app/resposta/concluida/` — a confirmação
- `app/api/f/[slug]/respostas/` — por onde a resposta entra

### `src/lib/`

Peças de infraestrutura que não são do produto: conexão com o banco, sessão do
administrador, registro de log, fila offline, textos das telas.

### `src/utilitarios/`

Funções pequenas e genéricas: transformar data em "há 8 min", transformar um
nome em endereço, transformar uma resposta em texto.

### `drizzle/`

O histórico do banco de dados. Cada arquivo é uma mudança, na ordem em que foi
aplicada. **Nunca edite um arquivo já aplicado** — crie outro com
`pnpm db:generate`.

### `scripts/`

Comandos de manutenção rodados à mão no terminal.

### `docs/`

Este documento e o de acesso administrativo.

## Duas regras que valem sempre

**Nada de número solto no meio do código.** Se um valor importa — quantos
segundos esperar, quantas respostas por página —, ele tem nome em
`src/dominio/constantes.ts`.

**Nome explica intenção.** `buscarRespostasRecentes()` diz o que faz;
`getData()` não diz nada. Nomes do negócio são em português: formulário,
resposta, pergunta, situação.
