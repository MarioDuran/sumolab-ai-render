import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';

const PORT=31847;
const PASS='ITESMSON2026';
const BASE=`http://127.0.0.1:${PORT}`;
let server;

test('servidor Render: accesos, disponibilidad y modo demo', async (t)=>{
  server=spawn(process.execPath,['server.mjs'],{
    cwd:new URL('../',import.meta.url),
    env:{...process.env,PORT:String(PORT),HOST:'127.0.0.1',MOCK_LLM:'1',OPENAI_API_KEY:'',MAX_DECISIONS_PER_HOUR:'2',MAX_DECISIONS_PER_DAY:'2'},
    stdio:['ignore','pipe','pipe']
  });
  t.after(async()=>{if(server&&!server.killed){server.kill('SIGTERM');await once(server,'exit');}});
  for(let i=0;i<50;i++){
    try{const r=await fetch(BASE+'/health');if(r.status===200)break;}catch{}
    await new Promise(r=>setTimeout(r,70));
    if(i===49)assert.fail('server failed to start');
  }
  const page=await fetch(BASE+'/');
  assert.equal(page.status,200);
  const text=await page.text();
  assert.match(text,/SUMO\/\/LAB/);
  assert.match(text,/battleToasts/);
  assert.match(text,/phraseText/);
  assert.match(text,/ITESMSON2026/);
  assert.doesNotMatch(text,/id=\"brainPanelA\"/);
  assert.ok(text.includes(PASS),'Demo password intentionally hardcoded in browser');

  const status=await (await fetch(BASE+'/api/status')).json();
  assert.equal(status.modo,'demostracion');
  assert.equal(status.accesoProtegido,false);

  const invalid=await fetch(BASE+'/api/auth',{method:'POST',headers:{'x-sumolab-access':'badcode'}});
  assert.equal(invalid.status,401);
  const auth=await fetch(BASE+'/api/auth',{method:'POST',headers:{'x-sumolab-access':PASS}});
  assert.equal(auth.status,200);

  const obs={ir:[false,true,false],borde:[false,false],tiempo_restante:59,segundos_transcurridos:1,estrategia_actual:'equilibrado',asaltos_ganados:[0,0],historial:[]};
  const decisionReq=()=>fetch(BASE+'/api/decide',{method:'POST',headers:{'content-type':'application/json','x-sumolab-access':PASS},body:JSON.stringify({bot:'A',obs})});
  const first=await decisionReq();assert.equal(first.status,200);
  const result=await first.json();
  assert.equal(result.tactica,'agresivo');
  assert.equal(result.fuente,'mock');
  // Una alerta explícita de estancamiento debe forzar en demo una maniobra distinta.
  obs.diagnostico={en_bucle:true,tipo:'trayectoria_circular',segundos_sin_progreso:6,
    recorrido_6s_cm:48,avance_neto_6s_cm:4,giro_6s_grados:560,alertas_previas:1};
  const second=await decisionReq();assert.equal(second.status,200);
  assert.equal((await second.json()).tactica,'romper_ciclo');
  const capped=await decisionReq();assert.equal(capped.status,429);
  assert.equal((await fetch(BASE+'/api/decide',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({bot:'A',obs})})).status,401);
  assert.equal((await fetch(BASE+'/public/index.html')).status,404);
});
