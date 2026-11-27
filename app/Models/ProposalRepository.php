<?php
declare(strict_types = 1);
namespace App\Models;
use PDO;
final class ProposalRepository
{
    public function __construct(private PDO $pdo) {}

    public function query(string $sql, array $parameters = []): \PDOStatement
    {
        $query = $this->pdo->prepare($sql);
        $query->execute($parameters);
        return $query;
    }

    public function get(string $id, bool $lock = false): array
    {
        $row = $this->query('SELECT p.*,ep.codigo AS estado,e.lider_id FROM propuestas p JOIN estados_propuesta ep ON ep.id=p.estado_id JOIN equipos e ON e.id=p.equipo_id WHERE p.id=?' . ($lock ? ' FOR UPDATE OF p' : ''), [$id])->fetch();
        if (!$row) throw new RuleViolation('Propuesta inexistente.', 404);
        $project = $this->query('SELECT p.*,ep.codigo AS estado FROM proyectos p JOIN estados_proyecto ep ON ep.id=p.estado_id WHERE p.propuesta_id=?', [$id])->fetch();
        $proposal = [
            'id' => $row['id'], 'teamId' => $row['equipo_id'], 'leader' => $row['lider_id'], 
            'title' => $row['titulo'] ?? '', 'description' => $row['descripcion'] ?? '', 
            'status' => $row['estado'], 'draft' => $row['estado'] === 'BORRADOR', 
            'sent' => $row['enviada_at'] ? (new \DateTimeImmutable($row['enviada_at']))->setTimezone(new \DateTimeZone(date_default_timezone_get()))->format('Y-m-d') : null, 
            'version' => (int)$row['version'], 'contentVersion' => (int)$row['version_contenido'], 
            'born' => (bool)$project, 'projectId' => $project['id'] ?? null, 
            'projectStatus' => $project['estado'] ?? 'PENDIENTE_INICIO', 
            'confirmed' => $project['confirmado_at'] ?? null, 
            'members' => $this->query('SELECT alumno_id FROM equipo_integrantes WHERE equipo_id=? ORDER BY alumno_id', [$row['equipo_id']])->fetchAll(PDO::FETCH_COLUMN), 
            'relations' => [], 'deliverables' => [], 
        ];
        foreach ($this->query('SELECT pr.*,d.codigo AS decision FROM propuesta_rubrica pr JOIN decisiones_rubrica d ON d.id=pr.decision_id WHERE pr.propuesta_id=? ORDER BY pr.id', [$id])->fetchAll() as $link) {
            $relation = [
                'id' => $link['id'], 'rubric' => $link['rubrica_id'], 'decision' => $link['decision'], 
                'feedback' => $link['feedback'] ?? '', 'observations' => (int)$link['observaciones'], 
                'expiryReason' => $link['motivo_caducidad'], 'start' => $link['inicio'], 'end' => $link['fin'], 
                'delivery' => $link['entregable_nombre'], 'deliveryDate' => $link['entregable_fecha'], 
                'withdrawn' => $link['retirada_at'] !== null, 'reviewedVersion' => $link['version_revisada'] === null ? null : (int)$link['version_revisada'], 
                'evidence' => [], 'verification' => [], 'history' => [], 
            ];
            foreach ($this->query('SELECT * FROM verificaciones_competencia WHERE vinculo_id=?', [$link['id']])->fetchAll() as $evidence) {
                $relation['evidence'][$evidence['competencia_id']] = $evidence['sustento'] ?? '';
                $relation['verification'][$evidence['competencia_id']] = $evidence['resultado'] ?? '';
            }
            foreach ($this->query("SELECT * FROM historial WHERE entidad='propuesta_rubrica' AND entidad_id=? ORDER BY fecha,version,id", [$link['id']])->fetchAll() as $history) {
                $data = json_decode($history['datos'], true, 512, JSON_THROW_ON_ERROR);
                $relation['history'][] = ['label' => $history['accion'], 'date' => (new \DateTimeImmutable($history['fecha']))->setTimezone(new \DateTimeZone(date_default_timezone_get()))->format('Y-m-d'), 'note' => $data['note'] ?? '', 
                    'author' => $history['autor_id'], 'version' => (int)$history['version']];
            }
            $proposal['relations'][] = $relation;
            if ($link['entregable_nombre'] !== null) $proposal['deliverables'][] = [
                'id' => $link['id'], 'rubric' => $link['rubrica_id'], 'title' => $link['entregable_nombre'], 'date' => $link['entregable_fecha'], 
            ];
        }
        return $proposal;
    }

