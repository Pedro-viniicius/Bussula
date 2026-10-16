# Plano técnico: Essencial Fit, cadastro com recompra, cupom e indicação

- Status: proposta do arquiteto, aguardando aprovação do dono
- Data: 2026-10-15
- Brief: `docs/produto/briefs/essencial-fit-cadastro.md` (aprovado)
- Spec de UI: `docs/produto/specs/essencial-fit-cadastro.md` (designer)
- Repositório: `/home/ufla/Documentos/Bussola/bussula`, branch `main`, base `c176c0d`
- Decisões do dono incorporadas (2026-10-15):
  1. cupom sem consentimento de mensagens;
  2. código nunca reexibido;
  3. `wa.me` com mensagem provisória;
  4. módulos só leitura, o gerente edita o brinde;
  5. offline mostra o cupom só com a página aberta;
  6. sem WhatsApp, sem cupom;
  7. aba Contatos aprovada;
  8. NÃO renomear "Resultados & IA";
  9. cupom vale 30 dias;
  10. brinde cadastrado pelo gerente.
  
  Respostas às premissas: nome e WhatsApp obrigatórios e o destino da indicação viram configuração da loja por formulário; a loja pode enviar o cupom pelo WhatsApp a partir da lista.

> Regra deste documento: onde houver tela, o visual é da spec do designer. Os passos marcados **[UI: spec]** só têm o comportamento e os dados definidos aqui.

## Objetivo

Pôr a Essencial Fit em uso real e pago. O cliente se cadastra pelo cartão NFC ou QR, com consentimento por finalidade, e recebe um cupom único (válido por 30 dias) e um link de indicação. O gerente vê os contatos mascarados, revela com auditoria, chama no WhatsApp quem aceitou e exporta CSV só de quem consentiu.

Critérios de aceite do brief, todos válidos, menos a troca de nome de "Resultados & IA", que saiu do escopo por decisão do dono:
- resposta com formulário, origem e versão do texto no painel;
- cupom único por telefone e formulário;
- `?ref=` conta indicação;
- mascarado, revelar e CSV auditados, CSV só de quem consentiu;
- `wa.me` abre a conversa;
- Wi-Fi da loja sem bloqueio em uso normal;
- formulário identificado sem pergunta de saúde;
- `/admin` com senha e TOTP;
- trava do controlador em produção;
- nada de "fiat" ou "concessionária" fora do git;
- testes, typecheck e lint passando.

## Contexto atual

- **Camadas**: `src/dominio` (tipos e regras puras), `src/servicos` (regras de produto), `src/repositorios` (Postgres e memória; a escolha fica só em `src/repositorios/index.ts`, conforme `USAR_MOCKS`), `src/validacoes` (roda no cliente e no servidor), `src/app` (rotas). Testes com `tsx --test` contra os dados fictícios em memória (`src/servicos/servicos.test.ts`, com 3 formulários e 123 respostas de semente fixa).
- **Formulários versionados**: `formularios` + `versoes_formulario.perguntas` (jsonb) em `src/lib/db/schema.ts:115-177`. As respostas apontam para a versão (`respostas.versao_formulario`). O tipo de pergunta é definido uma vez só em `src/dominio/formularios/perguntas.ts` (`DESCRICAO_DO_TIPO`). Criar, atualizar e publicar existem em `src/servicos/formularios.ts`, sem nenhuma tela e sem seed.
- **Envio público**: `src/app/api/f/[slug]/respostas/route.ts` → `registrarResposta` (`src/servicos/respostas.ts`). É idempotente por `chave_envio` único. Recusa prevista = 200 com `ok:false`; 5xx = a fila offline guarda (`src/lib/offline/sync.ts:43`, `public/sw.js`, que só re-enfileira com `status >= 500`). Hoje não há limite por IP nem `ip_hash` em `respostas`.
- **Tela pública**: `src/app/f/[slug]/page.tsx` lê `?o=` no servidor e passa por prop. Como o service worker guarda `/f/*` pelo caminho, sem a query (`public/sw.js`, `paginaNetworkFirst`), uma página guardada pode trazer a origem de outra visita. Isso é ruim para `ref`. O envio vai para `/resposta/concluida` por `router.push`, e essa tela não consulta o banco.
- **Auditoria**: tabela `auditoria` (`schema.ts:86-94`) e `src/repositorios/auditoria.ts` (`registrar`, `contarFalhasDeLogin`), hoje usada só no login (`src/app/(painel)/admin/login/actions.ts`).
- **Sessão**: cookie assinado e sem estado. `sessaoAtual()` / `exigirAdmin()` em `src/lib/admin/session.ts`. `src/proxy.ts` só olha se o cookie existe; quem autoriza de verdade é a página ou action.
- **Modo de teste**: em `src/lib/mock/config.ts`, `PADRAO = true`; desliga sozinho só se `VERCEL` estiver definido. `USAR_MOCKS=true` na Vercel liga os mocks e o login aceita qualquer senha (`login/actions.ts:67`). **Atenção**: scripts com `tsx` fora da Vercel sobem com os mocks LIGADOS por padrão.
- **Legado do Fiat**: `eventos`, `vendedores`, `leads`, `consentimentos`, `solicitacoes_contato` (`schema.ts:23-113`). O único uso é `scripts/db-whoami.ts`. `src/lib/domain.ts` (`FINALIDADES`/`ORIGENS`) só é usado pelo schema.
- **Logger**: `src/lib/logger.ts` já apaga as chaves `nome`, `telefone`, `email`, `ip`.
- **Telefone**: `src/lib/validation/phone.ts` (`normalizarTelefone` → E.164, `mascararTelefone` = máscara de digitação). Ao colar `+55…`, o número é cortado antes de tirar o 55 (bug apontado pela spec).
- **Peças do Bussula** (commit `3b65ad3`) para adaptar, não copiar:
  - `src/lib/coupon.ts` (alfabeto, gerado no cliente; aqui passa a ser gerado no servidor);
  - `src/lib/security/rate-limit.ts` (conta no banco por `ip_hash`);
  - `src/lib/demo/mascara.ts`, `src/lib/demo/queries.ts` (máscara na origem, CSV com BOM e `;`);
  - `src/app/(painel)/demo/actions.ts` (revelar com auditoria);
  - `src/lib/texts/privacy.ts` (versão do texto).
  
  `src/lib/admin/audit.ts` **não** volta: usamos `trilhaDeAuditoria`.
- **Next 16.3.5**: `proxy.ts` no lugar de middleware. Os tipos globais `PageProps<…>` e `RouteContext<…>` já estão em uso. Server Actions precisam conferir autenticação e autorização dentro de cada action e devolver só o necessário (`node_modules/next/dist/docs/01-app/02-guides/data-security.md`, seções "Authentication and authorization" e "Allowed origins"). Route Handlers não têm a checagem de Origin das actions. Uma página não muda o status HTTP depois de começar o streaming (`docs/.../04-functions/forbidden.md:185`).

## Abordagens consideradas

