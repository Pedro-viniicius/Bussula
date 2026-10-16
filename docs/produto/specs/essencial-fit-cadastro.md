# Especificação de UI/UX: Essencial Fit, cadastro com recompra, cupom e indicação

- Brief: `docs/produto/briefs/essencial-fit-cadastro.md` (aprovado em 2026-10-15)
- Plano técnico (arquiteto): `docs/produto/planos/essencial-fit-cadastro.md` (aprovado em 2026-10-15)
- Status desta spec: aprovada pelo dono e alinhada ao plano aprovado (decisões D1 a D14).
- Tokens: somente os do app da loja (`acento`, `acento-forte`, `acento-suave`, `tinta`, `tinta-suave`, `superficie`, `linha`, `linha-forte`, `sucesso*`, `atencao*`, `perigo*`, `muted*`). Os tokens `brand/ink/canvas/hairline` são da landing `/lp` e não entram aqui.
- Componentes reaproveitados: `Button`, `Input`, `Label`, `Container`, `Cartao`, `Etiqueta`, `Aviso`, `Atencao`, `EstadoVazio`, `Metrica`, `Situacao`, `Quando`, `LinkPublico`, `TopoAdmin`, `Marca`.
- Regra de texto: todo texto novo entra em `src/lib/texts/publico.ts` (cliente final) ou `src/lib/texts/admin.ts` (painel). Os textos abaixo são a proposta de microcopy e as chaves sugeridas.

## Objetivo e usuário

- **Cliente da loja:** de pé, uma mão, celular encostado no cartão. Quer responder em segundos, entender o que acontece com o número dele e sair com o brinde. Pode estar sem sinal bom dentro da loja.
- **Gerente:** abre o painel no celular (no balcão) ou no computador. Quer ver quem aceitou ser chamado, abrir o WhatsApp com um toque e saber qual cartão funciona.

Princípios: manter a linguagem visual atual (fundo branco, verde `acento` só para ação e escolha, linhas discretas); uma pergunta por vez; nunca depender só de cor; o consentimento é uma escolha clara, nunca um obstáculo escondido.

---

## 1. Pergunta de WhatsApp (formulário público)

Novo tipo de pergunta `whatsapp`, renderizado dentro de `PerguntaPublica` como os outros tipos. O enunciado e a ajuda vêm da definição do formulário (dado), com estes padrões:

- Enunciado padrão: "Qual é o seu WhatsApp?"
- Ajuda padrão: "Com DDD. Na última etapa você escolhe como podemos usar o número."
- Com o módulo cupom ligado, a ajuda ganha uma segunda linha: "O cupom é enviado para este número: sem WhatsApp, não dá para gerar o cupom." Isso avisa antes, e não só depois.
- Com o cupom ligado e "WhatsApp obrigatório" desligado, a ajuda acrescenta: "Se pular, você não recebe o cupom nem o link de indicação."

### Layout

- Mobile e desktop iguais (coluna única, `max-w` do formulário atual).
- Campo `Input` altura 56 px (`h-14`), texto 20 px (`text-xl`) com `tabular-nums`, para a pessoa conferir os dígitos de longe.
- Atributos: `type="tel"`, `inputMode="tel"`, `autoComplete="tel-national"`, `maxLength={20}` (um número colado com "+55 35 99999-8888" tem 17 caracteres; a máscara tira o 55 depois), `placeholder="(35) 99999-8888"` (o placeholder é exemplo, não substitui o rótulo), `autoFocus` como no `texto_curto`.
- Rótulo: o próprio enunciado, ligado ao campo por `aria-label` (padrão atual) ou `<label>` visível; erro ligado por `aria-describedby` (`erro-<id>`), `aria-invalid`.
- Máscara ao digitar com `mascararTelefone` (`src/lib/validation/phone.ts`): só formata, nunca bloqueia a digitação.
- Colar número com `+55` ou `55` na frente deve funcionar. Hoje `mascararTelefone` corta em 11 dígitos antes de tirar o 55, então colar `+55 35 99999-8888` sairia errado. Esse ajuste na máscara é da camada de lógica (ver "O que o dev precisa implementar").

### Estados

| Estado | Comportamento |
|---|---|
| Vazio | Campo vazio com placeholder. Botão "Continuar" ativo (a validação roda ao tocar nele). |
| Digitando | Máscara aplicada. Nenhum erro enquanto digita. |
| Erro | Validação ao tocar em "Continuar". Borda `perigo`, mensagem abaixo com `role="alert"`, foco volta ao campo. Depois do primeiro erro, a validação roda a cada tecla e o erro some assim que o número fica válido. |
| Válido | Borda padrão. Nada extra (sem ícone verde, para não parecer promessa). |
| Opcional vazio | Depende da configuração da loja "WhatsApp obrigatório" (seção 7, padrão: ligada). Ligada: a pergunta é obrigatória e não tem "Pular", com ou sem cupom. Desligada: aparece "Opcional" (já existe) e "Pular esta pergunta" (`T.pularPergunta`). Com cupom ligado e WhatsApp opcional, quem pular segue sem cupom e sem link de indicação (a ajuda já avisou). Quem pula o WhatsApp não vê a etapa de consentimento (não há número a consentir): o envio sai direto depois da última pergunta. |
| Conteúdo inesperado | Letras são ignoradas pela máscara. Colar texto longo: só os dígitos entram. |

### Mensagens de erro (chaves em `FORMULARIO_PUBLICO.whatsapp.erros`)

| Caso | Texto |
|---|---|
| Vazio (obrigatória) | "Digite seu WhatsApp para continuar." |
| Menos de 11 dígitos | "Faltam números. Digite o DDD e o número com 9 dígitos, como (35) 99999-8888." |
| DDD inválido | "Esse DDD não existe. Confira os dois primeiros números." |
| Não é celular (3º dígito diferente de 9) | "Digite um número de celular: depois do DDD ele começa com 9." |
| Sequência repetida (teclado batido) | "Esse número parece incorreto. Confira e digite de novo." |

Os cinco casos mapeiam as regras de `normalizarTelefone`. Se o plano usar outras regras, manter uma mensagem por motivo e sempre dizer como corrigir.

### Pergunta de nome (tipo `nome`)

Nova pergunta, renderizada em `PerguntaPublica` como um `texto_curto`, com estas particularidades:

- Enunciado padrão: "Como você se chama?". Ajuda padrão: "Pode ser só o primeiro nome."
- Atributos: `type="text"`, `autoComplete="name"`, `autoFocus`, mesmo `Input` de 56 px do `texto_curto`. Sem máscara.
- Obrigatoriedade vem da configuração da loja "Nome obrigatório" (seção 7, padrão: desligada). Ligada: sem "Pular". Desligada: "Opcional" e "Pular esta pergunta". Nome obrigatório só existe junto com WhatsApp obrigatório.
- Erro (obrigatória e vazia): "Digite seu nome para continuar."
- O nome é guardado só junto do WhatsApp. Se a pessoa pular o WhatsApp, o nome não é guardado.
- No painel, contato sem nome (formulário que não pede nome ou nome pulado) é exibido como "Sem nome" (seção 6).

---

## 2. Consentimento por finalidade (dentro do fluxo de uma pergunta por vez)

### Decisão de posição

O consentimento é uma **etapa própria, a última do fluxo**, depois da última pergunta e antes do envio. Aparece apenas em formulários que têm pergunta `whatsapp` (formulários anônimos não mudam nada).

