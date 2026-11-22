# RiskLex

RiskLex es una aplicación de escritorio para Windows, macOS y Linux que analiza términos y condiciones y políticas de privacidad (PDF o dirección web) con inteligencia artificial. Los transforma en una matriz clara de riesgos y consecuencias, pensada para personas de cualquier edad sin conocimientos legales.

No es un resumidor: identifica riesgos, explica consecuencias, muestra la cláusula original, reconoce ambigüedades y comunica la incertidumbre.

> RiskLex es informativo y no reemplaza la asesoría de un abogado.

## Estado

Proyecto académico en desarrollo. La aplicación de escritorio analiza texto pegado, PDF y enlaces de punta a punta contra el backend desplegado; el avance real está en `docs/tasks.md`.

Hay instaladores de prueba sin firmar para macOS con Apple Silicon, Windows x64 y Linux x64. GitHub Actions los genera y comprueba en cada cambio (ver "Generar los instaladores con GitHub Actions").

## Qué hará

- Analizar un PDF o una dirección web de términos o de política de privacidad.
- Clasificar las cláusulas en cinco categorías: Privacidad, Seguimiento, Costos ocultos, Cancelación y Licencia de contenido.
- Mostrar cada riesgo con tres niveles (Alto riesgo, Advertencia y Neutro), siempre con texto, indicador y color.
- Adaptar la prioridad y la explicación al perfil de uso (versión gratuita, suscripción o uso profesional) sin repetir el análisis.
- Mostrar la cita original de cada cláusula, verificada contra el texto del documento.
- Guardar un historial local, sin cuentas de usuario ni base de datos en la nube.
- Funcionar en español por defecto, con opción de inglés.

## Requisitos para desarrollar

- Node.js 24 o superior (versión fijada en `.nvmrc`).
- npm 11 o superior.
- Git.

Los comandos funcionan igual en macOS, Windows y Linux.

## Primeros pasos

```bash
npm ci
```

Después, una sola vez, descarga el binario de Electron (unos 100 MB desde GitHub Releases). `npm ci` no lo descarga y sin él la app de escritorio no arranca:

```bash
cd apps/frontend && npx install-electron
```

Si la descarga falla:

- Vuelve a ejecutar el comando; una descarga interrumpida se reintenta desde cero con `force_no_cache=true npx install-electron`.
- Detrás de un proxy, define `ELECTRON_GET_USE_PROXY=1` junto con las variables de proxy habituales.
- Si GitHub no está disponible, `ELECTRON_MIRROR` apunta a un espejo. Las opciones están en https://www.electronjs.org/docs/latest/tutorial/installation.

Comprueba que todo está en orden:

```bash
npm run validate
```

## Configurar la dirección del backend

La app de escritorio lee la dirección del backend de `MAIN_VITE_RISKLEX_API_URL`. Nunca se escribe en archivos versionados:

1. Copia `apps/frontend/.env.example` como `apps/frontend/.env.local` (ignorado por Git).
2. Escribe la dirección de tu Worker de Cloudflare: `https://<nombre>.<cuenta>.workers.dev`.

Para la app en desarrollo:

```bash
npm run dev -w @risklex/frontend
```

## Comandos

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

## Leer un PDF o un enlace

En la pantalla Analizar, "Elegir un PDF…" y "Leer un enlace" rellenan la caja de texto, que sigue siendo editable. Leer no gasta nada: solo "Analizar documento" envía el texto a la IA, después del consentimiento.

- **PDF:** se lee en un proceso aislado, con límites de 20 MB, 300 páginas, 30 s y 512 MB. Los PDF escaneados sin texto, protegidos con contraseña o dañados muestran un mensaje con el siguiente paso.
- **Enlace:** la página se descarga desde este equipo, solo por https, sin cookies ni credenciales, y nunca desde direcciones privadas o locales. Las páginas que necesitan JavaScript o inicio de sesión no se pueden leer; en ese caso hay que pegar el texto.
- **Privacidad:** a la IA solo viaja el texto, nunca la dirección del enlace ni el nombre del archivo. El sitio del enlace sí ve la dirección IP de quien lo lee, y la app lo avisa antes de descargar.
- **Límite:** un texto de más de 150.000 caracteres se rechaza; hay que pegar solo la parte de términos o de privacidad.

