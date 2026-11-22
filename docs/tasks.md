# Tareas

Estados posibles: **pendiente**, **en curso**, **bloqueada**, **en revisión** y **completada**. Una tarea solo pasa a completada cuando cumple la definición de terminado de `AGENTS.md`.

## B1 Cimientos

Una tarea marcada como completada indica en la columna Commits los commits que la contienen. Si no hay commit, la tarea no está completada.

| ID    | Tarea                                                                                          | Requisitos | Estado     | Commits           |
| ----- | ---------------------------------------------------------------------------------------------- | ---------- | ---------- | ----------------- |
| B1-01 | Convenciones de editor, finales de línea y archivos ignorados                                  | R26        | completada | 2f09a91           |
| B1-02 | Workspaces de npm, TypeScript estricto y Prettier                                              | R26        | completada | 5b1dfca           |
| B1-03 | Vitest y escáner de comentarios en CSS, HTML y YAML                                            | R26        | completada | b89f762           |
| B1-04 | Regla local de ESLint que prohíbe comentarios                                                  | R26        | completada | 15fc623           |
| B1-05 | ESLint estricto con límites de importación entre paquetes                                      | R26        | completada | 25318ad           |
| B1-06 | Documentación mínima: README, guía de trabajo, tareas, deuda, decisiones 0001–0003 y prototipo | R26        | completada | 431f6f7 a 127559f |
| B1-07 | Paquete `shared` con el contrato de salud, su prueba y su integración en los scripts raíz      | R01        | completada | b3c5b92 a 349f1c3 |
| B1-08 | Configuración de electron-vite, empaquetando `@risklex/shared` dentro del proceso principal    | R21        | pendiente  |                   |
| B1-09 | Proceso principal y seguridad de Electron, con CSP estricta en producción                      | R21        | pendiente  |                   |
| B1-10 | Preload mínimo y tipado                                                                        | R21        | pendiente  |                   |
| B1-11 | Tokens de diseño, estilos, temas y prueba de contraste WCAG AA                                 | R13, R25   | pendiente  |                   |
| B1-12 | i18n en español e inglés con prueba de claves idénticas                                        | R12        | pendiente  |                   |
| B1-13 | Proveedores de tema, tamaño de texto e idioma                                                  | R13        | pendiente  |                   |
| B1-14 | Shell y barra lateral                                                                          | R13, R25   | pendiente  |                   |
| B1-15 | Pantallas mínimas de Analizar, Historial y Ajustes                                             | R07, R11   | pendiente  |                   |

R01 solo está cubierto en parte: falta el contrato del análisis, que corresponde a B2-01.

## B2 IA y backend

| ID    | Tarea                                                                                 | Requisitos         | Estado    |
| ----- | ------------------------------------------------------------------------------------- | ------------------ | --------- |
| B2-01 | Esquemas compartidos del análisis (esquema restringido del modelo y esquema estricto) | R01, R05           | pendiente |
| B2-02 | Verificador de citas como función pura, con sus pruebas                               | R06                | pendiente |
| B2-03 | Módulo de análisis con el puerto `LanguageModel` y el adaptador del proveedor         | R05, R12           | pendiente |
| B2-04 | Rutas `/health` y `/v1/analyses`, límites de uso y registrador solo de metadatos      | R16, R17, R18, R20 | pendiente |
| B2-05 | Prueba de IA real con tope de gasto, y medición de CPU y costo                        | R05                | pendiente |
| B2-06 | Despliegue real y verificación en producción                                          | R16                | pendiente |

## B3 Servicios locales

| ID    | Tarea                                                                             | Requisitos    | Estado     |
| ----- | --------------------------------------------------------------------------------- | ------------- | ---------- |
| B3-01 | Ingesta de URL con protecciones de red                                            | R03, R04      | pendiente  |
| B3-02 | Ingesta de PDF con límites, fuera del hilo principal                              | R02, R04      | pendiente  |
| B3-03 | Historial local en JSON validado (ADR 0007); la caché por huella queda como MP-03 | R11           | completada |
| B3-04 | Persistencia de ajustes: idioma, tema, tamaño de texto e identificador anónimo    | R13           | completada |
| B3-05 | Cliente de análisis, IPC validado y consentimiento                                | R06, R19, R21 | pendiente  |

