'use strict';

// Gestão administrativa: catálogo, contas de administrador, auditoria e rotas inexistentes.
// Servidor e banco temporários; backend/banco.db não é alterado.
const {test, before, after} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {spawn} = require('node:child_process');
let directory, child, origin;
const account = {nome:'Gestora de teste', email:'gestao@example.test', cpf:'52998224725', telefone:'11999998888', senha:'GestaoTeste123'};

before(async () => {
  directory = fs.mkdtempSync(path.join(os.tmpdir(), 'dafix-admin-'));
  const backend = path.resolve(__dirname, '../backend');
  for (const name of ['db.js','auth.js','criar-admin.js']) fs.copyFileSync(path.join(backend,name), path.join(directory,name));
  fs.symlinkSync(path.join(backend,'node_modules'),path.join(directory,'node_modules'));
  const source = fs.readFileSync(path.join(backend,'server.js'),'utf8')
    .replaceAll("'../frontend'",JSON.stringify(path.resolve(__dirname,'../frontend')))
    .replace('var PORTA = Number(process.env.PORT) || 5000;', 'var PORTA = 0;')
    .replace("var HOST = process.env.PORT ? '0.0.0.0' : 'localhost';", "var HOST = '127.0.0.1';")
    .replace("console.log('  Pronto! Gravando em banco.db (SQLite).');", "console.log('TEST_PORT=' + servidor.address().port);");
  fs.writeFileSync(path.join(directory,'server.js'),source);
  child=spawn(process.execPath,[path.join(directory,'server.js')],{stdio:['ignore','pipe','pipe']});
  origin=await new Promise((resolve,reject)=>{
    let output='',errors='';
    const timeout=setTimeout(()=>reject(new Error('Servidor de teste não iniciou: '+errors)),10000);
    child.once('error',error=>{clearTimeout(timeout);reject(error);});
    child.once('exit',code=>{clearTimeout(timeout);reject(new Error('Servidor encerrou: '+code+' '+errors));});
    child.stderr.on('data',chunk=>{errors+=chunk;});
    child.stdout.on('data',chunk=>{output+=chunk;const match=output.match(/TEST_PORT=(\d+)/);if(match){clearTimeout(timeout);resolve('http://127.0.0.1:'+match[1]);}});
  });
});
after(async()=>{
  if(child && child.exitCode===null) await new Promise(resolve=>{child.once('exit',resolve);child.kill();});
  if(directory)fs.rmSync(directory,{recursive:true,force:true});
});
async function request(url,method='GET',body,cookie='') {
  const response=await fetch(origin+url,{method,headers:{'Content-Type':'application/json',Cookie:cookie},...(body===undefined?{}:{body:JSON.stringify(body)}),redirect:'manual'});
  return {status:response.status,data:await response.json().catch(()=>null),cookie:response.headers.get('set-cookie')?.split(';')[0],location:response.headers.get('location'),type:response.headers.get('content-type')};
}
const post=(url,body,cookie)=>request(url,'POST',body,cookie);
const login=(perfil,email=account.email)=>post('/api/login',{perfil,email,senha:account.senha});
function ok(result,status=200) {assert.equal(result.status,status,JSON.stringify(result.data));return result.data;}

