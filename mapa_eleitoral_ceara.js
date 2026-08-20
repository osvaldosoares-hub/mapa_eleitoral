const MUNICIPIOS = [
  {nome:"Fortaleza", lat:-3.7172, lng:-38.5433},
  {nome:"Caucaia", lat:-3.7361, lng:-38.6531},
  {nome:"Juazeiro do Norte", lat:-7.2130, lng:-39.3155},
  {nome:"Maracanaú", lat:-3.8767, lng:-38.6256},
  {nome:"Sobral", lat:-3.6880, lng:-40.3499},
  {nome:"Crato", lat:-7.2340, lng:-39.4097},
  {nome:"Itapipoca", lat:-3.4942, lng:-39.5786},
  {nome:"Maranguape", lat:-3.8907, lng:-38.6836},
  {nome:"Iguatu", lat:-6.3597, lng:-39.2986},
  {nome:"Quixadá", lat:-4.9714, lng:-39.0158},
  {nome:"Canindé", lat:-4.3592, lng:-39.3117},
  {nome:"Aquiraz", lat:-3.9014, lng:-38.3911},
  {nome:"Pacatuba", lat:-3.9836, lng:-38.6197},
  {nome:"Crateús", lat:-5.1783, lng:-40.6775},
  {nome:"Aracati", lat:-4.5619, lng:-37.7697},
  {nome:"Russas", lat:-4.9397, lng:-37.9758},
  {nome:"Icó", lat:-6.4030, lng:-38.8586},
  {nome:"Tianguá", lat:-3.7317, lng:-40.9928},
  {nome:"Camocim", lat:-2.9022, lng:-40.8408},
  {nome:"Pacajus", lat:-4.1717, lng:-38.4600},
  {nome:"Horizonte", lat:-4.0961, lng:-38.4972},
  {nome:"Eusébio", lat:-3.8905, lng:-38.4514},
  {nome:"Quixeramobim", lat:-5.1994, lng:-39.2919},
  {nome:"Limoeiro do Norte", lat:-5.1478, lng:-38.0942},
  {nome:"Barbalha", lat:-7.3081, lng:-39.3019},
  {nome:"Missão Velha", lat:-7.2381, lng:-39.1444},
  {nome:"Baturité", lat:-4.3283, lng:-38.8814},
  {nome:"Beberibe", lat:-4.1789, lng:-38.1319},
  {nome:"Cascavel", lat:-4.1319, lng:-38.2361},
  {nome:"Trairi", lat:-3.2758, lng:-39.2681},
  {nome:"Cariré", lat:-3.9531, lng:-40.4708},
  {nome:"Chorozinho", lat:-4.1439, lng:-38.5044},
  {nome:"Itapajé", lat:-3.6839, lng:-39.5814},
  {nome:"Pentecoste", lat:-3.7936, lng:-39.2686},
  {nome:"Boa Viagem", lat:-5.1264, lng:-39.7325},
  {nome:"Acaraú", lat:-2.8858, lng:-40.1200},
  {nome:"Granja", lat:-3.1233, lng:-40.8283},
  {nome:"Jaguaribe", lat:-5.8908, lng:-38.6111},
  {nome:"Morada Nova", lat:-5.1103, lng:-38.3733},
  {nome:"Tauá", lat:-6.0011, lng:-40.2953},
  {nome:"Cedro", lat:-6.5589, lng:-39.0700},
  {nome:"Brejo Santo", lat:-7.4906, lng:-38.9861},
  {nome:"Milagres", lat:-7.3006, lng:-38.9403},
  {nome:"Ipu", lat:-4.3231, lng:-40.7139}
].sort((a,b)=>a.nome.localeCompare(b.nome, 'pt-BR'));

const TABLE = "registros_eleitores";

let registros = [];
let map, markersLayer;
let zonasEleitorais = [];
let secoesEleitorais = [];
let authMode = 'login';

function setAuthMessage(message, type = ''){
  const element = document.getElementById('authMsg');
  element.textContent = message;
  element.className = `msg ${type}`.trim();
}

function setAuthMode(mode){
  authMode = mode;
  const isSignup = mode === 'signup';
  document.getElementById('loginTab').classList.toggle('active', !isSignup);
  document.getElementById('signupTab').classList.toggle('active', isSignup);
  document.getElementById('authSubmit').textContent = isSignup ? 'Criar conta' : 'Entrar';
  document.getElementById('authPassword').autocomplete = isSignup ? 'new-password' : 'current-password';
  setAuthMessage('');
}

