<?php
namespace App\Domain;
interface AcademicProvider
{
    public function identities(): array;
    public function identity(string $id): array;
    public function student(string $id): array;
    public function candidates(string $program, string $query = ''): array;
    public function enrollment(string $id): array;
    public function courses(): array;
    public function period(): array;
}
