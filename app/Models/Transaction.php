<?php
declare(strict_types=1);
namespace App\Models;
use PDO;
final class Transaction
{
    public static function run(PDO $pdo, callable $operation): mixed
    {
        $nested = $pdo->inTransaction();
        if ($nested) $pdo->exec('SAVEPOINT academic_write');
        else $pdo->beginTransaction();
        try {
            // Serializa escrituras del módulo local y coordina rúbricas, propuestas y caducidad.
            $pdo->exec('SELECT pg_advisory_xact_lock(784262)');
            $result = $operation();
            if ($nested) $pdo->exec('RELEASE SAVEPOINT academic_write');
            else $pdo->commit();
            return $result;
        } catch (\Throwable $e) {
            if ($nested) {
                $pdo->exec('ROLLBACK TO SAVEPOINT academic_write');
                $pdo->exec('RELEASE SAVEPOINT academic_write');
            } elseif ($pdo->inTransaction()) $pdo->rollBack();
            throw $e;
        }
    }
}
