# 0002. Aplicación de escritorio con Electron, electron-vite y React

- Estado: aceptada
- Fecha: 2026-11-07

## Contexto

RiskLex debe ejecutarse en Windows, macOS y Linux, distribuirse con instaladores descargables, sin tiendas de aplicaciones, y procesar los documentos en el equipo del usuario:

- Las URL se descargan localmente, solo como HTML estático.
- Los PDF se leen localmente.
- El historial y los ajustes nunca salen del equipo.

El equipo trabaja con TypeScript y React.

## Decisión

- **Electron** como entorno de escritorio, en la versión estable más reciente verificada con `npm view electron version` (45.2.3 al tomar la decisión).
- **electron-vite** para compilar el proceso principal, el preload y la interfaz.
- **React**, **TypeScript**, **Tailwind CSS**, **Radix UI** (componentes accesibles) e **i18next** (español e inglés) para la interfaz.
- Servicios locales en el proceso principal:
  - **pdf.js** para extraer texto de PDF, sin evaluación de código;
  - **Readability** para extraer el contenido principal del HTML, sin ejecutar scripts de la página;
  - **SQLite** con better-sqlite3 para el historial.
- Seguridad desde el inicio:
  - `contextIsolation`, `sandbox` y `nodeIntegration` desactivado;
  - CSP estricta en producción;
  - ventanas nuevas y navegación externa denegadas;
  - preload mínimo e IPC validado con Zod.
- `@risklex/shared` se empaqueta dentro del proceso principal en lugar de quedar como dependencia externa.

## Consecuencias

- Una sola base de código produce los instaladores de los tres sistemas.
- Los instaladores son grandes, porque incluyen Chromium y Node.
- better-sqlite3 es un módulo nativo. Hay que recompilarlo para la versión de Electron y probarlo en las tres plataformas.
- Sin firma de código, macOS y Windows mostrarán advertencias al instalar. El README explicará cómo abrir la aplicación igualmente.
- No habrá actualización automática. Las nuevas versiones se publican en GitHub Releases.