    public function visible(array $actor): array
    {
        if ($actor['role'] === 'profesor') {
            $ids = $this->query("SELECT DISTINCT p.id FROM propuestas p JOIN propuesta_rubrica pr ON pr.propuesta_id=p.id JOIN rubricas r ON r.id=pr.rubrica_id WHERE p.enviada_at IS NOT NULL AND r.profesor_id=? ORDER BY p.id", [$actor['id']]);
        } else {
            $ids = $this->query('SELECT p.id FROM propuestas p JOIN equipo_integrantes i ON i.equipo_id=p.equipo_id WHERE i.alumno_id=? ORDER BY p.id', [$actor['id']]);
        }
        return array_map(fn($id) => $this->get($id), $ids->fetchAll(PDO::FETCH_COLUMN));
    }

    public function members(string $team, array $members): void
    {
        $this->query('DELETE FROM equipo_integrantes WHERE equipo_id=?', [$team]);
        foreach ($members as $id) $this->query('INSERT INTO equipo_integrantes(equipo_id,alumno_id) VALUES (?,?)', [$team, $id]);
    }

    public function create(string $id, string $team, string $leader): void
    {
        $this->query('INSERT INTO equipos(id,lider_id) VALUES (?,?)', [$team, $leader]);
        $this->query("INSERT INTO propuestas(id,equipo_id,estado_id) VALUES (?,?,(SELECT id FROM estados_propuesta WHERE codigo='BORRADOR'))", [$id, $team]);
    }

    public function saveContent(array $proposal, bool $send): void
    {
        $this->query("UPDATE propuestas SET titulo=?,descripcion=?,version=?,version_contenido=?,enviada_at=CASE WHEN ? THEN coalesce(enviada_at,now()) ELSE enviada_at END,estado_id=CASE WHEN ? AND estado_id=(SELECT id FROM estados_propuesta WHERE codigo='BORRADOR') THEN (SELECT id FROM estados_propuesta WHERE codigo='ENVIADA') ELSE estado_id END WHERE id=?", 
            [$proposal['title'], $proposal['description'], $proposal['version'], $proposal['contentVersion'], $send ? 'true' : 'false', $send ? 'true' : 'false', $proposal['id']]);
        $this->members($proposal['teamId'], $proposal['members']);
    }

    public function addLink(string $proposal, string $rubric): string
    {
        $id = Id::new();
        $this->query("INSERT INTO propuesta_rubrica(id,propuesta_id,rubrica_id,decision_id) VALUES (?,?,?,(SELECT id FROM decisiones_rubrica WHERE codigo='PENDIENTE'))", [$id, $proposal, $rubric]);
        return $id;
    }

    public function removeDraftLink(string $id): void
    {
        $this->query('DELETE FROM verificaciones_competencia WHERE vinculo_id=?', [$id]);
        $this->query('DELETE FROM propuesta_rubrica WHERE id=?', [$id]);
    }

    public function evidence(array $link, string $competency, string $text, bool $clear): void
    {
        $this->query('INSERT INTO verificaciones_competencia(vinculo_id,rubrica_id,competencia_id,sustento) VALUES (?,?,?,?) ON CONFLICT(vinculo_id,competencia_id) DO UPDATE SET sustento=EXCLUDED.sustento,resultado=CASE WHEN ? THEN NULL ELSE verificaciones_competencia.resultado END', 
            [$link['id'], $link['rubric'], $competency, $text, $clear ? 'true' : 'false']);
    }

    public function verify(string $link, string $competency, ?string $result): void
    {
        $this->query('UPDATE verificaciones_competencia SET resultado=? WHERE vinculo_id=? AND competencia_id=?', [$result, $link, $competency]);
    }

    public function updateLink(array $link): void
    {
        $this->query('UPDATE propuesta_rubrica SET decision_id=(SELECT id FROM decisiones_rubrica WHERE codigo=?),feedback=?,observaciones=?,motivo_caducidad=?,inicio=?,fin=?,version_revisada=?,decidida_at=now(),entregable_nombre=?,entregable_fecha=? WHERE id=?', 
            [$link['decision'], $link['feedback'], $link['observations'], $link['expiryReason'], $link['start'], $link['end'], $link['reviewedVersion'], $link['delivery'] ?? null, $link['deliveryDate'] ?? null, $link['id']]);
    }

    public function withdraw(string $id): void
    {
        $this->query('UPDATE propuesta_rubrica SET retirada_at=now() WHERE id=?', [$id]);
    }

    public function bump(array &$proposal): void
    {
        $proposal['version']++;
        $this->query('UPDATE propuestas SET version=? WHERE id=?', [$proposal['version'], $proposal['id']]);
    }

