# DaFix

Plataforma de serviços residenciais com áreas pública, do cliente, do funcionário e administrativa. As páginas usam HTML, CSS e JavaScript, sem etapa de compilação. O servidor existente é JavaScript com Node.js e SQLite.

## Executar localmente

Requisitos: Node.js 24 e npm.

**No Windows:** extraia o projeto e dê dois cliques em `iniciar.bat`, na raiz. Ele instala as dependências quando necessário, inicia o servidor e abre o navegador. Mantenha a janela aberta; pressione Ctrl+C para encerrar. A primeira instalação precisa de internet.

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

Com pelo menos um serviço e um funcionário cadastrados, o cliente pode abrir **Serviços → Solicitar serviço**, escolher o profissional e informar data, endereço e descrição. O pedido é salvo no SQLite e aparece nas áreas do cliente, do funcionário escolhido e da administração. A data informada é uma preferência; o sistema não verifica disponibilidade da agenda nem processa pagamentos.

O atalho administrativo abre o painel existente; ele não adiciona autenticação ou permissão de administrador.
