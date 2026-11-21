# 0007. Almacenamiento local: ajustes e historial en JSON validado

- Estado: aceptada
- Fecha: 2026-11-22

## Contexto

La app debe recordar en el equipo el idioma, el tema, el tamaño de texto, el consentimiento, un identificador de instalación y un historial de análisis. ADR 0002 había elegido SQLite con better-sqlite3 para el historial. Es un módulo nativo: exige recompilarlo para cada versión de Electron y cada sistema, sacarlo del `app.asar` y reactivar la reconstrucción de dependencias, mientras que hoy todo el proceso main se empaqueta con Vite y el paquete no lleva `node_modules` (ADR 0004).

## Decisión

### Sustituye a una parte de ADR 0002

- Se sustituye "SQLite con better-sqlite3 para el historial" por archivos JSON validados con Zod en la carpeta de datos de la app. El resto de ADR 0002 sigue vigente.
- Motivo: el volumen es pequeño (como máximo 100 análisis), no hay consultas ni búsquedas, y así no hay dependencias nuevas, compilación nativa ni riesgo de empaquetado distinto en cada sistema.

### Almacén

- `json-file-store.ts` en main: lee y valida con Zod; escribe de forma atómica (archivo temporal en la misma carpeta y `rename`, con hasta 3 reintentos ante `EPERM`, `EBUSY` o `EACCES`, típicos de antivirus en Windows); pone las escrituras en cola.
- Un archivo dañado o de otra versión se aparta como `<nombre>.corrupt-<milisegundos>.json` y la app arranca con valores por defecto. Nunca se borra sin que la persona lo pida.
- Carpeta: `app.setPath('userData', …)` con el nombre `RiskLex`, o `RiskLex Dev` fuera del paquete, para no mezclar datos de prueba con los reales. Nunca se registra el contenido de los archivos.

### Ajustes (`settings.json`)

- Versión 1 con identificador de instalación, idioma, tema, tamaño de texto, bienvenida vista, historial activado y consentimiento `{ version, acceptedAt }`.
- El identificador se genera una vez y no llega nunca al renderer: el IPC solo devuelve los ajustes públicos y rechaza claves desconocidas o un consentimiento falsificado.
- `CONSENT_VERSION` (hoy 2) sube cada vez que cambia el texto de privacidad, y entonces la app vuelve a preguntar una sola vez.
- Para evitar un destello al arrancar, main pasa los ajustes públicos a la ventana con `additionalArguments`; el preload con sandbox los valida sin Zod y el renderer los aplica antes del primer render. Sin scripts en línea; una prueba con Electron real lo comprueba en los tres sistemas.

### Historial (`history.json`)

- Se guarda el resultado verificado, la fecha, el tipo de origen y el nombre que ya ve el renderer (nombre base del PDF, dominio del enlace o texto pegado), el número de caracteres, el idioma y una huella SHA-256 del texto. Nunca el documento completo, la ruta del archivo ni la dirección completa del enlace.
- El archivo se trata como no confiable: cada entrada se valida al leerla; las inválidas se apartan y se conservan las válidas. Todo su texto se muestra como texto plano.
- Tope de 100 entradas. Medición con 100 resultados sintéticos de 10 cláusulas: 2,62 MB con citas típicas y 3,23 MB con las más largas, en JSON compacto; unos 8 ms al leer y de 5 a 7 ms por guardado. Por eso basta un solo archivo.
- Se guarda tras cada análisis correcto si el historial está activado (lo está por defecto). Un fallo al guardar no oculta el resultado. Desactivarlo no borra nada y ofrece borrar lo existente; "Borrar todo" elimina también los archivos apartados.

### Lo que no hace

- La app no cifra estos archivos: su protección depende del cifrado de disco del sistema.
- La huella SHA-256 permite comprobar si un texto concreto fue analizado, aunque no permite reconstruirlo.

## Consecuencias

- Sin dependencias nuevas y con el mismo empaquetado en los tres sistemas.
- Si el historial creciera mucho o necesitara búsquedas, habría que volver a evaluar SQLite.
- Las citas del documento quedan en el equipo mientras exista la entrada; el diálogo de privacidad, Ajustes y el README lo explican.
