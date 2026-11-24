<?php
declare(strict_types=1);
$config = require dirname(__DIR__,2) . '/bootstrap.php';
use App\Domain\Id;
use App\Domain\RuleViolation;
use App\Repositories\Connection;
use App\Repositories\RubricRepository;
use App\Services\RubricService;
function verify(bool $value, string $label): void {
    if (!$value) throw new RuntimeException($label);
    echo "OK $label\n";
}
function denied(callable $operation, int $status, string $label): void {
    try { $operation(); } catch (RuleViolation $e) {
        verify($e->status === $status,$label . ' HTTP ' . $e->status);
        return;
    }
    throw new RuntimeException('No rechazó ' . $label);
}
try {
    if ($config['environment'] !== 'development') throw new RuntimeException('Requiere development.');
    $pdo = Connection::open($config['database']);
    $academic = new App\AcademicSystem\JsonAcademicProvider(dirname(__DIR__,2) . '/data/academic/academico.json');
    $service = new RubricService($pdo,$academic);
    $repository = new RubricRepository($pdo);
    $teacher = $academic->identity('t1'); $other = $academic->identity('t2'); $student = $academic->identity('s1');
    $initialCount = $pdo->query('SELECT count(*) FROM rubricas')->fetchColumn();
    $pdo->beginTransaction();
    $input = ['title'=>'Prueba transaccional','criteria'=>"Criterios libres\nPesos por criterio",'course'=>'c1','competencies'=>['Diseñar','Verificar'],'deadline'=>'2026-12-01'];
    $id = $service->save($teacher,$input + ['teacher'=>'t2']);
    $saved = $service->detail($teacher,$id,'2026-11-23');
    verify($saved['teacher'] === 't1' && count($saved['competencyIds']) === 2,'Autor de sesión y dos competencias');
    verify($saved === $service->detail($teacher,$id,'2026-11-23'),'IDs y valores estables en segunda lectura');
    verify(in_array($id,array_column($service->list($student,'2026-12-01'),'id')),'Disponible el último día de recepción');
    verify(!in_array($id,array_column($service->list($student,'2026-12-02'),'id')),'Vencida ausente del catálogo');
    verify(!in_array($id,array_column($service->list($student,'2026-12-04'),'id')),'Caducidad externa cierra catálogo');
    verify(!in_array($id,array_column($service->list($other,'2026-11-23'),'id')),'Listado exclusivo del profesor');
    verify(!in_array($id,array_column($service->list($student,'2026-11-23','c2'),'id')),'Filtro de curso');
    denied(fn()=>$service->save($student,$input),403,'Alumno creando');
    denied(fn()=>$service->save($student,['id'=>$id]+$input),403,'Alumno editando');
    denied(fn()=>$service->save($other,['id'=>$id]+$input),403,'Profesor ajeno editando');
    denied(fn()=>$service->save($other,['id'=>$id,'remove'=>true]),403,'Profesor ajeno eliminando');
    denied(fn()=>$service->detail($other,$id,'2026-11-23'),403,'Detalle ajeno');
    $before = $pdo->query('SELECT count(*) FROM historial')->fetchColumn();
    foreach ([['course'=>'no-existe'],['competencies'=>[]],['deadline'=>'2026-02-30']] as $invalid) {
        denied(fn()=>$service->save($teacher,array_replace($input,$invalid)),422,'Validación de datos');
    }
    verify($before === $pdo->query('SELECT count(*) FROM historial')->fetchColumn(),'Validación sin escrituras parciales');
    $service->save($teacher,array_replace($input,['id'=>$id,'version'=>1,'competencies'=>['Verificar','Diseñar']]));
    $ordered = $repository->get($id);
    verify($ordered['competencyIds'] === array_reverse($saved['competencyIds']),'Reordenar conserva identidad de competencias');
    denied(fn()=>$service->save($teacher,['id'=>$id,'version'=>1]+$input),409,'Versión concurrente obsoleta');
    $team = Id::new(); $proposal = Id::new(); $link = Id::new();
    $run = function($sql,$params) use($pdo) { $q=$pdo->prepare($sql);$q->execute($params); };
    $run('INSERT INTO equipos VALUES (?,?)',[$team,'s1']);
    $run('INSERT INTO propuestas(id,equipo_id) VALUES (?,?)',[$proposal,$team]);
    $run('INSERT INTO propuesta_rubrica(id,propuesta_id,rubrica_id) VALUES (?,?,?)',[$link,$proposal,$id]);
    $service->save($teacher,array_replace($input,['id'=>$id,'title'=>'Edición con borrador']));
    verify($repository->get($id)['title'] === 'Edición con borrador','Borrador permite editar contenido');
    $run("UPDATE propuestas SET estado='ENVIADA',enviada_at=now() WHERE id=?",[$proposal]);
    $locked = $repository->get($id);
    verify($locked['received'],'Propuesta enviada detectada');
    denied(fn()=>$service->save($teacher,array_replace($locked,['title'=>'Cambio prohibido'])),409,'Contenido comprometido bloqueado');
    denied(fn()=>$service->save($teacher,array_replace($locked,['competencies'=>['Otra']])),409,'Competencias comprometidas bloqueadas');
    denied(fn()=>$service->save($teacher,array_replace($locked,['deadline'=>'2026-11-30'])),409,'Acortar plazo comprometido');
    denied(fn()=>$service->save($teacher,['id'=>$id,'remove'=>true]),409,'Eliminar con propuesta enviada');
    $service->save($teacher,array_replace($locked,['deadline'=>'2026-12-03']));
    verify($repository->get($id)['deadline'] === '2026-12-03','Prórroga guardada');
    verify(in_array($id,array_column($service->list($student,'2026-12-02'),'id')),'Catálogo refleja prórroga al consultar');
    verify($repository->get($id)['competencyIds'] === $locked['competencyIds'],'Prórroga conserva competencias');
    // Fallo después de actualizar la cabecera y reordenar competencias.
    $run('INSERT INTO verificaciones_competencia(vinculo_id,rubrica_id,competencia_id) VALUES (?,?,?)',[$link,$id,$locked['competencyIds'][0]]);
    $run("UPDATE propuestas SET estado='BORRADOR',enviada_at=NULL WHERE id=?",[$proposal]);
    $before = $repository->get($id);
    denied(fn()=>$service->save($teacher,array_replace($before,['title'=>'No debe persistir','competencies'=>['Reemplazo']])),409,'Rollback de edición parcial con sustento vinculado');
    verify($repository->get($id) === $before,'Cabecera y competencias restauradas');
    $service->save($teacher,['id'=>$id,'remove'=>true]);
    verify($repository->get($id) === null,'Eliminación con borrador y sustento archivado');
    $q=$pdo->prepare('SELECT titulo,version FROM propuestas WHERE id=?');$q->execute([$proposal]);$preserved=$q->fetch();
    verify($preserved !== false && (int)$preserved['version'] === 2,'Borrador conservado y versión actualizada');
    $q=$pdo->prepare("SELECT datos FROM historial WHERE entidad_id=? AND accion='RUBRICA_ELIMINADA'");$q->execute([$proposal]);$archive=json_decode($q->fetchColumn(),true);
    verify(count($archive['verificaciones']) === 1 && $archive['vinculo']['id'] === $link,'Historial conserva vínculo y sustento retirados');
    $q=$pdo->prepare('SELECT count(*) FROM propuesta_rubrica WHERE propuesta_id=?');$q->execute([$proposal]);
    verify((int)$q->fetchColumn() === 0,'Última rúbrica retirada sin eliminar borrador');
    $temporary = $service->save($teacher,$input);
    $service->save($teacher,['id'=>$temporary,'remove'=>true]);
    verify($repository->get($temporary) === null,'Eliminación atómica sin vínculos');
    $q=$pdo->prepare("SELECT count(*) FROM historial WHERE entidad_id=? AND accion='ELIMINADA'");$q->execute([$temporary]);
    verify((int)$q->fetchColumn() === 1,'Historial de eliminación conservado');
    $pdo->rollBack();
    verify($initialCount === $pdo->query('SELECT count(*) FROM rubricas')->fetchColumn(),'Pruebas revertidas sin residuos');
} catch (Throwable $e) {
    if (isset($pdo) && $pdo->inTransaction()) $pdo->rollBack();
    fwrite(STDERR,$e instanceof PDOException ? 'Error SQLSTATE ' . $e->getCode() . PHP_EOL : $e->getMessage() . PHP_EOL);
    exit(1);
}
