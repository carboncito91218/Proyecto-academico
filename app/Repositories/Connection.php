<?php
declare(strict_types=1);
namespace App\Repositories;
use PDO;
use PDOException;
use RuntimeException;
final class Connection
{
    public static function open(array $config): PDO
    {
        foreach (['host', 'port', 'name', 'user', 'password'] as $field) {
            if (!isset($config[$field]) || (string)$config[$field] === '') {
                throw new RuntimeException("Configura database.$field en config/local.php.");
            }
        }
        foreach (['host', 'name', 'port'] as $field) {
            if (!preg_match('/^[a-zA-Z0-9_.-]+$/D', (string)$config[$field])) {
                throw new RuntimeException("Configuración inválida en database.$field.");
            }
        }
        try {
            $pdo = new PDO(sprintf('pgsql:host=%s;port=%s;dbname=%s;connect_timeout=5',
                $config['host'], $config['port'], $config['name']), $config['user'], $config['password'], [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
            ]);
            $pdo->exec("SET TIME ZONE 'UTC'");
            return $pdo;
        } catch (PDOException $e) {
            $message = strtolower($e->getMessage());
            $reason = match (true) {
                str_contains($message, 'password authentication failed') => 'Autenticación por contraseña rechazada',
                str_contains($message, 'ident authentication') => 'Autenticación Ident rechazada',
                str_contains($message, 'connection refused') => 'Conexión rechazada por el servidor',
                str_contains($message, 'permission denied') => 'Permiso de conexión denegado',
                str_contains($message, 'no pg_hba') => 'Falta una regla pg_hba compatible',
                default => 'Conexión fallida, revisar servicio, destino y autenticación',
            };
            throw new RuntimeException($reason . ' (SQLSTATE ' . $e->getCode() . ').');
        }
    }
}