Motivos: não interrompe as perguntas; mantém a regra "uma coisa por tela"; a pessoa já deu o número e entende o que está autorizando; o botão final de envio fica nesta etapa, então não existe como enviar sem ter visto as opções.

Progresso: a barra passa a ter `total + 1` passos. O texto da última etapa é "Última etapa" em vez de "Pergunta N de N" (chave `FORMULARIO_PUBLICO.progressoConsentimento`). `aria-valuemax` acompanha.

### Layout (mobile primeiro; no desktop é a mesma coluna centralizada)

1. Título (h1, mesmo estilo das perguntas): "Como podemos usar seu número?"
2. Subtítulo (`text-muted-foreground`): "Você escolhe. Nenhuma opção é obrigatória e você recebe o cupom mesmo sem marcar nada." (se cupom desligado: "Você escolhe. Nenhuma opção é obrigatória.")
3. Caixa de resumo (fundo `superficie`, borda `linha`, raio `rounded-xl`, `text-sm`): 
   - "Quem cuida dos seus dados: {razão social}, CNPJ {cnpj}."
   - "Usamos o número só para o que você marcar abaixo{, e para gerar e conferir o seu cupom}." (trecho entre chaves só com cupom ligado)
   - "Você pode pedir para apagar seus dados quando quiser: {e-mail de privacidade}."
   - Link "Ler a política de privacidade completa" (`/privacidade`), `target="_blank"`, `rel="noopener"`, com texto oculto " (abre em outra aba)". Abre em outra aba de propósito, para a pessoa não perder as respostas do formulário.
4. Grupo de caixas de seleção (`<fieldset>` com `<legend>` visível "Quero receber da Essencial Fit:"), uma linha por finalidade ligada naquele formulário:
   - Finalidade recompra (módulo recompra): "Mensagens no WhatsApp sobre reposição dos produtos que comprei."
   - Finalidade ofertas (módulo ofertas ligado): "Ofertas e novidades da loja no WhatsApp."
   - As finalidades são só `recompra` e `ofertas`. Não existe finalidade "cadastro" nem finalidade obrigatória.
   - Textos finais ficam a cargo do advogado; os acima são o ponto de partida. A lista de finalidades vem do formulário (dado): só as ligadas, cada uma com id e rótulo, e a versão do texto é única para a etapa. Mudar o texto exige nova versão.
   - Formulário com cupom ou indicação, mas sem `recompra` nem `ofertas`: a etapa aparece só com o resumo (itens 1 a 3), sem o grupo de caixas, e o botão de envio fica nela.
5. Linha de cupom informativa (sem caixa; só quando cupom ligado): "O seu cupom é gerado com o número informado. Cada número recebe um cupom por formulário."
6. Botões (como hoje, empilhados, `size="lg"`): primário "Enviar" (com cupom ligado: "Enviar e ver meu cupom"); secundário "Voltar".

### Linha de caixa de seleção

- `<label>` inteiro clicável, `min-h-14`, padding igual ao `BOTAO_DE_ESCOLHA`, borda `linha-forte`; marcada: borda `acento`, fundo `acento-suave`, texto `acento-forte` (mesmo padrão visual de `ListaDeOpcoes`).
- Controle nativo `<input type="checkbox">` com `size-6`, `accent-primary`. **Nunca vem marcado.** Nada é marcado em nenhuma circunstância (nem ao voltar da fila offline, nem por padrão do navegador: `autoComplete="off"`).
- Ao voltar da etapa seguinte para esta (botão "Voltar"), as marcações feitas são mantidas.
- Cada linha tem rótulo suficiente para leitor de tela sem depender da caixa de resumo.

### Estados

| Estado | Comportamento |
|---|---|
| Padrão | Todas desmarcadas. Enviar ativo. Enviar sem marcar nada é válido e grava "não" para cada finalidade. |
| Enviando | Botão "Enviando…" desabilitado com `aria-busy`, caixas desabilitadas. |
| Erro de envio / limite / offline | Ver seções 3 e 4. As marcações são mantidas. |
| Dados do controlador ausentes em produção | Esta etapa nunca é mostrada: o formulário nem abre (seção 5). |
| Conteúdo longo | Rótulos quebram linha; razão social longa quebra com `break-words`. |

Nenhum erro de validação nesta etapa: nenhuma finalidade é obrigatória (decisão do plano, D5). Nenhuma caixa vem marcada. O servidor grava uma linha por finalidade exibida, "sim" ou "não".

### Acessibilidade

- `fieldset`/`legend` nativos; foco visível no `label` via `has-[:focus-visible]:ring-3 ring-ring/50`.
- Alvo de toque: a linha toda, 56 px de altura mínima.
- Ao entrar na etapa, o foco vai para o h1 (`tabIndex={-1}`) para o leitor de tela anunciar o título.
- O link de privacidade tem alvo mínimo de 44 px de altura (`min-h-11`), como no Bussula.

---

## 3. Tela de conclusão com cupom e indicação

Rota atual: `/resposta/concluida`. Hoje ela é estática e não consulta o banco, de propósito, para abrir mesmo offline. Essa propriedade deve ser mantida: o conteúdo variável (cupom, link de indicação, módulos ligados) chega do envio e é guardado no aparelho para a tela ler (por exemplo em `sessionStorage`, dentro de `try/catch`), nunca na URL. Cupom na URL vazaria em histórico e compartilhamento.

### Estrutura (coluna única, centralizada, `max-w-sm`, como hoje)

```
[Marca]
[✓]  Cadastro feito                         <- h1, foco ao abrir
     Obrigado! ...                          <- texto atual
┌ Bloco do cupom (se cupom ligado) ───────┐
│ Seu cupom                                │
│  ESS-7K4Q-92        [Copiar código]      │
│ {texto do brinde}                     │
│ Como usar: mostre este código ao         │
│ vendedor antes de pagar.                 │
└──────────────────────────────────────────┘
┌ Bloco de indicação (se indicação ligada)┐
│ Indique um amigo                         │
│ Mande seu link pelo WhatsApp. Nós nunca  │
│ pedimos o telefone dele.                 │
│ [Compartilhar no WhatsApp] [Copiar link] │
│ Indicações até agora: não mostrar aqui   │
└──────────────────────────────────────────┘
Você já pode fechar esta página.
```

A ordem é fixa: confirmação, cupom, indicação, "pode fechar". O cupom vem antes porque é o que a pessoa veio buscar e precisa ser mostrado no caixa em seguida.

### Bloco do cupom

- Cartão com fundo `acento-suave`, borda `acento/40`, `rounded-xl`, `p-5`. Título pequeno "Seu cupom" (`text-sm font-medium text-acento-forte`).
- Código em `font-mono`, 28 a 32 px, `font-bold`, `tracking-widest`, `text-acento-forte`, com `translate="no"`, em uma linha; em 320 px o tamanho cai para 24 px para não quebrar. O código não deve usar caracteres ambíguos (0/O, 1/I/L): é regra de geração, ver "dado necessário".
- Botão "Copiar código" (secundário, `min-h-11`). Depois do toque, o texto muda para "Código copiado" por 3 s e um `aria-live="polite"` anuncia "Código copiado". Se a cópia falhar (permissão), mostrar "Não deu para copiar. Toque e segure no código para copiar." 
- Texto do brinde: vem da configuração do formulário, exibido em `text-base`. Se vier vazio, o bloco mostra só "Seu cupom da Essencial Fit" e o código (sem inventar brinde).
- "Como usar": "Mostre este código ao vendedor na hora de pagar. Vale uma vez, para este número." Dica: "Dica: tire um print desta tela para não perder o código."
- Validade: o cupom vale 30 dias. Linha sempre visível abaixo do brinde, só no cupom novo: "Válido até {dd/mm/aaaa}" (data calculada pelo servidor, fuso da loja).
- Um cupom por telefone por formulário, para sempre: mesmo depois de vencer, o mesmo número não recebe outro cupom no mesmo formulário.

