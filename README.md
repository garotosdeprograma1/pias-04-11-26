# DaFix

Plataforma de serviços residenciais com áreas pública, do cliente, do funcionário e administrativa. As páginas usam HTML, CSS e JavaScript, sem etapa de compilação. O servidor existente é JavaScript com Node.js e SQLite.

## Executar localmente

Requisitos: Node.js 24 e npm.

**No Windows:** o inicializador está em `backend/abrir.bat`. Mantenha a janela do servidor aberta enquanto usa o projeto e pressione Ctrl+C para encerrar. A instalação das dependências precisa de internet.

Para iniciar pelo terminal, na pasta do projeto:

```bash
npm ci --prefix backend
node backend/server.js
```

Abra **http://localhost:5000/** para acessar login e cadastro ou **http://localhost:5000/landing.html** para a apresentação do projeto. Mantenha o terminal aberto enquanto usa o site.

As páginas precisam desse servidor para acessar a API; abrir o HTML diretamente ou usar apenas um servidor estático não permite consultar o banco.

## Organização

```text
backend/
  server.js                Servidor HTTP, API e validações
  db.js                    Conexão e criação das tabelas SQLite
  banco.db                 Banco usado pela aplicação
  package.json             Dependências do servidor
  package-lock.json        Versões das dependências
frontend/
  index.html               Login e cadastro
  landing.html             Apresentação
  assets/
    css/                   Login, apresentação e estados de dados
    js/                    Autenticação, sessão e acesso compartilhado à API
    images/                Imagens compartilhadas
  admin/                   Páginas administrativas, css/ e js/
  cliente/                 Área do cliente, css/ e js/
  funcionario/             Área do funcionário, css/ e js/
  publico/                 Páginas públicas, css/ e js/
  suporte/                 Central de ajuda, css/ e js/
tests/
  account-session.test.js  Sessão, dados por conta e logout
  registered-data.test.js  Cadastro, consultas e pedidos por conta
```

Os arquivos específicos de cada área ficam junto das suas páginas, separados em `css/` e `js/`. Recursos usados por várias áreas ficam em `frontend/assets/`. Os endereços das páginas HTML foram preservados.

## Dados

`backend/db.js` cria as tabelas que ainda não existem, sem inserir registros de demonstração. O cadastro e a API gravam em `backend/banco.db`. Preserve esse arquivo para manter os dados cadastrados.

As telas consultam os registros disponíveis e mostram mensagens quando não há dados ou quando a consulta falha. Funcionalidades sem integração configurada, como envio de e-mail, informam sua indisponibilidade.

## Verificações de desenvolvimento

A pasta `tests/` não é necessária para executar o site e não é servida ao navegador. Ela foi mantida para verificar as correções de cadastro, isolamento dos dados das contas e logout.

Depois de instalar as dependências do servidor, execute na raiz do projeto:

```bash
node --test tests/*.test.js
```

Os testes usam as ferramentas nativas do Node.js. O teste da API cria um banco temporário e o remove ao terminar; não altera `backend/banco.db`. Os dados presentes nesses arquivos são exclusivos dos testes.

## Catálogo e solicitações

Na tela de login ou no menu do cliente, use **Administração**. Em **Serviços**, cadastre o nome, a descrição e o preço base do serviço oferecido. As sugestões de nomes ajudam no preenchimento; nenhum serviço é inserido automaticamente.

Com pelo menos um serviço cadastrado, o cliente pode abrir **Serviços → Solicitar serviço** e informar data, endereço e descrição. O pedido fica **aguardando aceite**, sem escolher profissional. Em **Pedidos disponíveis**, os profissionais podem assumir o atendimento. O servidor permite apenas um aceite por pedido; depois disso ele aparece nos pedidos e na agenda do responsável. A data informada é uma preferência; o sistema não verifica conflitos de agenda nem processa pagamentos.

## Acesso administrativo

O painel e as APIs administrativas exigem uma sessão de administrador validada no servidor. O atalho **Administração** abre `/admin-login.html`. Clientes e funcionários não recebem essa permissão pelo cadastro público.

Para configurar o primeiro acesso no seu servidor:

1. Cadastre sua conta de cliente com seus dados reais pela página de cadastro.
2. No terminal, na raiz do projeto, execute `node backend/criar-admin.js seu-email@exemplo.com`, usando o e-mail da conta que acabou de cadastrar.
3. Entre na administração com esse e-mail e a mesma senha.

Esse comando só pode ser executado por quem tem acesso aos arquivos e ao terminal do servidor. Não existe senha padrão. Novos administradores podem ser cadastrados por um administrador conectado em **Pessoas**.

As sessões usam cookies HttpOnly, expiram em 12 horas e são invalidadas ao sair. Reiniciar o servidor exige novo login. As senhas novas são armazenadas com scrypt; senhas antigas são convertidas no próximo login válido. Para publicação fora do computador local, sirva o site por HTTPS.

A atualização do banco preserva os pedidos existentes e permite pedidos sem profissional até o aceite. Faça uma cópia de segurança de `backend/banco.db` antes de atualizar uma instalação com dados reais.
