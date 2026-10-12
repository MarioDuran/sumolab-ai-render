import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {timingSafeEqual} from 'node:crypto';
import {fileURLToPath} from 'node:url';

// SUMO//LAB AI — Backend privado para Render. Sin dependencias externas.
// Secrets only from Render environment variables; never returned to the client.
const ROOT = path.dirname(fileURLToPath(import.meta.url));
const HOST = process.env.HOST || '0.0.0.0';
const PORT = Number(process.env.PORT || 3000);
const MODEL = process.env.OPENAI_MODEL || 'gpt-6-luna';
const API_KEY = process.env.OPENAI_API_KEY || '';
const ACCESS_TOKEN = process.env.SUMOLAB_ACCESS_TOKEN || '';
const MOCK = process.env.MOCK_LLM === '1';
const MAX_HOUR = boundedInt(process.env.MAX_DECISIONS_PER_HOUR, 250, 1, 10000);
const MAX_DAY = boundedInt(process.env.MAX_DECISIONS_PER_DAY, 800, 1, 50000);
const MAX_MINUTE = 60;
const MAX_ACTIVE = 2;
const MODES = ['agresivo','equilibrado','defensivo','flanqueador','aleatorio'];

if (!ACCESS_TOKEN || ACCESS_TOKEN.length < 12) {
  console.error('SUMOLAB_ACCESS_TOKEN es obligatorio y debe tener al menos 12 caracteres. Configuralo en Render > Environment.');
  process.exit(1);
}
if (!Number.isInteger(PORT) || PORT <= 0 || PORT > 65535) {
  console.error('PORT invalido'); process.exit(1);
}

let minuteHits = [];
let hourHits = [];
let dayHits = [];
let running = 0;
let totalTokens = {input: 0, output: 0}; // Informativo y por proceso, se reinicia al reiniciar servidor.