### Estado: cliente já recebeu cupom com esse telefone

O código **não é reexibido** (decisão do dono): quem souber o número de outra pessoa não pode ver o cupom dela.

- h1: "Esse número já recebeu um cupom". O `✓` do cabeçalho é trocado por `ⓘ` (decorativo, `aria-hidden`).
- Texto: "Cada número recebe um cupom por formulário, e o cupom deste número já foi enviado. Procure o print ou a mensagem com o código."
- `Aviso` neutro: "Não achou? Fale com o vendedor na loja, que ajuda você."
- Sem data de validade: o servidor não devolve a validade neste estado (para não revelar nada sobre o número de outra pessoa). A tela não mostra nenhuma data nem diz se o cupom ainda vale; a orientação é procurar o print ou falar com o vendedor.
- Nenhum bloco de cupom nem botão de copiar. O bloco de indicação continua disponível.
- Tom informativo, não de erro: sem `role="alert"`; o foco vai ao h1.

### Bloco de indicação

- Título "Indique um amigo". Texto: "Compartilhe seu link pelo WhatsApp. Quando alguém se cadastrar por ele, a loja registra que foi você que indicou. Nós nunca pedimos o telefone do seu amigo."
- Botão primário "Compartilhar no WhatsApp": é um `<a>` (funciona mesmo sem JS) para `https://wa.me/?text=<mensagem codificada>`, `target="_blank"`, `rel="noopener"`. Em navegador com Web Share API pode-se oferecer o compartilhamento nativo como melhoria, mas o `<a>` é a base.
- Botão secundário "Copiar link" (mesmo comportamento de feedback do código). Reaproveitar o padrão de `LinkPublico`.
- Mensagem pré-escrita (editável por quem compartilha, é só o texto inicial): "Fui na Essencial Fit e lembrei de você!{ Tem brinde para quem se cadastra: {brinde}.} Cadastre-se por aqui: {link}" (a frase do brinde só entra com cupom; texto aprovado, igual ao de `CONCLUIDO.indicacao.mensagem`). O link é `/f/<slug>?o=link&ref=<código de indicação>`; o `ref` é um código opaco, nunca o telefone nem o nome.
- Indicação sem cupom ligado: o bloco aparece sozinho, sem a frase do brinde.
- Não mostrar contagem de indicações para o cliente (a contagem é só do painel).

### Estados da tela

| Estado | O que mostra |
|---|---|
| Cupom novo, online | Confirmação + bloco do cupom + indicação (se ligada). |
| Cupom já emitido | Como descrito acima, sem código. |
| Sem cupom, só indicação | Confirmação + indicação. |
| Sem módulos | A tela atual, sem alteração. |
| Guardada no aparelho (offline) com cupom ligado | h1 "Cadastro guardado". Texto: "Sem conexão agora. Seu cadastro está guardado neste aparelho. Quando a conexão voltar, seu cupom aparece aqui. Mantenha esta página aberta: se você fechá-la, o cupom não será mostrado." Nenhum código é inventado. O bloco do cupom mostra um estado "Gerando seu cupom…" com `aria-busy`, e passa ao cupom real (anunciado com `aria-live="polite"`: "Seu cupom chegou") quando a fila sincronizar. Para isso a tela precisa saber o resultado da fila (ver "dado necessário"). |
| Guardada, sem cupom | Texto atual `CONCLUIDO.guardada`; o bloco de indicação já pode ser exibido, pois o link de indicação não depende do servidor (o `ref` do cliente só existe depois do envio, então com envio guardado o bloco mostra "Seu link de indicação aparece quando a conexão voltar", sem botão). |
| WhatsApp pulado (WhatsApp opcional) | Não existe contato, então não há cupom nem link de indicação. Confirmação "Cadastro feito" e o texto atual, sem blocos. Se o cupom está ligado, uma linha neutra: "Sem o WhatsApp não foi possível gerar o cupom." |
| Cupom não pôde ser gerado (resposta salva, cupom falhou) | h1 "Cadastro feito". Aviso `Aviso tom="atencao"`: "Recebemos seu cadastro, mas não conseguimos gerar o cupom agora. Fale com o vendedor na loja para receber o brinde." Sem botão de tentar de novo (evita duplicar). |
| Recarregou a página / dados do aparelho perdidos | Confirmação genérica + texto: "Se você não guardou o código do cupom, procure o print ou fale com o vendedor na loja." O código não é recuperável por esta tela. |
| Carregando | Não existe espera: a leitura é local e imediata. |

### Acessibilidade e responsividade

- O foco vai para o h1 ao abrir. Os dois blocos são `<section aria-labelledby>`.
- Contraste: `acento-forte` sobre `acento-suave` e `tinta` sobre branco passam de 4,5:1. O código em verde grande tem folga para 3:1 mesmo se o tema mudar.
- Todos os botões `min-h-11` (44 px), de largura total no celular; a partir de `sm`, os dois botões de indicação ficam lado a lado (`grid-cols-2`).
- O código não quebra no meio: `whitespace-nowrap` com redução de fonte; se ainda exceder, `break-all` como último recurso.
- `prefers-reduced-motion`: a animação `anim-surgir` já deve respeitar; confirmar.

---

## 4. Envio barrado pelo limite anti-abuso

Quando o servidor recusa por excesso de envios do mesmo IP (HTTP 429 ou código equivalente do plano), **não** cair no `catch` que enfileira. Hoje qualquer falha de `postarResposta` que lance exceção vai para a fila offline; o limite precisa chegar como `resultado.ok === false` com um tipo próprio (`limite`), ou como um tipo de erro distinto, para a tela tratar.

### Comportamento

- A pessoa **permanece na última etapa** (consentimento ou última pergunta). Nada é descartado: respostas e marcações continuam preenchidas.
- Aparece um `Atencao` (tom `atencao`, com palavra escrita, não só cor) acima dos botões, `role="alert"`:
  - Título: "Muitos envios em pouco tempo"
  - Texto: "Para proteger a loja contra robôs, limitamos os envios feitos pelo mesmo Wi-Fi. Suas respostas continuam aqui. Espere um pouco e toque em Enviar de novo."
  - Se o servidor informar o tempo: "Tente de novo em {N} minutos." (arredondar para cima; ao chegar a zero a frase some e o botão volta a "Enviar").
- O botão primário volta a "Enviar" (ou "Enviar e ver meu cupom") e fica ativo; se houver contagem, pode ficar desabilitado até zerar, com o texto "Enviar em {N} s" (apenas para esperas curtas, menos de 60 s; acima disso, ativo e a mensagem orienta).
- Segunda linha de apoio, só quando a pessoa está claramente na loja: "Se estiver na loja, peça ajuda ao vendedor." 
- A resposta **não** é guardada na fila nem é anunciada como "guardada neste aparelho". Isso evita que um envio barrado vire milhares de tentativas automáticas quando a conexão voltar.
- O limite é generoso (brief item 6): esta tela deve ser rara. Não usar tom de culpa ("você fez algo errado").

