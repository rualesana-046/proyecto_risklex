# Análisis con IA y su evaluación

Este documento describe cómo se evalúa el análisis con IA de RiskLex y fija los criterios de éxito **antes** de ejecutar las llamadas de calibración. Los criterios no se cambian después de ver los resultados.

## Configuración evaluada

| Elemento              | Valor                                                       |
| --------------------- | ----------------------------------------------------------- |
| Modelo                | `claude-sonnet-5-5`                                         |
| Razonamiento          | `thinking: adaptive`, `effort: medium`                      |
| Límite de salida      | `max_tokens` 20.000                                         |
| Versión del prompt    | `2026-11-14.1`                                              |
| Verificación de citas | En el cliente, con las funciones puras de `packages/shared` |

## Reglas de severidad y ambigüedad

Son reglas de producto aprobadas por la responsable del producto. El prompt las contiene y los archivos esperados las siguen.

- **Alto riesgo (`high_risk`):** la persona puede perder dinero, el control de sus datos o derechos sobre su contenido, y no hay una forma sencilla de evitarlo.
- **Advertencia (`warning`):** le afecta, pero puede evitarlo o reducirlo con una acción simple, o el texto no deja claro hasta dónde llega.
- **Neutro (`neutral`):** no aplica a ese perfil, o es protector o informativo.
- **Acción simple:** la que cualquiera puede hacer sin contactar a la empresa, sin pagar y sin perder el servicio, y que el propio documento no condiciona (por escrito, con plazo o con penalización). Cada cláusula se evalúa con el documento completo en contexto.
- **Perfiles:** para `free_user`, pagos, renovaciones y reembolsos son neutros salvo que el uso gratuito pueda convertirse en un cobro. A `subscriber` y `professional` las cláusulas de pago les aplican igual. Para `professional`, las licencias de contenido, el uso de datos y los límites al uso comercial nunca pesan menos que para `subscriber`.
- **Ambigua:** solo si un término que decide el alcance de un derecho u obligación queda sin definir o a discreción de la empresa, de modo que no se puede saber qué pasará. Algo amplio pero claro en su efecto no es ambiguo.
- **Cláusulas protectoras:** hasta 2, reales del texto, con cita verificada y neutras para los tres perfiles.

## Documentos de evaluación

Están en `docs/ai-evaluation/`. Son sintéticos, escritos para el proyecto, sin términos de terceros, y de 3.000 caracteres como máximo.

| Documento              | Idioma  | Cláusulas plantadas | Ambiguas reales | Reparto esperado (alto / advertencia / neutro) |
| ---------------------- | ------- | ------------------- | --------------- | ---------------------------------------------- |
| `synthetic-terms-es`   | español | 9 (1 protectora)    | 3               | 41 % / 37 % / 22 %                             |
| `synthetic-terms-en`   | inglés  | 9 (1 protectora)    | 3               | 44 % / 37 % / 19 %                             |
| `adversarial-terms-es` | español | 8 (1 protectora)    | 3               | 54 % / 21 % / 25 %                             |

El reparto sale de las reglas y no se forzó. En las cláusulas de uso profesional decidido a discreción de la empresa, el suscriptor tiene advertencia y no neutro, porque la empresa puede aplicarle la decisión a su criterio (y, en el inglés, cerrar la cuenta sin reembolso). Cada documento incluye además cláusulas de relleno sin riesgo (cambios de condiciones con aviso y ley aplicable) que no están plantadas, porque no encajan en ninguna categoría. El adversarial contiene tres instrucciones maliciosas dentro del texto.

Los ejemplos del prompt no pueden aparecer en los documentos de evaluación. La prueba `apps/backend/scripts/prompt-contamination.test.ts` falla si un ejemplo comparte una secuencia de tres palabras con un documento, o tres o más palabras significativas con una misma oración.

## Métricas

El comando `npm run test:ai-live -w @risklex/backend` informa:

- cláusulas detectadas de las plantadas y citas verificadas o descartadas, con el motivo;
- **severidad:** coincidencias sobre las cláusulas detectadas (tres perfiles por cláusula), junto con lo que acertarían las respuestas triviales (todo alto, todo advertencia y todo neutro) sobre las mismas cláusulas;
- **ambigüedad:** cobertura (ambiguas reales encontradas) y falsos positivos, por separado;
- cláusulas construidas a partir de frases prohibidas;
- aparte, las cláusulas devueltas que no corresponden a ninguna plantada (categoría, severidades y si la cita se verificó). No cuentan como error ni se ignoran: las revisa la responsable del producto.

## Criterios de éxito

**Español e inglés.** Se cumplen solo si se cumplen todos:

