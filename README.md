# SUMO//LAB AI v7 — Inicio inmediato / reloj real (Render)

Esta versión corrige el inicio, la revancha y la cuenta regresiva afectados por la velocidad de renderizado. Conserva la interfaz negra, los mensajes `Bot A: "..."` y `Bot B: "..."`, el código de demostración **`ITESMSON2026.`** (con punto), los cerebros GPT y el registro formal.

## Cambios en v7

- **Empezar match / Siguiente asalto / Repetir asalto / Nuevo combate**: reaccionan al clic de inmediato, muestran una confirmación y arrancan la cuenta regresiva sin esperar a la API.
- **5 segundos reglamentarios de verdad**, medidos con `performance.now()` en lugar de por los fotogramas. En pausa el reloj se congela y al reanudar continúa.
- **Asalto de 60 segundos** independiente de los FPS. El reloj del partido también se actualiza mediante un temporizador ligero cuando los fotogramas van lentos.
- **Física a paso fijo de 2 ms** y render 3D desacoplado; el modo Canvas sin WebGL se limita a 24 FPS para descargar la CPU. Si el equipo no soporta el paso físico, la animación aún puede ser aproximada; el reloj sí respeta el tiempo real.
- **GPT asíncrono**: durante la cuenta regresiva se adelantan las consultas, pero la acción local inicia aunque OpenAI tarde en responder o falle.

## Desplegar en Render

1. Descomprime el ZIP; carga el contenido a la raíz de tu repositorio GitHub.
2. Conserva las variables `OPENAI_API_KEY`, `OPENAI_MODEL`, `MAX_DECISIONS_PER_HOUR`, `MAX_DECISIONS_PER_DAY` que ya tengas.
3. Haz commit y despliega en Render (o `Manual Deploy`).
4. Recarga la web con `Ctrl+Shift+R` (o `Cmd+Shift+R`) para evitar un HTML antiguo en caché.
5. Prueba primero con `MOCK_LLM=1`. Cuando el simulador responda correctamente, usa `MOCK_LLM=0`.

Local: `npm test` y `MOCK_LLM=1 node server.mjs`. Node.js 20+. No requiere paquetes externos.

**Advertencia:** el código `ITESMSON2026.` está visible en el navegador: no es autenticación segura para un sitio público. La clave `OPENAI_API_KEY` permanece únicamente en Render, pero cualquier visitante podría provocar gastos de API. Usa autenticación del lado del servidor y límites persistentes antes de abrir el laboratorio públicamente.

---

# SUMO//LAB AI v6 — diálogos minimalistas

Cambio visual respecto a v5: los avisos dentro de la arena muestran **únicamente** `Bot A: "mensaje"` o `Bot B: "mensaje"`, en una fuente más pequeña, blanca con contorno negro. No incluyen temporizador, estrategia, origen de la decisión ni motivo en el escenario. Los mensajes del robot A permanecen a la izquierda, los del robot B a la derecha, apilándose por separado y desapareciendo automáticamente. El registro formal bajo la arena sigue conteniendo la información de las decisiones.

# SUMO//LAB AI v6 · Cyborg Arena / Render

Simulador 3D de mini sumo con dos controladores GPT opcionales, interfaz negra y diálogos estilo Terminator vs RoboCop personalizables directamente sobre el combate. Mantiene una máquina de estados local para seguridad, detección de bordes, sensores simulados y anti-ciclo. **Los textos de combate son frases de exhibición**, NO el razonamiento privado del modelo. Los motivos tácticos cortos que devuelve el modelo aparecen identificados junto a esas frases.

## Inicio rápido en Render

1. Descomprime el ZIP y sube el **contenido de esta carpeta** a tu repositorio GitHub. `render.yaml` debe estar en la raíz.
2. En Render selecciona **New → Blueprint**, conecta ese repositorio y despliega.
3. En Environment, configura `OPENAI_API_KEY` con tu API key secreta de OpenAI. `OPENAI_MODEL` está establecido en `gpt-4.1-mini` en el Blueprint (puedes elegir otro modelo compatible con Responses API y JSON Schema).
4. Render utilizará `npm start`, `PORT` y `/health` automáticamente. Abre la URL pública. Ambos bots vienen preseleccionados en `GPT ONLINE`.
5. Para comprobar el simulador sin gastar tokens, ajusta `MOCK_LLM=1` en Render y vuelve a desplegar. En modo demo el registro no atribuye decisiones al modelo.

