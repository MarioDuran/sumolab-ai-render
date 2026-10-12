# SUMO//LAB AI v3 — Render.com (dos cerebros GPT con anti-ciclo)

Simulador web 3D de batallas de sumobots. Basado en el prototipo autónomo original: dos mini sumobots, dohyo de 77 cm, 10 × 10 cm, máximo 500 g, cinco sensores simulados por robot, cuña frontal y física aproximada. Un cerebro GPT por robot puede elegir tácticas, mientras la máquina de estados local mantiene el control de seguridad y de motores.

**No es un gemelo digital físico calibrado:** la colisión, el agarre y los sensores se aproximan. No se deben conectar los motores de un robot real directamente a decisiones recibidas por internet.

## Contenido

```text
sumolab_render/
├── public/index.html      # Simulador 3D completo (sin CDN)
├── server.mjs             # Servidor web y proxy seguro a OpenAI
├── render.yaml            # Blueprint para desplegar en Render
├── package.json           # Comando npm start (sin dependencias externas)
├── .env.example           # Plantilla de variables, sin secretos reales
├── .gitignore             # Impide subir .env
├── tests/smoke.test.mjs   # Test del servidor y modo DEMO
└── README.md              # Esta guía
```

## 1. Crear una OpenAI API Key

1. Ve a <https://platform.openai.com/> y accede con tu cuenta.
2. Abre el selector de proyectos y crea un proyecto denominado **SUMOLAB-AI**, si tienes permisos para ello.
3. Abre <https://platform.openai.com/api-keys> con ese proyecto seleccionado.
4. Haz clic en **Create new secret key**. Nombre sugerido: `sumolab-render`.
5. Opcional y recomendado: usa permisos restringidos que habiliten escritura para Responses API. Copia la clave y guárdala de forma privada; no volverá a mostrarse.
6. Configura el método de pago y supervisa el presupuesto del proyecto desde <https://platform.openai.com/settings/organization/billing/overview>. **La facturación de API es distinta a ChatGPT Plus/Pro.**

**Nunca publiques la OpenAI API Key** en el código HTML, archivos del repositorio, capturas o mensajes. Solo se configura como variable privada `OPENAI_API_KEY` en Render.

## 2. Subir a GitHub desde el navegador

1. Crea una cuenta en <https://github.com> si aún no tienes.
2. Selecciona **New repository**, nombre sugerido `sumolab-ai-render`. Puedes elegir **Private**.
3. En el repositorio, selecciona **Add file > Upload files**.
4. Sube los archivos de **dentro** de esta carpeta; `render.yaml`, `package.json` y `server.mjs` deben quedar en la **raíz** del repositorio, con `public/index.html` en su subcarpeta. GitHub no conserva directorios vacíos.
5. Comprueba que subiste también `public/index.html`. No subas un `.env` real.

Alternativa con Git instalado:

```bash
git init
git add .
git commit -m "SUMO-LAB AI preparado para Render"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/sumolab-ai-render.git
git push -u origin main
```

## 3. Crear el servicio con Render Blueprint

1. Accede a <https://dashboard.render.com>.
2. Conecta tu cuenta de GitHub a Render, permitiendo acceso al repositorio.
3. Selecciona **New > Blueprint**, selecciona `sumolab-ai-render` y crea el Blueprint.
4. Render leerá `render.yaml`: un **Web Service** Node.js, plan `free`, endpoint de salud `/health`, build `npm install --omit=dev`, arranque `npm start`.
5. Render pedirá dos variables marcadas `sync: false`:
   - `OPENAI_API_KEY`: pega **la clave secreta de OpenAI**.
   - `SUMOLAB_ACCESS_TOKEN`: inventa **una contraseña independiente**, por ejemplo un valor aleatorio de más de 20 caracteres. **No uses tu API Key como contraseña de acceso.**
