# RiskLex

RiskLex es una aplicación de escritorio para macOS, Windows y Linux que lee términos y condiciones o políticas de privacidad y te explica, en palabras simples, qué aceptas. Está pensada para personas de cualquier edad, sin conocimientos legales.

> RiskLex es informativo y no reemplaza la asesoría de un abogado.

## Qué hace

- Lee el documento de tres formas: texto pegado, un PDF o un enlace.
- Lo analiza con inteligencia artificial y lo presenta como una matriz de riesgos en cinco categorías: Privacidad, Seguimiento, Costos ocultos, Cancelación y Licencia de contenido.
- Marca cada punto como Alto riesgo, Advertencia o Neutro, siempre con texto, indicador y color.
- Ajusta la prioridad a cómo usas el servicio (gratis, con suscripción o para trabajar) sin repetir el análisis.
- Muestra la cita original de cada punto. Cada cita se comprueba contra el texto del documento y las que no aparecen se descartan.
- Explica las palabras difíciles en un glosario y avisa cuando algo es ambiguo o el resultado es menos fiable.
- Guarda un historial en tu equipo, si quieres. Funciona en español y en inglés.

## Qué no hace

- No da asesoría jurídica ni sustituye a un abogado.
- No lee PDF escaneados (imágenes sin texto) ni páginas que necesitan JavaScript o inicio de sesión. En esos casos se copia y pega el texto.
- No tiene cuentas de usuario, no sincroniza el historial entre equipos y no guarda documentos en internet.
- No analiza textos de más de 150.000 caracteres: hay que pegar solo la parte de términos o de privacidad.

## Estado

Versión 0.1.0 completa. Limitaciones y pendientes:

- Los instaladores no están firmados, así que cada sistema muestra un aviso al abrirlos la primera vez (ver "Instalar").
- Verificado a mano en macOS y en Windows. El instalador de Linux (AppImage) se construye y supera la prueba de humo del lector de PDF en CI, pero todavía no se ha abierto en un escritorio Linux.
- Falta volver a comprobar la política de retención del proveedor de IA en su fuente oficial (TR-06) y decidir la licencia del proyecto.

El detalle está en `docs/tasks.md`.

## Instalar

Los instaladores no se publican en este repositorio ni en GitHub Releases. Quien mantiene el proyecto los comparte de forma privada. Llevan dentro la dirección del servicio de RiskLex en internet, y cada análisis consume saldo de la cuenta de IA de quien lo mantiene, así que **no los difundas**. Instala solo copias que te haya dado esa persona.

Quien clone el repositorio puede compilar la app (ver "Ejecutarlo desde el código"), pero sin la dirección de un servicio propio el análisis no funcionará.

### macOS

**Solo para Mac con Apple Silicon (M1 o posterior). No funciona en Mac con procesador Intel.**

1. Abre el `.dmg` y arrastra RiskLex a la carpeta Aplicaciones.
2. Abre RiskLex desde Aplicaciones.
3. Como no tiene firma de desarrollador de Apple, macOS puede decir que no puede comprobar si contiene software malicioso. Abre Ajustes del Sistema → Privacidad y seguridad, baja hasta el final, pulsa "Abrir igualmente" y confirma con Abrir. Guía oficial de Apple: https://support.apple.com/es-es/102445

### Windows

1. Ejecuta `RiskLex-Setup-0.1.0-x64.exe`. Se instala solo para tu usuario, sin permisos de administrador.
2. Como no está firmado, Microsoft Defender SmartScreen puede avisar de que no reconoce la aplicación. Pulsa "Más información" y después "Ejecutar de todas formas". Página de Microsoft sobre SmartScreen: https://learn.microsoft.com/en-us/windows/security/operating-system-security/virus-and-threat-protection/microsoft-defender-smartscreen/

Verificado a mano en Windows: instalación con el aviso de SmartScreen, bienvenida, ajustes que se conservan al reiniciar, lectura de un enlace y de un PDF, mensaje sin red y Ctrl+Mayús+I sin efecto.

### Linux

1. Da permiso de ejecución al archivo y ábrelo:

   ```bash
   chmod +x RiskLex-0.1.0-x86_64.AppImage
   ```

   ```bash
   ./RiskLex-0.1.0-x86_64.AppImage
   ```

2. Los AppImage necesitan FUSE 2. Si no abre, instala `libfuse2` (en Ubuntu 24.04 y posteriores, `libfuse2t64`) o ábrelo sin FUSE con `./RiskLex-0.1.0-x86_64.AppImage --appimage-extract-and-run`. Guía oficial: https://docs.appimage.org/user-guide/troubleshooting/fuse.html

