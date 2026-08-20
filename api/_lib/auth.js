const crypto = require('crypto');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SESSION_DAYS = 7;

function assertConfig(){
  if(!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY){
    throw new Error('Supabase server configuration is missing.');
  }
}

async function supabaseRequest(path, options = {}){
  assertConfig();
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: options.prefer || 'return=representation',
      ...(options.headers || {})
    }
  });
  const text = await response.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if(!response.ok){
    const error = new Error(data?.message || data?.details || 'Database request failed.');
    error.status = response.status;
    throw error;
  }
  return data;
}

function hashPassword(password, salt = crypto.randomBytes(16)){
  const hash = crypto.scryptSync(password, salt, 64);
  return `${salt.toString('hex')}:${hash.toString('hex')}`;
}

function verifyPassword(password, storedHash){
  const [saltHex, hashHex] = String(storedHash || '').split(':');
  if(!saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, 'hex');
  const actual = crypto.scryptSync(password, Buffer.from(saltHex, 'hex'), expected.length);
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}

function hashSessionToken(token){
  return crypto.createHash('sha256').update(token).digest('hex');
}

function readCookie(request, name){
  const cookies = request.headers.cookie || '';
  const item = cookies.split(';').map(value => value.trim()).find(value => value.startsWith(`${name}=`));
  return item ? decodeURIComponent(item.slice(name.length + 1)) : null;
}

function sessionCookie(token){
  return `session_token=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESSION_DAYS * 86400}`;
}

function expiredCookie(){
  return 'session_token=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0';
}

async function createSession(userId){
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86400000).toISOString();
  await supabaseRequest('sessoes_usuario', {
    method: 'POST',
    body: JSON.stringify({token_hash: hashSessionToken(token), usuario_id: userId, expires_at: expiresAt})
  });
  return {token, expiresAt};
}

async function getSession(request){
  const token = readCookie(request, 'session_token');
  if(!token) return null;
  const now = new Date().toISOString();
  const rows = await supabaseRequest(`sessoes_usuario?select=usuario_id,expires_at&token_hash=eq.${encodeURIComponent(hashSessionToken(token))}&expires_at=gt.${encodeURIComponent(now)}&limit=1`);
  return rows?.[0] ? {...rows[0], token} : null;
}

async function requireSession(request){
  const session = await getSession(request);
  if(!session){
    const error = new Error('Não autenticado.');
    error.status = 401;
    throw error;
  }
  return session;
}

module.exports = {
  supabaseRequest,
  hashPassword,
  verifyPassword,
  hashSessionToken,
  readCookie,
  sessionCookie,
  expiredCookie,
  createSession,
  getSession,
  requireSession
};
