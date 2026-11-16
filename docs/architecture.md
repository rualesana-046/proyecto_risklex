# Arquitectura

Resumen de cómo está construido RiskLex hoy. Las decisiones y sus motivos están en `docs/decisions/`.

## Piezas

```
apps/frontend      app de escritorio (Electron 45, React 19, Vite con electron-vite)
apps/backend       API en Cloudflare Workers (Hono) que custodia la clave de la IA
packages/shared    contratos Zod, constantes y verificación de citas, sin Node ni navegador
tooling            reglas locales de ESLint y comprobaciones del repositorio
```

Las fronteras se comprueban con ESLint (`tooling/eslint-rules/import-boundaries.js`): el frontend y el backend nunca se importan entre sí, y `packages/shared` no importa Electron, Node, Hono, React ni las apps.

## Flujo de un análisis

1. **Renderer** (React, sin red ni Node): la persona pega el texto, acepta el aviso de privacidad y pulsa Analizar. Llama a `window.risklex.analyze`.
2. **Preload** (aislado y con sandbox): expone solo `analyze`, `onProgress` y `cancel`, y reenvía por IPC con los nombres de canal de `common/ipc-channels.ts`.
3. **Main**:
   - valida el remitente y la entrada con Zod (`common/ipc-schemas.ts`);
   - envía `POST /v1/analyses` al backend con un identificador de instalación aleatorio en memoria y la versión de la app;
   - aplica un tiempo límite por intento de `PROVIDER_TIMEOUT_SECONDS + 15` segundos.
4. **Backend**:
   - valida tamaño, límites de ráfaga y la petición;
   - llama a la IA con salida estructurada;
   - devuelve el resultado sin guardarlo.
5. **Main** valida la respuesta con el contrato de `shared` y **verifica cada cita contra el texto original** (`verifyClauses`):
   - descarta las que no aparecen;
   - reintenta una vez si se descarta más del 30 %;
   - valida la salida antes de enviarla al renderer.
6. **Renderer** muestra "Lo esencial", contadores, perfiles, filtro y tarjetas con el texto original verificado. Las etapas de progreso son reales y los avisos informan de descartes, baja confiabilidad y análisis recortados.

## Capas

- `apps/frontend/src/main/modules/analysis` y `apps/backend/src/modules/analysis` usan `domain`, `application` e `infrastructure`. El resto del código no las necesita.
- La composición de dependencias es manual: `composition-root.ts` en cada app.
- Lo que cruza entre procesos de Electron vive en `apps/frontend/src/common/`.

## Seguridad y privacidad

- Ventana con `contextIsolation`, `sandbox`, sin `nodeIntegration`, sin navegación externa ni permisos, y CSP de producción sin `unsafe-*`.
- El contenido de la IA y de los documentos se muestra siempre como texto; una regla de ESLint prohíbe insertar HTML.
- La clave de la IA solo existe en los secretos de Cloudflare. La dirección del backend llega por variable de entorno, no por archivos versionados.
- Ni el backend ni la app guardan el documento.

## Compilación y distribución

- `npm run dev -w @risklex/frontend`: desarrollo. Opcionalmente, resultado de prueba sin red con `MAIN_VITE_RISKLEX_FIXTURE=sample`.
- `npm run build` / `preview`: compilación de producción. El simulador no se incluye, y una prueba lo comprueba compilando.
- `npm run dist:mac`: compilación `release` con la dirección del backend obligatoria y `.dmg` firmado ad hoc solo para Apple Silicon, en `apps/frontend/release/`.
- Pendiente: instaladores de Windows y Linux mediante CI (`docs/tasks.md`).
