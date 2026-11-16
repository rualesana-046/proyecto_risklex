# RiskLex

RiskLex es una aplicación de escritorio para Windows, macOS y Linux que analiza términos y condiciones y políticas de privacidad (PDF o dirección web) con inteligencia artificial. Los transforma en una matriz clara de riesgos y consecuencias, pensada para personas de cualquier edad sin conocimientos legales.

No es un resumidor: identifica riesgos, explica consecuencias, muestra la cláusula original, reconoce ambigüedades y comunica la incertidumbre.

> RiskLex es informativo y no reemplaza la asesoría de un abogado.

## Estado

Proyecto académico en desarrollo. La aplicación de escritorio analiza texto pegado de punta a punta contra el backend desplegado; el avance real está en `docs/tasks.md`.

Hay un instalador de prueba solo para macOS con Apple Silicon (ver "Instalar en macOS"). Los de Windows y Linux llegarán con la integración continua.

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

Comandos de la app de escritorio, con `-w @risklex/frontend`: `dev` (desarrollo), `build` y `preview` (compilación de producción) y `dist:mac` (instalador de macOS).

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

## Instalar en macOS (versión de prueba sin firma)

**Solo para Mac con Apple Silicon (M1 o posterior). No funciona en Mac con procesador Intel ni en Windows.**

Es una versión de prueba firmada de forma local (ad hoc), sin firma de desarrollador de Apple ni notarización:

1. Abre el `.dmg` y arrastra RiskLex a la carpeta Aplicaciones.
2. Abre RiskLex desde Aplicaciones.
3. Si macOS indica que no puede comprobar si la app contiene software malicioso, sigue los pasos oficiales de Apple: abre Ajustes del Sistema, entra en Privacidad y seguridad, desplázate hacia abajo y pulsa "Abrir igualmente"; confirma con Abrir. Guía oficial: https://support.apple.com/es-es/102445
4. Instala solo copias que vengan de este repositorio.

El entorno de ejecución endurecido (`hardenedRuntime`) está desactivado solo en esta versión de prueba, porque no se notariza. Si algún día se notariza, hay que activarlo y revisar los permisos (entitlements).

> **Advertencia:** el instalador lleva dentro la dirección del backend, y cada análisis consume saldo de la cuenta de IA de quien despliega el proyecto. Entrégalo solo a las personas que vayan a evaluarlo.

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
