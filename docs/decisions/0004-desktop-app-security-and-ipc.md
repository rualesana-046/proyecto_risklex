# 0004. Aplicación de escritorio: seguridad, comunicación entre procesos, modo de prueba y empaquetado

- Estado: aceptada
- Fecha: 2026-11-15

## Contexto

La aplicación de escritorio muestra texto que viene de una IA y de documentos de terceros, y habla con un backend que cuesta dinero en cada análisis. Electron mezcla un proceso con acceso al sistema (main) con páginas web (renderer), así que una página comprometida no debe poder llegar al sistema ni a la red, y un error de configuración no debe gastar dinero ni mostrar datos falsos como reales.

## Decisión

### Ventana y renderer

- `contextIsolation`, `sandbox` y `webSecurity` activados; `nodeIntegration` desactivado en la ventana, en los workers y en los subframes; sin `webview`.
- Las herramientas de desarrollador solo se activan cuando la app no está empaquetada (`!app.isPackaged`), es decir, en `dev` y en `preview`.
- Se niegan las ventanas nuevas, los `webview`, todos los permisos y la navegación fuera del origen de la app. No se usa `shell.openExternal`.
- La app empaquetada ignora la variable `ELECTRON_RENDERER_URL` y siempre carga su `index.html` local.
- CSP por modo: la de producción no permite `unsafe-*`, `ws:` ni `data:` y pone `connect-src 'none'`; la de desarrollo solo relaja lo que necesitan React Refresh y la recarga en caliente. `preview` usa la de producción. `frame-ancestors` no se incluye porque se ignora en una etiqueta `<meta>`.

### Red y configuración

- Solo el proceso main hace peticiones. El renderer no tiene red.
- La URL del backend llega en `MAIN_VITE_RISKLEX_API_URL`, nunca en archivos versionados. Se valida con `validateApiBaseUrl` de `@risklex/shared`: https `*.workers.dev`, o http `localhost` y `127.0.0.1` fuera de la app empaquetada.
- `validateApiBaseUrl` usa una interfaz local mínima y un acceso tipado a `globalThis.URL`, sin declaraciones globales ni `lib` DOM, porque `shared` compila sin tipos de Node ni del navegador y una declaración global chocaría con los tipos de Workers y del DOM.

### Comunicación entre procesos

- Todo lo que cruza entre procesos vive en `apps/frontend/src/common/`:
  - `analysis-vocabulary.ts`: códigos de error, etapas y tipos del resultado, sin Zod;
  - `ipc-channels.ts`: solo los nombres de canal, sin Zod;
  - `ipc-schemas.ts`: los esquemas Zod de entrada y de salida.
- El preload solo importa los nombres de canal. Una regla de fronteras le prohíbe importar Zod e `ipc-schemas`, y se comprueba que su paquete no contiene Zod.
- El canal `analyze` valida la entrada y el remitente, y valida la salida con `verifiedAnalysisSchema` antes de enviarla. Una prueba de tipos exige que el esquema y `VerifiedAnalysis` coincidan. El renderer nunca recibe el cuerpo crudo del backend ni trazas: solo un código y, si aplica, los segundos de espera.

### Contenido no confiable

- Las citas, títulos y explicaciones se muestran siempre como texto. Una regla de ESLint prohíbe en todo el frontend `dangerouslySetInnerHTML`, `innerHTML`, `outerHTML`, `srcdoc`, `insertAdjacentHTML`, `createContextualFragment`, `setHTMLUnsafe`, `document.write` y `DOMParser`.

### Interfaz sin Tailwind ni Radix en el Hito 1

- Es una desviación del stack aprobado. Motivo: el hito tiene pocos controles y los nativos (`radiogroup`, botones con `aria-pressed` y `<dialog>`) cubren la accesibilidad con una dependencia menos.
- Para no impedir añadirlos después, los tokens son propiedades CSS, que es el formato que lee Tailwind 4, y cada control vive en su propio componente.
- Las pruebas comprueban el manejo por teclado y que cada control tiene foco visible.

### Modo de resultado de prueba, solo para desarrollo

- Se activa con `MAIN_VITE_RISKLEX_FIXTURE=sample` y solo cuando `import.meta.env.DEV` es verdadero, es decir, en `npm run dev`. En `build` y `preview` ese valor se sustituye al compilar por `false` y el código desaparece del paquete.
- El cliente simulado no usa `fetch`. Construye la respuesta solo con las frases de `docs/ai-evaluation/synthetic-terms-es.expected.json`, que salen del documento sintético. No contiene textos inventados.
- El resultado no tiene trato especial: pasa por la verificación de citas real y por la validación real del IPC. Si el texto de la caja no es el documento de ejemplo, se descartan las citas que no aparecen y, si no queda ninguna, el resultado es el error de baja confiabilidad.
- La pantalla muestra siempre, sin forma de ocultarlo, el aviso "Resultado de prueba, no es un análisis real".
- Una prueba compila de verdad con `electron-vite build` y la variable definida, que es la misma compilación que ejecuta `preview` antes de abrir Electron, y comprueba que ni `out/main` ni `out/renderer` contienen el simulador. Un control positivo fuerza `DEV` y comprueba que entonces sí aparece, para demostrar que la búsqueda funciona.

### Empaquetado de macOS

- electron-builder genera un `.dmg` solo para arm64 en `apps/frontend/release/`, que Git ignora.
- Todo el código de main y del preload se empaqueta con Vite, y las dependencias del frontend son de desarrollo. Así `app.asar` solo contiene `out/**` y `package.json`, sin `node_modules`, y no dependemos de cómo trate electron-builder los workspaces de npm.
- La compilación del instalador usa el modo `release`, que exige una dirección https válida en `MAIN_VITE_RISKLEX_API_URL` y falla sin mostrar el valor.
- Firma ad hoc (`mac.identity: "-"`): sin certificado, electron-builder no firma nada y la app queda con una firma incompleta que `codesign --verify --deep --strict` rechaza. La firma ad hoc sella el paquete completo y pasa esa verificación.
- `hardenedRuntime` está desactivado solo para esta versión de prueba sin notarización: con firma ad hoc, el entorno endurecido rechaza el framework de Electron firmado con otro equipo. Si algún día se notariza, hay que activarlo y declarar los permisos (entitlements) necesarios.

## Consecuencias

- El renderer no puede llegar a la red ni al sistema aunque se inyecte contenido.
- Añadir un canal nuevo exige tocar `common/`, el preload y su prueba, lo que hace visible cualquier cambio en la superficie entre procesos.
- La URL del backend queda incrustada en el paquete de main al compilar. No es un secreto, pero acaba dentro del binario distribuido.
- `zod` ya no se externaliza en main: TD-004 está cerrada.
- El instalador de prueba solo sirve en Mac con Apple Silicon y macOS pide confirmar la apertura si el archivo llega descargado.
- Se puede revisar la interfaz completa sin gastar llamadas, con la garantía comprobada de que el simulador no llega a ninguna compilación distribuible.
