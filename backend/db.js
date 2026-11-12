var sqlite3 = require('sqlite3');
var path = require('path');

var caminho = path.join(__dirname, 'banco.db');
var db = new sqlite3.Database(caminho);

db.serialize(function () {

  // Faz o SQLite validar as chaves estrangeiras.
  db.run('PRAGMA foreign_keys = ON');

  db.run(`CREATE TABLE IF NOT EXISTS admin (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL, cpf TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL UNIQUE, telefone TEXT NOT NULL, senha TEXT NOT NULL
  )`);

  db.run(`
    CREATE TABLE IF NOT EXISTS cliente (
      id       INTEGER PRIMARY KEY AUTOINCREMENT,
      nome     TEXT NOT NULL,
      cpf      TEXT NOT NULL UNIQUE,
      email    TEXT NOT NULL UNIQUE,
      telefone TEXT NOT NULL,
      senha    TEXT NOT NULL
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS funcionario (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      nome          TEXT NOT NULL,
      cpf           TEXT NOT NULL UNIQUE,
      email         TEXT NOT NULL UNIQUE,
      telefone      TEXT NOT NULL,
      senha         TEXT NOT NULL,
      especialidade TEXT NOT NULL
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS servico (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      nome_servico TEXT NOT NULL,
      descricao    TEXT,
      preco_base   REAL NOT NULL
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS os (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      id_cliente     INTEGER NOT NULL,
      id_servico     INTEGER NOT NULL,
      id_funcionario INTEGER,
      preco_unitario REAL NOT NULL,
      data           TEXT NOT NULL,
      local          TEXT NOT NULL,
      descricao      TEXT NOT NULL,

      FOREIGN KEY (id_cliente) REFERENCES cliente(id) ON DELETE CASCADE,
      FOREIGN KEY (id_servico) REFERENCES servico(id),
      FOREIGN KEY (id_funcionario) REFERENCES funcionario(id)
    )
  `);
});