| Abordagem | Prós | Contras | Risco |
|---|---|---|---|
| A. Nome e WhatsApp como perguntas `pessoal`, extraídos de `valores` para `contatos`; consentimento em `consentimentos_contato`; módulos em `versoes_formulario.modulos`; configuração da loja em colunas de `formularios` (**escolhida**) | Segue a spec (tipo de pergunta); dado pessoal isolado da análise e da IA; índice único real para "1 cupom por telefone"; a revelação passa por um único serviço | Duas tabelas novas e um passo de separação no envio | Baixo |
| B. WhatsApp guardado em `respostas.valores` como qualquer pergunta | Menos tabelas | Dado pessoal entra nas respostas individuais e nas contas; jsonb sem índice único por telefone; mascarar exigiria filtros espalhados | Alto (LGPD) |
| C. Etapa de contato fora das perguntas (não é tipo de pergunta) | Isola bem | Contraria a spec; muda o fluxo "uma pergunta por vez" | Médio |

Alternativas descartadas por decisão (uma linha cada):
- Cupom gerado no navegador (como no Bussula): a regra "1 por telefone" só existe no servidor.
- Cupom na URL de `/resposta/concluida`: vazaria no histórico e no compartilhamento; vai para o `sessionStorage`.
- Contador de limite em memória ou Redis: não sobrevive a cold start na Vercel e seria dependência nova; contar no banco já é o padrão do Bussula.
- Reaproveitar a tabela legada `consentimentos`: ela aponta para `leads`; nome novo evita a pergunta de "rename" do drizzle-kit.
- Configuração da loja dentro de `modulos` (versionada): cada edição do gerente criaria uma versão; não muda o sentido das respostas.
- Exportação CSV por GET (`<a download>`): GET com efeito auditado pode ser disparado por prefetch ou link de outro site (cookie `SameSite=lax` vai na navegação GET); POST não leva o cookie entre sites.
- 503 na tela travada: a página já começa como 200 no streaming; 503 de verdade exigiria consultar banco no `proxy.ts`. Fica 200 com `noindex`.
- `experimental.useOffline` do Next: a fila própria já resolve; flag experimental sem ganho.
- `src/lib/admin/audit.ts` do Bussula: duplicaria `src/repositorios/auditoria.ts`.

## Decisão recomendada

Abordagem A. As decisões de design:

**D1. Dado pessoal.**
- `TIPOS_DE_PERGUNTA` ganha `whatsapp` e `nome`. `DescricaoDoTipo` ganha `pessoal: boolean` (true só nesses dois).
- O helper `semDadosPessoais(perguntas)` filtra essas perguntas em resultados, análise e respostas individuais.
- No servidor, `registrarResposta` valida tudo e depois separa: os valores pessoais saem de `valores` e viram um `ContatoParaGravar`.
- **Invariante testado**: nenhuma `respostas.valores` contém o id de uma pergunta pessoal.
- Só existe contato se houver WhatsApp válido. Nome sem WhatsApp é descartado (minimização).

**D2. Módulos (versionados, só pelo script).** `versoes_formulario.modulos` jsonb:

```ts
type ModulosDoFormulario = {
  recompra: boolean;                  // finalidade "recompra" na etapa de consentimento + "Chamar no WhatsApp" no painel
  ofertas: boolean;                   // finalidade "ofertas" (opcional, spec §2)
  cupom: { prefixo: string } | null;  // prefixo A-Z0-9, 2-6 caracteres, padrão "ESS"
  indicacao: boolean;
};
```

Valor ausente ou inválido no jsonb vale como tudo desligado (`lerModulos`), e as versões antigas continuam válidas.

**D3. Configuração da loja (editável pelo gerente, NÃO gera versão, auditada antes e depois).** Colunas em `formularios`:
- `texto_do_brinde text null` (1 a 120 caracteres; obrigatório para salvar quando o cupom está ligado, como na spec §7);
- `nome_obrigatorio boolean not null default false`;
- `whatsapp_obrigatorio boolean not null default true`;
- `formulario_de_indicacao_id uuid null references formularios(id) on delete set null` (nulo = o próprio formulário).

Por que não gera versão: perguntas e módulos definem o *sentido* da resposta e por isso são versionados. Obrigatoriedade e destino são operação. O texto do brinde prometido fica copiado em cada contato no momento da emissão (`contatos.cupom_brinde`), que é a prova do que foi oferecido; "quem já recebeu mantém o texto antigo" (spec §7). Cada alteração vira uma linha `auditoria` (`acao: "formulario_configurado"`, `metadados: { formularioId, antes, depois }`, sem dado pessoal).

A obrigatoriedade das perguntas `whatsapp`/`nome` vem dessas colunas. O `obrigatoria` da pergunta pessoal na definição é ignorado, e o script avisa. `buscarFormularioPublicoPorSlug` já entrega as perguntas com o `obrigatoria` efetivo, e a validação no servidor usa o mesmo.

**Travas da configuração da loja**, conferidas no serviço e não só na tela:
- `nome_obrigatorio = true` exige `whatsapp_obrigatorio = true`. Pedir nome obrigatório de quem pode não deixar contato coletaria um nome que seria descartado.
- `whatsapp_obrigatorio = false` com cupom ligado é **permitido** (decisão 6): quem pula fica sem cupom e sem link de indicação. A ajuda da pergunta avisa antes (spec §1). Padrão `true`. Com `true`, não aparece "Pular".
- Destino da indicação: só formulários `ATIVO` que têm pergunta `whatsapp`. A indicação só conta quando o indicado deixa contato, porque conta pessoas distintas pelo telefone. Se, na hora do envio, o destino não estiver mais `ATIVO`, o link aponta para o próprio formulário.
- Só pode editar enquanto o formulário estiver `ATIVO` ou `RASCUNHO`. Inativo e arquivado ficam em leitura (spec §7).

**D4. Travas de risco jurídico**, no código, para revisão do **seguranca** e do **advogado**:
- (a) Formulário com pergunta `whatsapp` precisa de pelo menos um módulo que use o número (recompra, ofertas, cupom ou indicação). O script recusa publicar sem isso, para não coletar telefone sem finalidade.
- (b) No envio: se nenhuma finalidade foi aceita e o formulário não tem cupom nem indicação, o contato **não é gravado** (sem finalidade, sem dado).
- (c) Formulário com pergunta pessoal não pode ter pergunta de saúde ou objetivo. O script recusa por lista de termos (saúde, objetivo, peso, emagrecer, doença, medicamento, gestante/grávida, lesão, diabetes, pressão, alergia, dieta…) e avisa quando houver `texto_livre`.
- (d) Base legal do cupom sem consentimento de mensagens (decisão 1): o número é usado para gerar e conferir o cupom. Isso é informado no resumo da etapa de consentimento e em `/privacidade`. **Advogado confirma a base legal.**

