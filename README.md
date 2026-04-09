# Atlas CRM

CRM SaaS com ASP.NET Core, PostgreSQL e Next.js.

## Stack

- Backend: ASP.NET Core Web API
- Frontend: Next.js App Router
- Banco: PostgreSQL
- Auth: JWT + Refresh Token
- Arquitetura: Clean Architecture
- WhatsApp: Evolution API via QR Code + campanhas por planilha

## Estrutura

```text
/src
  /Domain
  /Application
  /Infrastructure
  /API
/web
/database
```

## Credenciais demo

- Email: `admin@atlascrm.local`
- Senha: `Atlas@123`

## Neon

Se voce vai usar Neon, copie [.env.example](c:\Users\davi.snaider\Documents\atlas_crm\.env.example) para `.env` na raiz e preencha:

- `ATLASCRM_DB_CONNECTION`
- `ATLASCRM_DB_AUTO_CREATE=false`
- `ATLASCRM_JWT_SECRET`

Use uma connection string no formato:

```text
Host=ep-xxxxxxx.us-east-1.aws.neon.tech;Port=5432;Database=atlascrm;Username=seu_usuario;Password=sua_senha;SSL Mode=Require;Trust Server Certificate=true
```

## Banco manual

Scripts prontos:

- Criar banco: [create_database.sql](c:\Users\davi.snaider\Documents\atlas_crm\database\create_database.sql)
- Criar tabelas, indices e seed: [init.sql](c:\Users\davi.snaider\Documents\atlas_crm\database\init.sql)

Se o database `atlascrm` ja existir no Neon, execute apenas o `init.sql`.

## Rodando com Neon e Docker

```bash
docker compose up --build
```

API: `http://localhost:8080`

Web: `http://localhost:3000`

## Rodando com Neon sem Docker

```bash
dotnet run --project src/API/AtlasCRM.API.csproj
cd web
npm install
npm run dev
```

## Banco local opcional

Se quiser subir Postgres local de apoio, use:

```bash
docker compose -f docker-compose.local-db.yml up -d
```

O script [init.sql](c:\Users\davi.snaider\Documents\atlas_crm\database\init.sql) e executado automaticamente no primeiro start desse container.

## Fase 4

O projeto agora cobre:

- dashboard com dados reais de leads, negocios, atividades e origem dos leads
- CRUD operacional de leads, negocios, atividades e automacoes
- historico por lead e negocio
- configuracao de tema claro/escuro
- modulo dedicado `Conectar WhatsApp`
- conexao por QR Code usando Evolution API
- captura de leads por webhook do WhatsApp
- disparo em massa por planilha Excel/CSV
- endpoint de healthcheck em `GET /health`

## WhatsApp

Para o QR Code e disparos funcionarem em producao:

1. Suba sua Evolution API
2. No CRM, abra `Conectar WhatsApp`
3. Preencha:
   - `API Base URL`
   - `API Token`
   - `Nome da instancia`
   - `Webhook URL`
4. Salve a configuracao
5. Clique em `Gerar QR Code`
6. Escaneie com o WhatsApp
7. Importe uma planilha com colunas `nome` e `telefone`
8. Envie a campanha

Webhook de captura:

```text
POST /whatsapp/webhook/{companyId}
```

Payload simples aceito:

```json
{
  "event": "messages.upsert",
  "phoneNumber": "5511999999999",
  "pushName": "Lead capturado",
  "messageText": "Oi, quero saber mais"
}
```
