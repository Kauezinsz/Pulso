# Pulso

Pulso agora roda com autenticação de usuário, backend em Node.js e banco SQLite local. Cada conta tem seus próprios dados, categorias e movimentações, com sessão persistente por cookie.

## Arquitetura

- Frontend: HTML, CSS e JS puro, mantendo a interface mobile-first e dark premium.
- Backend: `server.cjs`, que serve os arquivos estáticos e expõe a API.
- Banco: SQLite em `data/pulso.sqlite`.
- Sessão: cookie `HttpOnly` com token armazenado com hash no banco.

### Principais tabelas

- `users`: e-mail único, senha com hash, timestamps.
- `sessions`: sessões persistentes por usuário.
- `categories`: categorias por usuário e por tipo.
- `movements`: lançamentos por usuário com vínculo à categoria.

## Como rodar

1. Abra o terminal na pasta do projeto.
2. Inicie o servidor:

```powershell
node server.cjs
```

3. Abra:

```text
http://127.0.0.1:4173/
```

### Variáveis opcionais

- `PORT` ou `PULSO_PORT`: porta do servidor.
- `PULSO_DB_PATH`: caminho do arquivo SQLite.

## Fluxo de autenticação

- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/logout`
- `GET /auth/me`

O front usa `GET /auth/me` no boot. Se a sessão existir, carrega os dados do usuário autenticado; se não existir, mostra a tela de login/cadastro.

## Migração dos dados locais

O Pulso procura dados antigos no `localStorage` deste navegador.

Fluxo:

1. Usuário faz login ou cadastro.
2. O app detecta dados locais antigos, se existirem.
3. O sheet de migração aparece com a pergunta de importação.
4. Ao confirmar, o snapshot local é enviado para `POST /api/import/local`.
5. O backend cria categorias faltantes, importa os lançamentos sem duplicar e associa tudo ao usuário autenticado.
6. Depois da importação, os dados locais são limpos e o banco vira a fonte de verdade.

### Comportamento de conflito

- Categorias já existentes no banco são reaproveitadas.
- Movimentações com `sourceKey` já importado são ignoradas.
- A importação é idempotente o suficiente para evitar duplicação acidental.

## Como testar cadastro, login e logout

1. Abra o app.
2. Cadastre uma conta com e-mail e senha.
3. Verifique se a interface principal abre autenticada.
4. Faça logout pelo botão do topo.
5. Faça login novamente com a mesma conta.

## Como testar persistência e sincronização

### Persistência local da sessão

1. Crie uma movimentação.
2. Recarregue a página.
3. O mesmo usuário e os mesmos dados devem continuar visíveis.

### Sincronização entre sessões/dispositivos

1. Faça login com a mesma conta em outra sessão limpa.
2. O `GET /api/bootstrap` deve retornar os mesmos lançamentos e categorias.
3. A mesma conta deve enxergar os mesmos dados independentemente do navegador/dispositivo.

## Endpoints principais de dados

- `GET /api/bootstrap`
- `GET /api/categories`
- `POST /api/categories`
- `PUT /api/categories/:id`
- `DELETE /api/categories/:id`
- `GET /api/movements`
- `POST /api/movements`
- `PUT /api/movements/:id`
- `DELETE /api/movements/:id`
- `POST /api/import/local`

## Observações

- O backend sempre deriva o usuário pela sessão autenticada.
- Não há confiança em `userId` vindo do front.
- O app continua PWA instalável.

