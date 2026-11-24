# Decisiones pendientes

## Supuestos de la fuente v2

Transcripción de la sección de decisiones pendientes. Conservan su condición de supuestos.

Puntos aún no definidos. Cada uno indica el supuesto con el que se trabaja hasta decidir.

Editar una propuesta con rúbricas ya aprobadas: supuesto, las aprobaciones se mantienen y el profesor puede revisar el cambio y modificar su decisión, incluso pasándola a OBSERVADA, mientras el proyecto no inicie.
Líder del equipo: supuesto, es quien crea la propuesta y debe cumplir las mismas reglas de integrante, incluido el curso en común.
Llega la fecha de inicio sin confirmación del líder: supuesto, el proyecto permanece en PENDIENTE_INICIO hasta que confirme.
Ajuste de fechas: supuesto, el profesor puede modificar las de su rúbrica hasta que el proyecto pase a EN_EJECUCION; después queda por definir.
Visibilidad del feedback: supuesto, visible para el equipo y todos los profesores del proyecto, incluidas las observaciones.
Propuesta RECHAZADA: supuesto, el equipo debe crear una nueva propuesta, que puede dirigirse otra vez a la misma rúbrica.
Corrección tras el cierre del plazo de recepción: supuesto, el equipo puede corregir y reenviar una propuesta OBSERVADA hasta la fecha de caducidad, aunque el plazo de recepción ya esté cerrado.
Fecha de caducidad: supuesto, el sistema externo entrega una sola fecha por periodo académico, aplicable a todas las propuestas.
Importancia de las fechas: supuesto, CRITICA para el límite de subida de notas, la caducidad y el plazo de recepción; IMPORTANTE para los entregables y las fechas de inicio y fin de rúbrica; INFORMATIVA para extensiones y avisos. Los colores concretos se definen en el diseño.
Competencias: supuesto, cada rúbrica tiene al menos una; el equipo sustenta y el profesor verifica; no se exige que se cumplan todas para aprobar, es decisión del profesor.
Eliminar una rúbrica: supuesto, solo puede eliminarse si no tiene propuestas enviadas, y se eliminan sus competencias con ella.
Entregables: supuesto, cada profesor registra los de su rúbrica con su fecha al aprobar la propuesta, dentro del rango de fechas de su rúbrica.
Carrera de las rúbricas: supuesto, el equipo puede dirigirse a rúbricas de cursos de cualquier carrera mientras los integrantes cumplan las reglas de curso en común.
Diseño de Seguimiento del proyecto: supuesto, usa el diseño del sistema académico del ISUR para ambos roles.
Asistente de IA: supuesto, lo usan solo los alumnos y recibe únicamente los datos de cursos y rúbricas necesarios para sugerir, sin notas.
Alumno en varios equipos o propuestas a la vez: sin definir.
Notificaciones: forman parte del MVP con funcionalidad básica dentro de la aplicación. La anticipación de los avisos, los destinatarios adicionales y el canal final quedan por definir.


## Decisiones técnicas del paso 1

- UUID nativo en PostgreSQL, serializado como texto. Los futuros servicios generarán los UUID.
- Fechas civiles DATE, auditoría TIMESTAMPTZ en UTC y reloj PHP real con America/Lima configurable.
- Propuesta.version y propuesta_rubrica.version_revisada permiten identificar aprobaciones de versiones anteriores. Los servicios deberán actualizar con versión esperada y registrar historial en la misma transacción. El historial conserva snapshots de cada cambio, autor y versión.
- Calendario derivado al consultar. La clave de deduplicación de notificaciones identificará evento, fecha y tipo de aviso. La anticipación permanece abierta.
- Las asignaciones profesor–curso no están en el JSON. No se infieren de las rúbricas. El flujo siguiente requerirá un fixture externo acordado o un conector.
- Un equipo pertenece a una propuesta. No hay unicidad global de alumno entre equipos.
- La eliminación de vínculos de borradores y sus verificaciones deberá hacerse explícitamente desde el servicio al eliminar una rúbrica elegible. Las FK conservan los vínculos existentes.
- Los entregables al aprobar antes del nacimiento del proyecto pueden conservarse en el historial de aprobación y materializarse al crear el proyecto. Se debe implementar esa operación atómicamente en el flujo posterior.

## Discrepancias y asuntos que afectan próximos pasos

La v2 reemplaza la reapertura de rechazos de la versión anterior por el reenvío de observaciones. RECHAZADA y CADUCADA permanecen terminales. La demo fusiona la representación visual de propuesta y proyecto, mientras SQL conserva entidades separadas. La demo utiliza localStorage, reloj fijo y recordatorios de tres días, que no constituyen persistencia ni reglas del servidor.

La revocación de aprobaciones cuando existe un proyecto pendiente y quedan menos de dos requiere decisión antes de implementar esa transición. No se ha automatizado su eliminación ni cancelación.

Las restricciones de transiciones, mínimo de rúbricas, cobertura, líder integrante, terminalidad, edición de rúbricas recibidas y permisos se implementarán en servicios del siguiente paso. El esquema admite borradores incompletos.

Se leyó el material extraído en la carpeta hermana mvp academico. El extractor 7z disponible no pudo abrir el RAR v5. Las instrucciones del paso 1 se aplicaron dentro del alcance solicitado por el usuario y la v2 se utilizó como autoridad de negocio.

## Paso 2

- Cualquier profesor de la sesión puede crear rúbricas en un curso existente. El JSON externo sigue sin proporcionar asignaciones docente–curso. Se necesita ese dato antes de imponer la restricción RN-13 anterior. El selector presenta nombre y rol, sin atribuir cursos dictados.
- Se aplica el supuesto v2 de al menos una competencia y eliminación solo sin propuestas enviadas. Al eliminar con borradores, se bloquean sus filas, se archivan el vínculo y sus verificaciones en historial y se retiran sus referencias activas. Se conservan el borrador, su contenido y equipo, incluso si queda sin rúbricas. La versión del borrador aumenta. La confirmación explica este efecto. Cualquier relación definitiva que impida retirarlo produce 409 y revierte todo.
- Una competencia con el mismo texto conserva su ID al reordenarse. Un texto nuevo obtiene otro ID según el contrato de texto del frontend. Reemplazar una competencia con sustento de borrador vinculado devuelve 409. Cambiar el título, curso, criterios o plazo sigue permitido mientras no existan propuestas enviadas.
- `rubricas.version` permite detectar formularios obsoletos. Las escrituras bloquean la fila de rúbrica y guardan historial con estado anterior y posterior en la misma transacción. Al implementar envío de propuestas se deberá bloquear esa misma fila antes de comprobar disponibilidad y registrar el vínculo, para coordinarse con edición y eliminación concurrentes.
- Los plazos civiles de recepción incluyen el día indicado. La caducidad externa cierra nuevas propuestas desde el propio día de caducidad. El catálogo se calcula con el reloj real de PHP en America/Lima.
- La raíz usa HTTP y PostgreSQL. `demo.php` abre explícitamente el simulador completo con localStorage y reloj de demostración. El cambio de identidad del módulo real usa sesión PHP, POST y CSRF. El selector solo está habilitado en development.
- «Preparar propuesta» conserva la selección en memoria y explica que el envío se conectará en el paso 3. Recargar o cambiar de identidad reinicia la selección. La navegación conserva las vistas entregadas y señala las funciones pendientes del módulo real.