**En una instalación de Render ya existente:** reemplaza los archivos antiguos por los nuevos y haz redeploy. La variable antigua `SUMOLAB_ACCESS_TOKEN` ya no es utilizada y puede eliminarse. Conserva `OPENAI_API_KEY` y los límites de solicitudes. No pegues nunca la API key en GitHub ni dentro de `public/index.html`.

## Nuevo diseño

- Sin barra antigua de marca/estado; botón **Empezar match** en el centro superior y **Ajustes** a la derecha.
- Arena 3D negra con marcador, reloj, botones de cámara y **diálogos en texto blanco con contorno negro, sin recuadro**.
- Los avisos del robot A aparecen en el costado izquierdo; los del robot B, en el derecho. Contienen Bot A/B, `T−60.0s`, estrategia, fuente (`GPT ONLINE`, `GPT + CONTROL LOCAL`, `MANIOBRA LOCAL`, `SEGURIDAD LOCAL` o `DEMO`) y motivo; muestran abajo una frase personalizable de estilo ciencia ficción: exterminador frente a agente policial cibernético.
- Llegan abajo de la pila y empujan los anteriores hacia arriba; duran alrededor de **5,7 segundos** y se eliminan automáticamente. Máximo tres por lado para no obstruir el dohyo.
- Los **dos paneles laterales de historial individual se eliminan**.
- El **único módulo bajo la arena es el registro formal**, ahora conservando hasta 350 eventos y permitiendo exportarlos a TXT.
- Los controles de estrategias, formación, RPM, sensores, velocidad, telemetría y editor de frases están en **Ajustes**.

## Cómo editar las frases

1. Entra a **Ajustes → Voces de combate**.
2. Elige el bot **A** o **B**.
3. Selecciona cualquiera de las seis tácticas: **agresivo**, **equilibrado**, **defensivo**, **flanqueador**, **explorador** y **romper ciclo**.
4. Modifica el diálogo (máximo 220 caracteres). Se guarda automáticamente en `localStorage` del navegador.
5. Usa **Previsualizar en la arena** o **Restablecer esta frase**.

Las frases son independientes para A y B; las personalizaciones v4 existentes se conservan automáticamente; existen doce frases predeterminadas originales de ciencia ficción (seis por robot). Las decisiones GPT recibidas en la cuenta regresiva se muestran cuando comienza el combate, no antes.

Los cambios **son locales a ese navegador** y no se sincronizan entre participantes o dispositivos. Para configuración común entre todos los alumnos sería necesaria una base de datos o un archivo de configuración compartido en backend.

## Seguridad: advertencia importante

A solicitud del proyecto, el código de acceso `ITESMSON2026.` está **hardcodeado** en el navegador y el servidor, y la interfaz no solicita contraseña. **Esto no constituye autenticación ni protege las llamadas GPT.** Cualquier visitante puede inspeccionar el código y consumir la cuota que permite la instancia pública. La API key auténtica sigue protegida en el servidor como `OPENAI_API_KEY`, pero **pueden generarse cargos** por llamadas no autorizadas hasta los límites de uso (compartidos en memoria por proceso y reiniciados con el servidor).

Para un sitio público de acceso amplio, usa autenticación real con sesiones de servidor o proveedor de identidad y cuotas persistentes por usuario; no confiar en una contraseña visible en el cliente. Recomendado: presupuestos y alertas de consumo en OpenAI, valores bajos para `MAX_DECISIONS_PER_HOUR` y `MAX_DECISIONS_PER_DAY`, y modo `MOCK_LLM=1` cuando sea una demostración abierta.

## Ejecución local

Requiere Node.js 20+ y **ninguna dependencia npm externa**:

```bash
# Demo sin OpenAI
MOCK_LLM=1 node server.mjs
# Servicio real (Linux/macOS)
OPENAI_API_KEY='TU_CLAVE' node server.mjs
```

Abre `http://localhost:3000` y selecciona una estrategia para cada robot desde Ajustes. La conexión OpenAI requiere crédito y habilitación de acceso al modelo elegido.

```bash
npm test
```

## Limitaciones técnicas

La física es planar aproximada: no modela con precisión los contactos de las cuñas o el agarre real; el resultado no debe usarse como evidencia directa de superioridad en la competencia física. Cada decisión GPT puede tardar segundos por red, por lo que los motores y las maniobras de protección siguen bajo control local. El detector de ciclos usa datos de trayectoria del simulador que no están disponibles en los cinco sensores del robot físico.
