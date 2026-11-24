<?php
declare(strict_types=1);
$config = require dirname(__DIR__) . '/bootstrap.php';
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');
try {
    session_start(['use_strict_mode'=>true,'cookie_httponly'=>true,'cookie_samesite'=>'Strict']);
    $_SESSION['csrf'] ??= bin2hex(random_bytes(32));
    $input = [];
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $input = json_decode(file_get_contents('php://input'),true,512,JSON_THROW_ON_ERROR);
        if (!is_array($input) || array_is_list($input)) throw new App\Domain\RuleViolation('Se requiere un objeto JSON.');
    }
    $academic = new App\AcademicSystem\JsonAcademicProvider(dirname(__DIR__) . '/data/academic/academico.json');
    $controller = new App\Controllers\RubricController($config,$academic);
    $result = $controller->handle($_SERVER['REQUEST_METHOD'],$_GET,$input,$_SESSION,$_SERVER['HTTP_X_CSRF_TOKEN'] ?? '');
    echo json_encode($result,JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE);
} catch (App\Domain\RuleViolation $e) {
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
