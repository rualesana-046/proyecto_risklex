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

| ID    | Tarea                                                                          | Requisitos    | Estado    |
| ----- | ------------------------------------------------------------------------------ | ------------- | --------- |
| B3-01 | Ingesta de URL con protecciones de red                                         | R03, R04      | pendiente |
| B3-02 | Ingesta de PDF con límites, fuera del hilo principal                           | R02, R04      | pendiente |
| B3-03 | Historial en SQLite con caché por huella                                       | R11           | pendiente |
| B3-04 | Persistencia de ajustes: idioma, tema, tamaño de texto e identificador anónimo | R13           | pendiente |
| B3-05 | Cliente de análisis, IPC validado y consentimiento                             | R06, R19, R21 | pendiente |

### Tiempos límite del análisis

- `PROVIDER_TIMEOUT_SECONDS` (backend) se mantiene en **120 s, provisional**, hasta medir un documento grande. Las latencias medidas con documentos de unos 2.200 caracteres (21 a 32 s) no representan uno de 150.000.
- El reintento por baja confiabilidad lo hace el cliente, no el backend. Por eso el tiempo límite del cliente **por intento** debe ser al menos `PROVIDER_TIMEOUT_SECONDS + 15 s`, y el reintento es una petición aparte con su propio tiempo límite. Sustituye a la regla anterior del plan, que pedía `2 × PROVIDER_TIMEOUT_SECONDS + 15 s` porque suponía que el backend reintentaba.

## B4 Interfaz

| ID    | Tarea                                                                                   | Requisitos    | Estado    |
| ----- | --------------------------------------------------------------------------------------- | ------------- | --------- |
| B4-01 | Pantalla Analizar completa, con progreso por etapas y ejemplo grabado                   | R02, R03, R20 | pendiente |
| B4-02 | Pantalla Resultados: perfiles, "Lo esencial", filtros, tarjetas, glosario y aviso legal | R07–R10, R15  | pendiente |
| B4-03 | Pantallas Historial y Ajustes completas                                                 | R11, R13, R19 | pendiente |
| B4-04 | Bienvenida animada, con pausa, opción de saltar y opción de volver a verla              | R14           | pendiente |
| B4-05 | Errores humanos con siguiente paso y revisión de accesibilidad                          | R20, R25      | pendiente |

## Hito 1: app de escritorio mínima

Estado: **completo en su versión mínima** (2026-11-15).

La app de escritorio permite pegar el texto de unos términos, aceptar el aviso de privacidad, seguir el progreso real y leer los resultados con citas verificadas en el propio equipo.

Evidencia:

- Llamada real desde la app (`npm run dev`, URL de producción en `.env.local`, texto de ejemplo, una sola pulsación): funcionó sin reintento visible.
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

## Hitos siguientes

| Hito   | Contenido                                                                                                                                                             | Prioridad | Motivo                                                                                            |
| ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ------------------------------------------------------------------------------------------------- |
| Hito 3 | Instaladores de Windows y Linux generados por CI (GitHub Actions con macOS, Windows y Ubuntu; `--publish never`; dirección del backend como variable del repositorio) | alta      | Soporte multiplataforma: la aplicación debe poder instalarse en Windows y Linux, además de macOS. |
| Hito 4 | Análisis desde PDF y desde dirección web                                                                                                                              | media     | Requisito del producto aplazado en el Hito 1.                                                     |
| Hito 5 | Historial local, ajustes persistentes (incluido el consentimiento) e idiomas                                                                                          | media     | Requisitos del producto; cambia los textos TR-03 y TR-04.                                         |

## Retoques de diseño pendientes

Observaciones de la revisión visual del 2026-11-15. Quedan registradas y se aplican en los retoques finales, no antes.

| ID    | Observación                                                                                                                                        | Estado    |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| DR-01 | El contorno del elemento activo de la barra lateral se ve tosco. Cambiar el doble anillo por un anillo de foco de 2 px con separación hacia fuera. | pendiente |
| DR-02 | Botones de la barra lateral algo más pequeños y sutiles, sin bajar de 44 px de alto y sin quitar el foco visible.                                  | pendiente |

## Retoques de texto pendientes

Observaciones de la revisión manual de la pantalla Analizar. Quedan registradas y se aplican antes de publicar una versión estable.

| ID    | Observación                                                                                                                                                                                                         | Estado    |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| TR-01 | Nombrar al proveedor de IA (Anthropic) en el diálogo de privacidad.                                                                                                                                                 | pendiente |
| TR-02 | Mencionar en el diálogo de privacidad que también se envían un identificador aleatorio de la instalación y la versión de la app, sin datos personales.                                                              | pendiente |
| TR-03 | La frase "RiskLex no guarda el documento ni el resultado" dejará de ser exacta cuando exista el historial local. Cambiarla a "RiskLex no guarda copias en sus servidores".                                          | pendiente |
| TR-04 | La frase "Te lo volveremos a preguntar la próxima vez que abras RiskLex" cambia cuando se persista el consentimiento.                                                                                               | pendiente |
| TR-05 | Mensaje de `configuration_missing` para la persona usuaria: "Esta copia de RiskLex no está bien instalada. Descarga el instalador de nuevo". La instrucción del README queda solo para quien desarrolla.            | pendiente |
| TR-06 | Volver a comprobar la política de retención del proveedor en su fuente oficial antes de publicar una versión estable.                                                                                               | pendiente |
| TR-07 | Unificar el registro de tratamiento: la interfaz usa "tú" y las explicaciones de la IA usan "usted". Decisión de producto pendiente; afecta al prompt y exigiría subir `PROMPT_VERSION` y repetir una comprobación. | pendiente |
| TR-08 | La cláusula de cambios en los términos se clasifica como Costos ocultos aunque no es un costo. Afecta al prompt y a las categorías.                                                                                 | pendiente |

## B5 Cierre

| ID    | Tarea                                                                           | Requisitos | Estado    |
| ----- | ------------------------------------------------------------------------------- | ---------- | --------- |
| B5-01 | Integración, regresión y evaluación documentada de la IA                        | R05, R06   | pendiente |
| B5-02 | Empaquetado con electron-builder e icono de la aplicación                       | R22        | pendiente |
| B5-03 | CI en Ubuntu, Windows y macOS                                                   | R26        | pendiente |
| B5-04 | Publicación en GitHub Releases e instalación limpia verificada en Mac y Windows | R22, R23   | pendiente |
| B5-05 | Documentación final, `npm audit` y revisión de licencias                        | R26        | pendiente |

## Decisiones tomadas

| Tema                                  | Decisión                    | Motivo                 | Consecuencias                                                                                                                                                                                        |
| ------------------------------------- | --------------------------- | ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Visibilidad del repositorio en GitHub | El repositorio será público | Requisito del proyecto | Todo el historial de Git, incluidos los autores de los commits, será visible. Los ejecutores estándar de GitHub Actions son gratuitos en repositorios públicos. Ningún secreto entra al repositorio. |

## Decisiones pendientes

| Tema                  | Cuándo                | Estado    |
| --------------------- | --------------------- | --------- |
| Licencia del proyecto | B5, antes de publicar | pendiente |