**D5. Consentimento.**
- Finalidades `recompra` e `ofertas`, nenhuma obrigatória (spec §2).
- Os textos ficam versionados num registro em código, `src/lib/texts/consentimento.ts`: `VERSAO_ATUAL` + `TEXTOS_POR_VERSAO: Record<versao, Partial<Record<Finalidade, string>>>`. Versões antigas nunca são apagadas: são a prova do que foi aceito, e uma página guardada offline pode enviar uma versão anterior.
- O formulário público recebe `{ versao, finalidades: [{ id, rotulo }] }` só das finalidades ligadas.
- O envio leva `consentimento: { versao, aceites: Record<id, boolean> }`. O servidor aceita só versão conhecida e só ids ligados, e grava uma linha por finalidade exibida, `true` ou `false` (finalidade ausente = `false`).
- Um teste guarda o hash de cada versão: mudar o texto sem criar versão nova quebra o teste.
- O consentimento só é considerado quando há WhatsApp. Sem contato, nada é gravado.

**D6. Cupom.**
- Gerado no servidor em `src/dominio/contatos/codigos.ts`, formato `PREFIXO-XXXX-XX` com o alfabeto `ABCDEFGHJKMNPQRSTUVWXYZ23456789` (sem 0, O, 1, I, L; spec §3).
- Validade de `VALIDADE_DO_CUPOM_DIAS = 30` (`src/dominio/constantes.ts`); grava `cupom_expira_em`, e a tela recebe `validoAte` como data `AAAA-MM-DD` no fuso da loja.
- **1 por telefone por formulário, para sempre** (premissa, ver perguntas). O serviço confere antes e o índice único parcial `(formulario_id, telefone) WHERE cupom IS NOT NULL` garante em caso de corrida: a violação vira 5xx, a fila tenta de novo e, na segunda vez, já sai sem cupom.
- Colisão de código: até 5 tentativas na mesma gravação. Se esgotar, grava sem cupom e devolve `status: "falhou"` (spec §3).
- **Nunca devolver o código** em `ja_emitido` nem quando a mesma chave é reenviada (decisões 2 e 5). Em `ja_emitido` também não vai a validade (minimiza o que se descobre sobre o número de outra pessoa).

**D7. Indicação.**
- Cada contato com indicação ligada recebe `codigo_indicacao` opaco (8 caracteres do mesmo alfabeto, único).
- Link: `/f/<destino>?o=link&ref=<codigo>`, montado no cliente com `location.origin`.
- O formulário público lê `o` e `ref` **no cliente** (`useSearchParams`, já existe `<Suspense>` em `page.tsx`), para a página guardada pelo service worker não trazer a origem ou o `ref` de outra visita.
- O servidor valida o formato. Código desconhecido é ignorado sem aviso. Auto-indicação (mesmo telefone) é ignorada.
- Grava `contatos.indicado_por` com o id do contato que indicou. O painel conta **telefones distintos** indicados por pessoa.
- Nunca se pede o telefone do amigo.

**D8. Limite de envios por IP.**
- `src/lib/security/limite-de-envios.ts`: lê `LIMITE_POR_MINUTO` (padrão 20) e `LIMITE_POR_HORA` (padrão 200); valor inválido cai no padrão.
- Conta `respostas` pelo `ip_hash` (novo, sal `IP_HASH_SALT` já existente) e devolve `{ total, maisAntigaEm }` por janela.
- Ordem no serviço:
  1. a chave já existe → devolve a original, sem contar limite;
  2. passou do limite → recusa `LIMITE_EXCEDIDO` com `tenteDeNovoEmSegundos`;
  3. grava.
- Rota: HTTP 429 + `Retry-After`. Como é menor que 500, nem a fila da página nem o service worker re-enfileiram (`sync.ts:43`, `sw.js`). A tela mostra a mensagem e mantém as respostas (spec §4).
- Sem sal (só em desenvolvimento) não há limite, como no Bussula.
- Anti-abuso do cupom = telefone (D6), não IP.

**D9. Trava do controlador.**
- `src/lib/marca.ts` ganha `CONTROLADOR = { razaoSocial, cnpj, endereco, emailPrivacidade }` com valores vazios.
- `contatoPrivacidade` (placeholder em `marca.ts:15`) passa a ler `CONTROLADOR.emailPrivacidade`.
- `src/dominio/privacidade/controlador.ts` define `situacaoDoControlador(c)`, que devolve `{ completo, pendentes: ("razaoSocial"|"cnpj"|"endereco"|"emailPrivacidade")[] }`. Conta como pendente: vazio, termo de placeholder ("preencher", "exemplo", "placeholder"), CNPJ com dígito verificador inválido, e-mail mal formado.
- A trava vale quando `process.env.NODE_ENV === "production" && !USAR_MOCKS` (falha fechada: vale também para quem hospedar fora da Vercel).
- `buscarFormularioPublicoPorSlug` devolve `deuErrado("FORMULARIO_TRAVADO")` para formulário com pergunta pessoal. Isso trava a página e o POST. O `log.error` não leva os valores, só os nomes dos campos.
- O painel recebe a lista de pendências e os formulários afetados (spec §5). A página responde 200 com `noindex` (ver alternativas).

**D10. Painel de contatos (`/admin/contatos`, aprovado).**
- `src/servicos/contatos.ts` é a única porta de leitura. A lista sai **mascarada do servidor** (`ocultarNome`, `ocultarTelefone` em `src/dominio/contatos/mascara.ts`; nomes diferentes de `mascararTelefone`, que é a máscara de digitação).
- "Aceita mensagens" é calculado **por telefone**: vale o consentimento do cadastro mais recente daquele número (um "não" posterior revoga), e aparece em todas as linhas do número.
- `revelarContato(id, sessao)`: grava a auditoria **antes** de devolver (se a auditoria falhar, nada é revelado). Devolve:
  - `nome`, `telefone` formatado;
  - `linkWhatsapp` (só se aceita mensagens), `https://wa.me/55…?text=` com `A.contatos.mensagemWhatsApp(primeiroNome)`;
  - `cupom` (`{ codigo, validoAte, expirado }` ou nulo);
  - `linkEnvioDoCupom` (ver D11).
- Exportação: Route Handler **POST** `src/app/(painel)/admin/contatos/exportar/route.ts`:
  - confere `sessaoAtual()` (senão 401) e `Origin`/`Sec-Fetch-Site` do mesmo site (senão 403);
  - aplica os filtros da tela e **sempre** "só quem aceita mensagens", um registro por telefone (o mais recente);
  - grava a auditoria `contatos_exportados` com `{ linhas, filtros }` antes de responder;
  - CSV com BOM, separador `;` e `\r\n`; célula que começa com `= + - @` ou tab ganha `'` na frente (contra fórmula no Excel);
  - colunas: Nome, WhatsApp, Formulário, Origem, Data, Aceita recompra, Aceita ofertas, Indicações;
  - `cache-control: no-store`.

**D11. Envio do cupom pelo WhatsApp (resposta à premissa 2), PARA REVISÃO JURÍDICA E DO SEGURANCA.**
- Proposta: o botão "Enviar cupom no WhatsApp" aparece **mesmo para quem não aceitou mensagens**, porque é a entrega de algo que o cliente pediu ao se cadastrar (mensagem transacional, não marketing).
- Limites de segurança:
  - só depois de revelar;
  - só se o contato tem cupom emitido e **ainda válido**;
  - texto **fixo** em `src/lib/texts/admin.ts` (`A.contatos.mensagemCupom(primeiroNome, codigo, brinde, validoAte)`), sem oferta nem novidade, e não editável pela loja no painel;
  - cada clique é coberto pela auditoria do "revelar" (a revelação já registra quem viu).