### Estados relacionados (para não confundir)

| Situação | Tela |
|---|---|
| Limite de IP | A mensagem acima, sem fila. |
| Sem conexão ou falha de rede | Fluxo atual: guarda e vai para "guardada". |
| Erro de servidor (5xx) | Fluxo atual de erro com `resultado.mensagem`. |
| Telefone já usado no cupom | Não é erro: tela de conclusão "Você já tem um cupom" (seção 3). |

### Acessibilidade

- `role="alert"` para anunciar; foco permanece no botão de enviar. A contagem regressiva não deve ser anunciada a cada segundo (`aria-live="off"` na contagem; só o texto inicial é anunciado).

---

## 5. Formulário travado por falta dos dados do controlador

Em produção, um formulário que pede consentimento não abre enquanto razão social, CNPJ, endereço ou e-mail de privacidade estiverem vazios ou com placeholder.

### Visão do cliente final (`/f/[slug]`)

Tela de estado, no padrão visual das telas `naoEncontrado` e `inativo` (que já existem em `FORMULARIO_PUBLICO`):

- Marca no topo, h1 e um parágrafo, sem botão de ação.
- h1: "Formulário indisponível no momento"
- Texto: "Estamos terminando de preparar este cadastro. Tente novamente em alguns dias ou fale com o vendedor na loja. Obrigado por passar na Essencial Fit!"
- Não expor ao cliente o motivo técnico nem nomes de campos. Não mostrar "dados da empresa" ao público.
- A resposta HTTP é **200**, com `noindex` (decisão do plano: a página já começa como 200 no streaming, e 503 de verdade exigiria consultar o banco no `proxy.ts`). A trava vale também para o envio (POST), que recusa com erro `FORMULARIO_TRAVADO`.
- `<title>`: "Formulário indisponível — Essencial Fit".

### Visão do gerente (painel)

O gerente precisa saber que o cartão dele está "morto", antes de um cliente reclamar.

- **Visão Geral e Formulários:** `Atencao` (tom `perigo`, com título escrito) no topo de ambas as telas, antes do conteúdo:
  - Título: "Há formulários fora do ar por falta de dados da empresa"
  - Texto: "Em produção, formulários que pedem consentimento só abrem depois que os dados da empresa responsável (razão social, CNPJ, endereço e e-mail de privacidade) estiverem preenchidos. Faltam: {lista dos campos}. Peça a quem cuida do sistema para completá-los."
  - A lista mostra só os **nomes** dos campos pendentes, nunca os valores.
- **Cartão de cada formulário afetado** (em `/admin/formularios`): `Etiqueta` `perigo` "Travado" junto da `Situacao`, e a frase de explicação no lugar do `EXPLICACAO_DA_SITUACAO`: "Travado: não abre para os clientes até os dados da empresa serem preenchidos." O bloco "Endereço público" mostra o link com a nota "Este link não abre enquanto o formulário estiver travado." para ninguém gravar um cartão NFC que não funciona.
- O gerente não edita esses dados no painel (são configuração do sistema). Por isso a mensagem manda falar com quem cuida do sistema, e não oferece botão.
- Fora de produção (desenvolvimento): o formulário abre, e um aviso discreto `Aviso tom="atencao"` aparece no painel: "Dados da empresa ainda são de exemplo. Em produção este formulário ficaria travado." Sem aviso ao cliente final.
- `/privacidade` em desenvolvimento mostra os campos pendentes entre colchetes ("[preencher: CNPJ]") para a equipe enxergar; em produção, os dados reais (e a página não aparece como completa se faltarem, mas o formulário que depende dela já estará travado).

### Dado necessário

Estado de controlador completo (sim/não), a lista de nomes de campos pendentes e a lista de formulários que pedem consentimento (para marcar "Travado" só nos afetados).

---

## 6. Painel de contatos (gerente)

### Navegação

Hoje o painel tem 3 áreas (`src/components/navegacao/areas.ts`). Proposta: **4ª área, "Contatos"**, em `/admin/contatos`, entre "Formulários" e "Resultados & IA" (aprovada pelo dono). Motivo: contatos pessoais exigem controles próprios (revelar, exportar) e não cabem em "Resultados", que é só agregado e anônimo. Regra do comentário de `areas.ts` mantida: cada área responde a uma pergunta ("quem posso chamar?").

Ordem: Visão Geral, Formulários, Contatos, Resultados & IA. Quatro itens cabem na barra em 320 px (verificar o `TopoAdmin`; rótulos curtos). Isso muda `AreaDoPainel`, `AREAS_DO_PAINEL`, `A.nav` e o teste `painel.test.ts` (que hoje exige exatamente três áreas).

### Layout

**Cabeçalho:** h1 "Contatos"; subtítulo "Clientes que se cadastraram pelos cartões e QR Codes. Os dados aparecem escondidos; revelar e exportar ficam registrados."

**Resumo (`Metrica`, grade 2x2 no celular, 4 colunas em `lg`):**
- Contatos cadastrados
- Aceitam receber mensagens
- Cupons emitidos (só se algum formulário tiver cupom)
- Indicações recebidas (só se algum formulário tiver indicação)
Cada métrica respeita o filtro ativo? Não: o resumo é do total, para não confundir; o contador da lista mostra o filtrado.

**Filtros (barra acima da lista, `Cartao`):**
- Formulário: `<select>` nativo com "Todos os formulários" + cada nome. Rótulo visível "Formulário".
- Origem: grupo de botões em segmentos "Todas", "Cartão NFC", "QR Code", "Link" (rótulos de `ROTULO_DA_ORIGEM` já existentes). Usar links/botões com `aria-pressed` ou `<select>`; no celular, `<select>` "Origem" para economizar altura.
- Mostrar: "Todos" ou "Só quem aceitou mensagens" (`<select>` "Mostrar").
- Ordenar: "Mais recentes" ou "Mais indicações".
- Os filtros viram parâmetros da URL (`?formulario=&origem=&mostrar=&ordem=&pagina=`) como já acontece em Resultados, então o link é compartilhável e o botão voltar funciona. Botão "Limpar filtros" aparece quando algum filtro está ativo.
- Atualização por submit/links (sem JS obrigatório), mudando a lista sem recarregar a página inteira é opcional.

**Ação principal da página:** "Exportar CSV" no canto superior direito do cabeçalho (no celular, abaixo do subtítulo, largura total). É um `<button type="submit">` dentro de `<form method="post">` (rota de exportação), com os filtros ativos em campos `<input type="hidden">`; visualmente é um botão comum, sem mudança na tela. Não é link `<a download>`: ação com efeito auditado não pode ser disparada por GET. Sai um registro por telefone (o cadastro mais recente). Texto do botão traz a contagem: "Exportar CSV (42 contatos)" e uma linha de apoio abaixo: "Inclui só quem aceitou receber mensagens, respeitando os filtros acima. O download fica registrado." Sem contatos que aceitaram: botão desabilitado e texto "Nenhum contato que aceitou mensagens nesta seleção."

**Lista:** `<ul>` de linhas, 25 por página, paginação igual à de "Respostas individuais" (`Anterior`/`Próxima`, "Página X de Y"). Contador acima: "42 contatos" / "1 contato".

