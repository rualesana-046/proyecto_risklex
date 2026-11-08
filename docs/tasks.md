# Tareas

Estados posibles: **pendiente**, **en curso**, **bloqueada**, **en revisión** y **completada**. Una tarea solo pasa a completada cuando cumple la definición de terminado de `AGENTS.md`.

## B1 Cimientos

Una tarea marcada como completada indica en la columna Entrega los commits que la contienen. Si no hay commit, la tarea no está completada.

| ID    | Tarea                                                                                          | Requisitos | Estado     | Entrega           |
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

## B4 Interfaz

| ID    | Tarea                                                                                   | Requisitos    | Estado    |
| ----- | --------------------------------------------------------------------------------------- | ------------- | --------- |
| B4-01 | Pantalla Analizar completa, con progreso por etapas y ejemplo grabado                   | R02, R03, R20 | pendiente |
| B4-02 | Pantalla Resultados: perfiles, "Lo esencial", filtros, tarjetas, glosario y aviso legal | R07–R10, R15  | pendiente |
| B4-03 | Pantallas Historial y Ajustes completas                                                 | R11, R13, R19 | pendiente |
| B4-04 | Bienvenida animada, con pausa, opción de saltar y opción de volver a verla              | R14           | pendiente |
| B4-05 | Errores humanos con siguiente paso y revisión de accesibilidad                          | R20, R25      | pendiente |

## B5 Cierre

| ID    | Tarea                                                                           | Requisitos | Estado    |
| ----- | ------------------------------------------------------------------------------- | ---------- | --------- |
| B5-01 | Integración, regresión y evaluación documentada de la IA                        | R05, R06   | pendiente |
| B5-02 | Empaquetado con electron-builder e icono de la aplicación                       | R22        | pendiente |
| B5-03 | CI en Ubuntu, Windows y macOS                                                   | R26        | pendiente |
| B5-04 | Publicación en GitHub Releases e instalación limpia verificada en Mac y Windows | R22, R23   | pendiente |
| B5-05 | Documentación final, `npm audit` y revisión de licencias                        | R26        | pendiente |

## Decisiones tomadas

| Tema                                  | Decisión                    | Motivo                | Consecuencias                                                                                                                                                                                        |
| ------------------------------------- | --------------------------- | --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Visibilidad del repositorio en GitHub | El repositorio será público | Exigencia del docente | Todo el historial de Git, incluidos los autores de los commits, será visible. Los ejecutores estándar de GitHub Actions son gratuitos en repositorios públicos. Ningún secreto entra al repositorio. |

## Decisiones pendientes

| Tema                  | Cuándo                | Estado    |
| --------------------- | --------------------- | --------- |
| Licencia del proyecto | B5, antes de publicar | pendiente |