- O "Chamar no WhatsApp" de recompra continua só para quem aceitou mensagens.
- Se o advogado não aprovar, o botão é removido sem mexer em outra parte (o campo `linkEnvioDoCupom` passa a vir sempre nulo).

**D12. Tela de conclusão e offline (spec §3, "dado necessário" 3 e 4).**
- A resposta do envio leva `beneficios`.
- O formulário grava em `sessionStorage` (com `try/catch`) `{ chaveEnvio, slug, modulos, resultado | null }`. `null` quer dizer pendente. Depois navega para `/resposta/concluida` (o `?guardada=1` continua para o offline).
- `src/lib/offline/sync.ts` emite `window.dispatchEvent(new CustomEvent("fila:enviada", { detail: { chave, resultado } }))` a cada item resolvido.
- `public/sw.js` lê o JSON da resposta e manda `postMessage({ tipo: "fila:enviada", chave, resultado })` para os clientes abertos.
- A tela de conclusão escuta os dois e troca "Gerando seu cupom…" pelo cupom. Fechou a página, perdeu a tela (decisão 5). O gerente vê o cupom na lista e pode enviá-lo (D11).

**D13. Modo de teste fora da produção.**
- `src/lib/mock/config.ts` extrai a função pura `resolverUsarMocks(env)`: com `VERCEL_ENV === "production"` devolve `false` sempre (e registra erro se a variável pedir `true`).
- `scripts/vercel-build.sh` termina com erro se `VERCEL_ENV=production` e `USAR_MOCKS` estiver ligado.
- Os scripts que escrevem no banco forçam `USAR_MOCKS=false` antes de importar os serviços e conferem depois.

**D14. Tabelas legadas.**
- Removidas (`consentimentos`, `leads`, `vendedores`, `eventos`, `solicitacoes_contato`) na migração `0004`, gerada pelo drizzle-kit e editada à mão para começar com um bloco `DO $$ … IF EXISTS (SELECT 1 FROM leads) OR … THEN RAISE EXCEPTION … $$`. Se houver qualquer linha, o build da Vercel falha antes de apagar.
- A migração de criação (`0005`) é separada, para o drizzle-kit não perguntar "renomear ou criar?".

## Esquema e migrações

Migração `0004_remove_legado.sql`: guarda + `DROP TABLE` em ordem de FK (`consentimentos`, `leads`, `vendedores`, `eventos`, `solicitacoes_contato`).

Migração `0005_contatos.sql` (só aditiva; o código antigo continua funcionando com ela aplicada):

```sql
ALTER TABLE respostas ADD COLUMN ip_hash text;
CREATE INDEX respostas_ip_hash_criado_idx ON respostas (ip_hash, criado_em DESC);

ALTER TABLE versoes_formulario ADD COLUMN modulos jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE formularios
  ADD COLUMN texto_do_brinde text,
  ADD COLUMN nome_obrigatorio boolean NOT NULL DEFAULT false,
  ADD COLUMN whatsapp_obrigatorio boolean NOT NULL DEFAULT true,
  ADD COLUMN formulario_de_indicacao_id uuid REFERENCES formularios(id) ON DELETE SET NULL;

CREATE TABLE contatos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resposta_id uuid NOT NULL UNIQUE REFERENCES respostas(id) ON DELETE CASCADE,
  formulario_id uuid NOT NULL REFERENCES formularios(id) ON DELETE CASCADE,
  nome text,                         -- nulo quando o formulário não pede nome
  telefone text NOT NULL,            -- E.164
  cupom text UNIQUE,                 -- nulo = não emitido
  cupom_brinde text,                 -- cópia do texto do brinde na emissão
  cupom_expira_em timestamptz,
  codigo_indicacao text UNIQUE,      -- nulo = indicação desligada
  indicado_por uuid REFERENCES contatos(id) ON DELETE SET NULL,
  criado_em timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX contatos_cupom_por_telefone_uk ON contatos (formulario_id, telefone) WHERE cupom IS NOT NULL;
CREATE INDEX contatos_telefone_criado_idx ON contatos (telefone, criado_em DESC);
CREATE INDEX contatos_indicado_por_idx ON contatos (indicado_por);
CREATE INDEX contatos_criado_idx ON contatos (criado_em DESC);

CREATE TABLE consentimentos_contato (
  contato_id uuid NOT NULL REFERENCES contatos(id) ON DELETE CASCADE,
  finalidade text NOT NULL,          -- 'recompra' | 'ofertas' (enum no Drizzle)
  concedido boolean NOT NULL,
  texto_versao text NOT NULL,
  registrado_em timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (contato_id, finalidade)
);
```

Fluxo: alterar `src/lib/db/schema.ts` → `pnpm db:generate` → revisar o SQL → aplicar numa branch de desenvolvimento do Neon. Em produção, `drizzle-kit migrate` roda no `vercel-build`. Anonimização (`anonimizado_em`) fica para o item 2 do backlog.

## Contratos

Domínio (novos ou alterados):