// Migração preserva pedidos antigos e permite solicitações ainda sem profissional.
db.ready = new Promise((resolve, reject) => {
  db.all('PRAGMA table_info(os)', [], (error, columns) => {
    if (error) return reject(error);
    if (!columns.find(c => c.name === 'id_funcionario' && c.notnull)) return resolve();
    db.exec(`BEGIN IMMEDIATE;
      CREATE TABLE os_pending (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        id_cliente INTEGER NOT NULL REFERENCES cliente(id) ON DELETE CASCADE,
        id_servico INTEGER NOT NULL REFERENCES servico(id),
        id_funcionario INTEGER REFERENCES funcionario(id),
        preco_unitario REAL NOT NULL, data TEXT NOT NULL,
        local TEXT NOT NULL, descricao TEXT NOT NULL
      );
      INSERT INTO os_pending SELECT * FROM os;
      DROP TABLE os;
      ALTER TABLE os_pending RENAME TO os;
      COMMIT;`, error => {
        if (error) return db.exec('ROLLBACK', () => reject(error));
        resolve();
      });
  });
});
// Datas anteriores à migração permanecem desconhecidas.
db.ready = db.ready.then(async () => {
  const exec = sql => new Promise((resolve,reject)=>db.exec(sql,e=>e?reject(e):resolve()));
  const columns = table => new Promise((resolve,reject)=>db.all('PRAGMA table_info('+table+')',[],(e,r)=>e?reject(e):resolve(r)));
  await exec('BEGIN IMMEDIATE');
  try {
    for (const table of ['cliente','funcionario','admin']) {
      const names = (await columns(table)).map(c=>c.name);
      for (const [name,definition] of [['ativo','INTEGER NOT NULL DEFAULT 1 CHECK(ativo IN (0,1))'],['criado_em','TEXT'],['atualizado_em','TEXT']]) {
        if (!names.includes(name)) await exec('ALTER TABLE '+table+' ADD COLUMN '+name+' '+definition);
      }
      await exec(`CREATE TRIGGER IF NOT EXISTS ${table}_created AFTER INSERT ON ${table}
        BEGIN UPDATE ${table} SET criado_em = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id=NEW.id; END;`);
    }
    const names = (await columns('funcionario')).map(c=>c.name);
    if (!names.includes('admissao')) await exec('ALTER TABLE funcionario ADD COLUMN admissao TEXT');
    if (!names.includes('permissoes')) await exec(`ALTER TABLE funcionario ADD COLUMN permissoes TEXT NOT NULL DEFAULT '["pedidos.ler","pedidos.aceitar"]'`);
    await exec(`CREATE TABLE IF NOT EXISTS auditoria (
      id INTEGER PRIMARY KEY AUTOINCREMENT, ator_id INTEGER, ator_tipo TEXT, ator_nome TEXT,
      acao TEXT NOT NULL, modulo TEXT NOT NULL, descricao TEXT NOT NULL,
      resultado TEXT NOT NULL, ip TEXT, criado_em TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
    );
    CREATE INDEX IF NOT EXISTS auditoria_data ON auditoria(criado_em);
    CREATE TRIGGER IF NOT EXISTS auditoria_immutable_update BEFORE UPDATE ON auditoria BEGIN SELECT RAISE(ABORT,'Auditoria imutável'); END;
    CREATE TRIGGER IF NOT EXISTS auditoria_immutable_delete BEFORE DELETE ON auditoria BEGIN SELECT RAISE(ABORT,'Auditoria imutável'); END;`);
    await exec('COMMIT');
  } catch(error) { await exec('ROLLBACK'); throw error; }
});
// Conclusão bilateral e preferências demonstrativas de pagamento, sem credenciais.
db.ready = db.ready.then(async () => {
  const exec = sql => new Promise((resolve,reject)=>db.exec(sql,e=>e?reject(e):resolve()));
  const all = (sql,args=[]) => new Promise((resolve,reject)=>db.all(sql,args,(e,r)=>e?reject(e):resolve(r)));
  const run = (sql,args=[]) => new Promise((resolve,reject)=>db.run(sql,args,e=>e?reject(e):resolve()));
  await exec('BEGIN IMMEDIATE');
  try {
    await exec(`CREATE TABLE IF NOT EXISTS schema_migracoes (nome TEXT PRIMARY KEY, aplicado_em TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`);
    if (!(await all("SELECT nome FROM schema_migracoes WHERE nome='servicos_pagamentos_v1'")).length) {
      await exec(`CREATE TABLE metodo_pagamento (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        id_cliente INTEGER NOT NULL REFERENCES cliente(id) ON DELETE CASCADE,
        tipo TEXT NOT NULL CHECK(tipo IN ('credito','debito','pix','dinheiro')),
        apelido TEXT NOT NULL DEFAULT '', titular TEXT, bandeira TEXT, ultimos4 TEXT, validade TEXT,
        ativo INTEGER NOT NULL DEFAULT 1 CHECK(ativo IN (0,1)),
        criado_em TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
      );
      CREATE INDEX metodo_pagamento_cliente ON metodo_pagamento(id_cliente,ativo);
      ALTER TABLE servico ADD COLUMN criado_por_funcionario INTEGER REFERENCES funcionario(id) ON DELETE SET NULL;
      ALTER TABLE os ADD COLUMN concluido_funcionario_em TEXT;
      ALTER TABLE os ADD COLUMN confirmado_cliente_em TEXT;
      ALTER TABLE os ADD COLUMN avaliacao_nota INTEGER CHECK(avaliacao_nota BETWEEN 1 AND 5);
      ALTER TABLE os ADD COLUMN avaliacao_comentario TEXT;
      ALTER TABLE os ADD COLUMN pagamento_metodo_id INTEGER REFERENCES metodo_pagamento(id);
      ALTER TABLE os ADD COLUMN pagamento_simulado_em TEXT;`);
      for (const person of await all('SELECT id,permissoes FROM funcionario')) {
        const permissions=JSON.parse(person.permissoes);
        if(permissions.includes('pedidos.aceitar'))permissions.push('pedidos.concluir');
        if(permissions.length)permissions.push('servicos.cadastrar');
        await run('UPDATE funcionario SET permissoes=? WHERE id=?',[JSON.stringify([...new Set(permissions)]),person.id]);
      }
      await exec("INSERT INTO schema_migracoes(nome) VALUES('servicos_pagamentos_v1')");
    }
    await exec('COMMIT');
  } catch(error) { await exec('ROLLBACK'); throw error; }
});

module.exports = db;