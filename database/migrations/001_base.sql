CREATE TABLE rubricas (
 id uuid PRIMARY KEY, curso_id text NOT NULL, profesor_id text NOT NULL,
 titulo text NOT NULL, descripcion text NOT NULL, plazo_recepcion date NOT NULL
);
CREATE INDEX rubricas_profesor ON rubricas(profesor_id);
CREATE INDEX rubricas_curso_plazo ON rubricas(curso_id, plazo_recepcion);
CREATE TABLE competencias (
 id uuid PRIMARY KEY, rubrica_id uuid NOT NULL REFERENCES rubricas(id) ON DELETE CASCADE,
 texto text NOT NULL, orden integer NOT NULL CHECK (orden >= 0),
 UNIQUE(id, rubrica_id), UNIQUE(rubrica_id, orden)
);
CREATE TABLE equipos (id uuid PRIMARY KEY, lider_id text NOT NULL);
CREATE TABLE equipo_integrantes (
 equipo_id uuid NOT NULL REFERENCES equipos(id), alumno_id text NOT NULL,
 PRIMARY KEY(equipo_id, alumno_id)
);
CREATE TABLE propuestas (
 id uuid PRIMARY KEY, equipo_id uuid NOT NULL UNIQUE REFERENCES equipos(id),
 titulo text, descripcion text, estado text NOT NULL DEFAULT 'BORRADOR'
 CHECK (estado IN ('BORRADOR','ENVIADA','EN_REVISION','APROBADA','RECHAZADA')),
 enviada_at timestamptz, version integer NOT NULL DEFAULT 1 CHECK(version > 0)
);
CREATE TABLE propuesta_rubrica (
 id uuid PRIMARY KEY, propuesta_id uuid NOT NULL REFERENCES propuestas(id),
 rubrica_id uuid NOT NULL REFERENCES rubricas(id),
 decision text NOT NULL DEFAULT 'PENDIENTE' CHECK(decision IN ('PENDIENTE','APROBADA','OBSERVADA','RECHAZADA','CADUCADA')),
 feedback text, observaciones integer NOT NULL DEFAULT 0 CHECK(observaciones BETWEEN 0 AND 2),
 motivo_caducidad text, inicio date, fin date, retirada_at timestamptz,
 decidida_at timestamptz, version_revisada integer CHECK(version_revisada > 0),
 UNIQUE(propuesta_id,rubrica_id), UNIQUE(id,rubrica_id),
 CHECK(decision NOT IN ('OBSERVADA','RECHAZADA') OR length(btrim(coalesce(feedback,''))) > 0),
 CHECK(decision <> 'CADUCADA' OR length(btrim(coalesce(motivo_caducidad,''))) > 0),
 CHECK(fin >= inicio),
 CHECK(decision <> 'APROBADA' OR (inicio IS NOT NULL AND fin IS NOT NULL))
);
CREATE INDEX propuesta_rubrica_revision ON propuesta_rubrica(rubrica_id,decision);
CREATE TABLE verificaciones_competencia (
 vinculo_id uuid NOT NULL, rubrica_id uuid NOT NULL, competencia_id uuid NOT NULL,
 sustento text, resultado text CHECK(resultado IN ('CUMPLE','NO_CUMPLE')),
 PRIMARY KEY(vinculo_id,competencia_id),
 FOREIGN KEY(vinculo_id,rubrica_id) REFERENCES propuesta_rubrica(id,rubrica_id),
 FOREIGN KEY(competencia_id,rubrica_id) REFERENCES competencias(id,rubrica_id)
);
CREATE TABLE proyectos (
 id uuid PRIMARY KEY, propuesta_id uuid NOT NULL UNIQUE REFERENCES propuestas(id),
 confirmado_at timestamptz, confirmado_por text,
 estado text NOT NULL DEFAULT 'PENDIENTE_INICIO' CHECK(estado IN ('PENDIENTE_INICIO','EN_EJECUCION','EN_EVALUACION','FINALIZADO','CANCELADO')),
 version integer NOT NULL DEFAULT 1 CHECK(version > 0), UNIQUE(id,propuesta_id),
 CHECK((confirmado_at IS NULL) = (confirmado_por IS NULL))
);
CREATE TABLE proyecto_rubrica (
 proyecto_id uuid NOT NULL, propuesta_id uuid NOT NULL, rubrica_id uuid NOT NULL,
 cancelada_at timestamptz, cancelada_por text, evaluada_at timestamptz,
 PRIMARY KEY(proyecto_id,rubrica_id),
 FOREIGN KEY(proyecto_id,propuesta_id) REFERENCES proyectos(id,propuesta_id),
 FOREIGN KEY(propuesta_id,rubrica_id) REFERENCES propuesta_rubrica(propuesta_id,rubrica_id)
);
CREATE TABLE entregables (
 id uuid PRIMARY KEY, proyecto_id uuid NOT NULL, rubrica_id uuid NOT NULL,
 nombre text NOT NULL, fecha date NOT NULL,
 FOREIGN KEY(proyecto_id,rubrica_id) REFERENCES proyecto_rubrica(proyecto_id,rubrica_id)
);
CREATE INDEX entregables_fecha ON entregables(fecha);
CREATE TABLE historial (
 id uuid PRIMARY KEY, entidad text NOT NULL, entidad_id uuid NOT NULL,
 autor_id text NOT NULL, fecha timestamptz NOT NULL DEFAULT now(),
 version integer NOT NULL CHECK(version > 0), accion text NOT NULL,
 datos jsonb NOT NULL
);
CREATE INDEX historial_entidad ON historial(entidad,entidad_id,version);
CREATE TABLE notificaciones (
 id uuid PRIMARY KEY, clave_deduplicacion text NOT NULL UNIQUE,
 origen text NOT NULL CHECK(origen IN ('CALENDARIO','INTERACCION')),
 referencia text NOT NULL, titulo text NOT NULL, detalle text NOT NULL,
 creada_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE notificacion_destinatarios (
 notificacion_id uuid NOT NULL REFERENCES notificaciones(id), usuario_id text NOT NULL,
 leida_at timestamptz, PRIMARY KEY(notificacion_id,usuario_id)
);
CREATE INDEX destinatarios_usuario ON notificacion_destinatarios(usuario_id,leida_at);