Linha, mobile (cartão empilhado, `p-4`):
```
Marcos A.                      [Aceita mensagens]
(35) 9••••-••32
Formulário: Pós-compra · Cartão NFC · há 2 h
2 indicações
[Revelar contato]
```
Após revelar:
```
Marcos Antunes Silva            [Aceita mensagens]
(35) 99999-8832
Formulário: ... · há 2 h        Contato revelado
[Chamar no WhatsApp]  [Ocultar]
```
Linha, desktop (`md` em diante): mesma `<ul>`, mas cada item em grade de colunas: Nome e telefone | Formulário e origem | Quando | Indicações | Ações. Cabeçalhos de coluna visuais acima da lista (`aria-hidden`, pois cada célula já tem rótulo textual para leitor de tela via `sr-only`).

Elementos:
- Nome e telefone mascarados no padrão do Bussula: "Marcos A." e "(35) 9••••-••32" (a máscara é feita no servidor; o navegador nunca recebe o valor completo antes de revelar).
- Contato sem nome (formulário que não pede nome, ou nome pulado) aparece como "Sem nome" em `text-muted-foreground`, antes e depois de revelar. Os `aria-label` dos botões usam então o telefone mascarado: "Revelar contato (35) 9••••-••32".
- `Etiqueta`: "Aceita mensagens" (tom sucesso) ou "Não aceitou mensagens" (tom neutro). Sempre com a palavra.
- Quando: `Quando` já existe.
- Indicações: "3 indicações" / "1 indicação" / omitido se zero e módulo desligado; "Nenhuma indicação" em formulários com indicação ligada. A contagem é de telefones distintos; indicação vinda de formulário sem WhatsApp não é contada.

### Revelar (auditado)

- Botão "Revelar contato" (`variant` secundária, `min-h-11`), com `aria-label="Revelar contato de Marcos A."`. 
- Toque dispara a ação no servidor (registra em `auditoria` quem/quando/qual contato) e devolve o nome e o telefone completos. Enquanto isso o botão fica "Revelando…" desabilitado.
- Sucesso: a linha troca para os dados completos, aparece `Contato revelado` (texto, `text-xs`) e `aria-live="polite"` anuncia "Contato revelado." O foco vai para o botão "Chamar no WhatsApp" (ou "Ocultar" quando não houver).
- Erro: mensagem na linha, `role="alert"`: "Não foi possível revelar agora. Tente de novo." O dado continua mascarado.
- "Ocultar" volta ao mascarado localmente, sem nova chamada. O dado revelado fica só em memória do componente: ao sair da página ou recarregar, volta mascarado. Cada novo "Revelar" gera nova linha de auditoria.
- Não existe "Revelar todos".

### Botão wa.me

- Aparece **só depois de revelar** e **só para quem aceitou mensagens**. Antes de revelar, o `href` não existe no HTML (não vazar o telefone no código da página).
- "Chamar no WhatsApp" (primário da linha, `buttonVariants` padrão; é um `<a href="https://wa.me/55...">`, `target="_blank"`, `rel="noopener noreferrer"`), com texto oculto "(abre o WhatsApp)".
- Mensagem pré-preenchida opcional (`?text=`): texto provisório: "Oi, {primeiro nome}! Aqui é da Essencial Fit. Passando para dizer que temos novidades e para ver se você precisa repor algum produto. Posso ajudar?" Fica em `A.contatos.mensagemWhatsApp` para a loja ajustar. O envio é sempre manual: o gerente revisa e toca em enviar dentro do WhatsApp.
- Quem **não** aceitou mensagens: não há botão "Chamar no WhatsApp". Com cupom válido, só o "Enviar cupom no WhatsApp" (ver abaixo); sem cupom válido, nenhum botão e o texto `text-xs text-muted-foreground`: "Não aceitou mensagens." Esse contato fica revelável (o gerente pode ter razão legítima de ver, auditada), mas sem atalho para chamar.
- "Aceita mensagens" é calculado por telefone: vale a escolha do cadastro mais recente daquele número, e aparece igual em todas as linhas dele.

### Cupom do contato e "Enviar cupom no WhatsApp"

Serve para o cadastro feito sem internet (o cliente saiu da loja sem ver o cupom) e para quem perdeu o código. O código nunca é reexibido ao cliente; o gerente só o vê aqui, depois de revelar o contato.

**Situação do cupom na linha** (só em formulários com cupom), sempre com `Etiqueta` e palavra:

| Situação | Etiqueta | Texto abaixo |
|---|---|---|
| Emitido e dentro da validade | "Cupom válido" (sucesso) | "Válido até 14/11/2026" |
| Emitido e vencido | "Cupom vencido" (neutro) | "Venceu em 14/11/2026" |
| Não emitido (falhou na geração) | "Sem cupom" (neutro) | "Não foi possível gerar o cupom deste contato." |

- Antes de revelar, a linha mostra só a situação e a validade. O **código** aparece depois de "Revelar contato" ("Cupom ESS-7K4Q-92"), com `translate="no"`.
- Cupom vencido não tem reenvio. O mesmo telefone não ganha outro cupom no mesmo formulário, nem depois de vencer.

**Botão "Enviar cupom no WhatsApp"** (link `wa.me`, `target="_blank"`, `rel="noopener noreferrer"`, texto oculto "(abre o WhatsApp)"), do mesmo tamanho e com as mesmas regras de acesso do "Chamar no WhatsApp":

- Só existe depois de "Revelar contato" (antes disso o `href` não está no HTML) e só com cupom emitido **e ainda válido**.
- Aparece **também para quem não aceitou mensagens**. Motivo: é a entrega do cupom que o cliente pediu ao se cadastrar (mensagem transacional), não marketing.
- Texto **fixo**, não editável pela loja: `A.contatos.mensagemCupom(primeiroNome, codigo, brinde, validoAte)` = "Oi, {primeiro nome}! Aqui é da Essencial Fit. Seu cupom: {código}. {texto do brinde} Válido até {dd/mm/aaaa}. É só mostrar este código ao vendedor na hora de pagar." Contato sem nome: "Oi! Aqui é da Essencial Fit. ...". Sem oferta nem novidade.
- Auditoria: o registro do "Revelar contato" já cobre quem viu o dado; o botão não faz chamada extra.
- **Pendente de confirmação jurídica.** Se o advogado não confirmar o envio a quem não aceitou mensagens, o botão é removido (o dado `linkEnvioDoCupom` passa a vir sempre nulo) e nada mais na tela muda. O layout não pode depender da presença do botão.

| Contato, depois de revelar | Cupom válido | Cupom vencido ou sem cupom |
|---|---|---|
| Aceitou mensagens | "Chamar no WhatsApp" e "Enviar cupom no WhatsApp" | Só "Chamar no WhatsApp" |
| Não aceitou mensagens | Só "Enviar cupom no WhatsApp", com o apoio abaixo | Nenhum botão; texto "Não aceitou mensagens." |

Texto de apoio para quem não aceitou (`text-xs text-muted-foreground`, ao lado do botão): "Este contato não aceitou mensagens de recompra ou ofertas. Envie só o cupom, uma vez, e nada além disso."

Dado necessário: situação e validade do cupom por linha; código e `linkEnvioDoCupom` só no retorno do "revelar".

### Indicações

- Cada linha mostra a contagem de pessoas indicadas por aquele contato ("3 indicações").
- Ordenar por "Mais indicações" traz quem mais indica para o topo.
- O painel mostra apenas a contagem. Quem foi indicado aparece como contato normal; o painel não lista "indicado por" com nome do amigo (o amigo nunca deu o telefone de ninguém).