function showProtectedApp(){
  document.getElementById('authScreen').hidden = true;
  document.getElementById('protectedApp').hidden = false;
  initMap();
  populateSelect();
  loadZonasEleitorais().then(() => {
    document.getElementById('municipio').dispatchEvent(new Event('change'));
    loadRegistros();
  });
}

async function showAuthScreen(){
  await fetch('/api/auth', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({action:'logout'})});
  document.getElementById('protectedApp').hidden = true;
  document.getElementById('authScreen').hidden = false;
}

async function handleAuthSubmit(event){
  event.preventDefault();
  const username = document.getElementById('authUsername').value.trim();
  const password = document.getElementById('authPassword').value;
  const button = document.getElementById('authSubmit');

  if(!/^[A-Za-z0-9._-]{3,50}$/.test(username)){
    setAuthMessage('Use de 3 a 50 caracteres: letras, números, ponto, hífen ou sublinhado.', 'err');
    return;
  }
  button.disabled = true;
  setAuthMessage(authMode === 'signup' ? 'Criando conta...' : 'Entrando...');
  try{
    const response = await fetch('/api/auth', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({action: authMode === 'signup' ? 'register' : 'login', username, password})
    });
    const data = await response.json().catch(() => ({}));
    if(!response.ok){
      if(response.status === 405){
        throw new Error('A API não está ativa neste servidor. Execute "npx vercel dev" e abra a URL informada pela Vercel.');
      }
      throw new Error(data.error || 'Não foi possível autenticar.');
    }
    showProtectedApp(data);
  }catch(error){
    setAuthMessage(error.message, 'err');
  }finally{
    button.disabled = false;
  }
}

function initAuthentication(){
  document.getElementById('loginTab').addEventListener('click', () => setAuthMode('login'));
  document.getElementById('signupTab').addEventListener('click', () => setAuthMode('signup'));
  document.getElementById('authForm').addEventListener('submit', handleAuthSubmit);
  document.getElementById('logoutButton').addEventListener('click', showAuthScreen);
  fetch('/api/auth', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({action:'me'})})
    .then(response => response.ok ? response.json() : null)
    .then(session => session ? showProtectedApp(session) : (document.getElementById('authScreen').hidden = false));
}

async function supabaseFetch(path, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...(options.prefer ? {Prefer: options.prefer} : {})
  };
  const res = await fetch(`/api/data?path=${encodeURIComponent(path)}`, {
    method: options.method || 'GET',
    headers,
    body: options.method && options.method !== 'GET' ? options.body : undefined
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Database error ${res.status}: ${text}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

function initMap(){
  map = L.map('map', {scrollWheelZoom:false}).setView([-5.1, -39.3], 7);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution:'&copy; OpenStreetMap',
    maxZoom: 12
  }).addTo(map);
  markersLayer = L.layerGroup().addTo(map);
}

function populateSelect(){
  const sel = document.getElementById('municipio');
  sel.innerHTML = '<option value="" disabled selected>Selecione o município</option>' +
    MUNICIPIOS.map(m => `<option value="${m.nome}">${m.nome}</option>`).join('');
  sel.addEventListener('change', populateZonaSelect);
}

function normalizeText(value){
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .trim();
}

