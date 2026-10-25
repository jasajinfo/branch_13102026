
O projeto utiliza dois serviços NestJS: um API Gateway, responsável pelas requisições HTTP, e um Users Service, que concentra as regras de negócio e a persistência com Prisma e PostgreSQL. A comunicação interna ocorre por TCP. Essa estrutura permite compreender os fundamentos de microsserviços antes de avançar para RabbitMQ, Kafka ou NATS.

# Nest Microservices — API Gateway e Users Service

Projeto didático de microsserviços com **NestJS**, comunicação interna por **TCP**, persistência com **Prisma ORM 7** e banco **PostgreSQL**.

O API Gateway recebe requisições HTTP. O Users Service concentra as regras de negócio de usuários e o acesso ao banco. A primeira etapa utiliza dados em memória; a versão com Prisma armazena os registros no PostgreSQL.

## Arquitetura

| Componente | Responsabilidade | Endereço local |
|---|---|---|
| Cliente HTTP / Bruno | Enviar requisições e verificar respostas | Acessa o Gateway |
| API Gateway | Expor rotas HTTP e encaminhar mensagens | `http://localhost:3000` |
| Users Service | Processar mensagens, validar e persistir usuários | TCP em `127.0.0.1:3001` |
| PostgreSQL | Armazenar os registros | `127.0.0.1:15432` no Windows; porta `5432` no contêiner |

```mermaid
sequenceDiagram
    participant C as Cliente HTTP
    participant G as API Gateway
    participant U as Users Service
    participant D as PostgreSQL
    C->>G: GET /users
    G->>U: TCP — users.findAll
    U->>D: Prisma — findMany()
    D-->>U: Registros
    U-->>G: Resultado da mensagem
    G-->>C: HTTP 200 e JSON
```

O Gateway não acessa o banco diretamente. A comunicação TCP é uma introdução à troca de mensagens entre processos, antes de explorar transportes como RabbitMQ, Kafka ou NATS. O exercício atual não precisa de um broker de mensagens.

## Tecnologias e requisitos

- Node.js 22 atualizado ou Node.js 24; ambiente utilizado: Node.js 24.21.0.
- npm.
- NestJS 11 e Nest CLI 11 para a criação deste exemplo.
- `@nestjs/microservices` compatível com a versão principal do NestJS.
- Prisma CLI, Client e adaptador PostgreSQL: **7.10.1**.
- PostgreSQL 16 em Docker.
- Docker Desktop em execução.
- VS Code e, opcionalmente, Bruno.

Os exemplos de terminal deste README usam **PowerShell**. Execute os comandos na raiz do projeto, onde está o `package.json`. Código TypeScript deve ser salvo nos arquivos indicados, e não executado diretamente no terminal.

## Organização dos arquivos

| Caminho | Conteúdo |
|---|---|
| `apps/api-gateway/src/main.ts` | Inicialização HTTP na porta 3000 |
| `apps/api-gateway/src/app.module.ts` | Registro do cliente TCP `USERS_SERVICE` |
| `apps/api-gateway/src/users.controller.ts` | Rotas HTTP de usuários |
| `apps/users/src/main.ts` | Inicialização do microserviço TCP e carregamento do `.env` |
| `apps/users/src/users.module.ts` | Registro do controller, UsersService e PrismaService |
| `apps/users/src/users.controller.ts` | Handlers com `@MessagePattern()` |
| `apps/users/src/users.service.ts` | Regras de negócio e consultas Prisma |
| `apps/users/src/prisma/prisma.service.ts` | Cliente Prisma e ciclo de conexão |
| `apps/users/src/generated/prisma/` | Cliente gerado automaticamente |
| `prisma/schema.prisma` | Modelo de dados e configuração do gerador |
| `prisma/migrations/` | Histórico versionado de alterações do banco |
| `prisma.config.ts` | Configuração do Prisma CLI |
| `webpack.config.js` | Resolução dos imports do cliente Prisma no monorepo |
| `.env` | URL de conexão local |

Evite pastas duplicadas como `apps/users/src/src`. Os nomes e caminhos dos arquivos devem coincidir com os imports.