6. Confirma la creación. Espera a que Render muestre el servicio en estado **Live**.
7. Abre la URL que Render te asignó, con formato `https://sumolab-ai-xxxx.onrender.com` (el nombre exacto depende de la cuenta).
8. En el panel **Acceso privado a GPT**, pega `SUMOLAB_ACCESS_TOKEN`, pulsa **Validar acceso a GPT**, elige **GPT ONLINE** en ambos robots e inicia la batalla.

Si ya creaste el servicio y necesitas corregir variables, entra en **Render > tu servicio > Environment** y actualízalas allí. No edites `render.yaml` para insertar secretos.

### Alternativa: Web Service manual

**New > Web Service** → elige el repositorio → Language **Node** → Build Command `npm install --omit=dev` → Start Command `npm start` → Health Check `/health` → plan **Free** → crea las variables anteriores en **Environment**. Render asigna automáticamente `PORT`, y este servidor escucha en `0.0.0.0`.

## 4. Variables de entorno

| Variable | Obligatoria | Uso |
|---|---|---|
| `OPENAI_API_KEY` | Sí, para GPT real | Clave secreta de OpenAI; solo en servidor |
| `SUMOLAB_ACCESS_TOKEN` | Sí, siempre | Contraseña de acceso a peticiones LLM, al menos 12 caracteres |
| `OPENAI_MODEL` | No | `gpt-4.1-mini` predeterminado (configurable) |
| `MAX_DECISIONS_PER_HOUR` | No | Límite compartido de decisiones por hora, 250 |
| `MAX_DECISIONS_PER_DAY` | No | Límite compartido de decisiones por 24 horas, 800 |
| `MOCK_LLM` | No | `1` activa respuestas deterministas de demo, sin uso de API |
| `PORT` | Automática en Render | Puerto del servicio |

**Los límites de decisiones en el servidor se guardan en memoria** y se reinician cuando Render reinicia la aplicación. No constituyen un límite monetario estricto; controla gasto con el presupuesto de OpenAI y, para producción, una base de datos externa para los contadores. La contraseña habilita uso de la API, así que compártela solamente con personas autorizadas.

El plan **Free de Render puede suspender el servicio por inactividad** y tardar en despertarlo. Los precios de Render y OpenAI varían; el plan gratuito de Render no significa que la API de OpenAI sea gratuita.

## 5. Probar en local

Requiere Node.js 20 o superior.

macOS / Linux:

```bash
cd sumolab_render
SUMOLAB_ACCESS_TOKEN='CODIGO_LOCAL_LARGO_123' MOCK_LLM=1 npm start
```

Abre <http://localhost:3000> y valida el código `CODIGO_LOCAL_LARGO_123` en la interfaz. Para GPT real añade `OPENAI_API_KEY` y usa `MOCK_LLM=0`.

Windows PowerShell:

```powershell
$env:SUMOLAB_ACCESS_TOKEN='CODIGO_LOCAL_LARGO_123'
$env:MOCK_LLM='1'
npm start
```

Para los tests:

```bash
npm test
```

## 6. ¿Qué pasa en la batalla?

- Cada robot envía sus cinco sensores, reloj, marcador e historial propio. En este **simulador** se añade un diagnóstico del movimiento calculado con su trayectoria virtual; no es una lectura de los cinco sensores físicos.
- El servidor realiza llamadas independientes a `POST https://api.openai.com/v1/responses` con la clave secreta.
- GPT responde con un JSON estricto: `tactica`, `agresividad`, `duracion_s`, `motivo`.
- Las tácticas válidas son `agresivo`, `equilibrado`, `defensivo`, `flanqueador`, `aleatorio`, `romper_ciclo`.
- Las respuestas no se ejecutan como código y no controlan directamente motores físicos.
- Ante una respuesta lenta, un error o un límite de cuota, el simulador conserva la última táctica y la evasión del borde sigue activa.
- En el servidor se pide `store:false` y se evita registrar contenido secreto.