function parseCsvLine(line){
  const fields = [];
  const pattern = /(?:^|,)\s*(?:"([^"]*(?:""[^"]*)*)"|([^,]*))/g;
  let match;
  while((match = pattern.exec(line)) !== null){
    fields.push((match[1] ?? match[2] ?? '').replace(/""/g, '"').trim());
  }
  return fields;
}

async function loadZonasEleitorais(){
  try{
    const response = await fetch('export.csv');
    if(!response.ok) throw new Error(`CSV error ${response.status}`);
    const csv = await response.text();
    const lines = csv.split(/\r?\n/);
    const zonas = [];
    const secoes = [];
    let zonaAtual = null;
    let localAtual = null;
    let lendoSecoes = false;

    for(let index = 0; index < lines.length - 1; index++){
      const line = lines[index];
      if(/^ZONA\s*,\s*MUNIC/i.test(line)){
        const fields = parseCsvLine(lines[index + 1]);
        const zoneNumber = fields[0]?.match(/\d+/)?.[0];
        const municipalities = fields[1]
          ?.split('/')
          .map(municipality => municipality.replace(/\(SEDE\)/i, '').trim())
          .filter(Boolean);
        if(!zoneNumber || !municipalities?.length) continue;

        zonaAtual = {
          zona: zoneNumber.padStart(3, '0'),
          municipios: municipalities
        };
        localAtual = null;
        lendoSecoes = false;

        municipalities.forEach(municipio => {
          zonas.push({
            zona: zonaAtual.zona,
            municipio,
            endereco: fields[4] || '',
            cep: fields[5] || ''
          });
        });
        continue;
      }

      if(/^C.*LOCAL,ZONA\/MUNICIPIO/i.test(line)){
        const fields = parseCsvLine(lines[index + 1]);
        const localMunicipios = fields[1]?.split('/').slice(1)
          .map(municipio => municipio.replace(/\(SEDE\)/i, '').trim())
          .filter(Boolean);
        localAtual = {
          municipios: localMunicipios?.length ? localMunicipios : (zonaAtual?.municipios || []),
          local: fields[2] || '',
          endereco: fields[3] || ''
        };
        lendoSecoes = false;
        continue;
      }

      if(/^SE.*\bAPTOS/i.test(line)){
        lendoSecoes = true;
        continue;
      }

      if(!lendoSecoes || !zonaAtual || !localAtual) continue;
      const sectionFields = parseCsvLine(line);
      if(!/^\d+$/.test(sectionFields[0] || '') || !/^\d+$/.test(sectionFields[1] || '')) continue;

      localAtual.municipios.forEach(municipio => {
        secoes.push({
          zona: zonaAtual.zona,
          municipio,
          secao: sectionFields[0],
          aptos: sectionFields[1],
          local: localAtual.local,
          endereco: localAtual.endereco
        });
      });
    }

    zonasEleitorais = zonas.filter((zona, index, all) =>
      all.findIndex(item => item.zona === zona.zona &&
        normalizeText(item.municipio) === normalizeText(zona.municipio)) === index
    );
    secoesEleitorais = secoes.filter((secao, index, all) =>
      all.findIndex(item => item.zona === secao.zona &&
        item.secao === secao.secao &&
        normalizeText(item.municipio) === normalizeText(secao.municipio)) === index
    );
  }catch(error){
    console.error('Não foi possível carregar as zonas eleitorais:', error);
    zonasEleitorais = [];
    secoesEleitorais = [];
  }
}

function populateZonaSelect(){
  const municipio = document.getElementById('municipio').value;
  const zonaSelect = document.getElementById('zona');
  const sectionSelect = document.getElementById('secao');
  const address = document.getElementById('zoneAddress');
  const sectionAddress = document.getElementById('sectionAddress');
  const zonas = zonasEleitorais.filter(zona =>
    normalizeText(zona.municipio) === normalizeText(municipio)
  );

  zonaSelect.disabled = zonas.length === 0;
  zonaSelect.innerHTML = zonas.length
    ? '<option value="" disabled selected>Selecione a zona eleitoral</option>' +
      zonas.map(zona => `<option value="${zona.zona}">${zona.zona}ª Zona Eleitoral</option>`).join('')
    : '<option value="">Zona não encontrada no CSV</option>';
  address.textContent = '';
  sectionSelect.disabled = true;
  sectionSelect.innerHTML = '<option value="">Selecione primeiro a zona</option>';
  sectionAddress.textContent = '';
  zonaSelect.onchange = () => {
    const selected = zonas.find(zona => zona.zona === zonaSelect.value);
    address.textContent = selected
      ? `Endereço: ${selected.endereco}${selected.cep ? ` · CEP: ${selected.cep}` : ''}`
      : '';
    const secoes = secoesEleitorais.filter(secao =>
      secao.zona === zonaSelect.value &&
      normalizeText(secao.municipio) === normalizeText(municipio)
    );
    sectionSelect.disabled = secoes.length === 0;
    sectionSelect.innerHTML = secoes.length
      ? '<option value="" disabled selected>Selecione a seção eleitoral</option>' +
        secoes.map(secao => `<option value="${secao.secao}">Seção ${secao.secao}</option>`).join('')
      : '<option value="">Seção não encontrada no CSV</option>';
    sectionSelect.onchange = () => {
      const selectedSection = secoes.find(secao => secao.secao === sectionSelect.value);
      sectionAddress.textContent = selectedSection
        ? `Local: ${selectedSection.local} · ${selectedSection.endereco} · Eleitores: ${selectedSection.aptos}`
        : '';
    };
  };
}

async function loadRegistros(){
  try{
    registros = await supabaseFetch(`${TABLE}?select=id,nome,municipio,zona,secao,bairro,created_at&order=created_at.desc`);
  }catch(e){
    console.error(e);
    registros = [];
  }
  render();
}

async function insertRegistro(registro){
  try{
    const result = await supabaseFetch(TABLE, {
      method: "POST",
      body: JSON.stringify(registro)
    });
    return result && result[0] ? result[0] : null;
  }catch(e){
    console.error(e);
    return null;
  }
}

async function deleteAllRegistros(){
  try{
    await supabaseFetch(`${TABLE}?id=neq.00000000-0000-0000-0000-000000000000`, {
      method: "DELETE",
      prefer: "return=minimal"
    });
    return true;
  }catch(e){
    console.error(e);
    return false;
  }
}

function countsByMunicipio(){
  const counts = {};
  registros.forEach(r => {
    counts[r.municipio] = (counts[r.municipio] || 0) + 1;
  });
  return counts;
}

function render(){
  document.getElementById('totalCount').textContent = registros.length;
  renderMap();
  renderRanking();
}

function renderMap(){
  markersLayer.clearLayers();
  const counts = countsByMunicipio();
  const max = Math.max(1, ...Object.values(counts));

  MUNICIPIOS.forEach(m => {
    const c = counts[m.nome] || 0;
    if(c === 0) return;
    const radius = 6 + (c / max) * 26;
    const marker = L.circleMarker([m.lat, m.lng], {
      radius: radius,
      color: '#8A3B2E',
      weight: 1,
      fillColor: '#B98327',
      fillOpacity: 0.55
    }).addTo(markersLayer);
    marker.bindPopup(`<b>${m.nome}</b><br>${c} eleitor${c>1?'es':''} cadastrado${c>1?'s':''}`);
  });
}

function renderRanking(){
  const counts = countsByMunicipio();
  const body = document.getElementById('rankingBody');
  const entries = Object.entries(counts).sort((a,b)=>b[1]-a[1]);

  if(entries.length === 0){
    body.innerHTML = '<div class="empty">Nenhum eleitor cadastrado ainda. Use o formulário ao lado para começar.</div>';
    return;
  }

  const max = entries[0][1];
  body.innerHTML = `
    <table>
      <thead><tr><th>Município</th><th>Eleitores</th></tr></thead>
      <tbody>
        ${entries.map(([nome, c]) => `
          <tr>
            <td>
              ${nome}
              <div class="bar-wrap"><div class="bar" style="width:${(c/max*100).toFixed(0)}%"></div></div>
            </td>
            <td class="num">${c}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

document.getElementById('form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const nome = document.getElementById('nome').value.trim();
  const municipio = document.getElementById('municipio').value;
  const zona = document.getElementById('zona').value;
  const secao = document.getElementById('secao').value;
  const bairro = document.getElementById('bairro').value.trim();
  const msg = document.getElementById('msg');
  const btn = document.getElementById('submitBtn');

  if(!nome || !municipio || !zona || !secao){
    msg.textContent = 'Preencha nome, município, zona e seção eleitoral.';
    msg.className = 'msg err';
    return;
  }

  btn.disabled = true;
  msg.textContent = 'Salvando...';
  msg.className = 'msg';

  const novo = await insertRegistro({ nome, municipio, zona, secao, bairro: bairro || null });
  btn.disabled = false;

  if(novo){
    registros.unshift(novo);
    msg.textContent = `Cadastrado: ${nome} — ${municipio}, zona ${zona}`;
    msg.className = 'msg ok';
    document.getElementById('form').reset();
    render();
  }else{
    msg.textContent = 'Erro ao salvar. Tente novamente.';
    msg.className = 'msg err';
  }
});

document.getElementById('resetLink').addEventListener('click', async (e) => {
  e.preventDefault();
  if(!confirm('Isso vai apagar TODOS os cadastros salvos no banco. Confirma?')) return;
  const ok = await deleteAllRegistros();
  if(ok){
    registros = [];
    render();
  }else{
    alert('Erro ao limpar os dados. Tente novamente.');
  }
});

initAuthentication();