function boundedInt(value, fallback, min, max) {
  const n = Number(value);
  return Number.isInteger(n) ? Math.min(max, Math.max(min,n)) : fallback;
}
function clamp(value, min, max, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : fallback;
}
function boolList(value, n) {
  return Array.from({length:n}, (_,i) => value?.[i] === true);
}
function normalize(data) {
  if (!data || !['A','B'].includes(data.bot) || !data.obs || typeof data.obs !== 'object') return null;
  const o=data.obs;
  return {
    bot:data.bot,
    obs:{
      ir:boolList(o.ir,3),
      borde:boolList(o.borde,2),
      tiempo_restante:clamp(o.tiempo_restante,0,60,60),
      segundos_transcurridos:clamp(o.segundos_transcurridos,0,60,0),
      estrategia_actual:MODES.includes(o.estrategia_actual)?o.estrategia_actual:'equilibrado',
      asaltos_ganados:[0,1].map(i => Math.floor(clamp(o.asaltos_ganados?.[i],0,2,0))),
      historial:Array.isArray(o.historial)?o.historial.slice(-3).filter(x=>typeof x==='string').map(x=>x.slice(0,120)):[]
    }
  };
}
function json(res, status, data) {
  res.writeHead(status, {
    'Content-Type':'application/json; charset=utf-8',
    'Cache-Control':'no-store',
    'X-Content-Type-Options':'nosniff',
    'Referrer-Policy':'no-referrer'
  });
  res.end(JSON.stringify(data));
}
function secureEquals(given, expected) {
  if (typeof given !== 'string' || given.length > 1024) return false;
  const a=Buffer.from(given,'utf8'), b=Buffer.from(expected,'utf8');
  return a.length === b.length && timingSafeEqual(a,b);
}
function validAccess(req) {
  return secureEquals(req.headers['x-sumolab-access'], ACCESS_TOKEN);
}
function canSpend() {
  const now=Date.now();
  minuteHits=minuteHits.filter(t=>now-t<60000);
  hourHits=hourHits.filter(t=>now-t<3600000);
  dayHits=dayHits.filter(t=>now-t<86400000);
  if (minuteHits.length>=MAX_MINUTE) return 'Se alcanzó el límite de decisiones por minuto.';
  if (hourHits.length>=MAX_HOUR) return 'Se alcanzó el límite de decisiones por hora.';
  if (dayHits.length>=MAX_DAY) return 'Se alcanzó el límite de decisiones por día.';
  if (running>=MAX_ACTIVE) return 'Cerebros ocupados: máximo 2 llamadas simultáneas.';
  minuteHits.push(now);hourHits.push(now);dayHits.push(now);
  return null;
}
function mockDecision({obs,bot}) {
  const tactica = obs.borde.some(Boolean)?'defensivo':obs.ir[1]?'agresivo':
    (obs.ir[0]||obs.ir[2])?'flanqueador':bot==='A'?'agresivo':'aleatorio';
  return {tactica,agresividad:.75,duracion_s:4,motivo:'Decisión simulada: no se ha consultado a GPT.',fuente:'mock'};
}
async function openaiDecision(data) {
  const style = data.bot === 'A'
    ? 'Ataca con determinación y busca contacto frontal, manteniendo precaución con los bordes.'
    : 'Busca flanqueos y contraataques oportunistas, manteniendo precaución con los bordes.';
  const instructions = [
    `Eres el cerebro tactico del sumobot ${data.bot}. ${style}`,
    'Compites sobre un dohyo de 77 cm con robot mini sumo de 10x10 cm y masa maxima 500 g.',
    'Recibes únicamente datos de los cinco sensores del robot, cronometro, marcador y memoria propia.',
    'Los sensores IR booleanos son [izquierda,centro,derecha] y borde [izquierda,derecha].',
    'No tienes una camara, ni conoces distancias exactas o coordenadas ocultas.',
    'No controlas motores ni PWM. Eliges una tactica durante pocos segundos.',
    'El controlador determinista del robot anulá decisiones peligrosas cerca del borde.',
    'Elige solo entre agresivo, equilibrado, defensivo, flanqueador, aleatorio.',
    'Devuelve una justificacion tactica concisa de como maximo 14 palabras.'
  ].join(' ');
  const payload={
    model:MODEL,
    store:false,
    instructions,
    input:JSON.stringify(data.obs),
    reasoning:{effort:'none'},
    max_output_tokens:220,
    text:{format:{type:'json_schema',name:'estrategia_sumolab',strict:true,schema:{
      type:'object', additionalProperties:false,
      properties:{
        tactica:{type:'string',enum:MODES},
        agresividad:{type:'number'},
        duracion_s:{type:'number'},
        motivo:{type:'string'}
      },
      required:['tactica','agresividad','duracion_s','motivo']
    }}}
  };
  const result=await fetch('https://api.openai.com/v1/responses',{
    method:'POST',
    headers:{'Authorization':`Bearer ${API_KEY}`,'Content-Type':'application/json'},
    body:JSON.stringify(payload),
    signal:AbortSignal.timeout(9500)
  });
  let out;
  try { out=await result.json(); }
  catch { throw new Error('Respuesta inválida del proveedor.'); }
  if (!result.ok) {
    console.warn('OpenAI HTTP',result.status, 'tipo',out?.error?.type||'unknown');
    throw new Error(`OpenAI HTTP ${result.status}. Revisa la clave, el modelo, los créditos o los límites.`);
  }
  const text = out.output?.flatMap(item=>item.content||[]).filter(item=>item.type==='output_text')
    .map(item=>item.text).join('') || out.output_text || '';
  if(!text) throw new Error('GPT no devolvió un JSON de estrategia.');
  let d;
  try { d=JSON.parse(text); } catch { throw new Error('GPT devolvió una respuesta no interpretable.'); }
  if(!MODES.includes(d.tactica)) throw new Error('Táctica GPT no permitida.');
  if(out.usage){
    totalTokens.input+=out.usage.input_tokens||0;
    totalTokens.output+=out.usage.output_tokens||0;
  }
  return {
    tactica:d.tactica,
    agresividad:clamp(d.agresividad,0,1,.7),
    duracion_s:clamp(d.duracion_s,2,6,4),
    motivo:String(d.motivo||'').slice(0,120),
    fuente:MODEL,
    uso:out.usage ? {entrada:out.usage.input_tokens||0,salida:out.usage.output_tokens||0}:null
  };
}
async function bodyAsJson(req) {
  let text='';
  for await(const chunk of req) {
    text+=chunk.toString('utf8');
    if (Buffer.byteLength(text)>8192) throw Object.assign(new Error('Tamaño de solicitud excedido.'),{httpStatus:413});
  }
  try {return JSON.parse(text);} catch {throw Object.assign(new Error('JSON inválido.'),{httpStatus:400});}
}
async function handler(req,res) {
  const pathname=new URL(req.url,'http://localhost').pathname;
  if(req.method==='GET' && (pathname==='/' || pathname==='/index.html')) {
    const html=await fs.readFile(path.join(ROOT,'public','index.html'));
    res.writeHead(200,{
      'Content-Type':'text/html; charset=utf-8',
      'Cache-Control':'no-store',
      'X-Content-Type-Options':'nosniff',
      'Referrer-Policy':'no-referrer',
      'Content-Security-Policy':"default-src 'self'; img-src 'self' data:; connect-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'"
    });
    res.end(html);return;
  }
  if(req.method==='GET' && pathname==='/health') return json(res,200,{status:'ok'});
  if(req.method==='GET' && pathname==='/api/status') {
    return json(res,200,{
      llmDisponible:MOCK||Boolean(API_KEY),
      modo:MOCK?'demostracion':API_KEY?'OpenAI API':'sin_clave',
      modelo:MODEL,
      accesoProtegido:true,
      maxDecisionesHora:MAX_HOUR,
      maxDecisionesDia:MAX_DAY
    });
  }
  if(req.method==='POST' && (pathname==='/api/auth'||pathname==='/api/decide')) {
    if (!validAccess(req)) return json(res,401,{error:'Clave de acceso al simulador incorrecta.'});
    if (pathname==='/api/auth') return json(res,200,{autorizado:true});
    if (!MOCK&&!API_KEY) return json(res,503,{error:'No se configuró OPENAI_API_KEY en Render.'});
    const limit=canSpend();
    if(limit) return json(res,429,{error:limit});
    const parsed=normalize(await bodyAsJson(req));
    if(!parsed) return json(res,400,{error:'Datos del robot no válidos.'});
    running++;
    try {
      return json(res,200,await (MOCK?mockDecision(parsed):openaiDecision(parsed)));
    } catch(e) {
      console.warn('Decisión fallida:', String(e.message||e).slice(0,200));
      return json(res,502,{error:String(e.message||'Fallo del proveedor').slice(0,160)});
    } finally { running--; }
  }
  return json(res,404,{error:'Recurso no encontrado.'});
}
const server=http.createServer((req,res)=>{
  handler(req,res).catch(e=>{
    console.error('Servidor:',String(e.message||e).slice(0,200));
    if(!res.headersSent)json(res,e.httpStatus||500,{error:e.httpStatus?e.message:'Error interno.'});
    else res.end();
  });
});
server.listen(PORT,HOST,()=>{
  console.log(`SUMO//LAB AI escuchando en ${HOST}:${PORT}`);
  console.log(MOCK?'MODO DEMO sin consumo de API':API_KEY?`OpenAI: ${MODEL}`:'Falta OPENAI_API_KEY para GPT real');
  console.log('Acceso privado activo. /health disponible para Render.');
});
process.on('SIGTERM',()=>server.close(()=>process.exit(0)));
