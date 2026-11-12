'use strict';

// Testes de integração com servidor e banco temporários, sem alterar banco.db.
const {test, before, after} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {spawn} = require('node:child_process');
const sqlite = require('../backend/node_modules/sqlite3');
let directory, child, origin;
const account = {nome:'Cliente do fluxo', email:'lifecycle@example.test', cpf:'52998224725', telefone:'11999998888', senha:'FluxoTeste123'};
const permissions = ['pedidos.ler','pedidos.aceitar','pedidos.concluir','servicos.cadastrar'];

before(async () => {
  directory = fs.mkdtempSync(path.join(os.tmpdir(), 'dafix-lifecycle-'));
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
  return {status:response.status,data:await response.json().catch(()=>null),cookie:response.headers.get('set-cookie')?.split(';')[0]};
}
const post=(url,body,cookie)=>request(url,'POST',body,cookie);
const login=(perfil,email=account.email)=>post('/api/login',{perfil,email,senha:account.senha});
async function query(sql,args=[]) {
  const db=new sqlite.Database(path.join(directory,'banco.db'),sqlite.OPEN_READONLY);
  try {return await new Promise((resolve,reject)=>db.all(sql,args,(error,rows)=>error?reject(error):resolve(rows)));}
  finally {await new Promise(resolve=>db.close(resolve));}
}
function ok(result,status=200) {assert.equal(result.status,status,JSON.stringify(result.data));return result.data;}
function denied(result) {assert([403,404].includes(result.status),JSON.stringify(result));}

test('employee catalog, service completion, client review and payment simulation are authorized and durable',async t=>{
  ok(await post('/api/clientes',account),201);
  const otherAccount={...account,nome:'Outro cliente',email:'other-lifecycle@example.test',cpf:'11144477735'};
  ok(await post('/api/clientes',otherAccount),201);
  for(const [email,cpf] of [['staff-lifecycle@example.test',account.cpf],['other-staff@example.test',otherAccount.cpf]]) {
    ok(await post('/api/funcionarios',{...account,email,cpf,especialidade:'Reparos'}),201);
  }
  await new Promise((resolve,reject)=>{
    const proc=spawn(process.execPath,[path.join(directory,'criar-admin.js'),account.email],{stdio:'ignore'});
    proc.once('error',reject);proc.once('exit',code=>code?reject(new Error('Falha ao criar administrador')):resolve());
  });
  const client=await login('cliente'),otherClient=await login('cliente',otherAccount.email);
  const staff=await login('funcionario','staff-lifecycle@example.test'),otherStaff=await login('funcionario','other-staff@example.test');
  const admin=await login('admin');
  for(const session of [client,otherClient,staff,otherStaff,admin])ok(session);
  let service,order,secondOrder,card,pix;
  const changePermissions=value=>request('/api/funcionarios/'+staff.data.usuario.id,'PATCH',{permissoes:value},admin.cookie);
  const orderBody=id=>({id_servico:id,data:'2099-11-09',local:'Endereço do teste',descricao:'Atendimento solicitado'});
  const ownOrder=async id=>ok(await request('/api/os','GET',undefined,client.cookie)).find(row=>row.id===id);

  await t.test('employees can create catalog services, with immediate permission enforcement',async()=>{
    const body={nome_servico:'Instalação de teste',descricao:'Serviço publicado pelo profissional',preco_base:129.9};
    assert.equal((await post('/api/servicos',body)).status,401);
    denied(await post('/api/servicos',body,client.cookie));
    for(const preco_base of [-1,'99',null])assert.equal((await post('/api/servicos',{...body,preco_base},staff.cookie)).status,400);
    service=ok(await post('/api/servicos',body,staff.cookie),201);
    const [stored]=await query('SELECT * FROM servico WHERE id=?',[service.id]);
    assert.equal(stored.criado_por_funcionario,staff.data.usuario.id);
    assert.equal(stored.preco_base,129.9);
    assert(ok(await request('/api/servicos')).some(row=>row.id===service.id));
    ok(await changePermissions(permissions.filter(p=>p!=='servicos.cadastrar')));
    denied(await post('/api/servicos',body,staff.cookie));
    ok(await changePermissions(permissions));
    denied(await request('/api/servicos/'+service.id,'DELETE',undefined,staff.cookie));
  });

  await t.test('only the responsible employee can finish, then only the owning client can review once',async()=>{
    order=ok(await post('/api/solicitacoes',orderBody(service.id),client.cookie),201);
    secondOrder=ok(await post('/api/solicitacoes',orderBody(service.id),client.cookie),201);
    assert.equal((await post('/api/os/'+order.id+'/concluir',{})).status,401);
    denied(await post('/api/os/'+order.id+'/concluir',{},client.cookie));
    assert.equal((await post('/api/os/'+order.id+'/avaliar',{nota:5},client.cookie)).status,409);
    ok(await post('/api/os/'+order.id+'/aceitar',{},staff.cookie));
    denied(await post('/api/os/'+order.id+'/concluir',{},otherStaff.cookie));
    ok(await changePermissions(permissions.filter(p=>p!=='pedidos.concluir')));
    denied(await post('/api/os/'+order.id+'/concluir',{},staff.cookie));
    assert.equal((await ownOrder(order.id)).concluido_funcionario_em,null);
    ok(await changePermissions(permissions));
    const completion=await Promise.all([1,2].map(()=>post('/api/os/'+order.id+'/concluir',{},staff.cookie)));
    assert.deepEqual(completion.map(r=>r.status).sort(),[200,409]);
    const done=await ownOrder(order.id);assert(done.concluido_funcionario_em);assert.equal(done.confirmado_cliente_em,null);assert.equal(done.avaliacao_nota,null);
    denied(await post('/api/os/'+order.id+'/avaliar',{nota:5},staff.cookie));
    denied(await post('/api/os/'+order.id+'/avaliar',{nota:5},otherClient.cookie));
    for(const nota of [0,6,2.5,'5',null])assert.equal((await post('/api/os/'+order.id+'/avaliar',{nota},client.cookie)).status,400);
    assert.equal((await post('/api/os/'+order.id+'/avaliar',{nota:5,comentario:'x'.repeat(1001)},client.cookie)).status,400);
    const reviews=await Promise.all([1,2].map(()=>post('/api/os/'+order.id+'/avaliar',{nota:5,comentario:'Atendimento excelente.'},client.cookie)));
    assert.deepEqual(reviews.map(r=>r.status).sort(),[200,409]);
    const reviewed=await ownOrder(order.id);assert(reviewed.confirmado_cliente_em);assert.equal(reviewed.avaliacao_nota,5);assert.equal(reviewed.avaliacao_comentario,'Atendimento excelente.');
    const staffOrder=ok(await request('/api/os','GET',undefined,staff.cookie)).find(row=>row.id===order.id);assert.equal(staffOrder.avaliacao_nota,5);
    assert.equal((await post('/api/os/'+order.id+'/concluir',{},staff.cookie)).status,409);
  });

  await t.test('payment methods belong to the client and reject raw card credentials',async()=>{
    const cardBody={tipo:'credito',apelido:'Cartão de teste',titular:'Titular de teste',bandeira:'visa',ultimos4:'4242',validade:'2099-12'};
    assert.equal((await request('/api/pagamentos/metodos')).status,401);
    denied(await request('/api/pagamentos/metodos','GET',undefined,staff.cookie));
    denied(await post('/api/pagamentos/metodos',cardBody,staff.cookie));
    for(const extra of [{numero:'4242424242424242'},{cvv:'987'},{token:'credencial-proibida'}]) {
      assert.equal((await post('/api/pagamentos/metodos',{...cardBody,...extra},client.cookie)).status,400);
    }
    for(const invalid of [{tipo:'boleto'},{ultimos4:'4242424242424242'},{validade:'2000-01'},{validade:'2099-13'},{titular:''},{bandeira:'desconhecida'}]) {
      assert.equal((await post('/api/pagamentos/metodos',{...cardBody,...invalid},client.cookie)).status,400);
    }
    card=ok(await post('/api/pagamentos/metodos',cardBody,client.cookie),201);
    pix=ok(await post('/api/pagamentos/metodos',{tipo:'pix',apelido:'Pix de teste'},client.cookie),201);
    ok(await post('/api/pagamentos/metodos',{...cardBody,tipo:'debito'},client.cookie),201);
    ok(await post('/api/pagamentos/metodos',{tipo:'dinheiro'},client.cookie),201);
    const methods=ok(await request('/api/pagamentos/metodos','GET',undefined,client.cookie));assert.equal(methods.length,4);
    assert.equal(methods.find(m=>m.id===card.id).ultimos4,'4242');
    assert.deepEqual(ok(await request('/api/pagamentos/metodos','GET',undefined,otherClient.cookie)),[]);
    denied(await request('/api/pagamentos/metodos/'+card.id,'DELETE',undefined,otherClient.cookie));
    denied(await request('/api/pagamentos/metodos/'+card.id,'DELETE',undefined,staff.cookie));
  });

  await t.test('simulation uses owned active methods and cannot be repeated or alter an order amount',async()=>{
    const foreignMethod=ok(await post('/api/pagamentos/metodos',{tipo:'pix'},otherClient.cookie),201);
    assert.equal((await post('/api/os/'+order.id+'/pagamento',{metodo_id:card.id})).status,401);
    denied(await post('/api/os/'+order.id+'/pagamento',{metodo_id:card.id},otherClient.cookie));
    denied(await post('/api/os/'+order.id+'/pagamento',{metodo_id:card.id},staff.cookie));
    const foreignPayment=await post('/api/os/'+order.id+'/pagamento',{metodo_id:foreignMethod.id},client.cookie);
    assert([403,404,409].includes(foreignPayment.status),JSON.stringify(foreignPayment));
    assert.equal((await ownOrder(order.id)).pagamento_simulado_em,null);
    assert.equal((await post('/api/os/'+order.id+'/pagamento',{metodo_id:'1'},client.cookie)).status,400);
    const payments=await Promise.all([1,2].map(()=>post('/api/os/'+order.id+'/pagamento',{metodo_id:card.id},client.cookie)));
    assert.deepEqual(payments.map(r=>r.status).sort(),[200,409]);
    const paid=await ownOrder(order.id);assert(paid.pagamento_simulado_em);assert.equal(paid.pagamento_tipo,'credito');assert.equal(paid.pagamento_ultimos4,'4242');assert.equal(paid.preco_unitario,129.9);
    ok(await request('/api/pagamentos/metodos/'+card.id,'DELETE',undefined,client.cookie));
    assert(!ok(await request('/api/pagamentos/metodos','GET',undefined,client.cookie)).some(m=>m.id===card.id));
    const retained=await ownOrder(order.id);assert.equal(retained.pagamento_tipo,'credito');assert.equal(retained.pagamento_ultimos4,'4242');assert(retained.pagamento_simulado_em);
    const inactivePayment=await post('/api/os/'+secondOrder.id+'/pagamento',{metodo_id:card.id},client.cookie);
    assert([400,404,409].includes(inactivePayment.status),JSON.stringify(inactivePayment));
    ok(await post('/api/os/'+secondOrder.id+'/pagamento',{metodo_id:pix.id},client.cookie));
    assert.equal((await ownOrder(secondOrder.id)).pagamento_tipo,'pix');
    assert.deepEqual(ok(await request('/api/os','GET',undefined,otherClient.cookie)),[]);
  });

  await t.test('audit retains action traces without sensitive card fields or credentials',async()=>{
    const rows=await query('SELECT * FROM auditoria ORDER BY id');
    assert(rows.some(row=>row.descricao.includes('/concluir')&&row.resultado==='sucesso'));
    assert(rows.some(row=>row.descricao.includes('/avaliar')&&row.resultado==='sucesso'));
    assert(rows.some(row=>row.descricao.includes('/pagamento')&&row.resultado==='sucesso'));
    const text=JSON.stringify(rows);
    for(const secret of ['4242424242424242','credencial-proibida',account.senha,client.cookie])assert(!text.includes(secret));
    const tables=await query("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'");
    for(const {name} of tables) {
      const records=await query('SELECT * FROM "'+name.replaceAll('"','""')+'"');
      const stored=JSON.stringify(records);assert(!stored.includes('4242424242424242'));assert(!stored.includes('credencial-proibida'));
    }
    assert.deepEqual(await query('PRAGMA foreign_key_check'),[]);
  });

  await t.test('reapplying migrations preserves payment history and revoked employee permissions',async()=>{
    ok(await changePermissions([]));
    await new Promise(resolve=>{child.once('exit',resolve);child.kill();});
    await new Promise((resolve,reject)=>{
      const proc=spawn(process.execPath,['-e',"const db=require('./db');db.ready.then(()=>db.close()).catch(error=>{console.error(error);process.exitCode=1;db.close();});"],{cwd:directory,stdio:'ignore'});
      proc.once('error',reject);proc.once('exit',code=>code?reject(new Error('Falha ao reaplicar migrações')):resolve());
    });
    const [employee]=await query('SELECT permissoes FROM funcionario WHERE id=?',[staff.data.usuario.id]);
    assert.deepEqual(JSON.parse(employee.permissoes),[]);
    const [retained]=await query('SELECT * FROM os WHERE id=?',[order.id]);
    assert.equal(retained.avaliacao_nota,5);assert(retained.confirmado_cliente_em);assert(retained.pagamento_simulado_em);
    assert.deepEqual(await query('PRAGMA foreign_key_check'),[]);
  });
});
