var http = require('http');
var fs = require('fs');
var path = require('path');
var db = require('./db');
var auth = require('./auth');

var PORTA = Number(process.env.PORT) || 5000;
var HOST = process.env.PORT ? '0.0.0.0' : 'localhost';
const loginAttempts=new Map();

// ---------------------------------------------------------------
// Auxiliares
// ---------------------------------------------------------------

function responderJson(res, status, conteudo) {
  const send = () => { res.writeHead(status, {'Content-Type':'application/json; charset=utf-8'}); res.end(JSON.stringify(conteudo)); };
  if (!res.audit) return send();
  const a = res.audit; res.audit = null;
  const actor = a.path === '/api/login' && status === 200 ? {usuario:conteudo.usuario,perfil:conteudo.perfil} : a.session;
  db.run('INSERT INTO auditoria (ator_id,ator_tipo,ator_nome,acao,modulo,descricao,resultado,ip) VALUES (?,?,?,?,?,?,?,?)',
    [actor?.usuario.id || null,actor?.perfil || null,actor?.usuario.nome || null,
      a.action || (a.path==='/api/login'?'login':a.path==='/api/logout'?'logout':a.path.endsWith('/aceitar')?'pedido.aceito':({POST:'cadastro',PATCH:'alteracao',DELETE:'exclusao'})[a.method] || a.method), a.path.split('/')[2] || 'administracao',
      a.method+' '+a.path+' · HTTP '+status+(status===201 && conteudo.id?' · Registro #'+conteudo.id:''),status<400?'sucesso':'falha',a.ip], error => {
        if(error) { console.error('Falha ao persistir auditoria:',error.code); res.writeHead(503,{'Content-Type':'application/json'}); return res.end(JSON.stringify({erro:'Falha de auditoria. Consulte o estado da operação antes de tentar novamente.'})); }
        send();
      });
}
const sqlAll = (sql,args=[]) => new Promise((resolve,reject)=>db.all(sql,args,(e,r)=>e?reject(e):resolve(r)));
const sqlRun = (sql,args=[]) => new Promise((resolve,reject)=>db.run(sql,args,function(e){e?reject(e):resolve({id:this.lastID,changes:this.changes});}));
async function jsonBody(req) {
  let text='',size=0; for await (const chunk of req) {size+=chunk.length;if(size>16384)throw new Error('Dados muito longos.');text+=chunk;}
  const body=JSON.parse(text);if(!body || Array.isArray(body) || typeof body!=='object')throw new Error('Dados inválidos.');return body;
}



    function validarCpf(cpf) {
      cpf = (cpf || "").replace(/\D/g, "");
      if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
      let sum = 0;
      for (let i = 0; i < 9; i++) sum += parseInt(cpf[i]) * (10 - i);
      let d1 = (sum * 10) % 11; if (d1 === 10) d1 = 0;
      if (d1 !== parseInt(cpf[9])) return false;
      sum = 0;
      for (let i = 0; i < 10; i++) sum += parseInt(cpf[i]) * (11 - i);
      let d2 = (sum * 10) % 11; if (d2 === 10) d2 = 0;
      return d2 === parseInt(cpf[10]);
    }

