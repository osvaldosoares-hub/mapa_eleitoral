const {supabaseRequest, requireSession} = require('./_lib/auth');

module.exports = async function handler(request, response){
  try{
    await requireSession(request);
    const path = String(request.query.path || '');
    if(!path.startsWith('registros_eleitores')){
      return response.status(400).json({error: 'Recurso não permitido.'});
    }

    const data = await supabaseRequest(path, {
      method: request.method,
      body: ['GET', 'HEAD'].includes(request.method) ? undefined : JSON.stringify(request.body || {}),
      prefer: request.headers.prefer || 'return=representation'
    });
    if(request.method === 'DELETE') return response.status(204).end();
    return response.status(200).json(data);
  }catch(error){
    response.status(error.status || 500).json({error: error.message});
  }
};