Para probar la lectura de PDF sin contenido de terceros, este comando escribe PDF sintéticos (normal, sin texto, protegido y dañado) en una carpeta temporal fuera del repositorio e imprime su ruta:

```bash
node apps/frontend/scripts/write-sample-pdfs.ts
```

Las decisiones de seguridad están en `docs/decisions/0005-isolated-document-reading.md`. Las licencias del software de terceros incluido en la app están en `apps/frontend/THIRD-PARTY-NOTICES.txt`, que también viaja dentro del paquete.

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

En todos los casos se puede abrir el documento, copiar el texto y pegarlo. Leer un PDF o un enlace no cuesta nada; **cada análisis consume saldo de la cuenta de IA del titular del servicio**.

## Ajustes

En Ajustes se eligen el idioma (español o inglés), el tema (como el sistema, claro u oscuro), el tamaño del texto, si se guarda el historial y se puede volver a ver la bienvenida. El idioma cambia la interfaz y el de los próximos análisis; los análisis ya hechos se quedan en su idioma. Todo se guarda en el equipo y se aplica desde el primer momento al abrir la app.

La primera vez que se abre RiskLex muestra una bienvenida que se cierra con Comenzar, Saltar o Escape.

## Historial

Cada análisis correcto se guarda en el equipo si el historial está activado (lo está por defecto). Se guardan el resultado con sus citas del documento, la fecha, el nombre del archivo o el dominio del enlace, el número de caracteres, el idioma y una huella SHA-256 del texto. Nunca el documento completo, la ruta del archivo ni la dirección completa del enlace.

- En Historial se puede abrir un análisis, borrarlo o borrar todo. Desactivar el historial en Ajustes no borra nada, pero ofrece borrar lo guardado.
- **Los archivos no los cifra la aplicación.** Su protección depende del cifrado de disco del sistema (FileVault, BitLocker o el equivalente en Linux).
- **La huella SHA-256 permite comprobar si un texto concreto fue analizado** en este equipo, aunque no permite reconstruir el texto.

### Dónde se guardan los datos

