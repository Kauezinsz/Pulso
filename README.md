# Pulso

Pulso é uma aplicação de finanças pessoais que roda integralmente na **Cloudflare**: frontend servido via Worker Assets, API em Cloudflare Workers, banco de dados em Cloudflare D1 e comprovantes no Cloudflare R2. Funciona no plano gratuito para uso pessoal (até ~3 usuários).

## Arquitetura

| Componente | Tecnologia |
|---|---|
| Frontend (HTML/CSS/JS) | Cloudflare Worker Assets (`./public/`) |
| API HTTP | Cloudflare Worker (`src/index.js`) |
| Banco de dados | Cloudflare D1 (`pulso-db`) |
| Comprovantes (uploads) | Cloudflare R2 (`pulso-receipts`) |
| Sessão | Cookie `HttpOnly; Secure; SameSite=Lax` |

## Desenvolvimento local

```bash
npm install
npm run db:migrate:local
npm run dev
```

O Wrangler inicia um servidor local com D1 e R2 simulados. Acesse a URL que aparecer no terminal (normalmente `http://localhost:8787`).

> **Atenção:** O arquivo `server.cjs` é o servidor Node.js legado e **não deve ser usado** no ambiente Cloudflare. Ele permanece no repositório apenas para referência histórica.

## Deploy na Cloudflare

### 1. Pré-requisitos

- Conta Cloudflare gratuita
- Node.js ≥ 22.5.0

### 2. Login e criação dos recursos

```bash
npx wrangler login

# Criar o banco D1
npx wrangler d1 create pulso-db
# Copie o database_id exibido e coloque em wrangler.jsonc

# Criar o bucket R2
npx wrangler r2 bucket create pulso-receipts
```

### 3. Configurar o `wrangler.jsonc`

Preencha o `database_id` retornado pelo comando acima no arquivo `wrangler.jsonc`:

```jsonc
"d1_databases": [
  {
    "binding": "DB",
    "database_name": "pulso-db",
    "database_id": "SEU_ID_AQUI"  // ← preencher aqui
  }
]
```

### 4. Aplicar as migrations no banco remoto

```bash
npm run db:migrate:remote
```

### 5. Criar o segredo de sessão

```bash
npx wrangler secret put SESSION_SECRET
# Digite um valor longo e aleatório — nunca coloque no repositório
```

### 6. Deploy

```bash
npm run deploy
```

Após o deploy, acesse `https://pulso.<seu-subdominio>.workers.dev`.

---

> **⚠️ Importante:** Apagar ou recriar o Worker **não apaga** o D1 nem o R2. Os dados ficam nos serviços da Cloudflare independentemente do Worker. Para apagar os dados, você precisa explicitamente deletar o banco D1 ou o bucket R2 no painel da Cloudflare ou via wrangler.

---

## Migração de dados do SQLite local

Se você tinha dados no `server.cjs` antigo (arquivo `data/pulso.sqlite`), use o script de migração:

```bash
# Primeiro faça backup!
cp data/pulso.sqlite data/pulso.sqlite.bak

# Migrar para D1 local (teste primeiro)
node scripts/export-sqlite-to-d1.mjs

# Migrar para D1 remoto (produção — executar apenas uma vez)
node scripts/export-sqlite-to-d1.mjs --remote
```

O script é idempotente: reexecutar não duplica registros. Senhas (salt + hash) são migradas como estão; usuários precisarão fazer login novamente após a migração.

**Comprovantes (uploads):** os arquivos em `data/uploads/` precisam ser enviados manualmente ao R2 se quiser preservá-los.

## Fluxo de autenticação

- `POST /auth/register` — cria conta e sessão
- `POST /auth/login` — valida credenciais e cria sessão
- `POST /auth/logout` — invalida sessão e limpa cookie
- `GET /auth/me` — retorna usuário autenticado ou 401

## Endpoints da API

- `GET /api/bootstrap` — estado inicial do usuário (ciclo, categorias, movimentos, metas, compromissos)
- `GET|POST /api/categories` + `PUT|DELETE /api/categories/:id`
- `GET|POST /api/movements` + `PUT|DELETE /api/movements/:id`
- `GET|POST|DELETE /api/movements/:id/receipt` — comprovante via R2
- `GET|POST /api/cycles` + `POST /api/cycles/close`
- `GET|POST /api/goals` + `PUT|DELETE /api/goals/:id`
- `POST /api/goals/:id/save` + `POST /api/goals/:id/remove`
- `GET|POST /api/commitments` + `PUT|DELETE /api/commitments/:id`
- `POST /api/commitments/:id/complete|reopen|convert-to-movement`
- `POST /api/import/local`

## Observações de segurança

- O backend sempre deriva o `user_id` pelo cookie de sessão — nunca aceita `userId` do frontend.
- Senhas armazenadas com PBKDF2 + salt aleatório via Web Crypto API.
- Tokens de sessão armazenados apenas como hash SHA-256 no D1.
- Comprovantes servidos exclusivamente por rota autenticada — sem URLs públicas permanentes.