```ts
// src/dominio/formularios/perguntas.ts
TIPOS_DE_PERGUNTA += "whatsapp" | "nome";      // DescricaoDoTipo += { pessoal: boolean }
export function semDadosPessoais(p: Pergunta[]): Pergunta[];
export function pedeDadosPessoais(p: Pergunta[]): boolean;

// src/dominio/formularios/modulos.ts (novo): ModulosDoFormulario (D2), MODULOS_DESLIGADOS, lerModulos(json)
export function usaNumero(m: ModulosDoFormulario): boolean; // recompra || ofertas || cupom || indicacao

// src/dominio/formularios/tipos.ts
export type ConfiguracaoDaLoja = {
  textoDoBrinde: string | null; nomeObrigatorio: boolean; whatsappObrigatorio: boolean;
  formularioDeIndicacaoId: string | null;
};
Formulario += { configuracaoDaLoja: ConfiguracaoDaLoja };
FormularioComPerguntas += { modulos: ModulosDoFormulario };
DadosDoFormulario += { modulos?: ModulosDoFormulario };          // opcional: chamadas atuais não quebram
FormularioNaLista += { modulos; pedeDadosPessoais: boolean; travado: boolean };
FormularioPublico += {
  modulos: { recompra: boolean; ofertas: boolean; cupom: boolean; indicacao: boolean };
  consentimento: { versao: string; finalidades: { id: Finalidade; rotulo: string }[] } | null;
  controlador: { razaoSocial: string; cnpj: string; emailPrivacidade: string } | null; // resumo da etapa (spec §2)
  // perguntas já com `obrigatoria` efetiva para whatsapp/nome
};

// src/dominio/formularios/repositorio.ts
+ modulosDaVersao(formularioId, versao): Promise<ModulosDoFormulario | null>;
+ salvarConfiguracaoDaLoja(id, c: ConfiguracaoDaLoja): Promise<Formulario | null>;
  criar/salvarNovaVersao passam a gravar `modulos`.

// src/dominio/contatos/tipos.ts (novo)
export const FINALIDADES = ["recompra", "ofertas"] as const;
export type ContatoParaGravar = {
  nome: string | null; telefone: string; versaoDoConsentimento: string | null;
  consentimentos: { finalidade: Finalidade; concedido: boolean }[];
  cupom: { codigo: string; brinde: string | null; expiraEm: Date } | null;
  codigoIndicacao: string | null; indicadoPor: string | null;
};
export type ContatoGravado = { id: string; cupom: string | null; cupomExpiraEm: Date | null; codigoIndicacao: string | null };
export type FiltrosDeContatos = { formularioId?: string; origem?: OrigemDaResposta; somenteQueAceitam?: boolean;
  ordem: "recentes" | "indicacoes"; pagina: number };
export type LinhaDeContato = { id; nomeOculto: string | null; telefoneOculto: string; formularioNome: string;
  origem: OrigemDaResposta; criadoEm: Date; aceitaMensagens: boolean;
  cupom: { emitido: boolean; validoAte: string | null; expirado: boolean }; indicacoes: number };
export type ContatoRevelado = { nome: string | null; telefone: string; linkWhatsapp: string | null;
  cupom: { codigo: string; validoAte: string; expirado: boolean } | null; linkEnvioDoCupom: string | null };

// src/dominio/contatos/repositorio.ts (novo)
listar(f, porPagina): Promise<{ itens: LinhaCrua[]; total: number; paginas: number }>;   // cru; mascara no serviço
resumo(): Promise<{ contatos; aceitamMensagens; cuponsEmitidos; indicacoes }>;
buscarCompleto(id): Promise<ContatoCompleto | null>;
paraExportacao(f): Promise<LinhaCsv[]>;
porCodigoDeIndicacao(codigo): Promise<{ id: string; telefone: string } | null>;
jaRecebeuCupom(formularioId, telefone): Promise<boolean>;

// src/dominio/respostas/repositorio.ts
gravar(r: RespostaParaGravar & { ipHash: string | null; contato: ContatoParaGravar | null })
  : Promise<{ resposta; duplicada: boolean; contato: ContatoGravado | null }>;   // uma transação
+ buscarPorChave(chaveEnvio): Promise<{ resposta; contato: ContatoGravado | null } | null>;
+ contarPorIp(ipHash, desde): Promise<{ total: number; maisAntigaEm: Date | null }>;

// src/dominio/respostas/envio.ts (contrato com o navegador)
export type BeneficiosDoEnvio = {
  cupom:
    | { status: "emitido"; codigo: string; textoDoBrinde: string | null; validoAte: string }
    | { status: "ja_emitido" }          // sem código e sem validade, sempre
    | { status: "falhou" }
    | null;                             // módulo desligado ou sem WhatsApp
  indicacao: { codigo: string; slugDestino: string } | null;
};
export type ResultadoDoEnvio =
  | { ok: true; jaEstavaRegistrada: boolean; beneficios: BeneficiosDoEnvio | null }
  | { ok: false; erro: string; mensagem: string; porPergunta?: Record<string, string>; tenteDeNovoEmSegundos?: number };
// Chave reenviada (jaEstavaRegistrada): cupom emitido antes → { status: "ja_emitido" }; indicação repete o código.

// src/dominio/erros.ts: += "LIMITE_EXCEDIDO", "FORMULARIO_TRAVADO" (mensagens da spec §4/§5 vêm de src/lib/texts/publico.ts)
// src/dominio/constantes.ts: += VALIDADE_DO_CUPOM_DIAS = 30, CONTATOS_POR_PAGINA = 25, MAIOR_TEXTO_DO_BRINDE = 120
```

Serviços:
- `registrarResposta(envio, { ipHash, agora? })`, em `src/servicos/respostas.ts`. `EnvioDeResposta` ganha `ref?: string | null` e `consentimento?: { versao: string; aceites: Record<string, boolean> }`. Os campos novos são opcionais, então os itens já guardados na fila continuam válidos.
- `buscarFormularioPublicoPorSlug` (com trava), `listarFormularios` (com `travado`), `salvarConfiguracaoDaLoja(id, dados, sessao)` e `situacaoDaPrivacidade()`, em `src/servicos/formularios.ts`.
- `listarContatos`, `resumoDosContatos`, `revelarContato(id, sessao)` e `exportarContatosCsv(filtros, sessao)`, em `src/servicos/contatos.ts` (novo).
- `sincronizarDefinicoes(definicoes, { aplicar })`, em `src/servicos/publicacao-de-formularios.ts` (novo).

Rotas e actions:
- `POST /api/f/[slug]/respostas`. Corpo: `{ chaveEnvio, valores, origem, ref?, consentimento? }`. O IP vem só do cabeçalho (`hashIp(extrairIp(request.headers))`). Respostas: 200, 429 + `Retry-After` ou 5xx.
- `src/app/(painel)/admin/contatos/actions.ts`: `revelarContatoAction(id)`. Faz `sessaoAtual()` dentro da action, valida o formato UUID e devolve `ContatoRevelado | null`.
- `src/app/(painel)/admin/contatos/exportar/route.ts`: `POST` (D10).
- `src/app/(painel)/admin/formularios/actions.ts` (já existe): `salvarConfiguracaoDaLojaAction(id, form)`, com sessão conferida dentro da action.

Variáveis de ambiente: `LIMITE_POR_MINUTO` e `LIMITE_POR_HORA` (opcionais).

Arquivo de definição dos formulários: `config/formularios/<cliente>.json`. Validado com `zod` (já é dependência, em `src/integracoes/analise/analista-com-modelo.ts`) e depois com as regras existentes:

```json
{ "formularios": [ { "slug": "cadastro-balcao", "nome": "…", "descricao": null, "publicar": true,
  "modulos": { "recompra": true, "ofertas": false, "cupom": { "prefixo": "ESS" }, "indicacao": true },
  "perguntas": [ { "id": "whats", "tipo": "whatsapp", "enunciado": "Qual é o seu WhatsApp?" }, … ] } ] }
```

## Plano de implementação

Legenda de esforço: P (até meio dia), M (1 a 2 dias), G (3 dias ou mais). "Arquivos" = os únicos que o passo pode tocar.

0. **Verificação de operação** — arquivos: nenhum.
   - Mudança: rodar `pnpm db:whoami:prod` (somente leitura) para ver se o banco de produção existe e se as tabelas legadas estão vazias; conferir que `USAR_MOCKS` não está nas variáveis da Vercel.
   - Verificação: saída registrada no PR.
   - Responsável: lead/dono. Paralelizável: sim. Esforço: P.