## Cómo usarlo

1. La primera vez verás una bienvenida. Se cierra con Comenzar, Saltar o Escape, y se puede volver a ver desde Ajustes.
2. En Analizar, añade el documento:
   - **Pega el texto** en la caja.
   - **"Elegir un PDF…"** lee un PDF de tu equipo.
   - **"Leer un enlace"** descarga una página web desde tu equipo.

   El texto leído aparece en la caja y lo puedes editar. Leer no cuesta nada ni envía nada a la IA.

3. Pulsa "Analizar documento". La primera vez, RiskLex te explica qué se envía y te pide permiso. El análisis puede tardar hasta dos minutos.
4. En Resultados verás "Lo esencial", los puntos por gravedad, un filtro por categoría, el perfil de uso y el glosario.

## Qué documentos funcionan mejor

- **Páginas web con el texto en la propia página**, como la mayoría de páginas de términos y de privacidad.
- **PDF con texto**, es decir, que permiten seleccionar y copiar las palabras.
- **Copiar y pegar** el texto en la caja, que funciona siempre.

Cuando no se puede leer, RiskLex lo explica con un mensaje y un siguiente paso:

| Caso                                             | Mensaje                                                                            |
| ------------------------------------------------ | ---------------------------------------------------------------------------------- |
| Página que carga su texto con JavaScript         | "Esta página solo muestra su texto cuando se abre en un navegador."                |
| PDF escaneado, sin texto                         | "Este PDF parece una imagen escaneada: no tiene texto que podamos leer."           |
| PDF protegido con contraseña                     | "Este PDF está protegido con contraseña."                                          |
| Enlace a una dirección interna de casa o empresa | "Por seguridad, RiskLex no lee direcciones internas de una casa o de una empresa." |

En todos los casos se puede abrir el documento, copiar el texto y pegarlo.

## Ajustes e historial

En Ajustes se eligen el idioma (español o inglés), el tema (como el sistema, claro u oscuro), el tamaño del texto y si se guarda el historial. El idioma cambia la interfaz y el de los próximos análisis; los ya hechos se quedan en su idioma.

Cada análisis correcto se guarda en el historial si está activado (lo está por defecto). En Historial se puede abrir un análisis, borrarlo o borrar todo. Desactivar el historial no borra nada, pero ofrece borrar lo guardado.

### Dónde se guardan los datos