### Estados

| Estado | Comportamento |
|---|---|
| Carregando | `loading.tsx` com esqueleto: 4 blocos de métrica e 5 linhas cinza (`bg-muted`), `aria-busy`. |
| Vazio total | `EstadoVazio`: título "Nenhum contato cadastrado ainda"; texto "Os contatos aparecem aqui quando um cliente se cadastra pelo cartão NFC ou QR Code com a pergunta de WhatsApp. Confira se o cartão tem o endereço do formulário certo, na página Formulários." Botão "Ver formulários" (link). |
| Vazio com filtro | `EstadoVazio`: "Nenhum contato com estes filtros"; "Tente outro formulário ou origem." Botão "Limpar filtros". |
| Só quem não aceitou | Lista normal com etiquetas; exportar desabilitado como descrito. |
| Erro ao carregar | `error.tsx` da rota, padrão de Resultados: "Não foi possível carregar os contatos." / "Pode ter sido uma falha passageira. Tente de novo em instantes." / "Tentar de novo" / "Voltar à Visão Geral". |
| Erro ao exportar | `Aviso tom="perigo"` junto do botão: "Não foi possível gerar o arquivo agora. Tente de novo." |
| Exportando | Botão "Gerando arquivo…" desabilitado enquanto o formulário é enviado. O envio por `<form method="post">` funciona sem JS; o texto de espera é melhoria. |
| Sucesso na exportação | Download do navegador. Mensagem `aria-live` "Arquivo gerado. O download foi registrado." só se o dev conseguir detectar o fim do envio; sem isso, vale a linha de apoio "O download fica registrado." |
| Nome muito longo | `truncate` na linha com `title`; ao revelar, quebra (`break-words`). |
| Telefone fora do padrão | Máscara genérica "••••" (como o Bussula já faz). |
| Sessão expirada | Redireciona ao login (`exigirAdmin`), sem estado novo. |

### Acessibilidade e responsividade

- Cada linha é um `<li>` com `aria-label` textual curto (nome mascarado). Botões com `aria-label` que incluem o contato, para que a lista de botões fora de contexto não seja "Revelar, Revelar, Revelar".
- Todos os alvos de toque ≥ 44 px; espaçamento entre "Chamar no WhatsApp" e "Ocultar" ≥ 8 px.
- Selects nativos com `<label>` visível. Sem dropdown customizado.
- Contraste: etiquetas e texto seguem os pares existentes (`sucesso` sobre `sucesso-suave`).
- Nenhuma informação só por cor: aceitou/não aceitou tem palavra; revelado tem palavra.
- 320 px: sem rolagem horizontal; as ações quebram em coluna (`flex-wrap`).
- O CSV não é exibido na tela; a pré-visualização das colunas não é necessária. O texto de apoio lista as colunas ("Nome, WhatsApp, formulário, origem, data, aceita recompra, aceita ofertas, indicações"), pois o gerente quer saber o que sai.

---

## 7. Configuração dos módulos por formulário (tela Formulários)

### Decisão

Cabe na tela existente `/admin/formularios`, em cada `CartaoDoFormulario`, numa seção "Módulos deste formulário" entre os dados (`dl`) e o endereço público. Decisão do dono: **módulos em leitura** (definidos no arquivo de configuração do seed); **o gerente edita apenas o texto do brinde**. Sem interruptores nem "Salvar módulos".

### Layout (cartão do formulário)

Seção `<section aria-labelledby>`, título h3 "Módulos deste formulário" (`text-sm font-medium`), quatro linhas:

| Módulo | Rótulo | Descrição curta |
|---|---|---|
| Recompra | "Contato para recompra" | "Pede o WhatsApp e o consentimento. O gerente chama pelo painel." |
| Cupom | "Cupom de desconto" | "Gera um código único por telefone. Sem sorteio." |
| Indicação | "Indique um amigo" | "Mostra um link para compartilhar no WhatsApp. Conta indicações no painel." |
| Ofertas | "Ofertas e novidades" | "Pergunta se o cliente aceita receber ofertas e novidades." |

- Cada linha mostra `Etiqueta` "Ligado" (tom sucesso) ou "Desligado" (tom neutro), sempre com palavra. Abaixo: "Os módulos são definidos pela equipe que cuida do sistema."

### Cadastro por formulário (o gerente edita)

Mesma seção do cartão, logo abaixo da lista de módulos, em um subformulário "Configurar este formulário" (`<form>` com um único botão "Salvar configurações", salvando tudo de uma vez). Os módulos recompra, cupom e indicação continuam só em leitura. As opções abaixo são configuração da loja: **não criam nova versão do formulário** (a versão só muda quando perguntas ou módulos mudam) e cada alteração fica registrada (quem, quando, antes e depois).

**Controles**

| Controle | Tipo | Rótulo e ajuda |
|---|---|---|
| Nome obrigatório | Interruptor nativo (`<input type="checkbox" role="switch">`), `min-h-11`, com estado escrito "Sim"/"Não". Padrão: Não | "Pedir o nome do cliente". Ajuda: "Se desligado, o cliente pode pular a pergunta de nome." |
| WhatsApp obrigatório | Interruptor igual. Padrão: Sim | "Exigir o WhatsApp". Ajuda: "Se desligado, o cliente pode pular o WhatsApp." |
| Destino da indicação (só com módulo Indicação ligado) | `<select>` nativo com rótulo visível | "Para onde vai o link 'Indique um amigo'". Opções: "Este mesmo formulário (padrão)" + um item por formulário ativo que tenha a pergunta de WhatsApp. Ajuda: "É o formulário que seu amigo vai abrir pelo link." |
| Texto do brinde (só com módulo Cupom ligado) | `Input` com contador | Ver abaixo |

Controles de um módulo desligado ou de uma pergunta que o formulário não tem ficam desabilitados com explicação ligada por `aria-describedby` (ex.: "Este formulário não tem a pergunta de nome.").

**Regras visíveis (o servidor também confere)**

- **Nome obrigatório exige WhatsApp obrigatório.** Pedir o nome de quem pode não deixar contato coletaria um nome que seria descartado. Na tela: com "Exigir o WhatsApp" desligado, o interruptor "Pedir o nome do cliente" fica desabilitado (desligado) com a ajuda "Para exigir o nome, o WhatsApp também precisa ser obrigatório."; com "Pedir o nome" ligado, o interruptor do WhatsApp fica desabilitado (ligado) com a ajuda "Desligue a exigência do nome antes de tornar o WhatsApp opcional." Nada é desligado sozinho.
- **Cupom ligado e WhatsApp opcional:** é permitido. O `Atencao` (tom atenção, palavra escrita) aparece logo abaixo do interruptor, sem esperar o salvar: "Com o cupom ligado, quem pular o WhatsApp não recebe cupom nem link de indicação e vai embora sem brinde." Não há caixa de confirmação extra; o cliente é avisado na própria pergunta (seção 1).
- **Destino da indicação:** só lista formulários **ativos** (nunca arquivados, inativos nem travados) que tenham a pergunta de WhatsApp, porque a indicação só conta quando o amigo deixa o número. Se o destino salvo deixar de estar ativo, o cartão mostra `Aviso` atenção: "O formulário de destino da indicação saiu do ar. Por enquanto o link aponta para este mesmo formulário. Escolha outro destino se quiser mudar." O seletor mostra o destino salvo marcado como "(fora do ar)" e desabilitado até o gerente escolher outro.
- Indicação ligada e nenhum outro formulário ativo com WhatsApp: o seletor mostra só "Este mesmo formulário" e a ajuda "Não há outros formulários ativos com WhatsApp."
- Só edita enquanto o formulário estiver **ativo ou em rascunho**. Inativo e arquivado: seção em leitura, sem botão salvar.