1. **Trava do modo de teste + limpeza de "fiat"**
   - Arquivos: `src/lib/mock/config.ts`, `src/lib/mock/config.test.ts` (novo), `scripts/vercel-build.sh`, `package.json` (só `name` → `"bussola"`), `docs/admin-acesso.md` (linhas 14 e 29 → "Essencial Fit").
   - Mudança: D13.
   - Testes: `resolverUsarMocks` com produção + `true` devolve `false`; desenvolvimento sem variável devolve `true`; `VERCEL` sem `VERCEL_ENV=production` mantém o comportamento de hoje.
   - Verificação: `pnpm test`; `VERCEL_ENV=production USAR_MOCKS=true sh scripts/vercel-build.sh` termina com erro antes do build (rodar em cópia local).
   - Responsável: dev. Paralelizável: sim (com 2 a 5). Esforço: P.

2. **Remover o legado**
   - Arquivos: `src/lib/db/schema.ts`, `src/lib/domain.ts` (apagar), `scripts/db-whoami.ts` (passa a contar formulários e respostas), `drizzle/0004_*.sql`, `drizzle/meta/*`.
   - Mudança: D14.
   - Testes: `pnpm typecheck`; aplicar numa branch do Neon com uma linha em `leads` (deve falhar) e vazia (deve passar); `pnpm db:generate` sem diferença depois.
   - Responsável: dev. Paralelizável: não (antes do 3, mesmo arquivo). Esforço: P.

3. **Esquema + contratos de domínio + tipos de pergunta**
   - Arquivos: `src/lib/db/schema.ts`, `drizzle/0005_*.sql`, `drizzle/meta/*`, `src/dominio/formularios/{perguntas,tipos,repositorio}.ts`, `src/dominio/formularios/modulos.ts` (novo), `src/dominio/contatos/{tipos,repositorio}.ts` (novos), `src/dominio/respostas/{tipos,repositorio,envio}.ts`, `src/dominio/erros.ts`, `src/dominio/constantes.ts`, `src/lib/validation/phone.ts` (correção ao colar `55`/`+55` + `motivoTelefoneInvalido` → `vazio|incompleto|ddd|naoCelular|repetido`), `src/validacoes/resposta.ts` (casos `whatsapp`/`nome`), `src/validacoes/formulario.ts` (`validarModulos`, `validarConfiguracaoDaLoja` com as travas da D3), `src/components/formularios/pergunta-publica.tsx` (renderização dos tipos novos **[UI: spec §1]**), filtros `semDadosPessoais` onde a análise ou as distribuições percorrem perguntas (o typecheck aponta os lugares; `src/dominio/analise/*`, `src/components/resultados/distribuicao.tsx`).
   - Mudança: contratos da seção "Contratos". As mensagens de erro do telefone ficam em `FORMULARIO_PUBLICO.whatsapp.erros` (`src/lib/texts/publico.ts`, **só essas chaves** neste passo).
   - Testes: `phone` (colar `+55 35 99999-8888`, os cinco motivos); `validarResposta` para `whatsapp`; travas de `validarConfiguracaoDaLoja`; `lerModulos` com jsonb vazio ou lixo.
   - Responsável: dev. Paralelizável: não (base de tudo). Esforço: M.

4. **Repositórios e dados fictícios**
   - Arquivos: `src/repositorios/{formularios-no-banco,respostas-no-banco,index}.ts`, `src/repositorios/contatos-no-banco.ts` (novo), `src/repositorios/em-memoria/{formularios,respostas,loja,dados-iniciais}.ts`, `src/repositorios/em-memoria/contatos.ts` (novo), `src/servicos/servicos.test.ts` (ajustar as constantes), `scripts/db-whoami.ts` (somar contatos).
   - Mudança:
     - `gravar` numa transação (resposta, contato, consentimentos);
     - `buscarPorChave`, `contarPorIp`, `salvarConfiguracaoDaLoja`;
     - consultas de contatos com "aceita mensagens" por telefone (`DISTINCT ON (telefone) … ORDER BY telefone, criado_em DESC`) e indicações por telefones distintos;
     - quarto formulário fictício "Cadastro no balcão" com módulos ligados e contatos claramente fictícios, gerado **depois** do sorteio atual e com semente própria, para não mexer nas 123 respostas existentes.
   - Testes (em memória): gravação atômica; chave repetida devolve o mesmo contato; segundo cupom do mesmo telefone no mesmo formulário bloqueado; outro formulário libera; `contarPorIp`; revogação por cadastro mais recente.
   - A implementação no Postgres **não tem teste automatizado** (o projeto não tem infraestrutura de banco nos testes). O QA valida numa branch do Neon.
   - Responsável: dev. Paralelizável: não (depois do 3). Esforço: M.

5. **Funções puras**
   - Arquivos (todos novos, menos `marca.ts`): `src/dominio/contatos/codigos.ts`, `src/dominio/contatos/mascara.ts`, `src/dominio/privacidade/controlador.ts`, `src/lib/marca.ts` (`CONTROLADOR`), `src/lib/texts/consentimento.ts`, `src/lib/security/limite-de-envios.ts` + os `*.test.ts` de cada um.
   - Mudança: D5, D6, D8, D9 (parte pura) e a montagem dos links `wa.me` (`montarLinkWhatsapp(e164, texto)`).
   - Testes: alfabeto e formato do cupom; máscaras (incluindo telefone fora do padrão → "••••"); controlador (vazio, placeholder, CNPJ inválido, completo); hash de cada versão do consentimento; leitura das variáveis de limite e cálculo do `tenteDeNovoEmSegundos`.
   - Responsável: dev. Paralelizável: **sim**, com 2 a 4 (arquivos separados; o 3 só importa tipos que este passo exporta, então combinar os nomes antes ou rodar o 5 primeiro). Esforço: P.

6. **Serviço de envio, rota e serviços de formulário**
   - Arquivos: `src/servicos/respostas.ts`, `src/servicos/formularios.ts`, `src/servicos/resultados.ts`, `src/app/api/f/[slug]/respostas/route.ts`, `src/lib/logger.ts` (acrescentar `whatsapp` às chaves apagadas), `src/servicos/cadastro.test.ts` (novo).
   - Mudança:
     - fluxo: formulário (com trava) → validar → separar o dado pessoal → chave já existe? → limite → resolver `ref` → decidir cupom e indicação → D4(b) → gravar → montar `beneficios`;
     - `FormularioPublico` com módulos, consentimento e controlador;
     - `listarFormularios` com `travado`;
     - `salvarConfiguracaoDaLoja` (valida, audita antes e depois);
     - `comPerguntas` e os resultados sem perguntas pessoais.
   - Testes: cupom emitido com validade de 30 dias; `ja_emitido` sem código; chave reenviada sem código; WhatsApp pulado sem cupom; `ref` válido, inválido e próprio; destino inativo cai no próprio formulário; limite excedido com chave nova recusa e com chave existente devolve; trava em "produção"; **`valores` nunca contém id pessoal**; resultados sem pergunta pessoal; consentimento com versão desconhecida recusado; D4(b) não grava contato.
   - Responsável: dev. Paralelizável: sim, com 7, 8 e 10. Esforço: M.

