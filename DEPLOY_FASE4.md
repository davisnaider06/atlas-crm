# Deploy Fase 4

## 1. Banco

- Use Neon com o schema ja criado por `database/init.sql`
- Connection string no formato Npgsql:

```text
Host=ep-seu-projeto.us-east-1.aws.neon.tech;Port=5432;Database=atlascrm;Username=seu_usuario;Password=sua_senha;SSL Mode=Require;Trust Server Certificate=true
```

## 2. Variaveis

Crie `.env` na raiz:

```env
ATLASCRM_DB_CONNECTION=Host=ep-seu-projeto.us-east-1.aws.neon.tech;Port=5432;Database=atlascrm;Username=seu_usuario;Password=sua_senha;SSL Mode=Require;Trust Server Certificate=true
ATLASCRM_DB_AUTO_CREATE=false
ATLASCRM_JWT_ISSUER=AtlasCRM
ATLASCRM_JWT_AUDIENCE=AtlasCRM.Web
ATLASCRM_JWT_SECRET=troque-por-uma-chave-longa-e-segura-com-32-caracteres-ou-mais
ATLASCRM_FRONTEND_URL=https://seu-front.com
NEXT_PUBLIC_API_URL=https://sua-api.com
```

## 3. Subida com Docker

```bash
docker compose up --build -d
```

## 4. Verificacao

- API: `GET /health`
- Front: abrir `/login`
- Login demo:
  - `admin@atlascrm.local`
  - `Atlas@123`

## 5. WhatsApp

Para o modulo `Conectar WhatsApp`:

1. Tenha uma Evolution API propria em producao
2. No CRM, salve `API Base URL`, `API Token` e `Nome da instancia`
3. Gere o QR Code no modulo
4. Escaneie no WhatsApp
5. Configure o webhook:

```text
https://sua-api.com/whatsapp/webhook/{companyId}
```

## 6. Campanhas por planilha

- Formato aceito no front:
  - `.xlsx`
  - `.xls`
  - `.csv`
- Colunas esperadas:
  - `nome`
  - `telefone`