**Texto do brinde**

- Campo `Input`, rótulo "Texto do brinde", ajuda: "Aparece para o cliente junto do código. Ex.: 10% de desconto na próxima compra." Contador "{n}/120 caracteres". Limite: **120 caracteres** (1 a 120).
- Obrigatório enquanto o cupom estiver ligado. Validação: vazio: "Escreva o brinde que o cliente vai receber."; acima do limite: "Use até 120 caracteres."
- Nota fixa: "Mudar o texto vale para os próximos cupons; quem já recebeu mantém o texto antigo." (confirmado: o texto do brinde fica copiado no contato no momento da emissão.)
- Pré-visualização "Como o cliente vê": o cartão do cupom da seção 3 com o código "EXEMPLO-0000", rotulado "Exemplo".

**Microcopy**

- Botão: "Salvar configurações". Título do subformulário: "Configurar este formulário".
- Nota abaixo do botão: "Estas opções não criam uma nova versão do formulário. Cada alteração fica registrada."
- Salvando: botão "Salvando…", desabilitado, `aria-busy`; campos desabilitados.
- Salvo: `aria-live="polite"` "Configurações salvas." por 4 s; o botão volta a desabilitado até haver mudança.
- Erro de campo (inclui as regras acima devolvidas pelo servidor): mensagem abaixo do campo, `aria-invalid`, foco no primeiro campo com erro.
- Erro geral: `role="alert"` "Não foi possível salvar agora. Suas alterações continuam na tela. Tente de novo."
- Conflito de edição entre duas pessoas: o plano não prevê tratamento; não há tela para isso (vale a última gravação).

**Estados**

| Estado | Comportamento |
|---|---|
| Nenhum módulo ligado | Seção mostra "Este formulário só coleta respostas." e só os dois interruptores de pergunta, se houver as perguntas. |
| Formulário arquivado / inativo | Seção em leitura, sem salvar. |
| Padrão | Valores atuais; botão salvar desabilitado até mudar algo. |
| Salvando / salvo / erro | Como acima, por formulário (não trava a tela inteira). |
| Conteúdo longo | Texto do brinde com `break-words`. |

**Dado necessário (decidido no plano, D3):** `nome_obrigatorio`, `whatsapp_obrigatorio` e destino da indicação são propriedades do **formulário** (não da pergunta); a obrigatoriedade da pergunta `nome`/`whatsapp` vem delas. WhatsApp opcional com cupom é aviso (sem bloqueio). Lista de formulários ativos com pergunta de WhatsApp (id, nome) para o seletor; destino inativo na hora do envio cai no próprio formulário; limite do brinde 120.

---

## 8. `/privacidade` e textos legais

- Substituir a frase "não guardamos o número do seu aparelho" (`PRIVACIDADE.secoes[0]`): o número de WhatsApp agora é guardado nos formulários identificados. Evitar também confundir "número do aparelho" com "WhatsApp".
- Nova seção no topo: "Quem é responsável pelos seus dados", com razão social, CNPJ, endereço e e-mail de privacidade.
- Nova seção "O que guardamos quando você se cadastra": nome, WhatsApp, as respostas, a data, a origem (cartão, QR ou link), e, se vier por indicação, o código de quem indicou.
- Nova seção "Para que usamos", uma linha por finalidade com o mesmo texto do consentimento, mais "Cupom: gerar e conferir o seu código".
- Nova seção "Indicação": "Quando alguém se cadastra por um link de indicação, a loja registra qual foi o link. Nunca pedimos o telefone do amigo."
- "Seus direitos": acesso, correção, exclusão e retirada do consentimento pelo e-mail. 
- Os textos são ponto de partida; revisão do advogado é pendência do brief. Cada alteração de redação do consentimento exige nova versão (o Bussula usava `POLITICA_VERSAO`), por ser a prova do que a pessoa aceitou.
- Leitura: manter a coluna `max-w-2xl`, títulos h2, parágrafos curtos. 

---

## Textos da interface (resumo das chaves novas)

`src/lib/texts/publico.ts`
- `FORMULARIO_PUBLICO.whatsapp.erros.{vazio,incompleto,ddd,naoCelular,repetido}` (seção 1)
- `FORMULARIO_PUBLICO.nome.*` (enunciado, ajuda, erro; seção 1)
- `FORMULARIO_PUBLICO.progressoConsentimento`: "Última etapa"
- `CONSENTIMENTO.{titulo,subtitulo,legenda,cupomInfo,verPolitica,abreEmOutraAba,enviar,enviarComCupom}`
- `LIMITE.{titulo,texto,tempo,peçaAjuda}` (seção 4)
- `TRAVADO.{titulo,texto}` (seção 5)
- `CONCLUIDO.cupom.*`, `CONCLUIDO.jaTinha.*`, `CONCLUIDO.indicacao.*`, `CONCLUIDO.guardadaComCupom`, `CONCLUIDO.cupomFalhou`, `CONCLUIDO.semDados`
- `PRIVACIDADE` revisada (seção 8)

`src/lib/texts/admin.ts`
- `A.nav.contatos`: "Contatos" (a aba "Resultados & IA" não é renomeada); `A.contatos.mensagemWhatsApp`, `A.contatos.mensagemCupom` (texto fixo)
- `A.contatos.*` (título, filtros, linha, revelar, exportar, estados vazios, erros)
- `A.formularios.modulos.*` (seção 7), `A.formularios.travado.*`, `A.visaoGeral.travado.*` (seção 5)

---

## Acessibilidade (síntese, WCAG 2.2 AA)

- Contraste mínimo 4,5:1 para texto e 3:1 para bordas de campos e foco: usar `linha-forte` nos campos e caixas de seleção, nunca `linha`. Estados `perigo`/`atencao`/`sucesso` sempre com palavra.
- Foco visível em tudo (`focus-visible:ring-3 ring-ring/50` como os componentes atuais); ordem do foco = ordem visual.
- Alvos de toque ≥ 44 px (formulário público e painel), 56 px nas linhas de escolha do formulário público.
- Mensagens dinâmicas: erros com `role="alert"`; sucessos e mudanças (código copiado, contato revelado, cupom chegou) com `aria-live="polite"`.
- Campos com rótulo; erros ligados por `aria-describedby`; `aria-invalid` no campo com erro.
- Ao mudar de etapa, mover o foco para o h1 da nova etapa.
- Links que abrem outra aba ou outro app dizem isso em texto oculto.
- `prefers-reduced-motion`: sem animações essenciais; a barra de progresso e `anim-surgir` respeitam.
- Zoom até 200% e fonte maior do sistema sem perda de conteúdo; 320 px sem rolagem horizontal.

## Responsividade

- Formulário público e conclusão: coluna única `max-w` pequena em todas as larguras; botões de largura total; códigos e links usam `break-all` só em último caso.
- Painel de contatos: cartões empilhados abaixo de `md`; grade de colunas de `md` em diante; filtros em coluna no celular, em linha a partir de `md`.
- Formulários (módulos): interruptor e rótulo em coluna no celular, lado a lado em `sm`.

