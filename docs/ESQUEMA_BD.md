# Esquema PostgreSQL del paso 1

La migración 001_base.sql define el esquema normalizado. Todas las claves internas son UUID estables. Los identificadores externos son texto y se validan mediante AcademicProvider.

| Tablas | Relación y responsabilidad |
| --- | --- |
| rubricas, competencias | Competencias ordenadas pertenecientes a una rúbrica. Curso y profesor externos. |
| equipos, equipo_integrantes | Líder e integrantes externos, sin repetición por equipo. |
| propuestas | Equipo único, contenido de borrador, estado, envío y versión. |
| propuesta_rubrica | Vínculo único, decisión, feedback, observaciones, fechas, versión revisada y retirada. |
| verificaciones_competencia | Sustento y verificación nullable. FK compuestas garantizan la misma rúbrica para vínculo y competencia. |
| proyectos | Propuesta origen única, confirmación del líder, estado y versión. |
| proyecto_rubrica | FK compuestas garantizan el vínculo con la propuesta origen. Cancelación y evaluación independientes. |
| entregables | Fecha y nombre vinculados a una rúbrica del proyecto. |
| historial | Autor, fecha, versión, acción y snapshot JSONB por entidad. Complementa las tablas normalizadas. |
| notificaciones, notificacion_destinatarios | Origen, referencia, clave única de deduplicación y lectura por destinatario. |
| schema_migrations | Nombre, SHA-256 y fecha de aplicación. |

Las restricciones CHECK limitan estados, resultados, observaciones 0–2, feedback obligatorio y motivo de caducidad. Las aprobaciones exigen fechas y fin mayor o igual al inicio. Las FK impiden borrar rúbricas vinculadas. Solo competencias sin referencias se eliminan en cascada con su rúbrica.

Los índices cubren profesor, curso/plazo, rúbrica/decisión, entregables por fecha, historial por entidad/versión y avisos por usuario/lectura. Las PK y UNIQUE crean índices adicionales.

El calendario se derivará de fechas internas y externas. No hay tabla de captura manual. Las validaciones de transición quedan en los futuros servicios, con transacciones y control optimista por versión. El historial debe escribirse junto con cada cambio, conservando versiones previas. Los estados temporales deberán recalcularse al consultar.

El migrador inspecciona public con la cuenta configurada, toma un bloqueo transaccional y registra cada migración. Si hay tablas sin registro, se detiene para adaptación incremental. Todas las migraciones pendientes se ejecutan en una transacción. Una segunda ejecución omite las ya aplicadas y verifica su checksum.

## Evolución del paso 2

`002_rubrica_version.sql` añade `rubricas.version` con valor inicial 1 para datos anteriores. El esquema previo se conserva. El repositorio traduce los nombres SQL al contrato del frontend y consulta contenido, competencias y recepción de propuestas en una misma sentencia. Las mutaciones usan consultas preparadas, bloqueo de fila y transacción para cabecera, competencias e historial.

La presencia de una propuesta con `enviada_at` o estado distinto de BORRADOR bloquea el contenido de su rúbrica, incluso cuando el vínculo esté retirado. Las FK protegen cualquier vínculo existente al eliminar. La eliminación archiva los vínculos y sustentos de borradores antes de retirarlos, incrementa la versión de la propuesta y conserva su contenido y equipo. Cualquier referencia definitiva incompatible produce 409 y revierte la operación. No hay cambios de fuente para las fechas externas, que siguen en el proveedor JSON.