| Sistema | Carpeta                                  |
| ------- | ---------------------------------------- |
| macOS   | `~/Library/Application Support/RiskLex/` |
| Windows | `%APPDATA%\RiskLex\`                     |
| Linux   | `~/.config/RiskLex/`                     |

Contiene `settings.json` (ajustes, consentimiento e identificador aleatorio de la instalación), `history.json` (historial) y, si algún archivo se dañó, copias apartadas con el nombre `*.corrupt-*.json`. En desarrollo la carpeta se llama `RiskLex Dev`.

### Cómo borrarlo todo

1. En la app: Historial → "Borrar todo el historial". Borra también las copias apartadas.
2. Para borrar además los ajustes, el consentimiento y el identificador, cierra RiskLex y borra la carpeta de datos de tu sistema (tabla anterior). Al abrir de nuevo, la app empieza desde cero y vuelve a pedir el consentimiento.

## Sin cuentas de usuario

RiskLex ayuda a entender qué se acepta al usar un servicio digital, así que no pide registrarse con correo y contraseña. No hay cuentas:

- **Menos datos personales:** no se pide nombre, correo ni contraseña, y el servicio de RiskLex en internet no guarda documentos ni resultados.
- **Tus datos están en tu equipo:** ajustes, consentimiento e historial viven en la carpeta de datos (ver "Historial").
- **Menos superficie de ataque:** no hay una base de personas, contraseñas ni recuperación de acceso que atacar.
- **Uso inmediato:** se instala y se analiza.

Qué sí se envía al analizar: el texto que decides analizar, un código aleatorio por instalación para limitar el abuso y la versión de la app. Como cualquier servicio en internet, el de RiskLex ve además la dirección de tu conexión. Nada de esto incluye tu nombre ni tu correo. El proveedor de IA puede conservar el texto unos días, como dice el aviso de privacidad.

Cómo se controla el abuso sin cuentas: límites por instalación (3 análisis por minuto) y por conexión (5 por minuto), un tamaño máximo de documento, la clave de la IA guardada solo en el servicio y el límite mensual de gasto de la consola de Anthropic.

Lo que no se puede hacer sin cuentas: sincronizar el historial entre equipos o dar cuotas individuales. Si hiciera falta más control, la opción simple es un código de acceso exigido por el servicio que no vaya dentro del instalador (MP-04 en `docs/tasks.md`). Añadir cuentas completas exigiría revisar antes el aviso y la política de privacidad. Los detalles están en `docs/decisions/0008-no-user-accounts.md`.

## Resultado de prueba (solo desarrollo)

Para revisar la pantalla de resultados sin llamar al backend ni gastar:

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
- La pantalla muestra siempre el aviso "Resultado de prueba, no es un análisis real".
- El resultado se guarda en el historial de la carpeta `RiskLex Dev`, con el mismo aviso al abrirlo, para poder revisar el historial sin gastar.

Los detalles están en `docs/decisions/0004-desktop-app-security-and-ipc.md`.

## Generar el instalador de macOS

Solo para macOS con Apple Silicon. Necesita `apps/frontend/.env.local` con una dirección https válida; si falta o no es válida, la compilación se detiene con un mensaje que no muestra el valor.

```bash
npm run dist:mac -w @risklex/frontend
```

Es la forma de generar el instalador de macOS para probarlo: no hace falta GitHub Actions. El instalador queda en `apps/frontend/release/RiskLex-0.1.0-arm64.dmg`. La carpeta `release/` está ignorada por Git y ningún artefacto entra en un commit.

## Generar los instaladores con GitHub Actions

El flujo `.github/workflows/ci.yml` valida el proyecto en macOS, Windows y Linux en cada `push` a `main` y en cada pull request. Después genera los tres instaladores y comprueba el lector de PDF dentro de cada paquete con PDF sintéticos. No publica nada, y en `push` y pull request no usa ningún secreto.

Cuándo usar cada modo:

- **Para probar un instalador de Windows o Linux** basta el modo `example`: sirve para comprobar la instalación, la lectura de PDF y enlaces, los ajustes y el historial vacío, sin gasto posible.
- **Los instaladores con el backend real** se generan una sola vez, para entregar. Se descargan y se borra el artefacto enseguida.

Para descargar los instaladores:

1. En GitHub, abre la pestaña Actions, elige el flujo CI y pulsa "Run workflow" en la rama `main`.
2. En `backend`, deja `example` para probar la instalación sin gasto: el análisis responderá "No pudimos conectar". `real` usa el secreto del repositorio `RISKLEX_API_URL` (ver más abajo); si falta o no es válido, la compilación falla sin mostrar el valor.
3. Al terminar, descarga `RiskLex-windows-…`, `RiskLex-linux-…` o `RiskLex-macos-…` desde la página de la ejecución.

Para crear el secreto, una sola vez y solo cuando vayas a generar instaladores reales: en el repositorio, Settings → Secrets and variables → Actions → pestaña Secrets → New repository secret, con el nombre `RISKLEX_API_URL` y la dirección `https://<tu-worker>.workers.dev` como valor. No crees una variable con ese nombre: GitHub muestra los valores de las variables en los registros y solo oculta los secretos. Después de guardarlo, GitHub no permite volver a leer el secreto; para cambiarlo hay que escribirlo de nuevo. El secreto protege los registros, pero no el instalador: la dirección sigue dentro de la app.

