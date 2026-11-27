SELECT pg_advisory_xact_lock(784262);

CREATE TABLE estados_propuesta (
    id smallint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    codigo text NOT NULL UNIQUE
);
INSERT INTO estados_propuesta(codigo) VALUES
    ('BORRADOR'), ('ENVIADA'), ('EN_REVISION'), ('APROBADA'), ('RECHAZADA');

CREATE TABLE decisiones_rubrica (
    id smallint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    codigo text NOT NULL UNIQUE
);
INSERT INTO decisiones_rubrica(codigo) VALUES
    ('PENDIENTE'), ('APROBADA'), ('OBSERVADA'), ('RECHAZADA'), ('CADUCADA');

CREATE TABLE estados_proyecto (
    id smallint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    codigo text NOT NULL UNIQUE
);
INSERT INTO estados_proyecto(codigo) VALUES
    ('PENDIENTE_INICIO'), ('EN_EJECUCION'), ('EN_EVALUACION'), ('FINALIZADO'), ('CANCELADO');

ALTER TABLE propuestas ADD COLUMN estado_id smallint REFERENCES estados_propuesta(id);
ALTER TABLE propuesta_rubrica ADD COLUMN decision_id smallint REFERENCES decisiones_rubrica(id);
ALTER TABLE proyectos ADD COLUMN estado_id smallint REFERENCES estados_proyecto(id);

UPDATE propuestas p SET estado_id=e.id FROM estados_propuesta e WHERE e.codigo=p.estado;
UPDATE propuesta_rubrica pr SET decision_id=d.id FROM decisiones_rubrica d WHERE d.codigo=pr.decision;
UPDATE proyectos p SET estado_id=e.id FROM estados_proyecto e WHERE e.codigo=p.estado;

DO $$
BEGIN
    IF EXISTS(SELECT 1 FROM propuestas WHERE estado_id IS NULL)
        OR EXISTS(SELECT 1 FROM propuesta_rubrica WHERE decision_id IS NULL)
        OR EXISTS(SELECT 1 FROM proyectos WHERE estado_id IS NULL) THEN
        RAISE EXCEPTION 'Hay estados desconocidos. La migración se revierte sin eliminar datos.';
    END IF;
END;
$$;

ALTER TABLE propuestas ALTER COLUMN estado_id SET NOT NULL;
ALTER TABLE propuesta_rubrica ALTER COLUMN decision_id SET NOT NULL;
ALTER TABLE proyectos ALTER COLUMN estado_id SET NOT NULL;
ALTER TABLE propuestas DROP COLUMN estado;
ALTER TABLE propuesta_rubrica DROP COLUMN decision;
ALTER TABLE proyectos DROP COLUMN estado;

CREATE INDEX propuestas_estado ON propuestas(estado_id);
CREATE INDEX propuesta_rubrica_revision ON propuesta_rubrica(rubrica_id,decision_id);
CREATE INDEX proyectos_estado ON proyectos(estado_id);

-- Mantiene las restricciones de decisión al obtener el código desde el catálogo.
CREATE FUNCTION validar_decision_rubrica() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE codigo_decision text;
BEGIN
    SELECT codigo INTO codigo_decision FROM decisiones_rubrica WHERE id=NEW.decision_id;
    IF codigo_decision IN ('OBSERVADA','RECHAZADA') AND length(btrim(coalesce(NEW.feedback,'')))=0 THEN
        RAISE EXCEPTION 'La decisión requiere feedback.' USING ERRCODE='23514';
    END IF;
    IF codigo_decision='CADUCADA' AND length(btrim(coalesce(NEW.motivo_caducidad,'')))=0 THEN
        RAISE EXCEPTION 'La caducidad requiere motivo.' USING ERRCODE='23514';
    END IF;
    IF codigo_decision='APROBADA' AND (NEW.inicio IS NULL OR NEW.fin IS NULL) THEN
        RAISE EXCEPTION 'La aprobación requiere fechas.' USING ERRCODE='23514';
    END IF;
    RETURN NEW;
END;
$$;
CREATE TRIGGER propuesta_rubrica_validar_decision
    BEFORE INSERT OR UPDATE ON propuesta_rubrica
    FOR EACH ROW EXECUTE FUNCTION validar_decision_rubrica();

CREATE TABLE carreras (
    id text PRIMARY KEY,
    nombre text NOT NULL UNIQUE
);
CREATE TABLE personas (
    id text PRIMARY KEY,
    nombre text NOT NULL,
    tipo text NOT NULL CHECK(tipo IN ('alumno','profesor')),
    correo text NOT NULL UNIQUE CHECK(correo=lower(correo) AND correo LIKE '%@isur.edu.pe')
);
CREATE TABLE alumnos (
    persona_id text PRIMARY KEY REFERENCES personas(id),
    carrera_id text NOT NULL REFERENCES carreras(id),
    ciclo smallint NOT NULL CHECK(ciclo > 0)
);
CREATE TABLE docentes (
    persona_id text PRIMARY KEY REFERENCES personas(id)
);
CREATE TABLE cursos (
    id text PRIMARY KEY,
    nombre text NOT NULL,
    carrera_id text NOT NULL REFERENCES carreras(id),
    ciclo smallint NOT NULL CHECK(ciclo > 0)
);
CREATE TABLE periodos_academicos (
    id text PRIMARY KEY,
    inicio date NOT NULL,
    caducidad date NOT NULL,
    limite_notas date NOT NULL,
    CHECK(inicio < caducidad AND caducidad <= limite_notas)
);
CREATE TABLE matriculas (
    alumno_id text NOT NULL REFERENCES alumnos(persona_id),
    curso_id text NOT NULL REFERENCES cursos(id),
    periodo_id text NOT NULL REFERENCES periodos_academicos(id),
    PRIMARY KEY(alumno_id,curso_id,periodo_id)
);
CREATE INDEX matriculas_periodo ON matriculas(periodo_id,alumno_id);
CREATE TABLE docencia_curso (
    docente_id text NOT NULL REFERENCES docentes(persona_id),
    curso_id text NOT NULL REFERENCES cursos(id),
    periodo_id text NOT NULL REFERENCES periodos_academicos(id),
    PRIMARY KEY(docente_id,curso_id,periodo_id)
);
CREATE TABLE accesos (
    persona_id text PRIMARY KEY REFERENCES personas(id),
    password_hash text NOT NULL,
    solo_desarrollo boolean NOT NULL DEFAULT true,
    activo boolean NOT NULL DEFAULT true
);