| Sistema | Carpeta                                  |
| ------- | ---------------------------------------- |
| macOS   | `~/Library/Application Support/RiskLex/` |
| Windows | `%APPDATA%\RiskLex\`                     |
| Linux   | `~/.config/RiskLex/`                     |

Contiene `settings.json` (ajustes, consentimiento y un código aleatorio de la instalación), `history.json` (historial) y, si algún archivo se dañó, copias apartadas con el nombre `*.corrupt-*.json`.

### Cómo borrarlo todo

1. En la app: Historial → "Borrar todo el historial". Borra también las copias apartadas.
2. Para borrar además los ajustes, el consentimiento y el código de la instalación, cierra RiskLex y borra la carpeta de la tabla anterior. Al abrirla de nuevo, la app empieza desde cero y vuelve a pedir permiso.

## Privacidad

**No hay cuentas.** RiskLex no pide nombre, correo ni contraseña. Ayuda a entender qué se acepta al usar un servicio digital, y pedir un registro sería pedir justo lo que enseña a mirar con cuidado.

**Qué se envía al analizar**, solo después de que aceptes el aviso:

- el texto que decides analizar, a un servicio de RiskLex en internet que lo pasa a Anthropic, la empresa de IA que lo analiza;
- un código aleatorio de la instalación, para limitar el abuso, y la versión de la app;
- como en cualquier servicio en internet, el de RiskLex ve la dirección de tu conexión.

Nada de esto incluye tu nombre ni tu correo. A la IA nunca se envía la dirección del enlace ni el nombre del archivo.

**Quién guarda qué:**

- El servicio de RiskLex en internet no guarda documentos ni resultados.
- Anthropic puede conservar los datos hasta 30 días, o más si algún contenido se marca para revisión.
- En tu equipo, si el historial está activado, se guardan el resultado con sus citas, la fecha, el nombre del archivo o el dominio del enlace, el número de caracteres, el idioma y una huella SHA-256 del texto. Nunca el documento completo, la ruta del archivo ni la dirección completa del enlace.

**Lo que conviene saber:**

- Al leer un enlace, la página se descarga desde tu equipo, así que el sitio ve tu dirección IP. La app lo avisa antes.
- Los archivos del equipo no los cifra la app: su protección depende del cifrado de disco del sistema (FileVault, BitLocker o el equivalente en Linux).
- La huella SHA-256 permite comprobar si un texto concreto se analizó en este equipo, aunque no permite reconstruirlo.
- No pegues información que no quieras compartir, como contraseñas o datos de salud.

**Cómo se controla el abuso sin cuentas:**

- límites de 3 análisis por minuto por instalación y 5 por conexión;
- un tamaño máximo de documento;
- la clave de la IA guardada solo en el servicio;
- el límite mensual de gasto de la cuenta de IA.

Sin cuentas no se pueden dar cuotas individuales. Si hiciera falta más control, la opción simple es un código de acceso exigido por el servicio (MP-04 en `docs/tasks.md`). Los detalles están en `docs/decisions/0007-local-storage-settings-and-history.md` y `docs/decisions/0008-no-user-accounts.md`.

## Ejecutarlo desde el código

### Requisitos

- Node.js 24 o superior (versión fijada en `.nvmrc`).
- npm 11 o superior.
- Git.

Los comandos funcionan igual en macOS, Windows y Linux.

### Primeros pasos

```bash
npm ci
```

Después, una sola vez, descarga el binario de Electron (unos 100 MB desde GitHub Releases). `npm ci` no lo descarga y sin él la app no arranca:

```bash
cd apps/frontend && npx install-electron
```

Si la descarga falla:

- Vuelve a ejecutar el comando. Una descarga interrumpida se repite desde cero con `force_no_cache=true npx install-electron`.
- Detrás de un proxy, define `ELECTRON_GET_USE_PROXY=1` junto con las variables de proxy habituales.
- Si GitHub no está disponible, `ELECTRON_MIRROR` apunta a un espejo. Las opciones están en https://www.electronjs.org/docs/latest/tutorial/installation.

Comprueba que todo está en orden:

```bash
npm run validate
```

### Dirección del servicio (backend)

La app lee la dirección del backend de `MAIN_VITE_RISKLEX_API_URL`. Nunca se escribe en archivos versionados:

1. Copia `apps/frontend/.env.example` como `apps/frontend/.env.local` (ignorado por Git).
2. Escribe la dirección de tu Worker de Cloudflare: `https://<nombre>.<cuenta>.workers.dev`.

Para la app en desarrollo:

```bash
npm run dev -w @risklex/frontend
```

### Comandos

| Comando                | Qué hace                                                          |
| ---------------------- | ----------------------------------------------------------------- |
| `npm run format`       | Aplica el formato de Prettier a todo el repositorio.              |
| `npm run format:check` | Comprueba el formato sin cambiar archivos.                        |
| `npm run lint`         | Ejecuta ESLint con reglas estrictas, incluida la de no comentar.  |
| `npm run typecheck`    | Verifica los tipos de TypeScript.                                 |
| `npm run test`         | Ejecuta las pruebas con Vitest.                                   |
| `npm run validate`     | Ejecuta las cuatro comprobaciones anteriores en orden.            |
| `npm run check:push`   | Comprueba el repositorio antes de subir y solo muestra recuentos. |

Comandos de la app de escritorio, con `-w @risklex/frontend`: `dev` (desarrollo), `build` y `preview` (compilación de producción) y `dist:mac`, `dist:win` y `dist:linux` (instaladores de cada sistema, cada uno en su propio sistema).

### Probar la lectura de PDF

Este comando escribe PDF sintéticos (normal, sin texto, protegido y dañado) en una carpeta temporal fuera del repositorio e imprime su ruta:

```bash
node apps/frontend/scripts/write-sample-pdfs.ts
```

El PDF se lee en un proceso aislado, con límites de 20 MB, 300 páginas, 30 s y 512 MB. Los enlaces solo se leen por https, sin cookies ni credenciales, y nunca desde direcciones privadas o locales. Las decisiones de seguridad están en `docs/decisions/0005-isolated-document-reading.md`, y las licencias del software de terceros, en `apps/frontend/THIRD-PARTY-NOTICES.txt`, que también viaja dentro del paquete.

### Resultado de prueba, sin gasto

Para revisar la pantalla de resultados sin llamar al backend:

```bash
MAIN_VITE_RISKLEX_FIXTURE=sample npm run dev -w @risklex/frontend
```

