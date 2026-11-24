<?php
declare(strict_types=1);
namespace App\Controllers;
use App\Domain\AcademicProvider;
use App\Domain\RuleViolation;
use App\Services\CurrentUser;
use App\Services\RubricService;
use App\Repositories\Connection;
final class RubricController
{
    public function __construct(private array $config, private AcademicProvider $academic) {}
    public function handle(string $method, array $query, array $input, array &$session, string $csrf): array
    {
        $operation = $query['op'] ?? '';
        if ($method === 'GET' && $operation === 'session') return $this->sessionInfo($session);
        $users = new CurrentUser($this->academic);
        if ($method === 'POST') {
            if (!hash_equals($session['csrf'], $csrf)) throw new RuleViolation('CSRF inválido. Recarga la página.',403);
            if ($operation === 'profile') {
                if ($this->config['environment'] !== 'development') throw new RuleViolation('Selector de desarrollo deshabilitado.',403);
                if (!is_string($input['id'] ?? null)) throw new RuleViolation('Identidad inválida.');
                try { $users->select($this->config['environment'],$input['id'],$csrf,$session); }
                catch (\RuntimeException $e) { throw new RuleViolation('Identidad de desarrollo desconocida.'); }
                session_regenerate_id(true);
                return $this->sessionInfo($session);
            }
        }
        try { $actor = $users->resolve($session); }
        catch (\RuntimeException $e) { throw new RuleViolation('Selecciona una identidad de desarrollo para continuar.',401); }
        $service = new RubricService(Connection::open($this->config['database']), $this->academic);
        $today = (new \DateTimeImmutable())->format('Y-m-d');
        if ($method === 'GET' && $operation === 'read') return $this->snapshot($service,$actor,$today,$session);
        if ($method === 'GET' && $operation === 'detail') {
            if (!is_string($query['id'] ?? null)) throw new RuleViolation('ID inválido.');
            return $service->detail($actor,$query['id'],$today);
        }
        if ($method === 'POST' && $operation === 'saveRubric') {
            $id = $service->save($actor,$input);
            return ['snapshot'=>$this->snapshot($service,$actor,$today,$session),'result'=>$id];
        }
        throw new RuleViolation('Operación o método no disponible.',405);
    }
    private function sessionInfo(array $session): array
    {
        $options = [];
        if ($this->config['environment'] === 'development') {
            foreach ($this->academic->identities() as $person) $options[] = array_intersect_key($person,array_flip(['id','name','role']));
        }
        return ['csrf'=>$session['csrf'],'profile'=>$session['user_id'] ?? null,'profileOptions'=>$options];
    }
    private function snapshot(RubricService $service, array $actor, string $today, array $session): array
    {
        $rubrics = $service->list($actor,$today);
        $teachers = [];
        foreach (array_unique(array_merge(array_column($rubrics,'teacher'),$actor['role'] === 'profesor' ? [$actor['id']] : [])) as $id) {
            $person = $this->academic->identity($id);
            $teachers[] = ['id'=>$person['id'],'name'=>$person['name']];
        }
        $students = $actor['role'] === 'alumno' ? [[
            'id'=>$actor['id'],'name'=>$actor['name'],'program'=>$actor['program'],'courses'=>$actor['courseIds'],
        ]] : [];
        return array_merge($this->sessionInfo($session),[
            'demo'=>false,'date'=>$today,'periodo'=>$this->academic->period(),
            'students'=>$students,'teachers'=>$teachers,'courses'=>$this->academic->courses(),
            'rubrics'=>$rubrics,'proposals'=>[],'activity'=>[],'readAlerts'=>[],
        ]);
    }
}