7. **Script de publicação dos formulários**
   - Arquivos: `scripts/publicar-formularios.ts`, `src/servicos/publicacao-de-formularios.ts`, `src/validacoes/definicao-de-formulario.ts`, `config/formularios/exemplo.json` (fictício, marcado como exemplo), `package.json` (scripts `formularios:publicar` e `formularios:publicar:prod` = `sh scripts/prod.sh scripts/publicar-formularios.ts`).
   - Mudança:
     - simulação por padrão; `--aplicar` grava;
     - anuncia o banco de destino (`anunciarAlvo`);
     - força `USAR_MOCKS=false` antes de importar os serviços e confere;
     - slug **explícito** no arquivo (vai gravado no chip NFC);
     - idempotente: igual → nada; diferente → versão nova; `publicar` → ATIVO; arquivado → recusa;
     - nunca arquiva o que não está no arquivo;
     - não mexe na configuração da loja;
     - aplica D4(a) e D4(c).
   - Testes (em memória): criar; rodar duas vezes sem versão nova; mudar uma pergunta gera versão nova; termo de saúde recusado; WhatsApp sem módulo recusado; JSON inválido não grava nada.
   - Responsável: dev. Paralelizável: sim (o `package.json` só depois do 1). Esforço: P.

8. **Aba Contatos no painel** **[UI: spec §6]**
   - Arquivos: `src/servicos/contatos.ts`, `src/servicos/contatos.test.ts`, `src/app/(painel)/admin/contatos/{page,loading,error}.tsx`, `src/app/(painel)/admin/contatos/actions.ts`, `src/app/(painel)/admin/contatos/exportar/route.ts`, `src/components/contatos/*`, `src/components/navegacao/{areas,topo-admin}.ts(x)`, `src/components/navegacao/painel.test.ts` (**só** para aceitar 4 áreas: Visão Geral, Formulários, Contatos, Resultados & IA; o rótulo "Resultados & IA" fica como está), `src/lib/texts/admin.ts` (`A.nav.contatos`, `A.contatos.*`, `mensagemWhatsApp`, `mensagemCupom`).
   - Mudança: D10, D11, com filtros pela URL (`?formulario=&origem=&mostrar=&ordem=&pagina=`) e exportação como `<form method="post">` com os filtros em campos ocultos. A spec deve trocar o `<a download>` por botão dentro de form, sem mudança visual.
   - Testes: a lista não contém nenhum telefone completo (expressão regular no resultado do serviço); revelar sem sessão devolve nulo e não audita; revelar com sessão audita antes; `linkWhatsapp` só para quem aceita; `linkEnvioDoCupom` só com cupom válido; CSV só com quem aceita, um por telefone, com BOM e `;`, célula `=CMD()` neutralizada, auditoria registrada; `painel.test.ts` com 4 áreas.
   - Responsável: dev + designer (revisão da UI). Paralelizável: sim, com 6, 7 e 10. Esforço: M.

9. **Formulários e Visão Geral: módulos em leitura, configuração da loja, travado** **[UI: spec §5 e §7; a spec precisa acrescentar os campos de D3]**
   - Arquivos: `src/app/(painel)/admin/formularios/{page,actions}.tsx/ts`, `src/components/formularios/configuracao-do-formulario.tsx` (novo), `src/app/(painel)/admin/page.tsx`, `src/lib/texts/admin.ts`.
   - Mudança:
     - seção "Módulos deste formulário" (só leitura);
     - campos editáveis: texto do brinde (120 caracteres), nome obrigatório, WhatsApp obrigatório (com o aviso "sem WhatsApp, sem cupom" quando o cupom está ligado), formulário de destino da indicação (`<select>` só com ATIVO que têm WhatsApp);
     - avisos de travado.
   - Testes: action sem sessão recusa; as travas da D3 são devolvidas pelo servidor; auditoria antes e depois; nenhum texto novo cai no regex de `painel.test.ts` ("editar formulário" e semelhantes).
   - Responsável: dev + designer. Paralelizável: não (depois do 6 e do 8, mesmo `admin.ts`). Esforço: M.

10. **Formulário público, conclusão e offline** **[UI: spec §1–§4]**
    - Arquivos: `src/components/formularios/formulario-publico.tsx`, `src/components/formularios/etapa-consentimento.tsx` (novo), `src/app/f/[slug]/page.tsx` (tela travada; não lê mais `o` no servidor), `src/app/resposta/concluida/page.tsx` + `src/components/conclusao/*` (novos), `src/lib/offline/sync.ts`, `public/sw.js`, `src/components/sw-register.tsx`, `src/lib/texts/publico.ts`.
    - Mudança:
      - etapa final de consentimento só quando há pergunta `whatsapp`;
      - `o` e `ref` lidos no cliente;
      - 429 mantém a tela com a mensagem, sem fila;
      - `sessionStorage` + evento `fila:enviada` (D12);
      - `sw.js`: `postMessage` do resultado, cache das navegações de `/privacidade` e `/resposta/concluida`, `VERSAO = "v2"`, comentário da linha 6 sem "fiat"; **não** mudar `DB_NOME`/`STORE` (deixaria filas órfãs);
      - `sw-register`: aquecer `/resposta/concluida` e `/privacidade` (hoje aquece `/f/<slug>/sucesso`, que não existe).
    - Testes: `postarResposta` com 429 devolve o resultado em vez de lançar (fetch simulado); `sync` emite o evento com chave e resultado.
    - QA manual: online, offline com a página aberta, offline com a página fechada, 429, "já emitido", formulário travado, `ref` em página guardada.
    - Responsável: dev + designer. Paralelizável: sim (começa depois do 3 com os contratos; integra depois do 6). Esforço: G.

11. **Privacidade e textos legais** **[UI: spec §8; texto: advogado]**
    - Arquivos: `src/app/privacidade/page.tsx`, `src/lib/texts/publico.ts` (`PRIVACIDADE`), `src/lib/texts/consentimento.ts` (se o texto mudar = versão nova).
    - Mudança:
      - tira "não guardamos o número" (`publico.ts:69`);
      - acrescenta controlador, o que é guardado, finalidades, cupom (base legal), indicação e direitos;
      - em desenvolvimento, "[preencher: CNPJ]".
    - Testes: o teste de hash de versão continua passando; a página não quebra com os campos vazios.
    - Responsável: dev (o texto revisado pelo produto e pelo advogado). Paralelizável: não (depois do 10, mesmo `publico.ts`). Esforço: P.

12. **Documentação**
    - Arquivos: `README.md` (linha 27: "cinco formulários"; endereço `/admin/contatos`; scripts novos), `MOCKS.md` (formulário fictício de cadastro, trava em produção), `.env.example` (`LIMITE_POR_MINUTO`, `LIMITE_POR_HORA` com o aviso do Wi-Fi compartilhado).
    - Verificação: `grep -ri "fiat\|concession"` sem resultado fora de `.git` e `negocio/` (que não é versionado).
    - Responsável: dev. Paralelizável: não (no fim). Esforço: P.

13. **QA, revisão e segurança** — `qa` (casos acima + branch do Neon para as consultas reais), `revisor`, `seguranca` (lista abaixo), `designer` (UI). Paralelizável: sim, entre si. Esforço: M.

