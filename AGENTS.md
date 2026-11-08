# Guía de trabajo de RiskLex

Este documento reúne las reglas que siguen todas las personas y herramientas que trabajan en el repositorio.

## Producto

RiskLex analiza términos y condiciones y políticas de privacidad con inteligencia artificial y los presenta como una matriz de riesgos y consecuencias en lenguaje simple. No es un abogado ni da asesoría jurídica. No inventa cláusulas ni citas: cada cita se verifica programáticamente contra el texto extraído.

## Reglas de código

- Código, nombres de archivos, carpetas, ramas y mensajes de commit en inglés.
- Ningún comentario en el código, ni código comentado, ni marcas de pendiente. Los pendientes van en `docs/tasks.md` o `docs/tech-debt.md`. La regla local `local/no-comments` y `noInlineConfig` lo hacen cumplir.
- Todo texto visible para la persona usuaria sale de los archivos de traducción `es` y `en`, nunca escrito en los componentes.
- TypeScript estricto, sin `any`, y validación con Zod en cada frontera.
- Funciones de unas 30 a 40 líneas y archivos de hasta unas 200.
- Archivos en `kebab-case` con sufijo de tipo (`analyze-document.use-case.ts`, `clause-card.tsx`), exportaciones nombradas e `index.ts` solo en el límite de cada funcionalidad.
- Sin patrones, capas ni herramientas que no respondan a una necesidad real.

## Arquitectura

- Monorepo con npm workspaces y tres paquetes independientes: `apps/frontend`, `apps/backend` y `packages/shared`.
- El frontend y el backend nunca se importan entre sí. `packages/shared` no importa Electron, Node, Hono, React ni las apps. Las reglas de `tooling/eslint-rules/import-boundaries.js` lo comprueban.
- Capas `domain`, `application`, `infrastructure` y `presentation` solo en los módulos que lo justifican (análisis, ingesta e historial). `domain` no depende de nada y `application` solo de `domain`.
- Composición manual de dependencias en `composition-root.ts`.

## Definición de terminado

Una tarea está terminada solo cuando:

1. Pasan las pruebas relevantes y `npm run validate`.
2. El proyecto arranca y compila.
3. Se cumplen sus criterios de aceptación.
4. Se revisó el diff en busca de secretos y archivos innecesarios.

Una tarea parcial no se marca como terminada. Los atajos inevitables se registran en `docs/tech-debt.md` con causa, impacto, prioridad y solución.

## Aprobaciones

La responsable del producto aprueba de forma explícita, antes de que ocurran:

- cambios de arquitectura o de requisitos;
- dependencias nuevas, con su propósito y su licencia;
- commits, push, merge y releases;
- despliegues y creación de recursos en la nube;
- cualquier gasto y cualquier acción sobre secretos;
- omitir pruebas o recortar alcance.

El silencio no es autorización.

## Secretos

- Nunca se leen, imprimen ni registran claves, `.env` ni `.dev.vars`.
- La clave del proveedor de IA vive solo en `apps/backend/.dev.vars` (local e ignorado por Git) y en los secretos de Cloudflare. No se define como variable de entorno del sistema.
- Nunca se registra el contenido de los documentos analizados.

## Git

- Cada commit es un solo cambio lógico, normalmente de 1 a 6 archivos.
- Un commit nunca mezcla configuración con código funcional ni documentación con código.
- El lockfile va en el commit que añade sus dependencias.
- Los archivos se preparan con rutas explícitas.
- Los mensajes de commit no llevan coautorías, firmas ni marcas de herramientas.
- No se hace push ni se crean repositorios remotos sin autorización.

## Pruebas

- Vitest para pruebas unitarias y de integración.
- Se distingue siempre entre pruebas ejecutadas, pendientes, manuales y simuladas. Un proveedor simulado nunca se presenta como integración real.
- La prueba contra la IA real es un comando aparte, con tope de gasto, fuera de `validate`.

## Documentación

Toda la documentación se escribe en español. Orden de lectura:

1. `README.md`: qué es el proyecto y cómo empezar.
2. `AGENTS.md`: este documento.
3. `docs/tasks.md`: tareas y su estado.
4. `docs/tech-debt.md`: deuda técnica registrada.
5. `docs/decisions/`: registros de decisiones de arquitectura.
6. `docs/design/risklex-prototype.html`: prototipo visual aprobado, solo como referencia.
