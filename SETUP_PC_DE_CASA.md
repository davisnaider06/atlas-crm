# Setup No PC de Casa

Guia passo a passo para clonar o projeto, conectar no Neon e rodar o Atlas CRM em outra maquina.

## 1. O que instalar

Instale estes itens antes de clonar o projeto:

- Git
- .NET SDK 10
- Node.js 24+
- npm
- Docker Desktop

Se nao quiser rodar com Docker, ainda assim vale ter:

- PostgreSQL client ou algum editor SQL
- DBeaver, Beekeeper Studio, TablePlus ou pgAdmin

## 2. Clonar o repositorio

No terminal:

```bash
git clone <URL_DO_SEU_REPOSITORIO>
cd atlas_crm
```

Se o nome do repositorio for outro, entre na pasta correta depois do clone.

## 3. Criar o arquivo `.env`

Na raiz do projeto:

1. copie o arquivo `.env.example`
2. crie um novo arquivo chamado `.env`
3. cole os valores reais

Exemplo:

```env
ATLASCRM_DB_CONNECTION=Host=ep-xxxxxxx.us-east-1.aws.neon.tech;Port=5432;Database=atlascrm;Username=seu_usuario;Password=sua_senha;SSL Mode=Require;Trust Server Certificate=true
ATLASCRM_DB_AUTO_CREATE=false
ATLASCRM_JWT_ISSUER=AtlasCRM
ATLASCRM_JWT_AUDIENCE=AtlasCRM.Web
ATLASCRM_JWT_SECRET=troque-esta-chave-por-uma-bem-forte
ATLASCRM_FRONTEND_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:8080
```

## 4. Preparar o banco no Neon

Se o banco `atlascrm` ainda nao existir no Neon:

1. crie o projeto no Neon
2. crie o database `atlascrm`
3. abra o editor SQL do Neon

Depois:

1. execute o script [create_database.sql](c:\Users\davi.snaider\Documents\atlas_crm\database\create_database.sql) apenas se precisar criar o database manualmente fora do painel
2. execute o script [init.sql](c:\Users\davi.snaider\Documents\atlas_crm\database\init.sql)

O `init.sql` cria:

- tabelas
- relacionamentos
- indices
- dados seed

Credenciais demo depois do seed:

- Email: `admin@atlascrm.local`
- Senha: `Atlas@123`

## 5. Rodar com Docker

Na raiz do projeto:

```bash
docker compose up --build
```

Depois abra:

- Front: `http://localhost:3000/login`
- API: `http://localhost:8080`

Login demo:

```text
admin@atlascrm.local
Atlas@123
```

## 6. Rodar sem Docker

Se preferir subir API e front manualmente:

### Terminal 1

```bash
dotnet run --project src/API/AtlasCRM.API.csproj
```

### Terminal 2

```bash
cd web
npm install
npm run dev
```

Depois abra:

```text
http://localhost:3000/login
```

## 7. Fluxo diario de trabalho

Quando for continuar desenvolvimento no PC de casa:

```bash
git pull
```

Se houve mudanca em dependencias do front:

```bash
cd web
npm install
cd ..
```

Se houve mudanca no banco:

- veja se precisa rodar SQL novo no Neon
- por enquanto o projeto esta usando script SQL manual, nao migrations formais

## 8. Quando terminar o trabalho no PC de casa

Para salvar tudo no repositorio:

```bash
git status
git add .
git commit -m "sua mensagem"
git push
```

Depois, no outro PC:

```bash
git pull
```

## 9. Problemas comuns

### `.env` nao funciona

Confirme que:

- o arquivo esta na raiz do projeto
- o nome esta exatamente `.env`
- a connection string do Neon esta correta

### Login nao funciona

Confirme que:

- o `init.sql` foi executado no banco certo
- o usuario `admin@atlascrm.local` existe
- a senha seed e `Atlas@123`

### Front abre mas nao carrega dados

Confirme que:

- a API esta rodando em `http://localhost:8080`
- `NEXT_PUBLIC_API_URL` aponta para `http://localhost:8080`
- o CORS esta batendo com `ATLASCRM_FRONTEND_URL=http://localhost:3000`

### Banco local foi iniciado sem querer

Use apenas:

```bash
docker compose up --build
```

Esse compose principal foi ajustado para Neon.

Se quiser subir Postgres local separado, use:

```bash
docker compose -f docker-compose.local-db.yml up -d
```

## 10. Checklist rapido

Antes de trabalhar no PC de casa, valide:

1. repositorio clonado
2. `.env` criado
3. banco Neon pronto com `init.sql`
4. `docker compose up --build` funcionando
5. login no front funcionando
6. dashboard carregando
7. criacao de lead funcionando
