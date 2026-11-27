<?php
declare(strict_types=1);
namespace App\Models;
use PDO;
use App\Models\Id;
final class RubricRepository
{
    private const SELECT = "SELECT r.*,
        coalesce((SELECT jsonb_agg(jsonb_build_object('id',c.id,'text',c.texto) ORDER BY c.orden)
            FROM competencias c WHERE c.rubrica_id=r.id),'[]'::jsonb) AS competencies,
        EXISTS(SELECT 1 FROM propuesta_rubrica pr JOIN propuestas p ON p.id=pr.propuesta_id JOIN estados_propuesta ep ON ep.id=p.estado_id
            WHERE pr.rubrica_id=r.id AND (p.enviada_at IS NOT NULL OR ep.codigo <> 'BORRADOR')) AS received
        FROM rubricas r";

    public function __construct(private PDO $pdo) {}

    public function list(array $actor, string $today, string $expiry, ?string $course = null): array
    {
        $params = [];
        if ($actor['role'] === 'profesor') {
            $where = 'r.profesor_id = ?';
            $params[] = $actor['id'];
        } else {
            $where = 'r.plazo_recepcion >= ? AND CAST(? AS date) < CAST(? AS date)';
            $params = [$today, $today, $expiry];
        }
        if ($course !== null) {
            $where .= ' AND r.curso_id = ?';
            $params[] = $course;
        }
        $q = $this->pdo->prepare(self::SELECT . ' WHERE ' . $where . ' ORDER BY r.titulo, r.id');
        $q->execute($params);
        return array_map($this->normalize(...), $q->fetchAll());
    }

    public function get(string $id, bool $lock = false): ?array
    {
        if ($lock) {
            // Consulta separada para leer vínculos con un snapshot posterior a cualquier espera por el bloqueo.
            $q = $this->pdo->prepare('SELECT id FROM rubricas WHERE id=? FOR UPDATE');
            $q->execute([$id]);
        }
        $q = $this->pdo->prepare(self::SELECT . ' WHERE r.id = ?');
        $q->execute([$id]);
        $row = $q->fetch();
        return $row ? $this->normalize($row) : null;
    }

    private function normalize(array $row): array
    {
        $competencies = json_decode($row['competencies'],true,512,JSON_THROW_ON_ERROR);
        return [
            'id' => $row['id'], 'teacher' => $row['profesor_id'], 'course' => $row['curso_id'],
            'title' => $row['titulo'], 'criteria' => $row['descripcion'], 'deadline' => $row['plazo_recepcion'],
            'competencies' => array_column($competencies, 'text'), 'competencyIds' => array_column($competencies, 'id'),
            'received' => (bool)$row['received'], 'version' => (int)$row['version'],
        ];
    }

    public function save(array $rubric, bool $create): void
    {
        if ($create) {
            $q = $this->pdo->prepare('INSERT INTO rubricas(id,profesor_id,curso_id,titulo,descripcion,plazo_recepcion,version) VALUES (?,?,?,?,?,?,?)');
            $q->execute([$rubric['id'],$rubric['teacher'],$rubric['course'],$rubric['title'],$rubric['criteria'],$rubric['deadline'],$rubric['version']]);
        } else {
            $q = $this->pdo->prepare('UPDATE rubricas SET curso_id=?,titulo=?,descripcion=?,plazo_recepcion=?,version=? WHERE id=?');
            $q->execute([$rubric['course'],$rubric['title'],$rubric['criteria'],$rubric['deadline'],$rubric['version'],$rubric['id']]);
        }
        // Reordenar conserva IDs y evita colisiones temporales de UNIQUE(rubrica_id,orden).
        $q = $this->pdo->prepare('UPDATE competencias SET orden=orden+(SELECT coalesce(max(orden),0)+1 FROM competencias WHERE rubrica_id=?) WHERE rubrica_id=?');
        $q->execute([$rubric['id'],$rubric['id']]);
        $q = $this->pdo->prepare('DELETE FROM competencias WHERE rubrica_id=? AND id NOT IN (SELECT jsonb_array_elements_text(CAST(? AS jsonb))::uuid)');
        $q->execute([$rubric['id'],json_encode($rubric['competencyIds'])]);
        $q = $this->pdo->prepare('INSERT INTO competencias(id,rubrica_id,texto,orden) VALUES (?,?,?,?) ON CONFLICT(id) DO UPDATE SET texto=EXCLUDED.texto,orden=EXCLUDED.orden');
        foreach ($rubric['competencies'] as $order => $text) {
            $q->execute([$rubric['competencyIds'][$order],$rubric['id'],$text,$order]);
        }
    }

    public function detachDrafts(array $rubric, array $actor): void
    {
        $q = $this->pdo->prepare('SELECT p.*,ep.codigo AS estado FROM propuestas p JOIN estados_propuesta ep ON ep.id=p.estado_id JOIN propuesta_rubrica pr ON pr.propuesta_id=p.id WHERE pr.rubrica_id=? ORDER BY p.id FOR UPDATE OF p,pr');
        $q->execute([$rubric['id']]);
        foreach ($q->fetchAll() as $proposal) {
            if ($proposal['enviada_at'] !== null || $proposal['estado'] !== 'BORRADOR') {
                throw new \App\Models\RuleViolation('La rúbrica recibió una propuesta enviada y no puede eliminarse.',409);
            }
            $link = $this->pdo->prepare('SELECT pr.*,d.codigo AS decision FROM propuesta_rubrica pr JOIN decisiones_rubrica d ON d.id=pr.decision_id WHERE propuesta_id=? AND rubrica_id=?');
            $link->execute([$proposal['id'],$rubric['id']]);
            $relation = $link->fetch();
            $evidence = $this->pdo->prepare('SELECT * FROM verificaciones_competencia WHERE vinculo_id=?');
            $evidence->execute([$relation['id']]);
            $history = $this->pdo->prepare("INSERT INTO historial(id,entidad,entidad_id,autor_id,version,accion,datos) VALUES (?,'propuesta',?,?,?,'RUBRICA_ELIMINADA',?)");
            $history->execute([Id::new(),$proposal['id'],$actor['id'],(int)$proposal['version']+1,
                json_encode(['before'=>$proposal,'rubrica'=>$rubric,'vinculo'=>$relation,'verificaciones'=>$evidence->fetchAll()],JSON_THROW_ON_ERROR)]);
            $remove = $this->pdo->prepare('DELETE FROM verificaciones_competencia WHERE vinculo_id=?');
            $remove->execute([$relation['id']]);
            $remove = $this->pdo->prepare('DELETE FROM propuesta_rubrica WHERE id=?');
            $remove->execute([$relation['id']]);
            $update = $this->pdo->prepare('UPDATE propuestas SET version=version+1 WHERE id=?');
            $update->execute([$proposal['id']]);
        }
    }

    public function delete(string $id): void
    {
        $q = $this->pdo->prepare('DELETE FROM rubricas WHERE id=?');
        $q->execute([$id]);
    }

    public function record(array $actor, array $rubric, string $action, ?array $before): void
    {
        $q = $this->pdo->prepare("INSERT INTO historial(id,entidad,entidad_id,autor_id,version,accion,datos) VALUES (?,'rubrica',?,?,?,?,?)");
        $q->execute([Id::new(),$rubric['id'],$actor['id'],$rubric['version'],$action,json_encode(['before'=>$before,'after'=>$action === 'ELIMINADA' ? null : $rubric], JSON_THROW_ON_ERROR)]);
    }
}