    public function recalculate(string $id): void
    {
        $proposal = $this->get($id);
        if ($proposal['draft']) return;
        $active = array_filter($proposal['relations'], fn($r) => !$r['withdrawn']);
        $approved = array_filter($active, fn($r) => $r['decision'] === 'APROBADA');
        $terminal = array_filter($active, fn($r) => in_array($r['decision'], ['RECHAZADA', 'CADUCADA'], true));
        $answered = array_filter($active, fn($r) => $r['decision'] !== 'PENDIENTE' || array_filter($r['history'], fn($h) => in_array($h['label'], ['Corrección reenviada', 'OBSERVADA', 'APROBADA', 'RECHAZADA', 'CADUCADA'], true)));
        $state = $answered ? 'EN_REVISION' : 'ENVIADA';
        if (count($active) - count($terminal) < 2) $state = 'RECHAZADA';
        if (count($approved) >= 2) $state = 'APROBADA';
        $this->query('UPDATE propuestas SET estado_id=(SELECT id FROM estados_propuesta WHERE codigo=?) WHERE id=?', [$state, $id]);
        if (count($approved) < 2) return;
        $this->query("INSERT INTO proyectos(id,propuesta_id,estado_id) VALUES (?,?,(SELECT id FROM estados_proyecto WHERE codigo='PENDIENTE_INICIO')) ON CONFLICT(propuesta_id) DO NOTHING", [Id::new(), $id]);
        $project = $this->query('SELECT id FROM proyectos WHERE propuesta_id=?', [$id])->fetchColumn();
        foreach ($approved as $link) {
            $this->query('INSERT INTO proyecto_rubrica(proyecto_id,propuesta_id,rubrica_id) VALUES (?,?,?) ON CONFLICT DO NOTHING', [$project, $id, $link['rubric']]);
        }
        // Las fechas propuestas antes de la segunda aprobación se materializan al nacer el proyecto.
        foreach ($proposal['relations'] as $link) {
            $this->query('DELETE FROM entregables WHERE proyecto_id=? AND rubrica_id=?', [$project, $link['rubric']]);
            if ($link['decision'] !== 'APROBADA') {
                $this->query('DELETE FROM proyecto_rubrica WHERE proyecto_id=? AND rubrica_id=?', [$project, $link['rubric']]);
            }
        }
        foreach ($proposal['deliverables'] as $delivery) {
            $this->query('INSERT INTO entregables(id,proyecto_id,rubrica_id,nombre,fecha) VALUES (?,?,?,?,?)', 
                [$delivery['id'], $project, $delivery['rubric'], $delivery['title'], $delivery['date']]);
        }
    }

    public function expiredIds(): array
    {
        return $this->query("SELECT DISTINCT p.id FROM propuestas p JOIN propuesta_rubrica pr ON pr.propuesta_id=p.id JOIN decisiones_rubrica d ON d.id=pr.decision_id WHERE p.enviada_at IS NOT NULL AND pr.retirada_at IS NULL AND d.codigo IN ('PENDIENTE','OBSERVADA') ORDER BY p.id")->fetchAll(PDO::FETCH_COLUMN);
    }

    public function readAlerts(string $user, array $ids): void
    {
        foreach ($ids as $id) $this->query('UPDATE notificacion_destinatarios SET leida_at=coalesce(leida_at,now()) WHERE usuario_id=? AND notificacion_id=?', [$user, $id]);
    }

    public function history(array $actor, array $proposal, string $entity, string $id, string $action, array $data): void
    {
        $this->query('INSERT INTO historial(id,entidad,entidad_id,autor_id,version,accion,datos) VALUES (?,?,?,?,?,?,?)', 
            [Id::new(), $entity, $id, $actor['id'], $proposal['version'], $action, json_encode($data, JSON_THROW_ON_ERROR)]);
    }

    public function notice(array $proposal, array $link, string $event, string $title, array $recipients): void
    {
        $key = $event . ':' . $link['id'] . ':' . $proposal['version'];
        if ($event === 'expiry') $key = $event . ':' . $link['id'];
        $id = Id::new();
        $insert = $this->query("INSERT INTO notificaciones(id,clave_deduplicacion,origen,referencia,titulo,detalle) VALUES (?,?,'INTERACCION',?,?,?) ON CONFLICT(clave_deduplicacion) DO NOTHING RETURNING id", 
            [$id, $key, json_encode(['pid' => $proposal['id'], 'rid' => $link['rubric']]), $title, $proposal['title']]);
        if (!$insert->fetchColumn()) return;
        foreach (array_unique($recipients) as $recipient) $this->query('INSERT INTO notificacion_destinatarios(notificacion_id,usuario_id) VALUES (?,?)', [$id, $recipient]);
    }

    public function alerts(string $user): array
    {
        $alerts = [];
        $read = [];
        foreach ($this->query('SELECT n.*,d.leida_at FROM notificaciones n JOIN notificacion_destinatarios d ON d.notificacion_id=n.id WHERE d.usuario_id=? ORDER BY n.creada_at,n.id', [$user])->fetchAll() as $row) {
            $reference = json_decode($row['referencia'], true);
            if (!is_array($reference)) continue;
            $alerts[] = ['key' => $row['id'], 'pid' => $reference['pid'], 'rid' => $reference['rid'], 'title' => $row['titulo'], 'detail' => $row['detalle'], 'to' => [$user]];
            if ($row['leida_at'] !== null) $read[] = $row['id'];
        }
        return ['activity' => $alerts, 'readAlerts' => [$user => $read]];
    }
}
