NestJS Microservices — Parte 2

Projeto didático de uma arquitetura de microserviços com NestJS, Prisma 7 e PostgreSQL. A aplicação possui um API Gateway HTTP, um serviço de usuários e um serviço de pedidos. A comunicação interna entre os serviços utiliza o transporte TCP nativo do NestJS.

Objetivos

Implementar operações CRUD para usuários e pedidos.

Validar dados com DTOs, class-validator e ValidationPipe.

Utilizar Prisma 7 com PostgreSQL.

Separar a persistência de cada microserviço.

Encaminhar requisições HTTP pelo API Gateway e mensagens TCP entre os serviços.

Validar a existência do usuário antes de criar um pedido.

Arquitetura

Cliente HTTP
    │
    ▼
API Gateway — HTTP :3000
    ├── TCP ──► Users Service — :3001 ──► PostgreSQL (users_db)
    └── TCP ──► Orders Service — :3002 ─► PostgreSQL (orders_db)
                       │
                       └── TCP ──► Users Service

O Gateway recebe as requisições HTTP e encaminha mensagens aos microserviços. Cada serviço mantém suas próprias regras de negócio e seu próprio banco. O serviço Orders consulta Users por TCP para confirmar a existência do usuário; ele não acessa diretamente o banco de Users.

Estrutura esperada

nest-microservices/
├── apps/
│   ├── api-gateway/src/
│   ├── users/src/
│   └── orders/src/
├── libs/
│   └── contracts/src/
├── prisma/
│   ├── users/
│   └── orders/
├── generated/
│   ├── users/
│   └── orders/
├── .env
├── nest-cli.json
└── package.json

A biblioteca libs/contracts reúne DTOs compartilhados, como CreateUserDto, UpdateUserDto e CreateOrderDto. Ela compartilha contratos de dados, sem centralizar regras de negócio ou acesso aos bancos.

Pré-requisitos

Node.js e npm.

NestJS CLI.

PostgreSQL em execução.

Dois bancos PostgreSQL criados: users_db e orders_db.

Instalação

Partindo do monorepo NestJS criado na etapa anterior, crie o serviço Orders e a biblioteca de contratos:

nest g app orders
nest g library contracts

Quando o CLI solicitar o prefixo de importação da biblioteca, informe @app.

Instale as dependências utilizadas neste projeto:

npm install @nestjs/microservices
npm install class-validator class-transformer
npm install @prisma/client @prisma/adapter-pg pg
npm install -D prisma

Este projeto considera Prisma 7, com adaptador PostgreSQL configurado explicitamente. Em projetos com Prisma 6, a configuração do client é diferente.

Configuração do banco de dados

Crie os bancos users_db e orders_db no PostgreSQL. Configure as URLs no arquivo .env, na raiz do monorepo:

USERS_DATABASE_URL="postgresql://postgres:postgres@localhost:5432/users_db"
ORDERS_DATABASE_URL="postgresql://postgres:postgres@localhost:5432/orders_db"

Ajuste usuário, senha, host e porta conforme sua instalação local. Não versione o arquivo .env nem publique credenciais reais.

Cada serviço deve ter seu schema Prisma e sua configuração próprios:

prisma/users/schema.prisma e prisma/users.config.ts

prisma/orders/schema.prisma e prisma/orders.config.ts

Os schemas definem, respectivamente, os modelos User e Order. As configurações apontam para as variáveis USERS_DATABASE_URL e ORDERS_DATABASE_URL.

Gere as migrações iniciais e os clients Prisma:

npx prisma migrate dev --config prisma/users.config.ts --name init_users
npx prisma generate --config prisma/users.config.ts

npx prisma migrate dev --config prisma/orders.config.ts --name init_orders
npx prisma generate --config prisma/orders.config.ts

Os serviços Users e Orders devem importar seus clients gerados separadamente e utilizar PrismaPg com a URL correspondente.

Inicialização

Execute cada aplicação em um terminal separado, na raiz do monorepo:

npm run start:dev users

npm run start:dev orders

npm run start:dev api-gateway

O API Gateway fica disponível em http://localhost:3000. Users e Orders escutam, respectivamente, nas portas TCP 3001 e 3002.

As variáveis do .env precisam estar carregadas nos processos que utilizam Prisma. Se a configuração do projeto não carregar o arquivo automaticamente, importe dotenv/config no início dos arquivos main.ts de Users e Orders.

Rotas HTTP

Usuários

Método

Rota

Ação

POST

/users

Criar usuário

GET

/users

Listar usuários

GET

/users/:id

Buscar usuário por ID

PATCH

/users/:id

Atualizar usuário

DELETE

/users/:id

Excluir usuário

Exemplo de criação:

POST http://localhost:3000/users
Content-Type: application/json

{
  "name": "Carlos",
  "email": "carlos@email.com"
}

Pedidos

Método

Rota

Ação

POST

/orders

Criar pedido

GET

/orders

Listar pedidos

GET

/orders/:id

Buscar pedido por ID

Exemplo de criação:

POST http://localhost:3000/orders
Content-Type: application/json

{
  "userId": 1,
  "description": "Notebook",
  "total": 4500.00
}

Para criar o pedido, o serviço Orders consulta Users por TCP e verifica se o userId existe. Se o usuário não for encontrado, o pedido não deve ser persistido.

Padrões de mensagens TCP

Os controllers dos microserviços recebem mensagens por meio de @MessagePattern():

Serviço

Padrão

Operação

Users

users.create

Criar usuário

Users

users.findAll

Listar usuários

Users

users.findOne

Buscar usuário

Users

users.update

Atualizar usuário

Users

users.remove

Excluir usuário

Orders

orders.create

Criar pedido

Orders

orders.findAll

Listar pedidos

Orders

orders.findOne

Buscar pedido

O método send() implementa o padrão solicitação-resposta. O método emit() publica eventos sem aguardar uma resposta de negócio; neste tutorial, a comunicação principal é síncrona e usa send().

Fluxo de criação de pedido

O cliente envia POST /orders ao Gateway.

O Gateway valida o DTO e envia a mensagem orders.create.

Orders consulta Users com a mensagem users.findOne.

Users consulta seu próprio banco PostgreSQL.

Se o usuário existir, Orders grava o pedido em orders_db.

A resposta retorna ao cliente pelo Gateway.

Essa chamada entre Orders e Users é síncrona. Se Users estiver indisponível ou exceder o tempo limite, Orders não poderá concluir a criação do pedido.

Exercícios sugeridos

Implementar orders.update e orders.remove.

Criar GET /orders/user/:userId para listar pedidos de um usuário.

Tratar usuário inexistente e erros do Prisma.

Criar um filtro RPC para padronizar erros entre os serviços.

Configurar timeout nas chamadas feitas pelo Gateway.

Impedir a exclusão de usuários que possuam pedidos.

Limitações e próximos passos

Esta implementação é didática e ainda requer melhorias antes de uso em produção, especialmente no tratamento de exceções RPC, indisponibilidade e tentativas de repetição, autenticação e autorização, observabilidade e consistência entre bancos independentes. A exclusão de um usuário não remove automaticamente os pedidos armazenados no banco de Orders.

Na próxima etapa, a proposta é introduzir RabbitMQ e comunicação orientada a eventos, incluindo o evento order.created e um serviço de notificações.
