<?php
declare(strict_types=1);
$config = require dirname(__DIR__) . '/bootstrap.php';
try {
    $database = $config['database'];
    App\Models\Connection::open($database);
    $path = $argv[1] ?? sys_get_temp_dir() . '/proyecto-academico-' . date('Ymd-His') . '.dump';
    if (file_exists($path)) throw new RuntimeException('El archivo de destino ya existe. Elige otro nombre.');
    umask(0077);
    $environment = array_merge(getenv(), ['PGPASSWORD' => $database['password']]);
    $command = ['pg_dump', '--format=custom', '--no-password', '--host=' . $database['host'],
        '--port=' . $database['port'], '--username=' . $database['user'], '--dbname=' . $database['name'], '--file=' . $path];
    $process = proc_open($command, [0 => ['pipe', 'r'], 1 => ['pipe', 'w'], 2 => ['pipe', 'w']], $pipes, null, $environment);
    if (!is_resource($process)) throw new RuntimeException('No se pudo iniciar pg_dump.');
    fclose($pipes[0]);
    stream_get_contents($pipes[1]);
    stream_get_contents($pipes[2]);
    fclose($pipes[1]);
    fclose($pipes[2]);
    if (proc_close($process) !== 0) throw new RuntimeException('Falló pg_dump. Revisa su instalación y acceso a PostgreSQL.');
    chmod($path, 0600);
    echo 'Respaldo creado en ' . $path . PHP_EOL;
} catch (Throwable $error) {
    fwrite(STDERR, $error instanceof PDOException ? 'No se pudo respaldar la base.' . PHP_EOL : $error->getMessage() . PHP_EOL);
    exit(1);
}
