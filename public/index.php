<?php
$config = require dirname(__DIR__) . '/bootstrap.php';
$path = parse_url($_SERVER['REQUEST_URI'] ?? '/',PHP_URL_PATH);
if (!in_array($path,['/','/index.php','/demo.php'],true) || (!empty($demo) && $config['environment'] !== 'development')) {
    http_response_code(404);
    exit;
}
App\Services\CurrentUser::startSession();
header('Cache-Control: no-store');
if (!isset($_SESSION['person_id'])) {
    header('Location: /login.html',true,302);
    exit;
}
try {
    $pdo = App\Models\Connection::open($config['database']);
    $provider = new App\Models\PostgresAcademicProvider($pdo,$config['academic_period']);
    (new App\Services\CurrentUser($provider,$pdo,$config['environment']))->resolve($_SESSION);
} catch (App\Models\RuleViolation $error) {
    $_SESSION = ['csrf'=>bin2hex(random_bytes(32))];
    header('Location: /login.html',true,302);
    exit;
} catch (Throwable $error) {
    http_response_code(503);
    echo 'Servicio no disponible. Comprueba la configuración, las migraciones y la semilla.';
    exit;
}
require dirname(__DIR__) . '/app/Views/portal.php';
