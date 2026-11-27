<?php
declare(strict_types=1);
$config = require dirname(__DIR__) . '/bootstrap.php';
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');
try {
    App\Services\CurrentUser::startSession();
    if ($_SERVER['REQUEST_METHOD'] === 'GET' && ($_GET['op'] ?? '') === 'loginToken') {
        echo json_encode(['csrf'=>$_SESSION['csrf']]);
        exit;
    }
    if (!isset($_SESSION['person_id']) && ($_GET['op'] ?? '') !== 'login') {
        throw new App\Models\RuleViolation('Inicia sesión para continuar.',401);
    }
    $input = [];
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $body = file_get_contents('php://input');
        $input = json_decode($body,true,512,JSON_THROW_ON_ERROR);
        if (!is_array($input) || !str_starts_with(ltrim($body), '{')) throw new App\Models\RuleViolation('Se requiere un objeto JSON.');
    }
    $pdo = App\Models\Connection::open($config['database']);
    $academic = new App\Models\PostgresAcademicProvider($pdo,$config['academic_period']);
    $controller = new App\Controllers\AcademicController($config,$academic,$pdo);
    $result = $controller->handle($_SERVER['REQUEST_METHOD'],$_GET,$input,$_SESSION,$_SERVER['HTTP_X_CSRF_TOKEN'] ?? '');
    echo json_encode($result,JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE);
} catch (App\Models\RuleViolation $e) {
    http_response_code($e->status);
    echo json_encode(['error'=>$e->getMessage()],JSON_UNESCAPED_UNICODE);
} catch (JsonException $e) {
    http_response_code(400);
    echo json_encode(['error'=>'JSON inválido.']);
} catch (Throwable $e) {
    http_response_code(503);
    // Solo clase y código técnico. Evita parámetros, SQL y secretos en registros.
    error_log('API académica ' . get_class($e) . ' código ' . $e->getCode());
    echo json_encode(['error'=>'Servicio académico temporalmente no disponible. Comprueba la conexión con php bin/check-db.php.']);
}
