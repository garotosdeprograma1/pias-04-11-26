var http = require('http');
var fs = require('fs');
var path = require('path');
var db = require('./db');

var PORTA = 5000;
var HOST = 'localhost';

// ---------------------------------------------------------------
// Auxiliares
// ---------------------------------------------------------------

function responderJson(res, status, conteudo) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(conteudo));
}

var TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon'
};

function servirArquivo(res, caminhoRelativo) {
  if (caminhoRelativo === '/') {
    caminhoRelativo = '/index.html';
  } else if (!path.extname(caminhoRelativo)) {
    caminhoRelativo = caminhoRelativo + '.html';
  }

  var caminho = path.join(__dirname, '../frontend', caminhoRelativo);

  if (!fs.existsSync(caminho)) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end('Arquivo nao encontrado: ' + caminhoRelativo);
  }

  var tipo = TIPOS[path.extname(caminho)] || 'text/plain; charset=utf-8';
  res.writeHead(200, { 'Content-Type': tipo });
  res.end(fs.readFileSync(caminho));
}

// ---------------------------------------------------------------
// Servidor
// ---------------------------------------------------------------

var servidor = http.createServer(function (req, res) {
  var caminho = req.url.split('?')[0];

  // ---- autenticar cliente ou funcionario no SQLite ----
  if (req.method === 'POST' && caminho === '/api/login') {
    var textoLogin = '';

    req.on('data', function (pedaco) {
      textoLogin += pedaco;
    });

    req.on('end', function () {
      var credenciais;
      try {
        credenciais = JSON.parse(textoLogin);
      } catch (erro) {
        return responderJson(res, 400, { erro: 'Dados invalidos.' });
      }

      if (!credenciais ||
          (credenciais.perfil !== 'cliente' && credenciais.perfil !== 'funcionario') ||
          typeof credenciais.email !== 'string' || !credenciais.email.trim() ||
          typeof credenciais.senha !== 'string' || !credenciais.senha) {
        return responderJson(res, 400, { erro: 'Perfil, e-mail e senha sao obrigatorios.' });
      }

      // A tabela vem apenas dos dois perfis permitidos; valores usam parametros.
      var tabelaLogin = credenciais.perfil === 'cliente' ? 'cliente' : 'funcionario';
      var sqlLogin = 'SELECT id, nome, email, telefone FROM ' + tabelaLogin +
                    ' WHERE LOWER(TRIM(email)) = ? AND senha = ? LIMIT 1';
      var valoresLogin = [credenciais.email.trim().toLowerCase(), credenciais.senha];

      db.get(sqlLogin, valoresLogin, function (erro, usuario) {
        if (erro) {
          return responderJson(res, 500, { erro: 'Nao foi possivel verificar o acesso. Tente novamente.' });
        }
        if (!usuario) {
          return responderJson(res, 401, { erro: 'E-mail ou senha invalidos para este perfil.' });
        }
        responderJson(res, 200, { usuario: usuario, perfil: credenciais.perfil });
      });
    });

    return;
  }

  // =================================================================
  // API: cliente
  // =================================================================

  // ---- listar ----
  if (req.method === 'GET' && caminho === '/api/clientes') {
    db.all('SELECT id, nome, cpf, email, telefone FROM cliente ORDER BY id DESC', [], function (erro, linhas) {
      if (erro) {
        return responderJson(res, 500, { erro: erro.message });
      }
      responderJson(res, 200, linhas);
    });
    return;
  }

  // ---- cadastrar ----
  if (req.method === 'POST' && caminho === '/api/clientes') {
    var texto = '';

    req.on('data', function (pedaco) {
      texto += pedaco;
    });

    req.on('end', function () {
      var novo;
      try {
        novo = JSON.parse(texto);
      } catch (erro) {
        return responderJson(res, 400, { erro: 'Dados invalidos.' });
      }

      if (!novo.nome || !novo.cpf || !novo.email || !novo.telefone || !novo.senha) {
        return responderJson(res, 400, { erro: 'Nome, cpf, email, telefone e senha sao obrigatorios.' });
      }

      var sql = 'INSERT INTO cliente (nome, cpf, email, telefone, senha) VALUES (?, ?, ?, ?, ?)';
      var valores = [novo.nome, novo.cpf, novo.email, novo.telefone, novo.senha];

      // function() e nao arrow: so assim o this traz o lastID.
      db.run(sql, valores, function (erro) {
        if (erro) {
          return responderJson(res, 500, { erro: erro.message });
        }
        novo.id = this.lastID;
        delete novo.senha;
        console.log('Cliente cadastrado: id ' + novo.id + ' - ' + novo.nome);
        responderJson(res, 201, novo);
      });
    });

    return;
  }

  // ---- excluir ----
  if (req.method === 'DELETE' && caminho.indexOf('/api/clientes/') === 0) {
    var idCliente = caminho.split('/')[3];

    db.run('DELETE FROM cliente WHERE id = ?', [idCliente], function (erro) {
      if (erro) {
        return responderJson(res, 500, { erro: erro.message });
      }
      if (this.changes === 0) {
        return responderJson(res, 404, { erro: 'Cliente nao encontrado.' });
      }
      console.log('Cliente excluido: id ' + idCliente);
      responderJson(res, 200, { removido: Number(idCliente) });
    });

    return;
  }

  // =================================================================
  // API: funcionario
  // =================================================================

  // ---- listar ----
  if (req.method === 'GET' && caminho === '/api/funcionarios') {
    db.all('SELECT id, nome, cpf, email, telefone, especialidade FROM funcionario ORDER BY id DESC', [], function (erro, linhas) {
      if (erro) {
        return responderJson(res, 500, { erro: erro.message });
      }
      responderJson(res, 200, linhas);
    });
    return;
  }

  // ---- cadastrar ----
  if (req.method === 'POST' && caminho === '/api/funcionarios') {
    var textoFunc = '';

    req.on('data', function (pedaco) {
      textoFunc += pedaco;
    });

    req.on('end', function () {
      var novoFunc;
      try {
        novoFunc = JSON.parse(textoFunc);
      } catch (erro) {
        return responderJson(res, 400, { erro: 'Dados invalidos.' });
      }

      if (!novoFunc.nome || !novoFunc.cpf || !novoFunc.email || !novoFunc.telefone ||
          !novoFunc.senha || !novoFunc.especialidade) {
        return responderJson(res, 400, { erro: 'Nome, cpf, email, telefone, senha e especialidade sao obrigatorios.' });
      }

      var sqlFunc = 'INSERT INTO funcionario (nome, cpf, email, telefone, senha, especialidade) ' +
                    'VALUES (?, ?, ?, ?, ?, ?)';
      var valoresFunc = [novoFunc.nome, novoFunc.cpf, novoFunc.email, novoFunc.telefone,
                         novoFunc.senha, novoFunc.especialidade];

      db.run(sqlFunc, valoresFunc, function (erro) {
        if (erro) {
          return responderJson(res, 500, { erro: erro.message });
        }
        novoFunc.id = this.lastID;
        delete novoFunc.senha;
        console.log('Funcionario cadastrado: id ' + novoFunc.id + ' - ' + novoFunc.nome);
        responderJson(res, 201, novoFunc);
      });
    });

    return;
  }

  // ---- excluir ----
  if (req.method === 'DELETE' && caminho.indexOf('/api/funcionarios/') === 0) {
    var idFunc = caminho.split('/')[3];

    db.run('DELETE FROM funcionario WHERE id = ?', [idFunc], function (erro) {
      if (erro) {
        return responderJson(res, 500, { erro: erro.message });
      }
      if (this.changes === 0) {
        return responderJson(res, 404, { erro: 'Funcionario nao encontrado.' });
      }
      console.log('Funcionario excluido: id ' + idFunc);
      responderJson(res, 200, { removido: Number(idFunc) });
    });

    return;
  }

  // =================================================================
  // API: servico
  // =================================================================

  // ---- listar ----
  if (req.method === 'GET' && caminho === '/api/servicos') {
    db.all('SELECT * FROM servico ORDER BY id DESC', [], function (erro, linhas) {
      if (erro) {
        return responderJson(res, 500, { erro: erro.message });
      }
      responderJson(res, 200, linhas);
    });
    return;
  }

  // ---- cadastrar ----
  if (req.method === 'POST' && caminho === '/api/servicos') {
    var textoServ = '';

    req.on('data', function (pedaco) {
      textoServ += pedaco;
    });

    req.on('end', function () {
      var novoServ;
      try {
        novoServ = JSON.parse(textoServ);
      } catch (erro) {
        return responderJson(res, 400, { erro: 'Dados invalidos.' });
      }

      if (!novoServ.nome_servico || novoServ.preco_base === undefined) {
        return responderJson(res, 400, { erro: 'Nome_servico e preco_base sao obrigatorios.' });
      }

      var sqlServ = 'INSERT INTO servico (nome_servico, descricao, preco_base) VALUES (?, ?, ?)';
      var valoresServ = [novoServ.nome_servico, novoServ.descricao, novoServ.preco_base];

      db.run(sqlServ, valoresServ, function (erro) {
        if (erro) {
          return responderJson(res, 500, { erro: erro.message });
        }
        novoServ.id = this.lastID;
        console.log('Servico cadastrado: id ' + novoServ.id + ' - ' + novoServ.nome_servico);
        responderJson(res, 201, novoServ);
      });
    });

    return;
  }

  // ---- excluir ----
  if (req.method === 'DELETE' && caminho.indexOf('/api/servicos/') === 0) {
    var idServ = caminho.split('/')[3];

    db.run('DELETE FROM servico WHERE id = ?', [idServ], function (erro) {
      if (erro) {
        return responderJson(res, 500, { erro: erro.message });
      }
      if (this.changes === 0) {
        return responderJson(res, 404, { erro: 'Servico nao encontrado.' });
      }
      console.log('Servico excluido: id ' + idServ);
      responderJson(res, 200, { removido: Number(idServ) });
    });

    return;
  }

  // =================================================================
  // API: os (ordem de servico)
  // =================================================================

  // ---- listar ----
  if (req.method === 'GET' && caminho === '/api/os') {
    var sqlListaOs = 'SELECT ' +
      'os.id, ' +
      'cliente.nome AS cliente, ' +
      'servico.nome_servico AS servico, ' +
      'funcionario.nome AS funcionario, ' +
      'os.preco_unitario, ' +
      'os.data, ' +
      'os.local, ' +
      'os.descricao ' +
      'FROM os ' +
      'INNER JOIN cliente ON os.id_cliente = cliente.id ' +
      'INNER JOIN servico ON os.id_servico = servico.id ' +
      'INNER JOIN funcionario ON os.id_funcionario = funcionario.id ' +
      'ORDER BY os.id DESC';

    db.all(sqlListaOs, [], function (erro, linhas) {
      if (erro) {
        return responderJson(res, 500, { erro: erro.message });
      }
      responderJson(res, 200, linhas);
    });
    return;
  }

  // ---- cadastrar ----
  if (req.method === 'POST' && caminho === '/api/os') {
    var textoOs = '';

    req.on('data', function (pedaco) {
      textoOs += pedaco;
    });

    req.on('end', function () {
      var novaOs;
      try {
        novaOs = JSON.parse(textoOs);
      } catch (erro) {
        return responderJson(res, 400, { erro: 'Dados invalidos.' });
      }

      if (!novaOs.id_cliente || !novaOs.id_servico || !novaOs.id_funcionario ||
          novaOs.preco_unitario === undefined || !novaOs.data || !novaOs.local || !novaOs.descricao) {
        return responderJson(res, 400, {
          erro: 'id_cliente, id_servico, id_funcionario, preco_unitario, data, local e descricao sao obrigatorios.'
        });
      }

      var sqlOs = 'INSERT INTO os (id_cliente, id_servico, id_funcionario, preco_unitario, data, local, descricao) ' +
                  'VALUES (?, ?, ?, ?, ?, ?, ?)';
      var valoresOs = [novaOs.id_cliente, novaOs.id_servico, novaOs.id_funcionario,
                       novaOs.preco_unitario, novaOs.data, novaOs.local, novaOs.descricao];

      db.run(sqlOs, valoresOs, function (erro) {
        if (erro) {
          return responderJson(res, 500, { erro: erro.message });
        }
        novaOs.id = this.lastID;
        console.log('OS cadastrada: id ' + novaOs.id);
        responderJson(res, 201, novaOs);
      });
    });

    return;
  }

  // ---- excluir ----
  if (req.method === 'DELETE' && caminho.indexOf('/api/os/') === 0) {
    var idOs = caminho.split('/')[3];

    db.run('DELETE FROM os WHERE id = ?', [idOs], function (erro) {
      if (erro) {
        return responderJson(res, 500, { erro: erro.message });
      }
      if (this.changes === 0) {
        return responderJson(res, 404, { erro: 'OS nao encontrada.' });
      }
      console.log('OS excluida: id ' + idOs);
      responderJson(res, 200, { removido: Number(idOs) });
    });

    return;
  }

  // ---- Arquivos da pasta frontend ----
  if (req.method === 'GET') {
    return servirArquivo(res, caminho === '/' ? '/' : caminho);
  }

  responderJson(res, 404, { erro: 'Nao encontrado.' });
});

servidor.on('error', function (erro) {
  if (erro.code === 'EADDRINUSE') {
    console.log('');
    console.log('A porta ' + PORTA + ' ja esta sendo usada.');
    console.log('Feche a outra janela do terminal e tente de novo.');
    return;
  }
  console.log('Erro: ' + erro.message);
});

servidor.listen(PORTA, HOST, function () {
  console.log('');
  console.log('  Pronto! Gravando em banco.db (SQLite).');
  console.log('');
  console.log('      http://' + HOST + ':' + PORTA);
  console.log('');
  console.log('  Para desligar, aperte Ctrl+C aqui nesta janela.');
  console.log('');
});
