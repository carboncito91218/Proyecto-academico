<?php
declare(strict_types=1);
namespace App\Services;
use App\Models\AcademicProvider;
use App\Models\Id;
use App\Models\RuleViolation;
use App\Models\RubricRepository;
use PDO;
use PDOException;
final class RubricService
{
    private RubricRepository $repository;
    public function __construct(private PDO $pdo, private AcademicProvider $academic)
    {
        $this->repository = new RubricRepository($pdo);
    }
    public function list(array $actor, string $today, ?string $course = null): array
    {
        return $this->repository->list($actor, $today, $this->academic->period()['caducidad'], $course);
    }
    public function detail(array $actor, string $id, string $today): array
    {
        if (!Id::valid($id)) throw new RuleViolation('ID de rúbrica inválido.');
        $rubric = $this->repository->get($id);
        if (!$rubric) throw new RuleViolation('Rúbrica inexistente.', 404);
        if ($actor['role'] === 'profesor' && $rubric['teacher'] !== $actor['id']) throw new RuleViolation('Rúbrica ajena a este profesor.', 403);
        if ($actor['role'] === 'alumno' && ($rubric['deadline'] < $today || $today >= $this->academic->period()['caducidad'])) throw new RuleViolation('La rúbrica tiene la recepción cerrada.', 404);
        return $rubric;
    }
    public function save(array $actor, array $input): string
    {
        if ($actor['role'] !== 'profesor') throw new RuleViolation('Solo un profesor puede gestionar rúbricas.', 403);
        $id = $input['id'] ?? null;
        if ($id !== null && !Id::valid($id)) throw new RuleViolation('ID de rúbrica inválido.');
        // Savepoint permite también pruebas revertidas dentro de una transacción externa.
        $nested = $this->pdo->inTransaction();
        if ($nested) $this->pdo->exec('SAVEPOINT rubric_save');
        else $this->pdo->beginTransaction();
        try {
            $this->pdo->exec('SELECT pg_advisory_xact_lock(784262)');
            $before = $id === null ? null : $this->repository->get($id, true);
            if ($id !== null && !$before) throw new RuleViolation('Rúbrica inexistente.', 404);
            if ($before && $before['teacher'] !== $actor['id']) throw new RuleViolation('Rúbrica ajena a este profesor.', 403);
            if ($before && isset($input['version']) && $input['version'] !== $before['version']) throw new RuleViolation('La rúbrica cambió. Actualiza el catálogo antes de guardar.', 409);
            if (($input['remove'] ?? false) === true) {
                if (!$before) throw new RuleViolation('Indica la rúbrica que deseas eliminar.');
                if ($before['received']) throw new RuleViolation('La rúbrica ya recibió propuestas enviadas y no puede eliminarse.', 409);
                $this->repository->detachDrafts($before,$actor);
                $this->repository->delete($id);
                $deleted = $before;
                $deleted['version']++;
                $this->repository->record($actor,$deleted,'ELIMINADA',$before);
            } else {
                $rubric = $this->validate($input, $before);
                $rubric['id'] = $id ?? Id::new();
                $rubric['teacher'] = $actor['id'];
                $rubric['version'] = ($before['version'] ?? 0) + 1;
                $this->repository->save($rubric, $before === null);
                $this->repository->record($actor,$rubric,$before ? 'ACTUALIZADA' : 'CREADA',$before);
                $id = $rubric['id'];
            }
            if ($nested) $this->pdo->exec('RELEASE SAVEPOINT rubric_save');
            else $this->pdo->commit();
            return $id;
        } catch (\Throwable $e) {
            if ($nested) { $this->pdo->exec('ROLLBACK TO SAVEPOINT rubric_save'); $this->pdo->exec('RELEASE SAVEPOINT rubric_save'); }
            elseif ($this->pdo->inTransaction()) $this->pdo->rollBack();
            if ($e instanceof PDOException && $e->getCode() === '23503') throw new RuleViolation('Hay borradores o referencias vinculadas. Se conservan sus datos. Resuelve esos vínculos antes de eliminar la rúbrica o competencias.',409);
            throw $e;
        }
    }
    private function validate(array $input, ?array $before): array
    {
        $values = [];
        foreach (['title','criteria','course','deadline'] as $key) {
            $value = $input[$key] ?? null;
            if (!is_string($value) || trim($value) === '') throw new RuleViolation('Completa título, criterios, curso y plazo.');
            $values[$key] = trim($value);
        }
        $date = \DateTimeImmutable::createFromFormat('!Y-m-d', $values['deadline']);
        if (!$date || $date->format('Y-m-d') !== $values['deadline']) throw new RuleViolation('Fecha de recepción inválida.');
        if (!in_array($values['course'],array_column($this->academic->courses(),'id'),true)) throw new RuleViolation('Curso externo inexistente.');
        $competencies = $input['competencies'] ?? null;
        if (!is_array($competencies) || !array_is_list($competencies) || !$competencies) throw new RuleViolation('Incluye al menos una competencia.');
        foreach ($competencies as &$text) {
            if (!is_string($text) || trim($text) === '') throw new RuleViolation('Cada competencia debe tener texto.');
            $text = trim($text);
        }
        unset($text);
        $values['competencies'] = $competencies;
        if ($before && $before['received']) {
            foreach (['title','criteria','course','competencies'] as $key) {
                if ($values[$key] !== $before[$key]) throw new RuleViolation('Contenido bloqueado por propuestas enviadas. Solo puedes extender el plazo.',409);
            }
            if ($values['deadline'] <= $before['deadline']) throw new RuleViolation('El nuevo plazo debe ser posterior al vigente.',409);
        }
        // El contrato de texto conserva la identidad de competencias iguales aunque cambie su orden.
        $available = [];
        foreach ($before['competencies'] ?? [] as $order => $text) $available[$text][] = $before['competencyIds'][$order];
        $values['competencyIds'] = [];
        foreach ($competencies as $text) $values['competencyIds'][] = empty($available[$text]) ? Id::new() : array_shift($available[$text]);
        return $values;
    }
}