### Tiempos límite del análisis

- `PROVIDER_TIMEOUT_SECONDS` (backend) se mantiene en **120 s, provisional**, hasta medir un documento grande. Las latencias medidas con documentos de unos 2.200 caracteres (21 a 32 s) no representan uno de 150.000.
- El reintento por baja confiabilidad lo hace el cliente, no el backend. Por eso el tiempo límite del cliente **por intento** debe ser al menos `PROVIDER_TIMEOUT_SECONDS + 15 s`, y el reintento es una petición aparte con su propio tiempo límite. Sustituye a la regla anterior del plan, que pedía `2 × PROVIDER_TIMEOUT_SECONDS + 15 s` porque suponía que el backend reintentaba.

## B4 Interfaz

| ID    | Tarea                                                                                   | Requisitos    | Estado     |
| ----- | --------------------------------------------------------------------------------------- | ------------- | ---------- |
| B4-01 | Pantalla Analizar completa, con progreso por etapas y ejemplo grabado                   | R02, R03, R20 | pendiente  |
| B4-02 | Pantalla Resultados: perfiles, "Lo esencial", filtros, tarjetas, glosario y aviso legal | R07–R10, R15  | completada |
| B4-03 | Pantallas Historial y Ajustes completas                                                 | R11, R13, R19 | completada |
| B4-04 | Bienvenida sin cierre automático, con opción de saltar y de volver a verla              | R14           | completada |
| B4-05 | Errores humanos con siguiente paso y revisión de accesibilidad                          | R20, R25      | pendiente  |

## Hito 1: app de escritorio mínima

Estado: **completo en su versión mínima** (2026-11-15).

La app de escritorio permite pegar el texto de unos términos, aceptar el aviso de privacidad, seguir el progreso real y leer los resultados con citas verificadas en el propio equipo.

Evidencia:

- Llamada real desde la app (`npm run dev`, URL de producción en `.env.local`, texto de ejemplo con el botón que se retiró después, una sola pulsación): funcionó sin reintento visible.
- 1 POST de un presupuesto de 5 para el hito, con un gasto de unos 0,05 USD (la consola de Anthropic pasó de 0,43 a 0,48 USD).
- Resultado: 10 tarjetas (2 de alto riesgo, 5 de advertencia y 3 neutras), "Lo esencial" con tres puntos, citas verificadas, cambio de perfil instantáneo y filtro por categoría correcto.
- Verificación manual sin coste de la pantalla Analizar, del consentimiento, de los errores y del modo de resultado de prueba.

No incluye: PDF, URL, historial, ajustes persistentes, bienvenida, glosario, inglés completo ni instaladores.

## Hito 2: instalador de macOS

Estado: **completo** (2026-11-15).

Verificación de la responsable del producto en su Mac, con el `.dmg` generado con su configuración:

- abre sin avisos y el icono se ve bien en el Dock;
- tipografía y temas correctos; ⌥⌘I no abre nada; `codesign --verify` pasa;
- sin red muestra "No pudimos conectar con RiskLex", lo que confirma que el IPC acepta el remitente `file://`;
- `ELECTRON_RENDERER_URL` se ignora;
- llamada real desde la app instalada: funcionó, con 3 puntos en "Lo esencial" y perfiles y filtro correctos. Consumo de 0,48 a 0,54 USD, coherente con **1 POST (inferido por el costo, no confirmado)**. Acumulado: 2 de 5 POST y 0,54 USD en total.

- `npm run dist:mac -w @risklex/frontend` genera un `.dmg` solo para macOS con Apple Silicon, firmado ad hoc y sin notarización, en `apps/frontend/release/` (ignorada por Git).
- Evidencia del empaquetado de comprobación, hecho con la dirección de ejemplo:
  - `codesign --verify --deep --strict` pasa y la firma es ad hoc del paquete completo, sin entorno endurecido;
  - `app.asar` solo contiene `out/**` y `package.json`, con las fuentes y sin `node_modules`;
  - el `.dmg` pesa unos 114 MB.
