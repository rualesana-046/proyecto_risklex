# 0006. Integración continua y distribución en macOS, Windows y Linux

- Estado: aceptada
- Fecha: 2026-11-21

## Contexto

El instalador de macOS se generaba a mano en un Mac con Apple Silicon. RiskLex debe instalarse también en Windows y Linux, y cada instalador necesita su propio sistema para compilarse. El repositorio es público, así que todo lo que produzca el flujo puede verlo cualquiera, y un instalador con la dirección real del backend permite gastar saldo de la cuenta de IA.

## Decisión

### Flujo

- Un solo flujo, `.github/workflows/ci.yml`, que se ejecuta en `push` a `main`, en `pull_request` y a mano con `workflow_dispatch`.
- `permissions: contents: read`, ningún secreto salvo el de la dirección real (ver más abajo), `checkout` con `persist-credentials: false`, `concurrency` con cancelación de ejecuciones anteriores y tiempo límite en cada trabajo.
- Acciones fijadas por hash de commit: `actions/checkout` v7.0.1, `actions/setup-node` v7.1.0 y `actions/upload-artifact` v7.0.2.
- Node desde `.nvmrc` y `shell: bash` en todos los pasos, también en Windows (el bash de Git del ejecutor).
- Sistemas: `macos-15` (arm64), `windows-latest` y `ubuntu-latest`. `macos-14` ya no está disponible en GitHub Actions y la primera ejecución falló con `The configuration 'macos-14-arm64-us-default' is not supported`.

### Trabajo `validate`

- `npm ci`, `npx install-electron` y `npm run validate` en los tres sistemas; en Linux, bajo `xvfb-run -a`.
- Las pruebas que arrancan Electron de verdad (lector de PDF en un `utilityProcess` y vigilante de memoria) corren donde exista el binario de Electron. Así VP-01 queda comprobado en cada ejecución en Windows y Linux.
- Las pruebas de `tooling/hygiene` se saltan en Windows: los scripts son herramientas locales de bash para macOS y Linux, y en Windows no hay bash garantizado fuera de Git Bash.

### Trabajo `package`

- Necesita `validate`. Genera el `.dmg` arm64, el instalador NSIS x64 y el AppImage x64 con `--publish never`.
- Después ejecuta `scripts/smoke-packaged-reader.ts`: busca el `app.asar` del paquete y lee con su worker cuatro PDF sintéticos (normal, sin texto, protegido y dañado). Sale con un código distinto de 0 si falta el paquete o si algún resultado no es el esperado.
- Los artefactos solo se suben en ejecuciones manuales, con `retention-days: 1` y fallo si no hay archivo.

### Dirección del backend

- Por defecto, la dirección de ejemplo: los instaladores sirven para probar la instalación, el PDF y los enlaces, pero no pueden gastar.
- La entrada `backend: real` de `workflow_dispatch` usa el secreto del repositorio `RISKLEX_API_URL`. Solo la puede lanzar quien tenga permiso de escritura.
- **Secreto y no variable:** la cabecera de cada paso del registro muestra su bloque `env:` con los valores, y GitHub solo oculta los secretos. Una variable habría mostrado la dirección en todas las ejecuciones. El secreto no es una credencial: solo se usa para que GitHub oculte el valor, también después de escribirlo en `GITHUB_ENV`. Protege los registros, no el instalador, que sigue llevando la dirección dentro. Una vez guardado, GitHub no permite leerlo.
- El secreto solo entra en el paso cuando `backend` es `real` (`inputs.backend == 'real' && secrets.RISKLEX_API_URL || ''`); en `push` y `pull_request` vale una cadena vacía.
- La elección entre la dirección real y la de ejemplo se hace en bash, para que un secreto vacío nunca se sustituya en silencio por la de ejemplo. Un secreto vacío llega vacío al modo `release`, que falla con su mensaje fijo. Una dirección con saltos de línea se rechaza antes de escribirla en `GITHUB_ENV`.
- Revisado que nada más imprime la dirección: el mensaje del modo `release` es fijo, la configuración de electron-vite no registra nada, los archivos de diagnóstico de electron-builder quedan en `release/` sin subirse y el nombre del artefacto solo lleva el modo.
- El flujo nunca imprime la dirección; solo `Backend: example` o `Backend: real`. El nombre del artefacto lleva el modo.

### Linux

- `ubuntu-latest` ya es Ubuntu 26.04, que restringe los espacios de nombres de usuario sin privilegios con AppArmor. En la primera ejecución Electron no devolvía nada en Linux. Un paso del flujo pone `apparmor_restrict_unprivileged_userns` a 0 solo en la máquina de CI, que se descarta al terminar. Imprime el valor antes y después, el `ls -l` de `chrome-sandbox` y la versión del sistema.
- **La causa se infirió por contraste, no por un mensaje de error:** la primera ejecución no guardaba la salida de errores de Electron. En la segunda, el paso imprimió `before: 1` y `after: 0`, `chrome-sandbox` no tenía el bit SUID (`-rwxr-xr-x runner runner`) y las pruebas de Electron pasaron. Desde entonces, si Electron no devuelve resultado, las pruebas muestran su código de salida y las últimas 30 líneas de su salida de errores.
- Nunca se desactiva el sandbox de la app ni se usa `--no-sandbox`, ni en el flujo ni en el producto.
- `linux.executableName: risklex`: en Linux, electron-builder toma el nombre del ejecutable del nombre del paquete (`@risklex/frontend`) y no de `productName`, y el AppImage rechaza la `@`.

### Windows

- Las rutas de los avisos de licencias se escriben siempre con `/` y el texto se normaliza a LF, para que `THIRD-PARTY-NOTICES.txt` sea idéntico en los tres sistemas. Si difiere, la comprobación dice la línea exacta.
- Sin certificado, electron-builder no firma; SmartScreen puede avisar al ejecutar el instalador.

## Consecuencias

- Cada cambio en `main` demuestra que el proyecto valida y empaqueta en los tres sistemas, sin coste en un repositorio público.
- La ejecución con Electron real depende de la etiqueta móvil `ubuntu-latest`; un cambio de imagen puede exigir revisar el paso de AppArmor.
- El AppImage se compila y supera la prueba de humo, pero no se ha abierto en un escritorio Linux. El instalador de Windows se verifica a mano.
- Un artefacto generado con `real` puede descargarlo cualquiera durante su día de vida; hay que borrarlo tras descargarlo. No existe un tope de gasto diario en el backend: queda como mejora pendiente.
- Fuera de alcance: firma de código, notarización, publicación en GitHub Releases, actualizaciones automáticas y arm64 en Windows y Linux.
