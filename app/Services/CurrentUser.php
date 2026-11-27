<?php
declare(strict_types=1);
namespace App\Services;
use App\Models\{AcademicProvider,RuleViolation};
use PDO;
final class CurrentUser
{
    private const DUMMY_HASH = '$2y$12$HuR2HLleXAw7zbAYczSQ0uZ5vRo2AJQV2yi0zILfEjTcSSsmy68ZS';

    public function __construct(private AcademicProvider $provider, private PDO $pdo, private string $environment) {}

    public static function startSession(): void
    {
        if (session_status() === PHP_SESSION_ACTIVE) return;
        session_name('ISUR_LOGIN');
        session_start([
            'use_strict_mode'=>true,
            'cookie_httponly'=>true,
            'cookie_secure'=>!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off',
            'cookie_samesite'=>'Strict',
        ]);
        $_SESSION['csrf'] ??= bin2hex(random_bytes(32));
    }

    public function resolve(array $session): array
    {
        if (!is_string($session['person_id'] ?? null)) throw new RuleViolation('Inicia sesión para continuar.',401);
        $query = $this->pdo->prepare('SELECT activo,solo_desarrollo FROM accesos WHERE persona_id=?');
        $query->execute([$session['person_id']]);
        $access = $query->fetch();
        if (!$access || !$access['activo'] || ($access['solo_desarrollo'] && $this->environment !== 'development')) {
            throw new RuleViolation('Inicia sesión para continuar.',401);
        }
        return $this->provider->identity($session['person_id']);
    }

    public function login(array $input, array &$session): array
    {
        $email = is_string($input['email'] ?? null) ? strtolower(trim($input['email'])) : '';
        $password = is_string($input['password'] ?? null) ? $input['password'] : '';
        $query = $this->pdo->prepare('SELECT a.persona_id,a.password_hash,a.activo,a.solo_desarrollo FROM accesos a JOIN personas p ON p.id=a.persona_id WHERE p.correo=?');
        $query->execute([$email]);
        $access = $query->fetch();
        $verified = password_verify($password,$access['password_hash'] ?? self::DUMMY_HASH);
        if (!filter_var($email,FILTER_VALIDATE_EMAIL) || !str_ends_with($email,'@isur.edu.pe') || !$verified || !$access || !$access['activo'] || ($access['solo_desarrollo'] && $this->environment !== 'development')) {
            throw new RuleViolation('Su cuenta o contraseña no es correcta.',401);
        }
        $person = $this->provider->identity($access['persona_id']);
        session_regenerate_id(true);
        $session = ['person_id'=>$person['id'],'csrf'=>bin2hex(random_bytes(32))];
        return ['profile'=>$person['id'],'csrf'=>$session['csrf']];
    }

    public function logout(array &$session): void
    {
        $session = [];
        $cookie = session_get_cookie_params();
        setcookie(session_name(),'',[
            'expires'=>time()-3600,'path'=>$cookie['path'],'domain'=>$cookie['domain'],
            'secure'=>$cookie['secure'],'httponly'=>true,'samesite'=>$cookie['samesite'],
        ]);
        session_destroy();
    }
}