- Descargas de electron-builder, solo desde GitHub Releases: Electron 45.3.2 darwin-arm64 y `dmgbuild` con checksum fijado.
- Cerrada TD-004. Registrada TD-005 (alertas de `npm audit` heredadas de `minimatch`).
- No incluye: firma de Developer ID, notarización, Mac con Intel, Windows ni Linux.

## Hito 3: leer PDF y enlaces

Estado: **listo para la verificación con llamadas reales** (2026-11-16). Se cerrará con un análisis real desde un PDF y otro desde un enlace, cada uno autorizado por la responsable del producto (tope de 3 POST).

- "Elegir un PDF…" y "Leer un enlace" rellenan la caja de texto sin enviar nada; solo "Analizar documento" envía el texto, tras el consentimiento.
- PDF en un proceso aislado con límites de tamaño, páginas, tiempo y memoria; enlaces con protección contra peticiones a redes privadas, DNS fijado, redirecciones revalidadas y límites en streaming (ADR 0005).
- Verificación manual hecha: PDF normal y protegido, caja conservada ante errores, lectura de un enlace real (unos 51.000 caracteres, sin enviar nada a la IA) y mensaje "No pudimos conectar con esa página" sin red.
- Licencias de terceros en `apps/frontend/THIRD-PARTY-NOTICES.txt`, dentro del paquete.
- Llamada real con un PDF desde la aplicación instalada: PDF sintético de 2.221 caracteres, 10 tarjetas, sin avisos de citas descartadas y un coste de unos 0,06 USD. Pendiente: la llamada real con un enlace.
- Cuenta de POST pagados: 1 de 3 en el Hito 3 y 3 de 5 en el proyecto.

## Hito 4: instaladores de Windows y Linux con GitHub Actions

Estado: **completo** (2026-11-21), salvo la verificación manual del instalador de Windows y la apertura del AppImage en un escritorio Linux.

- El flujo `.github/workflows/ci.yml` valida en macOS 15, Windows y Ubuntu 26.04, y genera el `.dmg` arm64, el instalador NSIS x64 y el AppImage x64 (ADR 0006).
- Cada paquete supera una prueba de humo: el lector de PDF dentro del `app.asar` lee cuatro PDF sintéticos con el resultado esperado.
- Primera ejecución en verde de los seis trabajos (`validate` y `package` en los tres sistemas): ejecución 44930410296, tras el commit c3550ef.
- Fallos de CI corregidos, cada uno con un solo intento fallido: imagen `macos-14` retirada, rutas de Windows en una prueba y en los avisos de licencias, identidad de Git en la prueba del script de commits, AppArmor en Ubuntu (causa inferida por contraste) y nombre del ejecutable de Linux.
- Artefactos solo en ejecuciones manuales, con un día de retención. La entrada `backend: real` usa el secreto `RISKLEX_API_URL`, que se creará al generar los instaladores definitivos; no se ha ejecutado.
- Ningún POST pagado en este hito. Acumulado del proyecto: 3 de 5.
- Commits: 1e2e140, 2cd3530, 111501e, b8e9d0d, 91500d4, 8a38a2c, 93d24cc, 1c92a84, f5bb3b3, 2d61746, 0ef4c63, 9dfb226, 99e3ca3, bc60674, bbcf792, c3550ef y e74993b.
- Pendiente: instalar y probar a mano el instalador de Windows con la versión definitiva; abrir el AppImage en un escritorio Linux.

## Hito 5: terminar el frente de la aplicación

Estado: **completo en código y CI**; pendiente la verificación en la app empaquetada y la llamada real en inglés.

