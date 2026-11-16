# 0005. Lectura aislada de documentos PDF

- Estado: aceptada
- Fecha: 2026-11-16

## Contexto

Un PDF elegido por la persona usuaria es contenido no confiable: puede estar dañado, cifrado o preparado para agotar memoria o tiempo. Leerlo en el proceso main o en el renderer pondría en riesgo toda la aplicación.

## Decisión

- El texto de los PDF se extrae con unpdf (PDF.js 6.5.438 sin servidor) en un proceso aislado de Electron (`utilityProcess`), compilado como una entrada propia (`out/main/pdf-text.worker.js`). Ni main ni el renderer cargan PDF.js.
- El proceso main elige el archivo con el diálogo nativo, comprueba el tamaño antes de leerlo y envía solo los bytes. El renderer recibe el texto, el nombre base del archivo y el recuento de caracteres, nunca la ruta.
- Opciones de PDF.js: sin formularios XFA, sin fuentes del sistema ni de la página, `stopAtErrors` y `maxImageSize: 0`. Solo se lee el contenido de texto: no se ejecutan acciones JavaScript ni se abren adjuntos. `isEvalSupported` ya no existe en esta versión de PDF.js.
- Límites: 20 MB, 300 páginas, 30 s y 512 MB de memoria. Cerrar el diálogo no muestra ningún mensaje; cancelar la lectura mata el proceso.
- **Memoria:** Electron acepta `--max-old-space-size` en `execArgv` del `utilityProcess`, pero lo ignora. Medido con un proceso que reserva memoria: con 32, 64, 512 u 8.192 MB llegó igual a unos 3.848 MB de heap antes de terminar. Por eso main vigila el proceso con `app.getAppMetrics()` cada 100 ms y lo mata si supera 512 MB. En la medición lo detuvo a unos 780 MB, por el intervalo de muestreo. Es una garantía de mejor esfuerzo, complementada con el tiempo límite de 30 s.
- Una prueba con Electron real comprueba que el worker compilado extrae texto en un `utilityProcess` y que el vigilante detiene un proceso que se excede. En un empaquetado de comprobación, el worker carga desde dentro de `app.asar` sin `asarUnpack`.

## Consecuencias

- Un PDF malicioso solo afecta a su proceso aislado, que siempre termina: con resultado, por tiempo, por memoria o por cancelación.
- El límite de memoria no es exacto: puede sobrepasarse unos cientos de megabytes antes de que el vigilante actúe.
- El vigilante depende de `app.getAppMetrics()` y debe verificarse en Windows y Linux.
