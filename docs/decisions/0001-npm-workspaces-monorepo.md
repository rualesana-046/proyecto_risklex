# 0001. Monorepo con npm workspaces y tres paquetes independientes

- Estado: aceptada
- Fecha: 2026-11-07

## Contexto

RiskLex tiene tres partes con ciclos de vida distintos:

- una aplicación de escritorio, que se distribuye con instaladores;
- un backend en la nube, que se despliega por su cuenta;
- los contratos de datos que ambos deben compartir sin desviarse.

El proyecto se desarrolla en macOS y en Windows, con Node 24 y npm 11. No hay presupuesto ni tiempo para herramientas adicionales de gestión de monorepos.

## Decisión

Usar un único repositorio con npm workspaces y tres paquetes independientes:

- `apps/frontend`: la aplicación de escritorio.
- `apps/backend`: la API.
- `packages/shared`: los contratos con Zod y las funciones puras que usan ambas partes, como la verificación de citas.

Cada paquete tiene su propio `package.json`, sus pruebas y su forma de compilar o desplegar. El frontend y el backend nunca se importan entre sí. `packages/shared` no depende de Electron, Node, Hono, React ni de las apps. Estas fronteras las comprueban reglas `no-restricted-imports` de ESLint, que tienen sus propias pruebas.

La configuración común (TypeScript, ESLint, Prettier y Vitest) vive en la raíz. Las versiones quedan fijadas en un único `package-lock.json`.

## Consecuencias

- Un cambio en un contrato de `shared` se detecta en el frontend y en el backend con una sola verificación de tipos.
- Se usan solo herramientas que ya trae npm, sin dependencias adicionales para gestionar el monorepo.
- Un único lockfile simplifica `npm ci` en la integración continua, pero mezcla en el mismo archivo las dependencias de los tres paquetes.
- Las fronteras dependen de la disciplina y de las reglas de ESLint. Un error en esas reglas permitiría importaciones prohibidas, y por eso las reglas tienen pruebas.
