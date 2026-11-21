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

| Comando                | Qué hace                                                         |
| ---------------------- | ---------------------------------------------------------------- |
| `npm run format`       | Aplica el formato de Prettier a todo el repositorio.             |
| `npm run format:check` | Comprueba el formato sin cambiar archivos.                       |
| `npm run lint`         | Ejecuta ESLint con reglas estrictas, incluida la de no comentar. |
| `npm run typecheck`    | Verifica los tipos de TypeScript.                                |
| `npm run test`         | Ejecuta las pruebas con Vitest.                                  |
| `npm run validate`     | Ejecuta las cuatro comprobaciones anteriores en orden.           |

Comandos de la app de escritorio, con `-w @risklex/frontend`: `dev` (desarrollo), `build` y `preview` (compilación de producción) y `dist:mac`, `dist:win` y `dist:linux` (instaladores de cada sistema, cada uno en su propio sistema).

## Leer un PDF o un enlace

En la pantalla Analizar, "Elegir un PDF…" y "Leer un enlace" rellenan la caja de texto, que sigue siendo editable. Leer no gasta nada: solo "Analizar documento" envía el texto a la IA, después del consentimiento.

- **PDF:** se lee en un proceso aislado, con límites de 20 MB, 300 páginas, 30 s y 512 MB. Los PDF escaneados sin texto, protegidos con contraseña o dañados muestran un mensaje con el siguiente paso.
- **Enlace:** la página se descarga desde este equipo, solo por https, sin cookies ni credenciales, y nunca desde direcciones privadas o locales. Las páginas que necesitan JavaScript o inicio de sesión no se pueden leer; en ese caso hay que pegar el texto.
- **Privacidad:** a la IA solo viaja el texto, nunca la dirección del enlace ni el nombre del archivo. El sitio del enlace sí ve la dirección IP de quien lo lee, y la app lo avisa antes de descargar.
- **Límite:** un texto de más de 150.000 caracteres se rechaza; hay que pegar solo la parte de términos o de privacidad.

Para probarlo sin contenido de terceros, este comando escribe PDF sintéticos (normal, sin texto, protegido y dañado) en una carpeta temporal fuera del repositorio e imprime su ruta:

```bash
node apps/frontend/scripts/write-sample-pdfs.ts
```

Las decisiones de seguridad están en `docs/decisions/0005-isolated-document-reading.md`. Las licencias del software de terceros incluido en la app están en `apps/frontend/THIRD-PARTY-NOTICES.txt`, que también viaja dentro del paquete.

## Resultado de prueba (solo desarrollo)

Para revisar la pantalla de resultados sin llamar al backend ni gastar:

```bash
MAIN_VITE_RISKLEX_FIXTURE=sample npm run dev -w @risklex/frontend
```

- Solo funciona con `npm run dev`. En `build` y `preview` el simulador no se incluye, y una prueba lo comprueba compilando de verdad.
- No hace ninguna petición de red. Construye el resultado con las frases del documento sintético de `docs/ai-evaluation/`.
- Usa la verificación de citas real: con el texto de ejemplo todo se verifica; con otro texto, las citas se descartan como en un análisis real.
- La pantalla muestra siempre el aviso "Resultado de prueba, no es un análisis real".

Los detalles están en `docs/decisions/0004-desktop-app-security-and-ipc.md`.

## Generar el instalador de macOS

Solo para macOS con Apple Silicon. Necesita `apps/frontend/.env.local` con una dirección https válida; si falta o no es válida, la compilación se detiene con un mensaje que no muestra el valor.

```bash
npm run dist:mac -w @risklex/frontend
```

El instalador queda en `apps/frontend/release/RiskLex-0.1.0-arm64.dmg`. La carpeta `release/` está ignorada por Git y ningún artefacto entra en un commit.

## Generar los instaladores con GitHub Actions

El flujo `.github/workflows/ci.yml` valida el proyecto en macOS, Windows y Linux en cada `push` a `main` y en cada pull request. Después genera los tres instaladores y comprueba el lector de PDF dentro de cada paquete con PDF sintéticos. No usa secretos y no publica nada.

Para descargar los instaladores:

1. En GitHub, abre la pestaña Actions, elige el flujo CI y pulsa "Run workflow" en la rama `main`.
2. En `backend`, deja `example` para probar la instalación sin gasto: el análisis responderá "No pudimos conectar". `real` usa la variable del repositorio `RISKLEX_API_URL` (Settings → Secrets and variables → Actions → Variables); si falta o no es válida, la compilación falla sin mostrar el valor.
3. Al terminar, descarga `RiskLex-windows-…`, `RiskLex-linux-…` o `RiskLex-macos-…` desde la página de la ejecución.

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

Para que nadie pueda seguir gastando con el instalador o el backend:

1. Borra la clave de la API en la consola de Anthropic (Settings, API keys). Desde ese momento ningún análisis funciona.
2. Borra el Worker desde `apps/backend`; también desaparecen sus secretos:

   ```bash
   npx wrangler delete
   ```

3. Cierra la sesión de wrangler en este equipo:

   ```bash
   npx wrangler logout
   ```

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