## Criação inicial do monorepo

Esta seção é para recriar a estrutura do zero. Se o projeto já existe, avance para a instalação.

```powershell
cd "$env:USERPROFILE\Documents"
npx @nestjs/cli@11 new api-gateway --directory nest-microservices --package-manager npm
cd nest-microservices
npx nest generate app users
code .
```

A primeira aplicação já é o Gateway. Gerar `users` converte a estrutura em monorepo com duas aplicações. Criar uma aplicação chamada `nest-microservices` e depois gerar `api-gateway` e `users` também mantém a aplicação inicial, totalizando três aplicações.

## Instalação

Para executar uma cópia existente do projeto:

```powershell
npm install
```

Durante a montagem inicial, as dependências utilizadas são:

```powershell
npm install @nestjs/microservices@11
npm install -D prisma@7.10.1 @types/pg @types/node
npm install @prisma/client@7.10.1 @prisma/adapter-pg@7.10.1 pg dotenv
```

## PostgreSQL com Docker

Na primeira configuração, crie o contêiner:

```powershell
docker run --name postgres-users -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=users_db -p 127.0.0.1:15432:5432 -v postgres_users_data:/var/lib/postgresql/data -d postgres:16
```

As credenciais são destinadas ao exercício local. A porta 15432 foi escolhida porque as portas 5432 e 5433 estavam ocupadas no ambiente de desenvolvimento.

Se o contêiner já existe, inicie-o em vez de executar novamente o comando de criação:

```powershell
docker start postgres-users
```

Confira as portas e a disponibilidade:

```powershell
docker port postgres-users
docker exec postgres-users pg_isready -U postgres -d users_db
```

O mapeamento esperado é `127.0.0.1:15432` para a porta interna `5432`. Aguarde a resposta `accepting connections`.

Neste exercício, apenas o banco roda no Docker. Gateway e Users Service rodam nos terminais do Windows.

## Variáveis de ambiente

Crie e salve um arquivo `.env` na raiz:

```env
DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:15432/users_db?schema=public"
```

Em `apps/users/src/main.ts`, carregue o arquivo antes dos demais imports:

```typescript
import 'dotenv/config';
```

Não publique o `.env`. Acrescente ao `.gitignore`:

```gitignore
.env
/apps/users/src/generated/
```

Versione `prisma/schema.prisma`, `prisma.config.ts`, `webpack.config.js` e todo o diretório `prisma/migrations/`, incluindo `migration_lock.toml`.

## Configuração do Prisma 7

Arquivo `prisma.config.ts`:

```typescript
import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: env('DATABASE_URL'),
  },
});
```

Arquivo `prisma/schema.prisma`:

```prisma
generator client {
  provider     = "prisma-client"
  output       = "../apps/users/src/generated/prisma"
  moduleFormat = "cjs"
}

datasource db {
  provider = "postgresql"
}

model User {
  id        Int      @id @default(autoincrement())
  name      String
  createdAt DateTime @default(now())
}
```

Valide e prepare o banco de desenvolvimento:

```powershell
npx prisma validate --config ./prisma.config.ts
npx prisma migrate dev --config ./prisma.config.ts
npx prisma generate --config ./prisma.config.ts
```

Ao criar o primeiro histórico em um banco novo, use `npx prisma migrate dev --name create_users --config ./prisma.config.ts`. Em uma cópia existente, mantenha as migrações já versionadas.

`prisma generate` gera código e não confirma a conexão com o banco. Execute-o após alterações no schema e após instalar o projeto quando necessário.

### PrismaService e injeção de dependências

O PrismaService importa o cliente de `../generated/prisma/client`, utiliza `PrismaPg` com `DATABASE_URL` e chama `super({ adapter })`. Ele conecta em `onModuleInit()` e desconecta em `onModuleDestroy()`.

No arquivo `apps/users/src/users.module.ts`, registre ambos os serviços:

```typescript
import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { PrismaService } from './prisma/prisma.service';

@Module({
  controllers: [UsersController],
  providers: [UsersService, PrismaService],
})
export class UsersModule {}
```