- Ajustes guardados en el equipo: idioma, tema, tamaño de texto, bienvenida, historial y consentimiento por versión del texto de privacidad (`CONSENT_VERSION` 2). El identificador de instalación ya no cambia en cada arranque.
- Los ajustes llegan a la ventana antes del primer render; una prueba con Electron real lo comprueba en los tres sistemas.
- Historial local en JSON validado, con tope de 100 entradas, entradas inválidas apartadas y borrado total (ADR 0007). Medido con 100 resultados de 10 cláusulas: de 2,62 a 3,23 MB.
- Glosario en Resultados, bienvenida sin cierre automático, retoques DR-01 a DR-03 y textos TR-01 a TR-05.
- Se retiró el documento de ejemplo incluido en la app, porque viajaba dentro del instalador; una prueba de compilación comprueba que no vuelve. El modo de resultado de prueba se usa pegando el documento sintético de `docs/ai-evaluation/`.
- La dirección real del backend en CI pasa de variable a secreto, porque GitHub muestra los valores de las variables en los registros (ADR 0006).
- `npm run check:push` comprueba el repositorio antes de subir y solo muestra recuentos y nombres de archivo.
- Verificación manual hecha por la responsable del producto en modo de resultado de prueba: rebanadas D y E.
- Ningún POST pagado en este hito. Acumulado del proyecto: 3 de 5.
- Commits: 4b1d18e, ec4cd7b, a5df029, 9a22e47, 874d896, da90dfc, 783a9c7, 97bd6bb, ad82d6b, de2e5bc, 92a7463, 5636ac0, 324a34e, c169582, 3c9be33, 4e1dd00, 1a1442a, f790cc8, b93a9ba, 9008adc, 5fbb128, 3e3fe9f, 83ec6a1, 318ca9c, 2323899, b3d386f, 7b26730, b1863d9, c565b69, 2c07871, 8e4440f, cb14a87, 12e1798, f1f28f6, 5e70444, 389d5d9, c24ce19, 6df1f26, 90f36ff, e4e49a5, d77c8d2 y 5239fc6, más el de esta documentación.
- Pendiente: la verificación en la app empaquetada y una llamada real con un documento en inglés, el historial activado y el glosario a la vista (6 de 8).

## Presupuesto de POST pagados del proyecto

El tope pasa de 5 a 8. Usados: 5 de 8. El límite mensual de gasto de la consola de Anthropic sigue siendo el tope real.

| Nº  | Uso                                                                                                         | Estado    |
| --- | ----------------------------------------------------------------------------------------------------------- | --------- |
| 1–3 | Hitos 1 a 3                                                                                                 | usados    |
| 4   | TR-07, comprobación en español                                                                              | usado     |
| 5   | TR-07, comprobación adversarial                                                                             | usado     |
| 6   | Cierre: instalador de macOS con un documento en inglés, el historial activado y el glosario a la vista      | pendiente |
| 7–8 | Reserva: como máximo una repetición por fallo externo o un ajuste del prompt, siempre con permiso explícito | reserva   |

## Mejoras pendientes

| ID    | Mejora                                                                                                                                                                                                                                                                                                          | Estado    |
| ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| MP-01 | Límite de 150.000 caracteres, opción B: en lugar de rechazar, ofrecer usar los primeros 150.000 caracteres con un aviso persistente en Resultados ("Analizamos solo los primeros 150.000 caracteres del documento").                                                                                            | pendiente |
| MP-02 | Tope de gasto diario en el backend. Hoy solo frenan los límites de ráfaga (3 por minuto por instalación y 5 por IP), y cualquiera con un instalador generado con la dirección real puede consumir saldo. Mientras no exista, el tope real es el límite mensual de gasto configurado en la consola de Anthropic. | pendiente |
| MP-03 | Si el mismo texto ya se analizó en ese idioma, ofrecer ver el análisis guardado antes de gastar una llamada (caché por huella SHA-256).                                                                                                                                                                         | pendiente |
| MP-04 | Idea, sin implementar: que el backend exija un código de acceso que no vaya dentro del instalador, para que un instalador compartido no baste para gastar saldo.                                                                                                                                                | pendiente |

## Hitos siguientes

| Hito   | Contenido                                                                                                                                                      | Prioridad | Motivo                                                |
| ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ----------------------------------------------------- |
| Cierre | Instaladores definitivos con la dirección real, pruebas en Windows y macOS y una llamada real con un documento en inglés y el historial activado (6 de 8 POST) | alta      | Verificar de punta a punta la versión que se entrega. |

## Verificaciones pendientes en otros sistemas

| ID    | Verificación                                                                                                                                                        | Estado                                                                                                        |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| VP-01 | El vigilante de memoria del lector de PDF (`app.getAppMetrics()` cada 100 ms, límite de 512 MB) debe comprobarse en Windows y Linux, igual que en macOS (ADR 0005). | completada: las pruebas con Electron real pasan en Windows y Ubuntu en cada ejecución de CI desde 44927568823 |

