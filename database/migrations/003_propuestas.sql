ALTER TABLE propuestas ADD COLUMN version_contenido integer NOT NULL DEFAULT 1 CHECK(version_contenido > 0);
ALTER TABLE propuesta_rubrica ADD COLUMN entregable_nombre text;
ALTER TABLE propuesta_rubrica ADD COLUMN entregable_fecha date;
ALTER TABLE propuesta_rubrica ADD CONSTRAINT entregable_aprobacion_valido CHECK (
 (entregable_nombre IS NULL AND entregable_fecha IS NULL) OR
 (length(btrim(entregable_nombre)) > 0 AND entregable_fecha IS NOT NULL AND inicio IS NOT NULL AND fin IS NOT NULL AND entregable_fecha BETWEEN inicio AND fin)
);
CREATE INDEX propuestas_estado ON propuestas(estado);
CREATE INDEX integrantes_alumno ON equipo_integrantes(alumno_id,equipo_id);
CREATE INDEX vinculos_propuesta ON propuesta_rubrica(propuesta_id);
CREATE INDEX historial_fecha ON historial(entidad,entidad_id,fecha);
