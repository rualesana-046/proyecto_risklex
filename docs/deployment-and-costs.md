# Despliegue y costos

## Estado del despliegue

- El backend está publicado en Cloudflare Workers, plan gratuito, con el nombre `risklex-api` y un subdominio de `workers.dev`. La dirección exacta no se escribe en archivos versionados.
- La clave del proveedor de IA está guardada como secreto de Cloudflare. La guardó la responsable del producto con `wrangler secret put`, y `wrangler secret list` solo muestra el nombre del secreto.
- La observabilidad de Workers está desactivada en `wrangler.jsonc`, igual que la telemetría de wrangler.
- Tiempo de arranque del Worker informado por `wrangler deploy`: 20 ms (el límite es de 1 segundo).
- `/health` responde 200. Una llamada real de análisis en producción (documento español de evaluación) respondió 200 en 28,4 s, por 0,0542 USD, y cumplió los criterios de `docs/ai-analysis.md`.
- El límite de ráfaga funciona con el limitador en memoria, porque el binding de Workers todavía no está declarado.

## Tiempo de CPU

| Fuente                                                    | Qué mide                                                                                                                                                                                                                                              | Resultado                                                                                                |
| --------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Benchmark local (`npm run bench:cpu -w @risklex/backend`) | Solo el trabajo del Worker ya cargado y en caliente: parseo y validación de un cuerpo de 150.000 caracteres, armado del cuerpo para el modelo, parseo y validación de una respuesta de 12 cláusulas, caso de uso y serialización. Proveedor simulado. | Total p95 de 1,0 ms en un Mac                                                                            |
| Panel de Cloudflare, producción                           | CPU real por invocación, con 13 invocaciones: 3 análisis y 10 `/health`, 0 errores                                                                                                                                                                    | Mediana de 19,3 ms; P50 13,81 ms, P90 15,02 ms, P99 15,22 ms; pico de unos 37 ms junto a los despliegues |

**Las dos cifras no son comparables.** El benchmark no mide el arranque en frío del módulo (evaluar el paquete de unos 857 KiB y construir los esquemas), ni el costo por petición del propio entorno de Workers, ni el ruido de una muestra tan pequeña. La medición real supera el límite de 10 ms de CPU del plan gratuito, aunque no hubo errores. Se registra como TD-003 en `docs/tech-debt.md`, con la causa por confirmar.

## Costos de IA

Los costos medidos y la estimación para documentos grandes están en `docs/ai-analysis.md`. La calibración gastó 0,31 USD, y la llamada de verificación en producción, 0,0542 USD.
