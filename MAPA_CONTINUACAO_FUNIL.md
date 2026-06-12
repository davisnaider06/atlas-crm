# 🗺️ Mapa de continuação — Processo comercial (funil de 7 etapas)

> Documento de handoff para continuar no PC de casa. Última atualização: 2026-06-12.

## 0. Estado atual (LEIA PRIMEIRO)

✅ **A implementação está PRONTA e já foi mergeada na `main`** (Pull Request #1, commit `c03ca43`).
Em casa, é só clonar/puxar a `main` que já vem tudo.

```bash
git clone https://github.com/davisnaider06/atlas-crm.git
cd atlas_crm
# ou, se já tiver clonado:
git checkout main && git pull
```

O que já foi feito (resumo): funil de 7 etapas no Lead, campos novos do lead,
fechar→receita automática no financeiro, follow-up automático (D+2/D+5/D+10→Frio
e D+1/D+3/D+7), tela "Hoje", métricas no dashboard. Detalhe arquivo-por-arquivo:
veja a seção 5.

---

## 1. Subir o projeto em casa

Pré-requisitos e passo a passo completos já existem em **`SETUP_PC_DE_CASA.md`**.
Resumo rápido:

1. Instalar: Git, .NET SDK 10, Node 24+, Docker Desktop.
2. Criar `.env` na raiz (copiar de `.env.example`).
3. **Banco** — a forma mais simples (Postgres local em container):
   ```bash
   docker compose -f docker-compose.local-db.yml up -d
   ```
4. **Backend** (porta 8080) — na 1ª vez, deixe o schema ser criado automaticamente:
   ```bash
   # PowerShell:
   $env:Database__AutoCreateSchema="true"; dotnet run --project src/API
   ```
   O startup cria as colunas novas e roda a **migração dos status antigos → 7 etapas**
   sozinho (idempotente, controlado pela tabela `schema_migrations`).
5. **Frontend** (porta 3000):
   ```bash
   cd web && npm install && npm run dev
   ```
   Login/registro pela tela; o frontend aponta para a API via `NEXT_PUBLIC_API_URL`.

---

## 2. O que JÁ foi verificado (não precisa refazer)

Testado de verdade contra Postgres real + API rodando:

- Lead novo nasce em "Mapeado"; campos novos (canal, empresa, @) salvam.
- Mover → Prospectado agenda follow-up D+2; avançar leva a D+5, D+10 e depois "Frio".
- Fechar **sem** valor de contrato → bloqueado (erro 400). Perder **sem** motivo → bloqueado.
- Fechar com valor → cria 1 receita no financeiro vinculada ao lead (não duplica ao re-fechar).
- Dashboard: receita do mês, fechamentos e métricas da semana batem.
- Migração dos 9 status antigos → 7 etapas confere com o mapa aprovado.
- Endpoints antigos (/negocios, /pipelines, /clientes, /atividades, /agenda) → 200 (nada quebrou).
- Backend compila (0 erro/0 aviso); `next build` passa.

---

## 3. O que FALTA — QA visual no navegador (checklist)

Eu testei a API e os builds, mas **não cliquei na interface como usuário**. Faça este passo a passo em casa:

- [ ] **/leads** — ver as 7 colunas do funil; arrastar um card entre colunas.
- [ ] **/leads** — criar lead com canal/empresa/@; conferir que aparece em "Mapeado".
- [ ] **/leads** — arrastar um card para "Fechado/Perdido": deve abrir o modal de desfecho.
- [ ] Modal — "Fechado" sem valor não deixa confirmar; com valor, confirma.
- [ ] Modal — "Perdido" exige escolher o motivo (lista fixa).
- [ ] Abrir o lead → botão **"Registrar follow-up"** (em Prospectado/Proposta) muda a data.
- [ ] **/financeiro** — conferir que o contrato fechado virou receita.
- [ ] **/dashboard** — ver a seção "Processo comercial" (semana + receita do mês).
- [ ] **/hoje** — abrir no **celular** (ou modo responsivo do navegador): lista de follow-ups do dia, do mais atrasado ao mais recente.
- [ ] Conferir que **/pipeline** (negócios antigos) continua funcionando normal.

> Dica: dá pra eu (Claude) rodar o app e te mandar prints — é só pedir "/run" ou "rode o app e me mostre a tela /hoje".

---

## 4. Decisões e limitações conhecidas (pra você decidir depois)

- **/pipeline (negócios/deals) continua existindo** lado a lado com o funil de leads — foi decisão sua manter. Se quiser, dá pra esconder do menu depois.
- **"Frio" é manual**: o lead vira "Frio" quando você clica "Registrar follow-up" após o D+10. Não há um robô que marca sozinho quando a data vence (o sistema não tem job agendado hoje). *Melhoria futura possível: um job diário que marca como Frio automaticamente.*
- **Semana das métricas** = segunda a domingo (semana corrente). **Mês** = do dia 1º até hoje.
- **Receita** é lançada **1x** por lead no fechamento. Se o valor do contrato mudar depois, o lançamento não é atualizado automaticamente. *Melhoria futura possível.*
- O campo antigo `LeadStatus` foi **mantido** e é sincronizado (Fechado→Converted, Perdido→Lost) pra não quebrar telas/relatórios antigos.

---

## 5. Mapa de arquivos (onde mexer se precisar)

**Backend (`src/`)**
- Etapas/desfecho/motivos: `Domain/Enums/FunnelStage.cs`, `FunnelOutcome.cs`, `LossReason.cs`
- Campos do lead: `Domain/Entities/Lead.cs` · receita↔lead: `Domain/Entities/FinanceEntry.cs`
- Regras (mover, fechar→financeiro, follow-up): `Application/Services/LeadService.cs`
- Métricas: `Application/Services/DashboardService.cs` + `Contracts/Dashboard/DashboardDto.cs`
- Endpoints novos: `API/Controllers/LeadsController.cs` (`/leads/{id}/move`, `/leads/{id}/followup`)
- Banco (colunas + migração): `Infrastructure/Persistence/DatabaseInitializer.cs` e `AtlasCrmDbContext.cs`

**Frontend (`web/`)**
- Funil + campos + modal de fechamento: `src/app/leads/page.tsx`
- Tela do dia: `src/app/hoje/page.tsx` · Menu/título: `src/components/auth/app-frame.tsx`
- Dashboard: `src/app/dashboard/page.tsx`
- Tipos/listas/API: `src/lib/types.ts`, `src/lib/constants.ts`, `src/lib/api.ts`
- Estilos: `src/app/globals.css` (procure "Processo comercial", "today-", "lead-detail-stagebar")

---

## 6. Ideias de próximos passos (opcionais, não obrigatórios)

1. Job diário que marca leads "Frios" automaticamente quando o D+10 vence sem ação.
2. Filtro por etapa / por canal na lista de leads.
3. Atualizar a receita se o valor do contrato for editado após o fechamento.
4. Esconder o `/pipeline` antigo do menu, se o funil de leads passar a ser o único usado.
5. Gráfico de conversão por etapa (funil visual) no dashboard.
