# 0008. Sin cuentas de usuario

- Estado: aceptada
- Fecha: 2026-11-21

## Contexto

RiskLex ayuda a entender qué se acepta al usar un servicio digital. Pedir un registro con correo y contraseña para usarlo sería pedir justo lo que la app enseña a mirar con cuidado. Aun así, el servicio de RiskLex en internet cuesta dinero en cada análisis y necesita algún freno contra el abuso.

## Decisión

RiskLex no tiene cuentas de usuario: no hay registro, inicio de sesión ni perfiles en el servidor.

### Por qué

- **Menos datos personales:** no se pide nombre, correo ni contraseña, y el servicio en internet no guarda documentos ni resultados.
- **Los datos están en el equipo de la persona:** ajustes, consentimiento e historial viven en su carpeta de datos (ADR 0007), y los borra cuando quiere.
- **Menos superficie de ataque:** no hay una base de personas que proteger, contraseñas que filtrar ni un proceso de recuperación de acceso que suplantar.
- **Uso inmediato:** se instala y se analiza, sin pasos previos.

### Qué sí se envía

- El texto que la persona decide analizar, después de aceptar el aviso de privacidad.
- Un código aleatorio por instalación, que sirve para limitar el abuso, y la versión de la app.
- El servicio ve además la dirección de internet de la conexión, como cualquier servicio en internet.
- Nada de esto incluye nombre ni correo. El proveedor de IA puede conservar los datos hasta 30 días, o más si algún contenido se marca para revisión, como explica el aviso de privacidad.

### Cómo se controla el abuso sin cuentas

- Límites de ráfaga: 3 análisis por minuto por instalación y 5 por minuto por conexión.
- Tamaño máximo del documento (150.000 caracteres) y de la petición.
- La clave de la IA solo existe en el servicio en internet, nunca en el instalador.
- El límite mensual de gasto de la consola de Anthropic es el tope real. Un tope diario en el servicio queda como mejora pendiente (MP-02).

## Consecuencias

- No se puede sincronizar el historial entre equipos.
- No hay cuotas individuales: los límites son por instalación y por conexión, y quien tenga un instalador con la dirección real puede gastar saldo dentro de esos límites.
- Opción simple si hiciera falta más control: un código de acceso exigido por el servicio que no vaya dentro del instalador (MP-04).
- Añadir cuentas completas cambiaría qué datos personales se tratan y exigiría revisar el aviso y la política de privacidad antes de hacerlo.
