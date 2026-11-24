<?php
$config = require dirname(__DIR__, 2) . '/bootstrap.php';
try {
    $pdo = App\Repositories\Connection::open($config['database']);
    if ($config['environment'] !== 'development') throw new RuntimeException('Prueba exclusiva de desarrollo.');
    $pdo->beginTransaction();
    $id = fn(int $n) => sprintf('00000000-0000-4000-8000-%012d', $n);
    // UUID aleatorio evita colisiones con registros existentes.
    $prefix = bin2hex(random_bytes(4));
    $id = fn(int $n) => sprintf('%s-0000-4000-8000-%012d', $prefix, $n);
    $run = function (string $sql, array $params = []) use ($pdo) { $q = $pdo->prepare($sql); $q->execute($params); };
    $reject = function (string $sql, array $params, string $state) use ($pdo, $run) {
        $pdo->exec('SAVEPOINT invalid_write');
        try { $run($sql,$params); throw new RuntimeException('Restricción no aplicada.'); }
        catch (PDOException $e) { if ($e->getCode() !== $state) throw $e; }
        finally { $pdo->exec('ROLLBACK TO SAVEPOINT invalid_write'); }
        echo "OK restricción $state\n";
    };
    foreach ([1,2] as $n) $run("INSERT INTO rubricas VALUES (?, 'c1','t1','Prueba','Texto','2026-12-01')",[$id($n)]);
    $run('INSERT INTO competencias VALUES (?,?,?,0)',[$id(3),$id(1),'Competencia']);
    $run('INSERT INTO equipos VALUES (?,?)',[$id(4),'s1']);
    $run('INSERT INTO propuestas(id,equipo_id) VALUES (?,?)',[$id(5),$id(4)]);
    $run('INSERT INTO propuesta_rubrica(id,propuesta_id,rubrica_id) VALUES (?,?,?)',[$id(6),$id(5),$id(2)]);
    $reject('INSERT INTO verificaciones_competencia(vinculo_id,rubrica_id,competencia_id) VALUES (?,?,?)',[$id(6),$id(2),$id(3)],'23503');
    $reject('INSERT INTO propuesta_rubrica(id,propuesta_id,rubrica_id) VALUES (?,?,?)',[$id(7),$id(5),$id(2)],'23505');
    foreach ([['decision','INVALIDA'],['observaciones',3],['decision','OBSERVADA'],['decision','CADUCADA'],['decision','APROBADA']] as [$field,$value]) {
        $reject("UPDATE propuesta_rubrica SET $field=? WHERE id=?",[$value,$id(6)],'23514');
    }
    $reject('DELETE FROM rubricas WHERE id=?',[$id(2)],'23503');
    $pdo->rollBack();
    $q = $pdo->prepare('SELECT count(*) FROM rubricas WHERE id=?'); $q->execute([$id(1)]);
    if ((int)$q->fetchColumn() !== 0) throw new RuntimeException('Rollback incompleto.');
    echo "OK rollback completo, sin residuos\n";
} catch (Throwable $e) {
    if (isset($pdo) && $pdo->inTransaction()) $pdo->rollBack();
    fwrite(STDERR, $e instanceof PDOException ? 'Error SQLSTATE ' . $e->getCode() . PHP_EOL : $e->getMessage() . PHP_EOL);
    exit(1);
}