- Solo funciona con `npm run dev`. En `build` y `preview` el simulador no se incluye, y una prueba lo comprueba compilando de verdad.
- No hace ninguna petición de red. Construye el resultado con las frases del documento sintético de `docs/ai-evaluation/`.
- La app no trae documentos de ejemplo. Para probarlo, copia el documento sintético y pégalo en la caja de texto:

  ```bash
  pbcopy < docs/ai-evaluation/synthetic-terms-es.md
  ```

- Usa la verificación de citas real: con el documento sintético todo se verifica; con otro texto, las citas se descartan como en un análisis real.
- La pantalla muestra siempre el aviso "Resultado de prueba, no es un análisis real". El resultado se guarda en el historial de la carpeta `RiskLex Dev`, que es la que se usa en desarrollo.

Los detalles están en `docs/decisions/0004-desktop-app-security-and-ipc.md`.

### Generar el instalador de macOS en local

Solo en macOS con Apple Silicon. Necesita `apps/frontend/.env.local` con una dirección https válida; si falta o no es válida, la compilación se detiene con un mensaje que no muestra el valor.

```bash
npm run dist:mac -w @risklex/frontend
```

El instalador queda en `apps/frontend/release/RiskLex-0.1.0-arm64.dmg`. La carpeta `release/` está ignorada por Git. Es una firma local (ad hoc), sin notarización, y el entorno de ejecución endurecido (`hardenedRuntime`) está desactivado; si algún día se notariza, hay que activarlo y revisar los permisos (entitlements).

### Generar los instaladores con GitHub Actions

El flujo `.github/workflows/ci.yml` valida el proyecto en macOS, Windows y Linux en cada `push` a `main` y en cada pull request. Después genera los tres instaladores y comprueba el lector de PDF dentro de cada paquete. No publica nada, y en `push` y pull request no usa ningún secreto.

1. En GitHub, abre la pestaña Actions, elige el flujo CI y pulsa "Run workflow" en la rama `main`.
2. En `backend`, elige un modo:
   - `example` sirve para probar la instalación, los PDF, los enlaces y los ajustes sin gasto posible; el análisis responderá "No pudimos conectar".
   - `real` usa el secreto del repositorio `RISKLEX_API_URL`. Si falta o no es válido, la compilación falla sin mostrar el valor.
3. Al terminar, descarga `RiskLex-windows-…`, `RiskLex-linux-…` o `RiskLex-macos-…` desde la página de la ejecución, y **borra el artefacto enseguida** con el icono de la papelera. Los artefactos duran un día, y en un repositorio público cualquiera puede descargarlos mientras existan.

Para crear el secreto, una sola vez: Settings → Secrets and variables → Actions → pestaña Secrets → New repository secret, con el nombre `RISKLEX_API_URL` y la dirección `https://<tu-worker>.workers.dev` como valor. Debe ser un **secreto**, no una variable: GitHub muestra los valores de las variables en los registros y solo oculta los secretos. El secreto protege los registros, no el instalador, que sigue llevando la dirección dentro.

## Cómo apagar el proyecto

Solo cuando el proyecto deje de usarse. Así nadie puede seguir gastando con un instalador o con el servicio:

1. Borra la clave de la API en la consola de Anthropic (Settings, API keys). Desde ese momento ningún análisis funciona.
2. Borra el Worker desde `apps/backend`; también desaparecen sus secretos:

   ```bash
   npx wrangler delete
   ```

3. Cierra la sesión de wrangler en este equipo:

   ```bash
   npx wrangler logout
   ```

4. Borra el secreto `RISKLEX_API_URL` en GitHub: Settings → Secrets and variables → Actions → pestaña Secrets.
5. Borra los artefactos que queden en las ejecuciones de GitHub Actions, con el icono de la papelera de cada uno.
6. En cada equipo donde se instaló, desinstala RiskLex y borra su carpeta de datos (ver "Dónde se guardan los datos").

## Estructura

```
apps/frontend      aplicación de escritorio (Electron, React)
apps/backend       servicio en Cloudflare Workers (Hono) que guarda la clave de la IA
packages/shared    contratos con Zod y funciones puras compartidas
tooling            reglas locales de ESLint y comprobaciones
docs               documentación del proyecto
```

## Documentación

Las reglas de trabajo, la arquitectura y el orden de lectura de la documentación están en `AGENTS.md`. Las tareas y su estado están en `docs/tasks.md`, y las decisiones, en `docs/decisions/`.
