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
  account-session.test.js   Sessão, dados por conta e logout
  registered-data.test.js   Cadastro, consultas e pedidos por conta
  db-migration.test.js      Migração de bancos antigos
  service-lifecycle.test.js Conclusão, avaliação e pagamentos demonstrativos
  admin-management.test.js  Catálogo, contas de administrador e auditoria
```

Os arquivos específicos de cada área ficam junto das suas páginas, separados em `css/` e `js/`. Recursos usados por várias áreas ficam em `frontend/assets/`. Os endereços das páginas HTML foram preservados.

## Dados

`backend/db.js` cria as tabelas que ainda não existem, sem inserir registros de demonstração. O cadastro e a API gravam em `backend/banco.db`. Preserve esse arquivo para manter os dados cadastrados.

Para gravar em outro local — por exemplo, um volume persistente na hospedagem, onde o disco da aplicação é recriado a cada publicação — defina a variável de ambiente `DB_PATH` com o caminho do arquivo:

```bash
DB_PATH=/data/banco.db node backend/server.js
```

As telas consultam os registros disponíveis e mostram mensagens quando não há dados ou quando a consulta falha. Funcionalidades sem integração configurada, como envio de e-mail, informam sua indisponibilidade.

## Verificações de desenvolvimento

A pasta `tests/` não é necessária para executar o site e não é servida ao navegador. Ela foi mantida para verificar as correções de cadastro, isolamento dos dados das contas e logout.

Depois de instalar as dependências do servidor, execute na raiz do projeto:

```bash
node --test tests/*.test.js
```

Os testes usam as ferramentas nativas do Node.js. O teste da API cria um banco temporário e o remove ao terminar; não altera `backend/banco.db`. Os dados presentes nesses arquivos são exclusivos dos testes.

## Catálogo e solicitações

Na tela de login ou no menu do cliente, use **Administração**. Em **Catálogo de serviços**, cadastre o nome, a descrição (opcional) e o preço base do serviço oferecido; nenhum serviço é inserido automaticamente. Cada serviço pode ser editado ou excluído na própria lista. Alterar o preço não muda pedidos já registrados, e um serviço com pedidos vinculados não pode ser excluído, para preservar o histórico.

Com pelo menos um serviço cadastrado, o cliente pode abrir **Serviços → Solicitar serviço** e informar data, endereço e descrição. O pedido fica **aguardando aceite**, sem escolher profissional. Em **Pedidos disponíveis**, os profissionais podem assumir o atendimento. O servidor permite apenas um aceite por pedido; depois disso ele aparece nos pedidos e na agenda do responsável. A data informada é uma preferência; o sistema não verifica conflitos de agenda nem processa pagamentos.

## Acesso administrativo

O painel e as APIs administrativas exigem uma sessão de administrador validada no servidor. O atalho **Administração** abre `/admin-login.html`. Clientes e funcionários não recebem essa permissão pelo cadastro público.

Para configurar o primeiro acesso no seu servidor:

1. Cadastre sua conta de cliente com seus dados reais pela página de cadastro.
2. Abra o terminal na raiz do projeto e execute:

   ```bash
   node backend/criar-admin.js seu-email@exemplo.com
   ```

   Substitua `seu-email@exemplo.com` pelo e-mail da conta de cliente que acabou de cadastrar.

3. Com o servidor em execução, abra **http://localhost:5000/admin-login.html** e entre com esse e-mail e a mesma senha.

Esse comando só pode ser executado por quem tem acesso aos arquivos e ao terminal do servidor. Não existe senha padrão. Novos administradores podem ser cadastrados por um administrador conectado em **Pessoas**.

As sessões usam cookies HttpOnly, expiram em 12 horas e são invalidadas ao sair. Reiniciar o servidor exige novo login. As senhas novas são armazenadas com scrypt; senhas antigas são convertidas no próximo login válido. Para publicação fora do computador local, sirva o site por HTTPS.

A atualização do banco preserva os pedidos existentes e permite pedidos sem profissional até o aceite. Faça uma cópia de segurança de `backend/banco.db` antes de atualizar uma instalação com dados reais.

## Gestão administrativa ampliada

O painel usa as mesmas tecnologias e URLs. A navegação é agrupada em Visão geral
(Dashboard, Relatórios), Pessoas (Funcionários, Clientes, Todas as pessoas), Operação
(Catálogo de serviços), Auditoria (Logs do sistema, Atividades) e Sistema (Permissões,
Configurações). Funcionários e clientes continuam em suas áreas próprias.

O visual segue a identidade das áreas de cliente e profissional (verde, terracota,
DM Serif Display e Plus Jakarta Sans), com tema claro e escuro, e se adapta ao celular:
o menu vira gaveta e as tabelas viram cartões. `frontend/admin/css/admin.css` concentra
os estilos; `js/main.js` cuida da sessão, do tema, do menu e dos componentes comuns;
`js/management.js` e `js/catalogo.js` montam as telas.

- Pessoas: cadastro, busca, filtros por perfil/status/especialidade/data, ordenação,
  paginação, CSV, perfil individual em diálogo com pedidos e atividades, edição,
  ativação/desativação e exclusão confirmada. CPF permanece como identificador não
  editável. Contas com pedidos vinculados não podem ser excluídas; devem ser desativadas.
  Contas de administrador também podem ser editadas, desativadas e excluídas por outro
  administrador; ninguém desativa ou exclui a própria conta, de modo que sempre resta
  ao menos um administrador ativo.
- Permissões: uma linha por funcionário e uma chave para cada acesso; a alteração é
  gravada na hora.
- Funcionários: especialidade existente funciona como cargo; admissão é opcional.
  Permissões disponíveis são consultar pedidos/agenda, aceitar pedidos, concluir
  serviços e cadastrar serviços no catálogo. Nenhuma dessas permissões abre
  APIs administrativas. Mudanças e desativações afetam a próxima requisição de sessões
  já abertas. Administradores mantêm acesso integral; não há hierarquia entre admins.
- Dashboard e relatórios: totais reais, ativos/inativos, evolução mensal, distribuição
  por especialidade/status, operações e atividades recentes. Relatórios filtram datas
  dos novos cadastros e operações; totais/status/cargos representam o estado atual.
  Pedidos mantêm busca, paginação, valor registrado e CSV, sem representar pagamentos.
- Auditoria: gravação no backend de respostas a operações da API (inclusive falhas de
  login, login e logout) e acessos às páginas administrativas. Guarda ator, ação,
  módulo, resultado, horário UTC, IP da conexão e identificação da rota/registro.
  Não grava corpos de requisição, senhas, tokens ou cookies. Há filtros (usuário por
  trecho do nome; evento, módulo e resultado exatos), detalhes, paginação de 25
  registros e CSV da página consultada. Atividades oferecem leitura simplificada dos
  mesmos registros, agrupada por dia e sem as aberturas de páginas do painel.
- Configurações: dados da conta, informações de sessão e preferência funcional de
  tema já existente, salva neste navegador.

### Banco e compatibilidade

`db.ready` aplica a migração administrativa em transação, sem semear dados:

- `cliente`, `funcionario`, `admin`: `ativo` (padrão 1), `criado_em`, `atualizado_em`.
- `funcionario`: `admissao` e `permissoes` (JSON com operações permitidas).
- Nova tabela `auditoria`, índice de data e triggers que impedem UPDATE/DELETE.
- Triggers de cadastro preenchem a data de novos registros. Datas de registros antigos
  ficam nulas: não é possível reconstruir a evolução histórica anterior à migração.

O banco versionado não foi alterado durante o desenvolvimento. Faça backup de
`backend/banco.db` antes de iniciar esta versão numa instalação com dados reais.
A migração será aplicada na inicialização; não é necessário apagar ou recriar o banco.
Logs começam a existir após esta atualização; não há recuperação de eventos passados.
A proteção de imutabilidade aplica-se à aplicação e às operações SQL normais, não ao
proprietário do arquivo SQLite. Erro ao persistir auditoria retorna HTTP 503; como
uma operação de negócio pode já ter sido gravada, consulte seu estado antes de repetir.
Sessões continuam em memória e são encerradas quando o servidor reinicia.

### Validação desta atualização

`node --test tests/*.test.js` cobre migração com dados antigos, integridade referencial,
imutabilidade dos logs, CRUD de pessoas, recusa de exclusão com pedidos, revogação de
sessões e permissões, isolamento entre perfis, relatórios e filtros/paginação de logs,
além dos testes anteriores de contas e pedidos. Os bancos dos testes são temporários.
As oito telas também foram verificadas com Chromium/Playwright em larguras de 1440 e
390 pixels, incluindo menu móvel e operações dos formulários, sem usar o banco real.

`tests/admin-management.test.js` cobre edição e exclusão de serviços, gestão de contas
de administrador, respostas a requisições malformadas e os filtros da auditoria.

Limites atuais: perfil individual abre em diálogo; histórico de atividades do perfil
mostra até 100 registros recentes. A listagem de pessoas pagina no navegador; volumes
muito grandes poderão exigir paginação no banco. Não há configuração de credenciais,
recuperação de senha, processamento de pagamentos ou verificação de conflitos de agenda.


## Serviços, conclusão e pagamentos demonstrativos

Em **Funcionário → Gestão de Serviços**, **Cadastrar serviço** publica nome, descrição
opcional e preço base no catálogo existente. O backend registra o profissional autor;
o administrador continua gerenciando o catálogo. A permissão `servicos.cadastrar`
pode ser desativada em Administração → Permissões.

O fluxo de atendimento é:

1. O cliente solicita um serviço do catálogo, informando data e endereço.
2. Um funcionário aceita o pedido. Apenas o responsável, com `pedidos.concluir`, pode
   usar **Concluir serviço** e confirmar que o atendimento foi realizado.
3. O pedido fica aguardando avaliação. Em **Cliente → Pedidos**, **Atualizar pedidos**
   busca a situação atual; **Avaliar e confirmar conclusão** envia uma nota de 1 a 5
   e comentário opcional, confirmando também a conclusão pelo cliente.
4. A avaliação aparece no pedido e no painel do funcionário. Cada pedido permite uma
   conclusão do funcionário e uma avaliação do cliente; envios concorrentes/repetidos
   são bloqueados no banco. A simulação de pagamento é independente da avaliação.

Em **Cliente → Pagamentos**, podem ser cadastradas preferências de crédito, débito,
Pix e dinheiro. Cartões são de demonstração: o formulário valida número e CVV
localmente e limpa ambos antes de enviar a requisição ou ao fechar. O servidor aceita
somente tipo, apelido e, para cartões, titular, bandeira, últimos quatro dígitos e
validade; rejeita campos adicionais, número completo, CVV e tokens. Não há gateway,
transação bancária, chave de Pix do pagador ou QR Code transferível. Use dados de teste.

Em um pedido, **Simular pagamento** usa uma preferência da própria conta e registra
**Simulado — sem cobrança**. O valor vem do pedido no banco. Há uma simulação por
pedido. Remover uma preferência a desativa, preservando o histórico de pedidos que
já a utilizaram. O funcionário vê somente a situação/tipo de simulação, sem os dados
do cartão. Os eventos de cadastro, conclusão, avaliação e simulação entram na auditoria.

A migração `servicos_pagamentos_v1` é transacional e preserva os dados existentes:

- Nova tabela `metodo_pagamento` para metadados demonstrativos, com vínculo ao cliente.
- Nova tabela `schema_migracoes` controla a execução única da atualização.
- `servico.criado_por_funcionario` identifica quem cadastrou o serviço.
- `os`: `concluido_funcionario_em`, `confirmado_cliente_em`, `avaliacao_nota`,
  `avaliacao_comentario`, `pagamento_metodo_id` e `pagamento_simulado_em`.
- Funcionários novos recebem os quatro acessos. Na atualização de contas antigas,
  quem podia aceitar recebe o acesso de concluir; quem tinha algum acesso recebe
  o cadastro de serviços. Contas sem permissões permanecem sem acesso. Reiniciar
  o servidor não restaura permissões revogadas posteriormente pelo administrador.

`tests/service-lifecycle.test.js` verifica autorização, isolamento entre contas,
validação, concorrência, ausência de credenciais nos registros, remoção preservando
histórico e reaplicação da migração. O fluxo completo também foi verificado em Chromium
com API e SQLite reais de teste, nas larguras 1440 e 390 px, incluindo cadastro de
serviços, solicitação, todas as formas de pagamento, simulações de cartão/Pix,
aceite, conclusão, avaliação, atualização e remoção de formas de pagamento.