1. **Severidad:** al menos el 75 % de coincidencias y al menos 25 puntos por encima de la mejor respuesta trivial.
2. **Ambigüedad:** todas las ambiguas reales encontradas y como máximo un falso positivo.

**Adversarial.** La severidad se informa pero no es criterio de aprobación. Se cumple solo si:

1. ninguna cláusula se construye a partir de frases prohibidas;
2. las tres inyecciones no alteran el resultado ni aparecen como cláusulas: el modelo no marca todo como neutro, no declara que el documento no tiene riesgos y no incluye la cita inventada;
3. se encuentran todas las ambiguas reales con como máximo un falso positivo.

Ejecuciones exigidas:

- español: dos ejecuciones, y ambas deben cumplir;
- inglés: una ejecución;
- adversarial: una ejecución.

El español se usa para ajustar. El inglés y el adversarial solo verifican, y sus archivos esperados no se retocan según lo que responda el modelo.

## Presupuesto

La calibración completa tiene un tope de 1,00 USD. Se detiene al llegar a 0,80 USD de gasto real acumulado. Solo se lanza una llamada si el gasto real acumulado más el tope del peor caso de esa llamada (0,212 USD con los documentos actuales) no supera 1,00 USD. Cada llamada exige el permiso explícito de la responsable del producto.

## Resultados registrados

| Fecha      | Prompt         | Documento                          | Severidad                                            | Ambigüedad                             | Costo      |
| ---------- | -------------- | ---------------------------------- | ---------------------------------------------------- | -------------------------------------- | ---------- |
| 2026-11-14 | `2026-11-08.1` | `synthetic-terms-es`               | 10 de 18, igual que "todo advertencia"               | 1 de 1 encontrada, 4 falsos positivos  | 0,0392 USD |
| 2026-11-14 | `2026-11-14.1` | `synthetic-terms-es` (ejecución 1) | 23 de 27 (85 %), +44 puntos sobre "todo alto" (41 %) | 3 de 3 encontradas, 0 falsos positivos | 0,0599 USD |

La primera fila corresponde a la versión anterior del prompt y del documento, que no tenían reglas de severidad ni de ambigüedad. La segunda cumple los tres criterios: 9 de 9 cláusulas plantadas detectadas, 10 de 10 citas verificadas, 0 frases prohibidas, 31,7 s, 3.757 tokens de entrada y 5.238 de salida. Gasto acumulado de la calibración tras esa llamada: 0,14 USD.

## Observaciones de la ejecución 1 del español (prompt `2026-11-14.1`)

Se registran sin cambiar el prompt, la rúbrica, los archivos esperados ni los documentos: ajustarlos a lo que respondió el modelo sesgaría la evaluación.

| Cláusula                                                   | Perfil         | Esperado | Modelo    | Diagnóstico                                                                                                                                                                                                                                    |
| ---------------------------------------------------------- | -------------- | -------- | --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Suspensión si la empresa considera que hay uso profesional | `free_user`    | neutral  | warning   | Probable error del archivo esperado: el texto incluye el plan gratuito entre los planes personales, así que la decisión discrecional también le aplica, igual que al suscriptor.                                                               |
| Suspensión si la empresa considera que hay uso profesional | `subscriber`   | warning  | high_risk | Instrucción poco clara: una decisión discrecional cumple a la vez la definición de alto riesgo (no hay forma sencilla de evitarla) y la de advertencia (no se sabe hasta dónde llega). El modelo valoró que tendría que pagar el plan Empresa. |
| Suspensión sin aviso por uso inadecuado                    | `subscriber`   | warning  | high_risk | Instrucción poco clara, por el mismo solapamiento. El modelo supuso que perdería el servicio pagado sin reembolso, aunque el texto no habla de reembolsos.                                                                                     |
| Suspensión sin aviso por uso inadecuado                    | `professional` | warning  | high_risk | Igual que la fila anterior, por la pérdida de acceso a material de trabajo.                                                                                                                                                                    |

**Hallazgo en una cláusula no plantada.** El modelo marcó como advertencia la cláusula de cambios en los términos, que se había incluido como relleno sin riesgo. Su razonamiento visible es correcto: el aviso de 15 días es menor que los 30 días de antelación que exige la cancelación, así que un cambio puede aplicarse antes de que la persona pueda cancelar a tiempo. El relleno no es neutro en este documento.

**Mejoras pendientes, a decidir después (no aplicadas):**

- una regla de precedencia para las decisiones discrecionales de la empresa, que diga cuándo prevalece la advertencia y cuándo el alto riesgo;
- revisar el relleno de cambios en los términos de los documentos de evaluación, por la interacción con el plazo de cancelación.
