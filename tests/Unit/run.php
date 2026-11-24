<?php
require dirname(__DIR__, 2) . '/bootstrap.php';
function check(bool $ok, string $label): void {
    if (!$ok) throw new RuntimeException($label);
    echo "OK $label\n";
}
function rejects(callable $operation, string $label): void {
    try { $operation(); } catch (RuntimeException $e) { check(true, $label); return; }
    throw new RuntimeException('No rechazó: ' . $label);
}
$p = new App\AcademicSystem\JsonAcademicProvider(dirname(__DIR__, 2) . '/data/academic/academico.json');
check($p->identity('s1')['role'] === 'alumno', 'Identidad alumno');
check($p->identity('t1')['role'] === 'profesor', 'Identidad profesor');
check($p->enrollment('s1') === ['c1','c2'], 'Matrícula externa');
check(count($p->courses()) === 3 && $p->period()['caducidad'] === '2026-12-04', 'Cursos y fechas externas');
check(count($p->candidates($p->student('s1')['program'])) === 4, 'Candidatos por carrera');
rejects(fn() => $p->identity('desconocido'), 'Identidad inexistente');
rejects(fn() => $p->student('t1'), 'Profesor no es alumno');
rejects(fn() => new App\AcademicSystem\JsonAcademicProvider('/archivo-inexistente'), 'Archivo ausente');
$file = tempnam(sys_get_temp_dir(), 'academic-test');
try {
    file_put_contents($file, '{');
    rejects(fn() => new App\AcademicSystem\JsonAcademicProvider($file), 'JSON roto');
    file_put_contents($file, '{}');
    rejects(fn() => new App\AcademicSystem\JsonAcademicProvider($file), 'Campos ausentes');
} finally { unlink($file); }
$users = new App\Services\CurrentUser($p);
$session = ['csrf' => 'token'];
rejects(fn() => $users->resolve($session), 'Sesión ausente');
rejects(function () use ($users, &$session) { $users->select('production','t1','token',$session); }, 'Selector deshabilitado en producción');
rejects(function () use ($users, &$session) { $users->select('development','t1','incorrecto',$session); }, 'CSRF incorrecto');
$users->select('development','s1','token',$session);
$session['role'] = 'profesor';
check($users->resolve($session)['role'] === 'alumno', 'Rol resuelto exclusivamente desde proveedor');
