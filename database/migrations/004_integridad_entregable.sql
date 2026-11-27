ALTER TABLE propuesta_rubrica ADD CONSTRAINT entregable_campos_completos
CHECK ((entregable_nombre IS NULL) = (entregable_fecha IS NULL));
