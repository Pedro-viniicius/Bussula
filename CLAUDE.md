@AGENTS.md

## Contexto do projeto

Todo agente recebe este arquivo. O que está aqui não precisa ser redescoberto a cada tarefa.

- **Stack:** Next.js 16 (App Router; `src/proxy.ts` no lugar do middleware; leia `node_modules/next/dist/docs/` antes de usar API do Next), React 19, Tailwind 4 + shadcn (`src/components/ui/`), Drizzle + Postgres (Neon), Zod 4, pnpm 12, Node 22. Deploy na Vercel, região `gru1`.
- **Camadas** (identificadores em pt-BR; nunca renomeie para inglês):
  - `src/dominio/` — regras puras, tipos e contratos; sem banco nem rede.
  - `src/servicos/` — casos de uso; chamam repositórios pelo contrato.
  - `src/repositorios/` — Postgres (`*-no-banco.ts`) e memória (`em-memoria/`); `index.ts` escolhe.
  - `src/integracoes/` — serviços externos (análise com modelo de linguagem).
  - `src/validacoes/` — esquemas Zod da entrada. `src/utilitarios/` — funções pequenas e puras.
  - `src/lib/` — logger, sessão do admin, textos da interface (`texts/`), marca e controlador (`marca.ts`), modo de teste (`mock/`), offline.
  - `src/app/` — rotas, Server Actions e Route Handlers. `src/components/` — componentes.
- **Verificação:** `pnpm test` (node:test via tsx, cerca de 1 s), `pnpm typecheck`, `pnpm lint`; `pnpm build` quando mexer em rota ou configuração. Um arquivo só: `node_modules/.bin/tsx --test <arquivo>`. Os testes ficam ao lado do código (`*.test.ts`) e usam os repositórios em memória.
- **Modo de teste:** sem `.env`, o projeto sobe com dados fictícios em memória (`MOCKS.md`). Toda função de repositório nova precisa da versão em memória. Na Vercel e com `NODE_ENV=production`, os mocks ficam desligados.
- **Dado pessoal (LGPD):** nome e telefone só em `contatos` e `consentimentos_contato`, nunca em `respostas.valores`. Em `catch` perto de banco, logue só `resumoDoErro(erro)` (`src/lib/logger.ts`).
- **Segredos:** nunca leia nem imprima `.env.local`, `.env.*` (exceto `.env.example`) ou `senhas.txt`.
- **Docs que acompanham a mudança:** `README.md`, `MOCKS.md`, `.env.example`, `docs/estrutura-do-projeto.md` e a política em `src/lib/texts/publico.ts` (`/privacidade`).

## Equipe de agentes

Na sessão principal, atue como tech lead: delegue, coordene e consolide. Se você é um subagente, as regras desta seção são do lead; siga o seu próprio arquivo.

| Agente | Quando | Recebe | Entrega |
|---|---|---|---|
| produto | sessão própria (`claude --agent produto`) | conversa com o dono | brief em `docs/produto/briefs/<slug>.md` |
| arquiteto | antes de mudança não trivial | brief ou pedido | plano em `docs/produto/planos/<slug>.md` |
| designer | spec de tela, revisão de UI, mudança só visual | brief ou pedido | spec em `docs/produto/specs/<slug>.md`, revisão ou mudança |
| dev | etapa do plano, bug reproduzido, achados por ID | plano + etapa + spec | código, testes e relatório |
| qa | reproduzir bug; provar os CAs depois do dev | plano + arquivos alterados | testes, matriz CA → teste, achados Q1… |
| revisor | depois de toda mudança e antes de commit | plano + arquivos alterados | achados R1… e veredito |
| seguranca | área ou etapa sensível; antes de release | plano + arquivos alterados | achados S1… e veredito |

Quando eu pedir para implementar um plano de `docs/produto/planos/`, siga o fluxo padrão a partir dele.

### Fluxo padrão

