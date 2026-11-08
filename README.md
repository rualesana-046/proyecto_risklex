# RiskLex

RiskLex es una aplicación de escritorio para Windows, macOS y Linux que analiza términos y condiciones y políticas de privacidad (PDF o dirección web) con inteligencia artificial. Los transforma en una matriz clara de riesgos y consecuencias, pensada para personas de cualquier edad sin conocimientos legales.

No es un resumidor: identifica riesgos, explica consecuencias, muestra la cláusula original, reconoce ambigüedades y comunica la incertidumbre.

> RiskLex es informativo y no reemplaza la asesoría de un abogado.

## Estado

Proyecto académico en desarrollo. Hoy el repositorio contiene la configuración del monorepo y las reglas automáticas de calidad. La aplicación de escritorio, el backend y el paquete compartido se están construyendo por bloques; el avance real está en `docs/tasks.md`.

Todavía no hay instaladores. Se publicarán en GitHub Releases cuando el proyecto esté terminado.

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

```bash
npm run validate
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

## Estructura

```
apps/frontend      aplicación de escritorio (Electron, React)       en construcción
apps/backend       API en Cloudflare Workers (Hono)                 en construcción
packages/shared    contratos con Zod y funciones puras compartidas  en construcción
tooling            reglas locales de ESLint y comprobaciones
docs               documentación del proyecto
```

## Documentación

Las reglas de trabajo, la arquitectura y el orden de lectura de la documentación están en `AGENTS.md`.