---

## O que o dev precisa implementar (lógica, dados e chamadas; fora da camada visual)

Dados que a UI espera, para casar com o plano do arquiteto:

1. Tipos de pergunta `whatsapp` e `nome` (dado pessoal) e sua validação no servidor, com as razões de erro do telefone distinguíveis (vazio, incompleto, DDD, não celular, repetido). A obrigatoriedade das duas perguntas vem da configuração da loja, não da definição. Ajuste em `mascararTelefone` para aceitar colagem com `55`/`+55` sem truncar. Nome e WhatsApp saem de `valores` e viram contato; nome sem WhatsApp é descartado.
2. Finalidades de consentimento `recompra` e `ofertas` (nenhuma obrigatória): o formulário público recebe `{ versao, finalidades: [{ id, rotulo }] }` só das ligadas; o envio leva `{ versao, aceites }` e o servidor grava uma linha por finalidade exibida, "sim" ou "não". Dados do controlador (razão social, CNPJ, e-mail de privacidade) disponíveis ao componente de consentimento. Sem WhatsApp, nada é gravado.
3. Resposta do envio com `beneficios`: `cupom` (`emitido` com código, texto do brinde e `validoAte` em `AAAA-MM-DD`; `ja_emitido` **sem código e sem validade**; `falhou`; ou nulo) e `indicacao` (código opaco e slug do destino); mais `jaEstavaRegistrada`. Persistência no aparelho dessa resposta para a tela `/resposta/concluida` (`sessionStorage`, sem pôr cupom em URL). Chave reenviada com cupom já emitido volta como `ja_emitido`.
4. Para envio guardado offline com cupom: um meio de a tela de conclusão saber que a fila sincronizou e qual cupom saiu (por chave de envio).
5. Resultado de limite anti-abuso como tipo distinto (`limite`), com `retryAfter` em segundos quando houver; o cliente não enfileira nesse caso.
6. Código de cupom sem caracteres ambíguos; um por telefone por formulário.
7. Estado do controlador (completo/incompleto), nomes dos campos pendentes e formulários afetados. O formulário travado responde **200** com `noindex` e a tela da seção 5; o POST recusa com `FORMULARIO_TRAVADO`.
8. Contatos: consulta paginada com filtros (formulário, origem, só consentidos, ordem), contagem de indicações por contato, nome e telefone **já mascarados no servidor**; ação de revelar (grava auditoria) que devolve o dado completo; rota de exportação CSV filtrada, só consentidos, com auditoria; totais do resumo.
9. Leitura dos módulos por formulário; salvar a configuração da loja (nome obrigatório, WhatsApp obrigatório, destino da indicação só entre formulários ativos com WhatsApp, texto do brinde de 1 a 120 caracteres) **sem criar versão e com auditoria antes/depois**, conferindo no servidor que nome obrigatório exige WhatsApp obrigatório; cupom por contato (situação, validade; código só no "revelar"); `linkEnvioDoCupom` só com cupom válido, texto fixo, e nulo se o advogado não confirmar o envio a quem não aceitou mensagens.
10. Registro do `ref` ao carregar o formulário por `?ref=` (lido no cliente) e a contagem por pessoa (telefones distintos; indicação de formulário sem WhatsApp não é contada).
11. Exportação CSV como `POST` com checagem de sessão e de origem; resposta de erro tratável para a tela mostrar o `Aviso` "Não foi possível gerar o arquivo agora." (por exemplo, envio com JS e retorno do arquivo, mantendo o `<form method="post">` como base sem JS).

---

## Arquivos de código afetados na implementação visual

Formulário público
- `src/components/formularios/pergunta-publica.tsx` (tipo `whatsapp`)
- `src/components/formularios/formulario-publico.tsx` (etapa de consentimento, barra de progresso, estado de limite, guardar o resultado do envio)
- novo `src/components/formularios/etapa-consentimento.tsx`
- `src/app/resposta/concluida/page.tsx` + novos componentes cliente (bloco do cupom, bloco de indicação, botão copiar)
- `src/app/f/[slug]/page.tsx` + `src/app/f/[slug]/loading.tsx` (tela de formulário travado)
- `src/app/privacidade/page.tsx`
- `src/lib/texts/publico.ts`
- `public/sw.js` (cachear `/privacidade` para abrir offline na etapa de consentimento; verificação, não só visual)

Painel
- `src/components/navegacao/areas.ts`, `src/components/navegacao/topo-admin.tsx`, `src/components/navegacao/painel.test.ts` (4ª área "Contatos")
- novas rotas `src/app/(painel)/admin/contatos/{page,loading,error}.tsx` e `src/components/contatos/*` (filtros, linha com revelar, botão de exportar), com base no `/demo` do Bussula
- `src/app/(painel)/admin/formularios/page.tsx` + novos componentes de módulos e de configuração do formulário, aviso de travado; possível interruptor nativo estilizado em `src/components/ui/`
- `src/lib/texts/admin.ts`
- `src/app/(painel)/admin/page.tsx` (aviso de travado na Visão Geral)

Nenhuma mudança em `globals.css` ou em tokens é necessária.

---

## Perguntas em aberto e pendências

1. Conteúdo dos 5 formulários: continua pendente (a spec não inventa nenhum). O texto do brinde de cada cupom é cadastrado pelo gerente no painel.
2. Envio do cupom no WhatsApp a quem não aceitou mensagens (seção 6) e base legal do cupom (seção 2): pendentes de confirmação do advogado. Se não confirmar, o botão "Enviar cupom no WhatsApp" sai e nada mais muda.
3. Textos legais (consentimento e `/privacidade`): ponto de partida, revisão do advogado.

## Decisões do dono incorporadas (2026-10-15)

Cupom sem aceitar mensagens; gerente cadastra nome/WhatsApp obrigatórios e destino da indicação; cupom visível na lista de contatos; código nunca reexibido; mensagem pré-preenchida no wa.me; módulos em leitura (gerente edita o brinde); offline mostra o cupom só com a página aberta; sem WhatsApp, sem cupom; aba "Contatos" aprovada; "Resultados & IA" mantido; cupom vale 30 dias.

Premissas aprovadas: um cupom por telefone por formulário, para sempre (mesmo depois de vencer); indicação vinda de formulário sem WhatsApp não é contada.

Alinhamento ao plano técnico aprovado (D1 a D14):
- Finalidades de consentimento `recompra` e `ofertas`, nenhuma obrigatória; não existe finalidade "cadastro" (seção 2).
- Novo tipo `nome`; contato sem nome aparece como "Sem nome" (seções 1 e 6).
- "Pular" no WhatsApp depende da configuração "WhatsApp obrigatório"; nome obrigatório exige WhatsApp obrigatório (seções 1 e 7).
- Configuração da loja (brinde até 120 caracteres, obrigatoriedades, destino da indicação só entre formulários ativos com WhatsApp): não gera versão do formulário e é auditada (seção 7). A caixa "Entendi" para WhatsApp opcional com cupom saiu: é só aviso.
- "Já emitido" sem código e sem validade (seção 3).
- Cupom na lista com situação (válido/vencido/sem cupom) e "Enviar cupom no WhatsApp" também para quem não aceitou mensagens: transacional, texto fixo, só com cupom válido, auditado, pendente do advogado (seção 6).
- Exportação CSV por `<form method="post">` com filtros ocultos (seção 6).
- Formulário travado responde 200 com `noindex`, não 503 (seção 5).
