<?php
$config = require dirname(__DIR__) . '/bootstrap.php';
try {
    $pdo = App\Repositories\Connection::open($config['database']);
    $destination = $pdo->query('SELECT current_database(), current_user')->fetch();
    echo json_encode($destination, JSON_UNESCAPED_UNICODE) . PHP_EOL;
    if ($command === 'migrate') {
        if ($config['environment'] !== 'development' || $destination['current_database'] !== $config['database']['name'] || $destination['current_user'] !== $config['database']['user']) {
            throw new RuntimeException('Destino o entorno no autorizado para migración local.');
        }
        (new App\Repositories\Migrator($pdo, dirname(__DIR__) . '/database/migrations'))->run();
    }
    if ($command === 'status') {
        if (!$pdo->query("SELECT to_regclass('public.schema_migrations')")->fetchColumn()) {
            echo "Sin migraciones aplicadas.\n";
        } else {
            foreach ($pdo->query('SELECT name,applied_at FROM schema_migrations ORDER BY name') as $row) echo json_encode($row) . PHP_EOL;
        }
    }
} catch (Throwable $e) {
    fwrite(STDERR, $e instanceof PDOException ? 'Error SQL (SQLSTATE ' . $e->getCode() . "). Operación revertida.\n" : $e->getMessage() . PHP_EOL);
    exit(1);
}