## 7. Paneles de cerebro y detección de ciclos (nuevo)

La arena está flanqueada por el **Cerebro GPT A** a la izquierda y el **Cerebro GPT B** a la derecha. Cada panel muestra:

- Táctica seleccionada, latencia de la última respuesta, fuente (modelo/DEMOSTRACIÓN/controlador local).
- `motivo`: explicación táctica corta **declarada por GPT**. No se muestran pensamientos internos ni cadenas privadas de razonamiento.
- Historial de decisiones independiente, conteo de cambios y estado de espera/error.
- Diagnóstico local (recorrido, avance neto y giro acumulado en los últimos ~6 s).

### ¿Por qué un LLM no detectaba giros repetitivos?

La versión anterior solo enviaba lecturas instantáneas de los 3 IR + 2 QTR, marcador e historial corto. Esos datos no bastan para determinar si el robot está trazando círculos. La versión 3 incorpora un **detector temporal local**: si el robot recorre una distancia relevante, vuelve cerca de su punto inicial y acumula varios radianes de giro, se declara posible estancamiento y se avisa al LLM. Las reglas de detección usan umbrales ajustables en el JavaScript; son heurísticas, no una prueba matemática de estancamiento.

En una alerta, GPT puede seleccionar `romper_ciclo` para retroceder, girar y salir en una dirección diferente. Si el LLM repite la misma táctica, el servidor fuerza `romper_ciclo` e identifica la acción como `control_anti_bucle`, **no como una decisión de GPT**. Si la consulta falla o el ciclo persiste, el navegador realiza una maniobra local de respaldo. El sensor de borde mantiene la prioridad.

**Transferencia a robot físico:** esta detección aprovecha coordenadas virtuales que los sensores IR QTR/JS40F no miden. Harían falta encoders, una IMU o estimación de movimiento para replicar ese diagnóstico en el ESP32-S3. No se deben entregar coordenadas perfectas a GPT como si provinieran de sensores del robot físico.

### Actualizar un servicio de Render existente

1. Sustituye los archivos anteriores de GitHub por los contenidos de este paquete, conservando la estructura de directorios.
2. Render redesplegará cuando reciba los cambios (o usa **Manual Deploy**).
3. En **Environment**, comprueba que `OPENAI_MODEL` sea `gpt-4.1-mini` o cualquier modelo válido con Responses API y Structured Outputs. Cambia un valor previo como `gpt-6-luna` si estaba configurado y no funciona en tu cuenta.
4. Mantén **las mismas claves privadas** `OPENAI_API_KEY` y `SUMOLAB_ACCESS_TOKEN`. No las publiques en GitHub.
5. Prueba `MOCK_LLM=1` primero; después usa `MOCK_LLM=0` con créditos de API disponibles.

## 8. Seguridad y limitaciones

- El HTML no contiene claves de OpenAI.
- El código de acceso a GPT se guarda en `sessionStorage` **solo en la pestaña del navegador** y se transmite al servidor por HTTPS en el encabezado `X-Sumolab-Access`.
- El backend compara el acceso privado con una variable de entorno; no revela el secreto.
- Hay límites globales de llamadas por minuto, hora y día por instancia. Los límites en memoria **no son infalibles** contra reinicios ni despliegues con varias instancias.
- El servicio está pensado para un **laboratorio pequeño y privado**. Para habilitar muchos alumnos al mismo tiempo, añade cuentas individuales, una cuota duradera en Redis/Postgres, monitoreo y un control de gasto externo.
- No se ha probado una llamada real a OpenAI con una API key válida durante la creación de este paquete. El backend se verificó en modo demo con pruebas automáticas.

Documentación oficial: [OpenAI API keys](https://platform.openai.com/api-keys), [API Responses](https://developers.openai.com/api/docs/guides/structured-outputs?api-mode=responses), [Render Web Services](https://render.com/docs/web-services), [Render Blueprints](https://render.com/docs/blueprint-spec).
