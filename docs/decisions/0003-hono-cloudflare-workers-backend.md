# 0003. Backend con Hono en Cloudflare Workers, plan gratuito

- Estado: aceptada
- Fecha: 2026-11-07

## Contexto

La clave del proveedor de IA no puede viajar dentro de la aplicación de escritorio, así que hace falta un backend propio que la custodie y haga la llamada al modelo.

El backend es pequeño: una ruta de salud y una ruta de análisis. No guarda documentos, no tiene cuentas de usuario ni base de datos, y debe costar lo mínimo posible en un proyecto académico.

Límites del plan gratuito de Cloudflare Workers, verificados en la documentación oficial:

- 100.000 solicitudes al día;
- 10 ms de CPU por solicitud (la espera de red no cuenta);
- 50 subpeticiones por solicitud;
- 128 MB de memoria;
- 1 segundo de arranque.

La función de límite de uso de Workers solo admite periodos de 10 o 60 segundos, y sus conteos son eventualmente consistentes.

## Decisión

- **Hono** como framework HTTP sobre **Cloudflare Workers**, en el plan gratuito, desplegado con wrangler.
- Dos rutas: `GET /health` y `POST /v1/analyses`. La entrada se valida con Zod antes de cualquier trabajo.
- Sin CORS, porque la llamada la hace el proceso principal de Electron y no un navegador.
- Sin almacenamiento configurado y con la observabilidad de Workers desactivada. El registrador solo recibe metadatos: código de error, duración y tamaño.
- La clave del proveedor vive en los secretos de Cloudflare.
- Límites de ráfaga por instalación y por IP con la función de límite de Workers, aceptando que es permisiva y no un contador exacto.

## Consecuencias

- El costo de infraestructura es cero mientras se respeten los límites del plan gratuito.
- Hay que medir la CPU real del flujo completo. Validar con Zod una respuesta grande puede acercarse a los 10 ms. El plan de pago, desde 5 USD al mes, queda como plan B y requiere aprobación.
- Los límites de uso son aproximados. Un cupo diario exacto necesitaría un objeto durable, que queda como opción.
- El backend no conserva nada entre solicitudes, lo que simplifica la privacidad y el despliegue.