test('admin manages catalog and administrator accounts with safe failures',async t=>{
  ok(await post('/api/clientes',account),201);
  ok(await post('/api/funcionarios',{...account,email:'equipe@example.test',especialidade:'Reparos'}),201);
  await new Promise((resolve,reject)=>{
    const proc=spawn(process.execPath,[path.join(directory,'criar-admin.js'),account.email],{stdio:'ignore'});
    proc.once('error',reject);proc.once('exit',code=>code?reject(new Error('Falha ao criar administrador')):resolve());
  });
  const client=await login('cliente'),staff=await login('funcionario','equipe@example.test'),admin=await login('admin');
  for(const session of [client,staff,admin])ok(session);
  const me=admin.data.usuario.id;

  await t.test('catalog edit and delete are admin-only, validated and protect order history',async()=>{
    const used=ok(await post('/api/servicos',{nome_servico:'Com pedido',descricao:'Original',preco_base:100},admin.cookie),201);
    const unused=ok(await post('/api/servicos',{nome_servico:'Sem pedido',preco_base:50},admin.cookie),201);
    const order=ok(await post('/api/solicitacoes',{id_servico:used.id,data:'2099-11-09',local:'Endereço de teste',descricao:'Pedido de teste'},client.cookie),201);
    const path='/api/servicos/'+used.id;
    assert.equal((await request(path,'PATCH',{preco_base:1})).status,401);
    assert.equal((await request(path,'PATCH',{preco_base:1},staff.cookie)).status,403);
    assert.equal((await request(path,'DELETE',undefined,client.cookie)).status,403);
    for(const invalid of [{preco_base:-1},{preco_base:'10'},{preco_base:1.234},{nome_servico:'  '},{nome_servico:'x'.repeat(151)},{descricao:'x'.repeat(1001)},{id:99},{}]) {
      assert.equal((await request(path,'PATCH',invalid,admin.cookie)).status,400,JSON.stringify(invalid));
    }
    assert.equal((await request('/api/servicos/999999','PATCH',{preco_base:1},admin.cookie)).status,404);
    ok(await request(path,'PATCH',{nome_servico:' Renomeado ',descricao:null,preco_base:150.5},admin.cookie));
    const saved=ok(await request('/api/servicos')).find(s=>s.id===used.id);
    assert.deepEqual([saved.nome_servico,saved.descricao,saved.preco_base],['Renomeado','',150.5]);
    // O pedido já registrado mantém o valor da solicitação.
    assert.equal(ok(await request('/api/os',undefined,undefined,client.cookie)).find(o=>o.id===order.id).preco_unitario,100);
    const refused=await request(path,'DELETE',undefined,admin.cookie);
    assert.equal(refused.status,409);assert(!/SQLITE|constraint/i.test(JSON.stringify(refused.data)));
    ok(await request('/api/servicos/'+unused.id,'DELETE',undefined,admin.cookie));
    assert.equal((await request('/api/servicos/'+unused.id,'DELETE',undefined,admin.cookie)).status,404);
    assert.equal(ok(await request('/api/servicos')).length,1);
  });

  await t.test('administrators can be managed, but never lock themselves out',async()=>{
    const other=ok(await post('/api/admins',{...account,nome:'Segunda gestora',email:'segunda@example.test',cpf:'11144477735'},admin.cookie),201);
    const own='/api/admins/'+me,path='/api/admins/'+other.id;
    assert.equal((await request(path)).status,401);
    assert.equal((await request(path,undefined,undefined,staff.cookie)).status,403);
    assert.equal((await request(path,'PATCH',{ativo:0},client.cookie)).status,403);
    const profile=ok(await request(path,undefined,undefined,admin.cookie));
    assert.equal(profile.pessoa.email,'segunda@example.test');assert(!('senha' in profile.pessoa));assert.deepEqual(profile.pedidos,[]);
    assert.equal((await request(own,'PATCH',{ativo:0},admin.cookie)).status,409);
    assert.equal((await request(own,'DELETE',undefined,admin.cookie)).status,409);
    assert.equal((await request(path,'PATCH',{permissoes:[]},admin.cookie)).status,400);
    ok(await request(own,'PATCH',{nome:'Gestora renomeada',telefone:'(11) 98888-7777'},admin.cookie));
    assert.equal(ok(await request('/api/session',undefined,undefined,admin.cookie)).usuario.nome,'Gestora renomeada');
    // Desativar encerra a sessão aberta da outra conta e bloqueia novo login.
    const second=await login('admin','segunda@example.test');ok(second);
    ok(await request(path,'PATCH',{ativo:0},admin.cookie));
    assert.equal((await request('/api/session',undefined,undefined,second.cookie)).status,401);
    assert.equal((await login('admin','segunda@example.test')).status,401);
    ok(await request(path,'DELETE',undefined,admin.cookie));
    assert.equal((await request(path,undefined,undefined,admin.cookie)).status,404);
    assert.equal(ok(await request('/api/admins',undefined,undefined,admin.cookie)).length,1);
  });

  await t.test('malformed and unknown requests fail safely without stopping the server',async()=>{
    for(const body of [null,[],'texto',{},{id_cliente:1,id_servico:1,id_funcionario:'1',preco_unitario:1,data:'2099-01-01',local:'Local',descricao:'Descrição'}]) {
      assert.equal((await post('/api/os',body,admin.cookie)).status,400,JSON.stringify(body));
    }
    const orphan=await post('/api/os',{id_cliente:999999,id_servico:999999,id_funcionario:999999,preco_unitario:10,data:'2099-01-01',local:'Local de teste',descricao:'Descrição de teste'},admin.cookie);
    assert.equal(orphan.status,409);assert(!/SQLITE|constraint/i.test(JSON.stringify(orphan.data)));
    assert.equal((await request('/api/os/abc','DELETE',undefined,admin.cookie)).status,404);
    const unknown=await request('/api/rota-inexistente',undefined,undefined,admin.cookie);
    assert.equal(unknown.status,404);assert(unknown.type.includes('application/json'));assert(unknown.data.erro);
    assert.equal((await request('/admin',undefined,undefined,admin.cookie)).location,'/admin/dashboard.html');
    assert.equal((await request('/admin/')).location,'/admin-login.html');
    assert.equal((await request('/api/resumo')).status,200);
  });

  await t.test('audit filters are exact and the dashboard feed lists operations, not page views',async()=>{
    ok(await request('/admin/dashboard.html',undefined,undefined,admin.cookie));
    const orders=ok(await request('/api/admin/logs?modulo=os',undefined,undefined,admin.cookie));
    assert(orders.total>=1);assert(orders.registros.every(r=>r.modulo==='os'));
    const created=ok(await request('/api/admin/logs?evento=cadastro',undefined,undefined,admin.cookie));
    assert(created.total>=1);assert(created.registros.every(r=>r.acao==='cadastro'));
    for(const action of ['servico.alterado','servico.excluido']) assert.equal(ok(await request('/api/admin/logs?evento='+action+'&resultado=sucesso',undefined,undefined,admin.cookie)).total,1,action);
    assert.equal(ok(await request('/api/admin/logs?usuario=%25',undefined,undefined,admin.cookie)).total,0);
    assert(ok(await request('/api/admin/logs?usuario=renomeada',undefined,undefined,admin.cookie)).total>=1);
    assert(ok(await request('/api/admin/logs?evento=acesso',undefined,undefined,admin.cookie)).total>=1);
    const quiet=ok(await request('/api/admin/logs?sem_acesso=1',undefined,undefined,admin.cookie));
    assert(quiet.total>=1);assert(quiet.registros.every(r=>r.acao!=='acesso'));
    const stats=ok(await request('/api/admin/estatisticas',undefined,undefined,admin.cookie));
    assert(stats.recentes.length>0);assert(stats.recentes.every(r=>r.acao!=='acesso'));
  });
});