function cadastrarConta(req, res, perfil) {
  var texto = '', tamanho = 0;
  req.on('data', function(chunk) { tamanho += chunk.length; if(tamanho <= 16384) texto += chunk; });
  req.on('end', function() {
    if(tamanho > 16384) return responderJson(res,413,{erro:'Dados muito longos.'});
    var novo;
    try { novo=JSON.parse(texto); } catch { return responderJson(res,400,{erro:'Dados inválidos.'}); }
    if(!novo || Array.isArray(novo) || !['nome','email','cpf','telefone','senha'].every(function(k){return typeof novo[k]==='string' && novo[k].trim();})) return responderJson(res,400,{erro:'Preencha nome, e-mail, CPF, telefone e senha.'});
    novo.nome=novo.nome.trim();novo.email=novo.email.trim().toLowerCase();novo.cpf=novo.cpf.replace(/\D/g,'');novo.telefone=novo.telefone.replace(/\D/g,'');
    if(novo.nome.length<3 || novo.nome.length>150 || novo.email.length>254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(novo.email) || !validarCpf(novo.cpf) || ![10,11].includes(novo.telefone.length) || novo.senha.length<8 || novo.senha.length>128) return responderJson(res,400,{erro:'Confira nome, e-mail, CPF (11 dígitos), telefone e senha (8 a 128 caracteres).'});
    if(perfil==='funcionario' && (typeof novo.especialidade!=='string' || !novo.especialidade.trim() || novo.especialidade.length>150)) return responderJson(res,400,{erro:'Informe sua especialidade.'});
    db.get('SELECT id FROM '+perfil+" WHERE LOWER(TRIM(email)) = ? OR REPLACE(REPLACE(cpf,'.',''),'-','') = ?",[novo.email,novo.cpf],function(erro,existente){
      if(erro) return responderJson(res,500,{erro:'Não foi possível verificar o cadastro.'});
      if(existente) return responderJson(res,409,{erro:'Já existe uma conta com este e-mail ou CPF neste perfil.'});
      var campos='nome,cpf,email,telefone,senha', valores=[novo.nome,novo.cpf,novo.email,novo.telefone,auth.hash(novo.senha)];
      if(perfil==='funcionario'){campos+=',especialidade,permissoes';valores.push(novo.especialidade.trim(),JSON.stringify(['pedidos.ler','pedidos.aceitar','pedidos.concluir','servicos.cadastrar']));}
      db.run('INSERT INTO '+perfil+' ('+campos+') VALUES ('+valores.map(function(){return '?';}).join(',')+')',valores,function(erro){
        if(erro) return responderJson(res,erro.code==='SQLITE_CONSTRAINT'?409:500,{erro:erro.code==='SQLITE_CONSTRAINT'?'E-mail ou CPF já cadastrado.':'Não foi possível cadastrar a conta.'});
        responderJson(res,201,{id:this.lastID,nome:novo.nome,email:novo.email,telefone:novo.telefone,especialidade:perfil==='funcionario'?novo.especialidade.trim():undefined});
      });
    });
  });
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

  var caminho = path.join(path.resolve(__dirname, '../frontend'), caminhoRelativo);

  if (!caminho.startsWith(path.resolve(__dirname,'../frontend') + path.sep) || !fs.existsSync(caminho) || !fs.statSync(caminho).isFile()) {
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

var servidor = http.createServer(async function (req, res) {
 try {
  try { await db.ready; } catch { return responderJson(res,503,{erro:'Banco de dados indisponível.'}); }
  let caminho;
  try { caminho = path.posix.normalize(decodeURIComponent(new URL(req.url, 'http://localhost').pathname)); }
  catch { return responderJson(res,400,{erro:'Endereço inválido.'}); }
  if(caminho.includes('\\'))return responderJson(res,400,{erro:'Endereço inválido.'});
  res.setHeader('Cache-Control','no-store');
  res.setHeader('X-Content-Type-Options','nosniff');
  let session = auth.read(req);
  if (req.method !== 'GET' && caminho.startsWith('/api/')) res.audit={path:caminho,method:req.method,session,ip:req.socket.remoteAddress};
  if(session) {
    try {
      const [current] = await sqlAll('SELECT id,nome,email,telefone,ativo'+(session.perfil==='funcionario'?',permissoes,especialidade':'')+' FROM '+session.perfil+' WHERE id=?',[session.usuario.id]);
      if(!current || !current.ativo) { auth.clear(req,res); session=null; }
      else {session.usuario=current;}
    } catch { return responderJson(res,503,{erro:'Não foi possível verificar a sessão.'}); }
  }
  if(res.audit)res.audit.session=session;
  if (req.method !== 'GET' && req.headers.origin && req.headers.origin !== 'http://' + req.headers.host && req.headers.origin !== 'https://' + req.headers.host) return responderJson(res,403,{erro:'Origem não permitida.'});
  if (caminho === '/api/session' && req.method === 'GET') return responderJson(res,session?200:401,session?{usuario:session.usuario,perfil:session.perfil}:{erro:'Entre novamente para continuar.'});
  if (caminho === '/api/logout' && req.method === 'POST') { auth.clear(req,res); return responderJson(res,200,{ok:true}); }
  if (caminho.toLowerCase() === '/admin' || caminho.toLowerCase().startsWith('/admin/')) {
    if (!session || session.perfil !== 'admin') { res.writeHead(302,{Location:'/admin-login.html'});return res.end(); }
    if(caminho.endsWith('.html')) await sqlRun('INSERT INTO auditoria (ator_id,ator_tipo,ator_nome,acao,modulo,descricao,resultado,ip) VALUES (?,?,?,?,?,?,?,?)',[session.usuario.id,'admin',session.usuario.nome,'acesso','administracao','GET '+caminho,'sucesso',req.socket.remoteAddress]);
  }
  const adminOnly = caminho === '/api/admins' ||
    caminho.startsWith('/api/admin/') ||
    (/^\/api\/(clientes|funcionarios)\//.test(caminho)) ||
    (['/api/clientes','/api/funcionarios'].includes(caminho) && req.method === 'GET') ||
    (caminho.startsWith('/api/') && req.method === 'DELETE' && !/^\/api\/pagamentos\/metodos\/\d+$/.test(caminho)) ||
    (caminho === '/api/servicos' && !['GET','POST'].includes(req.method)) ||
    (caminho === '/api/os' && req.method === 'POST');
  if (adminOnly && (!session || session.perfil !== 'admin')) return responderJson(res,session?403:401,{erro:'Acesso exclusivo da administração.'});
  if ((caminho === '/api/os' || caminho.startsWith('/api/os/') || caminho === '/api/solicitacoes') && !session) return responderJson(res,401,{erro:'Entre novamente para continuar.'});


  if(session?.perfil==='funcionario' && (caminho==='/api/os' || /\/aceitar$/.test(caminho))) {
    const permissions=JSON.parse(session.usuario.permissoes);
    if(!permissions.includes(req.method==='GET'?'pedidos.ler':'pedidos.aceitar'))return responderJson(res,403,{erro:'Seu acesso a esta operação foi desativado pela administração.'});
  }
  // Carteira demonstrativa: somente metadados, isolados pela sessão do cliente.
  if(caminho==='/api/pagamentos/metodos' || /^\/api\/pagamentos\/metodos\/\d+$/.test(caminho)) {
    if(!session)return responderJson(res,401,{erro:'Entre novamente para continuar.'});
    if(session.perfil!=='cliente')return responderJson(res,403,{erro:'Somente clientes gerenciam suas formas de pagamento.'});
    try {
      if(caminho==='/api/pagamentos/metodos' && req.method==='GET') {
        return responderJson(res,200,await sqlAll('SELECT id,tipo,apelido,titular,bandeira,ultimos4,validade FROM metodo_pagamento WHERE id_cliente=? AND ativo=1 ORDER BY id DESC',[session.usuario.id]));
      }
      if(caminho==='/api/pagamentos/metodos' && req.method==='POST') {
        const data=await jsonBody(req),card=['credito','debito'].includes(data.tipo);
        const allowed=card?['tipo','apelido','titular','bandeira','ultimos4','validade']:['tipo','apelido'];
        if(Object.keys(data).some(k=>!allowed.includes(k)))return responderJson(res,400,{erro:'Envie apenas os metadados permitidos. Número completo, CVV e credenciais não são aceitos.'});
        if(!['credito','debito','pix','dinheiro'].includes(data.tipo) || (data.apelido!==undefined && (typeof data.apelido!=='string' || data.apelido.length>60)))return responderJson(res,400,{erro:'Forma de pagamento ou apelido inválido.'});
        const month=new Date().toLocaleDateString('en-CA',{timeZone:'America/Sao_Paulo'}).slice(0,7);
        if(card && (typeof data.titular!=='string' || data.titular.trim().length<3 || data.titular.length>100 ||
          !['visa','mastercard','elo','amex','outro'].includes(data.bandeira) ||
          typeof data.ultimos4!=='string' || !/^\d{4}$/.test(data.ultimos4) ||
          typeof data.validade!=='string' || !/^\d{4}-(0[1-9]|1[0-2])$/.test(data.validade) || data.validade<month))return responderJson(res,400,{erro:'Confira titular, bandeira, últimos quatro dígitos e validade do cartão demonstrativo.'});
        const result=await sqlRun('INSERT INTO metodo_pagamento (id_cliente,tipo,apelido,titular,bandeira,ultimos4,validade) VALUES (?,?,?,?,?,?,?)',
          [session.usuario.id,data.tipo,data.apelido?.trim() || '',card?data.titular.trim():null,card?data.bandeira:null,card?data.ultimos4:null,card?data.validade:null]);
        res.audit.action='pagamento.metodo_cadastrado';
        return responderJson(res,201,{id:result.id,simulado:true});
      }
      if(req.method==='DELETE' && caminho!=='/api/pagamentos/metodos') {
        const result=await sqlRun('UPDATE metodo_pagamento SET ativo=0 WHERE id=? AND id_cliente=? AND ativo=1',[Number(caminho.split('/')[4]),session.usuario.id]);
        if(!result.changes)return responderJson(res,404,{erro:'Forma de pagamento não encontrada.'});
        res.audit.action='pagamento.metodo_removido';
        return responderJson(res,200,{ok:true});
      }
      return responderJson(res,405,{erro:'Operação não permitida.'});
    } catch(error) {return responderJson(res,error.code?500:400,{erro:error.code?'Não foi possível salvar a forma de pagamento.':'Dados inválidos ou muito longos.'});}
  }

  const orderAction=caminho.match(/^\/api\/os\/(\d+)\/(concluir|avaliar|pagamento)$/);
  if(orderAction) {
    if(req.method!=='POST')return responderJson(res,405,{erro:'Operação não permitida.'});
    const id=Number(orderAction[1]),action=orderAction[2];
    const requiredRole=action==='concluir'?'funcionario':'cliente';
    if(session.perfil!==requiredRole)return responderJson(res,403,{erro:'Este perfil não pode realizar esta operação.'});
    if(action==='concluir' && !JSON.parse(session.usuario.permissoes).includes('pedidos.concluir'))return responderJson(res,403,{erro:'Você não tem permissão para concluir pedidos.'});
    try {
      const [order]=await sqlAll('SELECT * FROM os WHERE id=? AND '+(requiredRole==='cliente'?'id_cliente':'id_funcionario')+'=?',[id,session.usuario.id]);
      if(!order)return responderJson(res,404,{erro:'Pedido não encontrado para esta conta.'});
      if(action==='concluir') {
        const result=await sqlRun("UPDATE os SET concluido_funcionario_em=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id=? AND id_funcionario=? AND concluido_funcionario_em IS NULL",[id,session.usuario.id]);
        if(!result.changes)return responderJson(res,409,{erro:'O funcionário já marcou este serviço como feito.'});
        res.audit.action='servico.feito_pelo_funcionario';
      } else if(action==='avaliar') {
        const data=await jsonBody(req);
        if(Object.keys(data).some(k=>!['nota','comentario'].includes(k)) || !Number.isInteger(data.nota) || data.nota<1 || data.nota>5 ||
          (data.comentario!==undefined && (typeof data.comentario!=='string' || data.comentario.length>1000)))return responderJson(res,400,{erro:'Escolha uma nota de 1 a 5 e um comentário de até 1000 caracteres.'});
        const result=await sqlRun("UPDATE os SET confirmado_cliente_em=strftime('%Y-%m-%dT%H:%M:%fZ','now'),avaliacao_nota=?,avaliacao_comentario=? WHERE id=? AND id_cliente=? AND concluido_funcionario_em IS NOT NULL AND confirmado_cliente_em IS NULL",
          [data.nota,data.comentario?.trim() || '',id,session.usuario.id]);
        if(!result.changes)return responderJson(res,409,{erro:'Aguarde o funcionário concluir o serviço. Cada serviço pode ser avaliado uma única vez.'});
        res.audit.action='servico.avaliado_e_confirmado';
      } else {
        const data=await jsonBody(req);
        if(Object.keys(data).some(k=>k!=='metodo_id') || !Number.isSafeInteger(data.metodo_id) || data.metodo_id<1)return responderJson(res,400,{erro:'Selecione uma forma de pagamento cadastrada.'});
        const month=new Date().toLocaleDateString('en-CA',{timeZone:'America/Sao_Paulo'}).slice(0,7);
        // A condição na própria escrita impede repetição e uso de métodos de outra conta.
        const result=await sqlRun(`UPDATE os SET pagamento_metodo_id=?,pagamento_simulado_em=strftime('%Y-%m-%dT%H:%M:%fZ','now')
          WHERE id=? AND id_cliente=? AND pagamento_simulado_em IS NULL AND EXISTS
          (SELECT 1 FROM metodo_pagamento WHERE id=? AND id_cliente=? AND ativo=1 AND (tipo IN ('pix','dinheiro') OR validade>=?))`,
          [data.metodo_id,id,session.usuario.id,data.metodo_id,session.usuario.id,month]);
        if(!result.changes)return responderJson(res,409,{erro:'Pagamento já simulado ou forma de pagamento indisponível. Atualize a página.'});
        res.audit.action='pagamento.simulado_sem_cobranca';
      }
      return responderJson(res,200,{id,ok:true,...(action==='pagamento'?{simulado:true,mensagem:'Simulação registrada. Nenhuma cobrança foi realizada.'}:{})});
    } catch(error) {return responderJson(res,error.code?500:400,{erro:error.code?'Não foi possível atualizar o pedido.':'Dados inválidos ou muito longos.'});}
  }

  if(caminho.startsWith('/api/admin/') || /^\/api\/(clientes|funcionarios)\/\d+$/.test(caminho)) {
    try {
      const params=new URL(req.url,'http://localhost').searchParams;
      const from=params.get('inicio') || '',to=params.get('fim') || '';
      if((from && !/^\d{4}-\d{2}-\d{2}$/.test(from)) || (to && !/^\d{4}-\d{2}-\d{2}$/.test(to)) || (from && to && from>to))return responderJson(res,400,{erro:'Intervalo de datas inválido.'});
      const match=caminho.match(/^\/api\/(clientes|funcionarios)\/(\d+)$/);
      if(match) {
        const table=match[1]==='clientes'?'cliente':'funcionario',id=Number(match[2]);
        const [person]=await sqlAll('SELECT id,nome,email,cpf,telefone,ativo,criado_em,atualizado_em'+(table==='funcionario'?',especialidade,admissao,permissoes':'')+' FROM '+table+' WHERE id=?',[id]);
        if(!person)return responderJson(res,404,{erro:'Pessoa não encontrada.'});
        if(req.method==='GET') {
          const orders=await sqlAll('SELECT os.*,servico.nome_servico FROM os JOIN servico ON servico.id=os.id_servico WHERE '+(table==='cliente'?'id_cliente':'id_funcionario')+'=? ORDER BY os.id DESC',[id]);
          const history=await sqlAll('SELECT * FROM auditoria WHERE (ator_tipo=? AND ator_id=?) OR descricao LIKE ? ORDER BY id DESC LIMIT 100',[table,id,'% '+caminho+' ·%']);
          return responderJson(res,200,{pessoa:person,pedidos:orders,historico:history});
        }
        if(req.method==='DELETE') {
          const [linked]=await sqlAll('SELECT COUNT(*) total FROM os WHERE '+(table==='cliente'?'id_cliente':'id_funcionario')+'=?',[id]);
          if(linked.total)return responderJson(res,409,{erro:'Há pedidos vinculados. Desative esta conta para preservar o histórico.'});
          await sqlRun('DELETE FROM '+table+' WHERE id=?',[id]);
          return responderJson(res,200,{removido:id});
        }
        if(req.method==='PATCH') {
          const body=await jsonBody(req),fields=[],values=[];
          for(const key of Object.keys(body)) {
            if(!['nome','email','telefone','ativo',...(table==='funcionario'?['especialidade','admissao','permissoes']:[])].includes(key))return responderJson(res,400,{erro:'Campo não permitido: '+key});
            let value=body[key];
            if(key==='ativo') { if(![0,1].includes(value))throw new Error('Status inválido.'); }
            else if(key==='permissoes') {
              if(!Array.isArray(value) || value.some(p=>!['pedidos.ler','pedidos.aceitar','pedidos.concluir','servicos.cadastrar'].includes(p)))throw new Error('Permissões inválidas.');
              value=JSON.stringify([...new Set(value)]);res.audit.action='permissoes.alteradas';
            } else if(key==='admissao') {
              if(value!==null && (typeof value!=='string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(new Date(value).getTime()) || new Date(value).toISOString().slice(0,10)!==value))throw new Error('Data de admissão inválida.');
            } else {
              if(typeof value!=='string')throw new Error('Dados inválidos.');value=value.trim();
              if(key==='email') {value=value.toLowerCase();if(value.length>254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))throw new Error('E-mail inválido.');}
              else if(key==='telefone') {value=value.replace(/\D/g,'');if(![10,11].includes(value.length))throw new Error('Telefone inválido.');}
              else if(value.length<3 || value.length>150)throw new Error('Informe nome e especialidade entre 3 e 150 caracteres.');
            }
            fields.push(key+'=?');values.push(value);
          }
          if(!fields.length)throw new Error('Nenhuma alteração informada.');
          values.push(id);await sqlRun('UPDATE '+table+' SET '+fields.join(',')+", atualizado_em=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id=?",values);
          return responderJson(res,200,{ok:true});
        }
      }
      if(req.method==='GET' && caminho==='/api/admin/estatisticas') {
        const people=await sqlAll("SELECT id,nome,ativo,criado_em,'cliente' perfil,NULL especialidade FROM cliente UNION ALL SELECT id,nome,ativo,criado_em,'funcionario',especialidade FROM funcionario UNION ALL SELECT id,nome,ativo,criado_em,'admin',NULL FROM admin");
        const filtered=people.filter(p=>p.criado_em && (!from || p.criado_em.slice(0,10)>=from) && (!to || p.criado_em.slice(0,10)<=to));
        const monthly={};for(const p of filtered){const month=p.criado_em.slice(0,7);monthly[month]=(monthly[month]||0)+1;}
        const roles={};for(const p of people.filter(p=>p.perfil==='funcionario'))roles[p.especialidade]=(roles[p.especialidade]||0)+1;
        const activity=await sqlAll("SELECT modulo,resultado,COUNT(*) total FROM auditoria WHERE (?='' OR substr(criado_em,1,10)>=?) AND (?='' OR substr(criado_em,1,10)<=?) GROUP BY modulo,resultado",[from,from,to,to]);
        const recent=await sqlAll('SELECT * FROM auditoria ORDER BY id DESC LIMIT 10');
        return responderJson(res,200,{total:people.length,clientes:people.filter(p=>p.perfil==='cliente').length,funcionarios:people.filter(p=>p.perfil==='funcionario').length,administradores:people.filter(p=>p.perfil==='admin').length,clientes_ativos:people.filter(p=>p.perfil==='cliente'&&p.ativo).length,funcionarios_ativos:people.filter(p=>p.perfil==='funcionario'&&p.ativo).length,novos:filtered.length,sem_data:people.filter(p=>!p.criado_em).length,mensal:monthly,cargos:roles,atividades:activity,recentes:recent});
      }
      if(req.method==='GET' && caminho==='/api/admin/logs') {
        const where=[],args=[];
        for(const [param,column] of [['usuario','ator_nome'],['evento','acao'],['modulo','modulo'],['resultado','resultado']])if(params.get(param)){where.push(column+' LIKE ?');args.push('%'+params.get(param).slice(0,150)+'%');}
        if(from){where.push('substr(criado_em,1,10)>=?');args.push(from);}if(to){where.push('substr(criado_em,1,10)<=?');args.push(to);}
        const clause=where.length?' WHERE '+where.join(' AND '):'';
        const page=Math.max(1,Math.min(1000000,Math.floor(Number(params.get('pagina')))||1));
        const [count]=await sqlAll('SELECT COUNT(*) total FROM auditoria'+clause,args);
        const rows=await sqlAll('SELECT * FROM auditoria'+clause+' ORDER BY id DESC LIMIT 25 OFFSET ?',[...args,(page-1)*25]);
        return responderJson(res,200,{registros:rows,total:count.total,pagina:page});
      }
      return responderJson(res,404,{erro:'Operação não encontrada.'});
    } catch(error) {return responderJson(res,error.code==='SQLITE_CONSTRAINT'?409:error.code?500:400,{erro:error.code==='SQLITE_CONSTRAINT'?'E-mail já cadastrado neste perfil.':error.code?'Não foi possível concluir a operação.':error instanceof SyntaxError?'Dados JSON inválidos.':error.message});}
  }

  // Informações públicas sem dados de contato ou documentos dos usuários.
  if (req.method === 'GET' && caminho === '/api/profissionais') {
    db.all('SELECT id, nome, especialidade FROM funcionario WHERE ativo=1 ORDER BY nome', [], function (erro, linhas) {
      responderJson(res, erro ? 500 : 200, erro ? { erro: 'Não foi possível carregar os profissionais.' } : linhas);
    });
    return;
  }
  if (req.method === 'GET' && caminho === '/api/resumo') {
    db.get('SELECT (SELECT COUNT(*) FROM cliente) AS clientes, ' +
      '(SELECT COUNT(*) FROM funcionario) AS funcionarios, (SELECT COUNT(*) FROM servico) AS servicos, ' +
      '(SELECT COUNT(*) FROM os) AS pedidos', [], function (erro, linha) {
      responderJson(res, erro ? 500 : 200, erro ? { erro: 'Não foi possível carregar o resumo.' } : linha);
    });
    return;
  }

  // ---- autenticar cliente ou funcionario no SQLite ----
  if (req.method === 'POST' && caminho === '/api/login') {
    const ip=req.socket.remoteAddress;
    const now=Date.now();
    for(const [key,item] of loginAttempts)if(item.until<now)loginAttempts.delete(key);
    const attempt=loginAttempts.get(ip)||{count:0,until:now+15*60*1000};
    if(attempt.count>=30)return responderJson(res,429,{erro:'Muitas tentativas. Aguarde 15 minutos.'});
    attempt.count++;loginAttempts.set(ip,attempt);
    var textoLogin = '', tamanhoLogin = 0;

    req.on('data', function (pedaco) {
      tamanhoLogin += pedaco.length; if(tamanhoLogin <= 16384) textoLogin += pedaco;
    });

    req.on('end', function () {
      if(tamanhoLogin > 16384) return responderJson(res,413,{erro:'Dados muito longos.'});
      var credenciais;
      try {
        credenciais = JSON.parse(textoLogin);
      } catch (erro) {
        return responderJson(res, 400, { erro: 'Dados invalidos.' });
      }

      if (!credenciais ||
          !['cliente','funcionario','admin'].includes(credenciais.perfil) ||
          typeof credenciais.email !== 'string' || !credenciais.email.trim() ||
          typeof credenciais.senha !== 'string' || !credenciais.senha || credenciais.senha.length>128 || credenciais.email.length>254) {
        return responderJson(res, 400, { erro: 'Perfil, e-mail e senha sao obrigatorios.' });
      }

      // A tabela vem apenas dos perfis permitidos; valores usam parâmetros.
      var tabelaLogin = credenciais.perfil;
      var camposLogin = 'id, nome, email, telefone, senha, ativo' +
                        (tabelaLogin === 'funcionario' ? ', especialidade' : '');
      var sqlLogin = 'SELECT ' + camposLogin + ' FROM ' + tabelaLogin +
                    ' WHERE LOWER(TRIM(email)) = ? LIMIT 1';
      var valoresLogin = [credenciais.email.trim().toLowerCase()];

      db.get(sqlLogin, valoresLogin, function (erro, usuario) {
        if (erro) {
          return responderJson(res, 500, { erro: 'Nao foi possivel verificar o acesso. Tente novamente.' });
        }
        if (!usuario || !usuario.ativo || credenciais.senha.length>128 || !auth.verify(credenciais.senha,usuario.senha)) {
          return responderJson(res, 401, { erro: 'E-mail ou senha invalidos para este perfil.' });
        }
        if (!usuario.senha.startsWith('scrypt$')) db.run('UPDATE '+tabelaLogin+' SET senha=? WHERE id=?',[auth.hash(credenciais.senha),usuario.id]);
        loginAttempts.delete(ip);
        delete usuario.senha; delete usuario.ativo;
        auth.start(req,res,usuario,credenciais.perfil);
        responderJson(res, 200, { usuario: usuario, perfil: credenciais.perfil });
      });
    });

    return;
  }

  // Contas administrativas usam o mesmo cadastro validado dos demais perfis.
  if (req.method === 'GET' && caminho === '/api/admins') {
    db.all('SELECT id, nome, email, telefone, ativo, criado_em, atualizado_em FROM admin ORDER BY id DESC', [], function(erro, linhas) {
      responderJson(res, erro ? 500 : 200, erro ? {erro:'Não foi possível carregar administradores.'} : linhas);
    });
    return;
  }
  if (req.method === 'POST' && caminho === '/api/admins') { cadastrarConta(req,res,'admin'); return; }

  // =================================================================
  // API: cliente
  // =================================================================

  // ---- listar ----
  if (req.method === 'GET' && caminho === '/api/clientes') {
    db.all('SELECT id, nome, cpf, email, telefone, ativo, criado_em, atualizado_em FROM cliente ORDER BY id DESC', [], function (erro, linhas) {
      if (erro) {
        return responderJson(res, 500, { erro: erro.message });
      }
      responderJson(res, 200, linhas);
    });
    return;
  }

  // ---- cadastrar ----
  if (req.method === 'POST' && caminho === '/api/clientes') { cadastrarConta(req,res,'cliente'); return; }


  // =================================================================
  // API: funcionario
  // =================================================================

  // ---- listar ----
  if (req.method === 'GET' && caminho === '/api/funcionarios') {
    db.all('SELECT id, nome, cpf, email, telefone, especialidade, ativo, criado_em, atualizado_em, admissao, permissoes FROM funcionario ORDER BY id DESC', [], function (erro, linhas) {
      if (erro) {
        return responderJson(res, 500, { erro: erro.message });
      }
      responderJson(res, 200, linhas);
    });
    return;
  }

  // ---- cadastrar ----
  if (req.method === 'POST' && caminho === '/api/funcionarios') { cadastrarConta(req,res,'funcionario'); return; }


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
    if(!session)return responderJson(res,401,{erro:'Entre novamente para continuar.'});
    if(session.perfil!=='admin' && !(session.perfil==='funcionario' && JSON.parse(session.usuario.permissoes).includes('servicos.cadastrar')))return responderJson(res,403,{erro:'Você não tem permissão para cadastrar serviços.'});
    try {
      const data=await jsonBody(req);
      if(Object.keys(data).some(k=>!['nome_servico','descricao','preco_base'].includes(k)) ||
         typeof data.nome_servico!=='string' || !data.nome_servico.trim() || data.nome_servico.length>150 ||
         typeof data.preco_base!=='number' || !Number.isFinite(data.preco_base) || data.preco_base<0 || data.preco_base>10000000 ||
         Math.abs(data.preco_base*100-Math.round(data.preco_base*100))>0.000001 ||
         (data.descricao!=null && (typeof data.descricao!=='string' || data.descricao.length>1000)))return responderJson(res,400,{erro:'Informe nome, descrição e preço válido com até duas casas decimais.'});
      const creator=session.perfil==='funcionario'?session.usuario.id:null;
      const result=await sqlRun('INSERT INTO servico (nome_servico,descricao,preco_base,criado_por_funcionario) VALUES (?,?,?,?)',[data.nome_servico.trim(),data.descricao?.trim() || '',data.preco_base,creator]);
      res.audit.action='servico.cadastrado';
      return responderJson(res,201,{id:result.id,nome_servico:data.nome_servico.trim(),descricao:data.descricao?.trim() || '',preco_base:data.preco_base,criado_por_funcionario:creator});
    } catch(error) {return responderJson(res,error.code?500:400,{erro:error.code?'Não foi possível cadastrar o serviço.':'Dados inválidos ou muito longos.'});}
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

  // Solicitações do catálogo: o preço vem do banco, nunca do navegador.
  if (req.method === 'POST' && caminho === '/api/solicitacoes') {
    if(session.perfil !== 'cliente')return responderJson(res,403,{erro:'Somente clientes podem solicitar serviços.'});
    let body = '', size = 0;
    req.on('data', chunk => { size += chunk.length; if (size <= 16384) body += chunk; });
    req.on('end', () => {
      if (size > 16384) return responderJson(res, 413, {erro:'Solicitação muito longa.'});
      let order;
      try { order = JSON.parse(body); } catch { return responderJson(res,400,{erro:'Dados inválidos.'}); }
      if (!order || !Number.isSafeInteger(order.id_servico) || order.id_servico<1 ||
          typeof order.data !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(order.data) ||
          !['local','descricao'].every(key => typeof order[key]==='string' && order[key].trim().length>=3 && order[key].length<=1000)) {
        return responderJson(res,400,{erro:'Informe serviço, data, endereço e descrição válidos.'});
      }
      const date = new Date(order.data+'T12:00:00Z');
      const today = new Date().toLocaleDateString('en-CA',{timeZone:'America/Sao_Paulo'});
      if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0,10)!==order.data || order.data<today) return responderJson(res,400,{erro:'Escolha uma data válida a partir de hoje.'});
      db.get('SELECT preco_base FROM servico WHERE id=?',
        [order.id_servico], (error,row) => {
          if (error) return responderJson(res,500,{erro:'Não foi possível consultar os cadastros.'});
          if (!row) return responderJson(res,404,{erro:'Serviço não encontrado. Atualize a página.'});
          db.run('INSERT INTO os (id_cliente,id_servico,id_funcionario,preco_unitario,data,local,descricao) VALUES (?,?,?,?,?,?,?)',
            [session.usuario.id,order.id_servico,null,row.preco_base,order.data,order.local.trim(),order.descricao.trim()], function(error) {
              if(error) return responderJson(res,500,{erro:'Não foi possível registrar o pedido.'});
              responderJson(res,201,{id:this.lastID,preco_unitario:row.preco_base});
            });
        });
    });
    return;
  }

  if(req.method === 'POST' && /^\/api\/os\/\d+\/aceitar$/.test(caminho)) {
    if(session.perfil !== 'funcionario')return responderJson(res,403,{erro:'Somente profissionais podem aceitar pedidos.'});
    const id=Number(caminho.split('/')[3]);
    db.run('UPDATE os SET id_funcionario=? WHERE id=? AND id_funcionario IS NULL', [session.usuario.id,id], function(error) {
      if(error)return responderJson(res,500,{erro:'Não foi possível aceitar o pedido.'});
      if(!this.changes)return responderJson(res,409,{erro:'Este pedido já foi aceito ou não está mais disponível. Atualize a lista.'});
      responderJson(res,200,{id,id_funcionario:session.usuario.id});
    });return;
  }

  // ---- listar ----
  if (req.method === 'GET' && caminho === '/api/os') {
    var sqlListaOs = 'SELECT ' +
      'os.id, os.id_cliente, os.id_servico, os.id_funcionario, ' +
      'cliente.nome AS cliente, ' +
      'servico.nome_servico AS servico, ' +
      'funcionario.nome AS funcionario, ' +
      'os.preco_unitario, ' +
      'os.data, ' +
      'os.local, ' +
      'os.descricao, os.concluido_funcionario_em, os.confirmado_cliente_em, os.avaliacao_nota, os.avaliacao_comentario, ' +
      'os.pagamento_metodo_id, os.pagamento_simulado_em, metodo_pagamento.tipo AS pagamento_tipo, metodo_pagamento.ultimos4 AS pagamento_ultimos4 ' +
      'FROM os ' +
      'INNER JOIN cliente ON os.id_cliente = cliente.id ' +
      'INNER JOIN servico ON os.id_servico = servico.id ' +
      'LEFT JOIN funcionario ON os.id_funcionario = funcionario.id ' +
      'LEFT JOIN metodo_pagamento ON os.pagamento_metodo_id = metodo_pagamento.id ';

    var parametrosOs = [];
    if (session.perfil === 'cliente') {
      sqlListaOs += 'WHERE os.id_cliente = ? ';
      parametrosOs.push(session.usuario.id);
    } else if (session.perfil === 'funcionario') {
      sqlListaOs += 'WHERE os.id_funcionario = ? OR os.id_funcionario IS NULL ';
      parametrosOs.push(session.usuario.id);
    }
    sqlListaOs += 'ORDER BY os.id DESC';

    db.all(sqlListaOs, parametrosOs, function (erro, linhas) {
      if (erro) {
        return responderJson(res, 500, { erro: erro.message });
      }
      // A equipe consulta a situação da simulação, sem os identificadores do cartão.
      if(session.perfil==='funcionario')for(const row of linhas){delete row.pagamento_ultimos4;delete row.pagamento_metodo_id;}
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
 } catch(error) { console.error('Erro interno:',error.code || error.name); if(!res.audit)res.audit={path:'/api/sistema',method:req.method,action:'erro_interno',session:auth.read(req),ip:req.socket.remoteAddress}; if(!res.headersSent)responderJson(res,500,{erro:'Erro interno. Tente novamente.'});else res.end(); }
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
