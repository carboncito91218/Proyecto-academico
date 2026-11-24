<?php
$config = require dirname(__DIR__) . '/bootstrap.php';
if ($config['environment'] !== 'development') { http_response_code(404); exit; }
session_start(['use_strict_mode' => true, 'cookie_httponly' => true, 'cookie_samesite' => 'Strict']);
header('Cache-Control: no-store');
$provider = new App\AcademicSystem\JsonAcademicProvider(dirname(__DIR__) . '/data/academic/academico.json');
$users = new App\Services\CurrentUser($provider);
$_SESSION['csrf'] ??= bin2hex(random_bytes(32));
try {
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $users->select($config['environment'], (string)($_POST['id'] ?? ''), (string)($_POST['csrf'] ?? ''), $_SESSION);
        session_regenerate_id(true);
    } elseif ($_SERVER['REQUEST_METHOD'] !== 'GET') { http_response_code(405); exit; }
} catch (RuntimeException $e) { http_response_code(403); echo htmlspecialchars($e->getMessage()); }
$escape = fn($value) => htmlspecialchars($value, ENT_QUOTES, 'UTF-8');
?>
<!doctype html><html lang="es"><meta charset="utf-8"><title>Identidad de desarrollo</title>
<p>Identidad del servidor de desarrollo. La demo mantiene su propio selector.</p>
<p>Usuario actual <?= $escape($_SESSION['user_id'] ?? 'sin identidad') ?></p>
<form method="post"><input type="hidden" name="csrf" value="<?= $escape($_SESSION['csrf']) ?>">
<select name="id"><?php foreach ($provider->identities() as $person): ?>
<option value="<?= $escape($person['id']) ?>"><?= $escape($person['name'] . ' / ' . $person['role']) ?></option>
<?php endforeach ?></select><button>Seleccionar identidad</button></form></html>
