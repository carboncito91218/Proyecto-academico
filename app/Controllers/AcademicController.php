<?php
declare(strict_types = 1);
namespace App\Controllers;
use App\Models\AcademicProvider;
use App\Models\RuleViolation;
use App\Services\CurrentUser;
use App\Services\RubricService;
use App\Services\ProposalService;
use App\Models\{ProposalRepository, RubricRepository, Transaction};
final class AcademicController
{
    public function __construct(private array $config, private AcademicProvider $academic, private \PDO $pdo) {}
    public function handle(string $method, array $query, array $input, array &$session, string $csrf): array
    {
        $operation = $query['op'] ?? '';
        $users = new CurrentUser($this->academic,$this->pdo,$this->config['environment']);
        if ($method === 'POST' && !hash_equals($session['csrf'], $csrf)) {
            throw new RuleViolation('CSRF inválido. Recarga la página.',403);
        }
        if ($method === 'POST' && $operation === 'login') return $users->login($input,$session);
        $actor = $users->resolve($session);
        if ($method === 'GET' && $operation === 'session') return $this->sessionInfo($session);
        if ($method === 'POST' && $operation === 'logout') {
            $users->logout($session);
            return ['ok'=>true];
        }
        if ($operation === 'profile') throw new RuleViolation('Operación no disponible.',404);
        $pdo = $this->pdo;
        $service = new RubricService($pdo, $this->academic);
        $proposals = new ProposalService($pdo, $this->academic);
        $proposals->expire();
        if ($method === 'POST' && $operation === 'candidates') {
            $candidates = $proposals->candidates($actor, $input);
            return array_map(fn($s) => ['id' => $s['id'], 'name' => $s['name'], 'program' => $s['program'], 'courses' => $s['courseIds']], $candidates);
        }
        $today = (new \DateTimeImmutable())->format('Y-m-d');
        if ($method === 'GET' && $operation === 'read') return $this->snapshot($pdo, $service, $actor, $today, $session);
        if ($method === 'GET' && $operation === 'detail') {
            if (!is_string($query['id'] ?? null)) throw new RuleViolation('ID inválido.');
            return $service->detail($actor, $query['id'], $today);
        }
        if ($method === 'POST' && $operation === 'saveRubric') {
            $id = $service->save($actor, $input);
            return ['snapshot' => $this->snapshot($pdo, $service, $actor, $today, $session), 'result' => $id];
        }
        if ($method === 'POST') {
            $warnings = [];
            switch ($operation) {
                case 'saveProposal':
                    $saved = $proposals->save($actor, $input);
                    $result = $saved['id'];
                    if ($saved['removed']) $warnings[] = 'Integrantes descartados por matrícula: ' . implode(', ', $saved['removed']);
                    break;
                case 'review':
                    $result = $proposals->review($actor, $input);
                    break;
                case 'projectAction':
                    if (($input['action'] ?? '') !== 'withdraw') throw new RuleViolation('La confirmación y seguimiento se habilitarán en el paso 4.', 409);
                    $result = $proposals->withdraw($actor, $input);
                    break;
                case 'readAlerts':
                    if (!is_array($input['keys'] ?? null)) throw new RuleViolation('Avisos inválidos.');
                    foreach ($input['keys'] as $key) if (!\App\Models\Id::valid($key)) throw new RuleViolation('Aviso inválido.');
                    Transaction::run($pdo, fn() => (new ProposalRepository($pdo))->readAlerts($actor['id'], $input['keys']));
                    $result = null;
                    break;
                default:
                    throw new RuleViolation('Operación no disponible.', 405);
            }
            return ['snapshot' => $this->snapshot($pdo, $service, $actor, $today, $session), 'result' => $result, 'warnings' => $warnings];
        }
        throw new RuleViolation('Método no disponible.', 405);
    }
    private function sessionInfo(array $session): array
    {
        return ['csrf'=>$session['csrf'],'profile'=>$session['person_id']];
    }
    private function snapshot(\PDO $pdo, RubricService $service, array $actor, string $today, array $session): array
    {
        return Transaction::run($pdo, function() use($pdo, $service, $actor, $today, $session) {
            $repository = new ProposalRepository($pdo);
            $proposals = $repository->visible($actor);
            $rubrics = [];
            foreach ($service->list($actor, $today) as $rubric) $rubrics[$rubric['id']] = $rubric;
            $students = $actor['role'] === 'alumno' ? [$actor['id']] : [];
            foreach ($proposals as $proposal) {
                $students = array_merge($students, $proposal['members']);
                foreach ($proposal['relations'] as $link) {
                    $rubric = (new RubricRepository($pdo))->get($link['rubric']);
                    if ($rubric) $rubrics[$rubric['id']] = $rubric;
                }
            }
            $teachers = [];
            foreach (array_unique(array_merge(array_column($rubrics, 'teacher'), $actor['role'] === 'profesor' ? [$actor['id']] : [])) as $id) {
                $person = $this->academic->identity($id);
                $teachers[] = ['id' => $person['id'], 'name' => $person['name']];
            }
            $people = [];
            foreach (array_unique($students) as $id) {
                $student = $this->academic->student($id);
                $people[] = ['id' => $id, 'name' => $student['name'], 'program' => $student['program'], 'courses' => $student['courseIds']];
            }
            return array_merge($this->sessionInfo($session), $repository->alerts($actor['id']), [
                'demo' => false, 'date' => $today, 'periodo' => $this->academic->period(), 
                'students' => $people, 'teachers' => $teachers, 'courses' => $this->academic->courses(), 
                'rubrics' => array_values($rubrics), 'proposals' => $proposals, 
            ]);
        });
    }
}