No `users.service.ts`, o caminho do import é `./prisma/prisma.service`.

## Ajuste do Webpack

O cliente Prisma gera arquivos TypeScript com referências internas terminadas em `.js`. A configuração abaixo permite ao Webpack resolver essas referências nos arquivos `.ts`.

Arquivo `webpack.config.js`, na raiz:

```javascript
module.exports = function (options) {
  return {
    ...options,
    resolve: {
      ...options.resolve,
      extensionAlias: {
        ...options.resolve?.extensionAlias,
        '.js': ['.ts', '.js'],
      },
    },
  };
};
```

Não edite manualmente os arquivos de `generated/prisma`.

## Execução das aplicações

Abra dois terminais na raiz do projeto.

**Terminal 1 — Users Service:**

```powershell
npx nest start users --watch --webpack --webpackPath webpack.config.js
```

**Terminal 2 — API Gateway:**

```powershell
npx nest start api-gateway --watch --webpack --webpackPath webpack.config.js
```

Mantenha os dois processos ativos. Para parar cada um, pressione `Ctrl+C` no terminal correspondente.

Para compilar sem iniciar:

```powershell
npx nest build users --webpack --webpackPath webpack.config.js
npx nest build api-gateway --webpack --webpackPath webpack.config.js
```

## Rotas e mensagens

| Método HTTP | Rota | Mensagem TCP | Operação Prisma |
|---|---|---|---|
| GET | `/users` | `users.findAll` | `user.findMany()` |
| GET | `/users/:id` | `users.findOne` | `user.findUnique()` |
| POST | `/users` | `users.create` | `user.create()` |

O Gateway usa `ClientProxy.send(pattern, payload)`. O Users Controller recebe a mensagem pelo mesmo nome em `@MessagePattern(pattern)` e delega ao UsersService.

`send()` e `@MessagePattern()` implementam requisição e resposta. Para eventos sem resposta, o NestJS oferece `emit()` e `@EventPattern()`.

### Cadastro

```http
POST http://localhost:3000/users
Content-Type: application/json
```

```json
{
  "name": "Ana"
}
```

Resposta esperada: HTTP **201 Created**, com `id`, `name` e `createdAt`. O ID é gerado pelo banco e pode variar.

O serviço aceita um nome com 1 a 100 caracteres após remover espaços nas extremidades. A consulta por ID exige um inteiro positivo e verifica a existência do usuário.

Na versão didática com encaminhamento simples, erros de `RpcException` ainda podem resultar em HTTP 500. Traduzir os erros RPC para HTTP 400/404 e diferenciar indisponibilidade são melhorias futuras.

## Testes no Bruno

1. Crie uma coleção chamada **Nest Microservices**.
2. Crie uma requisição **GET** para `http://localhost:3000/users` e envie. Espere HTTP **200**; `[]` indica uma tabela vazia.
3. Crie uma requisição **POST** para o mesmo endereço.
4. Na aba **Body**, selecione **JSON** e informe `{"name":"Ana"}`. Confira `Content-Type: application/json` e envie.
5. Anote o ID retornado e consulte-o com **GET** em `/users/ID`, substituindo `ID` pelo número recebido.
6. Repita o cadastro com `{"name":"Carlos"}` e execute novamente a listagem.

O Bruno envia HTTP ao Gateway na porta **3000**. A porta **3001** utiliza o protocolo TCP do NestJS e não é uma URL HTTP.

## Testes pelo PowerShell

```powershell
$body = @{ name = "Ana" } | ConvertTo-Json
Invoke-RestMethod -Uri "http://localhost:3000/users" -Method Post -ContentType "application/json" -Body $body
Invoke-RestMethod -Uri "http://localhost:3000/users" -Method Get
```

Para consultar um usuário, use o ID retornado no cadastro. Por exemplo, se o ID for 1:

```powershell
Invoke-RestMethod -Uri "http://localhost:3000/users/1" -Method Get
```

### Verificação de persistência

Cadastre um usuário, pare apenas o Users Service, inicie-o novamente e repita a listagem. O registro deve permanecer no banco. Os usuários Ana e Carlos usados na etapa em memória não são migrados automaticamente.

