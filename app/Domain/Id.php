<?php
declare(strict_types=1);
namespace App\Domain;
final class Id
{
    public static function new(): string
    {
        $bytes = random_bytes(16);
        $bytes[6] = chr((ord($bytes[6]) & 15) | 64);
        $bytes[8] = chr((ord($bytes[8]) & 63) | 128);
        $hex = bin2hex($bytes);
        return substr($hex, 0, 8) . '-' . substr($hex, 8, 4) . '-' . substr($hex, 12, 4) . '-' . substr($hex, 16, 4) . '-' . substr($hex, 20);
    }
    public static function valid(mixed $value): bool
    {
        return is_string($value) && preg_match('/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/Di', $value) === 1;
    }
}
