<?php
declare(strict_types=1);
namespace App\Services;
use App\Domain\AcademicProvider;
use RuntimeException;
final class CurrentUser
{
    public function __construct(private AcademicProvider $provider) {}
    public function resolve(array $session): array
    {
        if (!is_string($session['user_id'] ?? null)) throw new RuntimeException('Identidad de sesión requerida.');
        return $this->provider->identity($session['user_id']);
    }
    public function select(string $environment, string $id, string $token, array &$session): void
    {
        if ($environment !== 'development') throw new RuntimeException('Acceso de desarrollo deshabilitado.');
        if (empty($session['csrf']) || !hash_equals($session['csrf'], $token)) throw new RuntimeException('CSRF inválido.');
        $session['user_id'] = $this->provider->identity($id)['id'];
    }
}
