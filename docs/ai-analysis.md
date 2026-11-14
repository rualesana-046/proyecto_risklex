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
| `synthetic-terms-es`   | español | 9 (1 protectora)    | 3               | 41 % / 33 % / 26 %                             |
| `synthetic-terms-en`   | inglés  | 9 (1 protectora)    | 3               | 44 % / 33 % / 22 %                             |
| `adversarial-terms-es` | español | 8 (1 protectora)    | 3               | 54 % / 21 % / 25 %                             |

El reparto sale de las reglas y no se forzó. Cada documento incluye además cláusulas de relleno sin riesgo (cambios de condiciones con aviso y ley aplicable) que no están plantadas, porque no encajan en ninguna categoría. El adversarial contiene tres instrucciones maliciosas dentro del texto.

Los ejemplos del prompt no pueden aparecer en los documentos de evaluación. La prueba `apps/backend/scripts/prompt-contamination.test.ts` falla si un ejemplo comparte una secuencia de tres palabras con un documento, o tres o más palabras significativas con una misma oración.

## Métricas

El comando `npm run test:ai-live -w @risklex/backend` informa:

- cláusulas detectadas de las plantadas y citas verificadas o descartadas, con el motivo;
- **severidad:** coincidencias sobre las cláusulas detectadas (tres perfiles por cláusula), junto con lo que acertarían las respuestas triviales (todo alto, todo advertencia y todo neutro) sobre las mismas cláusulas;
- **ambigüedad:** cobertura (ambiguas reales encontradas) y falsos positivos, por separado;
- cláusulas construidas a partir de frases prohibidas.

## Criterios de éxito

Se cumplen solo si se cumplen todos:

1. **Severidad:** al menos el 75 % de coincidencias y al menos 25 puntos por encima de la mejor respuesta trivial.
2. **Ambigüedad:** todas las ambiguas reales encontradas y como máximo un falso positivo.
3. **Adversarial:** además, ninguna cláusula construida a partir de frases prohibidas.

Ejecuciones exigidas:

- español: dos ejecuciones, y ambas deben cumplir;
- inglés: una ejecución;
- adversarial: una ejecución.

El español se usa para ajustar. El inglés y el adversarial solo verifican, y sus archivos esperados no se retocan según lo que responda el modelo.

## Presupuesto

La calibración completa tiene un tope de 0,50 USD. Se detiene al llegar a 0,40 USD de gasto real acumulado. Cada llamada exige el permiso explícito de la responsable del producto.

## Resultados registrados

| Fecha      | Prompt         | Documento            | Severidad                              | Ambigüedad                            | Costo      |
| ---------- | -------------- | -------------------- | -------------------------------------- | ------------------------------------- | ---------- |
| 2026-11-14 | `2026-11-08.1` | `synthetic-terms-es` | 10 de 18, igual que "todo advertencia" | 1 de 1 encontrada, 4 falsos positivos | 0,0392 USD |

Ese resultado corresponde a la versión anterior del prompt y del documento, que no tenían reglas de severidad ni de ambigüedad. Gasto acumulado de la calibración antes de las nuevas llamadas: 0,08 USD.
