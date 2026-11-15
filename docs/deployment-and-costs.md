# Despliegue y costos

## Estado del despliegue

- El backend está publicado en Cloudflare Workers, plan gratuito, con el nombre `risklex-api` y un subdominio de `workers.dev`. La dirección exacta no se escribe en archivos versionados.
- La clave del proveedor de IA está guardada como secreto de Cloudflare. La guardó la responsable del producto con `wrangler secret put`, y `wrangler secret list` solo muestra el nombre del secreto.
- La observabilidad de Workers está desactivada en `wrangler.jsonc`, igual que la telemetría de wrangler.
- Tiempo de arranque del Worker informado por `wrangler deploy`: 11 ms desde el despliegue del 2026-11-15 (antes 20 ms; el límite es de 1 segundo).
- `/health` responde 200. Una llamada real de análisis en producción (documento español de evaluación) respondió 200 en 28,4 s, por 0,0542 USD, y cumplió los criterios de `docs/ai-analysis.md`.
- El límite de ráfaga funciona con el limitador en memoria, porque el binding de Workers todavía no está declarado.

## Tiempo de CPU

| Fuente                                                    | Qué mide                                                                                                                                                                                                                                              | Resultado                                                                                                |
| --------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Benchmark local (`npm run bench:cpu -w @risklex/backend`) | Solo el trabajo del Worker ya cargado y en caliente: parseo y validación de un cuerpo de 150.000 caracteres, armado del cuerpo para el modelo, parseo y validación de una respuesta de 12 cláusulas, caso de uso y serialización. Proveedor simulado. | Total p95 de 1,0 ms en un Mac                                                                            |
| Panel de Cloudflare, producción                           | CPU real por invocación, con 13 invocaciones: 3 análisis y 10 `/health`, 0 errores                                                                                                                                                                    | Mediana de 19,3 ms; P50 13,81 ms, P90 15,02 ms, P99 15,22 ms; pico de unos 37 ms junto a los despliegues |

### Reducción del arranque (2026-11-15)

Se aplicaron tres cambios, medidos en local antes y después en la misma máquina, con tres ejecuciones de `wrangler check startup` sobre el paquete de `wrangler deploy --dry-run`:

| Estado                                        | Paquete                          | Arranque activo local (3 mediciones) | Arranque en `wrangler deploy` |
| --------------------------------------------- | -------------------------------- | ------------------------------------ | ----------------------------- |
| Antes                                         | 859,3 KiB (142,8 KiB comprimido) | 19,0 a 28,8 ms                       | 20 ms                         |
| Con `minify`                                  | 496,0 KiB                        | 17,6 a 31,5 ms                       | —                             |
| Con el esquema JSON generado fuera del Worker | 496,0 KiB                        | 17,5 a 19,0 ms                       | —                             |
| Con `import * as z from 'zod'`                | 133,0 KiB (42,8 KiB comprimido)  | 16,4 a 17,1 ms                       | 11 ms                         |

El cambio de importación eliminó casi todos los idiomas de Zod (de 364 KiB a 2,7 KiB). Las 303 pruebas siguen pasando. Frente a la mediana medida el mismo día sin cambios (20,2 ms), la mejora del arranque local es de un 19 %, y el rango se volvió mucho más estable.

**Medición del panel de Cloudflare tras este despliegue** (versión 465d65b3, 24 h, 25 invocaciones, 2 subpeticiones, 0 errores): tiempo mediano de CPU de **1,49 ms**, frente a 19,3 ms y 37,67 ms con la versión anterior. Hubo un máximo de unos 10 ms justo después del despliegue, probablemente el primer arranque. Con tan pocas ejecuciones los percentiles no son concluyentes. TD-003 queda mitigada y en observación, sin contratar el plan de pago; se revisará de nuevo antes de la presentación.

Tras el despliegue, una llamada de verificación en producción respondió 200 en 33,8 s, por 0,0618 USD. Las severidades coincidieron exactamente con la llamada anterior en producción (85 %, +44 puntos), pero la ambigüedad tuvo 3 falsos positivos. Como el prompt, el esquema y la petición enviada al modelo no cambiaron, se atribuye a la variación del modelo entre ejecuciones, no al despliegue.

**Las dos cifras no son comparables.** El benchmark no mide el arranque en frío del módulo (evaluar el paquete de unos 857 KiB y construir los esquemas), ni el costo por petición del propio entorno de Workers, ni el ruido de una muestra tan pequeña. La medición real supera el límite de 10 ms de CPU del plan gratuito, aunque no hubo errores. Se registra como TD-003 en `docs/tech-debt.md`, con la causa por confirmar.

## Costos de IA

Los costos medidos y la estimación para documentos grandes están en `docs/ai-analysis.md`. La calibración gastó 0,31 USD, y las dos llamadas de verificación en producción, 0,0542 y 0,0618 USD (0,43 USD en total).
