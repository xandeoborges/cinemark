# Cinemark Dashboard — Design

**Data:** 2026-09-16
**Status:** Aprovado

## Contexto

Dashboard de análise de dados para o cliente Cinemark, consumindo uma réplica
diária da base Taskrow no Supabase (projeto compartilhado com os outros
dashboards do workspace: we-trafego, we-criacao, we-rtvc, wedash-central).

- Projeto Supabase: `ecxtgqihsbyaquonemll.supabase.co` (mesmo dos demais)
- Tabelas de origem: `public.requesttypechange`, `public.requestdelivery`
- Filtro de cliente: `ClientDisplayName = 'Cinemark'` em ambas as tabelas
- RLS habilitado; app usa a anon key (chave pública, protegida por policy)
- Repositório: git **separado** (não faz parte do monorepo do workspace),
  em `/Users/user/antigravity/cinemark`. Sem deploy no Vercel por enquanto.

## Entendimento dos dados (validado contra a base real em 2026-09-16)

- `requesttypechange`: ~7.530 linhas para Cinemark, período jun–set/2026.
  **Granularidade: TaskID × Usuário × Dia** (uma tarefa trabalhada por várias
  pessoas em vários dias gera várias linhas). Consequência direta:
  - Soma de horas por pessoa: `SUM(SpentHours)` direto sobre as linhas brutas.
  - Qualquer métrica no nível de tarefa (volume de tarefas, tempo de
    execução, refação) precisa **deduplicar por `TaskID`** (pegar o
    snapshot mais recente por `DateCalendar`), senão conta a mesma tarefa
    várias vezes.
- `requestdelivery`: 354 linhas para Cinemark. Sem coluna de departamento ou
  usuário — liga a `requesttypechange` via `TaskNumber` (join confirmado
  funcionando na base real).
  - **Uma tarefa pode ter pessoas de mais de um departamento.** Premissa
    aprovada: uma entrega/tarefa conta para **todos os departamentos que
    trabalharam nela** (não é mutuamente exclusivo). Isso é intencional e
    aceito pelo usuário — não é um bug a corrigir depois.
- `RequestTypeClassificationName` já vem pronta para refações:
  `'Ajuste externo'` (cliente), `'Ajuste interno'`, `'Solicitação padrão'`.
- `FunctionGroupName` = departamento. Lista completa confirmada em produção
  (11 valores, incluindo a grafia real sem acento em "Grafica"):
  Atendimento, Conteúdo, Criação, Eventos, Finalização, Mídia, Planejamento,
  Produção Grafica, RTVC, WDI, WDI/BI.
  `GroupName` = equipe/squad dentro do departamento.
- A API REST do Supabase limita 1000 linhas por request — o fetch client-side
  precisa paginar com `.range()`.

## Arquitetura

Client-side puro (sem backend adicional). Mesmo padrão dos outros dashboards
do workspace; revisitamos para views SQL no Supabase apenas se a agregação
em memória virar gargalo ou fonte de bugs — não há indício disso hoje dado
o volume (~8k linhas totais).

### Stack

- Vite + React 19 + TypeScript
- Tailwind CSS (+ `tailwindcss-animate`), `lucide-react` para ícones
- `@tanstack/react-query` para cache do fetch (dado atualiza 1x/dia na
  origem — `staleTime` de horas, botão manual de "atualizar")
- `recharts` para gráficos (mesma lib usada no wedash-central)
- `@supabase/supabase-js` como client
- Testes: `bun test`. Lint: `oxlint`.
- Estrutura: `src/{components,hooks,lib,pages}`

### Camada de dados

- `.env` com `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`; `.env.example`
  versionado sem valores; `.env` no `.gitignore`.
- `src/lib/supabase.ts`: client único. Toda query filtra
  `ClientDisplayName=eq.Cinemark` — nunca busca a base inteira.
- Fetch com paginação (`.range()` em loop) para contornar o limite de 1000
  linhas/request do PostgREST.
- Normalização logo após o fetch, antes de qualquer componente consumir:
  - `tasksDedup`: uma linha por `TaskID` (snapshot mais recente por
    `DateCalendar`) — usada em volume de tarefas, tempo de execução,
    refações.
  - `timeEntries`: dados brutos (task × usuário × dia) — usada só para soma
    de horas por pessoa.
- Timezone: campos são `timestamptz`; conversão consistente para
  `America/Sao_Paulo` em todos os filtros e agrupamentos por dia/semana/mês.

## Telas e métricas

Layout: filtros globais no topo (intervalo de datas, padrão mês corrente; e
departamento `FunctionGroupName`, multi-select opcional), aplicáveis a todas
as abas. **Uma aba por seção** (não uma página única com scroll).

### Aba A — Equipe & Horas apontadas

- KPIs: total de horas no período, nº de pessoas ativas
- Barra horizontal: horas por pessoa (top 15 + "outros")
- Tabela: horas por pessoa × departamento

### Aba B — Volume de entregas & produtividade

- KPI: total de entregas (`SUM(Quantity)`) no período
- Linha do tempo: entregas por semana/mês
- Barras: entregas por tipo (`RequestTypeName`) e por grupo
  (`EffortUnitGroupName`)
- Entregas por departamento (via join por `TaskNumber`; tarefa conta em
  todos os departamentos envolvidos — ver premissa acima)

### Aba C — Tempo médio de execução

- Base: `tasksDedup`, apenas tarefas com `TaskClosingDate` preenchido;
  duração = `TaskClosingDate - TaskCreationDate`. Tarefas sem
  `TaskClosingDate` são excluídas do cálculo (não contam como zero).
- KPI: tempo médio geral
- Barras: tempo médio por departamento e por tipo de solicitação

### Aba D — Refações

- `RequestTypeClassificationName` sobre `tasksDedup`: Ajuste externo
  (cliente) vs. Ajuste interno vs. Solicitação padrão
- KPI: % de refação sobre o total de tarefas, com split cliente/interno
- Tendência de refações ao longo do tempo, por departamento

## Tratamento de erros

- Falha no fetch (rede, RLS): estado de erro por aba, com botão de retry —
  não derruba o dashboard inteiro.
- Paginação: falha em uma página do `.range()` faz retry individual antes
  de desistir.
- `FunctionGroupName`/`GroupName` nulos viram "Não informado" nos
  agrupamentos em vez de serem descartados.

## Testes

- `bun test` cobrindo as funções puras de `src/lib`: dedup por `TaskID`,
  agregação de horas, classificação de refação, cálculo de tempo de
  execução — é onde bugs de contagem duplicada aconteceriam.
- Sem E2E por enquanto, dado o escopo do projeto.

## Fora de escopo (por agora)

- Views/materialized views no Supabase (revisitar se necessário)
- Deploy (Vercel ou outro)
- Push para GitHub remoto (repo fica local até pedido explícito)