## Retoques de diseño pendientes

Observaciones de la revisión visual del 2026-11-15. Quedan registradas y se aplican en los retoques finales, no antes.

| ID    | Observación                                                                                                                                                                                                                                                                    | Estado     |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------- |
| DR-01 | El contorno del elemento activo de la barra lateral se ve tosco. Cambiar el doble anillo por un anillo de foco de 2 px con separación hacia fuera.                                                                                                                             | completada |
| DR-02 | Botones de la barra lateral algo más pequeños y sutiles, sin bajar de 44 px de alto y sin quitar el foco visible.                                                                                                                                                              | completada |
| DR-03 | El aviso de error de la fuente del documento aparece entre los botones "Elegir un PDF…" y "Usar texto de ejemplo". Colocarlo debajo del grupo de botones o junto a la caja de texto. El botón "Usar texto de ejemplo" se retiró después: la app no trae documentos de ejemplo. | completada |
| DR-04 | El escudo de la bienvenida no tiene la animación de trazo del prototipo.                                                                                                                                                                                                       | pendiente  |

## Retoques de texto pendientes

Observaciones de la revisión manual de la pantalla Analizar. Quedan registradas y se aplican antes de publicar una versión estable.

| ID    | Observación                                                                                                                                                                                                                               | Estado     |
| ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| TR-01 | Nombrar al proveedor de IA (Anthropic) en el diálogo de privacidad.                                                                                                                                                                       | completada |
| TR-02 | Mencionar en el diálogo de privacidad que también se envían un identificador aleatorio de la instalación y la versión de la app, sin datos personales.                                                                                    | completada |
| TR-03 | La frase "RiskLex no guarda el documento ni el resultado" dejará de ser exacta cuando exista el historial local. Cambiarla a "RiskLex no guarda copias en sus servidores".                                                                | completada |
| TR-04 | La frase "Te lo volveremos a preguntar la próxima vez que abras RiskLex" cambia cuando se persista el consentimiento.                                                                                                                     | completada |
| TR-05 | Mensaje de `configuration_missing` para la persona usuaria: "Esta copia de RiskLex no está bien instalada. Descarga el instalador de nuevo". La instrucción del README queda solo para quien desarrolla.                                  | completada |
| TR-06 | Volver a comprobar la política de retención del proveedor en su fuente oficial antes de publicar una versión estable.                                                                                                                     | pendiente  |
| TR-07 | Las explicaciones de la IA tratan de "tú", como la interfaz: prompt `2026-11-21.1`, medido en la comprobación real y verificado con una llamada en español y otra adversarial (docs/ai-analysis.md). Backend desplegado con esta versión. | completada |
| TR-08 | La cláusula de cambios en los términos se clasifica como Costos ocultos aunque no es un costo. Afecta al prompt y a las categorías.                                                                                                       | pendiente  |

## B5 Cierre

| ID    | Tarea                                                                           | Requisitos | Estado     |
| ----- | ------------------------------------------------------------------------------- | ---------- | ---------- |
| B5-01 | Integración, regresión y evaluación documentada de la IA                        | R05, R06   | pendiente  |
| B5-02 | Empaquetado con electron-builder e icono de la aplicación                       | R22        | pendiente  |
| B5-03 | CI en Ubuntu, Windows y macOS                                                   | R26        | completada |
| B5-04 | Publicación en GitHub Releases e instalación limpia verificada en Mac y Windows | R22, R23   | pendiente  |
| B5-05 | Documentación final, `npm audit` y revisión de licencias                        | R26        | pendiente  |

## Decisiones tomadas

| Tema                                  | Decisión                    | Motivo                 | Consecuencias                                                                                                                                                                                        |
| ------------------------------------- | --------------------------- | ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Visibilidad del repositorio en GitHub | El repositorio será público | Requisito del proyecto | Todo el historial de Git, incluidos los autores de los commits, será visible. Los ejecutores estándar de GitHub Actions son gratuitos en repositorios públicos. Ningún secreto entra al repositorio. |

## Decisiones pendientes

| Tema                  | Cuándo                | Estado    |
| --------------------- | --------------------- | --------- |
| Licencia del proyecto | B5, antes de publicar | pendiente |
