const {
  supabaseRequest,
  hashPassword,
  verifyPassword,
  hashSessionToken,
  readCookie,
  sessionCookie,
  expiredCookie,
  createSession,
  getSession
} = require('./_lib/auth');

function sendJson(response, status, data, headers = {}){
  response.status(status).setHeader('Content-Type', 'application/json');
  Object.entries(headers).forEach(([name, value]) => response.setHeader(name, value));
  response.json(data);
}

function validUsername(username){
  return /^[A-Za-z0-9._-]{3,50}$/.test(username);
}

function validPassword(password){
  return typeof password === 'string' && password.length >= 6 && password.length <= 200;
}

module.exports = async function handler(request, response){
  try{
    const body = typeof request.body === 'string'
      ? JSON.parse(request.body || '{}')
      : (request.body || {});
    const action = body.action || 'me';

    if(action === 'me'){
      const session = await getSession(request);
      if(!session) return sendJson(response, 401, {error: 'Não autenticado.'});
      const users = await supabaseRequest(`usuarios?select=id,username&id=eq.${encodeURIComponent(session.usuario_id)}&limit=1`);
      return sendJson(response, 200, {user: users?.[0] || null});
    }

    if(action === 'logout'){
      const token = readCookie(request, 'session_token');
      if(token){
        await supabaseRequest(`sessoes_usuario?token_hash=eq.${encodeURIComponent(hashSessionToken(token))}`, {
          method: 'DELETE',
          prefer: 'return=minimal'
        });
      }
      return sendJson(response, 200, {ok: true}, { 'Set-Cookie': expiredCookie() });
    }

    if(request.method !== 'POST') return sendJson(response, 405, {error: 'Método não permitido.'});

    const username = String(body.username || '').trim().toLowerCase();
    const password = body.password;
    if(!validUsername(username)) return sendJson(response, 400, {error: 'Nome de usuário inválido.'});
    if(!validPassword(password)) return sendJson(response, 400, {error: 'A senha deve ter entre 6 e 200 caracteres.'});

    if(action === 'register'){
      const rows = await supabaseRequest('usuarios', {
        method: 'POST',
        body: JSON.stringify({username, password_hash: hashPassword(password)})
      });
      const user = rows?.[0];
      const session = await createSession(user.id);
      return sendJson(response, 201, {user: {id: user.id, username: user.username}}, { 'Set-Cookie': sessionCookie(session.token) });
    }

    if(action === 'login'){
      const rows = await supabaseRequest(`usuarios?select=id,username,password_hash&username=eq.${encodeURIComponent(username)}&limit=1`);
      const user = rows?.[0];
      if(!user || !verifyPassword(password, user.password_hash)){
        return sendJson(response, 401, {error: 'Usuário ou senha inválidos.'});
      }
      const session = await createSession(user.id);
      return sendJson(response, 200, {user: {id: user.id, username: user.username}}, { 'Set-Cookie': sessionCookie(session.token) });
    }

    return sendJson(response, 400, {error: 'Ação inválida.'});
  }catch(error){
    const message = error instanceof Error ? error.message : 'Erro interno de autenticação.';
    const status = error.status || (/duplicate|unique/i.test(message) ? 409 : 500);
    console.error('Authentication API error:', error);
    sendJson(response, status, {error: status === 409 ? 'Nome de usuário já cadastrado.' : message});
  }
};
