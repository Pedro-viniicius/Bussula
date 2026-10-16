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
o painel conta e mostra              src/servicos/dashboard.ts + src/dominio/resultados/
   ↓
a análise interpreta os números      src/dominio/analise/ (+ src/integracoes/analise/)
   ↓
a tela mostra, nesta ordem:          src/app/(painel)/admin/resultados/
dados → interpretação → possíveis ações
```

## As pastas

### `src/dominio/`

**É o dicionário do produto.** O que é um formulário, quais tipos de pergunta
existem, o que significa "ativo", como um erro se chama.

Cada definição existe aqui **uma vez só**, e o resto do sistema lê daqui. É por
isso que "Ativo" é escrito igual no painel inteiro.

Algumas subpastas merecem nota:

- `resultados/` — como as respostas de um formulário viram números: total,
  ritmo dos dias, canais, distribuição de cada pergunta. É conta pura, testável
  sem banco.
- `contatos/` — o que é um contato (quem deixou o WhatsApp): como o cupom e o
  código de indicação são gerados, como nome e telefone são escondidos na
  lista e o contrato do repositório de contatos.
- `privacidade/` — quando os dados da empresa responsável estão completos. Sem
  isso, em produção, formulário que pede dado pessoal não abre.
- `analise/` — o que esses números podem significar. Define o contrato do
  analista, as regras fixas que escrevem fatos, interpretações, hipóteses e
  ações, e a trava que descarta qualquer frase sem base nos dados.

*Não coloque aqui:* nada que toque banco de dados, nada que desenhe tela, nada
que chame serviço externo.

### `src/servicos/`

**É onde o produto decide.** Como nasce o endereço público de um formulário,
quando uma edição vira uma versão nova, o que conta como resposta válida, quais
números a visão geral mostra.

Dois arquivos merecem nota: `contatos.ts` é a **única porta** pela qual o
painel lê dado pessoal (entrega a lista escondida, e só revela ou exporta com
registro na auditoria), e `publicacao-de-formularios.ts` publica os formulários
descritos em arquivo (usado pelo script `formularios:publicar`).

*Não coloque aqui:* SQL, nem componente de tela.

### `src/repositorios/`

**É onde os dados são guardados e lidos.** É a única pasta que sabe que existe
um banco de dados.

Tem duas versões de tudo: uma que fala com o Postgres e uma que guarda em
memória, usada no modo de teste (veja `MOCKS.md`). Quem escolhe entre as duas é
o arquivo `index.ts`, e só ele.

*Não coloque aqui:* regra de negócio. Esta pasta guarda e devolve; não decide.

### `src/integracoes/`

**É onde o sistema conversa com serviços de fora.** Hoje, só o modelo de
linguagem que pode escrever a análise dos resultados. É a única pasta que sabe
o endereço do serviço, como autenticar e o formato do pedido; quem escolhe se
ele é usado é o arquivo `analise/index.ts`, e só ele.

*Não coloque aqui:* regra de negócio nem cálculo — o modelo recebe números já
calculados e só escreve sobre eles.

### `src/validacoes/`

**É onde se confere o que foi preenchido.** As mesmas funções rodam no celular
de quem responde (para avisar antes de enviar) e no servidor (porque o que
chega pela rede nunca é confiável).

### `src/componentes/` → na prática `src/components/`

As peças de tela, separadas por assunto:

- `interface/` — peças que qualquer tela usa: cartão, etiqueta, número, aviso,
  estado vazio, situação, data.
- `navegacao/` — a barra do painel e a lista das quatro áreas.
- `formularios/` — a tela que o cliente vê, o link público e os botões de
  pausar, retomar e arquivar.
- `contatos/` — a aba Contatos: lista, filtros, revelar e exportar.
- `conclusao/` — a tela que o cliente vê depois de enviar (cupom e link de
  indicação).
- `dashboard/` — gráfico de respostas por dia, sinais, resposta recebida.
- `resultados/` — a tela de Resultados & IA: escolha do formulário, dados,
  análise, possíveis ações e respostas uma a uma.
- `ui/` — botão, campo e rótulo. A base de tudo; mexa com cuidado.

*Não coloque aqui:* consulta ao banco, nem regra de negócio.

### `src/app/`

**São os endereços do site.** O Next.js exige esta pasta e exige os nomes
`page.tsx`, `layout.tsx`, `route.ts`, `loading.tsx` e `error.tsx` — esses não
podem ser traduzidos.

- `app/page.tsx` — a página de acesso (`/`)
- `app/(painel)/admin/…` — tudo que exige login
- `app/f/[slug]/` — o formulário que o cliente abre
- `app/resposta/concluida/` — a confirmação (com o cupom, quando há)
- `app/privacidade/` — a política de privacidade
- `app/(painel)/admin/contatos/` — a aba Contatos (inclui a exportação em CSV)
- `app/api/f/[slug]/respostas/` — por onde a resposta entra

### `src/lib/`

Peças de infraestrutura que não são do produto: conexão com o banco, sessão do
administrador, registro de log, fila offline, textos das telas. `marca.ts` guarda a
identidade da loja e os dados da empresa responsável pelos dados pessoais
(`CONTROLADOR`); `security/` guarda o hash do IP e o limite de envios.

### `src/utilitarios/`

Funções pequenas e genéricas: transformar data em "há 8 min", transformar um
nome em endereço, transformar uma resposta em texto, escrever "62% (18 de 29)".

### `src/testes/`

Peças para montar cenários de teste sem repetir objetos inteiros. Os testes
ficam ao lado do que testam, em arquivos `.test.ts`, e rodam com `pnpm test`.

### `drizzle/`

O histórico do banco de dados. Cada arquivo é uma mudança, na ordem em que foi
aplicada. **Nunca edite um arquivo já aplicado** — crie outro com
`pnpm db:generate`.

### `scripts/`

Comandos de manutenção rodados à mão no terminal: publicar formulários a
partir de um arquivo (`publicar-formularios.ts`), conferir em qual banco se
está (`db-whoami.ts`) e configurar o autenticador do painel. A versão `:prod`
dos comandos age no banco de produção.

### `config/`

Os arquivos que descrevem os formulários de cada cliente
(`config/formularios/<cliente>.json`). É daqui que o script de publicação lê.
`exemplo.json` é só um modelo fictício.

### `docs/`

Este documento, o de acesso administrativo e, em `docs/produto/`, os briefs,
planos e decisões de produto.

## Duas regras que valem sempre

**Nada de número solto no meio do código.** Se um valor importa — quantos
segundos esperar, quantas respostas por página —, ele tem nome em
`src/dominio/constantes.ts`.

**Nome explica intenção.** `buscarRespostasRecentes()` diz o que faz;
`getData()` não diz nada. Nomes do negócio são em português: formulário,
resposta, pergunta, situação.