Para consultar diretamente o PostgreSQL:

```powershell
docker exec -it postgres-users psql -U postgres -d users_db
```

No prompt do PostgreSQL:

```sql
SELECT * FROM "User" ORDER BY id;
```

Digite `\q` para sair. Para uma interface visual, execute `npx prisma studio --config ./prisma.config.ts` e abra o endereço informado no terminal.

## Solução de problemas

| Problema | Correção |
|---|---|
| Arquivo de configuração não encontrado | Salve `prisma.config.ts` na raiz; abrir com `code` não salva automaticamente. |
| Schema não encontrado | Confira se `prisma/schema.prisma` foi salvo e se o terminal está na raiz. |
| P1012 no início de um schema aparentemente correto | Verifique a codificação UTF-8 sem BOM. |
| `Can't resolve './internal/class.js'` ou `enums.js` | Confira `webpack.config.js` e use os comandos com `--webpackPath`. |
| Nest não resolve `PrismaService` | Inclua `PrismaService` em `providers` do UsersModule. |
| Método `create` ausente | Implemente `create()` no UsersService chamado pelo controller. |
| Import de PrismaService não encontrado | Confira o arquivo em `src/prisma/prisma.service.ts` e o import `./prisma/prisma.service`. |
| Import do UsersController não encontrado | Confira o nome plural `users.controller.ts` na mesma pasta do módulo. |
| HTTP 404 em POST `/users` | Confira `@Post()` no Gateway e o registro do controller no módulo. |
| Conexão recusada na porta 3000 | Inicie o Gateway. |
| Falha TCP ou timeout | Confira o Users Service na porta 3001 e os terminais de ambas as aplicações. |
| Falha de conexão com o PostgreSQL | Confira contêiner, credenciais e porta 15432 no `.env`. |
| Porta Docker indisponível | Confira portas ocupadas e reservadas antes de alterar o mapeamento e a URL. |
| Aviso no editor, mas build passa | Salve tudo e execute `TypeScript: Restart TS Server` no VS Code. |

### UTF-8 sem BOM no Windows PowerShell

No Windows PowerShell 5.1, `Set-Content -Encoding utf8` pode adicionar BOM. Para regravar o schema sem essa marca:

```powershell
$schemaPath = Join-Path (Get-Location).Path 'prisma\schema.prisma'
$schemaContent = [System.IO.File]::ReadAllText($schemaPath)
$utf8SemBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($schemaPath, $schemaContent, $utf8SemBom)
npx prisma validate --config ./prisma.config.ts
```

### Migração aplicada, mas ausente localmente

Se o banco já tem uma migração e o diretório local não a contém, restaure os arquivos originais de `prisma/migrations/` a partir do repositório ou do projeto que criou o banco. Preserve os nomes das pastas e o SQL original.

Depois, confira:

```powershell
npx prisma migrate status --config ./prisma.config.ts
npx prisma migrate dev --config ./prisma.config.ts
```

`prisma migrate reset` apaga os dados do banco de desenvolvimento. Não o utilize como correção automática para um histórico ausente.

## Escopo e próximos passos

Este projeto demonstra separação de responsabilidades, dois processos NestJS, mensagens TCP e persistência. A validação descrita neste README é manual; não equivale a uma suíte automatizada validada.

Possíveis evoluções:

- Padronizar contratos e tipos das mensagens.
- Mapear erros RPC para respostas HTTP adequadas.
- Adicionar atualização e exclusão de usuários.
- Automatizar testes de integração e de ponta a ponta.
- Adicionar autenticação, autorização e observabilidade.
- Explorar RabbitMQ, Kafka ou NATS conforme os requisitos.

## Referências

- [Monorepos no NestJS](https://docs.nestjs.com/cli/monorepo)
- [Microsserviços no NestJS](https://docs.nestjs.com/microservices/basics)
- [Prisma ORM 7](https://www.prisma.io/docs/orm/v7)
- [Resolução de módulos no Webpack](https://webpack.js.org/configuration/resolve/)
- [Documentação do Bruno](https://docs.usebruno.com/)