Los artefactos solo se suben en ejecuciones manuales y duran un día. En un repositorio público cualquiera puede descargarlos mientras existan, y un instalador generado con `real` lleva dentro la dirección del backend. Después de descargarlo, bórralo desde la página de la ejecución con el icono de la papelera.

## Instalar en Windows (versión de prueba sin firma)

1. Descomprime el artefacto y ejecuta `RiskLex-Setup-0.1.0-x64.exe`. Se instala solo para tu usuario, sin permisos de administrador.
2. Como el instalador no está firmado, Microsoft Defender SmartScreen puede mostrar una advertencia porque no reconoce la aplicación. Continúa solo si el archivo viene de este repositorio. Las opciones del diálogo ("Más información" y "Ejecutar de todas formas") aparecen en el propio aviso, pero la página oficial de Microsoft no las describe: https://learn.microsoft.com/en-us/windows/security/operating-system-security/virus-and-threat-protection/microsoft-defender-smartscreen/

El instalador de Windows se compila y supera la prueba de humo en GitHub Actions; la instalación y el uso se verifican a mano en un equipo con Windows.

## Instalar en Linux (versión de prueba sin firma)

1. Descomprime el artefacto, da permiso de ejecución y abre la aplicación:

   ```bash
   chmod +x RiskLex-0.1.0-x86_64.AppImage
   ```

   ```bash
   ./RiskLex-0.1.0-x86_64.AppImage
   ```

2. Los AppImage necesitan FUSE 2. Si no abre, instala `libfuse2` (en Ubuntu 24.04 y posteriores se llama `libfuse2t64`) o ejecútalo sin FUSE con `./RiskLex-0.1.0-x86_64.AppImage --appimage-extract-and-run`. Guías oficiales: https://docs.appimage.org/introduction/quickstart.html y https://docs.appimage.org/user-guide/troubleshooting/fuse.html

El AppImage se compila y supera la prueba de humo en GitHub Actions, pero todavía no se ha abierto en un escritorio Linux.

## Instalar en macOS (versión de prueba sin firma)

**Solo para Mac con Apple Silicon (M1 o posterior). No funciona en Mac con procesador Intel.**

Es una versión de prueba firmada de forma local (ad hoc), sin firma de desarrollador de Apple ni notarización:

1. Abre el `.dmg` y arrastra RiskLex a la carpeta Aplicaciones.
2. Abre RiskLex desde Aplicaciones.
3. Si macOS indica que no puede comprobar si la app contiene software malicioso, sigue los pasos oficiales de Apple: abre Ajustes del Sistema, entra en Privacidad y seguridad, desplázate hacia abajo y pulsa "Abrir igualmente"; confirma con Abrir. Guía oficial: https://support.apple.com/es-es/102445
4. Instala solo copias que vengan de este repositorio.

El entorno de ejecución endurecido (`hardenedRuntime`) está desactivado solo en esta versión de prueba, porque no se notariza. Si algún día se notariza, hay que activarlo y revisar los permisos (entitlements).

> **Advertencia:** el instalador lleva dentro la dirección del backend, y cada análisis consume saldo de la cuenta de IA de quien despliega el proyecto. Compártelo solo con personas autorizadas a usarlo.

## Cómo apagar el proyecto

Solo cuando el proyecto deje de usarse. Así nadie puede seguir gastando con un instalador o con el backend:

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
6. En cada equipo donde se instaló, desinstala RiskLex y borra su carpeta de datos: `~/Library/Application Support/RiskLex/` en macOS, `%APPDATA%\RiskLex\` en Windows y `~/.config/RiskLex/` en Linux.

## Estructura

```
apps/frontend      aplicación de escritorio (Electron, React)
apps/backend       API en Cloudflare Workers (Hono)
packages/shared    contratos con Zod y funciones puras compartidas
tooling            reglas locales de ESLint y comprobaciones
docs               documentación del proyecto
```

## Documentación

Las reglas de trabajo, la arquitectura y el orden de lectura de la documentación están en `AGENTS.md`.
