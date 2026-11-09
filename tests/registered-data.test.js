'use strict';

// Executar após npm ci --prefix backend: node --test tests/registered-data.test.js
// Cada execução cria e remove seu próprio SQLite, fora do banco do projeto.
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');
let directory, child, origin;

before(async () => {
  directory = fs.mkdtempSync(path.join(os.tmpdir(), 'dafix-registered-test-'));
  const backend = path.resolve(__dirname, '../backend');
  fs.copyFileSync(path.join(backend, 'db.js'), path.join(directory, 'db.js'));
  fs.symlinkSync(path.join(backend, 'node_modules'), path.join(directory, 'node_modules'));
  const source = fs.readFileSync(path.join(backend, 'server.js'), 'utf8')
    .replace('var PORTA = 5000;', 'var PORTA = 0;')
    .replace("var HOST = 'localhost';", "var HOST = '127.0.0.1';")
    .replace("console.log('  Pronto! Gravando em banco.db (SQLite).');", "console.log('TEST_PORT=' + servidor.address().port);");
  fs.writeFileSync(path.join(directory, 'server.js'), source);
  child = spawn(process.execPath, [path.join(directory, 'server.js')], { stdio: ['ignore', 'pipe', 'pipe'] });
  origin = await new Promise((resolve, reject) => {
    let output = '';
    const timeout = setTimeout(() => reject(new Error('O servidor de teste não iniciou.')), 10000);
    child.once('error', reject);
    child.once('exit', code => { clearTimeout(timeout); reject(new Error('Servidor encerrou: ' + code)); });
    child.stdout.on('data', chunk => {
      output += chunk;
      const found = output.match(/TEST_PORT=(\d+)/);
      if (found) { clearTimeout(timeout); resolve('http://127.0.0.1:' + found[1]); }
    });
  });
});

after(async () => {
  if (child && child.exitCode === null) await new Promise(resolve => { child.once('exit', resolve); child.kill(); });
  if (directory) fs.rmSync(directory, { recursive: true, force: true });
});

async function request(endpoint, body) {
  const response = await fetch(origin + endpoint, body ? { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body) } : undefined);
  return { status: response.status, data: await response.json() };
}

test('an empty database stays empty and registered records are returned without simulated fields', async () => {
  assert.deepEqual((await request('/api/resumo')).data, {clientes:0,funcionarios:0,servicos:0,pedidos:0});
  for (const endpoint of ['/api/clientes','/api/funcionarios','/api/servicos','/api/os','/api/profissionais']) {
    assert.deepEqual((await request(endpoint)).data, []);
  }
  const account = {nome:'Conta de teste',email:'cliente@example.test',cpf:'52998224725',telefone:'11999998888',senha:'SenhaTeste123'};
  assert.equal((await request('/api/clientes',{})).status,400);
  assert.equal((await request('/api/clientes',{...account,senha:'curta'})).status,400);
  assert.equal((await request('/api/clientes',{...account,email:'invalido'})).status,400);
  const first = await request('/api/clientes',account);
  assert.equal((await request('/api/clientes',{...account,email:' CLIENTE@EXAMPLE.TEST ',cpf:'12345678909'})).status,409);
  const malformed=await fetch(origin+'/api/clientes',{method:'POST',body:'null'});assert.equal(malformed.status,400);
  const second = await request('/api/clientes',{...account,nome:'Outra conta de teste',email:'outra@example.test',cpf:'11144477735'});
  const employee = await request('/api/funcionarios',{...account,email:'equipe@example.test',especialidade:'Especialidade de teste'});
  assert.equal(first.status,201);assert.equal(second.status,201);assert.equal(employee.status,201);
  const service = await request('/api/servicos',{nome_servico:'Serviço de teste',descricao:'Registro exclusivo do teste',preco_base:95});
  assert.equal(service.status,201);
  const order = {id_cliente:first.data.id,id_funcionario:employee.data.id,id_servico:service.data.id,preco_unitario:105,data:'2026-11-06',local:'Endereço informado no teste',descricao:'Pedido criado pelo teste'};
  assert.equal((await request('/api/os',order)).status,201);
  assert.deepEqual((await request('/api/resumo')).data, {clientes:2,funcionarios:1,servicos:1,pedidos:1});
  const publicStaff = (await request('/api/profissionais')).data;
  assert.equal(publicStaff.length,1);
  assert.deepEqual(Object.keys(publicStaff[0]).sort(),['especialidade','id','nome']);
  const clientOrders = (await request('/api/os?perfil=cliente&id='+first.data.id)).data;
  assert.equal(clientOrders.length,1);
  assert.equal(clientOrders[0].id_cliente,first.data.id);
  assert.equal(clientOrders[0].preco_unitario,105);
  assert.equal('status' in clientOrders[0],false);
  assert.equal('rating' in clientOrders[0],false);
  assert.deepEqual((await request('/api/os?perfil=cliente&id='+second.data.id)).data,[]);
  assert.equal((await request('/api/os?perfil=funcionario&id='+employee.data.id)).data.length,1);
  assert.equal((await request('/api/os?perfil=invalido&id=1')).status,400);
  assert.equal((await request('/api/os?perfil=cliente&id=0')).status,400);
  assert.equal((await request('/api/solicitacoes',{...order,data:'2099-02-30'})).status,400);
  assert.equal((await request('/api/solicitacoes',{...order,data:'2000-01-01'})).status,400);
  assert.equal((await request('/api/solicitacoes',{...order,data:'2099-11-07',id_funcionario:99999})).status,404);
  const requested=await request('/api/solicitacoes',{...order,data:'2099-11-07',preco_unitario:0});
  assert.equal(requested.status,201);
  assert.equal(requested.data.preco_unitario,95);
  assert.equal((await request('/api/os?perfil=cliente&id='+first.data.id)).data.length,2);
  assert.equal((await request('/api/servicos',{nome_servico:'Inválido',preco_base:-1})).status,400);
});

test('administrators persist, reject duplicates and authenticate without exposing passwords', async () => {
  const account = {nome:'Admin de teste',email:'admin@example.test',cpf:'52998224725',telefone:'11999998888',senha:'SenhaTeste123'};
  assert.deepEqual((await request('/api/admins')).data, []);
  assert.equal((await request('/api/admins',{...account,cpf:'00000000000'})).status,400);
  const created = await request('/api/admins',account);
  assert.equal(created.status,201);
  assert.equal((await request('/api/admins',account)).status,409);
  const list = (await request('/api/admins')).data;
  assert.equal(list.length,1);
  assert.equal(list[0].nome,account.nome);
  assert.equal('senha' in list[0],false);
  const login = await request('/api/login',{perfil:'admin',email:account.email,senha:account.senha});
  assert.equal(login.status,200);
  assert.equal(login.data.perfil,'admin');
  assert.equal(login.data.usuario.id,created.data.id);
  assert.equal('senha' in login.data.usuario,false);
  assert.equal((await request('/api/login',{perfil:'admin',email:account.email,senha:'incorreta'})).status,401);
});
