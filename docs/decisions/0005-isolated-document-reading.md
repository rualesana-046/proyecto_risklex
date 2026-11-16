# 0005. Lectura aislada y segura de PDF y enlaces

- Estado: aceptada
- Fecha: 2026-11-16

## Contexto

La app puede leer un PDF elegido por la persona usuaria o descargar una página web. Ambos son contenido no confiable: un PDF puede estar dañado, cifrado o preparado para agotar memoria; un enlace puede apuntar a la red local, a servicios de metadatos de la nube o redirigir hacia ellos. Leer cualquiera de los dos debe ser gratis: solo "Analizar documento" envía algo a la IA.

## Decisión

### Flujo común

- El PDF y el enlace solo rellenan la caja de texto, que sigue siendo editable. Nada se envía hasta pulsar Analizar y aceptar el consentimiento.
- Todo el trabajo con archivos y red ocurre en el proceso main o en un proceso aislado. El renderer recibe el texto, el nombre base del archivo o el dominio del enlace y el número de caracteres; nunca rutas, URL completas ni cuerpos crudos. Ningún mensaje, registro ni línea de estado incluye la URL.
- Si una lectura falla o se cancela, la caja conserva su contenido. Cerrar el diálogo de archivos no muestra ningún mensaje.
- Un texto de más de 150.000 caracteres se rechaza con su longitud y el siguiente paso (pegar solo la parte de términos). Usar los primeros 150.000 queda como mejora pendiente.
- Al backend solo viaja el texto. El diálogo de consentimiento explica que la página se descargó desde el equipo y que el sitio pudo ver la dirección IP; el formulario del enlace lo avisa antes de descargar.

### PDF en un proceso aislado

- unpdf (PDF.js 6.5.438 sin servidor) se ejecuta en un `utilityProcess` de Electron, compilado como entrada propia (`out/main/pdf-text.worker.js`). Ni main ni el renderer cargan PDF.js. El worker carga desde dentro de `app.asar` sin `asarUnpack`.
- Opciones de PDF.js: sin formularios XFA, sin fuentes del sistema ni de la página, `stopAtErrors` y `maxImageSize: 0`. Solo se lee el contenido de texto: no se ejecutan acciones JavaScript ni se abren adjuntos. `isEvalSupported` ya no existe en esta versión.
- Límites: 20 MB (comprobado antes de leer), 300 páginas, 30 s y 512 MB de memoria. Cancelar mata el proceso.
- **Memoria:** Electron acepta `--max-old-space-size` en el `utilityProcess` pero lo ignora; con cualquier valor el proceso llegó a unos 3.848 MB de heap. Por eso main vigila el proceso con `app.getAppMetrics()` cada 100 ms y lo mata al superar 512 MB, con un sobrepaso medido de hasta unos 780 MB. Es una garantía de mejor esfuerzo, complementada con el tiempo límite. Pendiente verificarla en Windows y Linux.

### Enlaces sin falsificación de peticiones (SSRF)

- La descarga ocurre en main con `node:https`, nunca en el renderer ni con la red de Chromium: sin cookies, credenciales, `Referer`, proxy ni caché. `User-Agent: RiskLex/0.1.0 (terms reader; no JavaScript)`.
- Solo https en el puerto 443. Un enlace `http://` o sin esquema se convierte a https y nunca vuelve a http. Se rechazan credenciales en la URL, otros esquemas y otros puertos.
- **IPv4:** se bloquean todos los rangos de uso especial que no son públicos (`0/8`, `10/8`, `100.64/10`, `127/8`, `169.254/16`, `172.16/12`, `192.0.0/24`, `192.0.2/24`, `192.88.99/24`, `192.168/16`, `198.18/15`, `198.51.100/24`, `203.0.113/24`, `224/4`, `240/4` y la difusión). Las formas abreviadas, hexadecimales o decimales se normalizan antes con el `URL` estándar.
- **IPv6, lista blanca:** solo se permite `2000::/3` (unicast global), restando `2001::/23` (asignaciones del IETF, incluidos Teredo, pruebas y ORCHID), `2001:db8::/32`, `2002::/16` (6to4) y `3fff::/20`. Todo lo demás queda bloqueado por defecto. Las direcciones IPv4 dentro de IPv6 (`::ffff:0:0/96` y `64:ff9b::/96`) se validan por su IPv4.
- **DNS rebinding:** se resuelven todas las direcciones del nombre, se exige que todas sean públicas y la conexión se fija a la validada con un `lookup` propio, también cuando Node pide `all: true` por `autoSelectFamily`.
- Redirecciones manuales, como máximo 3, con todas las comprobaciones en cada salto.
- Límites: 10 s para conectar, 20 s en total, 5 MB de HTML o texto y 20 MB si es un PDF, contados en streaming y también tras descomprimir gzip, deflate o brotli.
- Tipos aceptados: HTML, XHTML, texto plano y PDF; un PDF enlazado pasa por el mismo lector aislado con sus límites.
- Errores con mensaje y siguiente paso distintos para 401/403, 404/410, 429, 5xx, tipo no permitido, demasiadas redirecciones, dirección bloqueada, sin conexión y tiempo agotado.

### HTML a texto

- htmlparser2 con su parser por eventos: no construye DOM ni ejecuta nada. Se conservan títulos, párrafos, listas, tablas y citas; se quitan scripts, estilos, navegación, cabeceras, pies, formularios y contenido oculto.
- Charset por orden: cabecera, marca de orden de bytes, `<meta charset>` y UTF-8.
- Una página sin texto útil o que depende de JavaScript recibe un mensaje propio con la alternativa de pegar el texto.

### Pruebas

- Reales: extracción con PDF sintéticos propios, el worker en un `utilityProcess` de Electron, el vigilante de memoria, la política de direcciones, el fetcher contra un servidor HTTP local, HTML de ejemplo y la compilación.
- El resolvedor DNS y el transporte de prueba existen solo en archivos `.test.ts`; una prueba de compilación comprueba que no llegan al paquete. En producción, `composition-root.ts` siempre usa `dns.lookup` y el transporte https fijado.

## Consecuencias

- Un PDF malicioso solo afecta a su proceso aislado, que siempre termina.
- La app no puede usarse para alcanzar la red local ni servicios internos a través de un enlace.
- Las páginas que necesitan JavaScript o inicio de sesión no se pueden leer; la alternativa es pegar el texto.
- En redes que exigen proxy, la lectura de enlaces falla con un mensaje claro.
- Los avisos de licencias de los paquetes empaquetados viajan dentro de la app en `THIRD-PARTY-NOTICES.txt`, generado a partir de una compilación real y comprobado por una prueba.