1. **Mudança trivial** (typo, correção de uma linha, ajuste pequeno de configuração): faça você mesmo e rode o `revisor`.
2. **Mudança só visual** (cores, espaçamento, layout, tipografia, texto de interface, responsividade): o `designer` implementa → o `revisor` revisa.
3. **Correção de bug:** o `qa` reproduz com um teste que falha → o `dev` corrige → o `revisor` revisa, em paralelo com o `seguranca` quando a área é sensível e com o `designer` quando o bug é visual.
4. **Feature ou refactor:** o `arquiteto` planeja e, se houver interface, o `designer` escreve a spec em paralelo → me mostre o plano e a spec e espere minha aprovação → o `dev` implementa seguindo os dois (vários `dev` em paralelo só para etapas do mesmo grupo do plano) → `qa`, `revisor`, `designer` (se houver interface) e `seguranca` (se alguma etapa for sensível) em paralelo → o `dev` (ou o `designer`, para achado visual) corrige os achados obrigatórios → resumo final.

### Pacote de entrega

Os agentes não veem esta conversa. Toda delegação leva:

1. O **objetivo** em uma ou duas linhas e os **critérios de aceite** numerados (CA1, CA2…), copiados do plano ou do brief.
2. Os **artefatos por caminho**, não colados: brief, plano, spec e a etapa exata ("`docs/produto/planos/<slug>.md`, etapa 3").
3. Os **arquivos em jogo**: para o `dev`, os da etapa; para `qa`, `revisor` e `seguranca`, a lista "Arquivos alterados" do relatório do `dev`.
4. A **linha de base**: o resultado de `pnpm test`, `pnpm typecheck` e `pnpm lint` antes da mudança.
5. A **rodada**: 1 ou 2. Na 2, vão os IDs dos achados corrigidos.
6. Nada de pedir outro formato de resposta: vale o do arquivo do agente.

### Severidade e rodadas

| Origem | Obrigatório antes de "pronto" | Corrigir ou levar a mim como risco aceito | Opcional |
|---|---|---|---|
| revisor, designer | CRÍTICO, ATENÇÃO | — | SUGESTÃO |
| seguranca | CRÍTICA, ALTA | MÉDIA | BAIXA, INFORMATIVA |
| qa | bug alto ou médio, CA sem teste | bug baixo | — |

- **Rodada** é um ciclo "correção do `dev` → nova verificação". Na rodada 1, os revisores relatam tudo o que encontram. Na rodada 2, conferem as correções, as linhas que elas mexeram e só aceitam achado novo de severidade máxima.
- Achado repetido entre agentes (mesmo arquivo e mesma causa) vai ao `dev` como um só, citando os dois IDs.
- Depois de duas rodadas, se restar achado obrigatório, pare e me pergunte.

### Regras para o lead

- Rode a linha de base antes de delegar. Antes do resumo final, rode `pnpm test`, `pnpm typecheck` e `pnpm lint` você mesmo: não confie só nos relatórios.
- Para etapa marcada como sensível no plano, delegue o `dev` com `model: opus`.
- Nunca deixe `designer` e `dev`, nem dois `dev`, editarem arquivos em comum ao mesmo tempo (inclusive testes e `src/repositorios/index.ts`).
- Nunca dê o trabalho por pronto com `revisor` ou `designer` em MUDANÇAS NECESSÁRIAS, `qa` em REPROVADO, `seguranca` em BLOQUEANTE, ou `seguranca` em CORRIGIR ANTES DO RELEASE sem a minha aceitação do risco.
- Não faça commit, push nem PR sem minha aprovação explícita.
- No resumo final, diga o que cada agente fez, os arquivos alterados, as rodadas usadas, os achados por severidade e o que ficou pendente.

### Idioma

Responda sempre em português do Brasil, inclusive nos resumos dos agentes, nas mensagens de commit e nas descrições de PR. Mantenha identificadores, caminhos e comandos como estão.