14. **Operação para entrar no ar** (sem código, depois da aprovação do dono para push e deploy)
    - preencher `CONTROLADOR` com os dados reais;
    - deploy (migrações 0004/0005 no build);
    - `pnpm formularios:publicar:prod config/formularios/essencial-fit.json`, primeiro sem `--aplicar`, depois com;
    - o gerente cadastra o brinde e as opções no painel;
    - gravar `/f/<slug>?o=nfc` nos chips e `/f/<slug>?o=qr` nos QR;
    - conferir a origem no painel.
    
    Esforço: P.

Mapa de paralelismo (ninguém edita o mesmo arquivo ao mesmo tempo):
- Fase A: [1] ‖ [5] ‖ [2 → 3 → 4].
- Fase B: [6] ‖ [7] ‖ [8] ‖ [10, que integra depois do 6].
- Fase C: [9] (depois de 6 e 8) ‖ [11] (depois do 10).
- Depois: [12] → [13] → [14].
- Arquivos que exigem ordem:
  - `schema.ts`: 2 → 3;
  - `package.json`: 1 → 7;
  - `texts/admin.ts`: 8 → 9;
  - `texts/publico.ts`: 3 (só os erros do WhatsApp) → 10 → 11;
  - `db-whoami.ts`: 2 → 4.

## Pontos que exigem revisão do seguranca

1. Limite por IP: confiar no primeiro valor de `x-forwarded-for` na Vercel (`src/lib/security/ip-hash.ts:6`); avaliar `x-vercel-forwarded-for`.
2. Separação do dado pessoal: o invariante "nunca em `valores`" e os logs (`logger.ts` + `whatsapp`).
3. Máscara feita no servidor; nenhum `href` `wa.me` no HTML antes de revelar.
4. `revelarContatoAction` e a exportação: sessão conferida dentro da action ou rota, UUID validado, auditoria antes de devolver (falha fechada).
5. Exportação POST: checagem de origem; injeção de fórmula no CSV; `no-store`.
6. D11 (envio do cupom a quem não aceitou mensagens) e D4(d) (base legal do cupom): **também com o advogado**.
7. Descobrir se um número já se cadastrou pela mensagem "já recebeu um cupom" (aceito pelo dono; o limite por IP atenua).
8. Trava do controlador e trava do modo de teste (D9, D13).
9. Dado pessoal no IndexedDB do próprio aparelho (fila, até 24 h) e cupom no `sessionStorage`.
10. Migração 0004 destrutiva com guarda.
11. Script de produção: alvo anunciado, simulação por padrão, mocks forçados desligados.

## Riscos e mitigação

- **Migração destrutiva (0004)**: a guarda aborta com qualquer linha; o passo 0 confere antes. Para reverter, `git revert` não recria dados. Se faltar algo, restaurar pelo histórico do Neon (branch a partir de um ponto no tempo).
- **0005 é só aditiva**: reverter o código mantém o esquema compatível; as tabelas novas ficam sem uso.
- **Consultas reais do Postgres sem teste automatizado**: o QA valida numa branch do Neon com dados fictícios antes do deploy.
- **Resultado do cupom offline perdido** se a página fechar: aceito (decisão 5); o gerente vê o cupom e o envia (D11).
- **Limite generoso demais ou de menos**: ajustável por variável, sem deploy de código. O padrão 20/min e 200/h cobre o pico de uma loja com 1 vendedor.
- **Página antiga guardada pelo service worker com texto de consentimento antigo**: o registro de versões aceita e grava a versão realmente exibida.
- **Formulário de produção travado por dados do controlador incompletos**: intencional; o painel avisa o gerente.
- **Testes de caracterização** (`servicos.test.ts`) mudam por causa do quarto formulário fictício: a mudança fica explícita no passo 4 e é revisada.
- **Reverter a funcionalidade**: desligar os módulos no arquivo de configuração e rodar o script (versão nova sem pergunta pessoal). Os formulários voltam a ser anônimos sem deploy.

## Critérios de pronto

- Todos os critérios de aceite do brief, menos a troca de nome de "Resultados & IA" (fora do escopo).
- As 10 decisões do dono e as respostas às premissas implementadas como descrito em D1 a D14.
- `pnpm test`, `pnpm typecheck` e `pnpm lint` passando; testes novos listados por passo.
- QA aprovado (incluindo a branch do Neon); revisor sem MUDANÇAS NECESSÁRIAS; seguranca sem BLOQUEANTE; designer aprovando as telas.
- Nenhum `fiat` ou `concessionária` fora do histórico.
- Pendências do brief para entrar no ar continuam fora do código (controlador real, advogado, Vercel, conteúdo dos 5 formulários).

## Perguntas em aberto e premissas adotadas

1. **Cupom vencido**: o mesmo telefone ganha outro cupom no mesmo formulário depois dos 30 dias? Premissa: não (um por telefone por formulário, para sempre).
2. **D11**: o envio do cupom pelo WhatsApp a quem não aceitou mensagens depende do advogado. Premissa: liberado, com os limites da D11, até o parecer.
3. **Indicação conta só quem deixa WhatsApp** no formulário de destino (pessoas distintas pelo telefone). Premissa: sim.
4. **Conteúdo dos 5 formulários**: pendente do cliente; nada é inventado.
5. Pontos para o designer ajustar na spec:
   - §7: campos de D3;
   - §6: situação do cupom e "Enviar cupom" na linha;
   - §1: "Pular" depende de `whatsapp_obrigatorio`;
   - §3: `ja_emitido` sem validade;
   - §6: exportação em form POST;
   - §5: 200 em vez de 503;
   - pergunta `nome` e contato "Sem nome".

## ADR-0001: dado pessoal fora das respostas, módulos versionados e configuração da loja sem versão

- **Contexto**: o primeiro cliente pagante precisa de cadastro com WhatsApp, consentimento, cupom e indicação. A base atual guarda respostas anônimas em `respostas.valores` (jsonb), que alimenta a análise, inclusive por modelo de IA, e as respostas individuais. A LGPD exige minimizar, mascarar e auditar o acesso, e provar o texto aceito.
- **Decisão**:
  - nome e WhatsApp são tipos de pergunta `pessoal`, mas o servidor os grava só em `contatos`, com os consentimentos por finalidade e a versão do texto em `consentimentos_contato`;
  - módulos ficam versionados em `versoes_formulario.modulos`, definidos só pelo script;
  - a configuração operacional da loja (brinde, obrigatoriedade, destino da indicação) fica em colunas de `formularios`, sem versão e auditada;
  - o limite por IP conta respostas no banco;
  - as tabelas legadas do Fiat são removidas com guarda.
- **Consequências**:
  - (+) Análise e IA nunca veem dado pessoal; índice único real para o cupom; a revelação e a exportação passam por um só serviço auditado; nenhuma dependência nova.
  - (−) Duas tabelas e um passo de separação no envio; as consultas de contatos precisam de validação manual no Postgres; a regra "aceita mensagens por telefone" fica numa consulta mais elaborada.
  - (reversível) Desligar os módulos no arquivo de configuração volta ao modo anônimo; a 0005 é aditiva.
